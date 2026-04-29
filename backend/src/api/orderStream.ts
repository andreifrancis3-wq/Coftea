import { requireAuth } from '../lib/auth.js';
import { allowMethods, type ApiRequest, type ApiResponse } from '../lib/http.js';
import { getOrdersVersion } from '../lib/orders.js';

export async function orderStreamHandler(req: ApiRequest, res: ApiResponse) {
  if (!allowMethods(req, res, ['GET'])) {
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) {
    return;
  }

  const userId = auth.user.role === 'customer' ? auth.user.id : undefined;
  const version = await getOrdersVersion(userId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.end(`event: orders\ndata: ${JSON.stringify({ version, at: new Date().toISOString() })}\n\n`);
}
