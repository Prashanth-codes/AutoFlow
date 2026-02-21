const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    productName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED'],
      default: 'PENDING',
    },
    paymentMethod: {
      type: String,
      default: 'UNKNOWN',
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['received', 'processed', 'shipped', 'delivered', 'cancelled'],
      default: 'received',
    },
  },
  { timestamps: true }
);

// Index for faster lookups
orderSchema.index({ organizationId: 1, createdAt: -1 });
orderSchema.index({ orderId: 1, organizationId: 1 });
orderSchema.index({ customerEmail: 1, organizationId: 1 });

module.exports = mongoose.model('Order', orderSchema);
