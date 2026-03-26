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
        'ZOOM_EVENT',
        'ECOMMERCE_ORDER',
        'SCHEDULED_POST',
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
          options: [String],
        },
      ],
      zoomConfig: {
        meetingTopic: { type: String, default: '' },
        meetingDuration: { type: Number, default: 60 },
        meetingAgenda: { type: String, default: '' },
        meetingPassword: { type: String, default: '' },
        timezone: { type: String, default: 'UTC' },
        autoRecording: {
          type: String,
          enum: ['cloud', 'local', 'none'],
          default: 'cloud',
        },
        attendees: [
          {
            name: { type: String },
            email: { type: String, required: true },
          },
        ],
        sendEmailInvite: { type: Boolean, default: true },
        storeInDatabase: { type: Boolean, default: true },
        fetchTranscript: { type: Boolean, default: true },
      },
      scheduledPostConfig: {
        platform: { type: String, enum: ['linkedin', 'twitter', 'facebook', 'instagram'], default: 'linkedin' },
        content: { type: String, default: '' },
        scheduledFor: { type: Date },
        notifyEmail: { type: String, default: '' },
      },
    },
    actions: [
      {
        actionType: {
          type: String,
          enum: [
            'SEND_EMAIL',
            'STORE_DB',
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

workflowSchema.index({ webhookId: 1 });
workflowSchema.index({ organizationId: 1 });

module.exports = mongoose.model('Workflow', workflowSchema);
