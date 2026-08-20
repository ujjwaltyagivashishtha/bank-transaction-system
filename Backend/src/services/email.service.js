const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
    },
});

// Verify the connection configuration if credentials are configured
if (process.env.EMAIL_USER && process.env.CLIENT_ID) {
    transporter.verify((error, success) => {
        if (error) {
            console.warn('Email service notice: Unable to connect to OAuth email server:', error.message);
        } else {
            console.log('Email server is ready to send messages');
        }
    });
}


// Function to send email
const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Backend Ledger" <${process.env.EMAIL_USER}>`, // sender address
            to, // list of receivers
            subject, // Subject line
            text, // plain text body
            html, // html body
        });

        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error('Error sending email:', error);
    }
};


async function sendRegistrationEmail(userEmail, name) {
    const subject = 'Welcome to TRANSACT Ledger Bank!';
    const text = `Hello ${name},\n\nThank you for registering at TRANSACT Ledger Bank. Your digital banking profile has been initialized successfully!\n\nBest regards,\nThe TRANSACT Team`;
    const html = `<p>Hello ${name},</p><p>Thank you for registering at TRANSACT Ledger Bank. Your digital banking profile has been initialized successfully!</p><p>Best regards,<br>The TRANSACT Team</p>`;

    await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, name, amount, toAccount) {
    const subject = 'Transaction Successful!';
    const text = `Hello ${name},\n\nYour transfer of ₹${amount} to account ${toAccount} was executed and settled successfully on the ledger.\n\nBest regards,\nThe TRANSACT Team`;
    const html = `<p>Hello ${name},</p><p>Your transfer of <strong>₹${amount}</strong> to account <code>${toAccount}</code> was executed and settled successfully on the ledger.</p><p>Best regards,<br>The TRANSACT Team</p>`;

    await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionFailureEmail(userEmail, name, amount, toAccount) {
    const subject = 'Transaction Processing Notice';
    const text = `Hello ${name},\n\nWe regret to inform you that your transfer attempt of ₹${amount} to account ${toAccount} could not be settled. Please check your available balance and retry.\n\nBest regards,\nThe TRANSACT Team`;
    const html = `<p>Hello ${name},</p><p>We regret to inform you that your transfer attempt of <strong>₹${amount}</strong> to account <code>${toAccount}</code> could not be settled. Please check your available balance and retry.</p><p>Best regards,<br>The TRANSACT Team</p>`;

    await sendEmail(userEmail, subject, text, html);
}

module.exports = {
    sendRegistrationEmail,
    sendTransactionEmail,
    sendTransactionFailureEmail
};