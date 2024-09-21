const postmark = require('postmark');
require('dotenv').config();

const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);
const dotCom = 'replit.com'
const dotDev = 'replit.dev'
const dotApp = 'replit.app'
const mailOptions = {
  From: process.env.FROM_EMAIL,  
  To: process.env.TO_EMAIL,
  Subject: 'Test Email with supabase confirmation link',
  HtmlBody: '<h2>Confirm your signup</h2>' +
            '<p>Follow this link to confirm your user:</p>' +
            `<p><a href="https://${dotCom}">Confirm your mail</a></p>`
};

client.sendEmail(mailOptions)
  .then(response => {
    console.log('Email sent successfully:', response.MessageID);
  })
  .catch(error => {
    console.error('Error sending email:', error.message);
  });
