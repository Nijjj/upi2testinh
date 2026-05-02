/* global React, Utils */

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
    map[k] = Utils.safeDecode(v.replace(/\+/g, "%20"));
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

  return `tel:${num}${d1}2${d2}1${d3}${target}${d4}${amt}`;
}

function resolvePaymentInput(mobileNumber, upiId) {
  const m = String(mobileNumber || "").trim();
  const u = String(upiId || "").trim();
  if (m) return m;
  if (u) return u;
  throw new Error("Mobile Number or UPI ID required");
}

function useStoredState(key, initialValue) {
  const [value, setValue] = React.useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initialValue;
      const parsed = JSON.parse(raw);
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

window.Logic = { parseUpiUri, buildDialString, resolvePaymentInput, useStoredState };
