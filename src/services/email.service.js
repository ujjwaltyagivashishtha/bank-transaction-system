const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify email server connection
transporter.verify((error) => {
  if (error) {
    console.error("❌ Email Server Error:", error);
  } else {
    console.log("✅ Email Server is Ready");
  }
});

// Send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Bank Transaction System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("📩 Email Sent:", info.messageId);
  } catch (error) {
    console.error("❌ Error Sending Email:", error);
  }
};

// Send registration email
async function sendRegistrationEmail(userEmail, name) {
  const subject = "🎉 Welcome to Bank Transaction System";

  const text = `
Hello ${name},

Welcome to Bank Transaction System.

Your account has been created successfully.

You can now securely transfer money, view your transactions, and manage your account online.

Thank you for choosing us.

Regards,
Bank Transaction System Team
`;

  const html = `
<div style="max-width:650px;margin:auto;background:#ffffff;border:1px solid #ddd;border-radius:12px;overflow:hidden;font-family:Arial,sans-serif;">
    <div style="background:#1e40af;padding:25px;text-align:center;">
        <h1 style="margin:0;color:white;">🏦 Bank Transaction System</h1>
    </div>

    <div style="padding:30px;">
        <h2 style="color:#1e40af;">Welcome, ${name}! 🎉</h2>

        <p>Your account has been successfully created.</p>

        <p>You can now:</p>

        <ul>
            <li>💳 Transfer Money</li>
            <li>📜 View Transaction History</li>
            <li>🔒 Securely Manage Your Account</li>
        </ul>

        <div style="margin-top:25px;padding:18px;background:#eff6ff;border-left:5px solid #2563eb;border-radius:6px;">
            Thank you for choosing <strong>Bank Transaction System</strong>.
        </div>

        <hr>

        <p style="font-size:13px;color:#666;">
            This is an automated email. Please do not reply.
        </p>
    </div>
</div>
`;

  await sendEmail(userEmail, subject, text, html);
}

// Send successful transaction email
async function sendTransactionEmail(userEmail, name, amount, toAccount) {
  const subject = "✅ Transaction Successful";

  const text = `
Hello ${name},

Your transaction has been completed successfully.

----------------------------------
Amount : ₹${amount}
Recipient : ${toAccount}
Status : SUCCESS
----------------------------------

Thank you for banking with us.

Regards,
Bank Transaction System Team
`;

  const html = `
<div style="max-width:650px;margin:auto;background:#ffffff;border:1px solid #ddd;border-radius:12px;overflow:hidden;font-family:Arial,sans-serif;">
    <div style="background:#16a34a;padding:25px;text-align:center;">
        <h1 style="margin:0;color:white;">✅ Transaction Successful</h1>
    </div>

    <div style="padding:30px;">
        <p>Hello <strong>${name}</strong>,</p>

        <p>Your transaction has been processed successfully.</p>

        <table style="width:100%;border-collapse:collapse;margin-top:25px;">
            <tr>
                <td style="padding:12px;border:1px solid #ddd;"><strong>Amount</strong></td>
                <td style="padding:12px;border:1px solid #ddd;">₹${amount}</td>
            </tr>
            <tr>
                <td style="padding:12px;border:1px solid #ddd;"><strong>Transferred To</strong></td>
                <td style="padding:12px;border:1px solid #ddd;">${toAccount}</td>
            </tr>
            <tr>
                <td style="padding:12px;border:1px solid #ddd;"><strong>Status</strong></td>
                <td style="padding:12px;border:1px solid #ddd;color:#16a34a;font-weight:bold;">SUCCESS</td>
            </tr>
        </table>

        <div style="margin-top:25px;background:#ecfdf5;padding:18px;border-left:5px solid #16a34a;border-radius:6px;">
            Your money has been transferred successfully.
        </div>

        <hr>

        <p style="font-size:13px;color:#666;">
            This is an automated email. Please do not reply.
        </p>
    </div>
</div>
`;

  await sendEmail(userEmail, subject, text, html);
}

// Send failed transaction email
async function sendTransactionFailedEmail(userEmail, name, amount, toAccount) {
  const subject = "❌ Transaction Failed";

  const text = `
Hello ${name},

Unfortunately, your transaction could not be completed.

----------------------------------
Amount : ₹${amount}
Recipient : ${toAccount}
Status : FAILED
----------------------------------

Possible Reasons

• Insufficient Balance
• Invalid Recipient Account
• Temporary Server Issue

Please try again later.

Regards,
Bank Transaction System Team
`;

  const html = `
<div style="max-width:650px;margin:auto;background:#ffffff;border:1px solid #ddd;border-radius:12px;overflow:hidden;font-family:Arial,sans-serif;">
    <div style="background:#dc2626;padding:25px;text-align:center;">
        <h1 style="margin:0;color:white;">❌ Transaction Failed</h1>
    </div>

    <div style="padding:30px;">
        <p>Hello <strong>${name}</strong>,</p>

        <p>We couldn't process your recent transaction.</p>

        <table style="width:100%;border-collapse:collapse;margin-top:25px;">
            <tr>
                <td style="padding:12px;border:1px solid #ddd;"><strong>Amount</strong></td>
                <td style="padding:12px;border:1px solid #ddd;">₹${amount}</td>
            </tr>
            <tr>
                <td style="padding:12px;border:1px solid #ddd;"><strong>Recipient</strong></td>
                <td style="padding:12px;border:1px solid #ddd;">${toAccount}</td>
            </tr>
            <tr>
                <td style="padding:12px;border:1px solid #ddd;"><strong>Status</strong></td>
                <td style="padding:12px;border:1px solid #ddd;color:#dc2626;font-weight:bold;">FAILED</td>
            </tr>
        </table>

        <div style="margin-top:25px;background:#fef2f2;padding:18px;border-left:5px solid #dc2626;border-radius:6px;">
            <strong>Possible Reasons</strong>
            <ul>
                <li>Insufficient account balance.</li>
                <li>Invalid recipient account.</li>
                <li>Temporary banking server issue.</li>
            </ul>
        </div>

        <p style="margin-top:20px;">
            Please verify your details and try again. If the issue continues, contact customer support.
        </p>

        <hr>

        <p style="font-size:13px;color:#666;">
            This is an automated email. Please do not reply.
        </p>
    </div>
</div>
`;

  await sendEmail(userEmail, subject, text, html);
}

module.exports = {
  sendRegistrationEmail,
  sendTransactionEmail,
  sendTransactionFailedEmail,
};
