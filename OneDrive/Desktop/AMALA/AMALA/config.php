<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['cart']) || !is_array($_SESSION['cart'])) {
    $_SESSION['cart'] = [];
}

const COFTEA_SHIPPING_THRESHOLD = 50.00;
const COFTEA_SHIPPING_FEE = 5.99;
const COFTEA_TAX_RATE = 0.10;

function e(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function redirect_to(string $path): void
{
    header('Location: ' . $path);
    exit;
}

function is_post(): bool
{
    return ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
}

function set_flash(string $type, string $message): void
{
    $_SESSION['flash'] = [
        'type' => $type,
        'message' => $message,
    ];
}

function pull_flash(): ?array
{
    if (!isset($_SESSION['flash']) || !is_array($_SESSION['flash'])) {
        return null;
    }

    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);

    return $flash;
}

function alert_markup(string $type, string $message): string
{
    return '<div class="alert alert-' . e($type) . '">' . e($message) . '</div>';
}

function clear_user_session(): void
{
    unset(
        $_SESSION['user_id'],
        $_SESSION['user_name'],
        $_SESSION['user_username'],
        $_SESSION['user_email'],
        $_SESSION['user_phone']
    );
}

function sync_session_user(array $user): void
{
    $_SESSION['user_id'] = (int) $user['user_id'];
    $_SESSION['user_name'] = $user['name'] ?? '';
    $_SESSION['user_username'] = $user['username'] ?? ($user['name'] ?? '');
    $_SESSION['user_email'] = $user['email'] ?? '';
    $_SESSION['user_phone'] = $user['phone'] ?? '';
}

function normalize_username(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9._-]+/', '', $value) ?? '';

    return substr($value, 0, 40);
}

function is_internal_email(string $email): bool
{
    return str_ends_with(strtolower($email), '@users.coftea.local');
}

function build_internal_email(string $username): string
{
    return normalize_username($username) . '@users.coftea.local';
}

function table_has_column(PDO $pdo, string $table, string $column): bool
{
    $statement = $pdo->prepare("SHOW COLUMNS FROM `{$table}` LIKE ?");
    $statement->execute([$column]);

    return (bool) $statement->fetch(PDO::FETCH_ASSOC);
}

function table_has_index(PDO $pdo, string $table, string $index): bool
{
    $statement = $pdo->prepare("SHOW INDEX FROM `{$table}` WHERE Key_name = ?");
    $statement->execute([$index]);

    return (bool) $statement->fetch(PDO::FETCH_ASSOC);
}

function get_user_by_username(?PDO $pdo, string $username): ?array
{
    if ($pdo === null) {
        return null;
    }

    $normalized = normalize_username($username);
    if ($normalized === '') {
        return null;
    }

    $statement = $pdo->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
    $statement->execute([$normalized]);
    $user = $statement->fetch(PDO::FETCH_ASSOC);

    return $user ?: null;
}

function make_unique_username(PDO $pdo, string $seed, ?int $ignoreUserId = null): string
{
    $base = normalize_username($seed);
    if ($base === '') {
        $base = 'guest';
    }

    $candidate = $base;
    $suffix = 1;

    while (true) {
        $statement = $pdo->prepare(
            'SELECT user_id FROM users WHERE username = ?' . ($ignoreUserId !== null ? ' AND user_id <> ?' : '') . ' LIMIT 1'
        );
        $params = [$candidate];

        if ($ignoreUserId !== null) {
            $params[] = $ignoreUserId;
        }

        $statement->execute($params);

        if (!$statement->fetch(PDO::FETCH_ASSOC)) {
            return $candidate;
        }

        $candidate = substr($base, 0, max(1, 40 - strlen((string) $suffix) - 1)) . '-' . $suffix;
        $suffix++;
    }
}

