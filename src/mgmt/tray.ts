import { app, Menu, Tray } from "electron";
import path from "path";
import { ipcSetupItem, windowMgmtApp } from "../main";
export class trayMgmt {
  tray: Tray | null = null;
  setup() {
    this.tray = new Tray(path.join(__dirname, "tray_icon_24.png"));
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "update",
        click: () => {
          ipcSetupItem.updateEventSend();
        },
      },
      {
        label: "Command Execution",
        click: () => {
          windowMgmtApp.createCommandWindow();
         
        },
      },
      {
        label: "Command Execution Devtool",
        click: () => {
          windowMgmtApp.windowList["commandWindow"].webContents.openDevTools({
            mode: "detach",
          });
        },
      },
      {
        label: "Settings",
        click: () => {
          windowMgmtApp.createSettingsWindow();
        },
      },
      {
        label: "DevTools",
        click: () => {
          windowMgmtApp.windowList["mainWindow"].webContents.openDevTools({
            mode: "detach",
          });
        },
      },
      {
        label: "Quit",
        click: () => {
          app.quit();
        },
      },
    ]);
    this.tray.setToolTip("IP Checker");
    this.tray.setContextMenu(contextMenu);
  }
}
