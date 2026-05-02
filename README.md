# 🛒 Multi-Channel Merchandising System

A production-oriented merchandising platform designed to manage products, inventory, and orders across multiple e-commerce channels including Lazada, Shopee, and TikTok Shop.

This system is built using a **Domain-Driven Design (DDD) evolution approach**, starting from a pragmatic implementation and progressively refactoring into clean domain boundaries.

---

## 🚀 Overview

This project solves a real-world problem:

> Managing a single source of truth for products, inventory, and orders while integrating with multiple external e-commerce platforms and internal sales workflows.

---

## 🧱 Architecture

The system follows a **modular monolith with bounded contexts** aligned with Domain-Driven Design.

```text
core/
  catalog/
  inventory/
  orders/
  pricing/

integration/
  shopee/
  lazada/
  tiktok/

supporting/
  identity/
  audit/
```

---

## 🧠 Core Principles

* Feature-based modularity (vertical slicing)
* Anti-corruption layer for external systems
* Separation of core domain and integrations
* Event-driven extensibility
* Evolutionary design (build → refine → structure)

---

# 🏢 Sales Workflow (Business Layer)

This system implements a structured internal sales workflow aligned with real-world operational needs.

---

## 🔐 1. System Access & Roles (RBAC)

Role-Based Access Control ensures security and accountability.

### 👤 Sales Agent

* Read-only access to inventory
* Access to Sales Dashboard (order entry + client management)
* Can apply **pre-approved discount bands only**
* Cannot access company-wide analytics

---

### 📦 Warehouse User

* Read-only access to order details
* Can:

  * Print waybills
  * Update order status:

    * Packed
    * Dispatched

---

### 🧑‍💼 Management / Master

* Full access:

  * Inventory (manual + bulk upload)
  * Pricing & discount structures
  * Commission configuration
  * Full analytics dashboard

---

## 🧩 Workflow Modules

---

## 📦 Module A: Inventory Management (Core Domain → `inventory/`)

### Features

* Centralized SKU database
* Real-time stock tracking
* Pricing reference

---

### Maintenance (Management Only)

* Manual updates (single item)
* Bulk upload (CSV/Excel)

---

### Sales Access

* Read-only stock visibility
* Cannot modify inventory

---

### ⚠️ Critical Design Feature

> The system MUST support **stock reservation** to prevent overselling.

```text
available - reserved = sellable
```

---

## 🧾 Module B: Sales & CRM Dashboard (Core Domain → `orders/` + CRM layer)

### Leads Management

* Sales agents handle:

  * Facebook inquiries
  * Reseller communications

---

### Order Entry Flow

1. Check inventory (real-time)
2. Select or create client:

   * Name
   * Phone
   * Address
   * Social handle
3. Apply approved discount
4. System calculates commission automatically

---

### 💳 Payment Verification (Critical Gate)

> Orders MUST NOT proceed to warehouse until payment is verified.

Flow:

```text
Order Created → Payment Pending
   ↓
Agent uploads proof
   ↓
Management verifies
   ↓
Status: Payment Verified
```

---

## 📦 Module C: Warehouse & Fulfillment (`orders/` + integration layer)

### Order Queue

* Only **Payment Verified** orders appear

---

### Timestamped Audit Trail

```text
[Time] Order Created
[Time] Payment Verified
[Time] Packed
[Time] Dispatched
```

---

### Fulfillment Flow

1. Generate pick list
2. Pull items from inventory
3. Print waybill (courier integration)
4. Pack order
5. Update status:

   * Ready for Dispatch
   * Dispatched

---

## 🚚 Module D: Management & Post-Order

---

### Courier Integration (`integration/`)

* Auto-generate tracking numbers
* Sync delivery status

---

### 🔄 RMA & Returns

* Handle:

  * cancellations (pre-dispatch)
  * returns (post-delivery)

👉 Automatically:

* restore inventory
* update order status

---

### 📊 Analytics & Reporting

* Sales performance
* Top SKUs
* Channel breakdown (FB, Reseller, Platforms)
* Agent performance

---

### 🔐 Audit Logs (`supporting/audit/`)

Tracks:

* price changes
* inventory updates
* order modifications

---

# 🧠 Core Domains (DDD Mapping)

---

## 📦 Catalog

* Product definitions
* Variants
* Platform-agnostic

---

## 📦 Inventory

* Quantity-based model
* Reservation system

```text
AVAILABLE → RESERVED → SOLD
```

---

## 🧾 Orders

* Canonical order model
* Unified across:

  * Shopee
  * Lazada
  * TikTok
  * Internal Sales

---

## 💰 Pricing

* Base pricing
* Discount structures
* Commission calculations

---

# 🔌 Integration Layer

Each platform is isolated:

```text
integration/
  shopee/
  lazada/
  tiktok/
```

Handles:

* API communication
* data mapping
* webhook ingestion
* retries & error handling

---

# 🔄 Inventory Design (Concurrency-Safe)

Atomic reservation:

```sql
UPDATE inventory_item
SET reserved = reserved + :qty
WHERE product_id = :id
AND (available - reserved) >= :qty;
```

---

# ⚠️ Key Challenges Solved

* Multi-channel inconsistencies
* Overselling prevention
* Concurrency control
* External API unreliability
* Order normalization
* Internal workflow enforcement (sales → warehouse → dispatch)

---

# 🛠️ Tech Stack

* Backend: Spring Boot (Java)
* Database: PostgreSQL
* Frontend: Angular / React
* CI/CD: GitHub Actions (planned)

---

# 📂 Project Structure

```text
catalog/
inventory/
orders/
pricing/

integration/
  shopee/
  lazada/
  tiktok/

supporting/
  identity/
  audit/
```

---

# 🔄 Evolution Strategy

### Phase 1

* Feature-based modules
* Layered implementation

### Phase 2

* Stability (transactions, validation)

### Phase 3

* Full DDD:

  * aggregates
  * domain events
  * decoupling

---

# 🧠 Design Philosophy

> Start simple. Evolve into correctness.

---

# ⚠️ Important Notes

* External systems are **eventually consistent**
* Inventory is **critical and must be protected**
* Integration layer must be **resilient and idempotent**

---

# 📄 License

MIT

---

# 👤 Author

Your Name

---
