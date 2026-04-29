<?php
$pageTitle = 'Account Info';
$pathLevel = 0;
require_once 'config.php';

require_login($currentUser);
$currentUser = current_user($pdo);

$errors = [];
$successMessage = null;
$form = [
    'username' => trim((string) ($currentUser['username'] ?? ($currentUser['name'] ?? ''))),
    'phone' => trim((string) ($currentUser['phone'] ?? '')),
    'address' => trim((string) ($currentUser['address'] ?? '')),
    'city' => trim((string) ($currentUser['city'] ?? '')),
    'state' => trim((string) ($currentUser['state'] ?? '')),
    'zip_code' => trim((string) ($currentUser['zip_code'] ?? '')),
    'country' => trim((string) ($currentUser['country'] ?? '')),
];

if (is_post() && isset($_POST['update_profile'])) {
    foreach ($form as $key => $value) {
        $form[$key] = trim((string) ($_POST[$key] ?? ''));
    }

    $currentPassword = (string) ($_POST['current_password'] ?? '');
    $newPassword = (string) ($_POST['new_password'] ?? '');
    $confirmPassword = (string) ($_POST['confirm_password'] ?? '');

    if ($form['username'] === '' || strlen(normalize_username($form['username'])) < 3) {
        $errors[] = 'Username must be at least 3 valid characters.';
    } else {
        $form['username'] = normalize_username($form['username']);
    }

    if ($newPassword !== '' || $confirmPassword !== '' || $currentPassword !== '') {
        if ($currentPassword === '') {
            $errors[] = 'Enter your current password to change it.';
        } elseif (!verify_stored_password($currentPassword, (string) $currentUser['password_hash'])) {
            $errors[] = 'Current password is incorrect.';
        }

        if (strlen($newPassword) < 8) {
            $errors[] = 'New password must be at least 8 characters long.';
        }

        if ($newPassword !== $confirmPassword) {
            $errors[] = 'New password and confirmation do not match.';
        }
    }

    if ($pdo === null) {
        $errors[] = 'Database connection is unavailable. Start MySQL before updating your profile.';
    }

    if (empty($errors)) {
        try {
            $existingUser = get_user_by_username($pdo, $form['username']);
            if ($existingUser !== null && (int) $existingUser['user_id'] !== (int) $currentUser['user_id']) {
                $errors[] = 'That username is already taken.';
            } else {
                $passwordHash = (string) $currentUser['password_hash'];
                if ($newPassword !== '') {
                    $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
                }

                $emailToStore = (string) ($currentUser['email'] ?? '');
                if ($emailToStore === '' || is_internal_email($emailToStore)) {
                    $emailToStore = build_internal_email($form['username']);
                }

                $statement = $pdo->prepare(
                    'UPDATE users
                     SET username = ?, name = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, zip_code = ?, country = ?, password_hash = ?
                     WHERE user_id = ?'
                );
                $statement->execute([
                    $form['username'],
                    $form['username'],
                    $emailToStore,
                    $form['phone'],
                    $form['address'],
                    $form['city'],
                    $form['state'],
                    $form['zip_code'],
                    $form['country'],
                    $passwordHash,
                    (int) $currentUser['user_id'],
                ]);

                $currentUser = get_user_by_id($pdo, (int) $currentUser['user_id']);
                if ($currentUser !== null) {
                    sync_session_user($currentUser);
                }

                $successMessage = 'Your profile has been updated successfully.';
            }
        } catch (Throwable) {
            $errors[] = 'We could not save your profile right now.';
        }
    }
}

$memberSince = trim((string) ($currentUser['created_at'] ?? '')) !== ''
    ? date('F Y', strtotime((string) $currentUser['created_at']))
    : 'Recently joined';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Info - COFTEA Coffee Shop</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <?php require_once 'includes/header.php'; ?>

    <section class="page-hero page-hero--compact">
        <div class="shell page-hero__layout">
            <div>
                <p class="eyebrow">Profile management</p>
                <h1>Keep your account details ready for every order.</h1>
                <p class="page-hero__copy">Update delivery details, contact information, and password from one clean page.</p>
            </div>
        </div>
    </section>

    <section class="section">
        <div class="shell account-layout">
            <div class="form-card">
                <div class="section-header section-header--tight">
                    <div>
                        <p class="eyebrow">Account settings</p>
                        <h2>Your profile</h2>
                    </div>
                </div>

                <?php if ($successMessage !== null): ?>
                    <?php echo alert_markup('success', $successMessage); ?>
                <?php endif; ?>

                <?php if (!empty($errors)): ?>
                    <?php foreach ($errors as $error): ?>
                        <?php echo alert_markup('error', $error); ?>
                    <?php endforeach; ?>
                <?php endif; ?>

                <form method="POST" onsubmit="return validateForm(this)">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="username">Username</label>
                            <input type="text" id="username" name="username" value="<?php echo e($form['username']); ?>" required>
                        </div>
                        <div class="form-group">
                            <label for="phone">Phone</label>
                            <input type="tel" id="phone" name="phone" value="<?php echo e($form['phone']); ?>" placeholder="(555) 123-4567">
                        </div>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label for="country">Country</label>
                            <input type="text" id="country" name="country" value="<?php echo e($form['country']); ?>" placeholder="Country">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="address">Street address</label>
                        <input type="text" id="address" name="address" value="<?php echo e($form['address']); ?>" placeholder="123 Coffee Street">
                    </div>

                    <div class="form-grid form-grid--triple">
                        <div class="form-group">
                            <label for="city">City</label>
                            <input type="text" id="city" name="city" value="<?php echo e($form['city']); ?>">
                        </div>
                        <div class="form-group">
                            <label for="state">State</label>
                            <input type="text" id="state" name="state" value="<?php echo e($form['state']); ?>">
                        </div>
                        <div class="form-group">
                            <label for="zip_code">ZIP code</label>
                            <input type="text" id="zip_code" name="zip_code" value="<?php echo e($form['zip_code']); ?>">
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="section-header section-header--tight">
                        <div>
                            <p class="eyebrow">Security</p>
                            <h2>Change password</h2>
                        </div>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label for="current_password">Current password</label>
                            <input type="password" id="current_password" name="current_password" placeholder="Leave blank to keep current password">
                        </div>
                        <div class="form-group">
                            <label for="new_password">New password</label>
                            <input type="password" id="new_password" name="new_password" data-validate="password" placeholder="At least 8 characters">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="confirm_password">Confirm new password</label>
                        <input type="password" id="confirm_password" name="confirm_password" placeholder="Repeat new password">
                    </div>

                    <button type="submit" name="update_profile" class="btn btn-primary btn-block">Save changes</button>
                </form>
            </div>

            <aside class="stack-grid">
                <article class="info-card">
                    <p class="eyebrow">Membership</p>
                    <h3>Active account</h3>
                    <p>@<?php echo e($form['username']); ?> has been with COFTEA since <?php echo e($memberSince); ?>.</p>
                </article>
                <article class="info-card">
                    <p class="eyebrow">Delivery profile</p>
                    <h3><?php echo e(build_address_line($form) !== '' ? build_address_line($form) : 'Add your shipping address'); ?></h3>
                    <p>Saved address details appear during checkout for faster ordering.</p>
                </article>
                <article class="info-card">
                    <p class="eyebrow">Order access</p>
                    <h3>Everything in one place</h3>
                    <p>Use order history to track purchases tied to your account.</p>
                </article>
            </aside>
        </div>
    </section>

    <?php require_once 'includes/footer.php'; ?>
    <script src="assets/js/script.js"></script>
</body>
</html>
