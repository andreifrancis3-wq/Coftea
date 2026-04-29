<?php $basePath = str_repeat('../', $pathLevel ?? 0); ?>
<header class="site-header">
    <div class="shell site-header__inner">
        <a class="brand" href="<?php echo $basePath; ?>index.php">
            <span class="brand__mark">C</span>
            <span class="brand__text">
                <strong>COFTEA</strong>
                <small>Roasted daily, poured with care</small>
            </span>
        </a>

        <nav class="site-nav" aria-label="Main navigation">
            <a class="nav-link" href="<?php echo $basePath; ?>index.php">Home</a>
            <a class="nav-link" href="<?php echo $basePath; ?>menu.php">Menu</a>
            <a class="nav-link" href="<?php echo $basePath; ?>contact.php">Contact</a>
            <a class="nav-link nav-link--cart" href="<?php echo $basePath; ?>cart.php">
                Cart
                <span class="cart-count" id="cart-count"><?php echo cart_item_count(); ?></span>
            </a>
        </nav>

        <div class="site-actions">
            <?php if ($currentUser !== null): ?>
                <div class="profile-dropdown">
                    <button class="profile-toggle" id="profileToggle" type="button">
                        <span class="profile-toggle__label">Hello</span>
                        <span class="profile-name"><?php echo e($currentUser['username'] ?? $currentUser['name']); ?></span>
                        <span class="dropdown-arrow">v</span>
                    </button>
                    <div class="profile-menu" id="profileMenu">
                        <div class="profile-menu-header">
                            <p class="welcome-text">@<?php echo e($currentUser['username'] ?? $currentUser['name']); ?></p>
                        </div>
                        <a href="<?php echo $basePath; ?>account-info.php" class="profile-menu-item">Account Info</a>
                        <a href="<?php echo $basePath; ?>order-history.php" class="profile-menu-item">Order History</a>
                        <div class="profile-menu-divider"></div>
                        <a href="<?php echo $basePath; ?>logout.php" class="profile-menu-item logout-item">Logout</a>
                    </div>
                </div>
            <?php else: ?>
                <div class="auth-actions">
                    <a href="<?php echo $basePath; ?>signin.php" class="btn btn-ghost btn-sm">Sign In</a>
                    <a href="<?php echo $basePath; ?>create-account.php" class="btn btn-primary btn-sm">Join Now</a>
                </div>
            <?php endif; ?>
        </div>
    </div>
</header>
<main class="page-shell">
