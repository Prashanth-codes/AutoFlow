const mongoose = require('mongoose');

const executionLogSchema = new mongoose.Schema(
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
    triggerPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'partial'],
      default: 'pending',
    },
    executionResults: [
      {
        actionType: String,
        status: {
          type: String,
          enum: ['success', 'failed'],
        },
        result: mongoose.Schema.Types.Mixed,
        error: String,
        executedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    error: String,
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    duration: Number,
  },
  { timestamps: true }
);

// Index for faster lookups
executionLogSchema.index({ workflowId: 1, createdAt: -1 });
executionLogSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('ExecutionLog', executionLogSchema);
