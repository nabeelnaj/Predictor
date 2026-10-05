import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { getCandles, validateSymbol, validateResolution } from '../_lib/finnhub';
import { withErrorHandling, success, error, getRequiredQueryParam } from '../_lib/response';

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const origin = req.headers.origin;
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await kv.zadd(`ratelimit:zset:${ip}`, { score: Date.now(), value: `${Date.now()}:${Math.random()}` })
    .then(() => kv.zremrangebyscore(`ratelimit:zset:${ip}`, 0, Date.now() - 1000))
    .then(() => kv.zcard(`ratelimit:zset:${ip}`))
    .then(count => ({ allowed: count <= 30, remaining: Math.max(0, 30 - count), reset: Math.ceil((Date.now() + 1000) / 1000) }))
    .catch(() => ({ allowed: true, remaining: 30, reset: Math.ceil((Date.now() + 1000) / 1000) }));
  
  if (!rateLimit.allowed) {
    return error(res, 'Rate limit exceeded. Please slow down.', 429, { origin, code: 'RATE_LIMITED', rateLimit: { limit: 30, remaining: 0, reset: rateLimit.reset } });
  }
  
  const symbol = validateSymbol(getRequiredQueryParam(req, 'symbol'));
  const resolution = validateResolution(getRequiredQueryParam(req, 'resolution') || '');
  const from = parseInt(getRequiredQueryParam(req, 'from'));
  const to = parseInt(getRequiredQueryParam(req, 'to'));
  
  if (!Number.isInteger(from) || !Number.isInteger(to) || from >= to) {
    return error(res, 'Invalid time range', 400, { origin, code: 'VALIDATION_ERROR' });
  }
  
  const data = await getCandles(symbol, resolution, from, to);
  if (!data) return error(res, 'Failed to fetch candles', 502, { origin, code: 'UPSTREAM_ERROR' });
  success(res, data, { origin, cacheMaxAge: 60, rateLimit: { limit: 30, remaining: rateLimit.remaining, reset: rateLimit.reset } });
});