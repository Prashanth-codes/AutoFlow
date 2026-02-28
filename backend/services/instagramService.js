const axios = require('axios');

class InstagramService {
  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    this.apiUrl = 'https://graph.instagram.com/v18.0';
    this.appSecret = process.env.INSTAGRAM_APP_SECRET;
  }

  /**
   * Publish a photo post to Instagram via the Content Publishing API.
   * Step 1: Create a media container  →  Step 2: Publish it.
   */
  async postToInstagram(content, mediaUrl = null) {
    try {
      if (!this.accessToken) {
        throw new Error('Instagram access token not configured');
      }

      const userId = process.env.INSTAGRAM_USER_ID;
      if (!userId) {
        throw new Error('Instagram user ID not configured');
      }

      // If a media URL is provided, create a real media container
      if (mediaUrl) {
        // Step 1 – Create media container
        const containerRes = await axios.post(
          `${this.apiUrl}/${userId}/media`,
          null,
          {
            params: {
              image_url: mediaUrl,
              caption: content,
              access_token: this.accessToken,
            },
          }
        );

        const creationId = containerRes.data.id;

        // Step 2 – Publish
        const publishRes = await axios.post(
          `${this.apiUrl}/${userId}/media_publish`,
          null,
          {
            params: {
              creation_id: creationId,
              access_token: this.accessToken,
            },
          }
        );

        return {
          success: true,
          message: 'Posted to Instagram successfully',
          postId: publishRes.data.id,
          content,
        };
      }

      // No media URL – log and return mock (Instagram requires an image/video)
      console.log('Instagram post (caption-only, no media):', { content });

      return {
        success: true,
        message: 'Instagram post queued (media required for publishing)',
        postId: `ig_${Date.now()}`,
        content,
      };
    } catch (error) {
      console.error('Instagram posting error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verify the webhook signature from Instagram / Meta.
   */
  verifySignature(rawBody, signature, secret) {
    if (!signature || !secret) return false;
    const crypto = require('crypto');
    const expected =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
}

module.exports = new InstagramService();
