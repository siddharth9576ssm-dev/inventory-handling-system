// Store references to each page section so JavaScript can show or hide them.
const loginPage = document.getElementById("loginPage");
const signupPage = document.getElementById("signupPage");
const inventoryPage = document.getElementById("inventoryPage");
const profilePage = document.getElementById("profilePage");
const aboutPage = document.getElementById("aboutPage");
const contactPage = document.getElementById("contactPage");

// Store references to the inventory form fields and submit button.
const productNameInput = document.getElementById("productName");
const productMarketplaceInput = document.getElementById("productMarketplace");
const productQtyInput = document.getElementById("productQty");
const productPriceInput = document.getElementById("productPrice");
const productLinkInput = document.getElementById("productLink");
const addEditButton = document.getElementById("addEditButton");
const fetchPriceButton = document.getElementById("fetchPriceButton");

// Key used to save the product list in the browser's localStorage.
const PRODUCTS_STORAGE_KEY = "inventoryProducts";
const THEME_STORAGE_KEY = "inventoryTheme";
const USERS_STORAGE_KEY = "userAccounts";
const OLD_USER_STORAGE_KEY = "userAccount";
const REGION_SETTINGS = {
    IN: { label: "India", locale: "en-IN", currency: "INR", inrPerUnit: 1 },
    US: { label: "United States", locale: "en-US", currency: "USD", inrPerUnit: 94.38 },
    GB: { label: "United Kingdom", locale: "en-GB", currency: "GBP", inrPerUnit: 127.93 },
    EU: { label: "Europe", locale: "de-DE", currency: "EUR", inrPerUnit: 110.7 },
    JP: { label: "Japan", locale: "ja-JP", currency: "JPY", inrPerUnit: 0.6 },
    AU: { label: "Australia", locale: "en-AU", currency: "AUD", inrPerUnit: 68.11 }
};

const BACKEND_API_URL = (() => {
    const origin = window.location.origin;
    const port = window.location.port;

    if (window.location.protocol === "file:") {
        return "http://localhost:3000";
    }

    if (origin === "null" || port === "5500" || port === "5501" || (window.location.hostname === "127.0.0.1" && port !== "3000") || (window.location.hostname === "localhost" && port !== "3000")) {
        return "http://localhost:3000";
    }

    return origin;
})();

let currencyFormatter = createCurrencyFormatter("IN");

