const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide connection name'],
      trim: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    type: {
      type: String,
      enum: ['instagram', 'zoom', 'gmail', 'stripe', 'shopify', 'custom'],
      required: [true, 'Please provide connection type'],
    },
    credentials: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastVerified: Date,
  },
  { timestamps: true }
);

// Index for faster lookups
connectionSchema.index({ organizationId: 1, type: 1 });

module.exports = mongoose.model('Connection', connectionSchema);
