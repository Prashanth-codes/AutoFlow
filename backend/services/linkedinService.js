const axios = require('axios');
const https = require('https');
const LinkedInAccount = require('../models/LinkedInAccount');

const httpsAgent = new https.Agent({ family: 4 });

class LinkedInService {
  constructor() {
    this.apiUrl = 'https://api.linkedin.com/v2';
  }

  async postToLinkedIn(content, mediaUrl = null, appUserId = null) {
    try {
      const query = appUserId ? { appUserId } : {};
      const account = await LinkedInAccount.findOne(query).sort({ updatedAt: -1 });

      if (!account) {
        throw new Error('No LinkedIn account connected. Please connect via OAuth first.');
      }

      const payload = {
        author: account.memberUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      const response = await axios.post(`${this.apiUrl}/ugcPosts`, payload, {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        httpsAgent,
        timeout: 15000,
      });

      console.log('LinkedIn post created:', response.data.id);

      return {
        success: true,
        message: 'Posted to LinkedIn successfully',
        postId: response.data.id,
        content,
      };
    } catch (error) {
      console.error('LinkedIn posting error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new LinkedInService();