async function callBackend(path, method = "GET", body = null) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (body !== null) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BACKEND_API_URL}${path}`, options);
    let data;

    try {
        data = await response.json();
    } catch (error) {
        const text = await response.text();
        throw new Error(text || error.message || "Backend returned invalid JSON.");
    }

    if (!response.ok) {
        throw new Error(data.error || response.statusText || "Backend request failed.");
    }

    return data;
}

// editingIndex is -1 when adding a new product, or a product index when editing.
let editingIndex = -1;
let currentUserEmail = "";
let currentUserName = "";
let currentUserDob = "";
let currentUserMobile = "";
let currentUserMobileVerified = false;
let currentUserRegion = "IN";
let products = [];

// Hide every page section before showing the one the user selected.
function hideAllPages() {
    loginPage.style.display = "none";
    signupPage.style.display = "none";
    inventoryPage.style.display = "none";
    profilePage.style.display = "none";
    aboutPage.style.display = "none";
    contactPage.style.display = "none";
}

// Start the app on the login screen.
window.onload = () => {
    applySavedTheme();
    migrateOldUserAccount();
    hideAllPages();
    loginPage.style.display = "block";
};

// Switch from login to signup.
function showSignup() {
    hideAllPages();
    signupPage.style.display = "block";
}

// Switch from signup back to login.
function showLogin() {
    hideAllPages();
    loginPage.style.display = "block";
}

// Show the dashboard and refresh the inventory table.
function showDashboard() {
    hideAllPages();
    updateProfileView();
    inventoryPage.style.display = "block";
    displayProducts();
    resetForm();
}

// Show the signed-in user's profile.
function showProfile() {
    hideAllPages();
    updateProfileView();
    profilePage.style.display = "block";
}

// Show the about page.
function showAbout() {
    hideAllPages();
    updateProfileView();
    aboutPage.style.display = "block";
}

// Show the contact page.
function showContact() {
    hideAllPages();
    updateProfileView();
    contactPage.style.display = "block";
}

// Change a password input between hidden text and visible text.
function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const isHidden = input.type === "password";

    input.type = isHidden ? "text" : "password";
    button.textContent = isHidden ? "Hide" : "Show";
}

// Toggle dark mode and save the user's theme choice in the browser.
function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle("dark-mode");

    localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? "dark" : "light");
    updateThemeButtons();
}

// Read the saved theme setting when the app starts.
function applySavedTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    document.body.classList.toggle("dark-mode", savedTheme === "dark");
    updateThemeButtons();
}

// Keep every theme button label in sync.
function updateThemeButtons() {
    const isDarkMode = document.body.classList.contains("dark-mode");
    const icon = isDarkMode ? "\u2600" : "\u263e";
    const label = isDarkMode ? "Switch to light mode" : "Switch to dark mode";

    document.querySelectorAll(".theme-toggle").forEach((button) => {
        button.textContent = icon;
        button.setAttribute("aria-label", label);
        button.setAttribute("title", label);
    });
}

/* ---------------- SIGN UP ---------------- */
async function signupUser() {
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const pass = document.getElementById("signupPass").value;

    if (!name || !email || !pass) return alert("Please fill all fields!");
    if (!email.includes("@")) return alert("Please enter a valid email address.");

    try {
        await callBackend("/api/register", "POST", { name, email, pass });
        alert("Signup successful! Now login.");
        showLogin();
    } catch (error) {
        if (isBackendUnavailable(error)) {
            try {
                registerLocalUser({ name, email, pass });
                alert("Signup successful in offline mode! Now login.");
                showLogin();
                return;
            } catch (localError) {
                alert(localError.message || "Signup failed. Please try again.");
                return;
            }
        }

        alert(error.message || "Signup failed. Please try again.");
    }
}

/* ---------------- LOGIN ---------------- */
async function loginUser() {
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const pass = document.getElementById("loginPass").value;

    if (!email || !pass) return alert("Please enter your email and password.");

    try {
        const user = await callBackend("/api/login", "POST", { email, pass });
        setCurrentUser(user);
        products = loadProducts();
        showDashboard();
    } catch (error) {
        if (isBackendUnavailable(error)) {
            try {
                const user = authenticateLocalUser(email, pass);
                setCurrentUser(user);
                products = loadProducts();
                showDashboard();
                return;
            } catch (localError) {
                alert(localError.message || "Incorrect email or password.");
                return;
            }
        }

        alert(error.message || "Incorrect email or password.");
    }
}

// Read all registered accounts from localStorage.
function loadUsers() {
    const savedUsers = readJsonFromStorage(USERS_STORAGE_KEY, []);
    return Array.isArray(savedUsers) ? savedUsers : [];
}

// Save all registered accounts in localStorage.
function saveUsers(users) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function isBackendUnavailable(error) {
    return error instanceof TypeError || (error && typeof error.message === "string" && /failed to fetch|network/i.test(error.message));
}

function registerLocalUser({ name, email, pass }) {
    const users = loadUsers();
    if (users.some((user) => user.email === email.toLowerCase())) {
        throw new Error("This email is already registered.");
    }

    users.push({
        name,
        email: email.toLowerCase(),
        pass,
        dob: "",
        mobile: "",
        mobileVerified: false,
        region: "IN"
    });
    saveUsers(users);
    return { name, email, dob: "", mobile: "", mobileVerified: false, region: "IN" };
}

function authenticateLocalUser(email, pass) {
    const users = loadUsers();
    const user = users.find((item) => item.email === email.toLowerCase());
    if (!user || user.pass !== pass) {
        throw new Error("Incorrect email or password.");
    }
    return user;
}

function updateLocalUser(email, updates) {
    const users = loadUsers();
    const userIndex = users.findIndex((item) => item.email === email.toLowerCase());
    if (userIndex === -1) {
        throw new Error("User not found.");
    }

    users[userIndex] = {
        ...users[userIndex],
        name: updates.name !== undefined ? updates.name : users[userIndex].name,
        dob: updates.dob !== undefined ? updates.dob : users[userIndex].dob,
        mobile: updates.mobile !== undefined ? updates.mobile : users[userIndex].mobile,
        mobileVerified: updates.mobileVerified !== undefined ? updates.mobileVerified : users[userIndex].mobileVerified,
        region: updates.region !== undefined ? updates.region : users[userIndex].region
    };

    saveUsers(users);
    return users[userIndex];
}

// Move the older single-account storage format into the new multi-user list.
function migrateOldUserAccount() {
    const oldUser = readJsonFromStorage(OLD_USER_STORAGE_KEY, null);

    if (!oldUser || !oldUser.email) return;

    const users = loadUsers();
    const alreadyMigrated = users.some((user) => user.email.toLowerCase() === oldUser.email.toLowerCase());

    if (!alreadyMigrated) {
        users.push({
            name: oldUser.name || "User",
            email: oldUser.email.toLowerCase(),
            pass: oldUser.pass
        });
        saveUsers(users);
    }

    localStorage.removeItem(OLD_USER_STORAGE_KEY);
}

/* ---------------- LOGOUT ---------------- */
function logoutUser() {
    currentUserEmail = "";
    currentUserName = "";
    currentUserDob = "";
    currentUserMobile = "";
    currentUserMobileVerified = false;
    currentUserRegion = "IN";
    currencyFormatter = createCurrencyFormatter(currentUserRegion);
    products = [];
    hideAllPages();
    loginPage.style.display = "block";
    resetForm();
}

/* ---------------- PROFILE ---------------- */
// Refresh all places where the signed-in user's profile appears.
function updateProfileView() {
    const displayName = currentUserName || "User";
    const profileNameInput = document.getElementById("profileName");
    const profileDobInput = document.getElementById("profileDob");
    const profileMobileInput = document.getElementById("profileMobile");
    const profileRegionInput = document.getElementById("profileRegion");
    const profileEmail = document.getElementById("profileEmail");
    const profileInitial = document.getElementById("profileInitial");
    const mobileVerifyStatus = document.getElementById("mobileVerifyStatus");
    const profileCurrency = document.getElementById("profileCurrency");

    document.querySelectorAll(".current-user-name").forEach((element) => {
        element.textContent = displayName;
    });

    if (profileNameInput) profileNameInput.value = displayName;
    if (profileDobInput) profileDobInput.value = currentUserDob;
    if (profileMobileInput) profileMobileInput.value = currentUserMobile;
    if (profileRegionInput) profileRegionInput.value = currentUserRegion;
    if (profileEmail) profileEmail.textContent = currentUserEmail || "Not signed in";
    if (profileInitial) profileInitial.textContent = displayName.charAt(0).toUpperCase();
    if (mobileVerifyStatus) {
        mobileVerifyStatus.textContent = currentUserMobileVerified ? "Mobile verified" : "Mobile not verified";
        mobileVerifyStatus.classList.toggle("verified", currentUserMobileVerified);
    }
    if (profileCurrency) profileCurrency.textContent = getRegionSettings(currentUserRegion).currency;
}

// Save changed profile details for the current account.
async function updateProfile() {
    const profileNameInput = document.getElementById("profileName");
    const profileDobInput = document.getElementById("profileDob");
    const profileMobileInput = document.getElementById("profileMobile");
    const profileRegionInput = document.getElementById("profileRegion");
    const newName = profileNameInput.value.trim();
    const newDob = profileDobInput.value;
    const newMobile = profileMobileInput.value.trim();
    const newRegion = profileRegionInput.value;

    if (!currentUserEmail) {
        alert("Please login first.");
        return;
    }

    if (!newName) {
        alert("Please enter your name.");
        return;
    }

    if (newDob && new Date(newDob) > new Date()) {
        alert("Date of birth cannot be in the future.");
        return;
    }

    if (newMobile && !isValidMobile(newMobile)) {
        alert("Please enter a valid mobile number with 7 to 15 digits.");
        return;
    }

    const mobileChanged = newMobile !== currentUserMobile;
    const saved = await saveCurrentUserProfile({
        name: newName,
        dob: newDob,
        mobile: newMobile,
        mobileVerified: mobileChanged ? false : currentUserMobileVerified,
        region: newRegion
    });

    if (!saved) return;

    currentUserName = newName;
    currentUserDob = newDob;
    currentUserMobile = newMobile;
    currentUserMobileVerified = mobileChanged ? false : currentUserMobileVerified;
    currentUserRegion = newRegion;
    currencyFormatter = createCurrencyFormatter(currentUserRegion);
    updateProfileView();
    displayProducts();
    alert("Profile updated successfully!");
}

// Demo verification: accepts a valid mobile format and marks it verified.
async function verifyMobile() {
    const profileMobileInput = document.getElementById("profileMobile");
    const mobile = profileMobileInput.value.trim();

    if (!currentUserEmail) {
        alert("Please login first.");
        return;
    }

    if (!isValidMobile(mobile)) {
        alert("Please enter a valid mobile number with 7 to 15 digits.");
        return;
    }

    const saved = await saveCurrentUserProfile({
        mobile,
        mobileVerified: true
    });

    if (!saved) return;

    currentUserMobile = mobile;
    currentUserMobileVerified = true;
    updateProfileView();
    alert("Mobile verified successfully!");
}

// Preview and apply currency as soon as the region changes.
async function updateRegionCurrency() {
    const profileRegionInput = document.getElementById("profileRegion");

    currentUserRegion = profileRegionInput.value;
    currencyFormatter = createCurrencyFormatter(currentUserRegion);
    if (currentUserEmail) await saveCurrentUserProfile({ region: currentUserRegion });
    updateProfileView();
    displayProducts();
}

async function saveCurrentUserProfile(updates) {
    if (!currentUserEmail) {
        alert("Please login first.");
        return false;
    }

    try {
        const updatedUser = await callBackend("/api/user", "PUT", { email: currentUserEmail, ...updates });
        setCurrentUser(updatedUser);
        return true;
    } catch (error) {
        if (isBackendUnavailable(error)) {
            try {
                const updatedUser = updateLocalUser(currentUserEmail, updates);
                setCurrentUser(updatedUser);
                return true;
            } catch (localError) {
                alert(localError.message || "Unable to save profile offline.");
                return false;
            }
        }

        alert(error.message || "Unable to save profile. Please try again later.");
        return false;
    }
}

function setCurrentUser(user) {
    currentUserEmail = user.email.toLowerCase();
    currentUserName = user.name || "User";
    currentUserDob = user.dob || "";
    currentUserMobile = user.mobile || "";
    currentUserMobileVerified = Boolean(user.mobileVerified);
    currentUserRegion = getRegionSettings(user.region).code;
    currencyFormatter = createCurrencyFormatter(currentUserRegion);
}

function getRegionSettings(region) {
    const code = REGION_SETTINGS[region] ? region : "IN";
    return { code, ...REGION_SETTINGS[code] };
}

function createCurrencyFormatter(region) {
    const settings = getRegionSettings(region);

    return new Intl.NumberFormat(settings.locale, {
        style: "currency",
        currency: settings.currency
    });
}

function isValidMobile(value) {
    const digitsOnly = value.replace(/\D/g, "");
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

/* ---------------- INVENTORY ---------------- */
// Load saved products from localStorage when the page starts.
function loadProducts() {
    if (!currentUserEmail) return [];

    const savedProducts = readJsonFromStorage(getProductsStorageKey(), []);
    const productsArray = Array.isArray(savedProducts) ? savedProducts : [];

    const migratedProducts = productsArray.map((item) => {
        if (!item.currencyRegion) {
            return { ...item, currencyRegion: currentUserRegion || "IN" };
        }
        return item;
    });

    const needsSave = migratedProducts.some((item, index) => item !== productsArray[index]);
    if (needsSave) {
        localStorage.setItem(getProductsStorageKey(), JSON.stringify(migratedProducts));
    }

    return migratedProducts;
}

// Save the latest product list so it remains after refreshing the browser.
function saveProducts() {
    if (!currentUserEmail) return;

    localStorage.setItem(getProductsStorageKey(), JSON.stringify(products));
}

// Store each user's products under a separate key so accounts do not share inventory.
function getProductsStorageKey() {
    return `${PRODUCTS_STORAGE_KEY}:${currentUserEmail}`;
}

// Read JSON safely so old or corrupted browser storage does not crash the app.
function readJsonFromStorage(key, fallbackValue) {
    try {
        const savedValue = localStorage.getItem(key);
        return savedValue ? JSON.parse(savedValue) : fallbackValue;
    } catch {
        localStorage.removeItem(key);
        return fallbackValue;
    }
}

// Clear the product form and return the button to add mode.
function resetForm() {
    productNameInput.value = "";
    productMarketplaceInput.value = "Amazon";
    productQtyInput.value = "";
    productPriceInput.value = "";
    productLinkInput.value = "";
    addEditButton.textContent = "Add Product";
    editingIndex = -1;
}

// Try to read the product page and fill the price automatically from the pasted link.
async function fetchPriceFromLink() {
    const link = productLinkInput.value.trim();

    if (!link || !isValidUrl(link)) {
        alert("Please paste a valid Amazon or Flipkart product link first.");
        return;
    }

    fetchPriceButton.disabled = true;
    fetchPriceButton.textContent = "Fetching...";

    try {
        let productDetails = null;

        try {
            productDetails = await readProductDetailsFromServer(link);
        } catch (serverError) {
            const htmlText = await readProductPage(link);
            const price = extractPriceFromHtml(htmlText);
            const name = extractProductNameFromHtml(htmlText);

            productDetails = { name, price };
        }

        const { name, price } = productDetails || {};

        if (!name && !price) {
            alert("Product name and price could not be detected automatically. Please enter them manually.");
            return;
        }

        if (name) productNameInput.value = name;
        if (price) productPriceInput.value = price;

        alert("Product details fetched successfully!");
    } catch (error) {
        console.error(error);
        alert("Product fetch failed. Amazon and Flipkart may block automatic reading, so please enter the details manually.");
    } finally {
        fetchPriceButton.disabled = false;
        fetchPriceButton.textContent = "Fetch Price";
    }
}

// Ask the local backend for the product name and price.
async function readProductDetailsFromServer(link) {
    const response = await fetch(`${BACKEND_API_URL}/api/price?url=${encodeURIComponent(link)}`);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Product fetch failed.");

    return data;
}

// Try multiple public readers because product sites often block direct browser requests.
async function readProductPage(link) {
    const encodedLink = encodeURIComponent(link);
    const readers = [
        {
            url: `https://r.jina.ai/${link}`,
            parse: (response) => response.text()
        },
        {
            url: `https://api.allorigins.win/raw?url=${encodedLink}`,
            parse: (response) => response.text()
        },
        {
            url: `https://api.allorigins.win/get?url=${encodedLink}`,
            parse: async (response) => {
                const data = await response.json();
                return data.contents || "";
            }
        },
        {
            url: `https://corsproxy.io/?${encodedLink}`,
            parse: (response) => response.text()
        }
    ];

    for (const reader of readers) {
        try {
            const response = await fetch(reader.url);

            if (response.ok) {
                const pageText = await reader.parse(response);
                if (pageText) return pageText;
            }
        } catch {
            // Try the next reader.
        }
    }

    throw new Error("No reader could open the product page.");
}

