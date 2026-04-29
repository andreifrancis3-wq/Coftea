<?php
$pageTitle = 'Create Account';
$pathLevel = 0;
require_once 'config.php';

if ($currentUser !== null) {
    redirect_to('index.php');
}

$errors = [];
$form = [
    'username' => normalize_username((string) ($_POST['username'] ?? '')),
];

if (is_post() && isset($_POST['signup'])) {
    $password = (string) ($_POST['password'] ?? '');
    $confirmPassword = (string) ($_POST['confirm_password'] ?? '');
    $agreed = isset($_POST['agree_terms']);

    if ($form['username'] === '' || strlen($form['username']) < 3) {
        $errors[] = 'Username must be at least 3 characters and use letters, numbers, dots, dashes, or underscores.';
    }

    if (strlen($password) < 8) {
        $errors[] = 'Password must be at least 8 characters long.';
    }

    if ($password !== $confirmPassword) {
        $errors[] = 'Passwords do not match.';
    }

    if (!$agreed) {
        $errors[] = 'You need to agree to the terms to create an account.';
    }

    if ($pdo === null) {
        $errors[] = 'Database connection is unavailable. Start MySQL and try again.';
    }

    if (empty($errors) && get_user_by_username($pdo, $form['username']) !== null) {
        $errors[] = 'That username is already taken.';
    }

    if (empty($errors)) {
        try {
            $internalEmail = build_internal_email($form['username']);
            $statement = $pdo->prepare(
                'INSERT INTO users (username, name, email, password_hash)
                 VALUES (?, ?, ?, ?)'
            );
            $statement->execute([
                $form['username'],
                $form['username'],
                $internalEmail,
                password_hash($password, PASSWORD_DEFAULT),
            ]);

            $user = get_user_by_username($pdo, $form['username']);
            if ($user !== null) {
                sync_session_user($user);
                set_flash('success', 'Your account has been created successfully.');
                redirect_to('index.php');
            }

            $errors[] = 'Account created, but automatic sign-in failed. Please sign in manually.';
        } catch (Throwable) {
            $errors[] = 'We could not create your account right now. Please try again.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Account - COFTEA Coffee Shop</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <?php require_once 'includes/header.php'; ?>

    <section class="page-hero page-hero--compact auth-hero">
        <div class="shell auth-hero__wrap">
            <div class="auth-hero__copy">
                <p class="eyebrow">Join COFTEA</p>
                <h1>Create an account in a few easy steps.</h1>
                <p class="page-hero__copy">Just choose a username and password, then head straight into the shop.</p>
            </div>
        </div>
    </section>

    <section class="section">
        <div class="shell auth-layout">
            <div class="form-card auth-card">
                <div class="section-header section-header--tight">
                    <div>
                        <p class="eyebrow">New account</p>
                        <h2>Create account</h2>
                    </div>
                </div>

                <?php if (!empty($errors)): ?>
                    <?php foreach ($errors as $error): ?>
                        <?php echo alert_markup('error', $error); ?>
                    <?php endforeach; ?>
                <?php endif; ?>

                <form method="POST" onsubmit="return validateForm(this)">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" value="<?php echo e($form['username']); ?>" placeholder="yourusername" required>
                        <small class="field-help">Letters, numbers, dashes, dots, and underscores only.</small>
                    </div>

                    <div class="form-grid auth-form-grid">
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" data-validate="password" placeholder="At least 8 characters" required>
                        </div>
                        <div class="form-group">
                            <label for="confirm_password">Confirm password</label>
                            <input type="password" id="confirm_password" name="confirm_password" placeholder="Repeat password" required>
                        </div>
                    </div>

                    <label class="checkbox-row">
                        <input type="checkbox" name="agree_terms" value="1" <?php echo isset($_POST['agree_terms']) ? 'checked' : ''; ?> required>
                        <span>I agree to the terms of service and privacy policy.</span>
                    </label>

                    <button type="submit" name="signup" class="btn btn-primary btn-block">Create account</button>
                </form>

                <p class="helper-copy">Already registered? <a href="signin.php">Sign in here</a>.</p>
            </div>

            <aside class="promo-card auth-sidecard">
                <p class="eyebrow">Member perks</p>
                <h3>Built to stay simple and easy to move through.</h3>
                <ul class="feature-list">
                    <li>No email required to get started</li>
                    <li>Username and password work directly on sign in</li>
                    <li>Cleaner form layout with less visual noise</li>
                </ul>
            </aside>
        </div>
    </section>

    <?php require_once 'includes/footer.php'; ?>
    <script src="assets/js/script.js"></script>
</body>
</html>
