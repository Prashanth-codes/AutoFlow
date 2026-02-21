const axios = require('axios');

class ZoomService {
  constructor() {
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.apiUrl = 'https://api.zoom.us/v2';
  }

  async createMeeting(topic, duration = 60, startTime = null) {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Zoom credentials not configured');
      }

      // Mock implementation
      const meetingData = {
        topic,
        duration,
        startTime: startTime || new Date(),
        createdAt: new Date(),
      };

      console.log('Creating Zoom meeting:', meetingData);

      // Actual API call would look like:
      // const token = await this.getAccessToken();
      // const response = await axios.post(`${this.apiUrl}/users/me/meetings`, {
      //   topic,
      //   duration,
      //   start_time: startTime.toISOString(),
      //   type: 2
      // }, {
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json'
      //   }
      // });

      return {
        success: true,
        message: 'Zoom meeting created successfully',
        meetingId: `zoom_${Date.now()}`,
        topic,
        joinUrl: `https://zoom.us/my/meeting/${Date.now()}`,
      };
    } catch (error) {
      console.error('Zoom meeting creation error:', error);
      throw error;
    }
  }

  async getAccessToken() {
    try {
      const response = await axios.post('https://zoom.us/oauth/token', null, {
        params: {
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Error getting Zoom access token:', error);
      throw error;
    }
  }
}

module.exports = new ZoomService();
