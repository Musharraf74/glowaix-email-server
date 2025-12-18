app.post("/upload-csv", upload.single("csvFile"), async (req, res) => {
    if (!req.file) {
        return res.json({ success: false, error: "No file received" });
    }

    let rows = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("headers", (headers) => {
            console.log("CSV HEADERS:", headers);
        })
        .on("data", (data) => rows.push(data))
        .on("end", async () => {

            if (rows.length === 0) {
                return res.json({
                    success: false,
                    error: "CSV parsed but no rows found. Check file format."
                });
            }

            let sent = 0, failed = 0;

            for (let row of rows) {

                const email = row["Contact Email"]?.trim();
                const outreach = row["Outreach Email"]?.trim();

                if (!email || !outreach) {
                    failed++;
                    continue;
                }

                const subject = outreach.split("\n")[0];
                const body = outreach.replace(/\n/g, "<br>");

                try {
                    await transporter.sendMail({
                        from: process.env.SMTP_USER,
                        to: email,
                        subject,
                        html: body
                    });
                    sent++;
                } catch (err) {
                    console.log("EMAIL ERROR:", err.message);
                    failed++;
                }

                await delay(300); // Gmail safe delay
            }

            res.json({
                success: true,
                sent,
                failed,
                total: rows.length
            });
        });
});
