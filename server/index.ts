import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { log } from "./utils/logger.js";
import { redisService } from "./services/redisService.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import compression from 'compression';
import { 
  securityHeaders, 
  helmetConfig, 
  generalLimiter, 
  sanitizeRequest, 
  preventSQLInjection,
  securityErrorHandler 
} from "./middleware/security.js";
import { logActivity } from "./middleware/activityLogger.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// Honor reverse proxies (dev tunnels, nginx) so req.protocol/host reflect public origin
// Trust only the first proxy hop to prevent IP spoofing
app.set('trust proxy', 1);

// Security middleware - apply before other middleware
app.use(helmetConfig);
app.use(securityHeaders);
app.use(sanitizeRequest);
app.use(preventSQLInjection);
app.use(generalLimiter);

// Activity logging - log all requests (after security middleware, before routes)
app.use(logActivity);

// Add compression middleware for faster responses
app.use(compression({
  filter: (req: Request, res: Response) => {
    // Compress all responses except if explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between compression and speed
  threshold: 1024, // Only compress responses > 1KB
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Multer setup for local uploads
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: function (req: Request, file: Express.Multer.File, cb) {
    cb(null, uploadDir);
  },
  filename: function (req: Request, file: Express.Multer.File, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// Request timeout middleware - kill requests that take too long
app.use((req, res, next) => {
  // Longer timeout for QR generation endpoints
  const isQRGeneration = req.path.includes('/generate-qr');
  // Longer timeout for tracking API test with save to database
  const isTrackingApiTest = req.path.includes('/tracking-api-configs') && req.path.includes('/test') && req.method === 'POST';
  const timeout = isQRGeneration ? 60000 : (isTrackingApiTest ? 120000 : 30000); // 60s for QR, 120s for tracking test, 30s for others
  
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ message: "Request timeout" });
      // Mark request as timed out to prevent further processing
      (req as any).timedOut = true;
    }
  }, timeout);

  // Clear timeout when response finishes
  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    // Only capture response for logging if it's small (avoid memory issues with large responses)
    if (bodyJson && typeof bodyJson === 'object') {
      const jsonStr = JSON.stringify(bodyJson);
      if (jsonStr.length < 500) { // Only log small responses
        capturedJsonResponse = bodyJson;
      }
    }
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const jsonStr = JSON.stringify(capturedJsonResponse);
        if (jsonStr.length < 200) {
          logLine += ` :: ${jsonStr}`;
        } else {
          logLine += ` :: [Response too large to log]`;
        }
      }

      if (logLine.length > 150) {
        logLine = logLine.slice(0, 149) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize Redis connection
  await redisService.connect();

  const server = await registerRoutes(app);

  // Security error handler (must be before general error handler)
  app.use(securityErrorHandler);
  
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Bind localhost in production so only Nginx can reach the app.
  // Override with HOST=0.0.0.0 for local/dev if needed.
  const port = Number(process.env.PORT) || 5000;
  const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0");
  server.listen(port, host, async () => {
    log(`serving on ${host}:${port}`);
    
    // Start auto-sync service to fetch new events every 15 seconds
    try {
      const { autoSyncService } = await import('./services/autoSyncService.js');
      autoSyncService.start();
      log('[Server] Auto-sync service started (fetching events every 15 seconds)');
    } catch (error) {
      log(`[Server] Error starting auto-sync service: ${error instanceof Error ? error.message : String(error)}`);
    }

    // New fleet reports sync (separate from old tracking_events pipeline)
    try {
      const { fleetSyncScheduler } = await import('./services/fleetSyncScheduler.js');
      fleetSyncScheduler.start();
      log('[Server] Fleet sync scheduler started (objects 15m, overspeed 2m, nightly purge)');
    } catch (error) {
      log(`[Server] Error starting fleet sync scheduler: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Graceful shutdown. PM2 can deliver SIGTERM twice; the second pass must not
  // call Redis quit() again or it throws "The client is closed".
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    log(`${signal} received, shutting down gracefully...`);
    
    try {
      // Stop auto-sync service
      try {
        const { autoSyncService } = await import('./services/autoSyncService.js');
        autoSyncService.stop();
        log('Auto-sync service stopped');
      } catch (error) {
        log(`Error stopping auto-sync service: ${error instanceof Error ? error.message : String(error)}`);
      }

      try {
        const { fleetSyncScheduler } = await import('./services/fleetSyncScheduler.js');
        fleetSyncScheduler.stop();
        log('Fleet sync scheduler stopped');
      } catch (error) {
        log(`Error stopping fleet sync scheduler: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Disconnect Redis
      await redisService.disconnect();
      log('Redis disconnected');
      
      // Close HTTP server with timeout
      const shutdownTimeout = setTimeout(() => {
        log('Server close timeout, forcing exit...');
        process.exit(1);
      }, 10000); // 10 second timeout
      
      server.close(() => {
        clearTimeout(shutdownTimeout);
        log('Server closed');
        process.exit(0);
      });
      
      // Force close if server.close() doesn't complete
      setTimeout(() => {
        log('Forcing server shutdown...');
        process.exit(0);
      }, 8000); // Force exit after 8 seconds
      
    } catch (error) {
      log(`Error during shutdown: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})();

// Image upload endpoint - security handled in routes.ts
// This endpoint is moved to routes.ts to apply proper security middleware

// Serve uploaded files statically
app.use("/uploads", express.static(uploadDir, {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Ensure proper content length handling for images
    if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Accept-Ranges', 'bytes');
    }
  }
}));
