const cron = require('node-cron');
const ScheduledPost = require('../models/ScheduledPost');
const linkedinService = require('./linkedinService');

class Scheduler {
  constructor() {
    this.jobs = new Map();
  }

  async schedulePost(workflowId, platform, content, scheduledFor, mediaUrl = null) {
    try {
      // Create scheduled post record
      const scheduledPost = await ScheduledPost.create({
        workflowId,
        organizationId: workflowId.organizationId, // Will be populated from workflow
        platform,
        content,
        mediaUrls: mediaUrl ? [mediaUrl] : [],
        scheduledFor,
        status: 'scheduled',
      });

      // Calculate cron expression from scheduledFor date
      const cronExpression = this.generateCronExpression(scheduledFor);

      // Schedule the job
      const job = cron.schedule(cronExpression, async () => {
        await this.executeScheduledPost(scheduledPost._id);
      });

      // Store job reference
      this.jobs.set(scheduledPost._id.toString(), job);

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

  async executeScheduledPost(scheduledPostId) {
    try {
      const scheduledPost = await ScheduledPost.findById(scheduledPostId);

      if (!scheduledPost || scheduledPost.status !== 'scheduled') {
        return;
      }

      // Execute based on platform
      switch (scheduledPost.platform) {
        case 'linkedin':
          await linkedinService.postToLinkedIn(
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

      // Clean up cron job
      const job = this.jobs.get(scheduledPostId.toString());
      if (job) {
        job.stop();
        this.jobs.delete(scheduledPostId.toString());
      }

      console.log(`Post executed for ${scheduledPostId}`);
    } catch (error) {
      console.error('Execute scheduled post error:', error);

      // Update with error
      const scheduledPost = await ScheduledPost.findById(scheduledPostId);
      scheduledPost.status = 'failed';
      scheduledPost.error = error.message;
      await scheduledPost.save();
    }
  }

  generateCronExpression(dateTime) {
    // Generate cron expression from JavaScript Date
    // Format: minute hour day month day-of-week
    const minute = dateTime.getMinutes();
    const hour = dateTime.getHours();
    const day = dateTime.getDate();
    const month = dateTime.getMonth() + 1; // Cron uses 1-12 for months

    return `${minute} ${hour} ${day} ${month} *`;
  }

  cancelScheduledPost(scheduledPostId) {
    const job = this.jobs.get(scheduledPostId.toString());
    if (job) {
      job.stop();
      this.jobs.delete(scheduledPostId.toString());
    }
  }
}

module.exports = new Scheduler();
