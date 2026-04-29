<?php
$pageTitle = 'Sign In';
$pathLevel = 0;
require_once 'config.php';

if ($currentUser !== null) {
    redirect_to('index.php');
}

$errors = [];
$username = normalize_username((string) ($_POST['username'] ?? ''));

if (is_post() && isset($_POST['signin'])) {
    $password = (string) ($_POST['password'] ?? '');

    if ($username === '') {
        $errors[] = 'Enter your username.';
    }

    if ($password === '') {
        $errors[] = 'Enter your password.';
    }

    if ($pdo === null) {
        $errors[] = 'Database connection is unavailable. Start MySQL and try again.';
    }

    if (empty($errors)) {
        $user = get_user_by_username($pdo, $username);

        if ($user === null || !verify_stored_password($password, (string) $user['password_hash'])) {
            $errors[] = 'Username or password is incorrect.';
        } else {
            sync_session_user($user);
            set_flash('success', 'Welcome back, ' . ($user['username'] ?? $user['name']) . '.');
            redirect_to('index.php');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In - COFTEA Coffee Shop</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <?php require_once 'includes/header.php'; ?>

    <section class="page-hero page-hero--compact auth-hero">
        <div class="shell auth-hero__wrap">
            <div class="auth-hero__copy">
                <p class="eyebrow">Welcome back</p>
                <h1>Sign in and pick up where you left off.</h1>
                <p class="page-hero__copy">A simpler username and password flow, with a calmer layout and easier navigation.</p>
            </div>
        </div>
    </section>

    <section class="section">
        <div class="shell auth-layout">
            <div class="form-card auth-card">
                <div class="section-header section-header--tight">
                    <div>
                        <p class="eyebrow">Account access</p>
                        <h2>Sign in</h2>
                    </div>
                </div>

                <?php if ($flash !== null): ?>
                    <?php echo alert_markup((string) $flash['type'], (string) $flash['message']); ?>
                <?php endif; ?>

                <?php if (!empty($errors)): ?>
                    <?php foreach ($errors as $error): ?>
                        <?php echo alert_markup('error', $error); ?>
                    <?php endforeach; ?>
                <?php endif; ?>

                <form method="POST" onsubmit="return validateForm(this)">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" value="<?php echo e($username); ?>" placeholder="yourusername" required>
                    </div>

                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" placeholder="Enter your password" required>
                    </div>

                    <button type="submit" name="signin" class="btn btn-primary btn-block">Sign in</button>
                </form>

                <p class="helper-copy">No account yet? <a href="create-account.php">Create one here</a>.</p>
            </div>

            <aside class="promo-card auth-sidecard">
                <p class="eyebrow">Why sign in</p>
                <h3>Keep the experience relaxed and easy to follow.</h3>
                <ul class="feature-list">
                    <li>Use a simple username and password</li>
                    <li>See order history tied to your account</li>
                    <li>Move through the site with a cleaner, lighter layout</li>
                </ul>
            </aside>
        </div>
    </section>

    <?php require_once 'includes/footer.php'; ?>
    <script src="assets/js/script.js"></script>
</body>
</html>
