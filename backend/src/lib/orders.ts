import { ensureBootstrapped } from './bootstrap.js';
import { getPool, query } from './db.js';
import { ORDER_STATUSES, type OrderStatus, type Role } from './constants.js';

export type CartItemInput = {
  productId: number;
  quantity: number;
};

type OrderRow = {
  id: number;
  user_id: number;
  username: string;
  status: OrderStatus;
  total: number;
  shipping_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  item_summary: string | null;
};

function publicOrder(order: OrderRow) {
  return {
    id: order.id,
    userId: order.user_id,
    username: order.username,
    status: order.status,
    total: Number(order.total),
    shippingAddress: order.shipping_address ?? '',
    notes: order.notes ?? '',
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    itemSummary: order.item_summary ?? '',
  };
}

const ORDER_QUERY = `
  SELECT
    o.id,
    o.user_id,
    u.username,
    o.status,
    o.total,
    o.shipping_address,
    o.notes,
    o.created_at,
    o.updated_at,
    GROUP_CONCAT(CONCAT(oi.quantity, 'x ', p.name) ORDER BY oi.id SEPARATOR ', ') AS item_summary
  FROM orders o
  INNER JOIN users u ON u.id = o.user_id
  LEFT JOIN order_items oi ON oi.order_id = o.id
  LEFT JOIN products p ON p.id = oi.product_id
`;

export async function listOrdersForUser(userId: number) {
  await ensureBootstrapped();
  const rows = await query<OrderRow[]>(
    `${ORDER_QUERY} WHERE o.user_id = ? GROUP BY o.id ORDER BY o.updated_at DESC, o.id DESC`,
    [userId],
  );
  return rows.map(publicOrder);
}

export async function listOrdersForDashboard(role: Role) {
  await ensureBootstrapped();
  const where = role === 'staff' ? 'WHERE o.status IN ("pending", "processing")' : '';
  const rows = await query<OrderRow[]>(
    `${ORDER_QUERY} ${where} GROUP BY o.id ORDER BY o.updated_at DESC, o.id DESC`,
  );
  return rows.map(publicOrder);
}

export async function createOrder(input: {
  userId: number;
  shippingAddress: string;
  notes: string;
  items: CartItemInput[];
}) {
  await ensureBootstrapped();
  if (!input.items.length) {
    throw new Error('Your cart is empty.');
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let total = 0;
    const orderLines: Array<{ productId: number; quantity: number; price: number }> = [];

    for (const item of input.items) {
      const [productRows] = await connection.query<any[]>(
        'SELECT id, name, price, is_active FROM products WHERE id = ? LIMIT 1',
        [item.productId],
      );
      const product = productRows[0];
      if (!product || Number(product.is_active) !== 1) {
        throw new Error('One of the selected products is unavailable.');
      }

      const quantity = Math.max(1, Number(item.quantity) || 1);
      total += Number(product.price) * quantity;
      orderLines.push({ productId: Number(product.id), quantity, price: Number(product.price) });
    }

    const [orderResult] = await connection.execute<any>(
      'INSERT INTO orders (user_id, status, total, shipping_address, notes) VALUES (?, "pending", ?, ?, ?)',
      [input.userId, total, input.shippingAddress.trim(), input.notes.trim()],
    );

    const orderId = Number(orderResult.insertId);
    for (const line of orderLines) {
      await connection.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [orderId, line.productId, line.quantity, line.price],
      );
    }

    await connection.commit();
    return orderId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateOrderStatus(orderId: number, status: string, role: Role) {
  await ensureBootstrapped();
  const normalized = status.trim().toLowerCase() as OrderStatus;

  if (!ORDER_STATUSES.includes(normalized)) {
    throw new Error('Invalid status value.');
  }

  if (role === 'staff' && normalized === 'cancelled') {
    throw new Error('Staff cannot cancel orders.');
  }

  await query('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    normalized,
    orderId,
  ]);
}

export async function getOrdersVersion(userId?: number) {
  await ensureBootstrapped();
  const rows = await query<Array<{ version: string | null }>>(
    userId
      ? 'SELECT COALESCE(MAX(updated_at), CURRENT_TIMESTAMP) AS version FROM orders WHERE user_id = ?'
      : 'SELECT COALESCE(MAX(updated_at), CURRENT_TIMESTAMP) AS version FROM orders',
    userId ? [userId] : undefined,
  );
  return rows[0]?.version ?? new Date().toISOString();
}
