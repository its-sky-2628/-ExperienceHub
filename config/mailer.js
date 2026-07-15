const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  // smtp.gmail.com की जगह डायरेक्ट Google का IPv4 SMTP सर्वर एड्रेस
  host: "74.125.195.108", 
  port: 587,
  secure: false, // TLS के लिए false ही रखें
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // आपका 16-digit App Password
  },
  tls: {
    rejectUnauthorized: false,
    servername: "smtp.gmail.com" // SSL/TLS हैंडशेक के लिए यह डालना ज़रूरी है
  }
});

module.exports = transporter;