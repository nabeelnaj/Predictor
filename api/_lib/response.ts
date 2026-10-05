/**
 * Standardized API Response Utilities for Vercel Serverless Functions
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public reset: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class UpstreamError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'UpstreamError';
  }
}

// =====================
// Response Helpers
// =====================

export function setCorsHeaders(res: VercelResponse, origin?: string): void {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
  const requestOrigin = origin || '*';
  
  if (allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function setSecurityHeaders(res: VercelResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
}

export function setRateLimitHeaders(res: VercelResponse, limit: number, remaining: number, reset: number): void {
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', reset.toString());
}

export function setCacheHeaders(res: VercelResponse, maxAge: number): void {
  res.setHeader('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
}

// =====================
// Standardized Responses
// =====================

export function success<T>(res: VercelResponse, data: T, options?: { 
  origin?: string; 
  cacheMaxAge?: number;
  rateLimit?: { limit: number; remaining: number; reset: number };
}): void {
  setCorsHeaders(res, options?.origin);
  setSecurityHeaders(res);
  
  if (options?.rateLimit) {
    setRateLimitHeaders(res, options.rateLimit.limit, options.rateLimit.remaining, options.rateLimit.reset);
  }
  
  if (options?.cacheMaxAge) {
    setCacheHeaders(res, options.cacheMaxAge);
  }
  
  res.status(200).json(data);
}

export function error(res: VercelResponse, message: string, status: number = 500, options?: {
  origin?: string;
  code?: string;
  rateLimit?: { limit: number; remaining: number; reset: number };
}): void {
  setCorsHeaders(res, options?.origin);
  setSecurityHeaders(res);
  
  if (options?.rateLimit) {
    setRateLimitHeaders(res, options.rateLimit.limit, options.rateLimit.remaining, options.rateLimit.reset);
  }
  
  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';
  const errorResponse = isProduction && status >= 500
    ? { error: 'Internal server error' }
    : { error: message, code: options?.code };
  
  res.status(status).json(errorResponse);
}

export function validationError(res: VercelResponse, message: string, field: string, options?: { origin?: string }): void {
  error(res, message, 400, { ...options, code: 'VALIDATION_ERROR' });
}

export function rateLimitError(res: VercelResponse, reset: number, options?: { origin?: string }): void {
  error(res, 'Rate limit exceeded. Please slow down.', 429, { 
    ...options, 
    code: 'RATE_LIMITED',
    rateLimit: { limit: 30, remaining: 0, reset }
  });
}

export function notFound(res: VercelResponse, message: string = 'Not found', options?: { origin?: string }): void {
  error(res, message, 404, { ...options, code: 'NOT_FOUND' });
}

export function methodNotAllowed(res: VercelResponse, allowed: string[] = ['GET'], options?: { origin?: string }): void {
  res.setHeader('Allow', allowed.join(', '));
  error(res, 'Method not allowed', 405, { ...options, code: 'METHOD_NOT_ALLOWED' });
}

// =====================
// Request Handler Wrapper
// =====================

export type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

export function withErrorHandling(handler: Handler): Handler {
  return async (req, res) => {
    const origin = req.headers.origin;
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res, origin);
      setSecurityHeaders(res);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      return res.status(204).end();
    }
    
    // Only allow GET for market data endpoints
    if (req.method !== 'GET') {
      return methodNotAllowed(res, ['GET'], { origin });
    }
    
    try {
      await handler(req, res);
    } catch (err) {
      console.error('[API Error]', {
        url: req.url,
        method: req.method,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      
      if (err instanceof ValidationError) {
        return validationError(res, err.message, err.field, { origin });
      }
      if (err instanceof RateLimitError) {
        return rateLimitError(res, err.reset, { origin });
      }
      if (err instanceof UpstreamError) {
        return error(res, 'Upstream service unavailable', err.status, { origin, code: 'UPSTREAM_ERROR' });
      }
      
      // Generic error
      const isProduction = process.env.NODE_ENV === 'production';
      return error(res, isProduction ? 'Internal server error' : (err instanceof Error ? err.message : 'Unknown error'), 500, { origin });
    }
  };
}

// =====================
// Request Validation Helpers
// =====================

export function getQueryParam(req: VercelRequest, name: string, required = false): string | undefined {
  const value = req.query[name];
  if (Array.isArray(value)) return value[0];
  if (value === undefined && required) {
    throw new ValidationError(`${name} is required`, name);
  }
  return value as string | undefined;
}

export function getRequiredQueryParam(req: VercelRequest, name: string): string {
  const value = getQueryParam(req, name, true);
  if (!value) throw new ValidationError(`${name} is required`, name);
  return value;
}