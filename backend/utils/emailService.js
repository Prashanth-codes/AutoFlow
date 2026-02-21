const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendEmail(to, subject, html, cc = null, bcc = null) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html,
      };

      if (cc) mailOptions.cc = cc;
      if (bcc) mailOptions.bcc = bcc;

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }

  async sendBulkEmail(recipients, subject, html) {
    try {
      const promises = recipients.map((email) =>
        this.sendEmail(email, subject, html)
      );
      const results = await Promise.allSettled(promises);
      return results;
    } catch (error) {
      console.error('Bulk email error:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
