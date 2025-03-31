// See the Electron documentation for details on how to use preload scripts:

import { contextBridge, ipcRenderer } from "electron";
import { CommandResult } from "./mgmt/command";
import { ScheduleConfig } from "./mgmt/schedule";
import { SerialTextData } from "./mgmt/serial";
import { PortInfo } from "./interface.d";

interface CommandExecutionOptions {
  timeout?: number; // Timeout in milliseconds
}

// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
contextBridge.exposeInMainWorld("electronAPI", {
  getgrovalIP: () => ipcRenderer.invoke("get-myglobalip"),
  updateEventSend: (callback: () => void) =>
    ipcRenderer.on("send-update", () => callback()),
  getConfig: () => ipcRenderer.invoke("get-config"),
  setConfig: (config: { ipCheckUrl: string }) =>
    ipcRenderer.invoke("set-config", config),

  // Command window API
  executeCommand: (command: string, options?: CommandExecutionOptions) =>
    ipcRenderer.invoke("execute-command", { command, options }),
  killCommand: (id: string) => ipcRenderer.invoke("kill-command", id),
  getCommandResults: () => ipcRenderer.invoke("get-command-results"),
  onCommandResult: (callback: (result: CommandResult) => void) =>
    ipcRenderer.on("command-result", (_event, result) => callback(result)),
  openCommandView: (runId: string) =>
    ipcRenderer.invoke("open-command-view", runId),
  onShowCommandByRunId: (callback: (runId: string) => void) =>
    ipcRenderer.on("show-command-by-runid", (_event, runId) => callback(runId)),

  // Schedule API
  getSchedules: () => ipcRenderer.invoke("get-schedules"),
  getSchedule: (id: string) => ipcRenderer.invoke("get-schedule", id),
  addSchedule: (
    schedule: Omit<ScheduleConfig, "id" | "createdAt" | "updatedAt">
  ) => ipcRenderer.invoke("add-schedule", schedule),
  updateSchedule: (
    id: string,
    updates: Partial<Omit<ScheduleConfig, "id" | "createdAt" | "updatedAt">>
  ) => ipcRenderer.invoke("update-schedule", { id, updates }),
  removeSchedule: (id: string) => ipcRenderer.invoke("remove-schedule", id),
  executeScheduleNow: (id: string) =>
    ipcRenderer.invoke("execute-schedule-now", id),
  setScheduleEnabled: (id: string, enabled: boolean) =>
    ipcRenderer.invoke("set-schedule-enabled", { id, enabled }),
  onScheduleEvent: (callback: (data: ScheduleConfig) => void) =>
    ipcRenderer.on("schedule-event", (_event, data) => callback(data)),

  // Serial port API
  getSerialPorts: () => ipcRenderer.invoke("get-serial-ports"),
  connectSerial: (path: string, baudRate: number, tabId: string) =>
    ipcRenderer.invoke("connect-serial", { path, baudRate, tabId }),
  writeSerialText: (tabId: string, data: SerialTextData) =>
    ipcRenderer.invoke("write-serial-text", { tabId, data }),
  closeSerial: (tabId: string) => ipcRenderer.invoke("close-serial", tabId),
  getSerialSavedList: () => ipcRenderer.invoke("get-serial-saved-list"),
  setSerialSavedList: (list: SerialTextData[]) =>
    ipcRenderer.invoke("set-serial-saved-list", list),
});
