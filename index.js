const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

// SMTP (Render ENV)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// small delay (NOT 3 sec)
const delay = (ms) => new Promise(r => setTimeout(r, ms));

app.post("/upload-csv", upload.single("csvFile"), async (req, res) => {
  if (!req.file) {
    return res.json({ success: false, error: "CSV missing" });
  }

  const rows = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => rows.push(row))
    .on("end", async () => {

      let sent = 0;
      let failed = 0;

      for (const row of rows) {

        // 👇 EXACT Google Sheet headers
        const email = row["Contact Email"]?.trim();
        const outreach = row["Outreach Email"]?.trim();

        if (!email || !outreach) {
          failed++;
          continue;
        }

        // subject = first line
        const lines = outreach.split(/\r?\n/);
        const subject = lines[0].substring(0, 120);

        const htmlBody = lines.slice(1).join("<br>");

        try {
          await transporter.sendMail({
            from: `"GLOWAIX" <${process.env.SMTP_USER}>`,
            to: email,
            subject,
            html: htmlBody || outreach,
          });

          sent++;
          await delay(500); // 🔥 FAST (0.5 sec)

        } catch (err) {
          console.error("MAIL ERROR:", err.message);
          failed++;
        }
      }

      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        sent,
        failed,
        total: rows.length,
      });
    });
});

app.get("/", (_, res) => res.send("GLOWAIX Email Server Live"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on", PORT));
