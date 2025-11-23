const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

// SMTP
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

// Normalize function
const normalize = (str) =>
    str ? str.replace(/\s+/g, " ").trim().toLowerCase() : "";

app.post("/upload-csv", upload.single("csvFile"), async (req, res) => {
    if (!req.file) return res.json({ success: false, error: "No file received" });

    let rows = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => rows.push(data))
        .on("end", async () => {
            let sent = 0,
                failed = 0;

            for (let row of rows) {
                // Detect columns dynamically
                let email = "";
                let outreach = "";

                for (let key in row) {
                    let cleanKey = normalize(key);

                    if (cleanKey.includes("contact") && cleanKey.includes("email"))
                        email = row[key];

                    if (cleanKey.includes("outreach"))
                        outreach = row[key];
                }

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
                        subject,
                        html: body,
                    });
                    sent++;
                } catch (e) {
                    failed++;
                }

                await delay(3000);
            }

            res.json({ success: true, sent, failed, total: rows.length });
        });
});

app.get("/", (req, res) => res.send("Bulk Email Server Running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
