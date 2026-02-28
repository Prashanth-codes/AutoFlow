const instagramService = require('../services/instagramService');
const CommentRule = require('../models/CommentRule');
const {
  findMatchingRule,
  executeCommentRule,
  canAutoReply,
  markAutoReplied,
} = require('../services/commentAutomationService');

/**
 * GET  /api/webhook/instagram
 * Instagram (Meta) webhook verification – hub.mode / hub.verify_token / hub.challenge
 */
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Instagram webhook verified');
    return res.status(200).send(challenge);
  }

  console.warn('⚠️ Instagram webhook verification failed', { mode, tokenProvided: !!token });
  return res.status(403).json({ error: 'Verification failed' });
};

/**
 * POST /api/webhook/instagram
 * Receive Instagram webhook events (comments, mentions, story insights, etc.)
 */
exports.handleWebhook = async (req, res) => {
  // Respond immediately so Meta doesn't retry
  res.status(200).json({ status: 'ok' });

  const rawBody = JSON.stringify(req.body);

  // Verify signature in production
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (appSecret && process.env.NODE_ENV === 'production') {
    if (!instagramService.verifySignature(rawBody, signature, appSecret)) {
      console.warn('⚠️ Instagram webhook signature verification failed');
      return;
    }
  }

  const body = req.body;

  if (!body || body.object !== 'instagram') return;

  console.log('📸 Instagram webhook event received:', JSON.stringify(body, null, 2));

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  // Process each entry
  if (body.entry && Array.isArray(body.entry)) {
    for (const entry of body.entry) {
      const appUserId = String(entry.id);

      // ── Comment & Live Comment events ────────────────────────────────
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'comments' || change.field === 'live_comments') {
            const commentData = change.value;
            const commentId = commentData.id;
            const mediaId = commentData.media?.id || '';
            const commentText = commentData.text || '';
            const username = commentData.from?.username || 'unknown';
            const senderId = commentData.from?.id || '';

            const icon = change.field === 'comments' ? '💬' : '🔴';
            console.log(
              `${icon} ${change.field === 'live_comments' ? 'Live comment' : 'Comment'} from @${username}: "${commentText}"`
            );

            // Skip if cooldown active for this sender
            if (!canAutoReply(senderId)) {
              console.log(`⏳ Cooldown active for ${senderId}, skipping auto-reply`);
              continue;
            }

            try {
              // Load all enabled rules (across all orgs for now)
              const rules = await CommentRule.find({ enabled: true }).lean();
              const matchedRule = findMatchingRule(commentText, mediaId, rules);

              if (matchedRule) {
                console.log(
                  `🎯 Matched keyword "${matchedRule.keyword}" for comment from @${username}`
                );
                const sent = await executeCommentRule(
                  appUserId,
                  commentId,
                  matchedRule,
                  accessToken
                );
                if (sent) {
                  markAutoReplied(senderId);
                  // Increment match count
                  await CommentRule.findByIdAndUpdate(matchedRule._id, {
                    $inc: { matchCount: 1 },
                  });
                  console.log(
                    `✅ Auto-DM sent to @${username} for keyword "${matchedRule.keyword}"`
                  );
                }
              }
            } catch (err) {
              console.error('Error processing comment automation:', err);
            }
          } else {
            console.log(`  ↳ field=${change.field}`, change.value);
          }
        }
      }

      // ── Messaging events (DMs) ──────────────────────────────────────
      if (entry.messaging) {
        for (const event of entry.messaging) {
          if (!event.message) continue;

          const senderId = String(event.sender?.id || '');
          const isEcho = !!event.message?.is_echo;

          // Skip our own messages
          if (senderId === appUserId || isEcho) continue;

          console.log(`📨 DM from ${senderId}: "${event.message?.text || '(attachment)'}"`);
        }
      }
    }
  }
};
