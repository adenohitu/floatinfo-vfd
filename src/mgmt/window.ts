import {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  screen,
} from "electron";
import path from "path";
import os from "os";
import { configMgmt } from "./config"; // 追加

type windowKey = string;

export class windowMgmt {
  windowList: { [key: windowKey]: BrowserWindow } = {};
  config: configMgmt = new configMgmt(); // 追加

  public createMainWindow() {
    // すでにウィンドウが存在している場合は何もしない
    if (this.windowList["mainWindow"]) {
      return;
    }
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const xPosition = os.platform() === "win32" ? width - 220 : width; // 変更
    const yPosition = os.platform() === "win32" ? height - 200 : height; // 変更

    const mainWindow = new BrowserWindow({
      height: 200,
      width: 220,
      transparent: true,
      frame: false,
      resizable: false,
      y: yPosition,
      x: xPosition,
      // opacity: 0.4,
      alwaysOnTop: true,
      // skipTaskbar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
    });

    mainWindow.setIgnoreMouseEvents(true);
    mainWindow.setSkipTaskbar(true);
    mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });

    // mainWindow.webContents.openDevTools({ mode: "detach" });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      mainWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
      );
    }
    this.windowList["mainWindow"] = mainWindow;
    mainWindow.on("closed", () => {
      delete this.windowList["mainWindow"];
    });
  }

  private getLoadPath(hash: string): {
    url?: string;
    file?: { path: string; hash?: string };
  } {
    return MAIN_WINDOW_VITE_DEV_SERVER_URL
      ? { url: `${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/${hash}` }
      : {
          file: {
            path: path.join(
              __dirname,
              `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
            ),
            hash,
          },
        };
  }

  public createSettingsWindow() {
    const options: BrowserWindowConstructorOptions = {
      height: 400,
      width: 600,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
      title: "Settings",
    };

    const loadPath = this.getLoadPath("settings");

    this.createWindow("settingsWindow", options, loadPath);
  }

  public createCommandWindow() {
    const options: BrowserWindowConstructorOptions = {
      height: 600,
      width: 800,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
      title: "Command Execution",
      frame: false,
      transparent: true,
      titleBarStyle: "hidden",
      trafficLightPosition: { x: 10, y: 10 },
      titleBarOverlay: {
        color: "#FFFFFF",
        symbolColor: "#144782",
      },
    };

    const loadPath = this.getLoadPath("command");

    this.createWindow("commandWindow", options, loadPath);
  }

  public createWindow(
    key: windowKey,
    options: BrowserWindowConstructorOptions,
    loadPath: { url?: string; file?: { path: string; hash?: string } }
  ) {
    const existingWindow = this.windowList[key];
    if (existingWindow) {
      if (!existingWindow.isDestroyed()) {
        existingWindow.focus();
        return;
      } else {
        delete this.windowList[key];
      }
    }

    const savedBounds = this.config.getWindowBounds(key);
    options = {
      ...options,
      height: savedBounds.height || options.height,
      width: savedBounds.width || options.width,
      x: savedBounds.x !== undefined ? savedBounds.x : options.x,
      y: savedBounds.y !== undefined ? savedBounds.y : options.y,
    };

    const window = new BrowserWindow(options);
    this.windowList[key] = window;

    if (loadPath.url) {
      window.loadURL(loadPath.url);
    } else if (loadPath.file) {
      window.loadFile(loadPath.file.path, { hash: loadPath.file.hash });
    }

    window.on("resized", () => {
      if (!window.isDestroyed()) {
        const bounds = window.getBounds();
        this.config.setWindowBounds(key, bounds);
      }
    });

    window.on("moved", () => {
      if (!window.isDestroyed()) {
        const bounds = window.getBounds();
        this.config.setWindowBounds(key, bounds);
      }
    });

    window.on("closed", () => {
      if (!window.isDestroyed()) {
        const bounds = window.getBounds();
        this.config.setWindowBounds(key, bounds);
      }
      delete this.windowList[key];
    });
  }
}