// Look for common Amazon, Flipkart, and meta tag price formats in the page HTML.
function extractPriceFromHtml(html) {
    const cleanHtml = html.replace(/&nbsp;/g, " ").replace(/&#8377;|&amp;#8377;|&ruppee;|&rupee;/gi, "₹");
    const pricePatterns = [
        /id=["']priceblock_(?:ourprice|dealprice|saleprice)["'][^>]*>[\s\S]{0,120}?(?:₹|Rs\.?|\$)\s*([\d,]+(?:\.\d{1,2})?)/i,
        /class=["'][^"']*(?:a-price-whole|Nx9bqj|_30jeq3|price)[^"']*["'][^>]*>[\s\S]{0,80}?(?:₹|Rs\.?|\$)?\s*([\d,]+(?:\.\d{1,2})?)/i,
        /property=["']product:price:amount["'][^>]*content=["']([\d,]+(?:\.\d{1,2})?)["']/i,
        /itemprop=["']price["'][^>]*(?:content=["']([\d,]+(?:\.\d{1,2})?)["']|>[\s\S]{0,60}?(?:₹|Rs\.?|\$)\s*([\d,]+(?:\.\d{1,2})?))/i,
        /"price"\s*:\s*"?(?:₹|Rs\.?|\$)?\s*([\d,]+(?:\.\d{1,2})?)"?/i,
        /(?:₹|Rs\.?|\$)\s*([\d,]+(?:\.\d{1,2})?)/
    ];

    for (const pattern of pricePatterns) {
        const match = cleanHtml.match(pattern);
        const value = match && (match[1] || match[2]);

        if (value) {
            return value.replace(/,/g, "");
        }
    }

    return "";
}

function extractProductNameFromHtml(html) {
    const cleanHtml = html.replace(/\s+/g, " ");
    const namePatterns = [
        /id=["']productTitle["'][^>]*>([\s\S]{0,300}?)<\/span>/i,
        /id=["']title["'][^>]*>([\s\S]{0,300}?)<\/h1>/i,
        /class=["'][^"']*(?:B_NuCI|VU-ZEz|product-title|title)[^"']*["'][^>]*>([\s\S]{0,300}?)<\/(?:span|h1|div)>/i,
        /property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
        /name=["']title["'][^>]*content=["']([^"']+)["']/i,
        /<title[^>]*>([\s\S]{0,300}?)<\/title>/i
    ];

    for (const pattern of namePatterns) {
        const match = cleanHtml.match(pattern);
        if (match && match[1]) {
            return cleanProductName(match[1]);
        }
    }

    return "";
}

function cleanProductName(value) {
    return decodeHtml(value)
        .replace(/<[^>]*>/g, "")
        .replace(/\s*[:|-]\s*(Amazon\.in|Flipkart\.com|Amazon|Flipkart).*$/i, "")
        .trim();
}

function decodeHtml(value) {
    return value
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ");
}

// Add a new product or update the selected product if editing.
function addProduct() {
    const name = productNameInput.value.trim();
    const marketplace = productMarketplaceInput.value;
    const qty = Number(productQtyInput.value);
    const price = Number(productPriceInput.value);
    const link = productLinkInput.value.trim();

    // Validate that all product fields contain usable values.
    if (!name || !marketplace || !Number.isInteger(qty) || isNaN(price) || qty <= 0 || price <= 0) {
        alert("Please enter a product name, store, whole-number quantity, and positive price.");
        return;
    }

    if (link && !isValidUrl(link)) {
        alert("Please enter a valid product link or leave the link field empty.");
        return;
    }

    if (editingIndex === -1) {
        products.push({ name, marketplace, qty, price, link, currencyRegion: currentUserRegion });
        alert("Product added successfully!");
    } else {
        products[editingIndex] = { name, marketplace, qty, price, link, currencyRegion: currentUserRegion };
        alert("Product updated successfully!");
    }

    saveProducts();
    displayProducts();
    resetForm();
}

// Rebuild the table rows from the current product list.
function displayProducts() {
    const table = document.getElementById("inventoryTable");
    table.innerHTML = "";

    products.forEach((item, index) => {
        // Build table rows with DOM methods so product names are treated as text.
        const convertedPrice = convertPriceToCurrentRegion(item.price, item.currencyRegion);
        const total = item.qty * convertedPrice;
        const row = document.createElement("tr");

        row.addEventListener("click", () => editProduct(index));
        addCell(row, index + 1);
        addCell(row, item.name);
        addCell(row, item.marketplace || "Other");
        addCell(row, item.qty);
        addCell(row, formatCurrency(convertedPrice));
        addCell(row, formatCurrency(total));
        addLinkCell(row, item.link);

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", (event) => {
            event.stopPropagation();
            deleteProduct(index);
        });
        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);
        table.appendChild(row);
    });

    calculateTotalInventoryValue();
}

// Helper for adding a text cell to a table row.
function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);
}

// Helper for adding a clickable product link when one is available.
function addLinkCell(row, link) {
    const cell = document.createElement("td");

    if (link) {
        const anchor = document.createElement("a");
        anchor.href = link;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.className = "product-link";
        anchor.textContent = "Open";
        anchor.addEventListener("click", (event) => event.stopPropagation());
        cell.appendChild(anchor);
    } else {
        cell.textContent = "-";
    }

    row.appendChild(cell);
}

// Basic URL validation for pasted Amazon, Flipkart, or other store links.
function isValidUrl(value) {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

// Put the clicked product back into the form for editing.
function editProduct(i) {
    const item = products[i];
    const convertedPrice = convertPriceToCurrentRegion(item.price, item.currencyRegion);

    productNameInput.value = item.name;
    productMarketplaceInput.value = item.marketplace || "Other";
    productQtyInput.value = item.qty;
    productPriceInput.value = roundMoney(convertedPrice);
    productLinkInput.value = item.link || "";
    addEditButton.textContent = "Save Changes";
    editingIndex = i;
}

// Remove a product, save the updated list, and redraw the table.
function deleteProduct(i) {
    products.splice(i, 1);
    saveProducts();
    displayProducts();
    resetForm();
}

// Add all row totals together and update the dashboard summary.
function calculateTotalInventoryValue() {
    const totalValue = products.reduce((sum, item) => {
        const convertedPrice = convertPriceToCurrentRegion(item.price, item.currencyRegion);
        return sum + item.qty * convertedPrice;
    }, 0);
    document.getElementById("totalInventoryValue").textContent = formatCurrency(totalValue);
}

function formatCurrency(value) {
    return currencyFormatter.format(Number(value) || 0);
}

function convertPriceToCurrentRegion(price, sourceRegion) {
    const sourceSettings = getRegionSettings(sourceRegion || "IN");
    const targetSettings = getRegionSettings(currentUserRegion || "IN");
    const priceInInr = (Number(price) || 0) * sourceSettings.inrPerUnit;

    return priceInInr / targetSettings.inrPerUnit;
}

function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}
