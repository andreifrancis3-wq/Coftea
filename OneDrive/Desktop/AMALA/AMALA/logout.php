<?php
require_once 'config.php';

clear_user_session();
$_SESSION['cart'] = [];
set_flash('success', 'You have been signed out.');
redirect_to('index.php');
