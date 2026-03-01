const ScheduledPost = require('../models/ScheduledPost');
const ExecutionLog = require('../models/ExecutionLog');
const linkedinService = require('./linkedinService');
const actionExecutor = require('./actionExecutor');
const Workflow = require('../models/Workflow');

class Scheduler {
  constructor() {
    this.timers = new Map();
  }

  /**
   * Schedule a social media post using setTimeout (one-off execution).
   * Accepts the full workflow object so organizationId can be read from it.
   */
  async schedulePost(workflow, platform, content, scheduledFor, mediaUrl = null, userId = null) {
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
        userId: userId || workflow.createdBy, // store userId for LinkedIn OAuth lookup
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
    let executionLog = null;

    try {
      const scheduledPost = await ScheduledPost.findById(scheduledPostId);

      if (!scheduledPost || scheduledPost.status !== 'scheduled') {
        return;
      }

      const workflow = await Workflow.findById(scheduledPost.workflowId);

      // ── Create an Execution Log so this shows up in the UI ──
      const triggerPayload = {
        platform: scheduledPost.platform,
        content: scheduledPost.content,
        scheduledFor: scheduledPost.scheduledFor,
        mediaUrls: scheduledPost.mediaUrls,
        type: 'SCHEDULED_POST',
      };

      executionLog = await ExecutionLog.create({
        workflowId: scheduledPost.workflowId,
        organizationId: scheduledPost.organizationId,
        triggerPayload,
        status: 'pending',
      });

      const startTime = Date.now();
      const executionResults = [];
      let hasError = false;

      // ── Step 1: Execute the scheduled post to the platform ──
      try {
        switch (scheduledPost.platform) {
          case 'linkedin':
            await linkedinService.postToLinkedIn(
              scheduledPost.content,
              scheduledPost.mediaUrls?.[0],
              scheduledPost.userId
            );
            break;
          default:
            console.log(`Posting to ${scheduledPost.platform}:`, scheduledPost.content);
        }

        // Update scheduled post status
        scheduledPost.status = 'posted';
        scheduledPost.postedAt = new Date();
        await scheduledPost.save();

        executionResults.push({
          actionType: `POST_${scheduledPost.platform.toUpperCase()}`,
          status: 'success',
          result: {
            message: `Posted to ${scheduledPost.platform} successfully`,
            postedAt: scheduledPost.postedAt,
            content: scheduledPost.content,
          },
          executedAt: new Date(),
        });

        console.log(`✅ Scheduled post executed: ${scheduledPostId}`);
      } catch (postError) {
        hasError = true;

        scheduledPost.status = 'failed';
        scheduledPost.error = postError.message;
        await scheduledPost.save();

        executionResults.push({
          actionType: `POST_${scheduledPost.platform.toUpperCase()}`,
          status: 'failed',
          error: postError.message,
          executedAt: new Date(),
        });

        console.error('Scheduled post platform error:', postError.message);
      }

      // Clean up timer reference
      this.timers.delete(scheduledPostId.toString());

      // ── Step 2: Execute chained workflow actions ──
      if (workflow && workflow.actions && workflow.actions.length > 0) {
        const actionPayload = {
          platform: scheduledPost.platform,
          content: scheduledPost.content,
          postedAt: scheduledPost.postedAt || new Date(),
          status: scheduledPost.status,
          scheduledFor: scheduledPost.scheduledFor,
          // Provide notifyEmail so SEND_EMAIL action can find a recipient
          email: workflow.triggerConfig?.scheduledPostConfig?.notifyEmail || '',
          notifyEmail: workflow.triggerConfig?.scheduledPostConfig?.notifyEmail || '',
        };

        const sortedActions = [...workflow.actions].sort((a, b) => (a.order || 0) - (b.order || 0));

        for (const action of sortedActions) {
          try {
            const result = await actionExecutor.executeAction(action, actionPayload, workflow);

            executionResults.push({
              actionType: action.actionType,
              status: 'success',
              result,
              executedAt: new Date(),
            });
          } catch (actionErr) {
            hasError = true;

            executionResults.push({
              actionType: action.actionType,
              status: 'failed',
              error: actionErr.message,
              executedAt: new Date(),
            });

            console.error(`Chained action ${action.actionType} failed:`, actionErr.message);
          }
        }
      }

      // ── Update the execution log ──
      executionLog.executionResults = executionResults;
      executionLog.status = hasError ? 'partial' : 'success';
      executionLog.completedAt = new Date();
      executionLog.duration = Date.now() - startTime;
      await executionLog.save();
    } catch (error) {
      console.error('Execute scheduled post error:', error);

      // Update scheduled post as failed
      try {
        const scheduledPost = await ScheduledPost.findById(scheduledPostId);
        if (scheduledPost && scheduledPost.status === 'scheduled') {
          scheduledPost.status = 'failed';
          scheduledPost.error = error.message;
          await scheduledPost.save();
        }
      } catch { /* ignore */ }

      // Mark execution log as failed
      if (executionLog) {
        try {
          executionLog.status = 'failed';
          executionLog.error = error.message;
          executionLog.completedAt = new Date();
          executionLog.duration = Date.now() - executionLog.startedAt;
          await executionLog.save();
        } catch { /* ignore */ }
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
