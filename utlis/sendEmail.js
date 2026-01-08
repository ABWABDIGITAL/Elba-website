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

export const sendCodeEmail = async ({ email, firstName, lastName, resetLink }) => {
  const userName = `${firstName} ${lastName}`;
  
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إعادة تعيين كلمة المرور - متجر ELBA</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Cairo', Arial, sans-serif;
            background-color: #f5f7fa;
            padding: 20px;
            color: #333;
            line-height: 1.6;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        }
        
        .header {
            background: linear-gradient(135deg, #0024d7ff 0%, #021b7cff 100%);
            padding: 30px;
            text-align: center;
            color: white;
        }
        
        .logo {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
        }
        
        .title {
            font-size: 22px;
            font-weight: 600;
            margin-top: 15px;
        }
        
        .content {
            padding: 40px 35px;
        }
        
        .greeting {
            font-size: 20px;
            color: #2d3748;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .message {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 25px;
            line-height: 1.7;
        }
        
        .reset-button {
            display: inline-block;
            color: white;
            border: 1px solid linear-gradient(135deg, #0024d7ff 0%, #021b7cff 100%);
            padding: 16px 40px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 700;
            font-size: 16px;
            margin: 25px 0;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .reset-button:hover {
            transform: translateY(-2px);
        }
        
        .link-container {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
            border-right: 4px solid #667eea;
        }
        
        .link-text {
            font-size: 14px;
            color: #ffffffff;
            margin-bottom: 10px;
            font-weight: 500;
        }
        
        .reset-link {
            word-break: break-all;
            font-size: 14px;
            color: #2d6a4f;
            text-decoration: none;
            direction: ltr;
            display: block;
            padding: 10px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-family: monospace;
        }
        
        .warning {
            background: #fff8e1;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            border-right: 4px solid #ffb300;
        }
        
        .warning-title {
            display: flex;
            align-items: center;
            color: #e65100;
            font-weight: 700;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 25px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
        }
        
        .footer-text {
            color: #718096;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .brand {
            color: #667eea;
            font-weight: 700;
            font-size: 18px;
            margin-top: 5px;
        }
        
        .note {
            font-size: 13px;
            color: #a0aec0;
            margin-top: 25px;
            font-style: italic;
        }
        
        @media (max-width: 600px) {
            .content {
                padding: 30px 20px;
            }
            
            .header {
                padding: 25px 20px;
            }
            
            .reset-button {
                padding: 14px 30px;
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">ELBA</div>
            <div class="title">إعادة تعيين كلمة المرور</div>
        </div>
        
        <div class="content">
            <h2 class="greeting">مرحباً ${userName} 👋</h2>
            
            <p class="message">
                لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في متجر ELBA. 
                يمكنك استخدام الرابط أدناه لإنشاء كلمة مرور جديدة.
            </p>
            
            <div style="text-align: center;">
                <a href="${resetLink}" class="reset-button text-white">
                    إعادة تعيين كلمة المرور
                </a>
            </div>
            <div class="footer">
                <p class="footer-text">إذا لم تقم بطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.</p>
                <p class="footer-text">مع تحياتنا،</p>
                <div class="brand">فريق متجر ELBA الإلكتروني</div>
                <p class="note">نحن هنا لمساعدتك في أي وقت. لا تتردد في التواصل معنا.</p>
            </div>
        </div>
    </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: "إعادة تعيين كلمة المرور - متجر ELBA",
    html,
  });
};

export default sendEmail;
