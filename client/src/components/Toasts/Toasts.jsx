import { useEffect, useState } from "react";
import "./Toasts.css";

export default function Toasts() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onToast(e) {
      const d = e?.detail || {};
      const id = Date.now() + Math.random();
      const t = { id, message: d.message || "", type: d.type || "info", timeout: d.timeout || 3000 };
      setToasts((prev) => [...prev, t]);
      // auto remove
      setTimeout(() => {
        setToasts((prev) => prev.filter(x => x.id !== id));
      }, t.timeout + 50);
    }

    window.addEventListener("appToast", onToast);
    return () => window.removeEventListener("appToast", onToast);
  }, []);

  return (
    <div className="toastsContainer" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type || "info"}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