function ensure_user_schema(?PDO $pdo): void
{
    if ($pdo === null) {
        return;
    }

    try {
        if (!table_has_column($pdo, 'users', 'username')) {
            $pdo->exec('ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL AFTER user_id');
        }

        $users = $pdo->query('SELECT user_id, username, name, email FROM users')->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $updateStatement = $pdo->prepare('UPDATE users SET username = ?, name = COALESCE(NULLIF(name, ""), ?) WHERE user_id = ?');

        foreach ($users as $user) {
            $currentUsername = trim((string) ($user['username'] ?? ''));
            if ($currentUsername !== '') {
                continue;
            }

            $seed = trim((string) ($user['name'] ?? ''));
            if ($seed === '') {
                $seed = explode('@', (string) ($user['email'] ?? 'guest'), 2)[0];
            }

            $username = make_unique_username($pdo, $seed, (int) $user['user_id']);
            $updateStatement->execute([$username, $username, (int) $user['user_id']]);
        }

        if (!table_has_index($pdo, 'users', 'idx_username')) {
            $pdo->exec('ALTER TABLE users ADD UNIQUE KEY idx_username (username)');
        }

        $pdo->exec('ALTER TABLE users MODIFY username VARCHAR(100) NOT NULL');
    } catch (Throwable) {
        // Keep the storefront usable even if schema migration cannot run automatically.
    }
}

function verify_stored_password(string $password, string $storedHash): bool
{
    if ($storedHash === '') {
        return false;
    }

    if (password_verify($password, $storedHash)) {
        return true;
    }

    return hash('sha256', $password) === $storedHash;
}

function cart_items(): array
{
    return $_SESSION['cart'] ?? [];
}

function cart_item_count(): int
{
    $count = 0;

    foreach (cart_items() as $item) {
        $count += (int) ($item['quantity'] ?? 0);
    }

    return $count;
}

function cart_subtotal(): float
{
    $subtotal = 0.0;

    foreach (cart_items() as $item) {
        $subtotal += ((float) ($item['price'] ?? 0)) * ((int) ($item['quantity'] ?? 0));
    }

    return round($subtotal, 2);
}

function cart_tax(float $subtotal): float
{
    return round($subtotal * COFTEA_TAX_RATE, 2);
}

function cart_shipping(float $subtotal): float
{
    if ($subtotal <= 0) {
        return 0.0;
    }

    return $subtotal >= COFTEA_SHIPPING_THRESHOLD ? 0.0 : COFTEA_SHIPPING_FEE;
}

function cart_total(float $subtotal): float
{
    return round($subtotal + cart_tax($subtotal) + cart_shipping($subtotal), 2);
}

function format_money(float $amount): string
{
    return '$' . number_format($amount, 2);
}

function format_datetime(string $value): string
{
    $timestamp = strtotime($value);

    if ($timestamp === false) {
        return $value;
    }

    return date('M d, Y g:i A', $timestamp);
}

function format_order_status(string $status): string
{
    return ucfirst(strtolower($status));
}

function order_status_class(string $status): string
{
    return match (strtolower($status)) {
        'completed' => 'status-completed',
        'processing' => 'status-processing',
        'cancelled' => 'status-cancelled',
        default => 'status-pending',
    };
}

function build_address_line(array $user): string
{
    $parts = [];

    foreach (['address', 'city', 'state', 'zip_code', 'country'] as $key) {
        $value = trim((string) ($user[$key] ?? ''));
        if ($value !== '') {
            $parts[] = $value;
        }
    }

    return implode(', ', $parts);
}

