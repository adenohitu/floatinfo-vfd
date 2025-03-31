import axios from "axios";
import { ipcMain } from "electron";
import { windowMgmt } from "./window";
import { configMgmt } from "./config";
import { commandMgmt, CommandExecutionOptions, CommandResult } from "./command";
import { scheduleMgmt, ScheduleConfig } from "./schedule";
import { SerialManager, SerialTextData } from "./serial";

export class ipcSetup {
  windowMgmtApp: windowMgmt;
  configMgmt: configMgmt;
  commandMgmt: commandMgmt;
  scheduleMgmt: scheduleMgmt;
  serialManager: SerialManager;

  constructor(winddowMgmtApp: windowMgmt) {
    this.windowMgmtApp = winddowMgmtApp;
    this.configMgmt = new configMgmt();
    this.commandMgmt = new commandMgmt();

    // Initialize the schedule manager with the command manager
    this.scheduleMgmt = new scheduleMgmt(this.commandMgmt);

    // Initialize the serial manager
    this.serialManager = new SerialManager();

    // Set up notification callback
    this.commandMgmt.setNotifyCallback(this.notifyCommandResult.bind(this));

    // Set up schedule event handlers
    this.scheduleMgmt.on("schedule-added", this.notifyScheduleEvent.bind(this));
    this.scheduleMgmt.on(
      "schedule-updated",
      this.notifyScheduleEvent.bind(this)
    );
    this.scheduleMgmt.on(
      "schedule-removed",
      this.notifyScheduleEvent.bind(this)
    );
  }

  async setup() {
    ipcMain.handle("get-myglobalip", this.handleGetData.bind(this));
    ipcMain.handle("get-config", () => ({
      ipCheckUrl: this.configMgmt.getIpCheckUrl(),
    }));
    ipcMain.handle("set-config", (_, config: { ipCheckUrl: string }) => {
      this.configMgmt.setIpCheckUrl(config.ipCheckUrl);
    });

    // Command execution handlers
    ipcMain.handle(
      "execute-command",
      (
        _,
        {
          command,
          options,
        }: {
          command: string;
          options?: CommandExecutionOptions;
        }
      ) => {
        this.commandMgmt.executeCommand(command, options);
      }
    );

    ipcMain.handle("get-command-results", () => {
      return this.commandMgmt.getCommandResults();
    });

    ipcMain.handle("kill-command", (_, id: string) => {
      this.commandMgmt.manualKillCommand(id);
    });

    // Schedule management handlers
    ipcMain.handle("get-schedules", () => {
      return this.scheduleMgmt.getSchedules();
    });

    ipcMain.handle("get-schedule", (_, id: string) => {
      return this.scheduleMgmt.getScheduleById(id);
    });

    ipcMain.handle(
      "add-schedule",
      (_, schedule: Omit<ScheduleConfig, "id" | "createdAt" | "updatedAt">) => {
        return this.scheduleMgmt.addSchedule(schedule);
      }
    );

    ipcMain.handle(
      "update-schedule",
      (
        _,
        {
          id,
          updates,
        }: {
          id: string;
          updates: Partial<
            Omit<ScheduleConfig, "id" | "createdAt" | "updatedAt">
          >;
        }
      ) => {
        return this.scheduleMgmt.updateSchedule(id, updates);
      }
    );

    ipcMain.handle("remove-schedule", (_, id: string) => {
      return this.scheduleMgmt.removeSchedule(id);
    });

    ipcMain.handle("execute-schedule-now", (_, id: string) => {
      return this.scheduleMgmt.executeNow(id);
    });

    ipcMain.handle(
      "set-schedule-enabled",
      (_, { id, enabled }: { id: string; enabled: boolean }) => {
        return this.scheduleMgmt.setScheduleEnabled(id, enabled);
      }
    );

    // Add handler for opening command view with specific runId
    ipcMain.handle("open-command-view", async (_, runId: string) => {
      // First ensure command window is open
      if (!this.windowMgmtApp.windowList["commandWindow"]) {
        await this.windowMgmtApp.createCommandWindow();
      }

      // Send an event to the command window to display the specific command result
      this.windowMgmtApp.windowList["commandWindow"]?.webContents.send(
        "show-command-by-runid",
        runId
      );
    });

    // Serial port handlers
    ipcMain.handle("get-serial-ports", async () => {
      return await this.serialManager.getSerialPorts();
    });

    ipcMain.handle(
      "connect-serial",
      async (
        _,
        {
          path,
          baudRate,
          tabId,
        }: { path: string; baudRate: number; tabId: string }
      ) => {
        return await this.serialManager.connectSerial(path, baudRate, tabId);
      }
    );

    ipcMain.handle(
      "write-serial-text",
      (_, { tabId, data }: { tabId: string; data: SerialTextData }) => {
        this.serialManager.writeSerialText(tabId, data);
      }
    );

    ipcMain.handle("close-serial", async (_, tabId: string) => {
      await this.serialManager.closeSerial(tabId);
    });

    ipcMain.handle("get-serial-saved-list", () => {
      return this.configMgmt.getSerialSavedList();
    });

    ipcMain.handle("set-serial-saved-list", (_, list: SerialTextData[]) => {
      this.configMgmt.setSerialSavedList(list);
    });
  }

  async handleGetData() {
    const url = this.configMgmt.getIpCheckUrl();
    const data = await axios.get(url);
    return data.data;
  }

  notifyCommandResult(result: CommandResult) {
    // 渡された result パラメータを直接使用する
    // 常に最新の状態が UI に反映されるようにする
    if (this.windowMgmtApp.windowList["commandWindow"]) {
      this.windowMgmtApp.windowList["commandWindow"].webContents.send(
        "command-result",
        result
      );
    }
  }

  notifyScheduleEvent(data: ScheduleConfig) {
    // Notify any open command windows about schedule events
    if (this.windowMgmtApp.windowList["commandWindow"]) {
      this.windowMgmtApp.windowList["commandWindow"].webContents.send(
        "schedule-event",
        data
      );
    }
  }

  async updateEventSend() {
    this.windowMgmtApp.windowList["mainWindow"]?.webContents.send(
      "send-update"
    );
  }
}
