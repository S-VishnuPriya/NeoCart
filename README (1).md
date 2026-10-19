# NeoCart 🛒 — Enterprise Full-Stack E-Commerce Platform

NeoCart is a modern, resume-worthy, full-stack e-commerce application integrating both **Developer A** and **Developer B** modules into a unified, high-performance platform built with **React (Vite)**, **Node.js/Express**, **PostgreSQL**, and **Prisma ORM**.

---

## 🚀 Key Modules & Capabilities

### 👨‍💻 Developer A Modules:
* **Authentication & JWT:** (`backend/src/modules/auth.ts`) — Register, Login, Token Refresh Rotation, Logout, Auth guards.
* **Customer Management:** (`backend/src/modules/customer.ts`) — Profile management, Multi-address book (default shipping/billing).
* **Cart Management:** (`backend/src/modules/cart.ts`) — Active customer & guest cart, real-time totals, stock validation, guest session merging.
* **Orders & Workflow:** (`backend/src/modules/order.ts`) — Order placement from cart, immutable item snapshots, Finite State Machine (FSM) status progression, cancellation validation rules with stock restoration.
* **Reports & Analytics:** (`backend/src/modules/reports.ts`) — Sales revenue summaries, order distribution, customer metrics, CSV export.

### 👩‍💻 Developer B Modules:
* **Product Catalog & Categories:** (`backend/src/modules/product.ts`) — Product CRUD, categories, search, price/category filters, pagination, and rating statistics.
* **Inventory Management:** (`backend/src/modules/inventory.ts`) — Real-time stock levels, low-stock threshold alerts, manual stock adjustments with reason logging, and stock audit history.
* **Payment & Checkout:** (`backend/src/modules/payment.ts`) — Checkout session initiation, payment gateway processing, transaction tracking, automated order status advancement.
* **Admin / RBAC & Audit:** (`backend/src/modules/admin.ts`) — Store KPI overview cards, user directory with role promotion/demotion (`CUSTOMER`, `MANAGER`, `ADMIN`), account status toggling, and system audit logs.
* **Feedback & Reviews:** (`backend/src/modules/review.ts`) — Star ratings, customer reviews, automated **Verified Buyer check** against delivered orders.

---

## 📚 Learning Documentation (`Understand NeoCart/`)

* [`00_TECH_STACK_AND_TRADE_OFFS.md`](Understand%20NeoCart/00_TECH_STACK_AND_TRADE_OFFS.md) — Comprehensive tech stack breakdown, trade-off comparisons, Oracle vs PostgreSQL mapping, and viva cheat sheet.
* [`01_ARCHITECTURE_AND_CONCEPTS.md`](Understand%20NeoCart/01_ARCHITECTURE_AND_CONCEPTS.md) — End-to-end architecture, Order state machine, verified review check, and RBAC matrix.
* [`02_DATABASE_AND_API_REFERENCE.md`](Understand%20NeoCart/02_DATABASE_AND_API_REFERENCE.md) — Complete 15-model ERD and all 35+ REST API endpoints.
* [`03_LOCAL_RUN_AND_TESTING_GUIDE.md`](Understand%20NeoCart/03_LOCAL_RUN_AND_TESTING_GUIDE.md) — Step-by-step local execution and verification instructions.
* [`04_ADMIN_AND_RBAC_SECURITY.md`](Understand%20NeoCart/04_ADMIN_AND_RBAC_SECURITY.md) — Role-Based Access Control, security guards, and audit trail architecture.

---

## ⚡ Quick Start (Run Locally)

### 1. Backend Server
```bash
cd backend
npm install
cp .env.example .env
# Configure your PostgreSQL connection string in .env
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```
Backend API will start at `http://localhost:5000` (Health: `http://localhost:5000/health`).

### 2. Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Frontend SPA will open at `http://localhost:5173`.

---

## 🔑 Pre-Configured Demo Accounts (Password: `password123`)
* **Customer:** `customer@neocart.com`
* **Manager:** `manager@neocart.com`
* **Admin:** `admin@neocart.com`
