const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);

const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_FILE = path.join(__dirname, "data.json");
const REACT_UMD_DIR = path.join(__dirname, "node_modules", "react", "umd");
const REACTDOM_UMD_DIR = path.join(__dirname, "node_modules", "react-dom", "umd");

app.use(express.json({ limit: "64kb" }));
app.use("/vendor", express.static(REACT_UMD_DIR));
app.use("/vendor", express.static(REACTDOM_UMD_DIR));
app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

function readJsonFileArray(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function writeJsonFileAtomic(filePath, value) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, filePath);
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/history", (req, res) => {
  const history = readJsonFileArray(DATA_FILE);

  const days = Number(req.query.days || 0);
  if (!days || Number.isNaN(days) || days < 0) return res.json(history);

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  res.json(
    history.filter((t) => {
      const time = Date.parse(t?.date || "");
      return Number.isFinite(time) && time >= cutoff;
    })
  );
});

app.post("/save", (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const upiId = typeof body.upiId === "string" ? body.upiId.trim() : "";
  const ref = typeof body.ref === "string" ? body.ref.trim() : "";

  const amountNum = Number(body.amount);
  const amount = Number.isFinite(amountNum) ? Number(amountNum.toFixed(2)) : NaN;

  if (!name) return res.status(400).json({ error: "name is required" });
  if (!Number.isFinite(amount) || amount <= 0)
    return res.status(400).json({ error: "amount must be > 0" });

  const history = readJsonFileArray(DATA_FILE);
  const transaction = {
    name,
    upiId,
    amount,
    date: new Date().toISOString(),
    ref: ref || `upi-${Date.now()}`
  };

  history.unshift(transaction);
  writeJsonFileAtomic(DATA_FILE, history.slice(0, 500));

  res.status(201).json(transaction);
});

app.listen(PORT, () => {
  console.log(`UPI assistant: http://localhost:${PORT}`);
});
