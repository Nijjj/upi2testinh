/* global React, ReactDOM */

const h = React.createElement;

function formatINR(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return "INR 0.00";
  return `INR ${num.toFixed(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value || "");
  } catch (_e) {
    return value || "";
  }
}

function parseUpiUri(text) {
  const raw = String(text || "").trim();
  if (!raw) return { ok: false, error: "Empty input" };
  if (!raw.toLowerCase().startsWith("upi://pay?")) {
    return { ok: false, error: "Not a upi://pay URI" };
  }

  const q = raw.split("?", 2)[1] || "";
  const pairs = q.split("&").filter(Boolean);
  const map = {};
  for (const part of pairs) {
    const [k, v = ""] = part.split("=", 2);
    if (!k) continue;
    map[k] = safeDecode(v.replace(/\+/g, "%20"));
  }

  const upiId = String(map.pa || "").trim();
  const name = String(map.pn || "").trim();
  const amount = map.am ? Number(map.am) : NaN;

  return {
    ok: true,
    raw,
    upiId,
    name,
    amount: Number.isFinite(amount) ? amount : "",
    note: String(map.tn || "").trim()
  };
}

function clampInt(n, min, max) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function buildDialString(number, mobile_or_upi, amount, delays) {
  const num = String(number || "").trim();
  const target = String(mobile_or_upi || "").trim();
  const amt = String(amount || "").trim();

  const d1 = ",".repeat(clampInt(delays.step1, 0, 10));
  const d2 = ",".repeat(clampInt(delays.step2, 0, 10));
  const d3 = ",".repeat(clampInt(delays.step3, 0, 10));
  const d4 = ",".repeat(clampInt(delays.step4, 0, 10));

  // Format: tel:<number>,,2,,1,,<mobile_or_upi>,,<amount>
  return `tel:${num}${d1}2${d2}1${d3}${target}${d4}${amt}`;
}

function useStoredState(key, initialValue) {
  const [value, setValue] = React.useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initialValue;
      const parsed = JSON.parse(raw);
      // Migration: rename digits -> mobileNumber in presets
      if (key === "upi.presets" && Array.isArray(parsed)) {
        return parsed.map(p => ({
          ...p,
          mobileNumber: p.mobileNumber || p.digits || ""
        }));
      }
      return parsed;
    } catch (_e) {
      return initialValue;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_e) {
      // ignore
    }
  }, [key, value]);

  return [value, setValue];
}


function Button(props) {
  const className =
    "btn " +
    (props.variant === "cta"
      ? "btnCta"
      : props.variant === "primary"
      ? "btnPrimary"
      : props.variant === "danger"
        ? "btnDanger"
        : "");
  return h(
    "button",
    { className, onClick: props.onClick, type: props.type || "button" },
    props.children
  );
}

function Card(props) {
  return h(
    "section",
    { className: "card " + (props.soft ? "cardSoft" : "") },
    props.children
  );
}

function TransactionItem({ tx, onUse }) {
  const date = tx?.date ? new Date(tx.date) : null;
  const dateLabel = date && !Number.isNaN(date.valueOf()) ? date.toLocaleString() : "";
  return h(
    "div",
    { className: "txItem" },
    h(
      "div",
      null,
      h("div", { className: "txName" }, tx?.name || "Unknown"),
      h(
        "div",
        { className: "txMeta" },
        (tx?.upiId ? `${tx.upiId} ` : "") + (dateLabel ? `• ${dateLabel}` : "")
      )
    ),
    h(
      "div",
      { style: { display: "grid", justifyItems: "end", gap: 6 } },
      h("div", { className: "txAmt" }, formatINR(tx?.amount)),
      onUse
        ? h(
            "button",
            { className: "tab tabActive", onClick: () => onUse(tx) },
            "Use"
          )
        : null
    )
  );
}

function Toast({ text, show }) {
  return h("div", { className: "toast " + (show ? "toastShow" : "") }, text);
}

function Modal({ open, title, children, onClose }) {
  return h(
    React.Fragment,
    null,
    h("div", {
      className: "modalOverlay " + (open ? "modalOverlayShow" : ""),
      onClick: onClose
    }),
    h(
      "div",
      { className: "modal " + (open ? "modalShow" : "") },
      h("div", { className: "modalTitle" }, title),
      children,
      h("div", { style: { marginTop: 10 } }, h(Button, { onClick: onClose }, "Close"))
    )
  );
}

function Nav({ tab, setTab }) {
  const items = [
    { id: "home", label: "Home" },
    { id: "scan", label: "Scan" },
    { id: "history", label: "History" },
    { id: "settings", label: "Settings" }
  ];
  return h(
    "nav",
    { className: "nav" },
    h(
      "div",
      { className: "navInner" },
      items.map((it) =>
        h(
          "button",
          {
            key: it.id,
            className: "tab " + (tab === it.id ? "tabActive" : ""),
            onClick: () => setTab(it.id)
          },
          it.label
        )
      )
    )
  );
}

function App() {
  const [tab, setTab] = useStoredState("upi.tab", "home");

  const [settings, setSettings] = useStoredState("upi.settings", {
    phoneNumber: "",
    step1: 2,
    step2: 2,
    step3: 2,
    step4: 2
  });

  const [presets, setPresets] = useStoredState("upi.presets", [
    { name: "Milk", mobileNumber: "101", amount: 30 },
    { name: "Tea", mobileNumber: "102", amount: 20 }
  ]);

  const [scanText, setScanText] = React.useState("");
  const [scanParsed, setScanParsed] = React.useState(null);

  const [pay, setPay] = React.useState({
    name: "",
    upiId: "",
    mobileNumber: "",
    amount: "",
    ref: ""
  });

  const [history, setHistory] = React.useState([]);
  const [historyDays, setHistoryDays] = React.useState(7);

  const [toast, setToast] = React.useState({ show: false, text: "" });
  const [modal, setModal] = React.useState({ open: false, title: "", text: "" });

  function showToast(text) {
    setToast({ show: true, text });
    window.setTimeout(() => setToast({ show: false, text: "" }), 1600);
  }

  async function loadHistory(days) {
    try {
      const res = await fetch(`/history?days=${encodeURIComponent(days)}`);
      const json = await res.json();
      setHistory(Array.isArray(json) ? json : []);
    } catch (_e) {
      setHistory([]);
    }
  }

  React.useEffect(() => {
    if (tab === "history" || tab === "home") loadHistory(historyDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, historyDays]);

  function applyParsedToPay(parsed) {
    setPay((p) => ({
      ...p,
      name: parsed.name || p.name,
      upiId: parsed.upiId || p.upiId,
      amount: parsed.amount !== "" ? String(parsed.amount) : p.amount
    }));
    setTab("home");
    showToast("Loaded from QR");
  }

  function useTxForPay(tx) {
    setPay({
      name: tx?.name || "",
      upiId: tx?.upiId || "",
      mobileNumber: "",
      amount: String(tx?.amount || ""),
      ref: ""
    });
    setTab("home");
    showToast("Loaded from history");
  }

  async function saveTransaction() {
    const payload = {
      name: pay.name,
      upiId: pay.upiId,
      amount: pay.amount,
      ref: pay.ref || undefined
    };

    const res = await fetch("/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(json?.error || "Save failed");
      return null;
    }
    showToast("Saved");
    await loadHistory(historyDays);
    return json;
  }

  function saveTransactionFireAndForget() {
    const payload = {
      name: pay.name,
      upiId: pay.upiId,
      amount: pay.amount,
      ref: pay.ref || undefined
    };

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon("/save", blob);
        return;
      }
    } catch (_e) {
      // ignore
    }

    try {
      fetch("/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    } catch (_e) {
      // ignore
    }
  }

  function makeDial() {
    const mobile_or_upi = pay.mobileNumber || pay.upiId;
    if (!mobile_or_upi) {
      showToast("Mobile Number or UPI ID required");
      return null;
    }

    const tel = buildDialString(
      settings.phoneNumber,
      mobile_or_upi,
      pay.amount,
      settings
    );
    return tel;
  }

  function openDialModal() {
    const tel = makeDial();
    if (!tel) return;
    setModal({
      open: true,
      title: "Dial String",
      text: tel
    });
  }

  async function doPay() {
    if (!settings.phoneNumber) {
      showToast("Set phone number in Settings");
      setTab("settings");
      return;
    }
    if (!pay.name || !pay.amount) {
      showToast("Name and amount required");
      return;
    }

    const tel = makeDial();
    if (!tel) return;

    saveTransactionFireAndForget();
    window.location.href = tel;
  }

  function HomeScreen() {
    return h(
      React.Fragment,
      null,
      h(
        Card,
        { soft: true },
        null,
        h("div", { className: "h" }, "Quick Actions"),
        h(
          "div",
          { className: "btnRowSingle" },
          h(Button, { variant: "cta", onClick: () => setTab("scan") }, "📸 Scan QR Code"),
          h(
            "div",
            { className: "btnRow" },
            h(Button, { variant: "primary", onClick: openDialModal }, "Build Dial"),
            h(Button, { onClick: doPay }, "Pay Now")
          )
        ),
        h("div", { style: { height: 10 } }),
        h(
          "div",
          { className: "btnRow" },
          h(
            Button,
            {
              onClick: async () => {
                await loadHistory(historyDays);
                setTab("history");
              }
            },
            "Recent"
          ),
          h(Button, { onClick: () => setTab("settings") }, "Settings")
        )
      ),
      h(
        Card,
        null,
        h("div", { className: "h" }, "Payment Details"),
        h(
          "div",
          { className: "row" },
          h("div", null, h("div", { className: "label" }, "Name"), h("input", {
            className: "input",
            value: pay.name,
            onChange: (e) => setPay((p) => ({ ...p, name: e.target.value })),
            placeholder: "Merchant or Person"
          })),
          h(
            "div",
            null,
            h("div", { className: "label" }, "UPI ID (Fallback)"),
            h("input", {
              className: "input",
              value: pay.upiId,
              onChange: (e) => setPay((p) => ({ ...p, upiId: e.target.value })),
              placeholder: "name@bank"
            })
          ),
          h(
            "div",
            { className: "grid2" },
            h(
              "div",
              null,
              h("div", { className: "label" }, "Mobile Number"),
              h("input", {
                className: "input",
                inputMode: "tel",
                value: pay.mobileNumber,
                onChange: (e) =>
                  setPay((p) => ({ ...p, mobileNumber: e.target.value })),
                placeholder: "9876543210"
              })
            ),
            h(
              "div",
              null,
              h("div", { className: "label" }, "Amount"),
              h("input", {
                className: "input",
                inputMode: "decimal",
                value: pay.amount,
                onChange: (e) =>
                  setPay((p) => ({ ...p, amount: e.target.value })),
                placeholder: "0.00"
              })
            )
          ),
          h(
            "div",
            null,
            h("div", { className: "label" }, "Reference (Optional)"),
            h("input", {
              className: "input",
              value: pay.ref,
              onChange: (e) => setPay((p) => ({ ...p, ref: e.target.value })),
              placeholder: "Any note"
            })
          )
        )
      ),
      h(
        Card,
        null,
        h("div", { className: "h" }, "Presets"),
        presets.length
          ? h(
              "div",
              { className: "row" },
              presets.map((pr, idx) =>
                h(
                  "div",
                  { key: idx, className: "txItem" },
                  h(
                    "div",
                    null,
                    h("div", { className: "txName" }, pr.name),
                    h(
                      "div",
                      { className: "txMeta" },
                      `${pr.mobileNumber || pr.upiId} • ${formatINR(pr.amount)}`
                    )
                  ),
                  h(
                    "div",
                    { style: { display: "flex", gap: 8 } },
                    h(
                      "button",
                      {
                        className: "tab tabActive",
                        onClick: () =>
                          setPay((p) => ({
                            ...p,
                            name: pr.name,
                            mobileNumber: String(pr.mobileNumber || ""),
                            upiId: String(pr.upiId || ""),
                            amount: String(pr.amount || "")
                          }))
                      },
                      "Apply"
                    ),
                    h(
                      "button",
                      {
                        className: "tab",
                        onClick: () => {
                          setPresets((arr) => arr.filter((_, i) => i !== idx));
                          showToast("Removed preset");
                        }
                      },
                      "Delete"
                    )
                  )
                )
              )
            )
          : h("div", { className: "hint" }, "No presets yet."),
        h("div", { style: { height: 12 } }),
        h(
          Button,
          {
            onClick: () => {
              const name = pay.name.trim();
              const mobileNumber = pay.mobileNumber.trim();
              const upiId = pay.upiId.trim();
              const amount = Number(pay.amount);
              if (!name || (!mobileNumber && !upiId) || !Number.isFinite(amount) || amount <= 0) {
                showToast("Fill Name, Target, and Amount");
                return;
              }
              setPresets((arr) => [{ name, mobileNumber, upiId, amount }, ...arr].slice(0, 12));
              showToast("Preset added");
            }
          },
          "+ Save as Preset"
        )
      ),
      h(
        Card,
        null,
        h("div", { className: "h" }, "Recent Payments"),
        history.slice(0, 3).map((tx, i) => h(TransactionItem, { key: i, tx, onUse: useTxForPay })),
        !history.length ? h("div", { className: "hint" }, "No transactions yet.") : null
      )
    );
  }



  function ScanScreen() {
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const streamRef = React.useRef(null);
    const loopRef = React.useRef(0);
    const detectorRef = React.useRef(null);

    const [facing, setFacing] = useStoredState("upi.scanFacing", "environment");
    const [running, setRunning] = React.useState(false);
    const [scanErr, setScanErr] = React.useState("");

    function stopCamera() {
      window.clearInterval(loopRef.current);
      loopRef.current = 0;
      setRunning(false);
      setScanErr("");

      const stream = streamRef.current;
      streamRef.current = null;
      if (stream && stream.getTracks) {
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch (_e) {
          // ignore
        }
      }
      const v = videoRef.current;
      if (v) v.srcObject = null;
    }

    async function startCamera() {
      setScanErr("");
      setScanParsed(null);

      if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
        setScanErr("Camera not available in this browser/WebView.");
        return;
      }
      if (!("BarcodeDetector" in window)) {
        setScanErr("QR decode not supported here (BarcodeDetector missing). Use manual paste below.");
        return;
      }

      try {
        if (!detectorRef.current) {
          detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
        }
      } catch (_e) {
        setScanErr("QR decode not supported (BarcodeDetector init failed). Use manual paste below.");
        return;
      }

      stopCamera();
      setRunning(true);

      try {
        const constraints = {
          audio: false,
          video: {
            facingMode: facing,
            width: { ideal: 960 },
            height: { ideal: 540 }
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        const v = videoRef.current;
        if (!v) throw new Error("video element missing");
        v.srcObject = stream;
        await v.play();

        const canvas = canvasRef.current;
        if (!canvas) throw new Error("canvas missing");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("canvas context missing");

        loopRef.current = window.setInterval(async () => {
          try {
            const vw = v.videoWidth || 0;
            const vh = v.videoHeight || 0;
            if (!vw || !vh) return;

            // Downscale for low CPU on low-end devices.
            const targetW = Math.min(520, vw);
            const targetH = Math.floor((targetW * vh) / vw);
            canvas.width = targetW;
            canvas.height = targetH;
            ctx.drawImage(v, 0, 0, targetW, targetH);

            const detector = detectorRef.current;
            if (!detector) return;
            const codes = await detector.detect(canvas);
            if (!codes || !codes.length) return;

            const raw = String(codes[0]?.rawValue || "").trim();
            if (!raw) return;
            const parsed = parseUpiUri(raw);
            setScanParsed(parsed);
            if (parsed.ok) {
              stopCamera();
              applyParsedToPay(parsed);
            } else {
              showToast(parsed.error);
            }
          } catch (_e) {
            // Swallow loop errors to keep camera stable.
          }
        }, 220);
      } catch (e) {
        stopCamera();
        setScanErr(e?.message || "Camera start failed");
      }
    }

    React.useEffect(() => {
      // Clean up whenever leaving the scan tab.
      if (tab !== "scan") stopCamera();
      return () => stopCamera();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    return h(
      React.Fragment,
      null,
      h(
        Card,
        { soft: true },
        null,
        h("div", { className: "h" }, "Scan QR"),
        h(
          "div",
          { className: "scannerStage" },
          h("video", { className: "scannerVideo", ref: videoRef, playsInline: true, muted: true }),
          h("canvas", { ref: canvasRef, style: { display: "none" } }),
          h(
            "div",
            { className: "scannerOverlay" },
            h(
              "div",
              { className: "scannerTopHint" },
              h("div", { className: "badge" }, running ? "Scanning…" : "Ready"),
              h("div", { className: "badge" }, facing === "environment" ? "Back camera" : "Front camera")
            ),
            h(
              "div",
              { className: "scannerFrame" },
              h("div", { className: "scannerGlow" }),
              running ? h("div", { className: "scannerLine" }) : null
            )
          )
        ),
        h("div", { style: { height: 10 } }),
        h(
          "div",
          { className: "btnRow" },
          h(
            Button,
            { variant: "cta", onClick: running ? stopCamera : startCamera },
            running ? "Stop" : "Start Camera"
          ),
          h(
            Button,
            {
              onClick: async () => {
                const next = facing === "environment" ? "user" : "environment";
                setFacing(next);
                if (running) {
                  stopCamera();
                  window.setTimeout(startCamera, 120);
                }
              }
            },
            "Flip"
          )
        ),
        scanErr ? h("div", { style: { marginTop: 10 }, className: "hint" }, scanErr) : null,
        h("div", { style: { marginTop: 10 }, className: "hint" }, "Tip: Works best with good light. If camera/QR decode isn't supported, use manual paste below.")
      ),
      h(
        Card,
        null,
        h("div", { className: "h" }, "Manual Paste (Fallback)"),
        h("div", { className: "hint" }, "Paste a UPI QR payload like `upi://pay?pa=...&pn=...&am=...`."),
        h("div", { style: { height: 10 } }),
        h("textarea", {
          className: "textarea mono",
          value: scanText,
          onChange: (e) => setScanText(e.target.value),
          placeholder: "upi://pay?pa=merchant@upi&pn=Merchant&am=1.00"
        }),
        h("div", { style: { height: 10 } }),
        h(
          "div",
          { className: "btnRow" },
          h(
            Button,
            {
              variant: "primary",
              onClick: () => {
                const parsed = parseUpiUri(scanText);
                setScanParsed(parsed);
                if (!parsed.ok) showToast(parsed.error);
                else showToast("Parsed");
              }
            },
            "Parse"
          ),
          h(
            Button,
            {
              onClick: () => {
                setScanText("");
                setScanParsed(null);
              }
            },
            "Clear"
          )
        )
      ),
      scanParsed && scanParsed.ok
        ? h(
            Card,
            null,
            h("div", { className: "h" }, "Parsed"),
            h(
              "div",
              { className: "kv" },
              h("b", null, "UPI ID"),
              h("div", { className: "mono" }, scanParsed.upiId || "-"),
              h("b", null, "Name"),
              h("div", null, scanParsed.name || "-"),
              h("b", null, "Amount"),
              h("div", null, scanParsed.amount !== "" ? formatINR(scanParsed.amount) : "-"),
              h("b", null, "Note"),
              h("div", null, scanParsed.note || "-")
            ),
            h("div", { style: { height: 10 } }),
            h(
              Button,
              { variant: "primary", onClick: () => applyParsedToPay(scanParsed) },
              "Use For Pay"
            )
          )
        : null,
      scanParsed && !scanParsed.ok
        ? h(
            Card,
            null,
            h("div", { className: "h" }, "Error"),
            h("div", { className: "hint" }, scanParsed.error)
          )
        : null
    );
  }

  function HistoryScreen() {
    return h(
      React.Fragment,
      null,
      h(
        Card,
        null,
        h("div", { className: "h" }, "History"),
        h(
          "div",
          { className: "grid2" },
          h(
            Button,
            {
              variant: historyDays === 7 ? "primary" : undefined,
              onClick: () => setHistoryDays(7)
            },
            "7 days"
          ),
          h(
            Button,
            {
              variant: historyDays === 30 ? "primary" : undefined,
              onClick: () => setHistoryDays(30)
            },
            "30 days"
          )
        ),
        h("div", { style: { height: 10 } }),
        history.length
          ? h(
              "div",
              { className: "row" },
              history.map((tx, i) => h(TransactionItem, { key: i, tx, onUse: useTxForPay }))
            )
          : h("div", { className: "hint" }, "No transactions yet.")
      )
    );
  }

  function SettingsScreen() {
    const delays = settings;
    const telPreview = buildDialString(settings.phoneNumber, "1234", "1.00", delays);

    function updateNum(key, value) {
      setSettings((s) => ({ ...s, [key]: value }));
    }

    return h(
      React.Fragment,
      null,
      h(
        Card,
        null,
        h("div", { className: "h" }, "IVR Settings"),
        h(
          "div",
          { className: "row" },
          h(
            "div",
            null,
            h("div", { className: "label" }, "Phone number"),
            h("input", {
              className: "input",
              inputMode: "tel",
              value: settings.phoneNumber,
              onChange: (e) => updateNum("phoneNumber", e.target.value),
              placeholder: "e.g. 1800123456"
            })
          ),
          h(
            "div",
            { className: "grid2" },
            h(
              "div",
              null,
              h("div", { className: "label" }, "Delay 1 (commas)"),
              h("input", {
                className: "input",
                inputMode: "numeric",
                value: String(settings.step1),
                onChange: (e) => updateNum("step1", e.target.value)
              })
            ),
            h(
              "div",
              null,
              h("div", { className: "label" }, "Delay 2 (commas)"),
              h("input", {
                className: "input",
                inputMode: "numeric",
                value: String(settings.step2),
                onChange: (e) => updateNum("step2", e.target.value)
              })
            )
          ),
          h(
            "div",
            { className: "grid2" },
            h(
              "div",
              null,
              h("div", { className: "label" }, "Delay 3 (commas)"),
              h("input", {
                className: "input",
                inputMode: "numeric",
                value: String(settings.step3),
                onChange: (e) => updateNum("step3", e.target.value)
              })
            ),
            h(
              "div",
              null,
              h("div", { className: "label" }, "Delay 4 (commas)"),
              h("input", {
                className: "input",
                inputMode: "numeric",
                value: String(settings.step4),
                onChange: (e) => updateNum("step4", e.target.value)
              })
            )
          )
        ),
        h("div", { style: { height: 10 } }),
        h("div", { className: "pill" }, "Preview:"),
        h("div", { style: { height: 8 } }),
        h("div", { className: "hint mono" }, telPreview),
        h("div", { style: { height: 10 } }),
        h(
          Button,
          {
            variant: "danger",
            onClick: () => {
              setSettings({ phoneNumber: "", step1: 2, step2: 2, step3: 2, step4: 2 });
              showToast("Settings reset");
            }
          },
          "Reset"
        )
      ),
      h(
        Card,
        null,
        h("div", { className: "h" }, "Data"),
        h(
          "div",
          { className: "hint" },
          "Transactions are stored locally in ",
          h("span", { className: "mono" }, "data.json"),
          "."
        ),
        h("div", { style: { height: 10 } }),
        h(
          Button,
          {
            onClick: async () => {
              await loadHistory(30);
              showToast("Synced");
            }
          },
          "Sync History"
        )
      )
    );
  }

  const screen =
    tab === "home"
      ? h(HomeScreen)
      : tab === "scan"
        ? h(ScanScreen)
        : tab === "history"
          ? h(HistoryScreen)
          : h(SettingsScreen);

  return h(
    "div",
    { className: "app" },
    h(
      "header",
      { className: "topbar" },
      h("div", { className: "title" }, "UPI Assistant"),
      h("div", { className: "subtitle" }, tab === "home" ? "Fast pay + presets" : tab)
    ),
    h("main", { className: "content" }, h("div", { key: tab, className: "page" }, screen)),
    h(Nav, { tab, setTab }),
    h(Toast, { text: toast.text, show: toast.show }),
    h(
      Modal,
      {
        open: modal.open,
        title: modal.title,
        onClose: () => setModal({ open: false, title: "", text: "" })
      },
      h("div", { className: "hint" }, "Tap to copy, or close."),
      h("div", { style: { height: 10 } }),
      h(
        "button",
        {
          className: "input mono",
          onClick: async () => {
            try {
              await navigator.clipboard.writeText(modal.text || "");
              showToast("Copied");
            } catch (_e) {
              showToast("Copy not available");
            }
          }
        },
        modal.text || ""
      )
    )
  );
}

function boot() {
  const root = document.getElementById("root");
  ReactDOM.render(h(App), root);
}

boot();
