// utils/sendEmail.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.titan.email",
  port: process.env.SMTP_PORT,                // SSL port
  secure: false,             // Titan requires secure=true for port 465
  auth: {
    user: process.env.EMAIL_USERNAME, 
    pass: process.env.EMAIL_PASSWORD,
  },
});

console.log("SMTP DEBUG:", {
  EMAIL_USERNAME: process.env.EMAIL_USERNAME,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? "(loaded)" : "(empty)",
});

// Verify connection
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ Titan SMTP connection failed:", err);
  } else {
    console.log("✅ Titan SMTP server ready");
  }
});

export const sendEmail = async ({ to, subject, message }) => {
  try {
    await transporter.sendMail({
      from: `"Elba E-Commerce" <${process.env.EMAIL_FROM || process.env.EMAIL_USERNAME}>`,
      to,
      subject,
      text: message,
    });

    return true;
  } catch (err) {
    console.error("❌ Titan email sending failed:", err);
    throw new Error("Email sending failed");
  }
};

export const sendCodeEmail = async (email, code, title = "Reset Password", name = "User") => {
  const message = `Hello ${name},\n\nYour ${title} code is: ${code}\n\nThis code expires in 10 minutes.`;

  return sendEmail({
    to: email,
    subject: title,
    message,
  });
};

export default sendEmail;
