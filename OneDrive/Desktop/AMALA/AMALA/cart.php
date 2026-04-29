<?php
$pageTitle = 'Cart';
$pathLevel = 0;
require_once 'config.php';

if (is_post() && isset($_POST['action'])) {
    header('Content-Type: application/json');

    $action = (string) $_POST['action'];

    if ($action === 'add_to_cart') {
        $productId = (int) ($_POST['product_id'] ?? 0);
        $product = find_product_by_id($products, $productId);

        if ($product === null) {
            echo json_encode(['success' => false]);
            exit;
        }

        if (!isset($_SESSION['cart'][$productId])) {
            $_SESSION['cart'][$productId] = [
                'id' => $productId,
                'name' => $product['name'],
                'price' => (float) $product['price'],
                'quantity' => 1,
            ];
        } else {
            $_SESSION['cart'][$productId]['quantity']++;
        }

        echo json_encode([
            'success' => true,
            'cart_count' => cart_item_count(),
        ]);
        exit;
    }

    if ($action === 'remove_from_cart') {
        $productId = (int) ($_POST['product_id'] ?? 0);
        unset($_SESSION['cart'][$productId]);

        echo json_encode([
            'success' => true,
            'cart_count' => cart_item_count(),
        ]);
        exit;
    }

    if ($action === 'update_quantity') {
        $productId = (int) ($_POST['product_id'] ?? 0);
        $quantity = max(1, (int) ($_POST['quantity'] ?? 1));

        if (!isset($_SESSION['cart'][$productId])) {
            echo json_encode(['success' => false]);
            exit;
        }

        $_SESSION['cart'][$productId]['quantity'] = $quantity;
        echo json_encode([
            'success' => true,
            'cart_count' => cart_item_count(),
        ]);
        exit;
    }
}

$errors = [];
$successMessage = null;
$shippingAddress = trim((string) ($_POST['shipping_address'] ?? ($currentUser !== null ? build_address_line($currentUser) : '')));
$orderNotes = trim((string) ($_POST['notes'] ?? ''));

if (is_post() && isset($_POST['checkout'])) {
    if ($currentUser === null) {
        set_flash('error', 'Sign in before placing an order.');
        redirect_to('signin.php');
    }

    if (empty(cart_items())) {
        $errors[] = 'Your cart is empty.';
    }

    if ($shippingAddress === '') {
        $errors[] = 'Please enter a shipping address.';
    }

    if ($pdo === null) {
        $errors[] = 'Database connection is unavailable. Start MySQL before checking out.';
    }

    if (empty($errors)) {
        $orderId = create_order_from_cart($pdo, (int) $currentUser['user_id'], cart_items(), $products, $shippingAddress, $orderNotes);

        if ($orderId === null) {
            $errors[] = 'We could not place your order right now.';
        } else {
            $_SESSION['cart'] = [];
            set_flash('success', 'Order #' . $orderId . ' has been placed successfully.');
            redirect_to('order-history.php');
        }
    }
}

