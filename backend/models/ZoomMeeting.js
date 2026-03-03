const mongoose = require('mongoose');

const zoomMeetingSchema = new mongoose.Schema(
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
    meetingId: {
      type: String,
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
    },
    agenda: {
      type: String,
      default: '',
    },
    hostEmail: {
      type: String,
      default: '',
    },
    joinUrl: {
      type: String,
      required: true,
    },
    startUrl: {
      type: String,
      default: '',
    },
    password: {
      type: String,
      default: '',
    },
    duration: {
      type: Number,
      default: 60,
    },
    startTime: {
      type: Date,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    status: {
      type: String,
      enum: ['scheduled', 'started', 'ended', 'cancelled'],
      default: 'scheduled',
    },
    attendees: [
      {
        name: { type: String },
        email: { type: String, required: true },
        notified: { type: Boolean, default: false },
      },
    ],
    meetingMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Transcript data populated when the meeting ends
    transcript: {
      type: String,
      default: '',
    },
    transcriptUrl: {
      type: String,
      default: '',
    },
    recordingUrl: {
      type: String,
      default: '',
    },
    endedAt: {
      type: Date,
    },
    actualDuration: {
      type: Number, // in minutes
    },
    participantCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

zoomMeetingSchema.index({ workflowId: 1, createdAt: -1 });
zoomMeetingSchema.index({ organizationId: 1, createdAt: -1 });
zoomMeetingSchema.index({ meetingId: 1 });

module.exports = mongoose.model('ZoomMeeting', zoomMeetingSchema);
