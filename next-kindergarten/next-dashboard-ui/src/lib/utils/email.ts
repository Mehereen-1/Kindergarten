import nodemailer from 'nodemailer';

// Create transporter (configure with your SMTP settings)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordEmail(email: string, password: string) {
  // Skip if SMTP not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`Email not sent to ${email} (SMTP not configured). Password: ${password}`);
    return { success: true };
  }

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Your Kindergarten System Login Credentials',
    html: `
      <h2>Welcome to Kindergarten Management System</h2>
      <p>Your account has been created. Here are your login credentials:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Password:</strong> ${password}</p>
      <p><strong>Important:</strong> This password is valid for 2 days. Please log in and change your password immediately.</p>
      <p>After logging in, you can update your profile if needed.</p>
      <p>If you have any questions, contact the administrator.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}