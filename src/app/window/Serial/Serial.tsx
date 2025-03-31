import React from "react";
import styles from "./Serial.module.scss";
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Input,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Slider,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import FastForwardIcon from "@mui/icons-material/FastForward";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { useSerialState, useSerialActions } from "../../hooks/useSerial";

export function Serial() {
  const {
    tabs,
    activeTabIndex,
    activeTabId,
    portList,
    baudRate,
    textData,
    savedList,
  } = useSerialState();

  const {
    setBaudRate,
    handleTabChange,
    addTab,
    removeTab,
    updatePortList,
    connectToPort,
    disconnectPort,
    updateSerialText,
    saveCurrentState,
    loadSavedState,
    deleteSavedState,
    addTextLine,
    removeTextLine,
    toggleLineEnabled,
    updateLineText,
    updateLineSpace,
    updateLineSpeed,
    updateLineMaxLength,
    updateDateFormat,
    updateStateName,
  } = useSerialActions();

  return (
    <div className={styles.serialContainer}>
      {/* Tab bar */}
      <div className={styles.tabs}>
        <Tabs
          value={activeTabIndex}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.id}
              label={
                <div style={{ display: "flex", alignItems: "center" }}>
                  {tab.name}
                  {tabs.length > 1 && tab.id !== "tab-1" && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTab(index);
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </div>
              }
            />
          ))}
        </Tabs>
        <Button
          className={styles.addTabButton}
          startIcon={<AddIcon />}
          onClick={addTab}
        >
          Add Tab
        </Button>
      </div>

      {/* Main content */}
      <Box sx={{ flexGrow: 1, mt: 2 }}>
        <Grid container spacing={2}>
          {/* Left panel: Connection management */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={3} sx={{ mb: 2 }}>
              <Box p={2}>
                <Typography variant="h6" gutterBottom>
                  Connection Status
                </Typography>
                <Box
                  sx={{
                    bgcolor: "background.paper",
                    p: 2,
                    borderRadius: 1,
                    mb: 2,
                  }}
                >
                  <Typography variant="body1">
                    {tabs[activeTabIndex]?.connectedPort
                      ? `Connected: ${tabs[activeTabIndex].connectedPort[0]}`
                      : "Not connected"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tabs[activeTabIndex]?.connectedPort
                      ? `${tabs[activeTabIndex].connectedPort[1]} bps`
                      : ""}
                  </Typography>
                </Box>

                <Box mb={2}>
                  <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={updatePortList}
                    fullWidth
                  >
                    Update Port List
                  </Button>
                </Box>

                <TextField
                  label="Baud Rate"
                  type="number"
                  value={baudRate}
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                  fullWidth
                  margin="normal"
                />

                <Paper
                  variant="outlined"
                  sx={{ mt: 2, maxHeight: 200, overflow: "auto" }}
                >
                  <List dense>
                    {portList.map((port, index) => {
                      // Check if port is in use by another tab
                      const isInUse = tabs.some(
                        (t) =>
                          t.connectedPort && t.connectedPort[0] === port.path
                      );

                      return (
                        <ListItem key={index} disablePadding>
                          <ListItemButton
                            disabled={isInUse}
                            onClick={() => connectToPort(port)}
                          >
                            <ListItemText
                              primary={port.path}
                              secondary={
                                isInUse
                                  ? "In use by another tab"
                                  : port.manufacturer || ""
                              }
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                </Paper>

                {tabs[activeTabIndex]?.connectedPort && (
                  <Box mt={2}>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={disconnectPort}
                      fullWidth
                    >
                      Disconnect
                    </Button>
                  </Box>
                )}
              </Box>
            </Paper>

            <Paper elevation={3}>
              <Box p={2}>
                <Typography variant="h6" gutterBottom>
                  Saved States
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{ maxHeight: 215, overflow: "auto" }}
                >
                  <List dense>
                    {savedList.length === 0 && (
                      <ListItem>
                        <ListItemText primary="No saved states" />
                      </ListItem>
                    )}
                    {savedList.map((state, index) => (
                      <ListItem
                        key={index}
                        secondaryAction={
                          <Stack direction="row" spacing={1}>
                            <IconButton
                              edge="end"
                              onClick={() => loadSavedState(state)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              edge="end"
                              onClick={() => deleteSavedState(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        }
                      >
                        <ListItemText
                          primary={state.stateName}
                          secondary={state.lines[0]?.text.slice(0, 10) + "..."}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Box>
            </Paper>
          </Grid>

          {/* Right panel: Text settings */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={3}>
              <Box p={2}>
                <TextField
                  label="State Name"
                  fullWidth
                  value={textData.stateName}
                  onChange={(e) => updateStateName(e.target.value)}
                  margin="normal"
                />

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Display Text
                </Typography>

                {textData.lines.map((line, index) => (
                  <Paper
                    variant="outlined"
                    key={index}
                    sx={{
                      p: 2,
                      mb: 2,
                      bgcolor: line.enabled
                        ? "background.paper"
                        : "action.disabledBackground",
                    }}
                  >
                    <Box
                      mb={1}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={line.enabled}
                            onChange={(e) =>
                              toggleLineEnabled(index, e.target.checked)
                            }
                          />
                        }
                        label={`Line ${index + 1}`}
                      />
                      {textData.lines.length > 1 && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => removeTextLine(index)}
                          startIcon={<DeleteIcon />}
                        >
                          Remove
                        </Button>
                      )}
                    </Box>

                    <TextField
                      label="Text"
                      fullWidth
                      value={line.text}
                      onChange={(e) => updateLineText(index, e.target.value)}
                      disabled={!line.enabled}
                      multiline
                      rows={2}
                      margin="dense"
                      helperText="Use $date to insert current date/time"
                    />

                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid size={6}>
                        <TextField
                          label="Space"
                          type="number"
                          value={line.space}
                          onChange={(e) =>
                            updateLineSpace(index, Number(e.target.value))
                          }
                          disabled={!line.enabled}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="Max Length"
                          type="number"
                          value={line.maxLength}
                          onChange={(e) =>
                            updateLineMaxLength(index, Number(e.target.value))
                          }
                          disabled={!line.enabled}
                          fullWidth
                          size="small"
                          InputProps={{
                            inputProps: { min: 1 },
                          }}
                          helperText="Characters per line"
                        />
                      </Grid>
                    </Grid>

                    <Box mt={2}>
                      <Typography variant="body2" gutterBottom>
                        Scroll Speed
                      </Typography>
                      <Box display="flex" alignItems="center">
                        <FastForwardIcon sx={{ mr: 1 }} />
                        <Slider
                          value={line.speed}
                          onChange={(_, value) =>
                            updateLineSpeed(index, value as number)
                          }
                          disabled={!line.enabled}
                          min={-1000}
                          max={1000}
                          step={100}
                          marks
                          valueLabelDisplay="auto"
                          sx={{ mr: 2 }}
                        />
                        <Input
                          value={line.speed}
                          onChange={(e) =>
                            updateLineSpeed(index, Number(e.target.value))
                          }
                          disabled={!line.enabled}
                          endAdornment={
                            <InputAdornment position="end">ms</InputAdornment>
                          }
                          inputProps={{
                            step: 100,
                            min: -1000,
                            max: 1000,
                            type: "number",
                          }}
                          sx={{ width: "80px" }}
                        />
                      </Box>
                    </Box>
                  </Paper>
                ))}

                {textData.lines.length < 3 && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={addTextLine}
                    fullWidth
                    sx={{ mt: 1, mb: 2 }}
                  >
                    Add Line
                  </Button>
                )}

                <Divider sx={{ my: 2 }} />

                <TextField
                  label="Date Format"
                  fullWidth
                  value={textData.dayformat}
                  onChange={(e) => updateDateFormat(e.target.value)}
                  margin="normal"
                  helperText="Format for $date placeholder (e.g. YYYY-MM-DD HH:mm:ss)"
                />

                <Box
                  mt={2}
                  display="flex"
                  justifyContent="space-between"
                  sx={{ "& > button": { minWidth: "120px" } }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={updateSerialText}
                    disabled={!tabs[activeTabIndex]?.connectedPort}
                  >
                    Update Display
                  </Button>

                  <Button
                    variant="contained"
                    color="success"
                    onClick={saveCurrentState}
                  >
                    Save State
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </div>
  );
}
