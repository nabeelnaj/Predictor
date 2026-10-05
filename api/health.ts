import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { success, withErrorHandling } from '../_lib/response';

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  // Quick KV health check
  let kvHealthy = false;
  try {
    await kv.ping();
    kvHealthy = true;
  } catch { /* ignore */ }
  
  success(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    kv: kvHealthy ? 'connected' : 'disconnected',
  });
});