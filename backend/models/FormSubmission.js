const mongoose = require('mongoose');

const formSubmissionSchema = new mongoose.Schema(
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
    formType: {
      type: String,
      enum: ['google_form', 'custom_form', 'contact_form'],
      required: true,
    },
    submitterEmail: {
      type: String,
      required: true,
    },
    submitterName: String,
    formData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['received', 'processed', 'archived'],
      default: 'received',
    },
    processedAt: Date,
  },
  { timestamps: true }
);

formSubmissionSchema.index({ organizationId: 1, workflowId: 1 });

module.exports = mongoose.model('FormSubmission', formSubmissionSchema);
