import styles from "./Command.module.scss";
import { useCommandState, useCommandActions } from "../../hooks/useCommand";
import { CommandResult } from "../../../mgmt/command";

export function Command() {
  const commandState = useCommandState();
  const commandActions = useCommandActions();

  const getStatusDisplay = (result: CommandResult) => {
    if (result.isRunning) {
      return {
        text: "Running",
        className: styles.running,
      };
    } else if (result.exitCode === 0) {
      return {
        text: "Success",
        className: styles.success,
      };
    } else if (result.exitCode === -2) {
      return {
        text: "Terminated abnormally",
        className: styles.abnormal,
      };
    } else if (result.exitCode === -3) {
      return {
        text: "Timeout terminated",
        className: styles.timeout,
      };
    } else if (result.exitCode === -5) {
      return {
        text: "Duplicate execution",
        className: styles.error,
      };
    } else {
      return {
        text: `Failed (${result.exitCode})`,
        className: styles.error,
      };
    }
  };

  return (
    <div className={styles.commandContent}>
      <div className={styles.inputSection}>
        <h2>Command Execution</h2>
        <div className={styles.formGroup}>
          <label htmlFor="command">Command:</label>
          <input
            id="command"
            type="text"
            value={commandState.command}
            onChange={(e) => commandActions.setCommand(e.target.value)}
            placeholder="Enter command to execute"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="timeout">Timeout (seconds):</label>
          <input
            id="timeout"
            type="number"
            min="0"
            value={commandState.timeout}
            onChange={(e) =>
              commandActions.setTimeout(
                e.target.value ? Number(e.target.value) : ""
              )
            }
            placeholder="No timeout"
          />
        </div>
        <button onClick={commandActions.handleExecute}>Execute</button>
      </div>

      <div className={styles.resultsSection}>
        <div className={styles.resultsList}>
          <h3>Command Results</h3>
          {commandState.commandResults.length === 0 ? (
            <p className={styles.noResults}>No commands executed yet</p>
          ) : (
            <ul>
              {commandState.commandResults.map((result) => {
                const status = getStatusDisplay(result);
                return (
                  <li
                    key={result.runId}
                    onClick={() => commandActions.handleResultClick(result)}
                    className={`${
                      commandState.selectedResult?.runId === result.runId
                        ? styles.selected
                        : ""
                    } ${result.isRunning ? styles.running : ""}`}
                  >
                    <div className={styles.resultHeader}>
                      <span className={styles.commandId}>
                        {result.id} ({result.runId.split("_")[1]})
                      </span>
                      <span
                        className={`${styles.statusBadge} ${status.className}`}
                      >
                        {status.text}
                      </span>
                    </div>
                    <span className={styles.commandText}>{result.command}</span>
                    <div className={styles.resultFooter}>
                      <span className={styles.timestamp}>
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={styles.resultDetails}>
          <div className={styles.resultHeader}>
            <h3>Result Details</h3>
            {commandState.selectedResult?.isRunning && (
              <button
                className={styles.killButton}
                onClick={() =>
                  commandActions.handleKillCommand(
                    commandState.selectedResult.id
                  )
                }
              >
                Terminate Command
              </button>
            )}
          </div>

          {commandState.selectedResult ? (
            <>
              <div className={styles.resultInfo}>
                <div className={styles.resultInfoItem}>
                  <span className={styles.resultInfoLabel}>Command:</span>
                  <span>{commandState.selectedResult.command}</span>
                </div>
                <div className={styles.resultInfoItem}>
                  <span className={styles.resultInfoLabel}>ID:</span>
                  <span>{commandState.selectedResult.id}</span>
                </div>
                <div className={styles.resultInfoItem}>
                  <span className={styles.resultInfoLabel}>Run ID:</span>
                  <span>{commandState.selectedResult.runId}</span>
                </div>
                <div className={styles.resultInfoItem}>
                  <span className={styles.resultInfoLabel}>Time:</span>
                  <span>
                    {new Date(
                      commandState.selectedResult.timestamp
                    ).toLocaleString()}
                  </span>
                </div>
                {!commandState.selectedResult.isRunning &&
                  commandState.selectedResult.executionTime !== undefined && (
                    <div className={styles.resultInfoItem}>
                      <span className={styles.resultInfoLabel}>
                        Execution Time:
                      </span>
                      <span>
                        {(
                          commandState.selectedResult.executionTime / 1000
                        ).toFixed(3)}{" "}
                        seconds
                      </span>
                    </div>
                  )}
                <div className={styles.resultInfoItem}>
                  <span className={styles.resultInfoLabel}>Status:</span>
                  <span>
                    {commandState.selectedResult.isRunning
                      ? "Running"
                      : commandState.selectedResult.exitCode === 0
                      ? "Completed successfully"
                      : commandState.selectedResult.exitCode === -2
                      ? "Terminated abnormally (application closed while running)"
                      : commandState.selectedResult.exitCode === -3
                      ? "Timeout terminated"
                      : commandState.selectedResult.exitCode === -5
                      ? "Duplicate execution prevented"
                      : `Failed with exit code ${commandState.selectedResult.exitCode}`}
                  </span>
                </div>
              </div>
              <pre className={styles.outputDisplay}>
                {commandState.selectedResult.output || "(No output yet)"}
              </pre>
            </>
          ) : (
            <p className={styles.noSelection}>
              Select a command to view details
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
