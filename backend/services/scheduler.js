const ScheduledPost = require('../models/ScheduledPost');
const instagramService = require('./instagramService');

class Scheduler {
  constructor() {
    this.timers = new Map();
  }

  /**
   * Schedule a social media post using setTimeout (one-off execution).
   * Accepts the full workflow object so organizationId can be read from it.
   */
  async schedulePost(workflow, platform, content, scheduledFor, mediaUrl = null) {
    try {
      // Create scheduled post record
      const scheduledPost = await ScheduledPost.create({
        workflowId: workflow._id,
        organizationId: workflow.organizationId,
        platform,
        content,
        mediaUrls: mediaUrl ? [mediaUrl] : [],
        scheduledFor,
        status: 'scheduled',
      });

      // Schedule with setTimeout (fires once, no yearly re-fire)
      this._scheduleTimer(scheduledPost._id, scheduledFor);

      return {
        success: true,
        scheduledPostId: scheduledPost._id,
        message: 'Post scheduled successfully',
        scheduledFor,
      };
    } catch (error) {
      console.error('Schedule post error:', error);
      throw error;
    }
  }

  /**
   * Set a timer for a scheduled post. If the time is in the past, execute immediately.
   */
  _scheduleTimer(scheduledPostId, scheduledFor) {
    const delay = new Date(scheduledFor).getTime() - Date.now();

    if (delay <= 0) {
      // Time already passed — execute immediately
      this.executeScheduledPost(scheduledPostId);
      return;
    }

    const timer = setTimeout(async () => {
      await this.executeScheduledPost(scheduledPostId);
    }, delay);

    this.timers.set(scheduledPostId.toString(), timer);
  }

  async executeScheduledPost(scheduledPostId) {
    try {
      const scheduledPost = await ScheduledPost.findById(scheduledPostId);

      if (!scheduledPost || scheduledPost.status !== 'scheduled') {
        return;
      }

      // Execute based on platform
      switch (scheduledPost.platform) {
        case 'instagram':
          await instagramService.postToInstagram(
            scheduledPost.content,
            scheduledPost.mediaUrls?.[0]
          );
          break;
        default:
          console.log(`Posting to ${scheduledPost.platform}:`, scheduledPost.content);
      }

      // Update status
      scheduledPost.status = 'posted';
      scheduledPost.postedAt = new Date();
      await scheduledPost.save();

      // Clean up timer reference
      this.timers.delete(scheduledPostId.toString());

      console.log(`Post executed for ${scheduledPostId}`);
    } catch (error) {
      console.error('Execute scheduled post error:', error);

      // Update with error
      const scheduledPost = await ScheduledPost.findById(scheduledPostId);
      if (scheduledPost) {
        scheduledPost.status = 'failed';
        scheduledPost.error = error.message;
        await scheduledPost.save();
      }
    }
  }

  /**
   * Recover any pending scheduled posts from the database on server restart.
   * Call this after the DB connection is established.
   */
  async recoverScheduledPosts() {
    try {
      const pendingPosts = await ScheduledPost.find({ status: 'scheduled' });
      console.log(`🔄 Recovering ${pendingPosts.length} scheduled post(s)...`);

      for (const post of pendingPosts) {
        this._scheduleTimer(post._id, post.scheduledFor);
      }

      console.log('✅ Scheduled post recovery complete');
    } catch (error) {
      console.error('Error recovering scheduled posts:', error);
    }
  }

  cancelScheduledPost(scheduledPostId) {
    const timer = this.timers.get(scheduledPostId.toString());
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(scheduledPostId.toString());
    }
  }
}

module.exports = new Scheduler();