function default_products(): array
{
    return [
        [
            'id' => 1,
            'name' => 'Midnight Espresso',
            'description' => 'Bold espresso with cocoa depth and a smooth, velvety finish.',
            'price' => 4.50,
            'image' => 'midnight-espresso.svg',
            'category' => 'Espresso',
        ],
        [
            'id' => 2,
            'name' => 'Caramel Cloud',
            'description' => 'Silky milk, espresso, and caramel layered into a sweet signature drink.',
            'price' => 5.25,
            'image' => 'caramel-cloud.svg',
            'category' => 'Specialty',
        ],
        [
            'id' => 3,
            'name' => 'Iced Velvet Latte',
            'description' => 'Chilled espresso and milk over ice for a crisp afternoon reset.',
            'price' => 4.75,
            'image' => 'iced-velvet-latte.svg',
            'category' => 'Iced',
        ],
        [
            'id' => 4,
            'name' => 'Mocha Ember',
            'description' => 'A rich chocolate-and-coffee blend balanced with a warm roast profile.',
            'price' => 5.50,
            'image' => 'mocha-ember.svg',
            'category' => 'Specialty',
        ],
        [
            'id' => 5,
            'name' => 'Vanilla Cold Brew',
            'description' => 'Slow-steeped cold brew finished with soft vanilla sweetness.',
            'price' => 4.25,
            'image' => 'vanilla-cold-brew.svg',
            'category' => 'Cold Brew',
        ],
        [
            'id' => 6,
            'name' => 'House Cappuccino',
            'description' => 'Classic cappuccino with microfoam and a balanced espresso base.',
            'price' => 4.99,
            'image' => 'house-cappuccino.svg',
            'category' => 'Espresso',
        ],
    ];
}

function product_image_path(array $product): string
{
    $image = trim((string) ($product['image'] ?? ''));
    if ($image !== '' && file_exists(__DIR__ . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . $image)) {
        return 'assets/images/' . $image;
    }

    $slug = strtolower((string) ($product['name'] ?? ''));
    $map = [
        'midnight espresso' => 'midnight-espresso.svg',
        'caramel cloud' => 'caramel-cloud.svg',
        'iced velvet latte' => 'iced-velvet-latte.svg',
        'mocha ember' => 'mocha-ember.svg',
        'vanilla cold brew' => 'vanilla-cold-brew.svg',
        'house cappuccino' => 'house-cappuccino.svg',
    ];

    $fallback = $map[$slug] ?? 'coffee-house.svg';
    return 'assets/images/' . $fallback;
}

function fetch_products(?PDO $pdo): array
{
    if ($pdo === null) {
        return default_products();
    }

    try {
        $statement = $pdo->query(
            'SELECT product_id AS id, name, description, price, COALESCE(image_path, "") AS image, COALESCE(category, "") AS category
             FROM products
             WHERE in_stock = 1
             ORDER BY product_id ASC'
        );
        $products = $statement->fetchAll(PDO::FETCH_ASSOC);

        return !empty($products) ? $products : default_products();
    } catch (Throwable) {
        return default_products();
    }
}

function featured_products(array $products, int $limit = 3): array
{
    return array_slice($products, 0, $limit);
}

function find_product_by_id(array $products, int $productId): ?array
{
    foreach ($products as $product) {
        if ((int) ($product['id'] ?? 0) === $productId) {
            return $product;
        }
    }

    return null;
}

function get_user_by_email(?PDO $pdo, string $email): ?array
{
    if ($pdo === null) {
        return null;
    }

    $statement = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $statement->execute([$email]);
    $user = $statement->fetch(PDO::FETCH_ASSOC);

    return $user ?: null;
}

function get_user_by_id(?PDO $pdo, int $userId): ?array
{
    if ($pdo === null) {
        return null;
    }

    $statement = $pdo->prepare('SELECT * FROM users WHERE user_id = ? LIMIT 1');
    $statement->execute([$userId]);
    $user = $statement->fetch(PDO::FETCH_ASSOC);

    return $user ?: null;
}

function current_user(?PDO $pdo): ?array
{
    if (!isset($_SESSION['user_id'])) {
        return null;
    }

    $userId = (int) $_SESSION['user_id'];

    if ($pdo === null) {
        return [
            'user_id' => $userId,
            'name' => $_SESSION['user_name'] ?? '',
            'username' => $_SESSION['user_username'] ?? ($_SESSION['user_name'] ?? ''),
            'email' => $_SESSION['user_email'] ?? '',
            'phone' => $_SESSION['user_phone'] ?? '',
            'password_hash' => '',
            'address' => '',
            'city' => '',
            'state' => '',
            'zip_code' => '',
            'country' => '',
            'created_at' => '',
        ];
    }

    $user = get_user_by_id($pdo, $userId);
    if ($user === null) {
        clear_user_session();

        return null;
    }

    sync_session_user($user);

    return $user;
}

