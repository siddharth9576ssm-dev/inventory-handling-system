const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const rootDir = __dirname;
const localDbPath = path.join(__dirname, "localdb.json");

const requestHeaders = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "en-IN,en;q=0.9"
};

const server = http.createServer(async (req, res) => {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;

    try {
        if (!pathname.startsWith("/api/")) {
            return serveStaticFile(pathname, res);
        }

        if (requestUrl.pathname === "/api/register" && req.method === "POST") {
            const body = await readJsonBody(req);
            const name = (body.name || "").trim();
            const email = (body.email || "").trim().toLowerCase();
            const pass = body.pass || "";

            if (!name || !email || !pass) {
                sendJson(res, 400, { error: "Name, email, and password are required." });
                return;
            }

            if (!isValidEmail(email)) {
                sendJson(res, 400, { error: "Please provide a valid email address." });
                return;
            }

            if (await findUser(email)) {
                sendJson(res, 409, { error: "This email is already registered." });
                return;
            }

            const newUser = {
                name,
                email,
                pass,
                dob: "",
                mobile: "",
                mobileVerified: false,
                region: "IN"
            };

            const savedUser = await addUser(newUser);
            sendJson(res, 201, {
                name: savedUser.name,
                email: savedUser.email,
                dob: savedUser.dob,
                mobile: savedUser.mobile,
                mobileVerified: Boolean(savedUser.mobileVerified),
                region: savedUser.region
            });
            return;
        }

        if (requestUrl.pathname === "/api/login" && req.method === "POST") {
            const body = await readJsonBody(req);
            const email = (body.email || "").trim().toLowerCase();
            const pass = body.pass || "";

            if (!email || !pass) {
                sendJson(res, 400, { error: "Email and password are required." });
                return;
            }

            const user = await findUser(email);
            if (!user || user.pass !== pass) {
                sendJson(res, 401, { error: "Incorrect email or password." });
                return;
            }

            sendJson(res, 200, {
                name: user.name,
                email: user.email,
                dob: user.dob,
                mobile: user.mobile,
                mobileVerified: user.mobileVerified,
                region: user.region
            });
            return;
        }

        if (requestUrl.pathname === "/api/user" && req.method === "PUT") {
            const body = await readJsonBody(req);
            const email = (body.email || "").trim().toLowerCase();

            if (!email) {
                sendJson(res, 400, { error: "User email is required." });
                return;
            }

            const user = await findUser(email);
            if (!user) {
                sendJson(res, 404, { error: "User not found." });
                return;
            }

            const updates = {
                name: body.name !== undefined ? body.name : user.name,
                dob: body.dob !== undefined ? body.dob : user.dob,
                mobile: body.mobile !== undefined ? body.mobile : user.mobile,
                mobileVerified: body.mobileVerified !== undefined ? body.mobileVerified : user.mobileVerified,
                region: body.region !== undefined ? body.region : user.region
            };

            const updatedUser = await updateUser(email, updates);
            sendJson(res, 200, {
                name: updatedUser.name,
                email: updatedUser.email,
                dob: updatedUser.dob,
                mobile: updatedUser.mobile,
                mobileVerified: Boolean(updatedUser.mobileVerified),
                region: updatedUser.region
            });
            return;
        }

        if (requestUrl.pathname !== "/api/price" || req.method !== "GET") {
            sendJson(res, 404, { error: "Not found" });
            return;
        }

        const productUrl = requestUrl.searchParams.get("url");

        if (!isValidUrl(productUrl)) {
            sendJson(res, 400, { error: "Please provide a valid product URL." });
            return;
        }

        const pageText = await readProductPage(productUrl);
        const price = extractPriceFromText(pageText);
        const name = extractProductNameFromText(pageText);

        if (!price && !name) {
            sendJson(res, 404, { error: "Product details could not be found on this page." });
            return;
        }

        await saveFetchHistory({ url: productUrl, name, price, timestamp: new Date().toISOString() });
        sendJson(res, 200, { name, price });
    } catch (error) {
        sendJson(res, 500, { error: error.message || "Server error." });
    }
});

server.listen(PORT, () => {
    console.log(`Inventory backend running at http://localhost:${PORT}`);
});

function serveStaticFile(pathname, res) {
    const safePath = pathname.replace(/^\/+/g, "");
    const filePath = path.normalize(path.join(rootDir, safePath));

    if (!filePath.startsWith(rootDir + path.sep) && filePath !== rootDir) {
        sendJson(res, 403, { error: "Forbidden" });
        return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const indexPath = path.join(rootDir, "index.html");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(fs.readFileSync(indexPath));
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon"
    };

    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(fs.readFileSync(filePath));
}

function setCorsHeaders(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, body) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
}

function isValidEmail(value) {
    return typeof value === "string" && value.includes("@") && value.includes(".");
}

function isValidUrl(value) {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", () => {
            if (!body) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(error);
            }
        });
        req.on("error", reject);
    });
}

let localDbCache = null;

