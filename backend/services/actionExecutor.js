const emailService = require('../utils/emailService');
const linkedinService = require('./linkedinService');
const zoomService = require('./zoomService');
const scheduler = require('./scheduler');
const FormSubmission = require('../models/FormSubmission');
const Order = require('../models/Order');

class ActionExecutor {
  async executeAction(action, payload, workflow) {
    const { actionType, config } = action;

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
    const { sendToUser, sendToAdmin, subject, template } = config;
    const recipients = [];

    // Add user email - check multiple payload fields for email
    if (sendToUser) {
      let userEmail = null;
      
      // Try different field names for user email
      if (payload.userEmail) {
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

    // Simple HTML template
    const html = this.generateEmailTemplate(template || 'default', payload);

    const result = await emailService.sendBulkEmail(
      recipients,
      subject || 'Notification from Automation Platform',
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
    const { content, mediaUrl } = config;
    const postContent = content || payload.postContent || 'Check this out!';

    // Call LinkedIn service
    const result = await linkedinService.postToLinkedIn(postContent, mediaUrl);

    return result;
  }

  async executeSchedulePost(config, payload, workflow) {
    const { platform, content, scheduledFor, mediaUrl } = config;

    if (!platform || !content || !scheduledFor) {
      throw new Error('Missing required config: platform, content, scheduledFor');
    }

    // Schedule using cron
    const result = await scheduler.schedulePost(
      workflow._id,
      platform,
      content,
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
