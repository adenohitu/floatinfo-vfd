import { atom, useAtom } from "jotai";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { PortInfo } from "../../interface.d";
import { SerialTextData, SerialTextLine } from "../../mgmt/serial";

// Types
export interface SerialTab {
  id: string;
  name: string;
  connectedPort: [string, number] | null;
  baudRate: number;
}

// Helper functions
const createEmptyTextLine = (): SerialTextLine => ({
  text: "",
  speed: 0,
  space: 0,
  enabled: true,
  maxLength: 20, // Default is 20 characters
});

const createInitialTextData = (): SerialTextData => ({
  stateName: "New State",
  lines: [createEmptyTextLine()],
  dayformat: "YYYY-MM-DD HH:mm:ss",
});

// Define atoms for state management
const tabsAtom = atom<SerialTab[]>([
  { id: "tab-1", name: "Serial 1", connectedPort: null, baudRate: 9600 },
]);
const activeTabIndexAtom = atom<number>(0);
const portListAtom = atom<PortInfo[]>([]);
const baudRateAtom = atom<number>(9600);
const textDataAtom = atom<SerialTextData>(createInitialTextData());
const savedListAtom = atom<SerialTextData[]>([]);

// State hook - read-only values
export function useSerialState() {
  const [tabs] = useAtom(tabsAtom);
  const [activeTabIndex] = useAtom(activeTabIndexAtom);
  const [portList] = useAtom(portListAtom);
  const [baudRate] = useAtom(baudRateAtom);
  const [textData] = useAtom(textDataAtom);
  const [savedList] = useAtom(savedListAtom);

  // Derive the active tab ID
  const activeTabId = tabs[activeTabIndex]?.id || "";

  return {
    tabs,
    activeTabIndex,
    activeTabId,
    portList,
    baudRate,
    textData,
    savedList,
  };
}

// Actions hook - methods to modify state
export function useSerialActions() {
  const [tabs, setTabs] = useAtom(tabsAtom);
  const [activeTabIndex, setActiveTabIndex] = useAtom(activeTabIndexAtom);
  const [portList, setPortList] = useAtom(portListAtom);
  const [baudRate, setBaudRate] = useAtom(baudRateAtom);
  const [textData, setTextData] = useAtom(textDataAtom);
  const [savedList, setSavedList] = useAtom(savedListAtom);

  // Load saved data on component mount
  useEffect(() => {
    const loadSavedList = async () => {
      const list = await window.electronAPI.getSerialSavedList();
      setSavedList(list);
    };
    loadSavedList();
  }, [setSavedList]);

  // Persist saved list when it changes
  useEffect(() => {
    window.electronAPI.setSerialSavedList(savedList);
  }, [savedList]);

  // Tab management
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTabIndex(newValue);
  };

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

  const removeTab = async (index: number) => {
    if (tabs.length <= 1) return;

    // Close serial port if connected
    const tabToRemove = tabs[index];
    if (tabToRemove.connectedPort) {
      await window.electronAPI.closeSerial(tabToRemove.id);
    }

    const newTabs = [...tabs];
    newTabs.splice(index, 1);
    setTabs(newTabs);

    // Adjust active tab
    if (activeTabIndex >= index && activeTabIndex > 0) {
      setActiveTabIndex(activeTabIndex - 1);
    }
  };

  // Port management
  const updatePortList = async () => {
    const ports = await window.electronAPI.getSerialPorts();
    setPortList(ports);
  };

  const connectToPort = async (port: PortInfo) => {
    const tab = tabs[activeTabIndex];

    // Check if port is in use by another tab
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

      // Update tab connection info
      const newTabs = [...tabs];
      newTabs[activeTabIndex] = { ...tab, connectedPort: result, baudRate };
      setTabs(newTabs);
    } catch (error) {
      console.error("Failed to connect to serial port:", error);
      alert(`Failed to connect to ${port.path}`);
    }
  };

  const disconnectPort = async () => {
    const tab = tabs[activeTabIndex];
    if (!tab.connectedPort) return;

    try {
      await window.electronAPI.closeSerial(tab.id);

      // Clear tab connection info
      const newTabs = [...tabs];
      newTabs[activeTabIndex] = { ...tab, connectedPort: null };
      setTabs(newTabs);
    } catch (error) {
      console.error("Failed to disconnect serial port:", error);
    }
  };

  // Text data management
  const updateSerialText = async () => {
    const tab = tabs[activeTabIndex];
    if (!tab.connectedPort) return;

    try {
      await window.electronAPI.writeSerialText(tab.id, textData);
    } catch (error) {
      console.error("Failed to update serial text:", error);
    }
  };

  const saveCurrentState = () => {
    // Check for duplicate state name
    const exists = savedList.some(
      (state) => state.stateName === textData.stateName
    );
    if (exists) {
      const confirmed = window.confirm(
        `A state with name "${textData.stateName}" already exists. Do you want to overwrite it?`
      );

      if (confirmed) {
        // Update existing item
        const newList = savedList.map((state) =>
          state.stateName === textData.stateName ? textData : state
        );
        setSavedList(newList);
      }
    } else {
      // Add as new item
      setSavedList([...savedList, textData]);
    }
  };

  const loadSavedState = (state: SerialTextData) => {
    setTextData({ ...state });
  };

  const deleteSavedState = (index: number) => {
    const newList = [...savedList];
    newList.splice(index, 1);
    setSavedList(newList);
  };

  // Line management
  const addTextLine = () => {
    if (textData.lines.length >= 3) return; // Max 3 lines

    setTextData({
      ...textData,
      lines: [...textData.lines, createEmptyTextLine()],
    });
  };

  const removeTextLine = (index: number) => {
    if (textData.lines.length <= 1) return; // Min 1 line required

    const newLines = [...textData.lines];
    newLines.splice(index, 1);
    setTextData({
      ...textData,
      lines: newLines,
    });
  };

  const toggleLineEnabled = (index: number, enabled: boolean) => {
    const newLines = [...textData.lines];
    newLines[index] = { ...newLines[index], enabled };
    setTextData({
      ...textData,
      lines: newLines,
    });
  };

  const updateLineText = (index: number, text: string) => {
    const newLines = [...textData.lines];
    newLines[index] = { ...newLines[index], text };
    setTextData({
      ...textData,
      lines: newLines,
    });
  };

  const updateLineSpace = (index: number, space: number) => {
    const newLines = [...textData.lines];
    newLines[index] = { ...newLines[index], space };
    setTextData({
      ...textData,
      lines: newLines,
    });
  };

  const updateLineSpeed = (index: number, speed: number) => {
    const newLines = [...textData.lines];
    newLines[index] = { ...newLines[index], speed };
    setTextData({
      ...textData,
      lines: newLines,
    });
  };

  const updateLineMaxLength = (index: number, maxLength: number) => {
    const newLines = [...textData.lines];
    newLines[index] = { ...newLines[index], maxLength };
    setTextData({
      ...textData,
      lines: newLines,
    });
  };

  const updateDateFormat = (format: string) => {
    setTextData({
      ...textData,
      dayformat: format,
    });
  };

  const updateStateName = (name: string) => {
    setTextData({
      ...textData,
      stateName: name,
    });
  };

  return {
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
  };
}

// Helper functions for external use
export { createEmptyTextLine, createInitialTextData };
