import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import fs from "fs";

const app = express();
const PORT = 3000;

// Initialize Database
const db = new Database("history.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS analysis_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    prediction TEXT,
    confidence REAL,
    metadata TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json({ limit: "10mb" }));

// API Routes
app.get("/api/history", (req, res) => {
  const history = db.prepare("SELECT * FROM analysis_history ORDER BY timestamp DESC LIMIT 10").all();
  res.json(history);
});

app.post("/api/save-analysis", (req, res) => {
  const { filename, prediction, confidence, metadata } = req.body;
  const stmt = db.prepare("INSERT INTO analysis_history (filename, prediction, confidence, metadata) VALUES (?, ?, ?, ?)");
  stmt.run(filename, prediction, confidence, JSON.stringify(metadata));
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
