import { app, Menu, Tray } from "electron";
import path from "path";
import { windowMgmtApp } from "../main";

export class trayMgmt {
  tray: Tray | null = null;

  setup() {
    this.tray = new Tray(path.join(__dirname, "tray_icon_24.png"));

    this.tray.on("click", () => {
      windowMgmtApp.createCommandWindow();
    });

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open Command Window",
        click: () => {
          windowMgmtApp.createCommandWindow();
        },
      },
      {
        label: "Open Serial Window",
        click: () => {
          windowMgmtApp.createSerialWindow();
        },
      },
      { type: "separator" },
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