function require_login(?array $user): void
{
    if ($user === null) {
        set_flash('error', 'Please sign in to continue.');
        redirect_to('signin.php');
    }
}

function save_contact_message(?PDO $pdo, string $name, string $email, string $subject, string $message): bool
{
    if ($pdo === null) {
        return false;
    }

    $statement = $pdo->prepare(
        'INSERT INTO contact_messages (name, email, subject, message)
         VALUES (?, ?, ?, ?)'
    );

    return $statement->execute([$name, $email, $subject, $message]);
}

function fetch_user_orders(?PDO $pdo, int $userId): array
{
    if ($pdo === null) {
        return [];
    }

    $statement = $pdo->prepare(
        'SELECT
            o.order_id,
            o.total,
            o.tax,
            o.shipping_cost,
            o.status,
            o.shipping_address,
            o.notes,
            o.created_at,
            GROUP_CONCAT(
                CONCAT(oi.quantity, "x ", COALESCE(p.name, CONCAT("Item #", oi.product_id)))
                ORDER BY oi.item_id SEPARATOR ", "
            ) AS item_summary
         FROM orders o
         LEFT JOIN order_items oi ON oi.order_id = o.order_id
         LEFT JOIN products p ON p.product_id = oi.product_id
         WHERE o.user_id = ?
         GROUP BY o.order_id, o.total, o.tax, o.shipping_cost, o.status, o.shipping_address, o.notes, o.created_at
         ORDER BY o.created_at DESC'
    );
    $statement->execute([$userId]);

    return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

function create_order_from_cart(
    ?PDO $pdo,
    int $userId,
    array $cart,
    array $products,
    string $shippingAddress,
    string $notes
): ?int {
    if ($pdo === null || empty($cart)) {
        return null;
    }

    $orderLines = [];
    $subtotal = 0.0;

    foreach ($cart as $item) {
        $productId = (int) ($item['id'] ?? 0);
        $quantity = max(1, (int) ($item['quantity'] ?? 1));
        $product = find_product_by_id($products, $productId);

        if ($product === null) {
            return null;
        }

        $price = (float) $product['price'];
        $subtotal += $price * $quantity;
        $orderLines[] = [
            'product_id' => $productId,
            'quantity' => $quantity,
            'price' => $price,
        ];
    }

    $tax = cart_tax($subtotal);
    $shipping = cart_shipping($subtotal);
    $total = $subtotal + $tax + $shipping;

    try {
        $pdo->beginTransaction();

        $orderStatement = $pdo->prepare(
            'INSERT INTO orders (user_id, total, tax, shipping_cost, status, shipping_address, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $orderStatement->execute([
            $userId,
            $total,
            $tax,
            $shipping,
            'pending',
            $shippingAddress,
            $notes,
        ]);

        $orderId = (int) $pdo->lastInsertId();
        $itemStatement = $pdo->prepare(
            'INSERT INTO order_items (order_id, product_id, quantity, price)
             VALUES (?, ?, ?, ?)'
        );

        foreach ($orderLines as $line) {
            $itemStatement->execute([
                $orderId,
                $line['product_id'],
                $line['quantity'],
                $line['price'],
            ]);
        }

        $pdo->commit();

        return $orderId;
    } catch (Throwable) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        return null;
    }
}

$pdo = null;
$db_error = null;
$db_host = getenv('COFTEA_DB_HOST') ?: '127.0.0.1';
$db_name = getenv('COFTEA_DB_NAME') ?: 'coftea_db';
$db_user = getenv('COFTEA_DB_USER') ?: 'root';
$db_password = getenv('COFTEA_DB_PASSWORD') ?: '';

try {
    $pdo = new PDO(
        "mysql:host={$db_host};dbname={$db_name};charset=utf8mb4",
        $db_user,
        $db_password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (Throwable $exception) {
    $db_error = $exception->getMessage();
}

ensure_user_schema($pdo);

$products = fetch_products($pdo);
$currentUser = current_user($pdo);
$flash = pull_flash();
