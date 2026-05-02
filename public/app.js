/* global React, ReactDOM, Utils, Logic, UI */

const { useState, useEffect, Fragment } = React;
const { parseUpiUri, buildDialString, resolvePaymentInput, useStoredState } = Logic;
const { Button, Input, Card, Header, BottomNav, TransactionItem, Toast, Scanner } = UI;
const h = React.createElement;

function App() {
  const [tab, setTab] = useStoredState("upi.tab", "home");
  const [settings, setSettings] = useStoredState("upi.settings", {
    phoneNumber: "",
    step1: 2,
    step2: 2,
    step3: 2,
    step4: 2
  });

  const [pay, setPay] = useState({
    name: "",
    upiId: "",
    mobileNumber: "",
    amount: "",
    ref: ""
  });

  const [history, setHistory] = useStoredState("upi.history", []);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [loading, setLoading] = useState(false);

  function showToast(message) {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 2000);
  }

  function loadHistory() {
    // History is now managed by useStoredState
  }

  useEffect(() => {
    // No need to fetch, state is handled by useStoredState
  }, [tab]);

  function handleScan(text) {
    const parsed = parseUpiUri(text);
    if (!parsed.ok) {
      showToast(parsed.error);
      return;
    }
    setPay({
      name: parsed.name,
      upiId: parsed.upiId,
      mobileNumber: "", // QR behavior: leave mobile empty
      amount: parsed.amount ? String(parsed.amount) : "",
      ref: parsed.note
    });
    setTab("scan-result");
    showToast("QR Scanned Successfully");
  }

  function handleUseTx(tx) {
    setPay({
      name: tx.name || "",
      upiId: tx.upiId || "",
      mobileNumber: tx.mobileNumber || "",
      amount: tx.amount ? String(tx.amount) : "",
      ref: tx.ref || ""
    });
    setTab("pay");
  }

  async function doPay() {
    if (!settings.phoneNumber) {
      showToast("Please set your phone number in Settings");
      setTab("settings");
      return;
    }

    if (!pay.amount || isNaN(pay.amount) || Number(pay.amount) <= 0) {
      showToast("Please enter a valid amount");
      return;
    }

    let target;
    try {
      target = resolvePaymentInput(pay.mobileNumber, pay.upiId);
    } catch (e) {
      showToast(e.message);
      return;
    }

    const tel = buildDialString(settings.phoneNumber, target, pay.amount, settings);
    
    // Save transaction locally
    const transaction = { ...pay, date: new Date().toISOString() };
    setHistory(prev => [transaction, ...prev].slice(0, 50));

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      window.location.href = tel;
    }, 800);
  }

  function renderHome() {
    return h("div", { className: "fade-in" },
      h(Header, { title: "UPI Assistant", subtitle: "Modern, Fast, Secure" }),
      h(Card, { className: "text-center" },
        h("div", { className: "flex-col" },
          h(Button, { variant: "cta", onClick: () => setTab("scan") }, "📸 Scan QR Code"),
          h("div", { className: "flex-row" },
            h(Button, { className: "flex-1", onClick: () => setTab("pay") }, "💸 Send Money"),
            h(Button, { className: "flex-1", onClick: () => setTab("history") }, "🕒 History")
          )
        )
      ),
      h("div", { className: "mt-2" },
        h("h3", { className: "mb-1" }, "Recent Transactions"),
        history.length > 0 ? 
          history.slice(0, 5).map((tx, idx) => h(TransactionItem, { key: idx, tx, onUse: handleUseTx })) :
          h("p", { className: "text-secondary text-center mt-2" }, "No recent transactions")
      )
    );
  }

  function renderScan() {
    return h("div", { className: "fade-in" },
      h(Header, { title: "Scan QR", subtitle: "Point at a UPI QR Code" }),
      h(Scanner, {
        onScan: (text) => handleScan(text),
        onError: (err) => showToast(err),
        onCancel: () => setTab("home")
      }),
      h("div", { className: "mt-2" },
        h(Input, {
          label: "Or Paste UPI URI",
          placeholder: "upi://pay?...",
          onChange: (val) => {
            if (val.startsWith("upi://")) handleScan(val);
          }
        })
      )
    );
  }

  function renderScanResult() {
    return h("div", { className: "fade-in" },
      h(Header, { title: "Payment Details", subtitle: "Confirm information" }),
      h(Card, null,
        h("div", { className: "flex-col" },
          h("div", null, 
            h("h4", null, pay.name || "Unknown Merchant"),
            h("p", { className: "text-secondary" }, pay.upiId)
          ),
          h(Input, {
            label: "Mobile Number (Primary)",
            value: pay.mobileNumber,
            onChange: (v) => setPay({...pay, mobileNumber: v}),
            inputMode: "tel",
            placeholder: "Optional if UPI ID exists"
          }),
          h(Input, {
            label: "UPI ID (Fallback)",
            value: pay.upiId,
            onChange: (v) => setPay({...pay, upiId: v}),
            placeholder: "name@bank"
          }),
          h(Input, {
            label: "Amount",
            value: pay.amount,
            onChange: (v) => setPay({...pay, amount: v}),
            inputMode: "decimal",
            placeholder: "0.00"
          }),
          h(Button, { variant: "primary", className: "mt-1", onClick: doPay, disabled: loading }, 
            loading ? "Processing..." : "Proceed to Pay"
          )
        )
      ),
      h(Button, { onClick: () => setTab("home") }, "Cancel")
    );
  }

  function renderPay() {
    return h("div", { className: "fade-in" },
      h(Header, { title: "Send Money", subtitle: "Enter payment details" }),
      h(Card, null,
        h("div", { className: "flex-col" },
          h(Input, { label: "Name", value: pay.name, onChange: (v) => setPay({...pay, name: v}), placeholder: "Recipient Name" }),
          h(Input, { label: "Mobile Number", value: pay.mobileNumber, onChange: (v) => setPay({...pay, mobileNumber: v}), inputMode: "tel", placeholder: "9876543210" }),
          h(Input, { label: "UPI ID (Fallback)", value: pay.upiId, onChange: (v) => setPay({...pay, upiId: v}), placeholder: "name@bank" }),
          h(Input, { label: "Amount", value: pay.amount, onChange: (v) => setPay({...pay, amount: v}), inputMode: "decimal", placeholder: "0.00" }),
          h(Button, { variant: "primary", onClick: doPay, disabled: loading }, loading ? "Processing..." : "Pay Now")
        )
      ),
      h(Button, { onClick: () => setTab("home") }, "Back")
    );
  }

  function renderHistory() {
    return h("div", { className: "fade-in" },
      h(Header, { title: "History", subtitle: "Your recent payments" }),
      h(Card, null,
        history.length > 0 ? 
          history.map((tx, idx) => h(TransactionItem, { key: idx, tx, onUse: handleUseTx })) :
          h("p", { className: "text-secondary text-center" }, "No history found")
      ),
      h(Button, { onClick: () => setTab("home") }, "Back")
    );
  }

  function renderSettings() {
    return h("div", { className: "fade-in" },
      h(Header, { title: "Settings", subtitle: "Configure app behavior" }),
      h(Card, null,
        h("div", { className: "flex-col" },
          h(Input, { label: "Your Phone Number", value: settings.phoneNumber, onChange: (v) => setSettings({...settings, phoneNumber: v}), inputMode: "tel", placeholder: "9876543210" }),
          h("div", { className: "flex-row" },
            h(Input, { className: "flex-1", label: "Delay 1", value: settings.step1, onChange: (v) => setSettings({...settings, step1: v}), inputMode: "numeric" }),
            h(Input, { className: "flex-1", label: "Delay 2", value: settings.step2, onChange: (v) => setSettings({...settings, step2: v}), inputMode: "numeric" })
          ),
          h("div", { className: "flex-row" },
            h(Input, { className: "flex-1", label: "Delay 3", value: settings.step3, onChange: (v) => setSettings({...settings, step3: v}), inputMode: "numeric" }),
            h(Input, { className: "flex-1", label: "Delay 4", value: settings.step4, onChange: (v) => setSettings({...settings, step4: v}), inputMode: "numeric" })
          )
        )
      ),
      h(Button, { onClick: () => setTab("home") }, "Back")
    );
  }

  const content = () => {
    switch (tab) {
      case "home": return renderHome();
      case "scan": return renderScan();
      case "scan-result": return renderScanResult();
      case "pay": return renderPay();
      case "history": return renderHistory();
      case "settings": return renderSettings();
      default: return renderHome();
    }
  };

  return h("div", { className: "app-container" },
    content(),
    h(BottomNav, { activeTab: tab, onTabChange: setTab }),
    h(Toast, { show: toast.show, message: toast.message })
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(h(App));
