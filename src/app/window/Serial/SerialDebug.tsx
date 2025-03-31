import React, { useEffect, useState } from "react";
import { Box, Paper, Typography, Divider } from "@mui/material";
import styles from "./SerialDebug.module.scss";

interface DebugMessage {
  tabId: string;
  content: string;
  timestamp: number;
}

export function SerialDebug() {
  const [latestMessages, setLatestMessages] = useState<
    Record<string, DebugMessage>
  >({});
  const [connectedTabs, setConnectedTabs] = useState<string[]>([]);

  useEffect(() => {
    // Subscribe to debug messages
    const handleSerialDebugMessage = (
      _event: Electron.IpcRendererEvent,
      tabId: string,
      content: string
    ) => {
      setLatestMessages((prev) => ({
        ...prev,
        [tabId]: {
          tabId,
          content,
          timestamp: Date.now(),
        },
      }));
    };

    // Subscribe to connected tabs updates
    const handleConnectedTabsUpdate = (
      _event: Electron.IpcRendererEvent,
      tabs: string[]
    ) => {
      setConnectedTabs(tabs);
    };

    // Register listeners
    window.electronAPI.onSerialDebugMessage(handleSerialDebugMessage);
    window.electronAPI.onConnectedTabsUpdate(handleConnectedTabsUpdate);

    return () => {
      // Clean up listeners
      window.electronAPI.removeSerialDebugListener();
      window.electronAPI.removeConnectedTabsListener();
    };
  }, []);

  return (
    <Box className={styles.debugContainer}>
      <Typography variant="h6" component="h2" gutterBottom>
        Serial Debug Monitor
      </Typography>

      <Divider sx={{ my: 2 }} />

      {Object.keys(latestMessages).length === 0 ? (
        <Typography color="text.secondary" align="center">
          No debug messages yet. Connect to a serial port to see updates.
        </Typography>
      ) : (
        Object.entries(latestMessages).map(([tabId, message]) => (
          <Paper
            key={tabId}
            elevation={2}
            className={styles.tabDebugPanel}
            sx={{
              mb: 2,
              p: 2,
              backgroundColor: connectedTabs.includes(tabId)
                ? "rgba(76, 175, 80, 0.1)"
                : "rgba(244, 67, 54, 0.1)",
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{
                color: connectedTabs.includes(tabId)
                  ? "success.main"
                  : "error.main",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Tab ID: {tabId}</span>
              <span>
                {connectedTabs.includes(tabId)
                  ? "(Connected)"
                  : "(Disconnected)"}
              </span>
            </Typography>

            <Box className={styles.messagesContainer}>
              <Box className={styles.messageItem}>
                <Typography variant="caption" color="text.secondary">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Typography>
                <pre className={styles.messageContent}>{message.content}</pre>
              </Box>
            </Box>
          </Paper>
        ))
      )}
    </Box>
  );
}
