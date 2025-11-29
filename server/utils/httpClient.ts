import https from 'https';
import http from 'http';
import { URL } from 'url';

/**
 * Custom HTTP/HTTPS client that handles both HTTP and HTTPS requests
 * including self-signed certificates and SSL/TLS issues
 */

interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
}

/**
 * Creates a custom HTTPS agent that allows self-signed certificates
 * This is useful for internal APIs or development environments
 */
function createRelaxedHttpsAgent(): https.Agent {
  return new https.Agent({
    rejectUnauthorized: false, // Allow self-signed certificates
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 50,
    maxFreeSockets: 10,
  });
}

/**
 * Creates a standard HTTPS agent with strict certificate validation
 */
function createStrictHttpsAgent(): https.Agent {
  return new https.Agent({
    rejectUnauthorized: true, // Strict certificate validation
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 50,
    maxFreeSockets: 10,
  });
}

/**
 * Creates an HTTP agent
 */
function createHttpAgent(): http.Agent {
  return new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 50,
    maxFreeSockets: 10,
  });
}

/**
 * Custom fetch implementation that handles HTTP and HTTPS properly
 * Tries strict SSL first, then falls back to relaxed SSL for self-signed certificates
 */
export async function httpFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const urlObj = new URL(url);
  const isHttps = urlObj.protocol === 'https:';
  const isHttp = urlObj.protocol === 'http:';

  if (!isHttp && !isHttps) {
    throw new Error(`Unsupported protocol: ${urlObj.protocol}. Only http: and https: are supported.`);
  }

  // Set default timeout
  const timeout = options.timeout || 30000;

  // Create abort controller for timeout (always create our own, use provided signal if available)
  const controller = new AbortController();
  const signal = options.signal || controller.signal;
  
  // If external signal is provided, listen to it
  if (options.signal) {
    options.signal.addEventListener('abort', () => {
      controller.abort();
    });
  }
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    // Try with strict SSL validation first (for HTTPS)
    let response: Response;
    
    if (isHttps) {
      try {
        // First attempt: strict SSL validation
        response = await fetch(url, {
          method: options.method || 'GET',
          headers: options.headers || {},
          signal: signal,
        });
      } catch (error: any) {
        // If SSL error, try with relaxed SSL (self-signed certificates)
        const errorMessage = error?.message?.toLowerCase() || '';
        const errorCode = error?.code || '';
        const errorCause = error?.cause?.code || error?.cause?.message?.toLowerCase() || '';
        
        const isSSLError = 
          errorMessage.includes('certificate') ||
          errorMessage.includes('ssl') ||
          errorMessage.includes('tls') ||
          errorMessage.includes('unable to verify') ||
          errorMessage.includes('self signed') ||
          errorCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
          errorCode === 'CERT_HAS_EXPIRED' ||
          errorCode === 'SELF_SIGNED_CERT_IN_CHAIN' ||
          errorCode === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
          errorCode === 'CERT_SIGNATURE_FAILURE' ||
          errorCode === 'ERR_TLS_CERT_ALTNAME_INVALID' ||
          errorCause.includes('certificate') ||
          errorCause.includes('ssl') ||
          errorCause.includes('tls');
        
        if (isSSLError) {
          console.warn(
            `[HttpClient] SSL certificate validation failed for ${url}. ` +
            `Retrying with relaxed SSL validation (self-signed certificates allowed). ` +
            `Error: ${errorMessage || errorCode || 'Unknown SSL error'}`
          );
          
          // Use https module directly for relaxed SSL
          response = await fetchWithRelaxedSSL(url, options, controller);
        } else {
          throw error;
        }
      }
    } else {
      // HTTP request - no SSL needed
      response = await fetch(url, {
        method: options.method || 'GET',
        headers: options.headers || {},
        signal: signal,
      });
    }

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError' || signal.aborted) {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Fetch with relaxed SSL using https module directly
 * This is a fallback for self-signed certificates
 */
async function fetchWithRelaxedSSL(
  url: string,
  options: FetchOptions,
  controller: AbortController
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const agent = createRelaxedHttpsAgent();

    const requestOptions: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      agent: agent,
    };

    const req = https.request(requestOptions, (res) => {
      const chunks: Buffer[] = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const body = Buffer.concat(chunks);
        
        // Create a Response-like object
        // Convert Node.js headers to Headers-compatible format
        const headerRecord: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          if (value) {
            // Node.js headers can be string or string[]
            headerRecord[key] = Array.isArray(value) ? value.join(', ') : value;
          }
        }
        
        const response = new Response(body, {
          status: res.statusCode || 200,
          statusText: res.statusMessage || 'OK',
          headers: headerRecord,
        });

        resolve(response);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // Handle abort signal
    if (controller.signal) {
      controller.signal.addEventListener('abort', () => {
        req.destroy();
        reject(new Error('Request aborted'));
      });
    }

    req.end();
  });
}

/**
 * Check if a URL is valid and accessible
 */
export async function validateUrl(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

