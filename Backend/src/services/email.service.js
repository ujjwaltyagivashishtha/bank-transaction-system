const nodemailer = require('nodemailer');

let transporter = null;

// Initialize transporter only if valid configuration is provided
if (process.env.NODE_ENV !== 'test' && process.env.EMAIL_USER && process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.REFRESH_TOKEN) {
    try {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USER,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
            },
        });
    } catch (err) {
        console.warn('Email service: Transporter setup skipped:', err.message);
    }
} else if (process.env.NODE_ENV !== 'test' && process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT, 10) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    } catch (err) {
        console.warn('Email service: SMTP setup skipped:', err.message);
    }
}

const sendEmail = async (to, subject, text, html) => {
    if (!transporter || process.env.NODE_ENV === 'test') {
        // In test mode or when email is unconfigured, safely simulate delivery
        return { simulated: true, to, subject };
    }

    try {
        const info = await transporter.sendMail({
            from: `"TRANSACT Ledger Bank" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        // Safe logging without dumping credentials or breaking transaction flow
        console.warn(`Email notification warning [${subject}]: ${error.message || 'Delivery failure'}`);
        return { success: false, error: error.message };
    }
};

async function sendRegistrationEmail(userEmail, name) {
    const subject = 'Welcome to TRANSACT Ledger Bank!';
    const text = `Hello ${name},\n\nThank you for registering at TRANSACT Ledger Bank. Your digital banking profile has been initialized successfully!\n\nBest regards,\nThe TRANSACT Team`;
    const html = `<p>Hello ${name},</p><p>Thank you for registering at TRANSACT Ledger Bank. Your digital banking profile has been initialized successfully!</p><p>Best regards,<br>The TRANSACT Team</p>`;

    return await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, name, amount, toAccount, reference) {
    const subject = 'Transaction Successful — TRANSACT Bank';
    const refStr = reference ? ` (Ref: ${reference})` : '';
    const text = `Hello ${name},\n\nYour transfer of ₹${amount} to account ${toAccount}${refStr} was executed and settled successfully on the double-entry ledger.\n\nBest regards,\nThe TRANSACT Team`;
    const html = `<p>Hello ${name},</p><p>Your transfer of <strong>₹${amount}</strong> to account <code>${toAccount}</code>${refStr} was executed and settled successfully on the immutable double-entry ledger.</p><p>Best regards,<br>The TRANSACT Team</p>`;

    return await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionFailureEmail(userEmail, name, amount, toAccount, reason) {
    const subject = 'Transaction Notice — TRANSACT Bank';
    const text = `Hello ${name},\n\nYour transfer attempt of ₹${amount} to account ${toAccount} could not be settled.${reason ? ' Reason: ' + reason : ''}\n\nBest regards,\nThe TRANSACT Team`;
    const html = `<p>Hello ${name},</p><p>Your transfer attempt of <strong>₹${amount}</strong> to account <code>${toAccount}</code> could not be settled.${reason ? '<br>Reason: ' + reason : ''}</p><p>Best regards,<br>The TRANSACT Team</p>`;

    return await sendEmail(userEmail, subject, text, html);
}

module.exports = {
    sendRegistrationEmail,
    sendTransactionEmail,
    sendTransactionFailureEmail
};