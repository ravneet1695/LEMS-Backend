const nodemailer = require('nodemailer');
const config = require('../config/config');

// Create transporter only if email config is available
let transporter = null;
// if (config.email.host && config.email.user) {
//   transporter = nodemailer.createTransporter({
//     host: config.email.host,
//     port: config.email.port,
//     auth: {
//       user: config.email.user,
//       pass: config.email.password,
//     },
//   });
// }

// Send email
exports.sendEmail = async (options) => {
  // Skip if transporter not configured
  if (!transporter) {
    console.log('Email service not configured, skipping email send');
    return;
  }

  const mailOptions = {
    from: `Learning Platform <${config.email.user}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw error, just log it
  }
};

// Email templates
exports.templates = {
  welcome: (name) => `
    <h1>Welcome to Learning Platform!</h1>
    <p>Hello ${name},</p>
    <p>Thank you for joining our platform. We're excited to have you on board!</p>
  `,

  testAssigned: (name, testTitle, startDate, endDate) => `
    <h1>New Test Assigned</h1>
    <p>Hello ${name},</p>
    <p>A new test has been assigned to you:</p>
    <p><strong>${testTitle}</strong></p>
    <p>Start Date: ${new Date(startDate).toLocaleString()}</p>
    <p>End Date: ${new Date(endDate).toLocaleString()}</p>
    <p>Please log in to the platform to take the test.</p>
  `,

  testReminder: (name, testTitle, endDate) => `
    <h1>Test Reminder</h1>
    <p>Hello ${name},</p>
    <p>This is a reminder that your test <strong>${testTitle}</strong> is due soon.</p>
    <p>End Date: ${new Date(endDate).toLocaleString()}</p>
    <p>Please complete the test before the deadline.</p>
  `,

  resultPublished: (name, testTitle, score, percentage) => `
    <h1>Test Results Published</h1>
    <p>Hello ${name},</p>
    <p>Your results for <strong>${testTitle}</strong> are now available.</p>
    <p>Score: ${score}</p>
    <p>Percentage: ${percentage}%</p>
    <p>Log in to view detailed results and analytics.</p>
  `,

  contentApproved: (name, contentTitle) => `
    <h1>Content Approved</h1>
    <p>Hello ${name},</p>
    <p>Your content <strong>${contentTitle}</strong> has been approved!</p>
    <p>It is now available for assignment to learners.</p>
  `,

  contentRejected: (name, contentTitle, reason) => `
    <h1>Content Rejected</h1>
    <p>Hello ${name},</p>
    <p>Your content <strong>${contentTitle}</strong> has been rejected.</p>
    <p>Reason: ${reason}</p>
    <p>Please review and resubmit.</p>
  `,
};
