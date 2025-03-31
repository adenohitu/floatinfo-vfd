interface CommandExecutionOptions {
  timeout?: number; // Timeout in milliseconds
}

import { CommandResult } from "./mgmt/command";
import { ScheduleConfig } from "./mgmt/schedule";

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
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
