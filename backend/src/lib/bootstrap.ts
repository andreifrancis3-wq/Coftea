import { execute, query } from './db.js';
import { SEEDED_PRODUCTS } from './constants.js';
import { hashPassword } from './passwords.js';

let bootstrapPromise: Promise<void> | null = null;

export async function ensureBootstrapped() {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap();
  }
  await bootstrapPromise;
}

async function bootstrap() {
  await execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(100) UNIQUE NOT NULL,
      display_name VARCHAR(150) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'staff', 'customer') NOT NULL DEFAULT 'customer',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      image_url TEXT,
      price DECIMAL(10, 2) NOT NULL,
      description TEXT,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      status ENUM('pending', 'processing', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
      total DECIMAL(10, 2) NOT NULL,
      shipping_address TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    )
  `);

  const adminUsername = (process.env.COFTEA_ADMIN_USERNAME ?? 'admin').trim().toLowerCase();
  const adminPassword = process.env.COFTEA_ADMIN_PASSWORD ?? 'Admin@12345';
  const existingAdmins = (await query<Array<{ id: number }>>(
    'SELECT id FROM users WHERE username = ? LIMIT 1',
    [adminUsername],
  )) ?? [];

  if (existingAdmins.length === 0) {
    await execute(
      'INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES (?, ?, ?, "admin", 1)',
      [adminUsername, 'System Admin', hashPassword(adminPassword)],
    );
  } else {
    await execute('UPDATE users SET role = "admin", is_active = 1 WHERE id = ?', [existingAdmins[0].id]);
  }

  const existingProducts = (await query<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM products')) ?? [];
  if ((existingProducts[0]?.count ?? 0) === 0) {
    for (const product of SEEDED_PRODUCTS) {
      await execute(
        'INSERT INTO products (name, image_url, price, description, is_active) VALUES (?, ?, ?, ?, 1)',
        [product.name, product.imageUrl, product.price, product.description],
      );
    }
  }
}
