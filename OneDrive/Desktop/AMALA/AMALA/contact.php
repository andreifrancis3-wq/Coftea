<?php
$pageTitle = 'Contact Us';
$pathLevel = 0;
require_once 'config.php';

$errors = [];
$contactSuccess = null;
$form = [
    'name' => trim((string) ($_POST['name'] ?? ($currentUser['name'] ?? ''))),
    'email' => trim((string) ($_POST['email'] ?? ($currentUser['email'] ?? ''))),
    'subject' => trim((string) ($_POST['subject'] ?? '')),
    'message' => trim((string) ($_POST['message'] ?? '')),
];

if (is_post() && isset($_POST['submit_contact'])) {
    foreach ($form as $field => $value) {
        if ($value === '') {
            $errors[] = 'Please complete all contact fields.';
            break;
        }
    }

    if ($form['email'] !== '' && !filter_var($form['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Enter a valid email address.';
    }

    if ($pdo === null) {
        $errors[] = 'Database connection is unavailable. Start MySQL before sending messages.';
    }

    if (empty($errors)) {
        $saved = save_contact_message($pdo, $form['name'], $form['email'], $form['subject'], $form['message']);

        if ($saved) {
            $contactSuccess = 'Thank you for your message. We will get back to you soon.';
            $form['subject'] = '';
            $form['message'] = '';
        } else {
            $errors[] = 'We could not send your message right now. Please try again.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Us - COFTEA Coffee Shop</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <?php require_once 'includes/header.php'; ?>

    <section class="page-hero">
        <div class="shell page-hero__layout">
            <div>
                <p class="eyebrow">Need help</p>
                <h1>Reach out without friction.</h1>
                <p class="page-hero__copy">The contact form now stores messages directly in the database so your inquiries are not lost.</p>
            </div>
            <div class="page-hero__panel">
                <strong>Support hours</strong>
                <span>Monday to Friday, 7:00 AM to 9:00 PM</span>
            </div>
        </div>
    </section>

    <section class="section">
        <div class="shell split-grid">
            <div class="form-card">
                <div class="section-header section-header--tight">
                    <div>
                        <p class="eyebrow">Send a message</p>
                        <h2>We would love to hear from you.</h2>
                    </div>
                </div>

                <?php if ($contactSuccess !== null): ?>
                    <?php echo alert_markup('success', $contactSuccess); ?>
                <?php endif; ?>

                <?php if (!empty($errors)): ?>
                    <?php foreach ($errors as $error): ?>
                        <?php echo alert_markup('error', $error); ?>
                    <?php endforeach; ?>
                <?php endif; ?>

                <form method="POST" onsubmit="return validateForm(this)">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="name">Full name</label>
                            <input type="text" id="name" name="name" value="<?php echo e($form['name']); ?>" placeholder="Your name" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email address</label>
                            <input type="email" id="email" name="email" value="<?php echo e($form['email']); ?>" placeholder="you@example.com" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="subject">Subject</label>
                        <input type="text" id="subject" name="subject" value="<?php echo e($form['subject']); ?>" placeholder="How can we help?" required>
                    </div>

                    <div class="form-group">
                        <label for="message">Message</label>
                        <textarea id="message" name="message" placeholder="Tell us more..." required><?php echo e($form['message']); ?></textarea>
                    </div>

                    <button type="submit" name="submit_contact" class="btn btn-primary btn-block">Send message</button>
                </form>
            </div>

            <aside class="stack-grid">
                <article class="info-card">
                    <p class="eyebrow">Visit</p>
                    <h3>123 Coffee Street</h3>
                    <p>Bean City, BC 12345</p>
                </article>
                <article class="info-card">
                    <p class="eyebrow">Call</p>
                    <h3>(555) 123-4567</h3>
                    <p>Customer support and order questions.</p>
                </article>
                <article class="info-card">
                    <p class="eyebrow">Email</p>
                    <h3>info@coftea.com</h3>
                    <p>General inquiries, partnerships, and product questions.</p>
                </article>
            </aside>
        </div>
    </section>

    <?php require_once 'includes/footer.php'; ?>
    <script src="assets/js/script.js"></script>
</body>
</html>
