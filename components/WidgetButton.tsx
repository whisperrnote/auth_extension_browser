import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { useExtensionStore } from "../store/extensionStore";

interface WidgetButtonProps {
  onClick: () => void;
  onPopOut?: () => void;
  isOverlayOpen?: boolean;
}

export default function WidgetButton({ onClick, onPopOut, isOverlayOpen }: WidgetButtonProps) {
  const { isPopout } = useExtensionStore();

  return (
    <Box
      sx={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 99998,
        display: "flex",
        gap: 1,
      }}
    >
      {/* Main widget button */}
      <Tooltip title="Open Whisperr Auth">
        <IconButton
          onClick={onClick}
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            bgcolor: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
            border: "1px solid #eee",
            "&:hover": {
              bgcolor: "#f5f5f5",
            },
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#888" strokeWidth="2" />
            <path d="M8 12h8M12 8v8" stroke="#888" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </IconButton>
      </Tooltip>

      {/* Pop-out button (only shown when overlay is open) */}
      {isOverlayOpen && onPopOut && (
        <Tooltip title="Pop out to window">
          <IconButton
            onClick={onPopOut}
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              bgcolor: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
              border: "1px solid #eee",
              "&:hover": {
                bgcolor: "#f5f5f5",
              },
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 9v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9M7 9V7a2 2 0 012-2h6a2 2 0 012 2v2" stroke="#666" strokeWidth="2" />
              <path d="M15 3l6 6M21 3v6h-6" stroke="#666" strokeWidth="2" />
            </svg>
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
