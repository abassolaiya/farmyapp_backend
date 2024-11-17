// mailer.js

const nodemailer = require("nodemailer");

// Create a transporter using SMTP or other transport mechanism
const transporter = nodemailer.createTransport({
  // Your mail configuration here (SMTP, SendGrid, etc.)
  service: "gmail", // Example: Gmail service
  auth: {
    user: "your_email@gmail.com", // Your email
    pass: "your_password", // Your password
  },
});

module.exports = transporter;

// Import the configured transporter
const transporter = require("../path/to/mailer"); // Update the path accordingly

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Your logic to generate a verification code, update user model, etc.

    const msg = {
      from: "your_email@gmail.com", // Sender address, should match the transporter's user
      to: email, // Recipient email
      subject: "Password Reset Request",
      text: `Your verification code is: ${verificationCode}`, // Plain text body
      // You can add HTML body if needed: html: '<p>Your HTML content</p>',
    };

    // Send mail with defined transport object
    await transporter.sendMail(msg);

    res
      .status(200)
      .json({ message: "Password reset email sent successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send password reset email." });
  }
};

// Other controller functions using Nodemailer similarly
