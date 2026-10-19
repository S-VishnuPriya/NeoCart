# NeoCart 🛒 — Enterprise Full-Stack E-Commerce Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

**NeoCart** is a modern, high-performance, full-stack enterprise e-commerce platform designed with scalable micro-modular architecture, strict TypeScript type-safety, robust Role-Based Access Control (RBAC), and an interactive storefront paired with an executive admin management suite.

---

## 👥 Team & Architecture Distribution

| Contributor | Focus Area | Responsibilities |
| :--- | :--- | :--- |
| **[@S-VishnuPriya](https://github.com/S-VishnuPriya)** | **Customer-Side (Frontend & Backend)** | • Interactive Product Storefront, Filtering & Search<br>• Real-time Shopping Cart & Drawer<br>• Multi-step Checkout & Payment Processing<br>• Order Placement & Immutable State Machine<br>• Customer Portal (Address Book, Order History)<br>• Verified Buyer Reviews & Rating Engine |
| **[@Shreya777-code](https://github.com/Shreya777-code)** | **Admin-Side (Frontend & Backend)** | • Executive Admin Dashboard with Real-time KPI Cards<br>• Product Catalog CRUD & Category Management<br>• Inventory Tracking, Thresholds & Stock Audit Logs<br>• Order Management & Fulfillment Workflows<br>• User Management, Role Promotion & RBAC<br>• Revenue Analytics & CSV Export Reports |

---

## ✨ Features & Modules

### 🛍️ Customer Experience ([@S-VishnuPriya](https://github.com/S-VishnuPriya))
* **Dynamic Storefront:** Fast product browsing with real-time text search, category filtering, price sliders, and star rating sorting.
* **Persistent Cart Management:** Seamless cart drawer supporting active sessions, live subtotal/tax calculations, and quantity constraints against live inventory.
* **Streamlined Checkout:** Shipping address selection, billing reconciliation, and mock payment gateway processing.
* **Customer Account Portal:** Manage multiple shipping/billing addresses, view order history, inspect itemized invoice receipts, and track order shipment statuses.
* **Verified Customer Reviews:** Customers can rate products 1–5 stars and leave written feedback with automated verification against delivered purchase records.

### 📊 Admin Suite & Operations ([@Shreya777-code](https://github.com/Shreya777-code))
* **Executive Metrics & KPIs:** Overview of Gross Revenue, Total Orders, Active Users, and Low-Stock Warnings.
* **Catalog Management:** Create, edit, and deactivate products with image URLs, categorization, and pricing.
* **Inventory Control & Audit Trails:** Real-time inventory tracking, low-stock threshold triggers, and manual adjustments with reason logging.
* **Order Fulfillment Pipeline:** Inspect all customer orders, filter by status (`PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, `CANCELLED`), and advance stages.
* **User & Role Administration:** View all registered accounts, toggle account status (`ACTIVE`/`SUSPENDED`), and promote/demote user roles (`CUSTOMER`, `MANAGER`, `ADMIN`).
* **Sales Analytics & Reports:** Detailed sales revenue breakdowns, top-selling products, order volume distributions, and CSV export capabilities.

### 🛡️ Core Infrastructure & Security
* **JWT Authentication:** Secure token-based authentication with refresh token rotation and HTTP authorization guards.
* **Prisma ORM & Relational Schema:** Strongly-typed database models, automated migrations, and relational integrity.
* **FSM Order State Machine:** Validated state transitions preventing illegal lifecycle mutations (e.g., cancelled orders cannot be shipped).

---

## 🛠️ Tech Stack

* **Frontend:** React 18, TypeScript, Vite, Lucide Icons, Vanilla CSS Design System.
* **Backend:** Node.js, Express.js, TypeScript.
* **Database & ORM:** PostgreSQL / SQLite, Prisma ORM.
* **Authentication:** JSON Web Tokens (JWT), Bcrypt password hashing.

---

## 🚀 Getting Started (Local Setup)

### Prerequisites
* **Node.js** (v18.x or higher)
* **npm** (v9.x or higher)
* **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/S-VishnuPriya/NeoCart.git
cd NeoCart
```

### 2. Backend Setup
```bash
cd backend
npm install

# Setup environment variables
cp .env.example .env

# Run database migrations & seed initial demo data
npx prisma migrate dev --name init
npx prisma db seed

# Start development server
npm run dev
```
Backend API will run at `http://localhost:5000` (Health check: `http://localhost:5000/health`).

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Frontend application will be accessible at `http://localhost:5173`.

---

## 🔑 Demo Credentials

All seeded accounts use password: `password123`

| Role | Email | Access Scope |
| :--- | :--- | :--- |
| **Customer** | `customer@neocart.com` | Storefront, Cart, Checkout, Order History |
| **Manager** | `manager@neocart.com` | Storefront + Catalog & Inventory Management |
| **Admin** | `admin@neocart.com` | Full Administrative & Executive RBAC Access |

---

## 📄 License
This project is developed for academic and portfolio demonstration purposes. All rights reserved.
