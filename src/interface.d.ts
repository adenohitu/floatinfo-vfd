interface CommandExecutionOptions {
  timeout?: number; // Timeout in milliseconds
}

import { CommandResult } from "./mgmt/command";
import { ScheduleConfig } from "./mgmt/schedule";
import { SerialTextData } from "./mgmt/serial";

export interface IElectronAPI {
  getgrovalIP: () => Promise<ipStatusApiResponse>;
  updateEventSend: (callback: () => void) => void;
  getConfig: () => Promise<{ ipCheckUrl: string }>;
  setConfig: (config: { ipCheckUrl: string }) => Promise<void>;

  // Command window methods
  executeCommand: (
    command: string,
    options?: CommandExecutionOptions
  ) => Promise<void>;
  killCommand: (id: string) => Promise<void>;
  getCommandResults: () => Promise<CommandResult[]>;
  onCommandResult: (callback: (result: CommandResult) => void) => void;
  openCommandView: (runId: string) => Promise<void>;
  onShowCommandByRunId: (callback: (runId: string) => void) => void;

  // Schedule methods
  getSchedules: () => Promise<ScheduleConfig[]>;
  getSchedule: (id: string) => Promise<ScheduleConfig | undefined>;
  addSchedule: (
    schedule: Omit<ScheduleConfig, "id" | "createdAt" | "updatedAt">
  ) => Promise<ScheduleConfig>;
  updateSchedule: (
    id: string,
    updates: Partial<Omit<ScheduleConfig, "id" | "createdAt" | "updatedAt">>
  ) => Promise<ScheduleConfig | null>;
  removeSchedule: (id: string) => Promise<boolean>;
  executeScheduleNow: (id: string) => Promise<CommandResult | null>;
  setScheduleEnabled: (
    id: string,
    enabled: boolean
  ) => Promise<ScheduleConfig | null>;
  onScheduleEvent: (callback: (data: ScheduleConfig) => void) => void;

  // Serial port methods
  getSerialPorts: () => Promise<PortInfo[]>;
  connectSerial: (
    path: string,
    baudRate: number,
    tabId: string
  ) => Promise<[string, number]>;
  writeSerialText: (tabId: string, data: SerialTextData) => Promise<void>;
  closeSerial: (tabId: string) => Promise<void>;
  getSerialSavedList: () => Promise<SerialTextData[]>;
  setSerialSavedList: (list: SerialTextData[]) => Promise<void>;
}

// PortInfo interface for serial port information
export interface PortInfo {
  path: string;
  manufacturer: string | undefined;
  serialNumber: string | undefined;
  pnpId: string | undefined;
  locationId: string | undefined;
  productId: string | undefined;
  vendorId: string | undefined;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