function loadLocalDb() {
    if (localDbCache) return localDbCache;

    try {
        const fileContents = fs.existsSync(localDbPath) ? fs.readFileSync(localDbPath, "utf8") : "";
        localDbCache = fileContents ? JSON.parse(fileContents) : null;
    } catch {
        localDbCache = null;
    }

    if (!localDbCache || typeof localDbCache !== "object") {
        localDbCache = {
            users: [],
            history: []
        };
    }

    return localDbCache;
}

function saveLocalDb() {
    fs.writeFileSync(localDbPath, JSON.stringify(loadLocalDb(), null, 2), "utf8");
}

async function findUser(email) {
    if (!email) return null;
    const users = loadLocalDb().users;
    return users.find((user) => user.email === email.toLowerCase()) || null;
}

async function addUser(user) {
    const newUser = {
        name: user.name,
        email: user.email.toLowerCase(),
        pass: user.pass,
        dob: user.dob || "",
        mobile: user.mobile || "",
        mobileVerified: user.mobileVerified ? true : false,
        region: user.region || "IN"
    };

    const db = loadLocalDb();
    db.users.push(newUser);
    saveLocalDb();
    return newUser;
}

async function updateUser(email, updates) {
    const db = loadLocalDb();
    const user = db.users.find((item) => item.email === email.toLowerCase());
    if (!user) return null;

    user.name = updates.name;
    user.dob = updates.dob;
    user.mobile = updates.mobile;
    user.mobileVerified = updates.mobileVerified ? true : false;
    user.region = updates.region;
    saveLocalDb();
    return user;
}

async function saveFetchHistory(entry) {
    const db = loadLocalDb();
    db.history.push({
        url: entry.url,
        name: entry.name,
        price: entry.price,
        timestamp: entry.timestamp
    });
    saveLocalDb();
    return entry;
}

async function readProductPage(productUrl) {
    const encodedUrl = encodeURIComponent(productUrl);
    const readers = [
        productUrl,
        `https://r.jina.ai/${productUrl}`,
        `https://api.allorigins.win/raw?url=${encodedUrl}`
    ];

    for (const readerUrl of readers) {
        try {
            const response = await fetch(readerUrl, { headers: requestHeaders });

            if (response.ok) {
                const text = await response.text();
                if (text) return text;
            }
        } catch {
            // Try the next reader.
        }
    }

    throw new Error("All readers failed.");
}

function extractPriceFromText(text) {
    const cleanText = text
        .replace(/&nbsp;/g, " ")
        .replace(/&#8377;|&amp;#8377;|&ruppee;|&rupee;/gi, "Rs.")
        .replace(/\s+/g, " ");

    const pricePatterns = [
        /id=["']priceblock_(?:ourprice|dealprice|saleprice)["'][^>]*>[\s\S]{0,160}?(?:Rs\.?|INR|\$)\s*([\d,]+(?:\.\d{1,2})?)/i,
        /class=["'][^"']*(?:a-price-whole|Nx9bqj|_30jeq3|price)[^"']*["'][^>]*>[\s\S]{0,120}?(?:Rs\.?|INR|\$)?\s*([\d,]+(?:\.\d{1,2})?)/i,
        /property=["']product:price:amount["'][^>]*content=["']([\d,]+(?:\.\d{1,2})?)["']/i,
        /itemprop=["']price["'][^>]*(?:content=["']([\d,]+(?:\.\d{1,2})?)["']|>[\s\S]{0,80}?(?:Rs\.?|INR|\$)\s*([\d,]+(?:\.\d{1,2})?))/i,
        /"price"\s*:\s*"?(?:Rs\.?|INR|\$)?\s*([\d,]+(?:\.\d{1,2})?)"?/i,
        /(?:Rs\.?|INR|\$)\s*([\d,]+(?:\.\d{1,2})?)/i
    ];

    for (const pattern of pricePatterns) {
        const match = cleanText.match(pattern);
        const value = match && (match[1] || match[2]);

        if (value) return value.replace(/,/g, "");
    }

    return "";
}

function extractProductNameFromText(text) {
    const cleanText = text.replace(/\s+/g, " ");
    const namePatterns = [
        /id=["']productTitle["'][^>]*>([\s\S]{0,300}?)<\/span>/i,
        /class=["'][^"']*(?:B_NuCI|VU-ZEz|product-title|title)[^"']*["'][^>]*>([\s\S]{0,300}?)<\/(?:span|h1|div)>/i,
        /property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
        /name=["']title["'][^>]*content=["']([^"']+)["']/i,
        /<title[^>]*>([\s\S]{0,300}?)<\/title>/i
    ];

    for (const pattern of namePatterns) {
        const match = cleanText.match(pattern);

        if (match && match[1]) {
            return cleanProductName(match[1]);
        }
    }

    return "";
}

function cleanProductName(value) {
    return decodeHtml(value)
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .replace(/\s*[:|-]\s*(Amazon\.in|Flipkart\.com|Amazon|Flipkart).*$/i, "")
        .trim();
}

function decodeHtml(value) {
    return value
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ");
}
