import axios from 'axios';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.GMAIL_PASSKEY,
  },
});

// Email HTML template
const generateEmailTemplate = (name, email, userMessage) => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="color: #007BFF;">📬 New Contact Message</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Message:</strong></p>
    <blockquote style="border-left: 4px solid #007BFF; padding-left: 10px;">${userMessage}</blockquote>
    <p style="font-size: 12px; color: gray;">Reply directly to this email to respond.</p>
  </div>
`;

// Telegram function
const sendTelegramMessage = async (token, chatId, message) => {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await axios.post(url, {
      chat_id: chatId,
      text: message,
    });
    return res.data.ok;
  } catch (err) {
    console.error("Telegram error:", err.response?.data || err.message);
    return false;
  }
};

// Email function
const sendEmail = async ({ name, email, message }) => {
  try {
    await transporter.sendMail({
      from: `"Portfolio" <${process.env.EMAIL_ADDRESS}>`,
      to: process.env.EMAIL_ADDRESS,
      subject: `New Message From ${name}`,
      replyTo: email,
      html: generateEmailTemplate(name, email, message),
    });
    return true;
  } catch (err) {
    console.error("Email error:", err.message);
    return false;
  }
};

export async function POST(req) {
  try {
    const { name, email, message } = await req.json();

    // Basic validation
    if (!name || !email || !message) {
      return NextResponse.json({ success: false, message: "All fields are required." }, { status: 400 });
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return NextResponse.json({ success: false, message: "Telegram credentials are missing." }, { status: 500 });
    }

    const formattedMessage = `📥 New message from ${name}\n\n📧 Email: ${email}\n\n📝 Message:\n${message}`;

    const telegramSent = await sendTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, formattedMessage);
    const emailSent = await sendEmail({ name, email, message });

    if (telegramSent && emailSent) {
      return NextResponse.json({ success: true, message: "Message sent successfully!" }, { status: 200 });
    }

    return NextResponse.json({ success: false, message: "Failed to send message or email." }, { status: 500 });
  } catch (err) {
    console.error("Unhandled Error:", err.message);
    return NextResponse.json({ success: false, message: "Server error occurred." }, { status: 500 });
  }
}
