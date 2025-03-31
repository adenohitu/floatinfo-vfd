import Store from "electron-store";

interface ConfigSchema {
  ipCheckUrl: string;
  windowBounds?: {
    [windowId: string]: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }
  };
}

export class configMgmt {
  private store: Store<ConfigSchema>;

  constructor() {
    this.store = new Store<ConfigSchema>({
      defaults: {
        ipCheckUrl: "https://ownip-worker.flyanyfree.workers.dev",
      },
    });
  }

  getIpCheckUrl(): string {
    return this.store.get("ipCheckUrl");
  }

  setIpCheckUrl(url: string): void {
    this.store.set("ipCheckUrl", url);
  }

  getWindowBounds(windowId:string) {
    const windowBounds = this.store.get("windowBounds") || {};
    return windowBounds[windowId] || {};
  }

  setWindowBounds(
    windowId:string,
    bounds: { x: number; y: number; width: number; height: number },

  ) {
    const windowBounds = this.store.get("windowBounds") || {};
    windowBounds[windowId] = bounds;
    this.store.set("windowBounds", windowBounds);
  }
}
