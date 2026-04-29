import { productsHandler } from '../backend/src/api/products.js';

export default async function handler(req: any, res: any) {
  await productsHandler(req, res);
}
