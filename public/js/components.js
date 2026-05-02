/* global React, Utils */

const h = React.createElement;

function Button({ children, onClick, variant, className = "", type = "button", disabled = false }) {
  const baseClass = variant === "cta" ? "btn-cta" : variant === "primary" ? "btn btn-primary" : "btn";
  return h("button", { 
    className: `${baseClass} ${className}`, 
    onClick, 
    type,
    disabled
  }, children);
}

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

function Card({ children, className = "", onClick }) {
  return h("div", { className: `card ${className}`, onClick }, children);
}

function Header({ title, subtitle }) {
  return h("header", { className: "mt-2 mb-2" },
    h("h2", null, title),
    subtitle && h("p", { className: "text-secondary" }, subtitle)
  );
}

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

function Toast({ message, show }) {
  return h("div", { className: `toast ${show ? 'toast-show' : ''}` }, message);
}

window.UI = { Button, Input, Card, Header, BottomNav, TransactionItem, Toast };
