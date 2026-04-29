<?php
$pageTitle = 'Home';
$pathLevel = 0;
require_once 'config.php';

$featuredProducts = featured_products($products, 3);
$heroProduct = $featuredProducts[0] ?? ($products[0] ?? null);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>COFTEA Coffee Shop</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <?php require_once 'includes/header.php'; ?>

    <?php if ($flash !== null): ?>
        <section class="section">
            <div class="shell">
                <?php echo alert_markup((string) $flash['type'], (string) $flash['message']); ?>
            </div>
        </section>
    <?php endif; ?>

    <section class="hero hero--home">
        <div class="shell home-landing">
            <div class="home-copy">
                <p class="eyebrow">Slow mornings, warm cups</p>
                <h1>A softer coffee shop corner for quiet browsing.</h1>
                <p class="hero__lead">
                    COFTEA is built to feel calm and easy: warm tones, clean ordering, and drinks that look inviting before you even add them to cart.
                </p>
                <div class="hero__actions home-actions">
                    <a href="menu.php" class="btn btn-primary btn-sm">Browse Menu</a>
                    <a href="create-account.php" class="btn btn-ghost btn-sm">Create Account</a>
                </div>
                <div class="home-notes">
                    <article class="home-note">
                        <strong><?php echo count($products); ?> handcrafted drinks</strong>
                        <span>From espresso pours to creamy cold brews.</span>
                    </article>
                    <article class="home-note">
                        <strong>Easy checkout flow</strong>
                        <span>Simple cart updates and saved account history.</span>
                    </article>
                    <article class="home-note">
                        <strong>Warm, quieter layout</strong>
                        <span>Designed to feel relaxed instead of overwhelming.</span>
                    </article>
                </div>
            </div>

            <aside class="home-scene">
                <?php if ($heroProduct !== null): ?>
                    <div class="home-scene__frame">
                        <img
                            class="home-scene__image"
                            src="<?php echo e(product_image_path($heroProduct)); ?>"
                            alt="<?php echo e($heroProduct['name']); ?>"
                        >
                        <div class="home-scene__overlay">
                            <p class="eyebrow">Today&rsquo;s pour</p>
                            <h2><?php echo e($heroProduct['name']); ?></h2>
                            <p><?php echo e($heroProduct['description']); ?></p>
                            <strong><?php echo format_money((float) $heroProduct['price']); ?></strong>
                        </div>
                    </div>
                <?php endif; ?>

                <div class="home-scene__details">
                    <article class="scene-detail">
                        <p class="eyebrow">House vibe</p>
                        <h3>Cozy, mellow, and easy on the eyes.</h3>
                    </article>
                    <article class="scene-detail">
                        <p class="eyebrow">Best for</p>
                        <h3>Slow mornings, afternoon breaks, and calm ordering.</h3>
                    </article>
                </div>
            </aside>
        </div>
    </section>

    <section class="section home-story">
        <div class="shell home-story__grid">
            <article class="story-card story-card--wide">
                <p class="eyebrow">How it feels</p>
                <h2>The homepage should feel like a seat by the window, not a billboard.</h2>
                <p>
                    Softer spacing, smaller headline sizes, warmer cards, and gentler sections make the whole storefront feel more comfortable to stay in.
                </p>
            </article>
            <article class="story-card">
                <p class="eyebrow">What&rsquo;s brewing</p>
                <h3>Real accounts, saved orders, and a cleaner coffee-first presentation.</h3>
                <a href="menu.php" class="text-link">See what&rsquo;s on the menu</a>
            </article>
        </div>
    </section>

    <section class="section">
        <div class="shell section-header home-section-header">
            <div>
                <p class="eyebrow">Featured drinks</p>
                <h2>Three drinks to start with.</h2>
            </div>
            <a href="menu.php" class="text-link">View full collection</a>
        </div>

        <div class="shell home-featured-grid">
            <?php foreach ($featuredProducts as $product): ?>
                <article class="product-card product-card--home">
                    <div class="product-card__media product-card__media--home">
                        <span class="product-badge"><?php echo e($product['category']); ?></span>
                        <img class="product-card__image" src="<?php echo e(product_image_path($product)); ?>" alt="<?php echo e($product['name']); ?>">
                    </div>
                    <div class="product-card__body">
                        <h3><?php echo e($product['name']); ?></h3>
                        <p><?php echo e($product['description']); ?></p>
                        <div class="product-card__footer">
                            <strong><?php echo format_money((float) $product['price']); ?></strong>
                            <a href="menu.php" class="btn btn-ghost btn-sm">Order</a>
                        </div>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>
    </section>

    <section class="section">
        <div class="shell comfort-strip">
            <div>
                <p class="eyebrow">Settle in</p>
                <h2>A calmer storefront, still rooted in the same warm palette.</h2>
            </div>
            <p>
                The colors stay familiar, but the homepage now breathes more naturally and lets the coffee visuals do the inviting.
            </p>
        </div>
    </section>

    <?php require_once 'includes/footer.php'; ?>
    <script src="assets/js/script.js"></script>
</body>
</html>
