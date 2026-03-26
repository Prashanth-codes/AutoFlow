const crypto = require('crypto');
const ZoomMeeting = require('../models/ZoomMeeting');
const zoomService = require('../services/zoomService');
const emailService = require('../utils/emailService');

function verifyZoomWebhook(req) {
  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
  if (!secret) {
    console.warn('ZOOM_WEBHOOK_SECRET_TOKEN not configured — skipping verification');
    return true;
  }

  const signature = req.headers['x-zm-signature'];
  const timestamp = req.headers['x-zm-request-timestamp'];

  if (!signature || !timestamp) return false;

  const message = `v0:${timestamp}:${JSON.stringify(req.body)}`;
  const hashForVerify = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  const expectedSignature = `v0=${hashForVerify}`;

  return signature === expectedSignature;
}


exports.handleZoomWebhook = async (req, res) => {
  try {
    const { event, payload } = req.body;

    if (event === 'endpoint.url_validation') {
      const plainToken = payload?.plainToken;
      const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '';
      const hashForValidate = crypto
        .createHmac('sha256', secret)
        .update(plainToken)
        .digest('hex');

      return res.status(200).json({
        plainToken,
        encryptedToken: hashForValidate,
      });
    }

    if (!verifyZoomWebhook(req)) {
      console.warn('Zoom webhook signature verification failed');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    console.log(`Zoom webhook event: ${event}`);

    if (event === 'meeting.ended') {
      await handleMeetingEnded(payload);
      return res.status(200).json({ success: true, message: 'Meeting ended event processed' });
    }

    if (event === 'meeting.started') {
      await handleMeetingStarted(payload);
      return res.status(200).json({ success: true, message: 'Meeting started event processed' });
    }

    if (event === 'recording.completed') {
      await handleRecordingCompleted(payload);
      return res.status(200).json({ success: true, message: 'Recording completed event processed' });
    }

    if (event === 'recording.transcript_completed') {
      await handleTranscriptCompleted(payload);
      return res.status(200).json({ success: true, message: 'Transcript completed event processed' });
    }

    return res.status(200).json({ success: true, message: `Event ${event} received` });
  } catch (error) {
    console.error('Zoom webhook error:', error);
    return res.status(500).json({ success: false, message: 'Error processing Zoom webhook' });
  }
};

async function handleMeetingStarted(payload) {
  const meetingId = String(payload?.object?.id || '');
  if (!meetingId) return;

  const meeting = await ZoomMeeting.findOne({ meetingId });
  if (!meeting) {
    console.log(`No stored Zoom meeting found for meetingId: ${meetingId}`);
    return;
  }

  meeting.status = 'started';
  meeting.meetingMetadata = {
    ...meeting.meetingMetadata,
    startedEvent: payload,
  };
  await meeting.save();
  console.log(` Zoom meeting ${meetingId} marked as started`);
}


async function handleMeetingEnded(payload) {
  const meetingId = String(payload?.object?.id || '');
  if (!meetingId) return;

  const meeting = await ZoomMeeting.findOne({ meetingId });
  if (!meeting) {
    console.log(`No stored Zoom meeting found for meetingId: ${meetingId}`);
    return;
  }

  meeting.status = 'ended';
  meeting.endedAt = new Date(payload?.object?.end_time || Date.now());
  meeting.actualDuration = payload?.object?.duration || 0;
  meeting.participantCount = payload?.object?.participant_count || 0;
  meeting.meetingMetadata = {
    ...meeting.meetingMetadata,
    endedEvent: payload,
  };

  await meeting.save();
  console.log(`Zoom meeting ${meetingId} marked as ended (duration: ${meeting.actualDuration}min, participants: ${meeting.participantCount})`);

  setTimeout(async () => {
    try {
      await fetchAndStoreTranscript(meetingId);
    } catch (err) {
      console.log(`Transcript not yet available for meeting ${meetingId} — will be fetched on recording.completed`);
    }
  }, 30000);
}

async function handleRecordingCompleted(payload) {
  const meetingId = String(payload?.object?.id || '');
  if (!meetingId) return;

  const meeting = await ZoomMeeting.findOne({ meetingId });
  if (!meeting) {
    console.log(`No stored Zoom meeting found for meetingId: ${meetingId}`);
    return;
  }

  const recordingFiles = payload?.object?.recording_files || [];
  const videoFile = recordingFiles.find(
    (f) => f.file_type === 'MP4' || f.recording_type === 'shared_screen_with_speaker_view'
  );
  if (videoFile) {
    meeting.recordingUrl = videoFile.download_url || '';
  }
  const transcriptFile = recordingFiles.find(
    (f) => f.file_type === 'TRANSCRIPT' || f.recording_type === 'audio_transcript'
  );
  if (transcriptFile) {
    meeting.transcriptUrl = transcriptFile.download_url || '';
  }

  meeting.meetingMetadata = {
    ...meeting.meetingMetadata,
    recordingEvent: payload,
  };

  await meeting.save();
  console.log(`Recording stored for meeting ${meetingId}`);
  await fetchAndStoreTranscript(meetingId);
  await sendMeetingSummaryEmail(meeting);
}

async function handleTranscriptCompleted(payload) {
  const meetingId = String(payload?.object?.id || '');
  if (!meetingId) return;

  await fetchAndStoreTranscript(meetingId);
}

async function fetchAndStoreTranscript(meetingId) {
  const meeting = await ZoomMeeting.findOne({ meetingId });
  if (!meeting) return;

  try {
    const { transcript, transcriptUrl } = await zoomService.getMeetingTranscript(meetingId);

    if (transcript) {
      meeting.transcript = transcript;
      if (transcriptUrl) meeting.transcriptUrl = transcriptUrl;
      await meeting.save();
      console.log(`📝 Transcript stored for meeting ${meetingId} (${transcript.length} chars)`);
    }
  } catch (error) {
    console.error(`Error fetching transcript for meeting ${meetingId}:`, error.message);
  }
}

async function sendMeetingSummaryEmail(meeting) {
  if (!meeting.attendees || meeting.attendees.length === 0) return;

  const recipients = meeting.attendees.map((a) => a.email).filter(Boolean);
  if (recipients.length === 0) return;

  const subject = `📋 Meeting Summary: ${meeting.topic}`;
  const html = `
    <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
      <div style="background:linear-gradient(135deg,#2d8cff,#0b5cff);padding:24px 30px;color:#fff">
        <h1 style="margin:0;font-size:22px;font-weight:600">📋 Meeting Summary</h1>
      </div>
      <div style="padding:24px 30px">
        <h2 style="color:#1a1a2e;margin:0 0 16px;font-size:20px">${meeting.topic}</h2>
        
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr>
            <td style="padding:8px 0;color:#666;font-size:14px;width:140px">Status</td>
            <td style="padding:8px 0;color:#333;font-size:14px;font-weight:500">Meeting Ended</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;font-size:14px">Duration</td>
            <td style="padding:8px 0;color:#333;font-size:14px;font-weight:500">${meeting.actualDuration || meeting.duration} minutes</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;font-size:14px">Participants</td>
            <td style="padding:8px 0;color:#333;font-size:14px;font-weight:500">${meeting.participantCount || 'N/A'}</td>
          </tr>
          ${meeting.endedAt ? `
          <tr>
            <td style="padding:8px 0;color:#666;font-size:14px">Ended At</td>
            <td style="padding:8px 0;color:#333;font-size:14px;font-weight:500">${new Date(meeting.endedAt).toLocaleString()}</td>
          </tr>` : ''}
        </table>

        ${meeting.transcript ? `
        <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin-bottom:16px">
          <div style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Meeting Transcript</div>
          <div style="color:#333;font-size:13px;line-height:1.6;max-height:300px;overflow-y:auto">
            ${meeting.transcript.substring(0, 2000)}${meeting.transcript.length > 2000 ? '...' : ''}
          </div>
        </div>` : '<p style="color:#888;font-size:14px">Transcript will be available once Zoom finishes processing the recording.</p>'}

        ${meeting.recordingUrl ? `
        <div style="text-align:center;margin:20px 0">
          <a href="${meeting.recordingUrl}" style="display:inline-block;background:#2d8cff;color:#fff;padding:12px 30px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
            View Recording
          </a>
        </div>` : ''}
      </div>

      <div style="background:#f8f9fa;padding:16px 30px;border-top:1px solid #e0e0e0">
        <p style="color:#999;font-size:12px;margin:0;text-align:center">
          Sent by Automation Platform • Powered by Zoom
        </p>
      </div>
    </div>
  `;

  try {
    await emailService.sendBulkEmail(recipients, subject, html);
    console.log(`📧 Post-meeting summary sent to ${recipients.length} attendee(s)`);
  } catch (error) {
    console.error('Error sending meeting summary email:', error.message);
  }
}

exports.getZoomMeetings = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { organizationId } = req.user;

    const meetings = await ZoomMeeting.find({
      workflowId,
      organizationId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: meetings.length,
      meetings,
    });
  } catch (error) {
    console.error('Get Zoom meetings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Zoom meetings',
      error: error.message,
    });
  }
};

exports.getZoomMeeting = async (req, res) => {
  try {
    const { meetingDbId } = req.params;
    const { organizationId } = req.user;

    const meeting = await ZoomMeeting.findOne({
      _id: meetingDbId,
      organizationId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Zoom meeting not found',
      });
    }

    res.status(200).json({
      success: true,
      meeting,
    });
  } catch (error) {
    console.error('Get Zoom meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Zoom meeting',
      error: error.message,
    });
  }
};
