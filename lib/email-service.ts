// Email Service for Santa Letter Replies

import validator from 'validator';
import { escapeHtml } from './input-sanitization';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface SantaEmailParams {
  parentEmail: string;
  childName: string;
  santaReply: string;
}

/**
 * Get email configuration from environment variables
 */
function getEmailConfig(): EmailConfig {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  };
}

/**
 * Create festive HTML email template for Santa's reply
 * ✅ SECURITY: Escapes all dynamic content to prevent XSS
 */
function createSantaEmailHTML(childName: string, santaReply: string): string {
  // ✅ SECURITY: Escape HTML in dynamic content
  const safeName = escapeHtml(childName);
  const safeReply = escapeHtml(santaReply).replace(/\n/g, '<br>');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src 'unsafe-inline';">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Georgia', 'Times New Roman', serif;
      background: linear-gradient(to bottom, #1a472a 0%, #2d5a3d 100%);
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      border: 5px solid #c41e3a;
    }
    .header {
      background: linear-gradient(135deg, #c41e3a 0%, #8b1428 100%);
      padding: 30px;
      text-align: center;
      border-bottom: 3px solid gold;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 36px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      font-family: 'Brush Script MT', cursive;
    }
    .north-pole {
      color: #ffd700;
      font-size: 14px;
      margin-top: 5px;
      font-style: italic;
    }
    .snowflake {
      display: inline-block;
      font-size: 24px;
      margin: 0 10px;
    }
    .content {
      padding: 40px;
      background: linear-gradient(to bottom, #ffffff 0%, #f9f9f9 100%);
    }
    .letter {
      background: #ffffff;
      padding: 30px;
      border-left: 4px solid #c41e3a;
      border-radius: 8px;
      line-height: 1.8;
      font-size: 16px;
      color: #333333;
      white-space: pre-wrap;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }
    .footer {
      background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%);
      padding: 20px;
      text-align: center;
      color: #ffffff;
      font-size: 12px;
    }
    .divider {
      height: 3px;
      background: linear-gradient(to right, #c41e3a, gold, #2d5a3d);
      margin: 20px 0;
    }
    .ornament {
      display: inline-block;
      width: 12px;
      height: 12px;
      background: #c41e3a;
      border-radius: 50%;
      margin: 0 5px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="snowflake">❄️</span>
      <h1>🎅 Letter from Santa 🎅</h1>
      <span class="snowflake">❄️</span>
      <p class="north-pole">The North Pole Workshop</p>
    </div>
    
    <div class="content">
      <p style="text-align: center; color: #c41e3a; font-size: 18px; margin-bottom: 20px;">
        <strong>Special Delivery for ${safeName}'s Family! 🎄</strong>
      </p>
      
      <div class="divider"></div>
      
      <div class="letter">${safeReply}</div>
      
      <div class="divider"></div>
      
      <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
        <span class="ornament"></span>
        <span class="ornament" style="background: gold;"></span>
        <span class="ornament" style="background: #2d5a3d;"></span>
        <br><br>
        🎁 Keep the magic alive! 🎁
      </p>
    </div>
    
    <div class="footer">
      <p>This letter was magically delivered from Santa's Workshop at the North Pole 🎅</p>
      <p style="margin-top: 10px; font-size: 10px; opacity: 0.8;">
        Ho Ho Ho! Merry Christmas! 🎄✨
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send Santa's reply email to parent
 * ✅ SECURITY: Validates email address before sending
 */
export async function sendSantaReply(params: SantaEmailParams): Promise<boolean> {
  try {
    console.log('📧 Email service: Starting to send email to', params.parentEmail);
    
    // ✅ SECURITY: Validate email address again before sending
    if (!validator.isEmail(params.parentEmail)) {
      console.error('❌ Invalid email address:', params.parentEmail);
      throw new Error('Invalid email address');
    }
    
    // ✅ SECURITY: Block email header injection
    if (/[\r\n]/.test(params.parentEmail)) {
      console.error('❌ Email contains invalid characters');
      throw new Error('Email contains invalid characters');
    }
    
    // Dynamic import of nodemailer to avoid bundling issues
    const nodemailer = await import('nodemailer');
    
    const config = getEmailConfig();
    console.log('📧 SMTP Config:', { host: config.host, port: config.port, user: config.auth.user });
    
    // Validate configuration
    if (!config.auth.user || !config.auth.pass) {
      console.error('❌ Email configuration missing: SMTP_USER and SMTP_PASS required');
      return false;
    }

    console.log('📧 Creating transporter...');
    // Create transporter
    const transporter = nodemailer.default.createTransport(config);

    console.log('📧 Verifying connection...');
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    console.log('📧 Sending email...');
    // Send email
    const info = await transporter.sendMail({
      from: `"Santa Claus 🎅" <${config.auth.user}>`,
      to: params.parentEmail,
      subject: `🎄 A Special Letter from Santa for ${params.childName}! 🎅`,
      text: params.santaReply, // Plain text fallback
      html: createSantaEmailHTML(params.childName, params.santaReply),
    });

    console.log('✅ Santa email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending Santa email:', error);
    return false;
  }
}

/**
 * Test email configuration
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    const nodemailer = await import('nodemailer');
    const config = getEmailConfig();
    
    if (!config.auth.user || !config.auth.pass) {
      return false;
    }

    const transporter = nodemailer.default.createTransport(config);
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email connection test failed:', error);
    return false;
  }
}
