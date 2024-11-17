const nodemailer = require("nodemailer");

// This function sends an email using Node Mailer
const sendEmail = async (to, subject, message) => {
  try {
    // Create a transporter using SMTP transport
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "farmyapp@gmail.com", // Your Gmail email address
        pass: "James4:vs17", // Your Gmail password (make sure to use environment variables for security)
      },
    });

    // Setup email data
    const mailOptions = {
      from: "no-reply@farmyapp.com",
      to: to,
      subject: subject,
      text: message,
    };

    // Send mail with defined transport object
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.response}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

module.exports = sendEmail;
