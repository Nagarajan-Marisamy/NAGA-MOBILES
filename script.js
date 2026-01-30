// Storage Keys
const STORAGE_KEYS = {
    // kept for backward compatibility (cart can remain local)
    PRODUCTS: 'mobile_shop_products'
};
const CART_KEY = 'mobile_shop_cart';

const SHOP_NAME = 'NAGA MOBILES';
const API = '';

// Default Products
const DEFAULT_PRODUCTS = [
    { id: '1', name: 'Wired Earphones', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop' },
    { id: '2', name: 'Wired Earphones High Quality', imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop' },
    { id: '3', name: 'Mobile', imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop' },
    { id: '4', name: 'Remote', imageUrl: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400&h=400&fit=crop' },
    { id: '5', name: 'Charger', imageUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f5ff1f8?w=400&h=400&fit=crop' },
    { id: '6', name: 'Temper', imageUrl: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=400&h=400&fit=crop' },
    { id: '7', name: 'Pouch', imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop' }
];

// State
let products = [];
let cart = [];
let currentInvoice = null;
let editingProductId = null;
let pendingSelectedProductId = null;

// Initialize App
async function init() {
    loadCart();
    setupEventListeners();
    await loadProducts();
    renderProducts();
    renderCart();
    setDefaultReportControls();
}

function toast(title, message, durationMs = 2200) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `
        <div class="toast-dot" aria-hidden="true"></div>
        <div>
            <div class="toast-title"></div>
            <div class="toast-msg"></div>
        </div>
    `;
    el.querySelector('.toast-title').textContent = title;
    el.querySelector('.toast-msg').textContent = message;
    container.appendChild(el);

    requestAnimationFrame(() => el.classList.add('show'));

    window.setTimeout(() => {
        el.classList.remove('show');
        window.setTimeout(() => el.remove(), 260);
    }, durationMs);
}

// Storage Functions
async function apiGet(path) {
    const res = await fetch(`${API}${path}`, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return await res.json();
}

async function apiSend(path, method, body) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body || {})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data && data.error ? data.error : `Request failed: ${res.status}`);
    return data;
}

async function loadProducts() {
    try {
        products = await apiGet('/api/products');
        // optional: keep a local fallback copy
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
        // fallback to local if backend not reachable
        const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        products = stored ? JSON.parse(stored) : DEFAULT_PRODUCTS;
        toast('Offline mode', 'Backend not reachable. Using device data.');
    }
}

function loadCart() {
    const stored = localStorage.getItem(CART_KEY);
    cart = stored ? JSON.parse(stored) : [];
}

function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// Event Listeners
function setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });

    // Add product button
    document.getElementById('add-product-btn').addEventListener('click', () => {
        openProductModal();
    });

    // Product form
    document.getElementById('product-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveProduct();
    });

    // Modal close buttons
    document.getElementById('close-modal-btn').addEventListener('click', closeProductModal);
    document.getElementById('cancel-product-btn').addEventListener('click', closeProductModal);

    // Image preview
    document.getElementById('product-image').addEventListener('input', (e) => {
        const url = e.target.value;
        const preview = document.getElementById('image-preview');
        const container = document.getElementById('image-preview-container');
        if (url) {
            preview.src = url;
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    });

    // Image upload preview (saved as base64)
    document.getElementById('product-image-file').addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        const preview = document.getElementById('image-preview');
        const container = document.getElementById('image-preview-container');
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            preview.src = String(reader.result || '');
            container.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    // Cart buttons
    document.getElementById('clear-cart-btn').addEventListener('click', () => {
        if (confirm('Clear all items from cart?')) {
            clearCart();
        }
    });

    document.getElementById('generate-invoice-btn').addEventListener('click', generateInvoice);

    // Invoice buttons
    document.getElementById('print-invoice-btn').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('close-invoice-btn').addEventListener('click', () => {
        closeInvoice();
    });

    // Report buttons
    document.querySelectorAll('.report-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            switchReportType(type);
        });
    });

    document.getElementById('generate-daily-btn').addEventListener('click', generateDailyReport);
    document.getElementById('generate-monthly-btn').addEventListener('click', generateMonthlyReport);

    // Footer: reset local fallback only (backend is source of truth)
    const resetBtn = document.getElementById('reset-data-btn');
    if (resetBtn) resetBtn.addEventListener('click', async () => {
        const ok = confirm('Reset THIS device cache? (Backend data remains unchanged.)');
        if (!ok) return;
        localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
        toast('Reset complete', 'Local cache cleared. Reloading from backend...');
        await loadProducts();
        renderProducts();
    });

    // Add-to-cart dialog
    document.getElementById('select-dialog-close').addEventListener('click', closeSelectDialog);
    document.getElementById('select-dialog-cancel').addEventListener('click', closeSelectDialog);
    document.getElementById('select-dialog').addEventListener('click', (e) => {
        if (e.target && e.target.id === 'select-dialog') closeSelectDialog();
    });
    document.getElementById('select-dialog-confirm').addEventListener('click', () => {
        if (!pendingSelectedProductId) return;
        const product = products.find(p => p.id === pendingSelectedProductId);
        if (!product) return;

        animateAddToCart(product);
        addToCart(pendingSelectedProductId);
        toast('Added to cart', product.name);
        closeSelectDialog();
    });
}

