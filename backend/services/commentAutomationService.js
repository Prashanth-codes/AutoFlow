const axios = require('axios');

const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.instagram.com/${API_VERSION}`;

/**
 * Per-user cooldown so we don't spam the same person.
 * Key = senderId, Value = timestamp of last auto-reply.
 */
const cooldownMap = new Map();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function canAutoReply(senderId) {
  const last = cooldownMap.get(senderId);
  if (last && Date.now() - last < COOLDOWN_MS) return false;
  return true;
}

function markAutoReplied(senderId) {
  cooldownMap.set(senderId, Date.now());
}

function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

// ─── Send a plain-text DM ────────────────────────────────────────────────────
async function sendTextDm(appUserId, recipientId, message, accessToken) {
  try {
    const res = await axios.post(
      `${BASE_URL}/${appUserId}/messages`,
      {
        recipient: { id: recipientId },
        message: { text: message },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    console.log(`🤖 Auto-reply DM sent to ${recipientId}:`, res.data);
    return { success: true, recipientId };
  } catch (err) {
    console.error(
      `❌ Auto-reply DM failed for ${recipientId}:`,
      err.response?.data || err.message
    );
    return { success: false, recipientId };
  }
}

// ─── Send a text DM as a reply to a comment (uses comment_id) ────────────────
async function sendTextReplyToComment(appUserId, commentId, text, accessToken) {
  try {
    const res = await axios.post(
      `${BASE_URL}/${appUserId}/messages`,
      {
        recipient: { comment_id: commentId },
        message: { text },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return {
      success: true,
      recipientId: String(res.data?.recipient_id || ''),
    };
  } catch (err) {
    console.error(
      `❌ Text reply failed for comment ${commentId}:`,
      err.response?.data || err.message
    );
    return { success: false, recipientId: '' };
  }
}

// ─── Send a template DM (button + link) as a reply to a comment ──────────────
async function sendTemplateReplyToComment(
  appUserId,
  commentId,
  title,
  buttonText,
  buttonUrl,
  accessToken
) {
  try {
    const res = await axios.post(
      `${BASE_URL}/${appUserId}/messages`,
      {
        recipient: { comment_id: commentId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [
                {
                  title,
                  buttons: [
                    {
                      type: 'web_url',
                      url: buttonUrl,
                      title: buttonText,
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return {
      success: true,
      recipientId: String(res.data?.recipient_id || ''),
    };
  } catch (err) {
    console.error(
      `❌ Template reply failed for comment ${commentId}:`,
      err.response?.data || err.message
    );
    return { success: false, recipientId: '' };
  }
}

// ─── Send a template DM (button + link) via recipient id ─────────────────────
async function sendTemplateDm(
  appUserId,
  recipientId,
  title,
  buttonText,
  buttonUrl,
  accessToken
) {
  try {
    await axios.post(
      `${BASE_URL}/${appUserId}/messages`,
      {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [
                {
                  title,
                  buttons: [
                    {
                      type: 'web_url',
                      url: buttonUrl,
                      title: buttonText,
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return true;
  } catch (err) {
    console.error(
      `❌ Template DM failed for ${recipientId}:`,
      err.response?.data || err.message
    );
    return false;
  }
}

// ─── Match a comment against the rules ───────────────────────────────────────
function findMatchingRule(commentText, mediaId, rules) {
  const normalized = normalizeText(commentText);
  return rules.find((rule) => {
    if (!rule.enabled) return false;
    const keyword = normalizeText(rule.keyword);
    if (!keyword) return false;

    // If a target media ID is set, the comment must be on that specific media
    if (rule.targetMediaId && rule.targetMediaId !== mediaId) return false;

    return normalized === keyword || normalized.includes(keyword);
  });
}

// ─── Execute a matched rule: DM the commenter ───────────────────────────────
async function executeCommentRule(appUserId, commentId, rule, accessToken) {
  const hasMessage = (rule.dmMessage || '').trim().length > 0;
  const hasLink = (rule.dmLink || '').trim().length > 0;

  if (!hasMessage && !hasLink) return false;

  try {
    // If we have a link, send a template (button card) as the first message
    if (hasLink) {
      const title = hasMessage ? rule.dmMessage.trim() : rule.dmButtonText || 'Open Link';
      const result = await sendTemplateReplyToComment(
        appUserId,
        commentId,
        title,
        rule.dmButtonText || 'Open Link',
        rule.dmLink.trim(),
        accessToken
      );
      return result.success;
    }

    // Text-only DM
    const result = await sendTextReplyToComment(
      appUserId,
      commentId,
      rule.dmMessage.trim(),
      accessToken
    );
    return result.success;
  } catch (err) {
    console.error(
      `❌ Comment rule execution failed for comment ${commentId}:`,
      err.response?.data || err.message
    );
    return false;
  }
}

module.exports = {
  canAutoReply,
  markAutoReplied,
  normalizeText,
  sendTextDm,
  sendTextReplyToComment,
  sendTemplateReplyToComment,
  sendTemplateDm,
  findMatchingRule,
  executeCommentRule,
};
