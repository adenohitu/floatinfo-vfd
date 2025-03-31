import React, { ReactNode } from "react";
import styles from "./ActiveWindow.module.scss";
import { useWindow } from "../../hooks/useWindow";
import { Serial } from "../Serial/Serial";

interface ActiveWindowProps {
  title: string;
  children?: ReactNode;
}

export function ActiveWindow({ title, children }: ActiveWindowProps) {
  const { activeWindow, setActiveWindow } = useWindow();

  // 現在のアクティブウィンドウに基づいてコンテンツを選択
  const renderContent = () => {
    switch (activeWindow) {
      case "serial":
        return <Serial />;
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
              activeWindow === "serial" ? styles.active : ""
            }`}
            onClick={() => setActiveWindow("serial")}
            title="Serial Management"
          >
            <span>P</span>
          </button>
        </div>
      </div>
    </div>
  );
}
