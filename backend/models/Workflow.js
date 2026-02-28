const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide workflow name'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    triggerType: {
      type: String,
      enum: [
        'GOOGLE_FORM',
        'PROJECT_ASSIGNMENT',
        'SOCIAL_EVENT',
        'ZOOM_EVENT',
        'ECOMMERCE_ORDER',
      ],
      required: [true, 'Please provide a trigger type'],
    },
    webhookId: {
      type: String,
      unique: true,
      sparse: true,
    },
    triggerConfig: {
      formFields: [
        {
          fieldName: { type: String, required: true },
          fieldLabel: { type: String },
          fieldType: {
            type: String,
            enum: ['text', 'email', 'number', 'date', 'textarea', 'select', 'checkbox'],
            default: 'text',
          },
          required: { type: Boolean, default: false },
          options: [String], // for select type
        },
      ],
    },
    actions: [
      {
        actionType: {
          type: String,
          enum: [
            'SEND_EMAIL',
            'STORE_DB',
            'ASSIGN_EMPLOYEE',
            'POST_INSTAGRAM',
            'SCHEDULE_POST',
            'CREATE_ZOOM_MEETING',
            'API_REQUEST',
          ],
          required: true,
        },
        config: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        fieldMappings: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        order: {
          type: Number,
          required: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    executionCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for faster webhook lookups
workflowSchema.index({ webhookId: 1 });
workflowSchema.index({ organizationId: 1 });

module.exports = mongoose.model('Workflow', workflowSchema);
