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

// ⭐ SMTP SETTINGS (from Render ENV)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.post("/upload-csv", upload.single("csvFile"), async (req, res) => {
    if (!req.file) {
        return res.json({ success: false, error: "No file received" });
    }

    let rows = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => rows.push(data))
        .on("end", async () => {
            let sent = 0, failed = 0;

            for (let row of rows) {

                const email = row["Contact Email"]?.trim();
                const outreach = row["Outreach Email"]?.trim();

                if (!email || !outreach) {
                    failed++;
                    continue;
                }

                // Subject = first line of Outreach Email
                const subject = outreach.split("\n")[0];

                // Body = full Outreach Email
                const body = outreach.replace(/\n/g, "<br>");

                const mailOptions = {
                    from: process.env.SMTP_USER,
                    to: email,
                    subject: subject,
                    html: body
                };

                try {
                    await transporter.sendMail(mailOptions);
                    sent++;
                } catch (err) {
                    failed++;
                }

                await delay(3000);
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
    res.send("Bulk Email Server Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
