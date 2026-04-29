# COFTEA Database Setup

This file contains sample SQL commands for setting up the COFTEA database.
Run these in your MySQL client to create the database structure.

## Create Database

```sql
CREATE DATABASE IF NOT EXISTS coftea_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE coftea_db;
```

## Create Tables

### Users Table
```sql
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
);
```

### Products Table
```sql
CREATE TABLE products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_path VARCHAR(255),
    category VARCHAR(100),
    in_stock BOOLEAN DEFAULT TRUE,
    stock_quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_price (price)
);
```

### Orders Table
```sql
CREATE TABLE orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) DEFAULT 0,
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    status ENUM('pending', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
    shipping_address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
```

### Order Items Table
```sql
CREATE TABLE order_items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
);
```

### Cart Table (Session-based)
```sql
CREATE TABLE cart_items (
    cart_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id),
    INDEX idx_user_id (user_id)
);
```

### Contact Messages Table
```sql
CREATE TABLE contact_messages (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('new', 'read', 'replied') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replied_at TIMESTAMP NULL,
    reply TEXT,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
```

## Insert Sample Products

```sql
INSERT INTO products (name, description, price, image_path, category, in_stock, stock_quantity) VALUES
('Premium Espresso Blend', 'Rich and bold espresso with smooth finish', 4.50, '627631467_2328355704316497_5216833387975707325_n.png', 'Espresso', TRUE, 100),
('Caramel Macchiato', 'Creamy macchiato with caramel drizzle', 5.25, '627650135_1588053765764499_256422614052440365_n.png', 'Specialty', TRUE, 85),
('Iced Latte', 'Cold-brewed latte perfect for warm days', 4.75, '633929244_1423154946491333_1151489386537336180_n.png', 'Iced', TRUE, 120),
('Mocha Fusion', 'Blend of coffee and rich chocolate', 5.50, '628344744_1571516690801731_5533557170822677537_n.png', 'Specialty', TRUE, 95),
('Vanilla Cold Brew', 'Smooth vanilla-infused cold brew', 4.25, '626633808_936636728886089_7172700365110968575_n.png', 'Cold Brew', TRUE, 110),
('Specialty Cappuccino', 'Perfectly frothed milk with espresso shot', 4.99, '630037946_1532572294498745_3990544164060285570_n.jpg', 'Espresso', TRUE, 105),
('Americano Superior', 'Classic americano with pure espresso flavor', 3.99, '633345571_25909671305340234_141206383381508999_n.png', 'Espresso', TRUE, 150);
```

## Create Admin User (Example)

```sql
INSERT INTO users (username, name, email, password_hash) VALUES
('admin', 'admin', 'admin@users.coftea.local', SHA2('admin123', 256));
```

## Useful Queries

### View All Orders with Customer Details
```sql
SELECT o.order_id, u.name, u.email, o.total, o.status, o.created_at
FROM orders o
JOIN users u ON o.user_id = u.user_id
ORDER BY o.created_at DESC;
```

### View Sales Summary
```sql
SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total) as revenue
FROM orders
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Top Selling Products
```sql
SELECT p.name, SUM(oi.quantity) as total_sold, SUM(oi.quantity * oi.price) as revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
GROUP BY p.product_id
ORDER BY total_sold DESC;
```

### Recent Contact Messages
```sql
SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 10;
```

## Notes

- Use properly hashed passwords in production: `password_hash()` in PHP
- The storefront now signs users in with `username` and `password`
- Implement backups regularly
- Use transactions for order processing
- Add proper indexes for performance
- Set up automated backups (daily)
- Monitor database size and growth
- Keep database credentials secure (never commit to git)

## Connection String (for db.php)

```php
<?php
$db_host = 'localhost';
$db_name = 'coftea_db';
$db_user = 'root';
$db_password = ''; // Set password in production

try {
    $pdo = new PDO(
        "mysql:host=$db_host;dbname=$db_name;charset=utf8mb4",
        $db_user,
        $db_password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}
?>
```
