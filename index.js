// ----------------------------
// 1️⃣ Import all dependencies
// ----------------------------
import express from "express";
import cors from "cors";
import { google } from "googleapis";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";

// ----------------------------
// 2️⃣ Initialize app
// ----------------------------
const app = express();
app.use(cors());
app.use(express.json());

// ----------------------------
// 3️⃣ Gmail credentials + sendEmail function
// ----------------------------
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
                    oauth2Client.setCredentials({ refresh_token: GMAIL_CREDENTIALS.refresh_token });

                      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

                        const rawMessage = [
                            `From: GLOWAIX AI <service@glowaix.com>`,
                                `To: ${to}`,
                                    `Subject: ${subject}`,
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

                                                                              // ----------------------------
                                                                              // 4️⃣ Normal single email route
                                                                              // ----------------------------
                                                                              app.post("/send-email", async (req, res) => {
                                                                                try {
                                                                                    const { to, subject, message } = req.body;
                                                                                        const result = await sendEmail(to, subject, message);
                                                                                            res.status(200).json({ success: true, data: result });
                                                                                              } catch (err) {
                                                                                                  console.error(err);
                                                                                                      res.status(500).json({ success: false, error: err.message });
                                                                                                        }
                                                                                                        });

                                                                                                        // ----------------------------
                                                                                                        // 5️⃣ Upload + Auto Send (CSV)
                                                                                                        // ----------------------------
                                                                                                        const upload = multer({ dest: "uploads/" });

                                                                                                        app.post("/upload-csv", upload.single("file"), async (req, res) => {
                                                                                                          try {
                                                                                                              if (!req.file) return res.status(400).json({ error: "No CSV file uploaded." });

                                                                                                                  const filePath = req.file.path;
                                                                                                                      const clients = [];

                                                                                                                          fs.createReadStream(filePath)
                                                                                                                                .pipe(csv())
                                                                                                                                      .on("data", (row) => clients.push(row))
                                                                                                                                            .on("end", async () => {
                                                                                                                                                    console.log(`✅ CSV Uploaded: ${clients.length} clients`);
                                                                                                                                                            const results = [];

                                                                                                                                                                    for (const client of clients) {
                                                                                                                                                                              const to = client["Contact Email"] || client["Email"];
                                                                                                                                                                                        const outreach = client["Outreach Email"];

                                                                                                                                                                                                  if (to && outreach) {
                                                                                                                                                                                                              const [subjectLine, ...bodyLines] = outreach.split("\n");
                                                                                                                                                                                                                          const subject = subjectLine.replace("Subject:", "").trim();
                                                                                                                                                                                                                                      const message = bodyLines.join("\n").trim();

                                                                                                                                                                                                                                                  try {
                                                                                                                                                                                                                                                                await sendEmail(to, subject, message);
                                                                                                                                                                                                                                                                              console.log(`✅ Sent to ${to}`);
                                                                                                                                                                                                                                                                                            results.push({ to, status: "sent" });
                                                                                                                                                                                                                                                                                                        } catch (e) {
                                                                                                                                                                                                                                                                                                                      console.error(`❌ Error sending to ${to}: ${e.message}`);
                                                                                                                                                                                                                                                                                                                                    results.push({ to, status: "failed", error: e.message });
                                                                                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                                                                                                  }

                                                                                                                                                                                                                                                                                                                                                                          fs.unlinkSync(filePath);

                                                                                                                                                                                                                                                                                                                                                                                  res.status(200).json({
                                                                                                                                                                                                                                                                                                                                                                                            success: true,
                                                                                                                                                                                                                                                                                                                                                                                                      total: results.length,
                                                                                                                                                                                                                                                                                                                                                                                                                sent: results.filter(r => r.status === "sent").length,
                                                                                                                                                                                                                                                                                                                                                                                                                          failed: results.filter(r => r.status === "failed").length,
                                                                                                                                                                                                                                                                                                                                                                                                                                    results
                                                                                                                                                                                                                                                                                                                                                                                                                                            });
                                                                                                                                                                                                                                                                                                                                                                                                                                                  });
                                                                                                                                                                                                                                                                                                                                                                                                                                                    } catch (err) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                        console.error("❌ Upload Error:", err);
                                                                                                                                                                                                                                                                                                                                                                                                                                                            res.status(500).json({ error: err.message });
                                                                                                                                                                                                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                                                                                                                                                                                                              });

                                                                                                                                                                                                                                                                                                                                                                                                                                                              // ----------------------------
                                                                                                                                                                                                                                                                                                                                                                                                                                                              // 6️⃣ Keep-Alive Routes
                                                                                                                                                                                                                                                                                                                                                                                                                                                              // ----------------------------
                                                                                                                                                                                                                                                                                                                                                                                                                                                              app.get("/", (req, res) => {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                res.send("🟢 GLOWAIX Email Server Active");
                                                                                                                                                                                                                                                                                                                                                                                                                                                                });

                                                                                                                                                                                                                                                                                                                                                                                                                                                                app.get("/ping", (req, res) => {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  res.send("OK");
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  });

                                                                                                                                                                                                                                                                                                                                                                                                                                                                  // ----------------------------
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  // 7️⃣ Start Server
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  // ----------------------------
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  app.listen(process.env.PORT || 10000, () => {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                    console.log(`🚀 GLOWAIX Email Server running`);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                    });
