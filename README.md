# Inventory Handling System

A modern inventory management system built with HTML, CSS, JavaScript, Node.js, Express, MongoDB, Mongoose, JWT, and bcrypt.

## Features

- Signup, login, logout
- Google signup and login
- JWT protected API routes
- Password hashing with bcrypt
- 4-digit email verification before login
- Add, edit, delete, search, and filter products
- Dashboard cards for total products, total stock, low stock, and total value
- Recent product activity
- Responsive sidebar layout
- MongoDB Atlas database with Mongoose models

## Project Structure

```text
inventory-handling-system/
├── controllers/
│   ├── authController.js
│   └── productController.js
├── middleware/
│   ├── authMiddleware.js
│   └── errorMiddleware.js
├── models/
│   ├── Product.js
│   └── User.js
├── public/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── routes/
│   ├── authRoutes.js
│   └── productRoutes.js
├── utils/
│   └── generateToken.js
├── .env.example
├── .gitignore
├── db.js
├── package.json
├── README.md
└── server.js
```

## Required Packages

```bash
npm install express mongoose bcryptjs jsonwebtoken dotenv cors
npm install --save-dev nodemon
```

## Local Setup

1. Install Node.js.
2. Install dependencies:

```bash
npm install
```

3. Create `.env` from `.env.example`.
4. Add your MongoDB Atlas connection string:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/inventory-handling-system
JWT_SECRET=your_long_random_secret
PORT=3000
JWT_EXPIRES_IN=7d
APP_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
EMAIL_FROM=Inventory Handling System <your_email@gmail.com>
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

5. Start the server:

```bash
npm run dev
```

6. Open:

```text
http://localhost:3000
```

## MongoDB Atlas Setup

1. Create a MongoDB Atlas account.
2. Create a new project and cluster.
3. Create a database user with username and password.
4. Add your IP address in Network Access, or use `0.0.0.0/0` for development.
5. Copy the connection string.
6. Replace username, password, and database name in `.env`.

## API Routes

```text
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/google
GET    /api/auth/google/callback
POST   /api/auth/verify-email
POST   /api/auth/resend-verification
GET    /api/auth/me
GET    /api/products/dashboard
GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
```

Protected product routes require:

```text
Authorization: Bearer YOUR_JWT_TOKEN
```

## Deployment

### Render

1. Push the project to GitHub.
2. Create a new Render Web Service.
3. Connect the GitHub repository.
4. Set build command:

```bash
npm install
```

5. Set start command:

```bash
npm start
```

6. Add environment variables in Render:

```text
MONGO_URI
JWT_SECRET
JWT_EXPIRES_IN
APP_URL
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
EMAIL_FROM
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL
```

## Google OAuth Setup

1. Open Google Cloud Console.
2. Create a project.
3. Go to APIs & Services > Credentials.
4. Create an OAuth Client ID for a Web application.
5. Add authorized redirect URI:

```text
http://localhost:3000/api/auth/google/callback
```

For Render, also add:

```text
https://inventory-handling-system.onrender.com/api/auth/google/callback
```

6. Copy the Client ID and Client Secret into `.env` or Render environment variables.

### Vercel

This project is best deployed as a full Express app on Render. Vercel is better for frontend-only or serverless apps. If using Vercel, move backend routes into serverless functions or deploy only the `public` frontend and host the API separately.

## Security Notes

- Do not upload `.env`.
- Do not upload `localdb.json`.
- Passwords are hashed before saving.
- Product routes are protected by JWT authentication.
