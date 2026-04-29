document.addEventListener('DOMContentLoaded', () => {
    initializeButtons();
    initializeNavigation();
    initializeProfileDropdown();
    initializeCart();
    initializeSmoothScrolling();
});

function initializeButtons() {
    document.querySelectorAll('.btn').forEach((button) => {
        button.addEventListener('click', (event) => {
            addRipple(event, button);
            button.classList.add('active');

            window.setTimeout(() => {
                button.classList.remove('active');
            }, 600);
        });
    });
}

function addRipple(event, button) {
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);

    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    ripple.classList.add('ripple');

    const existingRipple = button.querySelector('.ripple');
    if (existingRipple) {
        existingRipple.remove();
    }

    button.appendChild(ripple);
}

function initializeNavigation() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.php';

    document.querySelectorAll('.nav-link').forEach((link) => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
}

function initializeProfileDropdown() {
    const profileToggle = document.getElementById('profileToggle');
    const profileMenu = document.getElementById('profileMenu');

    if (!profileToggle || !profileMenu) {
        return;
    }

    profileToggle.addEventListener('click', (event) => {
        event.stopPropagation();
        profileToggle.classList.toggle('active');
        profileMenu.classList.toggle('active');
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.profile-dropdown')) {
            profileToggle.classList.remove('active');
            profileMenu.classList.remove('active');
        }
    });
}

function initializeCart() {
    document.querySelectorAll('.quantity-input').forEach((input) => {
        input.addEventListener('change', () => {
            updateCartTotals();
        });
    });
}

function updateQuantity(productId, newQuantity) {
    const quantity = Math.max(1, parseInt(newQuantity, 10) || 1);
    const formData = new FormData();

    formData.append('action', 'update_quantity');
    formData.append('product_id', productId);
    formData.append('quantity', quantity);

    fetch('cart.php', {
        method: 'POST',
        body: formData,
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Unable to update cart quantity.');
            }
            return response.json();
        })
        .then((data) => {
            if (data.success) {
                updateCartTotals();
            } else {
                showNotification('Could not update the cart.', 'error');
            }
        })
        .catch(() => {
            showNotification('Could not update the cart.', 'error');
        });
}

function updateCartTotals() {
    const rows = document.querySelectorAll('.cart-table tbody tr');
    let subtotal = 0;

    rows.forEach((row) => {
        const priceElement = row.querySelector('.item-price');
        const totalElement = row.querySelector('.item-total');
        const quantityInput = row.querySelector('.quantity-input');

        if (!priceElement || !totalElement || !quantityInput) {
            return;
        }

        const price = parseFloat(priceElement.textContent.replace('$', '')) || 0;
        const quantity = Math.max(1, parseInt(quantityInput.value, 10) || 1);
        const lineTotal = price * quantity;

        totalElement.textContent = `$${lineTotal.toFixed(2)}`;
        subtotal += lineTotal;
    });

    const tax = subtotal * 0.1;
    const shipping = subtotal > 50 || subtotal === 0 ? 0 : 5.99;
    const total = subtotal + tax + shipping;

    updateAmountElement('[data-subtotal]', subtotal);
    updateAmountElement('#taxAmount', tax);
    updateAmountElement('[data-total]', total);

    const shippingElement = document.querySelector('#shippingAmount');
    if (shippingElement) {
        shippingElement.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    }
}

function updateAmountElement(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = `$${value.toFixed(2)}`;
    }
}

function addToCart(productId, productName, productPrice, buttonElement = null) {
    const formData = new FormData();

    formData.append('action', 'add_to_cart');
    formData.append('product_id', productId);
    formData.append('product_name', productName);
    formData.append('product_price', productPrice);

    const originalText = buttonElement ? buttonElement.textContent : null;

    fetch('cart.php', {
        method: 'POST',
        body: formData,
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Unable to add the item.');
            }
            return response.json();
        })
        .then((data) => {
            if (!data.success) {
                throw new Error('Unable to add the item.');
            }

            updateCartCount(data.cart_count);
            showNotification(`${productName} added to cart.`, 'success');

            if (buttonElement) {
                buttonElement.textContent = 'Added';
                window.setTimeout(() => {
                    buttonElement.textContent = originalText;
                }, 1500);
            }
        })
        .catch(() => {
            showNotification('Could not add the item to the cart.', 'error');
        });
}

function removeFromCart(productId) {
    const formData = new FormData();

    formData.append('action', 'remove_from_cart');
    formData.append('product_id', productId);

    fetch('cart.php', {
        method: 'POST',
        body: formData,
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Unable to remove the item.');
            }
            return response.json();
        })
        .then((data) => {
            if (!data.success) {
                throw new Error('Unable to remove the item.');
            }

            updateCartCount(data.cart_count);
            showNotification('Item removed from cart.', 'success');
            window.setTimeout(() => window.location.reload(), 400);
        })
        .catch(() => {
            showNotification('Could not remove the item from the cart.', 'error');
        });
}

function updateCartCount(count) {
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.textContent = String(count);
    }
}

function showNotification(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.position = 'fixed';
    alert.style.top = '80px';
    alert.style.right = '20px';
    alert.style.zIndex = '5000';
    alert.style.maxWidth = '360px';

    document.body.appendChild(alert);

    window.setTimeout(() => {
        alert.remove();
    }, 2500);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
    return password.length >= 8;
}

function validateForm(formElement) {
    let valid = true;
    const requiredFields = formElement.querySelectorAll('input[required], textarea[required]');

    requiredFields.forEach((input) => {
        const value = input.type === 'checkbox' ? input.checked : input.value.trim() !== '';
        input.style.borderColor = '';

        if (!value) {
            input.style.borderColor = '#ff6b6b';
            valid = false;
        }

        if (input.type === 'email' && input.value && !validateEmail(input.value)) {
            input.style.borderColor = '#ff6b6b';
            valid = false;
        }

        if (input.type === 'password' && input.hasAttribute('data-validate') && !validatePassword(input.value)) {
            input.style.borderColor = '#ff6b6b';
            valid = false;
        }
    });

    return valid;
}

function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (event) => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (!target) {
                return;
            }

            event.preventDefault();
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });
    });
}
