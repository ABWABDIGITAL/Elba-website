// utils/sendEmail.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.titan.email",
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify((err) => {
  if (err) console.error("❌ Titan SMTP error:", err);
  else console.log("✅ Titan SMTP connected");
});

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    await transporter.sendMail({
      from: `"Elba E-Commerce" <${process.env.EMAIL_FROM || process.env.EMAIL_USERNAME}>`,
      to,
      subject,
      text,
      html,
    });

    return true;
  } catch (err) {
    console.error("❌ Titan email sending failed:", err);
    throw new Error("Email sending failed");
  }
};

export const sendCodeEmail = async ({ email, name, resetLink }) => {
  const html = `
  <div style="font-family: Arial; direction: rtl;">
    <h2>مرحباً ${name}</h2>
    <p>لقد طلبت إعادة تعيين كلمة المرور.</p>

   

    <p>أو يمكنك إعادة تعيين كلمة المرور مباشرة عبر الرابط التالي:</p>

    <a href="${resetLink}" 
       style="display:inline-block; padding:10px 20px; background:#007bff; color:white;
              border-radius:5px; text-decoration:none;">
      إعادة تعيين كلمة المرور
    </a>

    <p style="margin-top:20px;">سينتهي هذا الرمز/الرابط خلال 10 دقائق.</p>

    <hr/>
    <p>فريق متجر ELBA الإلكتروني</p>
  </div>
  `;

  return sendEmail({
    to: email,
    subject: "إعادة تعيين كلمة المرور",
    html,
  });
};

export default sendEmail;