// Tab Navigation
function switchTab(tabName) {
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Hide invoice if switching tabs
    if (currentInvoice) {
        closeInvoice();
    }
}

// Product Management
function renderProducts() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image-container">
                <img src="${product.imageUrl}" alt="${product.name}" class="product-image" loading="lazy"
                     onclick="selectProduct('${product.id}')">
                <div class="product-actions">
                    <button class="product-action-btn btn-edit" onclick="editProduct('${product.id}')" title="Edit">
                        ✏️
                    </button>
                    <button class="product-action-btn btn-delete" onclick="deleteProduct('${product.id}')" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-hint">Click image to add to cart</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function selectProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    pendingSelectedProductId = productId;
    document.getElementById('select-dialog-image').src = product.imageUrl;
    document.getElementById('select-dialog-image').alt = product.name;
    document.getElementById('select-dialog-name').textContent = product.name;
    document.getElementById('select-dialog').style.display = 'flex';
}

function closeSelectDialog() {
    document.getElementById('select-dialog').style.display = 'none';
    pendingSelectedProductId = null;
}

function openProductModal(product = null) {
    editingProductId = product ? product.id : null;
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('modal-title');
    const nameInput = document.getElementById('product-name');
    const imageInput = document.getElementById('product-image');
    const imageFileInput = document.getElementById('product-image-file');
    const previewContainer = document.getElementById('image-preview-container');

    if (product) {
        title.textContent = 'Edit Product';
        nameInput.value = product.name;
        imageInput.value = product.imageUrl;
        imageFileInput.value = '';
        if (product.imageUrl) {
            document.getElementById('image-preview').src = product.imageUrl;
            previewContainer.style.display = 'block';
        }
    } else {
        title.textContent = 'Add Product';
        form.reset();
        imageFileInput.value = '';
        previewContainer.style.display = 'none';
    }

    modal.style.display = 'flex';
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
    editingProductId = null;
}

function saveProduct() {
    const name = document.getElementById('product-name').value.trim();
    const imageUrlInput = document.getElementById('product-image').value.trim();
    const imageFileInput = document.getElementById('product-image-file');
    const file = imageFileInput.files && imageFileInput.files[0];

    if (!name) {
        alert('Please enter a product name.');
        return;
    }

    const finalizeSave = (finalImageUrl) => {
        if (!finalImageUrl) {
            alert('Please provide an image URL or upload an image.');
            return;
        }

        (async () => {
            try {
                if (editingProductId) {
                    await apiSend(`/api/products/${editingProductId}`, 'PUT', { name, imageUrl: finalImageUrl });
                } else {
                    await apiSend('/api/products', 'POST', { name, imageUrl: finalImageUrl });
                }
                await loadProducts();
                renderProducts();
                closeProductModal();
                toast(editingProductId ? 'Product updated' : 'Product added', name);
            } catch (e) {
                alert(`Save failed: ${e.message || e}`);
            }
        })();
    };

    // Prefer uploaded file (base64) if provided
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            finalizeSave(String(reader.result || ''));
        };
        reader.readAsDataURL(file);
        return;
    }

    finalizeSave(imageUrlInput);
}

function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        openProductModal(product);
    }
}

function deleteProduct(id) {
    const product = products.find(p => p.id === id);
    if (product && confirm(`Delete ${product.name}?`)) {
        (async () => {
            try {
                await apiSend(`/api/products/${id}`, 'DELETE');
                await loadProducts();
                renderProducts();
                toast('Product deleted', product.name);
            } catch (e) {
                alert(`Delete failed: ${e.message || e}`);
            }
        })();
    }
}

// Cart Management
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            productId: product.id,
            productName: product.name,
            quantity: 1,
            price: 0,
            imageUrl: product.imageUrl
        });
    }

    saveCart();
    renderCart();
}

