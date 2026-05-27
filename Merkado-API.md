
Excellent question.

This is exactly the kind of thinking that separates:

* “CRUD app building”
  from
* “system/API design”

You are now defining:

> the operational contract of the system

Before coding.

That is the correct engineering mindset.

---

# 🧭 API DESIGN PRINCIPLES (IMPORTANT)

For your merch system, use these production-style principles:

---

# ✅ Use plural resource names

Good:

```text id="jlwm10"
/products
/orders
/clients
```

Avoid:

```text id="jlwm11"
/getProducts
/createOrder
```

---

# ✅ HTTP verbs define actions

| Method | Meaning        |
| ------ | -------------- |
| GET    | Read           |
| POST   | Create         |
| PUT    | Replace        |
| PATCH  | Partial update |
| DELETE | Delete         |

---

# ✅ Resource-oriented naming

Think:

```text id="jlwm12"
resources + state transitions
```

NOT:

```text id="jlwm13"
functions
```

---

# 🧱 FULL API SURFACE (TOP LEVEL)

I’ll enumerate your system by vertical slice.

---

# 1️⃣ IDENTITY SLICE

```text id="jlwm14"
/api/v1/auth
/api/v1/users
/api/v1/roles
/api/v1/permissions
```

---

# 🔐 Authentication

| Method | Endpoint               | Action                     |
| ------ | ---------------------- | -------------------------- |
| POST   | `/api/v1/auth/login`   | Login user                 |
| POST   | `/api/v1/auth/refresh` | Refresh JWT                |
| POST   | `/api/v1/auth/logout`  | Logout                     |
| GET    | `/api/v1/auth/me`      | Current authenticated user |

---

# 👤 Users

| Method | Endpoint             | Action              |
| ------ | -------------------- | ------------------- |
| GET    | `/api/v1/users`      | List users          |
| GET    | `/api/v1/users/{id}` | Get user            |
| POST   | `/api/v1/users`      | Create user         |
| PATCH  | `/api/v1/users/{id}` | Update user         |
| DELETE | `/api/v1/users/{id}` | Disable/delete user |

---

# 🛡 Roles

| Method | Endpoint             | Action      |
| ------ | -------------------- | ----------- |
| GET    | `/api/v1/roles`      | List roles  |
| POST   | `/api/v1/roles`      | Create role |
| PATCH  | `/api/v1/roles/{id}` | Update role |

---

# 🔑 Permissions

| Method | Endpoint              | Action            |
| ------ | --------------------- | ----------------- |
| GET    | `/api/v1/permissions` | List permissions  |
| POST   | `/api/v1/permissions` | Create permission |

---

# 2️⃣ CATALOG SLICE

```text id="jlwm15"
/api/v1/products
/api/v1/categories
```

---

# 📦 Products

| Method | Endpoint                | Action                 |
| ------ | ----------------------- | ---------------------- |
| GET    | `/api/v1/products`      | List products          |
| GET    | `/api/v1/products/{id}` | Get product            |
| POST   | `/api/v1/products`      | Create product         |
| PATCH  | `/api/v1/products/{id}` | Update product         |
| DELETE | `/api/v1/products/{id}` | Archive/delete product |

---

# 🔍 Product Search

| Method | Endpoint                  | Action          |
| ------ | ------------------------- | --------------- |
| GET    | `/api/v1/products/search` | Search products |

Query examples:

```text id="jlwm16"
/products/search?q=soap
/products/search?sku=ABC123
```

---

# 🏷 Categories

| Method | Endpoint             | Action          |
| ------ | -------------------- | --------------- |
| GET    | `/api/v1/categories` | List categories |
| POST   | `/api/v1/categories` | Create category |

---

# 3️⃣ INVENTORY SLICE

```text id="jlwm17"
/api/v1/inventory
/api/v1/stock-movements
/api/v1/reservations
```

---

# 📦 Inventory

| Method | Endpoint                                | Action              |
| ------ | --------------------------------------- | ------------------- |
| GET    | `/api/v1/inventory`                     | List inventory      |
| GET    | `/api/v1/inventory/{productId}`         | Get stock           |
| PATCH  | `/api/v1/inventory/{productId}/adjust`  | Adjust inventory    |
| POST   | `/api/v1/inventory/{productId}/reserve` | Reserve stock       |
| POST   | `/api/v1/inventory/{productId}/release` | Release reservation |

---

# 📜 Stock Movements

| Method | Endpoint                  | Action                |
| ------ | ------------------------- | --------------------- |
| GET    | `/api/v1/stock-movements` | View movement history |

---

# 4️⃣ ORDERS SLICE (CORE)

```text id="jlwm18"
/api/v1/orders
```

---

# 🧾 Orders

| Method | Endpoint              | Action              |
| ------ | --------------------- | ------------------- |
| GET    | `/api/v1/orders`      | List orders         |
| GET    | `/api/v1/orders/{id}` | Get order           |
| POST   | `/api/v1/orders`      | Create order        |
| PATCH  | `/api/v1/orders/{id}` | Update order        |
| DELETE | `/api/v1/orders/{id}` | Cancel/delete order |

---

# 🔄 Order Status

| Method | Endpoint                     | Action        |
| ------ | ---------------------------- | ------------- |
| PATCH  | `/api/v1/orders/{id}/status` | Update status |

Status examples:

```text id="jlwm19"
PENDING
PACKED
DISPATCHED
COMPLETED
CANCELLED
```

---

# 💸 Discounts

| Method | Endpoint                        | Action         |
| ------ | ------------------------------- | -------------- |
| POST   | `/api/v1/orders/{id}/discounts` | Apply discount |

---

# 5️⃣ CLIENTS SLICE

```text id="jlwm20"
/api/v1/clients
```

---

# 👥 Clients

| Method | Endpoint               | Action                |
| ------ | ---------------------- | --------------------- |
| GET    | `/api/v1/clients`      | List clients          |
| GET    | `/api/v1/clients/{id}` | Get client            |
| POST   | `/api/v1/clients`      | Create client         |
| PATCH  | `/api/v1/clients/{id}` | Update client         |
| DELETE | `/api/v1/clients/{id}` | Archive/delete client |

---

# 🔍 Client Search

| Method | Endpoint                 | Action         |
| ------ | ------------------------ | -------------- |
| GET    | `/api/v1/clients/search` | Search clients |

---

# 6️⃣ WAREHOUSE SLICE

```text id="jlwm21"
/api/v1/shipments
/api/v1/waybills
```

---

# 🚚 Shipments

| Method | Endpoint                          | Action          |
| ------ | --------------------------------- | --------------- |
| GET    | `/api/v1/shipments`               | List shipments  |
| GET    | `/api/v1/shipments/{id}`          | Get shipment    |
| PATCH  | `/api/v1/shipments/{id}/pack`     | Mark packed     |
| PATCH  | `/api/v1/shipments/{id}/dispatch` | Mark dispatched |

