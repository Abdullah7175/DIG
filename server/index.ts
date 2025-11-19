import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { log } from "./utils/logger.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import compression from 'compression';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// Honor reverse proxies (dev tunnels, nginx) so req.protocol/host reflect public origin
app.set('trust proxy', true);

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
  const timeout = 30000; // 30 second timeout
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ message: "Request timeout" });
    }
  }, timeout);

  res.on('finish', () => clearTimeout(timer));
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
  const server = await registerRoutes(app);

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

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();

// Image upload endpoint
app.post("/api/upload", upload.single("image"), (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  // Return the URL to access the image
  const url = `/uploads/${file.filename}`;
  res.json({ url });
});

// Serve uploaded files statically
app.use("/uploads", express.static(uploadDir));