function animateAddToCart(product) {
    const cartTab = document.querySelector('.nav-tab[data-tab="cart"]');
    const productsGrid = document.getElementById('products-grid');
    if (!cartTab || !productsGrid) return;

    // Find the product image in the grid
    const img = Array.from(productsGrid.querySelectorAll('img.product-image'))
        .find(el => el.getAttribute('alt') === product.name);
    if (!img) return;

    const imgRect = img.getBoundingClientRect();
    const cartRect = cartTab.getBoundingClientRect();

    const fly = img.cloneNode(true);
    fly.classList.add('fly-img');
    fly.style.left = `${imgRect.left}px`;
    fly.style.top = `${imgRect.top}px`;
    fly.style.width = `${Math.max(64, imgRect.width * 0.35)}px`;
    fly.style.height = `${Math.max(64, imgRect.height * 0.35)}px`;
    fly.style.transform = 'translate3d(0,0,0) scale(1)';
    document.body.appendChild(fly);

    requestAnimationFrame(() => {
        const dx = (cartRect.left + cartRect.width / 2) - (imgRect.left + imgRect.width / 2);
        const dy = (cartRect.top + cartRect.height / 2) - (imgRect.top + imgRect.height / 2);
        fly.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(0.25)`;
        fly.style.opacity = '0.15';
    });

    const cleanup = () => {
        fly.removeEventListener('transitionend', cleanup);
        if (fly.parentNode) fly.parentNode.removeChild(fly);
        cartTab.classList.add('bump');
        setTimeout(() => cartTab.classList.remove('bump'), 350);
    };
    fly.addEventListener('transitionend', cleanup);
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const summary = document.getElementById('cart-summary');
    const clearBtn = document.getElementById('clear-cart-btn');

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">🛒</div>
                <p style="font-size: 1.125rem; color: #6b7280; margin-bottom: 0.5rem;">Your cart is empty</p>
                <p style="color: #9ca3af;">Click on product images to add them to cart</p>
            </div>
        `;
        summary.style.display = 'none';
        clearBtn.style.display = 'none';
        return;
    }

    clearBtn.style.display = 'block';
    summary.style.display = 'block';

    container.innerHTML = '';
    cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.productName}" class="cart-item-image" loading="lazy">
            <div class="cart-item-content">
                <div class="cart-item-name">${item.productName}</div>
                <div class="cart-item-controls">
                    <div class="control-row">
                        <span class="control-label">Price:</span>
                        <input type="number" class="form-input" value="${item.price || ''}" 
                               min="0" step="0.01" placeholder="Enter price"
                               onchange="updateCartItem('${item.productId}', 'price', this.value)">
                    </div>
                    <div class="control-row">
                        <span class="control-label">Quantity:</span>
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="updateCartQuantity('${item.productId}', -1)">−</button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button class="quantity-btn" onclick="updateCartQuantity('${item.productId}', 1)">+</button>
                        </div>
                    </div>
                    <div class="cart-item-subtotal">
                        <span style="font-size: 0.875rem; color: #6b7280;">Subtotal:</span>
                        <span style="font-weight: 600; font-size: 1.125rem;">₹${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                </div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.productId}')" title="Remove">🗑️</button>
        `;
        container.appendChild(cartItem);
    });

    updateCartSummary();
}

function updateCartItem(productId, field, value) {
    const item = cart.find(i => i.productId === productId);
    if (item) {
        if (field === 'price') {
            item.price = parseFloat(value) || 0;
        }
        saveCart();
        renderCart();
    }
}

function updateCartQuantity(productId, delta) {
    const item = cart.find(i => i.productId === productId);
    if (item) {
        item.quantity = Math.max(1, item.quantity + delta);
        saveCart();
        renderCart();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    saveCart();
    renderCart();
}

function clearCart() {
    cart = [];
    saveCart();
    renderCart();
}

function updateCartSummary() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cart-total').textContent = `₹${total.toFixed(2)}`;

    const allItemsHavePrice = cart.every(item => item.price > 0);
    const warning = document.getElementById('price-warning');
    const generateBtn = document.getElementById('generate-invoice-btn');

    if (cart.length > 0 && !allItemsHavePrice) {
        warning.style.display = 'block';
        generateBtn.disabled = true;
    } else {
        warning.style.display = 'none';
        generateBtn.disabled = false;
    }
}

// Invoice Generation
function generateInvoice() {
    if (cart.length === 0) return;

    const allItemsHavePrice = cart.every(item => item.price > 0);
    if (!allItemsHavePrice) {
        alert('Please enter prices for all items before generating invoice.');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const date = new Date().toISOString();

    const invoice = {
        id: invoiceId,
        date,
        items: [...cart],
        total
    };

    (async () => {
        try {
            const created = await apiSend('/api/invoices', 'POST', { items: [...cart] });
            currentInvoice = created;
            renderInvoice(created);
            clearCart();
            switchTab('cart');
            toast('Invoice created', `Invoice ${created.id} saved for reports.`);
        } catch (e) {
            alert(`Invoice failed: ${e.message || e}`);
        }
    })();
}

function renderInvoice(invoice) {
    const container = document.getElementById('invoice-display');
    const content = document.getElementById('invoice-content');

    const formattedDate = new Date(invoice.date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    content.innerHTML = `
        <div>
            <h1>${SHOP_NAME}</h1>
            <p class="subtitle">Billing Invoice</p>
        </div>
        <div class="invoice-info">
            <div class="invoice-info-item">
                <div class="invoice-info-label">Invoice Number</div>
                <div style="font-weight: 600;">${invoice.id}</div>
            </div>
            <div class="invoice-info-item">
                <div class="invoice-info-label">Date & Time</div>
                <div style="font-weight: 600;">${formattedDate}</div>
            </div>
        </div>
        <table class="invoice-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th class="text-center">Quantity</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${invoice.items.map(item => `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center;">
                                <img src="${item.imageUrl}" alt="${item.productName}" class="invoice-item-image" loading="lazy">
                                <span style="font-weight: 500;">${item.productName}</span>
                            </div>
                        </td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-right">₹${item.price.toFixed(2)}</td>
                        <td class="text-right" style="font-weight: 600;">₹${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="invoice-total">
            <div class="invoice-total-content">
                <div class="invoice-total-row">
                    <span>Total:</span>
                    <span class="invoice-total-amount">₹${invoice.total.toFixed(2)}</span>
                </div>
            </div>
        </div>
        <div class="invoice-footer">
            <p>Thank you for your business!</p>
        </div>
    `;

    container.style.display = 'block';
}

function closeInvoice() {
    document.getElementById('invoice-display').style.display = 'none';
    currentInvoice = null;
}

// Reports
function switchReportType(type) {
    document.querySelectorAll('.report-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');

    document.getElementById('daily-controls').style.display = type === 'daily' ? 'flex' : 'none';
    document.getElementById('monthly-controls').style.display = type === 'monthly' ? 'flex' : 'none';
    document.getElementById('report-results').innerHTML = '';
}

function setDefaultReportControls() {
    const today = new Date().toISOString().split('T')[0];
    const daily = document.getElementById('daily-date');
    const year = document.getElementById('monthly-year');
    const month = document.getElementById('monthly-month');
    if (daily) daily.value = today;
    if (year) year.value = String(new Date().getFullYear());
    if (month) month.value = String(new Date().getMonth() + 1);
}

function generateDailyReport() {
    const date = document.getElementById('daily-date').value;
    if (!date) {
        alert('Please select a date');
        return;
    }

    (async () => {
        try {
            const report = await apiGet(`/api/reports/daily?date=${encodeURIComponent(date)}`);
            renderReport({ type: 'daily', date: report.date, items: report.items, totalRevenue: report.totalRevenue });
            toast('Report ready', 'Daily report generated.');
        } catch (e) {
            alert(`Report failed: ${e.message || e}`);
        }
    })();
}

function generateMonthlyReport() {
    const year = parseInt(document.getElementById('monthly-year').value);
    const month = parseInt(document.getElementById('monthly-month').value);

    if (!year || !month) {
        alert('Please select year and month');
        return;
    }

    (async () => {
        try {
            const report = await apiGet(`/api/reports/monthly?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`);
            renderReport({ type: 'monthly', month: report.month, year: report.year, items: report.items, totalRevenue: report.totalRevenue });
            toast('Report ready', 'Monthly report generated.');
        } catch (e) {
            alert(`Report failed: ${e.message || e}`);
        }
    })();
}

function renderReport(report) {
    const container = document.getElementById('report-results');

    if (report.items.length === 0) {
        container.innerHTML = '<div class="report-empty">No sales found for this period.</div>';
        return;
    }

    const totalQuantity = report.items.reduce((sum, item) => sum + item.quantity, 0);
    const dateLabel = report.type === 'daily'
        ? `Date: ${new Date(report.date).toLocaleDateString()}`
        : `${report.month} ${report.year}`;

    container.innerHTML = `
        <div class="report-title">${report.type === 'daily' ? 'Daily' : 'Monthly'} Sales Report</div>
        <div class="report-date">${dateLabel}</div>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th class="text-center">Quantity Sold</th>
                    <th class="text-right">Revenue</th>
                </tr>
            </thead>
            <tbody>
                ${report.items.map(item => `
                    <tr>
                        <td style="font-weight: 500;">${item.productName}</td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-right" style="font-weight: 600;">₹${item.revenue.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr>
                    <td style="font-weight: bold;">Total</td>
                    <td class="text-center" style="font-weight: bold;">${totalQuantity}</td>
                    <td class="text-right" style="font-weight: bold; color: #2563eb;">₹${report.totalRevenue.toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>
    `;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
