import apiClient from "./apiClient";

const data = (request) => request.then((response) => response.data);

export const productsApi = {
  list: (categoryId) =>
    data(
      apiClient.get("/products", { params: categoryId ? { categoryId } : {} }),
    ),
  categoryCounts: () => data(apiClient.get("/products/category-counts")),
  get: (id) => data(apiClient.get(`/products/${id}`)),
  search: (q) => data(apiClient.get("/products/search", { params: { q } })),
  create: (product) => data(apiClient.post("/products", product)),
  update: (id, product) => data(apiClient.patch(`/products/${id}`, product)),
  archive: (id) => data(apiClient.delete(`/products/${id}`)),
  stock: (id, quantity) =>
    data(apiClient.patch(`/products/${id}/stock`, { quantity })),
  addOptionType: (id, optionType) =>
    data(apiClient.post(`/products/${id}/option-types`, optionType)),
  addVariant: (id, variant) =>
    data(apiClient.post(`/products/${id}/variants`, variant)),
  updateVariant: (id, variantId, variant) =>
    data(apiClient.patch(`/products/${id}/variants/${variantId}`, variant)),
  variantStock: (id, variantId, quantity) =>
    data(
      apiClient.patch(`/products/${id}/variants/${variantId}/stock`, {
        quantity,
      }),
    ),
};

export const categoriesApi = {
  list: () => data(apiClient.get("/categories")),
  create: (category) => data(apiClient.post("/categories", category)),
  update: (id, category) =>
    data(apiClient.patch(`/categories/${id}`, category)),
  archive: (id) => data(apiClient.delete(`/categories/${id}`)),
  restore: (id) => data(apiClient.patch(`/categories/${id}/restore`)),
};

export const brandsApi = {
  list: () => data(apiClient.get("/brands")),
  create: (brand) => data(apiClient.post("/brands", brand)),
};

export const channelsApi = {
  list: () => data(apiClient.get("/channels")),
  create: (channel) => data(apiClient.post("/channels", channel)),
};

export const clientsApi = {
  list: () => data(apiClient.get("/clients")),
  get: (id) => data(apiClient.get(`/clients/${id}`)),
  search: (q) => data(apiClient.get("/clients/search", { params: { q } })),
  create: (client) => data(apiClient.post("/clients", client)),
  update: (id, client) => data(apiClient.patch(`/clients/${id}`, client)),
  archive: (id) => data(apiClient.delete(`/clients/${id}`)),
};

export const ordersApi = {
  list: (status) =>
    data(apiClient.get("/orders", { params: status ? { status } : {} })),
  statusCounts: () => data(apiClient.get("/orders/status-counts")),
  get: (id) => data(apiClient.get(`/orders/${id}`)),
  create: (order) => data(apiClient.post("/orders", order)),
  update: (id, order) => data(apiClient.patch(`/orders/${id}`, order)),
  cancel: (id) => data(apiClient.delete(`/orders/${id}`)),
  status: (id, status) =>
    data(apiClient.patch(`/orders/${id}/status`, { status })),
  action: (id, action) => data(apiClient.post(`/orders/${id}/${action}`)),
  fail: (id, reason) => data(apiClient.post(`/orders/${id}/fail`, { reason })),
  history: (id) => data(apiClient.get(`/orders/${id}/history`)),
  addDiscount: (id, discount) =>
    data(apiClient.post(`/orders/${id}/discounts`, discount)),
};

export const analyticsApi = {
  sales: () => data(apiClient.get("/analytics/sales")),
  inventory: () => data(apiClient.get("/analytics/inventory")),
  orders: () => data(apiClient.get("/analytics/orders")),
  revenue: () => data(apiClient.get("/analytics/revenue")),
  topProducts: () => data(apiClient.get("/analytics/top-products")),
};

// Inventory and fulfilment are separate operational resources. Keeping these
// calls explicit makes the UI follow the backend workflow rather than relying
// on catalog-side shortcuts.
export const inventoryApi = {
  list: () => data(apiClient.get("/inventory")),
  get: (productId) => data(apiClient.get(`/inventory/${productId}`)),
  getVariant: (variantId) =>
    data(apiClient.get(`/inventory/variants/${variantId}`)),
  movements: () => data(apiClient.get("/stock-movements")),
  adjust: (productId, quantity, note) =>
    data(apiClient.patch(`/inventory/${productId}/adjust`, { quantity, note })),
  adjustVariant: (variantId, quantity, note) =>
    data(
      apiClient.patch(`/inventory/variants/${variantId}/adjust`, {
        quantity,
        note,
      }),
    ),
  reserve: (productId, quantity, note) =>
    data(apiClient.post(`/inventory/${productId}/reserve`, { quantity, note })),
  reserveVariant: (variantId, quantity, note) =>
    data(
      apiClient.post(`/inventory/variants/${variantId}/reserve`, {
        quantity,
        note,
      }),
    ),
  release: (productId, quantity, note) =>
    data(apiClient.post(`/inventory/${productId}/release`, { quantity, note })),
  releaseVariant: (variantId, quantity, note) =>
    data(
      apiClient.post(`/inventory/variants/${variantId}/release`, {
        quantity,
        note,
      }),
    ),
};

export const warehouseApi = {
  list: () => data(apiClient.get("/shipments")),
  get: (id) => data(apiClient.get(`/shipments/${id}`)),
  pack: (id) => data(apiClient.patch(`/shipments/${id}/pack`)),
  dispatch: (id) => data(apiClient.patch(`/shipments/${id}/dispatch`)),
  deliver: (id) => data(apiClient.patch(`/shipments/${id}/deliver`)),
  waybill: (id) => data(apiClient.get(`/waybills/${id}`)),
  printWaybill: (id) => data(apiClient.post(`/waybills/${id}/print`)),
};

export const pricingApi = {
  list: () => data(apiClient.get("/pricing")),
  update: (productId, price) =>
    data(apiClient.patch(`/pricing/${productId}`, { price })),
  updateVariant: (variantId, price) =>
    data(apiClient.patch(`/pricing/variants/${variantId}`, { price })),
  bands: () => data(apiClient.get("/discount-bands")),
  createBand: (band) => data(apiClient.post("/discount-bands", band)),
  updateBand: (id, band) =>
    data(apiClient.patch(`/discount-bands/${id}`, band)),
};

export const commissionApi = {
  list: () => data(apiClient.get("/commissions")),
  rules: () => data(apiClient.get("/commission-rules")),
  createRule: (rule) => data(apiClient.post("/commission-rules", rule)),
  updateRule: (id, rule) =>
    data(apiClient.patch(`/commission-rules/${id}`, rule)),
};

export const systemApi = {
  auditLogs: () => data(apiClient.get("/audit-logs")),
  status: () => data(apiClient.get("/system/status")),
};

export const identityAdminApi = {
  users: () => data(apiClient.get("/users")),
  createUser: (user) => data(apiClient.post("/users", user)),
  updateUser: (id, user) => data(apiClient.patch(`/users/${id}`, user)),
  disableUser: (id) => data(apiClient.delete(`/users/${id}`)),
  assignRole: (id, roleId) =>
    data(apiClient.post(`/users/${id}/roles`, { roleId })),
  removeRole: (id, roleId) =>
    data(apiClient.delete(`/users/${id}/roles/${roleId}`)),
  roles: () => data(apiClient.get("/roles")),
  createRole: (role) => data(apiClient.post("/roles", role)),
  updateRole: (id, role) => data(apiClient.patch(`/roles/${id}`, role)),
  permissions: () => data(apiClient.get("/permissions")),
  createPermission: (permission) =>
    data(apiClient.post("/permissions", permission)),
};
