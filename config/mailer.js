const SibApiV3Sdk = require("sib-api-v3-sdk");

const defaultClient = SibApiV3Sdk.ApiClient.instance;

const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const transporter = {

    async sendMail({ to, subject, html }) {

        const email = new SibApiV3Sdk.SendSmtpEmail();

        email.sender = {
            name: "ExperienceHub",
            email: process.env.EMAIL_USER
        };

        email.to = [
            { email: to }
        ];

        email.subject = subject;
        email.htmlContent = html;

        return await apiInstance.sendTransacEmail(email);

    }

};

module.exports = transporter;