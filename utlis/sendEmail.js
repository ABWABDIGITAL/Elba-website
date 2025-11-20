import nodemailer from "nodemailer"
const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: "Alba <no-reply@eshop.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
  });
};

export default sendEmail;