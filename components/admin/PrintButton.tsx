"use client";

import { useEffect } from "react";

export default function PrintButton() {
  // Auto-déclenche l'impression à l'ouverture de la page
  useEffect(() => {
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <button
      onClick={() => window.print()}
      style={{
        background: "#111",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "8px 20px",
        fontSize: "14px",
        cursor: "pointer",
      }}
      className="print:hidden"
    >
      🖨 Imprimer / Enregistrer en PDF
    </button>
  );
}
