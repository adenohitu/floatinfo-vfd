import React, { useEffect, useState } from "react";
import styles from "./Serial.module.scss";
import {
  Box,
  Button,
  Container,
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
import { v4 as uuidv4 } from "uuid";
import { PortInfo } from "../../../interface.d";
import { SerialTextData, SerialTextLine } from "../../../mgmt/serial";

// タブ管理用の型定義
interface SerialTab {
  id: string;
  name: string;
  connectedPort: [string, number] | null;
  baudRate: number;
}

// 空のテキスト行を作成する関数
const createEmptyTextLine = (): SerialTextLine => ({
  text: "",
  speed: 0,
  space: 0,
  enabled: true,
  maxLength: 20, // デフォルトは20文字
});

// 初期状態のテキストデータを作成する関数
const createInitialTextData = (): SerialTextData => ({
  stateName: "New State",
  lines: [createEmptyTextLine()],
  dayformat: "YYYY-MM-DD HH:mm:ss",
});

export function Serial() {
  // タブ管理用のstate
  const [tabs, setTabs] = useState<SerialTab[]>([
    { id: "tab-1", name: "Serial 1", connectedPort: null, baudRate: 9600 },
  ]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // シリアルポート関連のstate
  const [portList, setPortList] = useState<PortInfo[]>([]);
  const [baudRate, setBaudRate] = useState<number>(9600);

  // テキストデータ関連のstate
  const [textData, setTextData] = useState<SerialTextData>(
    createInitialTextData()
  );

  // 保存済みデータ関連のstate
  const [savedList, setSavedList] = useState<SerialTextData[]>([]);

  // アクティブなタブのIDを取得
  const activeTabId = tabs[activeTabIndex]?.id || "";

  // コンポーネントのマウント時に保存済みデータを取得
  useEffect(() => {
    const loadSavedList = async () => {
      const list = await window.electronAPI.getSerialSavedList();
      setSavedList(list);
    };
    loadSavedList();
  }, []);

  // 保存済みデータが変更されたら永続化
  useEffect(() => {
    window.electronAPI.setSerialSavedList(savedList);
  }, [savedList]);

  // ポートリストを更新
  const updatePortList = async () => {
    const ports = await window.electronAPI.getSerialPorts();
    setPortList(ports);
  };

  // タブ切り替え時の処理
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTabIndex(newValue);
  };

  // 新しいタブの追加
  const addTab = () => {
    const newTabId = `tab-${uuidv4()}`;
    setTabs([
      ...tabs,
      {
        id: newTabId,
        name: `Serial ${tabs.length + 1}`,
        connectedPort: null,
        baudRate: 9600,
      },
    ]);
    setActiveTabIndex(tabs.length);
  };

  // タブの削除
  const removeTab = async (index: number) => {
    if (tabs.length <= 1) return;

    // タブに接続されているシリアルポートを閉じる
    const tabToRemove = tabs[index];
    if (tabToRemove.connectedPort) {
      await window.electronAPI.closeSerial(tabToRemove.id);
    }

    const newTabs = [...tabs];
    newTabs.splice(index, 1);
    setTabs(newTabs);

    // アクティブなタブの調整
    if (activeTabIndex >= index && activeTabIndex > 0) {
      setActiveTabIndex(activeTabIndex - 1);
    }
  };

  // シリアルポートに接続
  const connectToPort = async (port: PortInfo) => {
    const tab = tabs[activeTabIndex];

    // 他のタブで使用中のポートかチェック
    const isPortInUse = tabs.some(
      (t) =>
        t.id !== tab.id && t.connectedPort && t.connectedPort[0] === port.path
    );

    if (isPortInUse) {
      alert(`Port ${port.path} is already in use by another tab.`);
      return;
    }

    try {
      const result = await window.electronAPI.connectSerial(
        port.path,
        baudRate,
        tab.id
      );

      // タブの接続情報を更新
      const newTabs = [...tabs];
      newTabs[activeTabIndex] = { ...tab, connectedPort: result, baudRate };
      setTabs(newTabs);
    } catch (error) {
      console.error("Failed to connect to serial port:", error);
      alert(`Failed to connect to ${port.path}`);
    }
  };

  // シリアルポートの切断
  const disconnectPort = async () => {
    const tab = tabs[activeTabIndex];
    if (!tab.connectedPort) return;

    try {
      await window.electronAPI.closeSerial(tab.id);

      // タブの接続情報をクリア
      const newTabs = [...tabs];
      newTabs[activeTabIndex] = { ...tab, connectedPort: null };
      setTabs(newTabs);
    } catch (error) {
      console.error("Failed to disconnect serial port:", error);
    }
  };

  // テキストデータの更新
  const updateSerialText = async () => {
    const tab = tabs[activeTabIndex];
    if (!tab.connectedPort) return;

    try {
      await window.electronAPI.writeSerialText(tab.id, textData);
    } catch (error) {
      console.error("Failed to update serial text:", error);
    }
  };

  // 現在のテキストデータを保存
  const saveCurrentState = () => {
    // 既存のステート名と重複しないかチェック
    const exists = savedList.some(
      (state) => state.stateName === textData.stateName
    );
    if (exists) {
      const confirmed = window.confirm(
        `A state with name "${textData.stateName}" already exists. Do you want to overwrite it?`
      );

      if (confirmed) {
        // 既存の項目を更新
        const newList = savedList.map((state) =>
          state.stateName === textData.stateName ? textData : state
        );
        setSavedList(newList);
      }
    } else {
      // 新しい項目として追加
      setSavedList([...savedList, textData]);
    }
  };

  // 保存済みのステートをロード
  const loadSavedState = (state: SerialTextData) => {
    setTextData({ ...state });
  };

  // 保存済みのステートを削除
  const deleteSavedState = (index: number) => {
    const newList = [...savedList];
    newList.splice(index, 1);
    setSavedList(newList);
  };

  // テキスト行を追加
  const addTextLine = () => {
    if (textData.lines.length >= 3) return; // 最大3行まで

    setTextData({
      ...textData,
      lines: [...textData.lines, createEmptyTextLine()],
    });
  };

  // テキスト行を削除
  const removeTextLine = (index: number) => {
    if (textData.lines.length <= 1) return; // 最低1行は必要

    const newLines = [...textData.lines];
    newLines.splice(index, 1);
    setTextData({
      ...textData,
      lines: newLines,
    });
  };

  // テキスト行の有効/無効を切り替え
  const toggleLineEnabled = (index: number, enabled: boolean) => {
    const newLines = [...textData.lines];
    newLines[index] = { ...newLines[index], enabled };
    setTextData({
      ...textData,
      lines: newLines,
    });
  };

  // テキスト行の内容を更新
  const updateLineText = (index: number, text: string) => {
    const newLines = [...textData.lines];
    newLines[index] = { ...newLines[index], text };
    setTextData({
      ...textData,
      lines: newLines,
    });
  };

  // テキスト行のスペースを更新
  const updateLineSpace = (index: number, space: number) => {
    const newLines = [...textData.lines];
    newLines[index] = { ...newLines[index], space };
    setTextData({
      ...textData,
      lines: newLines,
    });
  };

  // テキスト行の速度を更新
  const updateLineSpeed = (index: number, speed: number) => {
    const newLines = [...textData.lines];
    newLines[index] = { ...newLines[index], speed };
    setTextData({
      ...textData,
      lines: newLines,
    });
  };

  // テキスト行の最大文字数を更新
  const updateLineMaxLength = (index: number, maxLength: number) => {
    const newLines = [...textData.lines];
    newLines[index] = { ...newLines[index], maxLength };
    setTextData({
      ...textData,
      lines: newLines,
    });
  };

  // 日付フォーマットを更新
  const updateDateFormat = (format: string) => {
    setTextData({
      ...textData,
      dayformat: format,
    });
  };

  // 状態名を更新
  const updateStateName = (name: string) => {
    setTextData({
      ...textData,
      stateName: name,
    });
  };

  return (
    <div className={styles.serialContainer}>
      {/* タブバー */}
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

      {/* メインコンテンツ */}
      <Box sx={{ flexGrow: 1, mt: 2 }}>
        <Grid container spacing={2}>
          {/* 左パネル: 接続管理 */}
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
                      // 他のタブで使用中のポートかチェック
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

          {/* 右パネル: テキスト設定 */}
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
