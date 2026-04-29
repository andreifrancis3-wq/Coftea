import { requireAuth } from '../lib/auth.js';
import { allowMethods, parseJsonBody, sendError, type ApiRequest, type ApiResponse } from '../lib/http.js';
import { createOrder, listOrdersForDashboard, listOrdersForUser, updateOrderStatus } from '../lib/orders.js';

export async function ordersHandler(req: ApiRequest, res: ApiResponse) {
  if (!allowMethods(req, res, ['GET', 'POST', 'PATCH'])) {
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) {
    return;
  }

  if (req.method === 'GET') {
    const scope = req.query?.scope;
    if ((scope === 'all' || scope === 'active') && (auth.user.role === 'admin' || auth.user.role === 'staff')) {
      const orders = await listOrdersForDashboard(auth.user.role);
      res.status(200).json({ success: true, orders });
      return;
    }

    const orders = await listOrdersForUser(auth.user.id);
    res.status(200).json({ success: true, orders });
    return;
  }

  if (req.method === 'POST') {
    const body = parseJsonBody<{ shippingAddress?: string; notes?: string; items?: Array<{ productId: number; quantity: number }> }>(
      req.body,
    );
    if (!body.shippingAddress || !Array.isArray(body.items)) {
      sendError(res, 400, 'Shipping address and order items are required.');
      return;
    }

    try {
      const orderId = await createOrder({
        userId: auth.user.id,
        shippingAddress: body.shippingAddress,
        notes: body.notes ?? '',
        items: body.items,
      });
      res.status(201).json({ success: true, orderId });
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : 'Unable to create order.');
    }
    return;
  }

  const manager = await requireAuth(req, res, ['admin', 'staff']);
  if (!manager) {
    return;
  }

  const body = parseJsonBody<{ orderId?: number; status?: string }>(req.body);
  if (!body.orderId || !body.status) {
    sendError(res, 400, 'Order id and status are required.');
    return;
  }

  try {
    await updateOrderStatus(Number(body.orderId), body.status, manager.user.role);
    res.status(200).json({ success: true });
  } catch (error) {
    sendError(res, 400, error instanceof Error ? error.message : 'Unable to update order status.');
  }
}
