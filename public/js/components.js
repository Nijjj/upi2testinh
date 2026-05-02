/* global React, Utils */

const h = React.createElement;

// Ensure UI object exists immediately
window.UI = window.UI || {};

function Button({ children, onClick, variant, className = "", type = "button", disabled = false }) {
  const baseClass = variant === "cta" ? "btn-cta" : variant === "primary" ? "btn btn-primary" : "btn";
  return h("button", { 
    className: `${baseClass} ${className}`, 
    onClick, 
    type,
    disabled
  }, children);
}
window.UI.Button = Button;

function Input({ label, value, onChange, placeholder, type = "text", inputMode, error, className = "" }) {
  return h("div", { className: `input-group ${className}` },
    label && h("label", { className: "label" }, label),
    h("input", {
      className: `input ${error ? 'input-error' : ''}`,
      value,
      onChange: (e) => onChange(e.target.value),
      placeholder,
      type,
      inputMode
    }),
    error && h("div", { className: "error-text" }, error)
  );
}
window.UI.Input = Input;

function Card({ children, className = "", onClick }) {
  return h("div", { className: `card ${className}`, onClick }, children);
}
window.UI.Card = Card;

function Header({ title, subtitle }) {
  return h("header", { className: "mt-2 mb-2" },
    h("h2", null, title),
    subtitle && h("p", { className: "text-secondary" }, subtitle)
  );
}
window.UI.Header = Header;

function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "scan", label: "Scan", icon: "📸" },
    { id: "history", label: "History", icon: "🕒" },
    { id: "settings", label: "Settings", icon: "⚙️" }
  ];

  return h("nav", { className: "bottom-nav" },
    tabs.map(tab => h("button", {
      key: tab.id,
      className: `nav-item ${activeTab === tab.id ? 'active' : ''}`,
      onClick: () => onTabChange(tab.id)
    },
      h("span", { className: "nav-icon" }, tab.icon),
      h("span", null, tab.label)
    ))
  );
}
window.UI.BottomNav = BottomNav;

function TransactionItem({ tx, onUse }) {
  const date = tx?.date ? new Date(tx.date) : null;
  const dateLabel = date && !Number.isNaN(date.valueOf()) ? date.toLocaleDateString() : "";
  
  return h("div", { className: "tx-item", onClick: () => onUse && onUse(tx) },
    h("div", { className: "tx-info" },
      h("h4", null, tx?.name || "Unknown"),
      h("p", null, (tx?.mobileNumber || tx?.upiId || "") + (dateLabel ? ` • ${dateLabel}` : ""))
    ),
    h("div", { className: "tx-amount" }, Utils.formatINR(tx?.amount))
  );
}
window.UI.TransactionItem = TransactionItem;

function Scanner({ onScan, onError, onCancel }) {
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const loopRef = React.useRef(0);
  const detectorRef = React.useRef(null);

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  function stopCamera() {
    if (loopRef.current) {
      window.clearInterval(loopRef.current);
      loopRef.current = 0;
    }
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream && stream.getTracks) {
      stream.getTracks().forEach((t) => t.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onError("Camera not supported");
      return;
    }

    try {
      if (!detectorRef.current && window.BarcodeDetector) {
        detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
      }
    } catch (e) {}

    try {
      let stream;
      try {
        // Try exact back camera first
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: "environment" } },
          audio: false
        });
      } catch (e) {
        // Fallback to any environment camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false
        });
      }
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      loopRef.current = window.setInterval(async () => {
        if (!video.videoWidth) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        if (detectorRef.current) {
          const codes = await detectorRef.current.detect(canvas);
          if (codes && codes.length > 0) {
            onScan(codes[0].rawValue);
          }
        }
      }, 300);
    } catch (e) {
      onError(e.message || "Failed to start camera");
    }
  }

  return h("div", { className: "scanner-container" },
    h("video", { 
      ref: videoRef, 
      style: { width: "100%", borderRadius: "12px", background: "#000" },
      playsInline: true 
    }),
    h("canvas", { ref: canvasRef, style: { display: "none" } }),
    h(Button, { onClick: onCancel, className: "mt-1" }, "Cancel")
  );
}
window.UI.Scanner = Scanner;

function Toast({ show, message }) {
  return h("div", { className: `toast ${show ? 'toast-show' : ''}` }, message);
}
window.UI.Toast = Toast;

// window.UI is now populated incrementally
