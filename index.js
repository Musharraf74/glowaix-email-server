const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());

// Upload folder
const upload = multer({ dest: "uploads/" });

// ⭐ SMTP SETTINGS (GMAIL via Render ENV Variables)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// ⭐ Delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.post("/upload-csv", upload.single("csvFile"), async (req, res) => {
    if (!req.file) {
        return res.json({ success: false, error: "No file received" });
    }

    let results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", async () => {
            let sent = 0;
            let failed = 0;

            for (let row of results) {

                const email = row["Contact Email"];        // email column
                const outreach = row["Outreach Email"];    // outreach column

                if (!email || !outreach) {
                    failed++;
                    continue;
                }

                const outreachLines = outreach.split("\n");

                // ⭐ SUBJECT = FIRST LINE of Outreach Email
                const subject = outreachLines[0].trim();

                // ⭐ BODY = Full outreach email without first line
                const body = outreachLines.slice(1).join("\n").trim();

                let mailOptions = {
                    from: process.env.SMTP_USER,
                    to: email,
                    subject: subject,
                    html: body.replace(/\n/g, "<br>")
                };

                try {
                    await transporter.sendMail(mailOptions);
                    sent++;
                } catch (err) {
                    console.log("Sending failed:", err);
                    failed++;
                }

                await delay(3000); // 3 seconds delay
            }

            res.json({
                success: true,
                sent,
                failed,
                total: results.length
            });
        });
});

app.get("/", (req, res) => {
    res.send("Bulk Email Server Running ✔");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
