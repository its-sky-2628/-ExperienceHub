const TransactionalEmailsApi = require('@getbrevo/brevo').TransactionalEmailsApi;
const SendSmtpEmail = require('@getbrevo/brevo').SendSmtpEmail;
require("dotenv").config();

// Brevo API क्लाइंट सेट करना
const apiInstance = new TransactionalEmailsApi();
apiInstance.setApiKey(0, process.env.BREVO_API_KEY);

// Nodemailer जैसा ही एक wrapper फंक्शन ताकि main फ़ाइल में कुछ न बदलना पड़े
const transporter = {
  sendMail: async function ({ to, subject, html }) {
    const sendSmtpEmail = new SendSmtpEmail();
    
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.sender = { name: "ExperienceHub", email: process.env.EMAIL_USER };
    sendSmtpEmail.to = [{ email: to }];

    try {
      const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Email sent successfully via Brevo API:', data);
      return data;
    } catch (error) {
      console.error('Brevo API Error:', error);
      throw error;
    }
  }
};

module.exports = transporter;