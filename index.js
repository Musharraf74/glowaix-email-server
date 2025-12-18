const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

// Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Delay
const delay = ms => new Promise(res => setTimeout(res, ms));

app.post("/upload-csv", upload.single("csvFile"), async (req, res) => {
  if (!req.file) {
    return res.json({ success: false, error: "No CSV uploaded" });
  }

  let rows = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => rows.push(data))
    .on("end", async () => {

      console.log("CSV HEADERS:", Object.keys(rows[0]));

      let sent = 0;
      let failed = 0;

      for (let row of rows) {

        // 🔥 AUTO PICK EMAIL COLUMN
        const email =
          row["Contact Email"] ||
          row["contact email"] ||
          row["Email"] ||
          row["email"];

        const outreach =
          row["Outreach Email"] ||
          row["outreach email"] ||
          row["Outreach"] ||
          row["Email Body"];

        if (!email || !outreach) {
          failed++;
          continue;
        }

        const subject = outreach.split("\n")[0];
        const body = outreach.replace(/\n/g, "<br>");

        try {
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email.trim(),
            subject: subject.trim(),
            html: body
          });
          sent++;
        } catch (e) {
          console.log("EMAIL ERROR:", e.message);
          failed++;
        }

        await delay(500); // 2 sec (safe)
      }

      res.json({
        success: true,
        sent,
        failed,
        total: rows.length
      });
    });
});

app.get("/", (req, res) => {
  res.send("Bulk Email Server Running ✅");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on", PORT));
