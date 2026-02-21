// Placeholder for ecommerce integration service
// Can be extended to validate orders, check payment status, etc.

class EcommerceService {
  validateOrderPayload(payload) {
    const requiredFields = ['orderId', 'customerEmail', 'amount'];
    for (const field of requiredFields) {
      if (!payload[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    return true;
  }

  transformPayload(payload) {
    return {
      orderId: payload.orderId,
      customerName: payload.customerName || 'Unknown',
      customerEmail: payload.customerEmail,
      productName: payload.productName || 'Service',
      amount: payload.amount,
      paymentStatus: payload.paymentStatus || 'PENDING',
      timestamp: new Date(),
    };
  }
}

module.exports = new EcommerceService();
