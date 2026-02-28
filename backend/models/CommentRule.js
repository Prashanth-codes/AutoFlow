const mongoose = require('mongoose');

const commentRuleSchema = new mongoose.Schema(
  {
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
    keyword: {
      type: String,
      required: [true, 'Please provide a keyword'],
      trim: true,
    },
    // The reel / media permalink the user wants to monitor (optional – blank = all reels)
    targetReelUrl: {
      type: String,
      default: '',
      trim: true,
    },
    // Instagram media ID resolved from the reel URL (set when webhook fires)
    targetMediaId: {
      type: String,
      default: '',
      trim: true,
    },
    // What to send in the DM
    dmMessage: {
      type: String,
      default: '',
      trim: true,
    },
    // Link to include in the DM (sent as a button template)
    dmLink: {
      type: String,
      default: '',
      trim: true,
    },
    // Button label shown on the link card
    dmButtonText: {
      type: String,
      default: 'Open Link',
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    matchCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

commentRuleSchema.index({ organizationId: 1, enabled: 1 });
commentRuleSchema.index({ keyword: 1 });

module.exports = mongoose.model('CommentRule', commentRuleSchema);
