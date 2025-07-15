import React from "react";
import { Box } from "@mui/material";

const widgetBtnStyle: React.CSSProperties = {
  position: "fixed",
  top: "20px",
  right: "20px",
  zIndex: 99998,
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  background: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  border: "1px solid #eee"
};

export default function WidgetButton({ onClick }: { onClick: () => void }) {
  return (
    <Box sx={widgetBtnStyle} onClick={onClick} title="Open Whisperr Auth">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#888" strokeWidth="2" />
        <path d="M8 12h8M12 8v8" stroke="#888" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </Box>
  );
}
