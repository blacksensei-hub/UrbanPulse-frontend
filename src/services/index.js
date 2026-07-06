import { api } from './api.js';

export const productService = {
  list: (params) => api.get('/products', { params }).then(r => r.data),
  get:  (slug)   => api.get(`/products/${slug}`).then(r => r.data),
  search:  (q, extra = {}) => api.get('/products/search/q', { params: { q, ...extra } }).then(r => r.data),
  suggest: (q)             => api.get('/products/suggest', { params: { q } }).then(r => r.data),
  social:  (slug)          => api.get(`/products/${slug}/social`).then(r => r.data),
  related: (slug)          => api.get(`/products/${slug}/related`).then(r => r.data),
  byIds:   (ids)           => api.get('/products/by-ids', { params: { ids: ids.join(',') } }).then(r => r.data),
};

export const cartService = {
  get:  () => api.get('/cart').then(r => r.data),
  add:  (variant_id, quantity) => api.post('/cart/items', { variant_id, quantity }).then(r => r.data),
  update: (id, quantity) => api.put(`/cart/items/${id}`, { quantity }).then(r => r.data),
  remove: (id) => api.delete(`/cart/items/${id}`).then(r => r.data),
};

export const orderService = {
  create: (payload) => api.post('/orders', payload).then(r => r.data),
  get:    (id) => api.get(`/orders/${id}`).then(r => r.data),
  mine:   () => api.get('/orders/user/me').then(r => r.data),
  checkout: (order_id, payment_method) => api.post('/checkout/session', { order_id, payment_method }).then(r => r.data),
  verify:   (reference) => api.get(`/checkout/verify/${encodeURIComponent(reference)}`).then(r => r.data),
  history:  (id) => api.get(`/orders/${id}/history`).then(r => r.data),
  previewCoupon: (payload) => api.post('/orders/preview', payload).then(r => r.data),
  downloadReceipt: async (orderId, orderNumber) => {
    const response = await api.get(`/orders/${orderId}/receipt.pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `urbanpulse-receipt-${orderNumber || orderId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

export const referralService = {
  lookup: (code) => api.get(`/referrals/lookup/${encodeURIComponent(code)}`).then(r => r.data),
  me:     ()     => api.get('/referrals/me').then(r => r.data),
  ledger: ()     => api.get('/referrals/ledger').then(r => r.data),
};

export const loyaltyService = {
  me:            ()       => api.get('/loyalty/me').then(r => r.data),
  ledger:        (params) => api.get('/loyalty/ledger', { params }).then(r => r.data),
  previewRedeem: (points) => api.get('/loyalty/preview-redeem', { params: { points } }).then(r => r.data),
};

export const authService = {
  me:       () => api.get('/auth/me').then(r => r.data),
  login:    (email, password) => api.post('/auth/login', { email, password }).then(r => r.data),
  register: (email, password, name, referral_code) =>
    api.post('/auth/register', { email, password, name, referral_code }).then(r => r.data),
  logout:   () => api.post('/auth/logout').then(r => r.data),
  forgot:   (email) => api.post('/auth/forgot-password', { email }).then(r => r.data),
  reset:    (token, password) => api.post('/auth/reset-password', { token, password }).then(r => r.data),
  updateMe: (payload) => api.put('/auth/me', payload).then(r => r.data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then(r => r.data),
  resetPassword:  (token, password) => api.post('/auth/reset-password', { token, password }).then(r => r.data),
  // TOTP
  verifyTotp:  (payload) => api.post('/auth/login/verify-totp', payload).then(r => r.data),
  totpSetup:   () => api.post('/auth/totp/setup').then(r => r.data),
  totpEnable:  (code) => api.post('/auth/totp/enable', { code }).then(r => r.data),
  totpDisable: (password) => api.post('/auth/totp/disable', { password }).then(r => r.data),
  // Sessions
  sessions:        () => api.get('/auth/sessions').then(r => r.data),
  revokeSession:   (id) => api.delete(`/auth/sessions/${id}`).then(r => r.data),
  revokeAllOthers: () => api.post('/auth/sessions/revoke-all-others').then(r => r.data),
  // Login history
  loginHistory: () => api.get('/auth/login-history').then(r => r.data),
  // Google sign-in
  googleSignIn:  (id_token, referral_code) =>
    api.post('/auth/google', { id_token, referral_code }).then(r => r.data),
  linkGoogle:    (id_token) =>
    api.post('/auth/google/link', { id_token }).then(r => r.data),
  unlinkGoogle:  (password) =>
    api.delete('/auth/google/link', { data: { password } }).then(r => r.data),
  setPassword:   (password) =>
    api.post('/auth/password/set', { password }).then(r => r.data),
  // Privacy (Ghana DPA)
  dataExport: async () => {
    const response = await api.get('/auth/me/data-export', { responseType: 'blob' });
    const match = /filename="([^"]+)"/.exec(response.headers['content-disposition'] || '');
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = match?.[1] || 'urbanpulse-data-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  deleteAccount:    (password) => api.post('/auth/me/delete-account', { password }).then(r => r.data),
  privacyEvents:    () => api.get('/auth/me/privacy-events').then(r => r.data),
  logConsentUpdate: (consent) => api.post('/auth/me/consent-updated', consent).then(r => r.data),
  unsubscribeLink:  () => api.get('/auth/me/unsubscribe-link').then(r => r.data),
};

export const wishlistService = {
  list:   () => api.get('/wishlist').then(r => r.data),
  add:    (product_id) => api.post('/wishlist', { product_id }).then(r => r.data),
  remove: (id) => api.delete(`/wishlist/${id}`).then(r => r.data),
};

export const reviewService = {
  add: (slug, payload) => api.post(`/products/${slug}/reviews`, payload).then(r => r.data),
};

export const returnService = {
  create: (payload) => api.post('/returns', payload).then(r => r.data),
  mine:   ()       => api.get('/returns/me').then(r => r.data),
  get:    (id)     => api.get(`/returns/${id}`).then(r => r.data),
};

export const settingsService = {
  public:  ()       => api.get('/settings/public').then(r => r.data),
  getAll:  ()       => api.get('/admin/settings').then(r => r.data),
  put:     (key, value, description) => api.put('/admin/settings', { key, value, description }).then(r => r.data),
  runJob:  (jobId)  => api.post(`/admin/jobs/${jobId}/run`).then(r => r.data),
};

export const adminService = {
  stats:        () => api.get('/admin/dashboard/stats').then(r => r.data),
  recentOrders: () => api.get('/admin/dashboard/recent-orders').then(r => r.data),
  lowStock:     () => api.get('/admin/dashboard/low-stock').then(r => r.data),

  products: (params) => api.get('/admin/products', { params }).then(r => r.data),
  getProduct: (id) => api.get(`/admin/products/${id}`).then(r => r.data),
  createProduct: (p) => api.post('/admin/products', p).then(r => r.data),
  updateProduct: (id, p) => api.put(`/admin/products/${id}`, p).then(r => r.data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`).then(r => r.data),
  exportProducts: () => api.get('/admin/products/export', { responseType: 'blob' }).then(r => r.data),
  uploadImage:    (formData) => api.post('/admin/upload', formData, {
                                  headers: { 'Content-Type': 'multipart/form-data' },
                                }).then(r => r.data),
  importProducts: (formData) => api.post('/admin/products/import', formData, {
                                  headers: { 'Content-Type': 'multipart/form-data' },
                                }).then(r => r.data),
  refundOrder:         (id) => api.post(`/admin/orders/${id}/refund`).then(r => r.data),
  confirmCOD:          (id) => api.post(`/admin/orders/${id}/confirm-cod`).then(r => r.data),
  markCashCollected:   (id) => api.post(`/admin/orders/${id}/mark-paid`).then(r => r.data),
  cancelCOD:           (id) => api.post(`/admin/orders/${id}/cancel-cod`).then(r => r.data),

  orders: (params) => api.get('/admin/orders', { params }).then(r => r.data),
  updateOrderStatus: (id, status, note) => api.put(`/admin/orders/${id}/status`, { status, ...(note ? { note } : {}) }).then(r => r.data),

  users: () => api.get('/admin/users').then(r => r.data),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }).then(r => r.data),
  blockUser: (id, is_blocked) => api.put(`/admin/users/${id}/block`, { is_blocked }).then(r => r.data),

  coupons: () => api.get('/admin/coupons').then(r => r.data),
  createCoupon: (c) => api.post('/admin/coupons', c).then(r => r.data),
  updateCoupon: (id, c) => api.put(`/admin/coupons/${id}`, c).then(r => r.data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`).then(r => r.data),

  salesAnalytics: () => api.get('/admin/analytics/sales').then(r => r.data),
  topProducts:    () => api.get('/admin/analytics/top-products').then(r => r.data),
  customerLTV:    () => api.get('/admin/analytics/customer-ltv').then(r => r.data),
  loyaltyOverview: () => api.get('/admin/loyalty/overview').then(r => r.data),

  logs: (params) => api.get('/admin/logs', { params }).then(r => r.data),

  preorderItems:   () => api.get('/admin/preorder-items').then(r => r.data),
  releasePreorder: (id, body) => api.post(`/admin/products/${id}/preorder/release`, body).then(r => r.data),

  returns:       (params) => api.get('/admin/returns', { params }).then(r => r.data),
  getReturn:     (id)     => api.get(`/admin/returns/${id}`).then(r => r.data),
  approveReturn: (id)     => api.post(`/admin/returns/${id}/approve`).then(r => r.data),
  rejectReturn:  (id, body) => api.post(`/admin/returns/${id}/reject`, body).then(r => r.data),
  receiveReturn: (id)     => api.post(`/admin/returns/${id}/receive`).then(r => r.data),
  refundReturn:  (id, body) => api.post(`/admin/returns/${id}/refund`, body).then(r => r.data),

  today:         ()         => api.get('/admin/today').then(r => r.data),
  updateVariant: (id, data) => api.put(`/admin/variants/${id}`, data).then(r => r.data),

  search:   (q)      => api.get('/admin/search', { params: { q } }).then(r => r.data),
  viewAs:   (id)     => api.post(`/admin/view-as/${id}`).then(r => r.data),
  activity: (params) => api.get('/admin/activity', { params }).then(r => r.data),

  bulkOrders:   (body) => api.post('/admin/orders/bulk', body).then(r => r.data),
  bulkReturns:  (body) => api.post('/admin/returns/bulk', body).then(r => r.data),
  bulkProducts: (body) => api.post('/admin/products/bulk', body).then(r => r.data),
  bulkUsers:    (body) => api.post('/admin/users/bulk', body).then(r => r.data),
  bulkRestock:  (body) => api.post('/admin/variants/bulk-restock', body).then(r => r.data),
  bulkCoupons:  (body) => api.post('/admin/coupons/bulk', body).then(r => r.data),

  getOrder:                (id)   => api.get(`/admin/orders/${id}`).then(r => r.data),
  editOrder:               (id,b) => api.put(`/admin/orders/${id}/edit`, b).then(r => r.data),
  forceOrderStatus:        (id,b) => api.post(`/admin/orders/${id}/force-status`, b).then(r => r.data),
  createManualOrder:       (b)    => api.post('/admin/orders/manual', b).then(r => r.data),
  manualRefund:            (id,b) => api.post(`/admin/orders/${id}/manual-refund`, b).then(r => r.data),
  adjustVariantStock:      (id,b) => api.post(`/admin/variants/${id}/adjust`, b).then(r => r.data),
  getVariantAdjustHistory: (id)   => api.get(`/admin/variants/${id}/adjustment-history`).then(r => r.data),

  messageTemplates:    (params) => api.get('/admin/message-templates', { params }).then(r => r.data),
  createTemplate:      (b)      => api.post('/admin/message-templates', b).then(r => r.data),
  updateTemplate:      (id, b)  => api.put(`/admin/message-templates/${id}`, b).then(r => r.data),
  deleteTemplate:      (id)     => api.delete(`/admin/message-templates/${id}`).then(r => r.data),
  sendMessage:         (b)      => api.post('/admin/messages/send', b).then(r => r.data),

  customer: {
    get:                (id)            => api.get(`/admin/customers/${id}`).then(r => r.data),
    orders:             (id)            => api.get(`/admin/customers/${id}/orders`).then(r => r.data),
    returns:            (id)            => api.get(`/admin/customers/${id}/returns`).then(r => r.data),
    reviews:            (id)            => api.get(`/admin/customers/${id}/reviews`).then(r => r.data),
    wishlist:           (id)            => api.get(`/admin/customers/${id}/wishlist`).then(r => r.data),
    creditLedger:       (id)            => api.get(`/admin/customers/${id}/credit-ledger`).then(r => r.data),
    loyaltyLedger:      (id)            => api.get(`/admin/customers/${id}/loyalty-ledger`).then(r => r.data),
    notes:              (id)            => api.get(`/admin/customers/${id}/notes`).then(r => r.data),
    addNote:            (id, body)      => api.post(`/admin/customers/${id}/notes`, body).then(r => r.data),
    updateNote:         (id, nid, body) => api.put(`/admin/customers/${id}/notes/${nid}`, body).then(r => r.data),
    deleteNote:         (id, nid)       => api.delete(`/admin/customers/${id}/notes/${nid}`).then(r => r.data),
    adjustCredit:       (id, body)      => api.post(`/admin/customers/${id}/adjust-credit`, body).then(r => r.data),
    adjustLoyalty:      (id, body)      => api.post(`/admin/customers/${id}/loyalty/adjust`, body).then(r => r.data),
    block:              (id)            => api.put(`/admin/users/${id}/block`, { is_blocked: true }).then(r => r.data),
    unblock:            (id)            => api.put(`/admin/users/${id}/block`, { is_blocked: false }).then(r => r.data),
    setRole:            (id, role)      => api.put(`/admin/users/${id}/role`, { role }).then(r => r.data),
    flags:              (id)            => api.get(`/admin/customers/${id}/flags`).then(r => r.data),
    flagsBulk:          (ids)           => api.get('/admin/customers/flags/bulk', { params: { ids: ids.join(',') } }).then(r => r.data),
    addFlag:            (id, b)         => api.post(`/admin/customers/${id}/flags`, b).then(r => r.data),
    removeFlag:         (id, fid)       => api.delete(`/admin/customers/${id}/flags/${fid}`).then(r => r.data),
    messages:           (id)            => api.get(`/admin/customers/${id}/messages`).then(r => r.data),
    resendConfirmation: (id)            => api.post(`/admin/customers/${id}/resend-confirmation`).then(r => r.data),
    resetPassword:      (id)            => api.post(`/admin/customers/${id}/reset-password`).then(r => r.data),
  },
};
