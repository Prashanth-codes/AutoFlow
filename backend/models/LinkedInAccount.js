const mongoose = require('mongoose');

const linkedInAccountSchema = new mongoose.Schema(
  {
    appUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    memberUrn: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// One LinkedIn account per app user
linkedInAccountSchema.index({ appUserId: 1 }, { unique: true });

module.exports = mongoose.model('LinkedInAccount', linkedInAccountSchema);
