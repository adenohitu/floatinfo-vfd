/*!
 *======================================================================
 *Project Name : IP Checker Window App
 *Copyright © 2024 adenohitu. All rights reserved.
 *======================================================================
 */

import { app, BrowserWindow } from "electron";
import { ipcSetup } from "./mgmt/ipc";
import { windowMgmt } from "./mgmt/window";
import { trayMgmt } from "./mgmt/tray";

if (require("electron-squirrel-startup")) {
  app.quit();
}

// 管理系クラスのインスタンス生成
export const trayMgmtApp = new trayMgmt();
export const windowMgmtApp = new windowMgmt();
export const ipcSetupItem = new ipcSetup(windowMgmtApp);

app.on("ready", () => {
  // windowMgmtApp.createMainWindow();
  ipcSetupItem.setup();
  trayMgmtApp.setup();
  windowMgmtApp.createCommandWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // macOSでは、ドックアイコンをクリックしてアプリケーションが
  // 実行中の時にウィンドウが1つも開いていない場合は、
  // 新しいウィンドウを作成します
  if (BrowserWindow.getAllWindows().length === 0) {
    windowMgmtApp.createCommandWindow();
  }
});
