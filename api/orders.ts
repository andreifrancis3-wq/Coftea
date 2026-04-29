import { ordersHandler } from '../backend/src/api/orders.js';

export default async function handler(req: any, res: any) {
  await ordersHandler(req, res);
}
