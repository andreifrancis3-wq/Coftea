import { requireAuth } from '../lib/auth.js';
import { allowMethods, parseJsonBody, sendError, type ApiRequest, type ApiResponse } from '../lib/http.js';
import { createProduct, deleteProduct, listProducts, updateProduct } from '../lib/products.js';

export async function productsHandler(req: ApiRequest, res: ApiResponse) {
  if (!allowMethods(req, res, ['GET', 'POST', 'PATCH', 'DELETE'])) {
    return;
  }

  if (req.method === 'GET') {
    const includeInactive = req.query?.includeInactive === 'true';
    const products = await listProducts(includeInactive);
    res.status(200).json({ success: true, products });
    return;
  }

  const auth = await requireAuth(req, res, ['admin']);
  if (!auth) {
    return;
  }

  if (req.method === 'POST') {
    const body = parseJsonBody<{ name?: string; imageUrl?: string; price?: number; description?: string }>(req.body);
    if (!body.name || body.price === undefined) {
      sendError(res, 400, 'Product name and price are required.');
      return;
    }
    const products = await createProduct({
      name: body.name,
      imageUrl: body.imageUrl ?? '',
      price: Number(body.price),
      description: body.description ?? '',
    });
    res.status(201).json({ success: true, products });
    return;
  }

  const body = parseJsonBody<{
    id?: number;
    name?: string;
    imageUrl?: string;
    price?: number;
    description?: string;
    isActive?: boolean;
  }>(req.body);

  if (!body.id) {
    sendError(res, 400, 'Product id is required.');
    return;
  }

  if (req.method === 'PATCH') {
    await updateProduct(Number(body.id), {
      name: body.name,
      imageUrl: body.imageUrl,
      price: body.price !== undefined ? Number(body.price) : undefined,
      description: body.description,
      isActive: body.isActive,
    });
    res.status(200).json({ success: true });
    return;
  }

  await deleteProduct(Number(body.id));
  res.status(200).json({ success: true });
}
