const API_URL = window.location.origin;
const TOKEN_KEY = "inventoryToken";
const USER_KEY = "inventoryUser";

const authScreen = document.getElementById("authScreen");
const appShell = document.getElementById("appShell");
const authForm = document.getElementById("authForm");
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const authSubmit = document.getElementById("authSubmit");
const authMessage = document.getElementById("authMessage");
const signupFields = document.querySelectorAll(".signup-only");
const userName = document.getElementById("userName");
const productForm = document.getElementById("productForm");
const productTable = document.getElementById("productTable");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");

let authMode = "login";
let products = [];

document.addEventListener("DOMContentLoaded", initApp);
authForm.addEventListener("submit", handleAuthSubmit);
loginTab.addEventListener("click", () => setAuthMode("login"));
signupTab.addEventListener("click", () => setAuthMode("signup"));
productForm.addEventListener("submit", saveProduct);
document.getElementById("resetProductButton").addEventListener("click", resetProductForm);
document.getElementById("logoutButton").addEventListener("click", logout);
document.getElementById("deleteAccountButton").addEventListener("click", deleteAccount);
document.getElementById("refreshButton").addEventListener("click", loadAppData);
searchInput.addEventListener("input", loadProducts);
categoryFilter.addEventListener("change", loadProducts);
statusFilter.addEventListener("change", loadProducts);

function initApp() {
    const token = getToken();
    const user = getStoredUser();

    if (token && user) {
        showApp(user);
        loadAppData();
        return;
    }

    setAuthMode("login");
    showAuth();
}

function setAuthMode(mode) {
    authMode = mode;
    loginTab.classList.toggle("active", mode === "login");
    signupTab.classList.toggle("active", mode === "signup");
    signupFields.forEach((field) => field.classList.toggle("hidden", mode !== "signup"));
    authSubmit.textContent = mode === "login" ? "Login" : "Create Account";
    authMessage.textContent = "";
}

async function handleAuthSubmit(event) {
    event.preventDefault();

    const name = document.getElementById("nameInput").value.trim();
    const email = document.getElementById("emailInput").value.trim();
    const password = document.getElementById("passwordInput").value;

    if (authMode === "signup" && !name) {
        return showMessage("Please enter your full name.");
    }

    if (!email || !password) {
        return showMessage("Please enter email and password.");
    }

    if (password.length < 6) {
        return showMessage("Password must be at least 6 characters.");
    }

    const endpoint = authMode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const body = authMode === "signup" ? { name, email, password } : { email, password };

    try {
        const data = await request(endpoint, { method: "POST", body });
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        showApp(data.user);
        await loadAppData();
        authForm.reset();
    } catch (error) {
        showMessage(error.message);
    }
}

async function loadAppData() {
    await Promise.all([loadDashboard(), loadProducts()]);
}

