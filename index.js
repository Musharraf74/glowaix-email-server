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

// ⭐ SMTP SETTINGS (GMAIL)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "servicemybusinesss@gmail.com",
        pass: "nosqtrkbwhjuyvf"   // <-- YOUR APP PASSWORD (no spaces!)
    }
});

// ⭐ Delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ⭐ BULK EMAIL API
app.post("/upload-csv", upload.single("csvFile"), async (req, res) => {
    if (!req.file) {
        return res.json({ success: false, error: "No file received" });
    }

    let results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", async () => {
            let sent = 0, failed = 0;

            for (let row of results) {
                const email = row.email;
                const subject = row.subject;
                const body = row.body;

                let mailOptions = {
                    from: "servicemybusinesss@gmail.com",
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

                await delay(3000); // 3 seconds delay between emails
            }

            res.json({
                success: true,
                sent: sent,
                failed: failed,
                total: results.length
            });
        });
});

// Test route
app.get("/", (req, res) => {
    res.send("Bulk Email Server Running");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
