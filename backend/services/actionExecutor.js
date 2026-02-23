const emailService = require('../utils/emailService');
const linkedinService = require('./linkedinService');
const zoomService = require('./zoomService');
const scheduler = require('./scheduler');
const FormSubmission = require('../models/FormSubmission');
const Order = require('../models/Order');

class ActionExecutor {
  /**
   * Resolve {{fieldName}} placeholders in a string using payload values
   */
  resolveTemplate(template, payload) {
    if (!template || typeof template !== 'string') return template;
    return template.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
      return payload[fieldName] !== undefined ? payload[fieldName] : match;
    });
  }

  /**
   * Build a resolved config by applying fieldMappings from the action.
   * fieldMappings is { configKey: 'payloadFieldName' } or { configKey: '{{field1}} - {{field2}}' }
   */
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

      case 'ASSIGN_EMPLOYEE':
        return await this.executeAssignEmployee(config, payload, workflow);

      case 'POST_LINKEDIN':
        return await this.executePostLinkedIn(config, payload);

      case 'SCHEDULE_POST':
        return await this.executeSchedulePost(config, payload, workflow);

      case 'CREATE_ZOOM_MEETING':
        return await this.executeCreateZoomMeeting(config, payload);

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  async executeSendEmail(config, payload) {
    const { sendToAdmin, subject, template, customSubject, customBody, recipientField } = config;
    // Default sendToUser to true when not explicitly set (matches frontend default)
    const sendToUser = config.sendToUser !== undefined ? config.sendToUser : true;
    const recipients = [];

    // Add user email - check recipientField first, then multiple payload fields
    if (sendToUser) {
      let userEmail = null;

      // recipientField may already be resolved to the actual email via fieldMappings,
      // or it may still be a payload key name — handle both
      if (recipientField) {
        if (recipientField.includes('@')) {
          // Already resolved to an email address
          userEmail = recipientField;
        } else if (payload[recipientField]) {
          // Still a field name reference
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

    // Add admin email (from config)
    if (sendToAdmin && config.adminEmail) {
      recipients.push(config.adminEmail);
    }

    if (recipients.length === 0) {
      throw new Error('No recipients found for email');
    }

    // Resolve custom subject with {{field}} placeholders
    const resolvedSubject = customSubject
      ? this.resolveTemplate(customSubject, payload)
      : subject || 'Notification from Automation Platform';

    // If customBody is set, use it (resolved); otherwise fall back to template
    let html;
    if (customBody) {
      html = this.resolveTemplate(customBody, payload);
      // Wrap in basic HTML if it doesn't contain HTML tags
      if (!html.includes('<')) {
        html = `<div style="font-family:sans-serif;line-height:1.6">${html.replace(/\n/g, '<br/>')}</div>`;
      }
    } else if (template === 'custom') {
      // User chose "Custom" but left body empty — auto-generate from payload fields
      html = this.generateFieldsEmail(payload);
    } else {
      html = this.generateEmailTemplate(template || 'default', payload);
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

      if (workflow.triggerType === 'GOOGLE_FORM') {
        return await this.storeFormSubmission(config, payload, workflow);
      }

      // Default fallback for other triggers
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

  async executeAssignEmployee(config, payload, workflow) {
    // Mock employee assignment
    const { requiredSkill, employees } = payload;

    if (!employees || employees.length === 0) {
      throw new Error('No employees available for assignment');
    }

    // Simple assignment logic - pick first matching or random
    const assignedEmployee = employees[0];

    // Send notification email to assigned employee
    await emailService.sendEmail(
      assignedEmployee.email || 'employee@example.com',
      'New Project Assignment',
      `<p>You have been assigned to a new project requiring ${requiredSkill} skills.</p>`
    );

    return {
      assignedTo: assignedEmployee,
      skill: requiredSkill,
    };
  }

  async executePostLinkedIn(config, payload) {
    const { content, contentTemplate, mediaUrl } = config;
    let postContent = content || payload.postContent || 'Check this out!';

    // If contentTemplate is set, resolve placeholders
    if (contentTemplate) {
      postContent = this.resolveTemplate(contentTemplate, payload);
    }

    // Call LinkedIn service
    const result = await linkedinService.postToLinkedIn(postContent, mediaUrl);

    return result;
  }

  async executeSchedulePost(config, payload, workflow) {
    const { platform, content, contentTemplate, scheduledFor, mediaUrl } = config;

    if (!platform || (!content && !contentTemplate) || !scheduledFor) {
      throw new Error('Missing required config: platform, content/contentTemplate, scheduledFor');
    }

    // Resolve template if set
    const resolvedContent = contentTemplate
      ? this.resolveTemplate(contentTemplate, payload)
      : content;

    // Schedule using setTimeout (pass full workflow for organizationId access)
    const result = await scheduler.schedulePost(
      workflow,
      platform,
      resolvedContent,
      new Date(scheduledFor),
      mediaUrl
    );

    return result;
  }

  async executeCreateZoomMeeting(config, payload) {
    const { topic, duration, startTime } = config;

    // Call Zoom service
    const result = await zoomService.createMeeting(
      topic || payload.topic || 'Meeting',
      duration || 60,
      startTime || new Date()
    );

    return result;
  }

  /**
   * Auto-generate a formatted email from all payload fields.
   * Used when template is 'custom' but no customBody was provided.
   */
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

  generateEmailTemplate(template, payload) {
    // Extract user name from multiple possible field names
    const userName = payload.userName || payload.customerName || payload.submitterName || payload.name || 'User';
    const userEmail = payload.userEmail || payload.customerEmail || payload.submitterEmail || payload.email || 'N/A';
    
    const templates = {
      default: `
        <h2>Notification</h2>
        <p>Hello ${userName},</p>
        <p>Your request has been processed successfully.</p>
        <hr />
        <h3>Details:</h3>
        <pre>${JSON.stringify(payload, null, 2)}</pre>
        <p>Thank you!</p>
      `,
      form_confirmation: `
        <h2>Thank You for Your Submission!</h2>
        <p>Hello ${userName},</p>
        <p>We have received your form submission. Thank you for reaching out!</p>
        <hr />
        <h3>Submission Details:</h3>
        <p><strong>Name:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Message:</strong> ${payload.message || 'N/A'}</p>
        <p><strong>Submitted at:</strong> ${payload.timestamp || new Date().toISOString()}</p>
        <hr />
        <p>We will get back to you soon!</p>
      `,
      order_confirmation: `
        <h2>Order Confirmation</h2>
        <p>Hello ${userName},</p>
        <p>Thank you for your order!</p>
        <hr />
        <h3>Order Details:</h3>
        <p><strong>Order ID:</strong> ${payload.orderId || 'N/A'}</p>
        <p><strong>Product:</strong> ${payload.productName || 'N/A'}</p>
        <p><strong>Amount:</strong> $${payload.amount || '0'}</p>
        <p><strong>Status:</strong> ${payload.paymentStatus || 'Pending'}</p>
        <hr />
        <p>Thank you for your business!</p>
      `,
      form_submission: `
        <h2>Form Submission Received</h2>
        <p>Hello ${userName},</p>
        <p>We received your submission:</p>
        <hr />
        <pre>${JSON.stringify(payload, null, 2)}</pre>
      `,
    };

    return templates[template] || templates.default;
  }
}

module.exports = new ActionExecutor();
