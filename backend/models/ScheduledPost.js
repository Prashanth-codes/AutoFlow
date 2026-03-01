const mongoose = require('mongoose');

const scheduledPostSchema = new mongoose.Schema(
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    platform: {
      type: String,
      enum: ['linkedin', 'twitter', 'facebook', 'instagram'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    mediaUrls: [String],
    scheduledFor: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'posted', 'failed', 'cancelled'],
      default: 'scheduled',
    },
    cronJobId: String,
    postedAt: Date,
    error: String,
  },
  { timestamps: true }
);

// Index for faster lookups
scheduledPostSchema.index({ organizationId: 1, status: 1, scheduledFor: 1 });

module.exports = mongoose.model('ScheduledPost', scheduledPostSchema);
