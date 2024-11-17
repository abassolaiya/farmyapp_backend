import nodemailer from "nodemailer";

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "farmyapp@gmail.com",
    pass: "mlju leju rswb iwpk",
  },
});

// Function to send emails
const sendEmail = async (mailOptions) => {
  try {
    mailOptions.html = mailOptions.text;
    await transporter.sendMail(mailOptions);
    // console.log('Email sent successfully');
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

export { sendEmail };
