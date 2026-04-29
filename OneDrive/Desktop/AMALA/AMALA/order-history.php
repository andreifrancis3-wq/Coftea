<?php
$pageTitle = 'Order History';
$pathLevel = 0;
require_once 'config.php';

require_login($currentUser);
$currentUser = current_user($pdo);
$orders = fetch_user_orders($pdo, (int) $currentUser['user_id']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order History - COFTEA Coffee Shop</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <?php require_once 'includes/header.php'; ?>

    <section class="page-hero page-hero--compact">
        <div class="shell page-hero__layout">
            <div>
                <p class="eyebrow">Order archive</p>
                <h1>Your orders now persist to the database.</h1>
                <p class="page-hero__copy">Every successful checkout appears here with totals, timestamps, notes, and delivery details.</p>
            </div>
        </div>
    </section>

    <section class="section">
        <div class="shell">
            <?php if ($flash !== null): ?>
                <?php echo alert_markup((string) $flash['type'], (string) $flash['message']); ?>
            <?php endif; ?>

            <?php if (empty($orders)): ?>
                <div class="empty-state">
                    <p class="eyebrow">No orders yet</p>
                    <h2>Your account does not have any saved orders.</h2>
                    <p>Place your first order and it will appear here instantly.</p>
                    <a href="menu.php" class="btn btn-primary">Browse menu</a>
                </div>
            <?php else: ?>
                <div class="order-grid">
                    <?php foreach ($orders as $order): ?>
                        <article class="order-card">
                            <div class="order-card__top">
                                <div>
                                    <p class="order-card__label">Order #<?php echo e($order['order_id']); ?></p>
                                    <h3><?php echo format_datetime((string) $order['created_at']); ?></h3>
                                </div>
                                <span class="status-badge <?php echo order_status_class((string) $order['status']); ?>">
                                    <?php echo e(format_order_status((string) $order['status'])); ?>
                                </span>
                            </div>

                            <div class="order-meta">
                                <span>Total <?php echo format_money((float) $order['total']); ?></span>
                                <span>Tax <?php echo format_money((float) $order['tax']); ?></span>
                                <span>Shipping <?php echo format_money((float) $order['shipping_cost']); ?></span>
                            </div>

                            <div class="divider"></div>

                            <p><strong>Items:</strong> <?php echo e((string) ($order['item_summary'] ?? '')); ?></p>
                            <p><strong>Ship to:</strong> <?php echo e((string) ($order['shipping_address'] ?? '')); ?></p>

                            <?php if (trim((string) ($order['notes'] ?? '')) !== ''): ?>
                                <p><strong>Notes:</strong> <?php echo e((string) $order['notes']); ?></p>
                            <?php endif; ?>
                        </article>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </section>

    <?php require_once 'includes/footer.php'; ?>
    <script src="assets/js/script.js"></script>
</body>
</html>
