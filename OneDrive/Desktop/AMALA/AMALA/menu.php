<?php
$pageTitle = 'Menu';
$pathLevel = 0;
require_once 'config.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Menu - COFTEA Coffee Shop</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <?php require_once 'includes/header.php'; ?>

    <section class="page-hero">
        <div class="shell page-hero__layout">
            <div>
                <p class="eyebrow">Curated menu</p>
                <h1>Choose a drink that feels like your corner coffee shop.</h1>
                <p class="page-hero__copy">A cleaner showcase, richer visuals, and product cards that feel handcrafted instead of generic.</p>
            </div>
            <div class="page-hero__panel menu-panel">
                <strong><?php echo count($products); ?> drinks available</strong>
                <span>From dark espresso pours to silky cold brews, every drink now has its own artwork.</span>
                <div class="menu-panel__swatches">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    </section>

    <section class="section">
        <div class="shell menu-intro">
            <div>
                <p class="eyebrow">In the bar</p>
                <h2>Built to feel like a modern coffee bar menu.</h2>
            </div>
            <p class="menu-intro__copy">Warm tones stay intact, but the experience is tidier, more visual, and more inviting to browse.</p>
        </div>

        <div class="shell card-grid card-grid--menu">
            <?php foreach ($products as $product): ?>
                <article class="product-card">
                    <div class="product-card__media">
                        <span class="product-badge"><?php echo e($product['category']); ?></span>
                        <img class="product-card__image" src="<?php echo e(product_image_path($product)); ?>" alt="<?php echo e($product['name']); ?>">
                    </div>
                    <div class="product-card__body">
                        <h3><?php echo e($product['name']); ?></h3>
                        <p><?php echo e($product['description']); ?></p>
                        <div class="product-card__footer">
                            <strong><?php echo format_money((float) $product['price']); ?></strong>
                            <div class="product-card__actions">
                                <button
                                    type="button"
                                    class="btn btn-primary btn-sm"
                                    onclick='addToCart(<?php echo (int) $product["id"]; ?>, <?php echo json_encode($product["name"], JSON_HEX_APOS | JSON_HEX_QUOT); ?>, <?php echo number_format((float) $product["price"], 2, ".", ""); ?>, this)'
                                >
                                    Add to cart
                                </button>
                            </div>
                        </div>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>
    </section>

    <?php require_once 'includes/footer.php'; ?>
    <script src="assets/js/script.js"></script>
</body>
</html>