async function loadDashboard() {
    const dashboard = await request("/api/products/dashboard");

    document.getElementById("totalProducts").textContent = dashboard.totalProducts;
    document.getElementById("totalStock").textContent = dashboard.totalStock;
    document.getElementById("lowStockCount").textContent = dashboard.lowStockCount;
    document.getElementById("totalValue").textContent = formatMoney(dashboard.totalValue);

    const activityList = document.getElementById("activityList");
    activityList.innerHTML = "";

    if (!dashboard.recentActivity.length) {
        activityList.innerHTML = "<li>No recent activity yet.</li>";
        return;
    }

    dashboard.recentActivity.forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${escapeHtml(item.name)}</strong><span>${item.status} - ${formatDate(item.updatedAt)}</span>`;
        activityList.appendChild(li);
    });
}

async function loadProducts() {
    const params = new URLSearchParams({
        search: searchInput.value.trim(),
        category: categoryFilter.value,
        status: statusFilter.value
    });

    const data = await request(`/api/products?${params.toString()}`);
    products = data.products;
    renderProducts();
    renderCategoryFilter();
}

async function saveProduct(event) {
    event.preventDefault();

    const id = document.getElementById("productId").value;
    const body = {
        name: document.getElementById("productName").value.trim(),
        category: document.getElementById("productCategory").value.trim(),
        sku: document.getElementById("productSku").value.trim(),
        quantity: Number(document.getElementById("productQuantity").value),
        price: Number(document.getElementById("productPrice").value),
        supplier: document.getElementById("productSupplier").value.trim(),
        lowStockLimit: Number(document.getElementById("lowStockLimit").value)
    };

    if (!body.name || !body.category || body.quantity < 0 || body.price < 0) {
        alert("Please fill product name, category, quantity, and price correctly.");
        return;
    }

    const endpoint = id ? `/api/products/${id}` : "/api/products";
    const method = id ? "PUT" : "POST";

    await request(endpoint, { method, body });
    resetProductForm();
    await loadAppData();
}

function renderProducts() {
    productTable.innerHTML = "";

    if (!products.length) {
        productTable.innerHTML = '<tr><td colspan="7" class="empty-cell">No products found.</td></tr>';
        return;
    }

    products.forEach((product) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.supplier || "No supplier")}</small></td>
            <td>${escapeHtml(product.category)}</td>
            <td>${escapeHtml(product.sku || "-")}</td>
            <td>${product.quantity}</td>
            <td>${formatMoney(product.price)}</td>
            <td><span class="status ${product.status.replace(/\s+/g, "-").toLowerCase()}">${product.status}</span></td>
            <td class="actions">
                <button type="button" data-edit="${product._id}">Edit</button>
                <button type="button" data-delete="${product._id}">Delete</button>
            </td>
        `;
        productTable.appendChild(row);
    });

    productTable.querySelectorAll("[data-edit]").forEach((button) => {
        button.addEventListener("click", () => editProduct(button.dataset.edit));
    });

    productTable.querySelectorAll("[data-delete]").forEach((button) => {
        button.addEventListener("click", () => deleteProduct(button.dataset.delete));
    });
}

function editProduct(id) {
    const product = products.find((item) => item._id === id);
    if (!product) return;

    document.getElementById("productId").value = product._id;
    document.getElementById("productName").value = product.name;
    document.getElementById("productCategory").value = product.category;
    document.getElementById("productSku").value = product.sku || "";
    document.getElementById("productQuantity").value = product.quantity;
    document.getElementById("productPrice").value = product.price;
    document.getElementById("productSupplier").value = product.supplier || "";
    document.getElementById("lowStockLimit").value = product.lowStockLimit;
    document.getElementById("saveProductButton").textContent = "Save Changes";
    showSection("productsSection");
}

async function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;

    await request(`/api/products/${id}`, { method: "DELETE" });
    await loadAppData();
}

function resetProductForm() {
    productForm.reset();
    document.getElementById("productId").value = "";
    document.getElementById("productCategory").value = "General";
    document.getElementById("productQuantity").value = "0";
    document.getElementById("productPrice").value = "0";
    document.getElementById("lowStockLimit").value = "5";
    document.getElementById("saveProductButton").textContent = "Add Product";
}

function renderCategoryFilter() {
    const selected = categoryFilter.value;
    const categories = [...new Set(products.map((product) => product.category).filter(Boolean))].sort();

    categoryFilter.innerHTML = '<option value="">All categories</option>';
    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
    categoryFilter.value = selected;
}

document.querySelectorAll(".side-nav [data-section]").forEach((button) => {
    button.addEventListener("click", () => showSection(button.dataset.section));
});

function showSection(sectionId) {
    document.querySelectorAll(".content-section").forEach((section) => {
        section.classList.toggle("hidden", section.id !== sectionId);
    });
    document.querySelectorAll(".side-nav [data-section]").forEach((button) => {
        button.classList.toggle("active", button.dataset.section === sectionId);
    });
}

async function request(path, options = {}) {
    const headers = { "Content-Type": "application/json" };
    const token = getToken();

    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

function showApp(user) {
    userName.textContent = user.name;
    authScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
}

function showAuth() {
    appShell.classList.add("hidden");
    authScreen.classList.remove("hidden");
}

function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    products = [];
    showAuth();
}

async function deleteAccount() {
    const confirmed = confirm("Delete your account permanently? This will remove your products and cannot be undone.");
    if (!confirmed) return;

    try {
        await request("/api/auth/me", { method: "DELETE" });
        alert("Your account and inventory data were deleted.");
        logout();
    } catch (error) {
        alert(error.message);
    }
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
        return null;
    }
}

function showMessage(message) {
    authMessage.textContent = message;
}

function formatMoney(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    }).format(Number(value) || 0);
}

function formatDate(value) {
    return new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
