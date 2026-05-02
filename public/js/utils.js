function formatINR(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return "₹0.00";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(num);
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

window.Utils = { formatINR, nowIso, safeDecode };
