import { Request, Response, NextFunction } from 'express';

/**
 * API Token Authentication Middleware
 * Validates API token from Authorization header or query parameter
 */
export function requireApiToken(req: Request, res: Response, next: NextFunction) {
  // Get token from Authorization header (Bearer token) or query parameter
  let token: string | undefined;
  
  // Check Authorization header first
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  // Fallback to query parameter (for GET requests)
  if (!token && req.query.token) {
    token = req.query.token as string;
  }
  
  // Fallback to X-API-Key header
  if (!token && req.headers['x-api-key']) {
    token = req.headers['x-api-key'] as string;
  }
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'API token required. Provide token via Authorization header (Bearer token), X-API-Key header, or token query parameter.'
    });
  }
  
  // Validate token against environment variable
  const validToken = process.env.DIG_API_TOKEN || process.env.API_TOKEN;
  
  if (!validToken) {
    console.error('DIG_API_TOKEN not configured in environment variables');
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'API token validation not configured'
    });
  }
  
  if (token !== validToken) {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Invalid API token'
    });
  }
  
  // Token is valid, proceed
  next();
}

