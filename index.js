import express from "express";
import cors from "cors";
import { google } from "googleapis";

const app = express();
// ✅ Allow all external frontends (like CodePen)
app.use(cors({
  origin: "*", // allow sab external URLs
    methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"]
      }));
app.use(express.json());

const GMAIL_CREDENTIALS = {
  client_id: "826021032117-5u10pjmh78ujfrpst6gf95mvp74an447.apps.googleusercontent.com",
  client_secret: "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",
  refresh_token: "1//04hkIl_J8a6eGCgYIARAAGAQSNwF-L9IrfigFdPERbRinCGVG3ttIK8MMypt78zPW1gbF222Xl6dRJHXPV9jLbiyHxjOkIx2WC_U",
};

async function sendEmail(to, subject, message) {
  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CREDENTIALS.client_id,
    GMAIL_CREDENTIALS.client_secret
  );
  oauth2Client.setCredentials({
    refresh_token: GMAIL_CREDENTIALS.refresh_token,
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const rawMessage = [
    `From: GLOWAIX AI <servicebusinesss@gmail.com>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    message,
  ].join("\n");

  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedMessage },
  });

  return result.data;
}

app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    const result = await sendEmail(to, subject, message);
    res.status(200).json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(process.env.PORT || 5000, () =>
  console.log(`🚀 GLOWAIX Email Server Running on port ${process.env.PORT || 5000}`)
);