---

# 🧾 Waybills

| Method | Endpoint                        | Action                |
| ------ | ------------------------------- | --------------------- |
| GET    | `/api/v1/waybills/{shipmentId}` | Generate/view waybill |

---

# 7️⃣ PRICING SLICE

```text id="jlwm22"
/api/v1/pricing
/api/v1/discount-bands
```

---

# 💰 Pricing

| Method | Endpoint                      | Action         |
| ------ | ----------------------------- | -------------- |
| GET    | `/api/v1/pricing`             | List pricing   |
| PATCH  | `/api/v1/pricing/{productId}` | Update pricing |

---

# 🎯 Discount Bands

| Method | Endpoint                      | Action               |
| ------ | ----------------------------- | -------------------- |
| GET    | `/api/v1/discount-bands`      | List discount bands  |
| POST   | `/api/v1/discount-bands`      | Create discount band |
| PATCH  | `/api/v1/discount-bands/{id}` | Update discount band |

---

# 8️⃣ COMMISSION SLICE

```text id="jlwm23"
/api/v1/commissions
```

---

# 💵 Commissions

| Method | Endpoint                        | Action            |
| ------ | ------------------------------- | ----------------- |
| GET    | `/api/v1/commissions`           | List commissions  |
| GET    | `/api/v1/commissions/{agentId}` | Agent commissions |
| PATCH  | `/api/v1/commissions/{id}`      | Update commission |

---

# 9️⃣ ANALYTICS SLICE

```text id="jlwm24"
/api/v1/analytics
```

---

# 📊 Analytics

| Method | Endpoint                      | Action              |
| ------ | ----------------------------- | ------------------- |
| GET    | `/api/v1/analytics/sales`     | Sales analytics     |
| GET    | `/api/v1/analytics/inventory` | Inventory analytics |
| GET    | `/api/v1/analytics/agents`    | Agent performance   |

---

# 🧠 IMPORTANT API DESIGN INSIGHTS

---

# Why PATCH?

For updates:

```text id="jlwm25"
PATCH /products/{id}
```

is usually better than:

```text id="jlwm26"
PUT /products/{id}
```

Because:

* partial updates
* less payload
* safer evolution

Production systems commonly prefer PATCH.

---

# Why Nested Status Endpoints?

Good:

```text id="jlwm27"
/orders/{id}/status
```

Because:

* expresses state transition
* clearer business meaning

Better than:

```text id="jlwm28"
/updateOrderStatus
```

---

# Why /search?

Because:

```text id="jlwm29"
/products
```

should remain:

* simple list endpoint

while:

```text id="jlwm30"
/products/search
```

can evolve independently.

---

# 🧱 YOUR MOST IMPORTANT APIs

Operationally:

---

# CORE FLOW

```text id="jlwm31"
POST /orders
↓
POST /inventory/{id}/reserve
↓
PATCH /shipments/{id}/dispatch
```

This is your business backbone.

---

# 🔥 REAL PRODUCTION RECOMMENDATION

Eventually add:

---

# Pagination

```text id="jlwm32"
/products?page=1&size=20
```

---

# Sorting

```text id="jlwm33"
/orders?sort=createdAt,desc
```

---

# Filtering

```text id="jlwm34"
/orders?status=PENDING
```

---

# Versioning

Already included:

```text id="jlwm35"
/api/v1/
```

VERY GOOD PRACTICE.

---

# 🧠 FINAL IMPORTANT INSIGHT

Your REST API structure now mirrors:

* business domains
* vertical slices
* RBAC boundaries
* operational workflows

That is exactly how enterprise systems are designed.


## API LIST -- V1


