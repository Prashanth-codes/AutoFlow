const emailService = require('../utils/emailService');
const zoomService = require('./zoomService');
const FormSubmission = require('../models/FormSubmission');
const Order = require('../models/Order');
const ZoomMeeting = require('../models/ZoomMeeting');

class ActionExecutor {
  // Resolve {{fieldName}} placeholders in a string using payload values
  resolveTemplate(template, payload) {
    if (!template || typeof template !== 'string') return template;
    return template.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
      return payload[fieldName] !== undefined ? payload[fieldName] : match;
    });
  }

  //Build a resolved config by applying fieldMappings from the action.
  // fieldMappings is { configKey: 'payloadFieldName' } or { configKey: '{{field1}} - {{field2}}' }

  resolveFieldMappings(action, payload) {
    const { config = {}, fieldMappings = {} } = action;
    const resolved = { ...config };

    for (const [configKey, mapping] of Object.entries(fieldMappings)) {
      if (typeof mapping === 'string') {
        // If the mapping contains {{ }}, resolve it as a template
        if (mapping.includes('{{')) {
          resolved[configKey] = this.resolveTemplate(mapping, payload);
        } else {
          // Direct field reference
          resolved[configKey] = payload[mapping] !== undefined ? payload[mapping] : resolved[configKey];
        }
      }
    }

    return resolved;
  }

  async executeAction(action, payload, workflow) {
    const { actionType } = action;

    // Resolve field mappings to build dynamic config
    const config = this.resolveFieldMappings(action, payload);
    const resolvedAction = { ...action, config };

    switch (actionType) {
      case 'SEND_EMAIL':
        return await this.executeSendEmail(config, payload);

      case 'STORE_DB':
        return await this.executeStoreDB(config, payload, workflow);

      case 'CREATE_ZOOM_MEETING':
        return await this.executeCreateZoomMeeting(config, payload, workflow);

      case 'API_REQUEST':
        return await this.executeApiRequest(config, payload);

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  async executeSendEmail(config, payload) {
    const { sendToAdmin, customSubject, customBody, recipientField } = config;
    const sendToUser = config.sendToUser !== undefined ? config.sendToUser : true;
    const recipients = [];

    // Add user email - check recipientField first, then multiple payload fields
    if (sendToUser) {
      let userEmail = null;
      if (recipientField) {
        if (recipientField.includes('@')) {
          userEmail = recipientField;
        } else if (payload[recipientField]) {
          userEmail = payload[recipientField];
        }
      } else if (payload.userEmail) {
        userEmail = payload.userEmail;
      } else if (payload.customerEmail) {
        userEmail = payload.customerEmail;
      } else if (payload.submitterEmail) {
        userEmail = payload.submitterEmail;
      } else if (payload.email) {
        userEmail = payload.email;
      }

      if (userEmail) {
        recipients.push(userEmail);
      }
    }
    if (sendToAdmin && config.adminEmail) {
      recipients.push(config.adminEmail);
    }

    if (recipients.length === 0) {
      throw new Error('No recipients found for email');
    }

    // Resolve custom subject with {{field}} placeholders
    const resolvedSubject = customSubject
      ? this.resolveTemplate(customSubject, payload)
      : 'Notification from Automation Platform';

    // Use custom body if provided; otherwise auto-generate from payload fields
    let html;
    if (customBody) {
      html = this.resolveTemplate(customBody, payload);
      if (!html.includes('<')) {
        html = `<div style="font-family:sans-serif;line-height:1.6">${html.replace(/\n/g, '<br/>')}</div>`;
      }
    } else {
      html = this.generateFieldsEmail(payload);
    }

    const result = await emailService.sendBulkEmail(
      recipients,
      resolvedSubject,
      html
    );

    return {
      recipientCount: recipients.length,
      results: result,
    };
  }

  async executeStoreDB(config, payload, workflow) {
    try {
      // Decide storage based on workflow trigger type
      if (workflow.triggerType === 'ECOMMERCE_ORDER') {
        return await this.storeEcommerceOrder(config, payload, workflow);
      }

      if (workflow.triggerType === 'ZOOM_EVENT') {
        return await this.storeZoomMeetingData(config, payload, workflow);
      }

      if (workflow.triggerType === 'GOOGLE_FORM') {
        return await this.storeFormSubmission(config, payload, workflow);
      }
      return await this.storeFormSubmission(config, payload, workflow);
    } catch (error) {
      throw new Error(`Failed to store in database: ${error.message}`);
    }
  }

  async storeEcommerceOrder(config, payload, workflow) {
    try {
      // Extract order information from payload
      const orderId = payload.orderId || `ORD-${Date.now()}`;
      const customerName = payload.customerName || 'Unknown';
      const customerEmail = payload.customerEmail || payload.email || 'unknown@example.com';
      const productName = payload.productName || 'Unknown Product';
      const amount = payload.amount || 0;
      const currency = payload.currency || 'USD';
      const paymentStatus = payload.paymentStatus || 'PENDING';
      const paymentMethod = payload.paymentMethod || 'UNKNOWN';

      // Create order record
      const order = await Order.create({
        workflowId: workflow._id,
        organizationId: workflow.organizationId,
        orderId,
        customerName,
        customerEmail,
        productName,
        amount,
        currency,
        paymentStatus,
        paymentMethod,
        rawPayload: payload,
        status: 'received',
      });

      return {
        success: true,
        orderId: order._id,
        orderNumber: orderId,
      };
    } catch (error) {
      throw new Error(`Failed to store ecommerce order: ${error.message}`);
    }
  }

  async storeFormSubmission(config, payload, workflow) {
    try {
      // Extract email and name from multiple possible field names
      const submitterEmail = payload.userEmail || payload.customerEmail || payload.submitterEmail || payload.email || 'unknown@example.com';
      const submitterName = payload.userName || payload.customerName || payload.submitterName || payload.name || 'Unknown';

      const formSubmission = await FormSubmission.create({
        workflowId: workflow._id,
        organizationId: workflow.organizationId,
        formType: config.formType || 'custom_form',
        submitterEmail,
        submitterName,
        formData: payload,
        status: 'received',
      });

      return {
        success: true,
        submissionId: formSubmission._id,
      };
    } catch (error) {
      throw new Error(`Failed to store form submission: ${error.message}`);
    }
  }

  async storeZoomMeetingData(config, payload, workflow) {
    try {
      // Check if a ZoomMeeting was already created by the CREATE_ZOOM_MEETING action
      const existingMeeting = await ZoomMeeting.findOne({ workflowId: workflow._id })
        .sort({ createdAt: -1 });

      if (existingMeeting) {
        if (payload.meetingId || payload.meeting_id) {
          existingMeeting.meetingMetadata = {
            ...existingMeeting.meetingMetadata,
            ...payload,
          };
          await existingMeeting.save();
        }
        return {
          success: true,
          zoomMeetingId: existingMeeting._id,
          meetingId: existingMeeting.meetingId,
          message: 'Zoom meeting already stored by CREATE_ZOOM_MEETING action',
        };
      }
      const meetingId = payload.meetingId || payload.meeting_id || `zoom_${Date.now()}`;
      const topic = payload.topic || payload.meetingTopic || 'Zoom Meeting';

      const zoomMeeting = await ZoomMeeting.create({
        workflowId: workflow._id,
        organizationId: workflow.organizationId,
        meetingId: String(meetingId),
        topic,
        agenda: payload.agenda || '',
        hostEmail: payload.hostEmail || payload.host_email || '',
        joinUrl: payload.joinUrl || payload.join_url || 'https://zoom.us',
        startUrl: payload.startUrl || '',
        password: payload.password || '',
        duration: payload.duration || 60,
        startTime: payload.startTime ? new Date(payload.startTime) : new Date(),
        timezone: payload.timezone || 'UTC',
        status: 'scheduled',
        attendees: payload.attendees || [],
        meetingMetadata: payload,
      });

      return {
        success: true,
        zoomMeetingId: zoomMeeting._id,
        meetingId,
      };
    } catch (error) {
      throw new Error(`Failed to store Zoom meeting data: ${error.message}`);
    }
  }

  async executeCreateZoomMeeting(config, payload, workflow) {
    const {
      topic,
      duration,
      agenda,
      startTime,
      timezone,
      password,
      attendees: configAttendees,
      autoRecording,
      sendEmailInvite,
      storeInDatabase,
    } = config;

    let attendees = [];

    if (configAttendees && Array.isArray(configAttendees) && configAttendees.length > 0) {
      attendees = configAttendees;
    }
    if (attendees.length === 0) {
      if (payload.attendees && Array.isArray(payload.attendees)) {
        attendees = payload.attendees;
      } else if (payload.email || payload.userEmail || payload.customerEmail) {
        const email = payload.email || payload.userEmail || payload.customerEmail;
        const name = payload.name || payload.userName || payload.customerName || '';
        attendees = [{ email, name }];
      }
    }
    const resolvedTopic = this.resolveTemplate(topic || 'Meeting', payload);
    const resolvedAgenda = this.resolveTemplate(agenda || '', payload);

    const meetingResult = await zoomService.createMeeting({
      topic: resolvedTopic,
      duration: duration || 60,
      agenda: resolvedAgenda,
      startTime: startTime || null,
      timezone: timezone || 'UTC',
      password: password || '',
      attendees,
      autoRecording: autoRecording || 'cloud',
    });

    const results = {
      meeting: meetingResult,
      emailsSent: [],
      storedInDb: false,
    };
    if (sendEmailInvite !== false && attendees.length > 0) {
      const emailRecipients = attendees.map((a) => a.email).filter(Boolean);

      if (emailRecipients.length > 0) {
        console.log(`📧 Sending Zoom invite emails to ${emailRecipients.length} recipient(s): ${emailRecipients.join(', ')}`);
        const subject = `📹 Zoom Meeting Invite: ${resolvedTopic}`;
        const html = this._generateZoomInviteEmail({
          topic: resolvedTopic,
          joinUrl: meetingResult.joinUrl,
          password: meetingResult.password,
          duration: meetingResult.duration,
          startTime: meetingResult.startTime,
          agenda: resolvedAgenda,
          hostEmail: meetingResult.hostEmail,
        });

        try {
          const emailResults = await emailService.sendBulkEmail(emailRecipients, subject, html);
          results.emailsSent = emailRecipients.map((email, i) => ({
            email,
            status: emailResults[i]?.status || 'fulfilled',
            error: emailResults[i]?.status === 'rejected' ? emailResults[i]?.reason?.message : undefined,
          }));
          const failedEmails = results.emailsSent.filter(e => e.status === 'rejected');
          if (failedEmails.length > 0) {
            console.error(`❌ ${failedEmails.length} email(s) failed:`, failedEmails);
          } else {
            console.log(`✅ All ${emailRecipients.length} Zoom invite email(s) sent successfully`);
          }
        } catch (emailError) {
          console.error('❌ Error sending Zoom invite emails:', emailError.message);
          results.emailsSent = [{ error: emailError.message }];
        }
      } else {
        console.warn('⚠️ Attendees exist but none have valid email addresses');
        results.emailsSent = [];
        results.emailWarning = 'Attendees configured but no valid email addresses found';
      }
    } else if (sendEmailInvite === false) {
      console.log('ℹ️ Email invites disabled for this workflow');
      results.emailsSent = [];
      results.emailWarning = 'Email invites are disabled in config';
    } else {
      console.warn('⚠️ No attendees configured — no Zoom invite emails will be sent');
      results.emailsSent = [];
      results.emailWarning = 'No attendees configured. Add attendees in the workflow trigger config or CREATE_ZOOM_MEETING action to send invite emails.';
    }

    if (storeInDatabase !== false) {
      try {
        const zoomMeeting = await ZoomMeeting.create({
          workflowId: workflow._id,
          organizationId: workflow.organizationId,
          meetingId: meetingResult.meetingId,
          topic: resolvedTopic,
          agenda: resolvedAgenda,
          hostEmail: meetingResult.hostEmail,
          joinUrl: meetingResult.joinUrl,
          startUrl: meetingResult.startUrl || '',
          password: meetingResult.password || '',
          duration: meetingResult.duration,
          startTime: meetingResult.startTime ? new Date(meetingResult.startTime) : new Date(),
          timezone: meetingResult.timezone || 'UTC',
          status: 'scheduled',
          attendees: attendees.map((a) => ({
            name: a.name || '',
            email: a.email,
            notified: sendEmailInvite !== false,
          })),
          meetingMetadata: meetingResult.rawResponse || {},
        });

        results.storedInDb = true;
        results.zoomMeetingDbId = zoomMeeting._id;
      } catch (dbError) {
        console.error('Error storing Zoom meeting in DB:', dbError.message);
        results.storedInDb = false;
        results.dbError = dbError.message;
      }
    }

    return results;
  }

  _generateZoomInviteEmail({ topic, joinUrl, password, duration, startTime, agenda, hostEmail }) {
    const formattedTime = startTime
      ? new Date(startTime).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        })
      : 'Instant Meeting';

    return `
      <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
        <div style="background:linear-gradient(135deg,#2d8cff,#0b5cff);padding:24px 30px;color:#fff">
          <h1 style="margin:0;font-size:22px;font-weight:600">📹 Zoom Meeting Invitation</h1>
        </div>
        <div style="padding:24px 30px">
          <h2 style="color:#1a1a2e;margin:0 0 16px;font-size:20px">${topic}</h2>
          
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:8px 0;color:#666;font-size:14px;width:120px">📅 When</td>
              <td style="padding:8px 0;color:#333;font-size:14px;font-weight:500">${formattedTime}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;font-size:14px">⏱ Duration</td>
              <td style="padding:8px 0;color:#333;font-size:14px;font-weight:500">${duration} minutes</td>
            </tr>
            ${password ? `
            <tr>
              <td style="padding:8px 0;color:#666;font-size:14px">🔑 Password</td>
              <td style="padding:8px 0;color:#333;font-size:14px;font-weight:500">${password}</td>
            </tr>` : ''}
            ${hostEmail ? `
            <tr>
              <td style="padding:8px 0;color:#666;font-size:14px">👤 Host</td>
              <td style="padding:8px 0;color:#333;font-size:14px;font-weight:500">${hostEmail}</td>
            </tr>` : ''}
          </table>

          ${agenda ? `
          <div style="background:#f8f9fa;padding:12px 16px;border-radius:8px;margin-bottom:20px">
            <div style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Agenda</div>
            <div style="color:#333;font-size:14px;line-height:1.5">${agenda.replace(/\n/g, '<br/>')}</div>
          </div>` : ''}

          <div style="text-align:center;margin:24px 0">
            <a href="${joinUrl}" style="display:inline-block;background:#2d8cff;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;letter-spacing:0.3px">
              Join Meeting
            </a>
          </div>

          <div style="background:#f0f4ff;padding:12px 16px;border-radius:8px;margin-top:16px">
            <div style="color:#666;font-size:12px;margin-bottom:4px">Meeting Link</div>
            <a href="${joinUrl}" style="color:#2d8cff;font-size:13px;word-break:break-all">${joinUrl}</a>
          </div>
        </div>

        <div style="background:#f8f9fa;padding:16px 30px;border-top:1px solid #e0e0e0">
          <p style="color:#999;font-size:12px;margin:0;text-align:center">
            Sent by Automation Platform • Powered by Zoom
          </p>
        </div>
      </div>
    `;
  }

  async executeApiRequest(config, payload) {
    const axios = require('axios');
    const {
      method = 'GET',
      url,
      headers: rawHeaders,
      body: rawBody,
      queryParams: rawQueryParams,
    } = config;

    if (!url) {
      throw new Error('API Request: URL is required');
    }

    // Resolve {{field}} placeholders in URL
    const resolvedUrl = this.resolveTemplate(url, payload);

    let parsedHeaders = {};
    if (rawHeaders) {
      try {
        const headersObj = typeof rawHeaders === 'string' ? JSON.parse(rawHeaders) : rawHeaders;
        for (const [key, val] of Object.entries(headersObj)) {
          parsedHeaders[key] = this.resolveTemplate(String(val), payload);
        }
      } catch (e) {
        throw new Error(`API Request: Invalid headers JSON — ${e.message}`);
      }
    }

    // Parse and resolve query params
    let parsedParams = {};
    if (rawQueryParams) {
      try {
        const paramsObj = typeof rawQueryParams === 'string' ? JSON.parse(rawQueryParams) : rawQueryParams;
        for (const [key, val] of Object.entries(paramsObj)) {
          parsedParams[key] = this.resolveTemplate(String(val), payload);
        }
      } catch (e) {
        throw new Error(`API Request: Invalid query params JSON — ${e.message}`);
      }
    }

    // Parse and resolve body
    let parsedBody = undefined;
    if (rawBody && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      try {
        const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
        const resolvedBodyStr = this.resolveTemplate(bodyStr, payload);
        parsedBody = JSON.parse(resolvedBodyStr);
      } catch (e) {
        parsedBody = this.resolveTemplate(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody), payload);
      }
    }

    // Set default Content-Type for requests with body
    if (parsedBody && !parsedHeaders['Content-Type'] && !parsedHeaders['content-type']) {
      parsedHeaders['Content-Type'] = 'application/json';
    }

    try {
      const response = await axios({
        method: method.toUpperCase(),
        url: resolvedUrl,
        headers: parsedHeaders,
        params: Object.keys(parsedParams).length > 0 ? parsedParams : undefined,
        data: parsedBody,
        timeout: 30000,
        validateStatus: () => true, 
      });

      return {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      };
    } catch (error) {
      throw new Error(`API Request failed: ${error.message}`);
    }
  }

  //Auto-generate a formatted email from all payload fields.
  //Used when template is 'custom' but no customBody was provided.
  generateFieldsEmail(payload) {
    const rows = Object.entries(payload)
      .map(([key, val]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        return `<tr><td style="padding:6px 12px;font-weight:600;color:#555;white-space:nowrap">${label}</td><td style="padding:6px 12px">${val}</td></tr>`;
      })
      .join('');

    return `
      <div style="font-family:sans-serif;line-height:1.6;max-width:600px">
        <h2 style="color:#333">Form Submission</h2>
        <table style="border-collapse:collapse;width:100%">
          ${rows}
        </table>
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee" />
        <p style="color:#888;font-size:0.85rem">Sent by Automation Platform</p>
      </div>
    `;
  }

}

module.exports = new ActionExecutor();
