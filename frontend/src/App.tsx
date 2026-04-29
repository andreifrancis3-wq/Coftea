import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './lib/api';
import type { CartItem, Order, OrderStatus, Product, StaffAccount, User } from './types';

const ROUTES = ['/', '/menu', '/cart', '/orders', '/admin', '/staff', '/signin', '/register'] as const;
const STATUS_OPTIONS: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled'];
const STAFF_STATUS_OPTIONS: OrderStatus[] = ['pending', 'processing', 'completed'];

function App() {
  const [route, setRoute] = useState(normalizeRoute(window.location.pathname));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dashboardOrders, setDashboardOrders] = useState<Order[]>([]);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(() => readCart());
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [checkoutForm, setCheckoutForm] = useState({ shippingAddress: '', notes: '' });
  const [productForm, setProductForm] = useState({ name: '', imageUrl: '', price: '', description: '' });
  const [staffForm, setStaffForm] = useState({ username: '', password: '' });
  const [staffPasswordDrafts, setStaffPasswordDrafts] = useState<Record<number, string>>({});

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout((notify as unknown as { timer?: number }).timer);
    (notify as unknown as { timer?: number }).timer = window.setTimeout(() => setToast(''), 3000);
  }, []);

  useEffect(() => {
    const onPopState = () => setRoute(normalizeRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all([loadUser(), loadProducts()]);
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Unable to load the application.');
      } finally {
        setLoading(false);
      }
    })();
  }, [notify]);

  useEffect(() => {
    window.localStorage.setItem('coftea-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (user && route === '/signin') {
      navigate('/');
    }
  }, [route, user]);

  useEffect(() => {
    if (route === '/orders' && user) {
      void loadOwnOrders();
    }
    if ((route === '/admin' || route === '/staff') && user && (user.role === 'admin' || user.role === 'staff')) {
      void loadDashboardOrders();
    }
    if (route === '/admin' && user?.role === 'admin') {
      void loadStaffAccounts();
      void loadProducts(true);
    }
  }, [route, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const stream = new EventSource('/api/stream/orders', { withCredentials: true });
    stream.onmessage = () => {
      if (route === '/orders') {
        void loadOwnOrders();
      }
      if ((route === '/admin' || route === '/staff') && (user.role === 'admin' || user.role === 'staff')) {
        void loadDashboardOrders();
      }
    };
    stream.onerror = () => stream.close();

    const interval = window.setInterval(() => {
      if (route === '/orders') {
        void loadOwnOrders();
      }
      if ((route === '/admin' || route === '/staff') && (user.role === 'admin' || user.role === 'staff')) {
        void loadDashboardOrders();
      }
    }, 15000);

    return () => {
      stream.close();
      window.clearInterval(interval);
    };
  }, [route, user]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { subtotal, total: subtotal };
  }, [cart]);

  async function loadUser() {
    const data = await api.get<{ user: User | null }>('/api/auth/me');
    setUser(data.user ?? null);
  }

  async function loadProducts(includeInactive = false) {
    const data = await api.get<{ products: Product[] }>(
      includeInactive ? '/api/products?includeInactive=true' : '/api/products',
    );
    setProducts(data.products ?? []);
  }

  async function loadOwnOrders() {
    const data = await api.get<{ orders: Order[] }>('/api/orders');
    setOrders(data.orders ?? []);
  }

  async function loadDashboardOrders() {
    const data = await api.get<{ orders: Order[] }>('/api/orders?scope=all');
    setDashboardOrders(data.orders ?? []);
  }

  async function loadStaffAccounts() {
    const data = await api.get<{ staff: StaffAccount[] }>('/api/staff');
    setStaffAccounts(data.staff ?? []);
  }

  function navigate(path: string) {
    const next = normalizeRoute(path);
    window.history.pushState({}, '', next);
    setRoute(next);
    setMobileNavOpen(false);
  }

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          quantity: 1,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
        },
      ];
    });
    notify(`${product.name} added to cart.`);
  }

  function updateCartQuantity(productId: number, quantity: number) {
    const nextQuantity = Math.max(1, quantity);
    setCart((current) =>
      current.map((item) => (item.productId === productId ? { ...item, quantity: nextQuantity } : item)),
    );
  }

  function removeFromCart(productId: number) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  async function handleAuth(mode: 'signin' | 'register') {
    try {
      const path = mode === 'signin' ? '/api/auth/login' : '/api/auth/register';
      const data = await api.post<{ user: User }>(path, authForm);
      setUser(data.user);
      setAuthForm({ username: '', password: '' });
      notify(mode === 'signin' ? 'Signed in successfully.' : 'Account created.');
      navigate(data.user.role === 'admin' ? '/admin' : data.user.role === 'staff' ? '/staff' : '/');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Authentication failed.');
    }
  }

  async function handleLogout() {
    await api.post('/api/auth/logout');
    setUser(null);
    setOrders([]);
    setDashboardOrders([]);
    notify('Signed out.');
    navigate('/');
  }

  async function submitOrder() {
    if (!user) {
      navigate('/signin');
      notify('Sign in before placing an order.');
      return;
    }
    if (!checkoutForm.shippingAddress.trim()) {
      notify('Enter a shipping address.');
      return;
    }
    if (!cart.length) {
      notify('Your cart is empty.');
      return;
    }

    try {
      const payload = {
        shippingAddress: checkoutForm.shippingAddress,
        notes: checkoutForm.notes,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      };
      await api.post<{ orderId: number }>('/api/orders', payload);
      setCart([]);
      setCheckoutForm({ shippingAddress: '', notes: '' });
      notify('Order placed successfully.');
      navigate('/orders');
      await loadOwnOrders();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to place order.');
    }
  }

  async function submitProduct() {
    try {
      await api.post('/api/products', {
        name: productForm.name,
        imageUrl: productForm.imageUrl,
        price: Number(productForm.price),
        description: productForm.description,
      });
      setProductForm({ name: '', imageUrl: '', price: '', description: '' });
      notify('Product added.');
      await loadProducts(true);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to create product.');
    }
  }

  async function saveProduct(product: Product) {
    try {
      await api.patch('/api/products', product);
      notify('Product updated.');
      await loadProducts(true);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to update product.');
    }
  }

  async function deleteProductById(id: number) {
    try {
      await api.delete('/api/products', { id });
      notify('Product removed.');
      await loadProducts(true);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to remove product.');
    }
  }

  async function createStaff() {
    try {
      await api.post('/api/staff', staffForm);
      setStaffForm({ username: '', password: '' });
      notify('Staff account created.');
      await loadStaffAccounts();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to create staff account.');
    }
  }

  async function resetStaffPassword(id: number) {
    const password = staffPasswordDrafts[id] ?? '';
    try {
      await api.patch('/api/staff', { id, password });
      setStaffPasswordDrafts((current) => ({ ...current, [id]: '' }));
      notify('Staff password updated.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to update password.');
    }
  }

  async function removeStaff(id: number) {
    try {
      await api.delete('/api/staff', { id });
      notify('Staff account removed.');
      await loadStaffAccounts();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to remove staff account.');
    }
  }

  async function updateStatus(orderId: number, status: OrderStatus) {
    try {
      await api.patch('/api/orders', { orderId, status });
      notify('Order status updated.');
      await loadDashboardOrders();
      if (route === '/orders') {
        await loadOwnOrders();
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to update order status.');
    }
  }

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/menu', label: 'Menu' },
    { path: '/cart', label: `Cart (${cart.reduce((sum, item) => sum + item.quantity, 0)})` },
    ...(user ? [{ path: '/orders', label: 'Orders' }] : []),
    ...(user?.role === 'admin' ? [{ path: '/admin', label: 'Admin' }] : []),
    ...(user && (user.role === 'admin' || user.role === 'staff') ? [{ path: '/staff', label: 'Staff' }] : []),
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate('/')} type="button">
          <span className="brand-mark">C</span>
          <span>
            <strong>Coftea</strong>
            <small>Frontend + backend separation</small>
          </span>
        </button>

        <button className="mobile-toggle" type="button" onClick={() => setMobileNavOpen((current) => !current)}>
          Menu
        </button>

        <nav className={`nav ${mobileNavOpen ? 'nav-open' : ''}`}>
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={route === item.path ? 'nav-link active' : 'nav-link'}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          {user ? (
            <>
              <div className="user-pill">
                <span>@{user.username}</span>
                <small>{user.role}</small>
              </div>
              <button className="button button-ghost" type="button" onClick={() => void handleLogout()}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button className="button button-ghost" type="button" onClick={() => navigate('/signin')}>
                Sign in
              </button>
              <button className="button" type="button" onClick={() => navigate('/register')}>
                Create account
              </button>
            </>
          )}
        </div>
      </header>

      {toast ? <div className="toast">{toast}</div> : null}

      <main className="main-content">
        {loading ? <section className="panel">Loading application...</section> : null}

        {!loading && route === '/' ? (
          <section className="hero-grid">
            <article className="hero-card">
              <span className="eyebrow">Vercel-ready storefront</span>
              <h1>Responsive ordering with admin and staff operations.</h1>
              <p>
                This rebuild separates the user experience in <code>frontend/</code> from the API and data logic in
                <code> backend/</code>, while keeping orders, products, roles, and deployment setup in one project.
              </p>
              <div className="button-row">
                <button className="button" type="button" onClick={() => navigate('/menu')}>
                  Browse menu
                </button>
                <button className="button button-ghost" type="button" onClick={() => navigate('/orders')}>
                  Track orders
                </button>
              </div>
            </article>
            <article className="panel stats-panel">
              <div>
                <span className="metric">{products.filter((product) => product.isActive).length}</span>
                <p>Active products</p>
              </div>
              <div>
                <span className="metric">{user ? user.role : 'guest'}</span>
                <p>Current access level</p>
              </div>
              <div>
                <span className="metric">{cart.length}</span>
                <p>Cart line items</p>
              </div>
            </article>
          </section>
        ) : null}

        {!loading && route === '/menu' ? (
          <section className="stack">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Products</span>
                <h2>Menu</h2>
              </div>
            </div>
            <div className="product-grid">
              {products.filter((product) => product.isActive).map((product) => (
                <article className="product-card" key={product.id}>
                  <img src={product.imageUrl} alt={product.name} />
                  <div className="product-card-body">
                    <div className="product-card-title">
                      <h3>{product.name}</h3>
                      <strong>${product.price.toFixed(2)}</strong>
                    </div>
                    <p>{product.description}</p>
                    <button className="button" type="button" onClick={() => addToCart(product)}>
                      Add to cart
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && route === '/cart' ? (
          <section className="dashboard-grid">
            <article className="panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Cart</span>
                  <h2>Review your order</h2>
                </div>
              </div>
              <div className="cart-list">
                {cart.length === 0 ? <p>Your cart is empty.</p> : null}
                {cart.map((item) => (
                  <div className="cart-row" key={item.productId}>
                    <div>
                      <strong>{item.name}</strong>
                      <p>${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="cart-controls">
                      <button type="button" onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}>
                        -
                      </button>
                      <input
                        value={item.quantity}
                        type="number"
                        min={1}
                        onChange={(event) => updateCartQuantity(item.productId, Number(event.target.value))}
                      />
                      <button type="button" onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}>
                        +
                      </button>
                      <button type="button" className="button button-ghost" onClick={() => removeFromCart(item.productId)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Checkout</span>
                  <h2>Place your order</h2>
                </div>
              </div>
              <label className="field">
                <span>Shipping address</span>
                <textarea
                  value={checkoutForm.shippingAddress}
                  onChange={(event) =>
                    setCheckoutForm((current) => ({ ...current, shippingAddress: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Notes</span>
                <textarea
                  value={checkoutForm.notes}
                  onChange={(event) => setCheckoutForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <div className="summary-card">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>${totals.subtotal.toFixed(2)}</strong>
                </div>
                <div className="summary-row">
                  <span>Total</span>
                  <strong>${totals.total.toFixed(2)}</strong>
                </div>
              </div>
              <button className="button" type="button" onClick={() => void submitOrder()}>
                Submit order
              </button>
            </article>
          </section>
        ) : null}

        {!loading && route === '/orders' ? (
          user ? (
            <section className="stack">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Tracking</span>
                  <h2>Your orders</h2>
                </div>
              </div>
              <div className="order-grid">
                {orders.map((order) => (
                  <article className="panel order-card" key={order.id}>
                    <div className="order-header">
                      <div>
                        <strong>Order #{order.id}</strong>
                        <p>{new Date(order.createdAt).toLocaleString()}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <p>{order.itemSummary}</p>
                    <p>{order.shippingAddress}</p>
                    <strong>${order.total.toFixed(2)}</strong>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="panel">
              <h2>Please sign in to track your orders.</h2>
            </section>
          )
        ) : null}

        {!loading && (route === '/signin' || route === '/register') ? (
          <section className="auth-panel panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{route === '/signin' ? 'Welcome back' : 'Create an account'}</span>
                <h2>{route === '/signin' ? 'Sign in' : 'Register'}</h2>
              </div>
            </div>
            <label className="field">
              <span>Username</span>
              <input
                value={authForm.username}
                onChange={(event) => setAuthForm((current) => ({ ...current, username: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>
            <button className="button" type="button" onClick={() => void handleAuth(route === '/signin' ? 'signin' : 'register')}>
              {route === '/signin' ? 'Sign in' : 'Create account'}
            </button>
          </section>
        ) : null}

        {!loading && route === '/admin' ? (
          user?.role === 'admin' ? (
            <section className="stack">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Admin dashboard</span>
                  <h2>Products, staff, and orders</h2>
                </div>
              </div>

              <div className="dashboard-grid">
                <article className="panel">
                  <h3>Add product</h3>
                  <div className="field-grid">
                    <label className="field">
                      <span>Name</span>
                      <input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} />
                    </label>
                    <label className="field">
                      <span>Image URL</span>
                      <input
                        value={productForm.imageUrl}
                        onChange={(event) => setProductForm((current) => ({ ...current, imageUrl: event.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span>Price</span>
                      <input
                        type="number"
                        value={productForm.price}
                        onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
                      />
                    </label>
                    <label className="field field-span">
                      <span>Description</span>
                      <textarea
                        value={productForm.description}
                        onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                      />
                    </label>
                  </div>
                  <button className="button" type="button" onClick={() => void submitProduct()}>
                    Add product
                  </button>
                </article>

                <article className="panel">
                  <h3>Create staff account</h3>
                  <label className="field">
                    <span>Username</span>
                    <input value={staffForm.username} onChange={(event) => setStaffForm((current) => ({ ...current, username: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Password</span>
                    <input
                      type="password"
                      value={staffForm.password}
                      onChange={(event) => setStaffForm((current) => ({ ...current, password: event.target.value }))}
                    />
                  </label>
                  <button className="button" type="button" onClick={() => void createStaff()}>
                    Create staff
                  </button>
                </article>
              </div>

              <article className="panel">
                <h3>Manage products</h3>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Description</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <EditableProductRow
                          key={`${product.id}-${product.updatedAt}`}
                          product={product}
                          onSave={saveProduct}
                          onDelete={deleteProductById}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="panel">
                <h3>Manage staff</h3>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Created</th>
                        <th>Password reset</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffAccounts.map((staff) => (
                        <tr key={staff.id}>
                          <td>{staff.username}</td>
                          <td>{staff.role}</td>
                          <td>{new Date(staff.createdAt).toLocaleDateString()}</td>
                          <td>
                            {staff.role === 'staff' ? (
                              <input
                                type="password"
                                value={staffPasswordDrafts[staff.id] ?? ''}
                                onChange={(event) =>
                                  setStaffPasswordDrafts((current) => ({ ...current, [staff.id]: event.target.value }))
                                }
                              />
                            ) : (
                              <span>Protected</span>
                            )}
                          </td>
                          <td className="action-row">
                            {staff.role === 'staff' ? (
                              <>
                                <button className="button button-ghost" type="button" onClick={() => void resetStaffPassword(staff.id)}>
                                  Update password
                                </button>
                                <button className="button button-danger" type="button" onClick={() => void removeStaff(staff.id)}>
                                  Remove
                                </button>
                              </>
                            ) : (
                              <span>Admin account</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          ) : (
            <section className="panel">
              <h2>Admin access is required.</h2>
            </section>
          )
        ) : null}

        {!loading && route === '/staff' ? (
          user && (user.role === 'admin' || user.role === 'staff') ? (
            <section className="stack">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Staff dashboard</span>
                  <h2>Monitor and update live orders</h2>
                </div>
              </div>
              <article className="panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardOrders.map((order) => (
                        <tr key={order.id}>
                          <td>#{order.id}</td>
                          <td>{order.username}</td>
                          <td>{order.itemSummary}</td>
                          <td>${order.total.toFixed(2)}</td>
                          <td>
                            <StatusBadge status={order.status} />
                          </td>
                          <td>
                            <select
                              defaultValue={order.status}
                              onChange={(event) => void updateStatus(order.id, event.target.value as OrderStatus)}
                            >
                              {(user.role === 'staff' ? STAFF_STATUS_OPTIONS : STATUS_OPTIONS).map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          ) : (
            <section className="panel">
              <h2>Staff or admin access is required.</h2>
            </section>
          )
        ) : null}
      </main>
    </div>
  );
}

function EditableProductRow({
  product,
  onSave,
  onDelete,
}: {
  product: Product;
  onSave: (product: Product) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(product);

  return (
    <tr>
      <td>
        <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
      </td>
      <td>
        <input
          type="number"
          value={draft.price}
          onChange={(event) => setDraft((current) => ({ ...current, price: Number(event.target.value) }))}
        />
      </td>
      <td>
        <select
          value={draft.isActive ? 'active' : 'inactive'}
          onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.value === 'active' }))}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </td>
      <td>
        <textarea
          value={draft.description}
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
        />
      </td>
      <td className="action-row">
        <button className="button button-ghost" type="button" onClick={() => void onSave(draft)}>
          Save
        </button>
        <button className="button button-danger" type="button" onClick={() => void onDelete(product.id)}>
          Delete
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

function normalizeRoute(path: string) {
  return ROUTES.includes(path as (typeof ROUTES)[number]) ? path : '/';
}

function readCart(): CartItem[] {
  try {
    const stored = window.localStorage.getItem('coftea-cart');
    return stored ? (JSON.parse(stored) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export default App;
