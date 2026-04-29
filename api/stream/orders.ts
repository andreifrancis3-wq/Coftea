import { orderStreamHandler } from '../../backend/src/api/orderStream.js';

export default async function handler(req: any, res: any) {
  await orderStreamHandler(req, res);
}
