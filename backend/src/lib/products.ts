import { ensureBootstrapped } from './bootstrap.js';
import { execute, query } from './db.js';

export type ProductRecord = {
  id: number;
  name: string;
  image_url: string | null;
  price: number;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export function publicProduct(product: ProductRecord) {
  return {
    id: product.id,
    name: product.name,
    imageUrl: product.image_url ?? '',
    price: Number(product.price),
    description: product.description ?? '',
    isActive: Boolean(product.is_active),
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

export async function listProducts(includeInactive = false) {
  await ensureBootstrapped();
  const sql = includeInactive
    ? 'SELECT * FROM products ORDER BY id DESC'
    : 'SELECT * FROM products WHERE is_active = 1 ORDER BY id DESC';
  const rows = await query<ProductRecord[]>(sql);
  return rows.map(publicProduct);
}

export async function createProduct(input: {
  name: string;
  imageUrl: string;
  price: number;
  description: string;
}) {
  await ensureBootstrapped();
  await execute(
    'INSERT INTO products (name, image_url, price, description, is_active) VALUES (?, ?, ?, ?, 1)',
    [input.name.trim(), input.imageUrl.trim(), input.price, input.description.trim()],
  );
  return listProducts(true);
}

export async function updateProduct(
  id: number,
  input: Partial<{ name: string; imageUrl: string; price: number; description: string; isActive: boolean }>,
) {
  await ensureBootstrapped();
  await execute(
    `UPDATE products
     SET
       name = COALESCE(?, name),
       image_url = COALESCE(?, image_url),
       price = COALESCE(?, price),
       description = COALESCE(?, description),
       is_active = COALESCE(?, is_active)
     WHERE id = ?`,
    [
      input.name?.trim() ?? null,
      input.imageUrl?.trim() ?? null,
      input.price ?? null,
      input.description?.trim() ?? null,
      typeof input.isActive === 'boolean' ? Number(input.isActive) : null,
      id,
    ],
  );
}

export async function deleteProduct(id: number) {
  await ensureBootstrapped();
  await execute('DELETE FROM products WHERE id = ?', [id]);
}
