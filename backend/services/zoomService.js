const axios = require('axios');

class ZoomService {
  constructor() {
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.apiUrl = 'https://api.zoom.us/v2';
    this._accessToken = null;
    this._tokenExpiry = null;
  }


  async getAccessToken() {
    if (this._accessToken && this._tokenExpiry && Date.now() < this._tokenExpiry) {
      return this._accessToken;
    }

    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const response = await axios.post(
        'https://zoom.us/oauth/token',
        new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: this.accountId,
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this._accessToken = response.data.access_token;
      this._tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
      return this._accessToken;
    } catch (error) {
      console.error('Error getting Zoom access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Zoom API');
    }
  }

  async createMeeting({
    topic = 'Meeting',
    duration = 60,
    agenda = '',
    startTime = null,
    timezone = 'UTC',
    password = '',
    attendees = [],
    autoRecording = 'cloud',
  } = {}) {
    try {
      if (!this.clientId || !this.clientSecret || !this.accountId) {
        console.warn('Zoom credentials not fully configured — using mock mode');
        return this._mockCreateMeeting({ topic, duration, agenda, startTime, attendees });
      }

      const token = await this.getAccessToken();

      const meetingPayload = {
        topic,
        type: startTime ? 2 : 1, // 2 = scheduled, 1 = instant
        duration,
        agenda,
        timezone,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: true,
          auto_recording: autoRecording,
          waiting_room: false,
          meeting_authentication: false,
        },
      };

      if (startTime) {
        meetingPayload.start_time = new Date(startTime).toISOString();
      }

      if (password) {
        meetingPayload.password = password;
      }

      const response = await axios.post(
        `${this.apiUrl}/users/me/meetings`,
        meetingPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const meeting = response.data;

      return {
        success: true,
        message: 'Zoom meeting created successfully',
        meetingId: String(meeting.id),
        topic: meeting.topic,
        joinUrl: meeting.join_url,
        startUrl: meeting.start_url,
        password: meeting.password || '',
        hostEmail: meeting.host_email || '',
        duration: meeting.duration,
        startTime: meeting.start_time,
        timezone: meeting.timezone,
        agenda: meeting.agenda || '',
        rawResponse: meeting,
      };
    } catch (error) {
      console.error('Zoom meeting creation error:', error.response?.data || error.message);
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Falling back to mock Zoom meeting creation');
        return this._mockCreateMeeting({ topic, duration, agenda, startTime, attendees });
      }
      throw new Error(`Zoom meeting creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getMeeting(meetingId) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(`${this.apiUrl}/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Zoom meeting:', error.response?.data || error.message);
      throw error;
    }
  }

  async getMeetingRecordings(meetingId) {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(
        `${this.apiUrl}/meetings/${meetingId}/recordings`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching Zoom recordings:', error.response?.data || error.message);
      return null;
    }
  }

  async getMeetingTranscript(meetingId) {
    try {
      const recordings = await this.getMeetingRecordings(meetingId);
      if (!recordings || !recordings.recording_files) {
        return { transcript: '', transcriptUrl: '' };
      }

      const transcriptFile = recordings.recording_files.find(
        (f) => f.file_type === 'TRANSCRIPT' || f.recording_type === 'audio_transcript'
      );

      if (!transcriptFile) {
        return { transcript: '', transcriptUrl: '' };
      }

      const transcriptUrl = transcriptFile.download_url;

      const token = await this.getAccessToken();
      const transcriptResponse = await axios.get(transcriptUrl, {
        headers: { Authorization: `Bearer ${token}` },
        params: { access_token: token },
      });

      const rawVtt = typeof transcriptResponse.data === 'string'
        ? transcriptResponse.data
        : JSON.stringify(transcriptResponse.data);

      const transcript = this._parseVttToText(rawVtt);

      return {
        transcript,
        transcriptUrl,
      };
    } catch (error) {
      console.error('Error fetching Zoom transcript:', error.message);
      return { transcript: '', transcriptUrl: '' };
    }
  }

  _parseVttToText(vtt) {
    if (!vtt) return '';
    const lines = vtt.split('\n');
    const textLines = [];
    for (const line of lines) {
      if (
        line.startsWith('WEBVTT') ||
        line.includes('-->') ||
        line.trim() === '' ||
        /^\d+$/.test(line.trim())
      ) {
        continue;
      }
      textLines.push(line.trim());
    }
    return textLines.join(' ').trim();
  }

  _mockCreateMeeting({ topic, duration, agenda, startTime, attendees }) {
    const mockId = `zoom_${Date.now()}`;
    console.log('🎥 [MOCK] Creating Zoom meeting:', { topic, duration, agenda, attendees: attendees?.length || 0 });

    return {
      success: true,
      message: 'Zoom meeting created successfully (mock)',
      meetingId: mockId,
      topic,
      joinUrl: `https://zoom.us/j/${mockId}`,
      startUrl: `https://zoom.us/s/${mockId}`,
      password: 'mock123',
      hostEmail: process.env.EMAIL_USER || 'host@example.com',
      duration: duration || 60,
      startTime: startTime || new Date().toISOString(),
      timezone: 'UTC',
      agenda: agenda || '',
      rawResponse: null,
    };
  }
}

module.exports = new ZoomService();
