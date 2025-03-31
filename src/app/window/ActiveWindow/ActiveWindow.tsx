import React, { ReactNode } from "react";
import styles from "./ActiveWindow.module.scss";
import { useWindow } from "../../hooks/useWindow";
import { Command } from "../Command/Command";
import { Schedule } from "../Schedule/Schedule";
import { Setting } from "../Setting/Setting";

interface ActiveWindowProps {
  title: string;
  children?: ReactNode;
}

export function ActiveWindow({ title, children }: ActiveWindowProps) {
  const { activeWindow, setActiveWindow } = useWindow();

  // 現在のアクティブウィンドウに基づいてコンテンツを選択
  const renderContent = () => {
    switch (activeWindow) {
      case "command":
        return <Command />;
      case "schedule":
        return <Schedule />;
      case "setting":
        return <Setting />;
      default:
        return children;
    }
  };

  return (
    <div className={styles.commandWindow}>
      <div className={styles.titlebar}>
        <div className={styles.titlebarText}>{title}</div>
      </div>

      {/* Spacer between titlebar and content */}
      <div className={styles.spacer}></div>

      {/* Main content area */}
      <div className={styles.contentContainer}>{renderContent()}</div>

      {/* Navigation menu bar */}
      <div className={styles.menuBar}>
        <div className={styles.menuButtons}>
          <button
            className={`${styles.menuButton} ${
              activeWindow === "command" ? styles.active : ""
            }`}
            onClick={() => setActiveWindow("command")}
            title="Command Execution"
          >
            <span>C</span>
          </button>
          <button
            className={`${styles.menuButton} ${
              activeWindow === "schedule" ? styles.active : ""
            }`}
            onClick={() => setActiveWindow("schedule")}
            title="Schedule Management"
          >
            <span>S</span>
          </button>
          <button
            className={`${styles.menuButton} ${
              activeWindow === "setting" ? styles.active : ""
            }`}
            onClick={() => setActiveWindow("setting")}
            title="Settings"
          >
            <span>⚙</span>
          </button>
        </div>
      </div>
    </div>
  );
}
