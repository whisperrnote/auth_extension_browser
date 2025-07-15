import React, { useEffect } from "react";
import { AuthProvider } from "../../appwrite-provider/AuthProvider";
import { useExtensionStore } from "../../store/extensionStore";
import Login from "../../components/Login";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Box, IconButton, Tooltip } from "@mui/material";

// Create Material UI theme matching your color scheme
const theme = createTheme({
  palette: {
    primary: {
      main: "rgb(141, 103, 72)", // Woody brown
    },
    secondary: {
      main: "rgb(191, 174, 153)", // Muted brick
    },
    background: {
      default: "rgb(245, 239, 230)", // Soft beige
    },
  },
  shape: {
    borderRadius: 16,
  },
});

function App() {
  const { currentPage, setIsPopout, setPopoutWindow } = useExtensionStore();

  useEffect(() => {
    // Mark as popout window
    setIsPopout(true);
    
    // Handle window close
    const handleClose = () => {
      setIsPopout(false);
      setPopoutWindow(null);
    };
    
    window.addEventListener('beforeunload', handleClose);
    return () => window.removeEventListener('beforeunload', handleClose);
  }, [setIsPopout, setPopoutWindow]);

  const popBackIn = () => {
    // Send message to content script to show overlay
    if (window.opener) {
      window.opener.postMessage({
        type: 'EXTENSION_POP_BACK_IN',
        payload: { currentPage }
      }, '*');
    }
    window.close();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Box sx={{ width: "400px", height: "600px", position: "relative" }}>
          {/* Pop back in button */}
          <Tooltip title="Pop back into overlay">
            <IconButton
              onClick={popBackIn}
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 1000,
                width: 32,
                height: 32,
                bgcolor: "rgba(255,255,255,0.9)",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,1)",
                },
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 15v4a2 2 0 002 2h4M21 9V5a2 2 0 00-2-2h-4" stroke="#666" strokeWidth="2" />
                <path d="M9 21l-6-6M3 21h6v-6" stroke="#666" strokeWidth="2" />
              </svg>
            </IconButton>
          </Tooltip>

          {currentPage === "login" && <Login />}
          {/* Add other pages as needed */}
        </Box>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