$cart = cart_items();
$subtotal = cart_subtotal();
$tax = cart_tax($subtotal);
$shipping = cart_shipping($subtotal);
$total = cart_total($subtotal);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shopping Cart - COFTEA Coffee Shop</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <?php require_once 'includes/header.php'; ?>

    <section class="page-hero page-hero--compact">
        <div class="shell page-hero__layout">
            <div>
                <p class="eyebrow">Checkout flow</p>
                <h1>Review your cart and place a real order.</h1>
                <p class="page-hero__copy">Line items update in place, totals recalculate automatically, and successful checkout writes to the database.</p>
            </div>
        </div>
    </section>

    <section class="section">
        <div class="shell">
            <?php if ($flash !== null): ?>
                <?php echo alert_markup((string) $flash['type'], (string) $flash['message']); ?>
            <?php endif; ?>

            <?php if ($successMessage !== null): ?>
                <?php echo alert_markup('success', $successMessage); ?>
            <?php endif; ?>

            <?php if (!empty($errors)): ?>
                <?php foreach ($errors as $error): ?>
                    <?php echo alert_markup('error', $error); ?>
                <?php endforeach; ?>
            <?php endif; ?>

            <?php if (empty($cart)): ?>
                <div class="empty-state">
                    <p class="eyebrow">No items yet</p>
                    <h2>Your cart is empty.</h2>
                    <p>Browse the menu and add a drink to get started.</p>
                    <a href="menu.php" class="btn btn-primary">Go to menu</a>
                </div>
            <?php else: ?>
                <div class="cart-layout">
                    <div class="surface-panel">
                        <div class="section-header section-header--tight">
                            <div>
                                <p class="eyebrow">Cart items</p>
                                <h2>Ready to checkout</h2>
                            </div>
                        </div>

                        <table class="cart-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Price</th>
                                    <th>Quantity</th>
                                    <th>Total</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($cart as $item): ?>
                                    <tr>
                                        <td>
                                            <strong><?php echo e($item['name']); ?></strong>
                                        </td>
                                        <td><span class="item-price"><?php echo format_money((float) $item['price']); ?></span></td>
                                        <td>
                                            <div class="cart-quantity">
                                                <button class="quantity-btn" type="button" onclick="updateQuantity(<?php echo (int) $item['id']; ?>, <?php echo (int) $item['quantity']; ?> - 1)">-</button>
                                                <input
                                                    class="quantity-input"
                                                    type="number"
                                                    min="1"
                                                    value="<?php echo (int) $item['quantity']; ?>"
                                                    onchange="updateQuantity(<?php echo (int) $item['id']; ?>, this.value)"
                                                >
                                                <button class="quantity-btn" type="button" onclick="updateQuantity(<?php echo (int) $item['id']; ?>, <?php echo (int) $item['quantity']; ?> + 1)">+</button>
                                            </div>
                                        </td>
                                        <td><span class="item-total"><?php echo format_money((float) $item['price'] * (int) $item['quantity']); ?></span></td>
                                        <td>
                                            <button class="remove-btn" type="button" onclick="removeFromCart(<?php echo (int) $item['id']; ?>)">Remove</button>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>

                    <div class="stack-grid">
                        <div class="surface-panel">
                            <div class="summary-row">
                                <span>Subtotal</span>
                                <span data-subtotal><?php echo format_money($subtotal); ?></span>
                            </div>
                            <div class="summary-row">
                                <span>Tax</span>
                                <span id="taxAmount"><?php echo format_money($tax); ?></span>
                            </div>
                            <div class="summary-row">
                                <span>Shipping</span>
                                <span id="shippingAmount"><?php echo $shipping === 0.0 ? 'FREE' : format_money($shipping); ?></span>
                            </div>
                            <div class="summary-row total">
                                <span>Total</span>
                                <span data-total><?php echo format_money($total); ?></span>
                            </div>
                        </div>

                        <div class="form-card">
                            <div class="section-header section-header--tight">
                                <div>
                                    <p class="eyebrow">Shipping details</p>
                                    <h2>Place order</h2>
                                </div>
                            </div>

                            <form method="POST" onsubmit="return validateForm(this)">
                                <div class="form-group">
                                    <label for="shipping_address">Shipping address</label>
                                    <textarea id="shipping_address" name="shipping_address" placeholder="Enter your delivery address" required><?php echo e($shippingAddress); ?></textarea>
                                </div>
                                <div class="form-group">
                                    <label for="notes">Order notes</label>
                                    <textarea id="notes" name="notes" placeholder="Optional notes for this order"><?php echo e($orderNotes); ?></textarea>
                                </div>
                                <button type="submit" name="checkout" class="btn btn-primary btn-block">Proceed to checkout</button>
                            </form>

                            <?php if ($currentUser === null): ?>
                                <p class="helper-copy">You will be asked to sign in before the order is placed.</p>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </section>

    <?php require_once 'includes/footer.php'; ?>
    <script src="assets/js/script.js"></script>
</body>
</html>