|      || **IDENTITY SLICE**                                                                                                      |||
|---|---|---|---|---|
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [x]  | POST   | [`/api/v1/auth/login`](https://merkado.tech-labs.dev/identity/login)                                                    | Login               | Authenticate user and issue JWT token |
| [ ]  | POST   | [`/api/v1/auth/refresh`](https://merkado.tech-labs.dev/api/v1/auth/refresh)                                             | Refresh Token       | Refresh access token                  |
| [ ]  | POST   | [`/api/v1/auth/logout`](https://merkado.tech-labs.dev/api/v1/auth/logout)                                               | Logout              | Invalidate session/token              |
| [x]  | GET    | [`/api/v1/auth/me`](https://merkado.tech-labs.dev/identity/me)                                                          | Current User        | Get authenticated user profile        |
|---|---|---|---|---|
| [ ]  | GET    | [`/api/v1/users`](https://merkado.tech-labs.dev/api/v1/users)                                                           | Read Users          | List all users                        |
| [ ]  | GET    | [`/api/v1/users/{id}`](https://merkado.tech-labs.dev/api/v1/users/{id})                                                 | Read User           | Get user details                      |
| [ ]  | POST   | [`/api/v1/users`](https://merkado.tech-labs.dev/api/v1/users)                                                           | Create User         | Create new user                       |
| [ ]  | PATCH  | [`/api/v1/users/{id}`](https://merkado.tech-labs.dev/api/v1/users/{id})                                                 | Update User         | Update user information               |
| [ ]  | DELETE | [`/api/v1/users/{id}`](https://merkado.tech-labs.dev/api/v1/users/{id})                                                 | Delete/Disable User | Disable or archive user               |
|---|---|---|---|---|
| [ ]  | GET | [`/api/v1/roles`](https://merkado.tech-labs.dev/api/v1/roles)                                                           | Read Roles | List available roles |
| [ ]  | GET | [`/api/v1/roles/{id}`](https://merkado.tech-labs.dev/api/v1/roles/{id})                                                 | Read Role | Get role details |
| [ ]  | POST | [`/api/v1/roles`](https://merkado.tech-labs.dev/api/v1/roles)                                                           | Create Role | Create role |
| [ ]  | PATCH | [`/api/v1/roles/{id}`](https://merkado.tech-labs.dev/api/v1/roles/{id})                                                 | Update Role | Update role |
| [ ]  | DELETE | [`/api/v1/roles/{id}`](https://merkado.tech-labs.dev/api/v1/roles/{id})                                                 | Delete Role | Archive/delete role |
|---|---|---|---|---|
| [ ]  | GET | [`/api/v1/permissions`](https://merkado.tech-labs.dev/api/v1/permissions)                                               | Read Permissions | List permissions |
| [ ]  | POST | [`/api/v1/permissions`](https://merkado.tech-labs.dev/api/v1/permissions)                                               | Create Permission | Create permission |
| [ ]  | PATCH | [`/api/v1/permissions/{id}`](https://merkado.tech-labs.dev/api/v1/permissions/{id})                                     | Update Permission | Update permission |
| [ ]  | DELETE | [`/api/v1/permissions/{id}`](https://merkado.tech-labs.dev/api/v1/permissions/{id})                                     | Delete Permission | Remove permission |
|---|---|---|---|---|
| [ ]  | POST | [`/api/v1/users/{id}/roles`](https://merkado.tech-labs.dev/api/v1/users/{id}/roles)                                     | Assign Role | Assign role to user |
| [ ]  | DELETE | [`/api/v1/users/{id}/roles/{roleId}`](https://merkado.tech-labs.dev/api/v1/users/{id}/roles/{roleId})                   | Remove Role | Remove role from user |
|---|---|---|---|---|
|      || **CATALOG SLICE**                                                                                                       |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ]  | GET | [`/api/v1/products`](https://merkado.tech-labs.dev/api/v1/products)                                                     | Read Products | List products |
| [ ]  | GET | [`/api/v1/products/{id}`](https://merkado.tech-labs.dev/api/v1/products/{id})                                           | Read Product | Get product details |
| [ ]  | POST | [`/api/v1/products`](https://merkado.tech-labs.dev/api/v1/products)                                                     | Create Product | Create product |
| [ ]  | PATCH | [`/api/v1/products/{id}`](https://merkado.tech-labs.dev/api/v1/products/{id})                                           | Update Product | Update product |
| [ ]  | DELETE | [`/api/v1/products/{id}`](https://merkado.tech-labs.dev/api/v1/products/{id})                                           | Delete Product | Archive/delete product |
|---|---|---|---|---|
| [ ]  | GET | [`/api/v1/products/search`](https://merkado.tech-labs.dev/api/v1/products/search)                                       | Search Products | Search by SKU/name/category |
|---|---|---|---|---|
| [ ]  | GET | [`/api/v1/categories`](https://merkado.tech-labs.dev/api/v1/categories)                                                 | Read Categories | List categories |
| [ ]  | GET | [`/api/v1/categories/{id}`](https://merkado.tech-labs.dev/api/v1/categories/{id})                                       | Read Category | Get category details |
| [ ]  | POST | [`/api/v1/categories`](https://merkado.tech-labs.dev/api/v1/categories)                                                 | Create Category | Create category |
| [ ]  | PATCH | [`/api/v1/categories/{id}`](https://merkado.tech-labs.dev/api/v1/categories/{id})                                       | Update Category | Update category |
| [ ]  | DELETE | [`/api/v1/categories/{id}`](https://merkado.tech-labs.dev/api/v1/categories/{id})                                       | Delete Category | Archive/delete category |
|---|---|---|---|---|
| [ ]  | GET | [`/api/v1/product-variants`](https://merkado.tech-labs.dev/api/v1/product-variants)                                     | Read Variants | List product variants |
| [ ]  | POST | [`/api/v1/product-variants`](https://merkado.tech-labs.dev/api/v1/product-variants)                                     | Create Variant | Create product variant |
| [ ]  | PATCH | [`/api/v1/product-variants/{id}`](https://merkado.tech-labs.dev/api/v1/product-variants/{id})                           | Update Variant | Update product variant |
| [ ]  | DELETE | [`/api/v1/product-variants/{id}`](https://merkado.tech-labs.dev/api/v1/product-variants/{id})                           | Delete Variant | Delete variant |
|---|---|---|---|---|
|      || **INVENTORY SLICE**                                                                                                     |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ]  | GET | [`/api/v1/inventory`](https://merkado.tech-labs.dev/api/v1/inventory)                                                   | Read Inventory | List inventory stock |
| [ ]  | GET | [`/api/v1/inventory/{productId}`](https://merkado.tech-labs.dev/api/v1/inventory/{productId})                           | Read Stock | Get stock by product |
| [ ]  | PATCH | [`/api/v1/inventory/{productId}/adjust`](https://merkado.tech-labs.dev/api/v1/inventory/{productId}/adjust)             | Adjust Inventory | Increase/decrease inventory |
| [ ]  | POST | [`/api/v1/inventory/{productId}/reserve`](https://merkado.tech-labs.dev/api/v1/inventory/{productId}/reserve)           | Reserve Stock | Reserve inventory for order |
| [ ]  | POST | [`/api/v1/inventory/{productId}/release`](https://merkado.tech-labs.dev/api/v1/inventory/{productId}/release)           | Release Reservation | Release reserved stock |
| [ ]  | POST | [`/api/v1/inventory/{productId}/deduct`](https://merkado.tech-labs.dev/api/v1/inventory/{productId}/deduct)             | Deduct Stock | Deduct confirmed stock |
|---|---|---|---|---|
| [ ]  | GET | [`/api/v1/stock-movements`](https://merkado.tech-labs.dev/api/v1/stock-movements)                                       | Read Movements | View inventory movement history |
| [ ]  | GET | [`/api/v1/stock-movements/{id}`](https://merkado.tech-labs.dev/api/v1/stock-movements/{id})                             | Read Movement | View stock movement details |
|---|---|---|---|---|
| [ ]  | GET | [`/api/v1/reservations`](https://merkado.tech-labs.dev/api/v1/reservations)                                             | Read Reservations | List stock reservations |
| [ ]  | GET | [`/api/v1/reservations/{id}`](https://merkado.tech-labs.dev/api/v1/reservations/{id})                                   | Read Reservation | Get reservation details |
| [ ]  | POST | [`/api/v1/reservations`](https://merkado.tech-labs.dev/api/v1/reservations)                                             | Create Reservation | Create stock reservation |
| [ ]  | PATCH | [`/api/v1/reservations/{id}/release`](https://merkado.tech-labs.dev/api/v1/reservations/{id}/release)                   | Release Reservation | Release reservation |
| [ ]  | PATCH | [`/api/v1/reservations/{id}/confirm`](https://merkado.tech-labs.dev/api/v1/reservations/{id}/confirm)                   | Confirm Reservation | Confirm reservation |
|---|---|---|---|---|
|      || **ORDERS SLICE**                                                                                                        |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ]  | GET | [`/api/v1/orders`](https://merkado.tech-labs.dev/api/v1/orders)                                                         | Read Orders | List orders |
| [ ]  | GET | [`/api/v1/orders/{id}`](https://merkado.tech-labs.dev/api/v1/orders/{id})                                               | Read Order | Get order details |
| [ ]  | POST | [`/api/v1/orders`](https://merkado.tech-labs.dev/api/v1/orders)                                                         | Create Order | Create order |
| [ ]  | PATCH | [`/api/v1/orders/{id}`](https://merkado.tech-labs.dev/api/v1/orders/{id})                                               | Update Order | Update order |
| [ ]  | DELETE | [`/api/v1/orders/{id}`](https://merkado.tech-labs.dev/api/v1/orders/{id})                                               | Cancel Order | Cancel/delete order |
|---|---|---|---|---|
| [ ]  | PATCH | [`/api/v1/orders/{id}/status`](https://merkado.tech-labs.dev/api/v1/orders/{id}/status)                                 | Update Status | Update order status |
| [ ]  | PATCH | [`/api/v1/orders/{id}/cancel`](https://merkado.tech-labs.dev/api/v1/orders/{id}/cancel)                                 | Cancel Order | Cancel order |
| [ ]  | PATCH | [`/api/v1/orders/{id}/complete`](https://merkado.tech-labs.dev/api/v1/orders/{id}/complete)                             | Complete Order | Complete order |
|---|---|---|---|---|
| [ ]  | POST | [`/api/v1/orders/{id}/discounts`](https://merkado.tech-labs.dev/api/v1/orders/{id}/discounts)                           | Apply Discount | Apply discount to order |
| [ ]  | DELETE | [`/api/v1/orders/{id}/discounts/{discountId}`](https://merkado.tech-labs.dev/api/v1/orders/{id}/discounts/{discountId}) | Remove Discount | Remove discount from order |
|---|---|---|---|---|
| [ ]  | GET | [`/api/v1/orders/{id}/items`](https://merkado.tech-labs.dev/api/v1/orders/{id}/items)                                   | Read Order Items | List order items |
| [ ]  | POST | [`/api/v1/orders/{id}/items`](https://merkado.tech-labs.dev/api/v1/orders/{id}/items)                                   | Add Order Item | Add item to order |
| [ ]  | PATCH | [`/api/v1/orders/{id}/items/{itemId}`](https://merkado.tech-labs.dev/api/v1/orders/{id}/items/{itemId})                 | Update Order Item | Update order item |
| [ ]  | DELETE | [`/api/v1/orders/{id}/items/{itemId}`](https://merkado.tech-labs.dev/api/v1/orders/{id}/items/{itemId})                 | Remove Order Item | Remove order item |
|---|---|---|---|---|
|      || **CLIENTS SLICE**                                                                                                       |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ]  | GET | [`/api/v1/clients`](https://merkado.tech-labs.dev/api/v1/clients)                                                       | Read Clients | List clients |
| [ ]  | GET | [`/api/v1/clients/{id}`](https://merkado.tech-labs.dev/api/v1/clients/{id})                                             | Read Client | Get client details |
| [ ]  | POST | [`/api/v1/clients`](https://merkado.tech-labs.dev/api/v1/clients)                                                       | Create Client | Create client |
| [ ]  | PATCH | [`/api/v1/clients/{id}`](https://merkado.tech-labs.dev/api/v1/clients/{id})                                             | Update Client | Update client |
| [ ]  | DELETE | [`/api/v1/clients/{id}`](https://merkado.tech-labs.dev/api/v1/clients/{id})                                             | Delete Client | Archive/delete client |
|---|---|---|---|---|
| [ ]  | GET | [`/api/v1/clients/search`](https://merkado.tech-labs.dev/api/v1/clients/search)                                         | Search Clients | Search clients |
|---|---|---|---|---|
| [ ]  | GET | [`/api/v1/clients/{id}/orders`](https://merkado.tech-labs.dev/api/v1/clients/{id}/orders)                               | Read Client Orders | View client orders |
| [ ]  | GET | [`/api/v1/clients/{id}/addresses`](https://merkado.tech-labs.dev/api/v1/clients/{id}/addresses)                         | Read Addresses | View client addresses |
| [ ]  | POST | [`/api/v1/clients/{id}/addresses`](https://merkado.tech-labs.dev/api/v1/clients/{id}/addresses)                         | Create Address | Add client address |
| [ ]  | PATCH | [`/api/v1/clients/{id}/addresses/{addressId}`](https://merkado.tech-labs.dev/api/v1/clients/{id}/addresses/{addressId}) | Update Address | Update address |
| [ ]  | DELETE | [`/api/v1/clients/{id}/addresses/{addressId}`](https://merkado.tech-labs.dev/api/v1/clients/{id}/addresses/{addressId}) | Delete Address | Remove address |
|---|---|---|---|---|
|      || **WAREHOUSE SLICE**                                                                                                     |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ]  | GET | [`/api/v1/shipments`](https://merkado.tech-labs.dev/api/v1/shipments)                                                   | Read Shipments | List shipments |
| [ ]  | GET | [`/api/v1/shipments/{id}`](https://merkado.tech-labs.dev/api/v1/shipments/{id})                                         | Read Shipment | Get shipment details |
|---|---|---|---|---|
| [ ]  | PATCH | [`/api/v1/shipments/{id}/pack`](https://merkado.tech-labs.dev/api/v1/shipments/{id}/pack)                               | Pack Shipment | Mark shipment packed |
| [ ]  | PATCH | [`/api/v1/shipments/{id}/dispatch`](https://merkado.tech-labs.dev/api/v1/shipments/{id}/dispatch)                       | Dispatch Shipment | Mark shipment dispatched |
| [ ]  | GET | [`/api/v1/waybills/{shipmentId}`](https://merkado.tech-labs.dev/api/v1/waybills/{shipmentId})                           | Read Waybill | Generate/view waybill |
| [ ]  | POST | [`/api/v1/waybills/{shipmentId}/print`](https://merkado.tech-labs.dev/api/v1/waybills/{shipmentId}/print)               | Print Waybill | Print waybill |
|---|---|---|---|---|
| [ ]  | GET | [`/api/v1/fulfillment-events`](https://merkado.tech-labs.dev/api/v1/fulfillment-events)                                 | Read Fulfillment | View fulfillment history |
|---|---|---|---|---|
|      || **PRICING SLICE**                                                                                                       |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ]  | GET | [`/api/v1/pricing`](https://merkado.tech-labs.dev/api/v1/pricing)                                                       | Read Pricing | List pricing rules |
| [ ]  | GET | [`/api/v1/pricing/{productId}`](https://merkado.tech-labs.dev/api/v1/pricing/{productId})                               | Read Product Pricing | Get product pricing |
| [ ]  | PATCH | [`/api/v1/pricing/{productId}`](https://merkado.tech-labs.dev/api/v1/pricing/{productId})                               | Update Pricing | Update product pricing |
|---|---|---|---|---|
| [ ]  | GET | [`/api/v1/discount-bands`](https://merkado.tech-labs.dev/api/v1/discount-bands)                                         | Read Discount Bands | List discount bands |
| [ ]  | GET | [`/api/v1/discount-bands/{id}`](https://merkado.tech-labs.dev/api/v1/discount-bands/{id})                               | Read Discount Band | Get discount band |
| [ ]  | POST | [`/api/v1/discount-bands`](https://merkado.tech-labs.dev/api/v1/discount-bands)                                         | Create Discount Band | Create discount band |
| [ ]  | PATCH | [`/api/v1/discount-bands/{id}`](https://merkado.tech-labs.dev/api/v1/discount-bands/{id})                               | Update Discount Band | Update discount band |
| [ ]  | DELETE | [`/api/v1/discount-bands/{id}`](https://merkado.tech-labs.dev/api/v1/discount-bands/{id})                               | Delete Discount Band | Archive/delete discount band |
|---|---|---|---|---|
| [ ]  | GET | [`/api/v1/promotions`](https://merkado.tech-labs.dev/api/v1/promotions)                                                 | Read Promotions | List promotions |
| [ ]  | POST | [`/api/v1/promotions`](https://merkado.tech-labs.dev/api/v1/promotions)                                                 | Create Promotion | Create promotion |
| [ ]  | PATCH | [`/api/v1/promotions/{id}`](https://merkado.tech-labs.dev/api/v1/promotions/{id})                                       | Update Promotion | Update promotion |
| [ ]  | DELETE | [`/api/v1/promotions/{id}`](https://merkado.tech-labs.dev/api/v1/promotions/{id})                                       | Delete Promotion | Delete promotion |
|---|---|---|---|---|
|      |  | **COMMISSION SLICE**                                                                                                    |  |  |
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ]  | GET | [`/api/v1/commissions`](https://merkado.tech-labs.dev/api/v1/commissions)                                               | Read Commissions | List commissions |
| [ ]  | GET | [`/api/v1/commissions/{id}`](https://merkado.tech-labs.dev/api/v1/commissions/{id})                                     | Read Commission | Get commission details |
| [ ]  | GET | [`/api/v1/commissions/agents/{agentId}`](https://merkado.tech-labs.dev/api/v1/commissions/agents/{agentId})             | Agent Commissions | View agent commissions |
|---|---|---|---|---|
| [ ]  | GET | [`/api/v1/commission-rules`](https://merkado.tech-labs.dev/api/v1/commission-rules)                                     | Read Rules | List commission rules |
| [ ]  | POST | [`/api/v1/commission-rules`](https://merkado.tech-labs.dev/api/v1/commission-rules)                                     | Create Rule | Create commission rule |
| [ ]  | PATCH | [`/api/v1/commission-rules/{id}`](https://merkado.tech-labs.dev/api/v1/commission-rules/{id})                           | Update Rule | Update commission rule |
| [ ]  | DELETE | [`/api/v1/commission-rules/{id}`](https://merkado.tech-labs.dev/api/v1/commission-rules/{id})                           | Delete Rule | Delete commission rule |
|---|---|---|---|---|
|      |  | **ANALYTICS SLICE**                                                                                                     |  |  |
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ]  | GET | [`/api/v1/analytics/sales`](https://merkado.tech-labs.dev/api/v1/analytics/sales)                                       | Sales Analytics | View sales analytics |
| [ ]  | GET | [`/api/v1/analytics/inventory`](https://merkado.tech-labs.dev/api/v1/analytics/inventory)                               | Inventory Analytics | View inventory analytics |
| [ ]  | GET | [`/api/v1/analytics/orders`](https://merkado.tech-labs.dev/api/v1/analytics/orders)                                     | Order Analytics | View order analytics |
| [ ]  | GET | [`/api/v1/analytics/agents`](https://merkado.tech-labs.dev/api/v1/analytics/agents)                                     | Agent Analytics | View agent performance |
| [ ]  | GET | [`/api/v1/analytics/revenue`](https://merkado.tech-labs.dev/api/v1/analytics/revenue)                                   | Revenue Analytics | View revenue metrics |
| [ ]  | GET | [`/api/v1/analytics/top-products`](https://merkado.tech-labs.dev/api/v1/analytics/top-products)                         | Top Products | View best-selling products |
|---|---|---|---|---|
|      |  | **SYSTEM / HEALTH / OPERATIONS**                                                                                        |  |  |
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ]  | GET | [`/api/v1/health`](https://merkado.tech-labs.dev/api/v1/health)                                                         | Health Check | System health endpoint |
| [ ]  | GET | [`/api/v1/version`](https://merkado.tech-labs.dev/api/v1/version)                                                       | Version Info | API version information |
| [ ]  | GET | [`/api/v1/audit-logs`](https://merkado.tech-labs.dev/api/v1/audit-logs)                                                 | Read Audit Logs | View audit logs |
| [ ]  | GET | [`/api/v1/system/status`](https://merkado.tech-labs.dev/api/v1/system/status)                                           | System Status | System operational status |


## API LIST -- V2 with shopping cart

||| **IDENTITY SLICE** |||
|---|---|---|---|---|
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ] | POST | [`/api/v1/auth/login`](https://merkado.tech-labs.dev/api/v1/auth/login) | Login | Authenticate user and issue JWT token |
| [ ] | POST | [`/api/v1/auth/refresh`](https://merkado.tech-labs.dev/api/v1/auth/refresh) | Refresh Token | Refresh access token |
| [ ] | POST | [`/api/v1/auth/logout`](https://merkado.tech-labs.dev/api/v1/auth/logout) | Logout | Invalidate session/token |
| [ ] | GET | [`/api/v1/auth/me`](https://merkado.tech-labs.dev/api/v1/auth/me) | Current User | Get authenticated user profile |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/users`](https://merkado.tech-labs.dev/api/v1/users) | Read Users | List users |
| [ ] | GET | [`/api/v1/users/{id}`](https://merkado.tech-labs.dev/api/v1/users/{id}) | Read User | Get user details |
| [ ] | POST | [`/api/v1/users`](https://merkado.tech-labs.dev/api/v1/users) | Create User | Create user |
| [ ] | PATCH | [`/api/v1/users/{id}`](https://merkado.tech-labs.dev/api/v1/users/{id}) | Update User | Update user |
| [ ] | DELETE | [`/api/v1/users/{id}`](https://merkado.tech-labs.dev/api/v1/users/{id}) | Delete User | Disable/archive user |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/roles`](https://merkado.tech-labs.dev/api/v1/roles) | Read Roles | List roles |
| [ ] | GET | [`/api/v1/roles/{id}`](https://merkado.tech-labs.dev/api/v1/roles/{id}) | Read Role | Get role details |
| [ ] | POST | [`/api/v1/roles`](https://merkado.tech-labs.dev/api/v1/roles) | Create Role | Create role |
| [ ] | PATCH | [`/api/v1/roles/{id}`](https://merkado.tech-labs.dev/api/v1/roles/{id}) | Update Role | Update role |
| [ ] | DELETE | [`/api/v1/roles/{id}`](https://merkado.tech-labs.dev/api/v1/roles/{id}) | Delete Role | Delete/archive role |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/permissions`](https://merkado.tech-labs.dev/api/v1/permissions) | Read Permissions | List permissions |
| [ ] | POST | [`/api/v1/permissions`](https://merkado.tech-labs.dev/api/v1/permissions) | Create Permission | Create permission |
| [ ] | PATCH | [`/api/v1/permissions/{id}`](https://merkado.tech-labs.dev/api/v1/permissions/{id}) | Update Permission | Update permission |
| [ ] | DELETE | [`/api/v1/permissions/{id}`](https://merkado.tech-labs.dev/api/v1/permissions/{id}) | Delete Permission | Remove permission |
|---|---|---|---|---|
| [ ] | POST | [`/api/v1/users/{id}/roles`](https://merkado.tech-labs.dev/api/v1/users/{id}/roles) | Assign Role | Assign role to user |
| [ ] | DELETE | [`/api/v1/users/{id}/roles/{roleId}`](https://merkado.tech-labs.dev/api/v1/users/{id}/roles/{roleId}) | Remove Role | Remove role from user |
|---|---|---|---|---|
||| **CATALOG SLICE** |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ] | GET | [`/api/v1/products`](https://merkado.tech-labs.dev/api/v1/products) | Read Products | List products |
| [ ] | GET | [`/api/v1/products/{id}`](https://merkado.tech-labs.dev/api/v1/products/{id}) | Read Product | Get product details |
| [ ] | POST | [`/api/v1/products`](https://merkado.tech-labs.dev/api/v1/products) | Create Product | Create product |
| [ ] | PATCH | [`/api/v1/products/{id}`](https://merkado.tech-labs.dev/api/v1/products/{id}) | Update Product | Update product |
| [ ] | DELETE | [`/api/v1/products/{id}`](https://merkado.tech-labs.dev/api/v1/products/{id}) | Delete Product | Archive/delete product |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/products/search`](https://merkado.tech-labs.dev/api/v1/products/search) | Search Products | Search by SKU/name/category |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/categories`](https://merkado.tech-labs.dev/api/v1/categories) | Read Categories | List categories |
| [ ] | GET | [`/api/v1/categories/{id}`](https://merkado.tech-labs.dev/api/v1/categories/{id}) | Read Category | Get category details |
| [ ] | POST | [`/api/v1/categories`](https://merkado.tech-labs.dev/api/v1/categories) | Create Category | Create category |
| [ ] | PATCH | [`/api/v1/categories/{id}`](https://merkado.tech-labs.dev/api/v1/categories/{id}) | Update Category | Update category |
| [ ] | DELETE | [`/api/v1/categories/{id}`](https://merkado.tech-labs.dev/api/v1/categories/{id}) | Delete Category | Archive/delete category |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/product-variants`](https://merkado.tech-labs.dev/api/v1/product-variants) | Read Variants | List variants |
| [ ] | POST | [`/api/v1/product-variants`](https://merkado.tech-labs.dev/api/v1/product-variants) | Create Variant | Create product variant |
| [ ] | PATCH | [`/api/v1/product-variants/{id}`](https://merkado.tech-labs.dev/api/v1/product-variants/{id}) | Update Variant | Update variant |
| [ ] | DELETE | [`/api/v1/product-variants/{id}`](https://merkado.tech-labs.dev/api/v1/product-variants/{id}) | Delete Variant | Delete variant |
|---|---|---|---|---|
||| **INVENTORY SLICE** |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ] | GET | [`/api/v1/inventory`](https://merkado.tech-labs.dev/api/v1/inventory) | Read Inventory | List inventory |
| [ ] | GET | [`/api/v1/inventory/{productId}`](https://merkado.tech-labs.dev/api/v1/inventory/{productId}) | Read Stock | Get stock by product |
|---|---|---|---|---|
| [ ] | PATCH | [`/api/v1/inventory/{productId}/adjust`](https://merkado.tech-labs.dev/api/v1/inventory/{productId}/adjust) | Adjust Inventory | Increase/decrease stock |
|---|---|---|---|---|
| [ ] | POST | [`/api/v1/inventory/{productId}/reserve`](https://merkado.tech-labs.dev/api/v1/inventory/{productId}/reserve) | Reserve Stock | Reserve inventory |
| [ ] | POST | [`/api/v1/inventory/{productId}/release`](https://merkado.tech-labs.dev/api/v1/inventory/{productId}/release) | Release Reservation | Release reserved stock |
| [ ] | POST | [`/api/v1/inventory/{productId}/deduct`](https://merkado.tech-labs.dev/api/v1/inventory/{productId}/deduct) | Deduct Stock | Deduct confirmed stock |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/stock-movements`](https://merkado.tech-labs.dev/api/v1/stock-movements) | Read Movements | View inventory movement history |
| [ ] | GET | [`/api/v1/stock-movements/{id}`](https://merkado.tech-labs.dev/api/v1/stock-movements/{id}) | Read Movement | View movement details |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/reservations`](https://merkado.tech-labs.dev/api/v1/reservations) | Read Reservations | List reservations |
| [ ] | GET | [`/api/v1/reservations/{id}`](https://merkado.tech-labs.dev/api/v1/reservations/{id}) | Read Reservation | Get reservation details |
|---|---|---|---|---|
| [ ] | POST | [`/api/v1/reservations`](https://merkado.tech-labs.dev/api/v1/reservations) | Create Reservation | Create reservation |
| [ ] | PATCH | [`/api/v1/reservations/{id}/confirm`](https://merkado.tech-labs.dev/api/v1/reservations/{id}/confirm) | Confirm Reservation | Confirm reservation |
| [ ] | PATCH | [`/api/v1/reservations/{id}/release`](https://merkado.tech-labs.dev/api/v1/reservations/{id}/release) | Release Reservation | Release reservation |
| [ ] | PATCH | [`/api/v1/reservations/{id}/expire`](https://merkado.tech-labs.dev/api/v1/reservations/{id}/expire) | Expire Reservation | Expire reservation |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/reservations/{id}/status`](https://merkado.tech-labs.dev/api/v1/reservations/{id}/status) | Reservation Status | View reservation status |
|---|---|---|---|---|
||| **CARTS SLICE** |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ] | GET | [`/api/v1/carts`](https://merkado.tech-labs.dev/api/v1/carts) | Read Carts | List carts |
| [ ] | GET | [`/api/v1/carts/{id}`](https://merkado.tech-labs.dev/api/v1/carts/{id}) | Read Cart | Get cart details |
|---|---|---|---|---|
| [ ] | POST | [`/api/v1/carts`](https://merkado.tech-labs.dev/api/v1/carts) | Create Cart | Create shopping cart |
| [ ] | DELETE | [`/api/v1/carts/{id}`](https://merkado.tech-labs.dev/api/v1/carts/{id}) | Delete Cart | Delete/abandon cart |
|---|---|---|---|---|
| [ ] | PATCH | [`/api/v1/carts/{id}/expire`](https://merkado.tech-labs.dev/api/v1/carts/{id}/expire) | Expire Cart | Expire cart session |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/carts/{id}/items`](https://merkado.tech-labs.dev/api/v1/carts/{id}/items) | Read Cart Items | List cart items |
|---|---|---|---|---|
| [ ] | POST | [`/api/v1/carts/{id}/items`](https://merkado.tech-labs.dev/api/v1/carts/{id}/items) | Add Cart Item | Add item to cart |
| [ ] | PATCH | [`/api/v1/carts/{id}/items/{itemId}`](https://merkado.tech-labs.dev/api/v1/carts/{id}/items/{itemId}) | Update Cart Item | Update quantity |
| [ ] | DELETE | [`/api/v1/carts/{id}/items/{itemId}`](https://merkado.tech-labs.dev/api/v1/carts/{id}/items/{itemId}) | Remove Cart Item | Remove item from cart |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/carts/{id}/summary`](https://merkado.tech-labs.dev/api/v1/carts/{id}/summary) | Cart Summary | View totals/pricing |
|---|---|---|---|---|
| [ ] | POST | [`/api/v1/carts/{id}/validate`](https://merkado.tech-labs.dev/api/v1/carts/{id}/validate) | Validate Cart | Validate inventory/pricing |
|---|---|---|---|---|
| [ ] | POST | [`/api/v1/carts/{id}/checkout`](https://merkado.tech-labs.dev/api/v1/carts/{id}/checkout) | Checkout Cart | Convert cart into order |
|---|---|---|---|---|
| [ ] | POST | [`/api/v1/carts/{id}/discounts`](https://merkado.tech-labs.dev/api/v1/carts/{id}/discounts) | Apply Cart Discount | Apply discount to cart |
| [ ] | DELETE | [`/api/v1/carts/{id}/discounts/{discountId}`](https://merkado.tech-labs.dev/api/v1/carts/{id}/discounts/{discountId}) | Remove Cart Discount | Remove cart discount |
|---|---|---|---|---|
||| **ORDERS SLICE** |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ] | GET | [`/api/v1/orders`](https://merkado.tech-labs.dev/api/v1/orders) | Read Orders | List orders |
| [ ] | GET | [`/api/v1/orders/{id}`](https://merkado.tech-labs.dev/api/v1/orders/{id}) | Read Order | Get order details |
|---|---|---|---|---|
| [ ] | POST | [`/api/v1/orders`](https://merkado.tech-labs.dev/api/v1/orders) | Create Order | Create manual/direct order |
|---|---|---|---|---|
| [ ] | PATCH | [`/api/v1/orders/{id}`](https://merkado.tech-labs.dev/api/v1/orders/{id}) | Update Order | Update order |
| [ ] | DELETE | [`/api/v1/orders/{id}`](https://merkado.tech-labs.dev/api/v1/orders/{id}) | Cancel Order | Cancel/delete order |
|---|---|---|---|---|
| [ ] | PATCH | [`/api/v1/orders/{id}/status`](https://merkado.tech-labs.dev/api/v1/orders/{id}/status) | Update Status | Update order status |
|---|---|---|---|---|
| [ ] | PATCH | [`/api/v1/orders/{id}/cancel`](https://merkado.tech-labs.dev/api/v1/orders/{id}/cancel) | Cancel Order | Cancel order |
| [ ] | PATCH | [`/api/v1/orders/{id}/complete`](https://merkado.tech-labs.dev/api/v1/orders/{id}/complete) | Complete Order | Complete order |
| [ ] | PATCH | [`/api/v1/orders/{id}/fail`](https://merkado.tech-labs.dev/api/v1/orders/{id}/fail) | Fail Order | Mark order failed |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/orders/{id}/items`](https://merkado.tech-labs.dev/api/v1/orders/{id}/items) | Read Order Items | List order items |
|---|---|---|---|---|
| [ ] | POST | [`/api/v1/orders/{id}/items`](https://merkado.tech-labs.dev/api/v1/orders/{id}/items) | Add Order Item | Add order item |
| [ ] | PATCH | [`/api/v1/orders/{id}/items/{itemId}`](https://merkado.tech-labs.dev/api/v1/orders/{id}/items/{itemId}) | Update Order Item | Update order item |
| [ ] | DELETE | [`/api/v1/orders/{id}/items/{itemId}`](https://merkado.tech-labs.dev/api/v1/orders/{id}/items/{itemId}) | Remove Order Item | Remove order item |
|---|---|---|---|---|
| [ ] | POST | [`/api/v1/orders/{id}/discounts`](https://merkado.tech-labs.dev/api/v1/orders/{id}/discounts) | Apply Discount | Apply discount |
| [ ] | DELETE | [`/api/v1/orders/{id}/discounts/{discountId}`](https://merkado.tech-labs.dev/api/v1/orders/{id}/discounts/{discountId}) | Remove Discount | Remove discount |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/orders/{id}/history`](https://merkado.tech-labs.dev/api/v1/orders/{id}/history) | Order History | View status history |
|---|---|---|---|---|
||| **CLIENTS SLICE** |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ] | GET | [`/api/v1/clients`](https://merkado.tech-labs.dev/api/v1/clients) | Read Clients | List clients |
| [ ] | GET | [`/api/v1/clients/{id}`](https://merkado.tech-labs.dev/api/v1/clients/{id}) | Read Client | Get client details |
|---|---|---|---|---|
| [ ] | POST | [`/api/v1/clients`](https://merkado.tech-labs.dev/api/v1/clients) | Create Client | Create client |
| [ ] | PATCH | [`/api/v1/clients/{id}`](https://merkado.tech-labs.dev/api/v1/clients/{id}) | Update Client | Update client |
| [ ] | DELETE | [`/api/v1/clients/{id}`](https://merkado.tech-labs.dev/api/v1/clients/{id}) | Delete Client | Archive/delete client |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/clients/search`](https://merkado.tech-labs.dev/api/v1/clients/search) | Search Clients | Search clients |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/clients/{id}/orders`](https://merkado.tech-labs.dev/api/v1/clients/{id}/orders) | Read Client Orders | View client orders |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/clients/{id}/addresses`](https://merkado.tech-labs.dev/api/v1/clients/{id}/addresses) | Read Addresses | View addresses |
| [ ] | POST | [`/api/v1/clients/{id}/addresses`](https://merkado.tech-labs.dev/api/v1/clients/{id}/addresses) | Create Address | Add address |
| [ ] | PATCH | [`/api/v1/clients/{id}/addresses/{addressId}`](https://merkado.tech-labs.dev/api/v1/clients/{id}/addresses/{addressId}) | Update Address | Update address |
| [ ] | DELETE | [`/api/v1/clients/{id}/addresses/{addressId}`](https://merkado.tech-labs.dev/api/v1/clients/{id}/addresses/{addressId}) | Delete Address | Remove address |
|---|---|---|---|---|
||| **WAREHOUSE SLICE** |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ] | GET | [`/api/v1/shipments`](https://merkado.tech-labs.dev/api/v1/shipments) | Read Shipments | List shipments |
| [ ] | GET | [`/api/v1/shipments/{id}`](https://merkado.tech-labs.dev/api/v1/shipments/{id}) | Read Shipment | Get shipment details |
|---|---|---|---|---|
| [ ] | PATCH | [`/api/v1/shipments/{id}/pack`](https://merkado.tech-labs.dev/api/v1/shipments/{id}/pack) | Pack Shipment | Mark packed |
| [ ] | PATCH | [`/api/v1/shipments/{id}/dispatch`](https://merkado.tech-labs.dev/api/v1/shipments/{id}/dispatch) | Dispatch Shipment | Mark dispatched |
| [ ] | PATCH | [`/api/v1/shipments/{id}/deliver`](https://merkado.tech-labs.dev/api/v1/shipments/{id}/deliver) | Deliver Shipment | Mark delivered |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/waybills/{shipmentId}`](https://merkado.tech-labs.dev/api/v1/waybills/{shipmentId}) | Read Waybill | Generate/view waybill |
| [ ] | POST | [`/api/v1/waybills/{shipmentId}/print`](https://merkado.tech-labs.dev/api/v1/waybills/{shipmentId}/print) | Print Waybill | Print waybill |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/fulfillment-events`](https://merkado.tech-labs.dev/api/v1/fulfillment-events) | Read Fulfillment | View fulfillment history |
|---|---|---|---|---|
||| **PRICING SLICE** |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ] | GET | [`/api/v1/pricing`](https://merkado.tech-labs.dev/api/v1/pricing) | Read Pricing | List pricing rules |
| [ ] | GET | [`/api/v1/pricing/{productId}`](https://merkado.tech-labs.dev/api/v1/pricing/{productId}) | Read Product Pricing | Get pricing |
|---|---|---|---|---|
| [ ] | PATCH | [`/api/v1/pricing/{productId}`](https://merkado.tech-labs.dev/api/v1/pricing/{productId}) | Update Pricing | Update pricing |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/discount-bands`](https://merkado.tech-labs.dev/api/v1/discount-bands) | Read Discount Bands | List discount bands |
| [ ] | GET | [`/api/v1/discount-bands/{id}`](https://merkado.tech-labs.dev/api/v1/discount-bands/{id}) | Read Discount Band | Get discount band |
|---|---|---|---|---|
| [ ] | POST | [`/api/v1/discount-bands`](https://merkado.tech-labs.dev/api/v1/discount-bands) | Create Discount Band | Create discount band |
| [ ] | PATCH | [`/api/v1/discount-bands/{id}`](https://merkado.tech-labs.dev/api/v1/discount-bands/{id}) | Update Discount Band | Update discount band |
| [ ] | DELETE | [`/api/v1/discount-bands/{id}`](https://merkado.tech-labs.dev/api/v1/discount-bands/{id}) | Delete Discount Band | Delete/archive discount band |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/promotions`](https://merkado.tech-labs.dev/api/v1/promotions) | Read Promotions | List promotions |
| [ ] | POST | [`/api/v1/promotions`](https://merkado.tech-labs.dev/api/v1/promotions) | Create Promotion | Create promotion |
| [ ] | PATCH | [`/api/v1/promotions/{id}`](https://merkado.tech-labs.dev/api/v1/promotions/{id}) | Update Promotion | Update promotion |
| [ ] | DELETE | [`/api/v1/promotions/{id}`](https://merkado.tech-labs.dev/api/v1/promotions/{id}) | Delete Promotion | Delete promotion |
|---|---|---|---|---|
||| **COMMISSION SLICE** |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ] | GET | [`/api/v1/commissions`](https://merkado.tech-labs.dev/api/v1/commissions) | Read Commissions | List commissions |
| [ ] | GET | [`/api/v1/commissions/{id}`](https://merkado.tech-labs.dev/api/v1/commissions/{id}) | Read Commission | Get commission details |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/commissions/agents/{agentId}`](https://merkado.tech-labs.dev/api/v1/commissions/agents/{agentId}) | Agent Commissions | View agent commissions |
|---|---|---|---|---|
| [ ] | GET | [`/api/v1/commission-rules`](https://merkado.tech-labs.dev/api/v1/commission-rules) | Read Rules | List rules |
| [ ] | POST | [`/api/v1/commission-rules`](https://merkado.tech-labs.dev/api/v1/commission-rules) | Create Rule | Create rule |
| [ ] | PATCH | [`/api/v1/commission-rules/{id}`](https://merkado.tech-labs.dev/api/v1/commission-rules/{id}) | Update Rule | Update rule |
| [ ] | DELETE | [`/api/v1/commission-rules/{id}`](https://merkado.tech-labs.dev/api/v1/commission-rules/{id}) | Delete Rule | Delete rule |
|---|---|---|---|---|
||| **ANALYTICS SLICE** |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ] | GET | [`/api/v1/analytics/sales`](https://merkado.tech-labs.dev/api/v1/analytics/sales) | Sales Analytics | Sales reporting |
| [ ] | GET | [`/api/v1/analytics/inventory`](https://merkado.tech-labs.dev/api/v1/analytics/inventory) | Inventory Analytics | Inventory reporting |
| [ ] | GET | [`/api/v1/analytics/orders`](https://merkado.tech-labs.dev/api/v1/analytics/orders) | Order Analytics | Order reporting |
| [ ] | GET | [`/api/v1/analytics/agents`](https://merkado.tech-labs.dev/api/v1/analytics/agents) | Agent Analytics | Agent performance |
| [ ] | GET | [`/api/v1/analytics/revenue`](https://merkado.tech-labs.dev/api/v1/analytics/revenue) | Revenue Analytics | Revenue metrics |
| [ ] | GET | [`/api/v1/analytics/top-products`](https://merkado.tech-labs.dev/api/v1/analytics/top-products) | Top Products | Best-selling products |
|---|---|---|---|---|
||| **SYSTEM / OPERATIONS** |||
| Status | Method | Endpoint                                                                                                                | Action              | Purpose                               |
| [ ] | GET | [`/api/v1/health`](https://merkado.tech-labs.dev/api/v1/health) | Health Check | System health |
| [ ] | GET | [`/api/v1/version`](https://merkado.tech-labs.dev/api/v1/version) | Version Info | API version |
| [ ] | GET | [`/api/v1/audit-logs`](https://merkado.tech-labs.dev/api/v1/audit-logs) | Read Audit Logs | View audit logs |
| [ ] | GET | [`/api/v1/system/status`](https://merkado.tech-labs.dev/api/v1/system/status) | System Status | Operational status |