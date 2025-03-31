import React, { useState } from "react";
import styles from "./Schedule.module.scss";
import { useScheduleState, useScheduleActions } from "../../hooks/useSchedule";
import { ScheduleConfig } from "../../../mgmt/schedule";
import { useCommandState, useCommandActions } from "../../hooks/useCommand";
import { CommandResult } from "../../../mgmt/command";

export function Schedule() {
  const scheduleState = useScheduleState();
  const scheduleActions = useScheduleActions();
  const commandState = useCommandState();
  const commandActions = useCommandActions();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleConfig | null>(
    null
  );
  const [showExecutionModal, setShowExecutionModal] = useState<boolean>(false);
  const [selectedExecution, setSelectedExecution] =
    useState<CommandResult | null>(null);

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "Not scheduled";
    return new Date(timestamp).toLocaleString();
  };

  const getExecutionStatusDisplay = (execution: CommandResult) => {
    if (execution.isRunning) {
      return { text: "Running", className: styles.running };
    } else if (execution.exitCode === 0) {
      return { text: "Completed", className: styles.success };
    } else {
      return { text: "Failed", className: styles.failed };
    }
  };

  const handleStartEdit = (schedule: ScheduleConfig) => {
    setIsEditing(true);
    setEditingSchedule({ ...schedule });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingSchedule(null);
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    try {
      await scheduleActions.handleUpdateSchedule(editingSchedule.id, {
        name: editingSchedule.name,
        command: editingSchedule.command,
        cronExpression: editingSchedule.cronExpression,
        options: {
          ...(editingSchedule.options || {}),
        },
      });

      setIsEditing(false);
      setEditingSchedule(null);
    } catch (error) {
      console.error("Failed to save schedule:", error);
    }
  };

  // Add a function to handle execution click
  const handleExecutionClick = async (execution: CommandResult) => {
    setSelectedExecution(execution);
    setShowExecutionModal(true);
    commandActions.setSelectedResult(execution);
  };

  const handleCloseExecutionModal = () => {
    setShowExecutionModal(false);
  };

  // Filter command results by scheduleId
  const getScheduleExecutions = (scheduleId: string) => {
    return commandState.commandResults
      .filter((result) => result.scheduleId === scheduleId)
      .sort((a, b) => b.timestamp - a.timestamp);
  };

  // Only used when a schedule is selected
  const scheduleExecutions = scheduleState.selectedSchedule
    ? getScheduleExecutions(scheduleState.selectedSchedule.id)
    : [];

  // Function to calculate duration for completed commands or estimate for running ones
  const getDuration = (execution: CommandResult) => {
    if (execution.isRunning) {
      // For running commands, calculate time elapsed since start
      return Date.now() - execution.timestamp;
    } else if (execution.executionTime !== undefined) {
      // Use the actual measured execution time if available
      return execution.executionTime;
    } else {
      // For completed commands without execution time, use a default duration of 1000ms
      return 1000;
    }
  };

  return (
    <div className={styles.scheduleContent}>
      <div className={styles.scheduleAddSection}>
        <h2>Schedule Management</h2>

        {/* Add Schedule Form */}
        <div className={styles.formGroup}>
          <label htmlFor="scheduleName">Name:</label>
          <input
            id="scheduleName"
            type="text"
            value={scheduleState.scheduleName}
            onChange={(e) => scheduleActions.setScheduleName(e.target.value)}
            placeholder="Schedule name"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="scheduleCommand">Command:</label>
          <input
            id="scheduleCommand"
            type="text"
            value={scheduleState.scheduleCommand}
            onChange={(e) => scheduleActions.setScheduleCommand(e.target.value)}
            placeholder="Command to execute"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="scheduleCron">
            Cron Expression:
            {scheduleActions.cronError && (
              <span className={styles.error}> {scheduleActions.cronError}</span>
            )}
          </label>
          <input
            id="scheduleCron"
            type="text"
            value={scheduleState.scheduleCron}
            onChange={(e) => scheduleActions.setScheduleCron(e.target.value)}
            placeholder="* * * * *"
          />
          <small className={styles.cronHelp}>
            Format: minute hour day-of-month month day-of-week
          </small>
          <small className={styles.cronHelp}>
            Example: "0 * * * *" (hourly at minute 0)
          </small>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="scheduleTimeout">Timeout (seconds):</label>
          <input
            id="scheduleTimeout"
            type="number"
            min="0"
            value={scheduleState.scheduleTimeout}
            onChange={(e) =>
              scheduleActions.setScheduleTimeout(
                e.target.value ? Number(e.target.value) : ""
              )
            }
            placeholder="No timeout"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={scheduleState.scheduleEnabled}
              onChange={(e) =>
                scheduleActions.setScheduleEnabled(e.target.checked)
              }
            />
            Enabled
          </label>
        </div>

        <button
          className={styles.addButton}
          onClick={scheduleActions.handleAddSchedule}
        >
          Add Schedule
        </button>
      </div>

      <div className={styles.scheduleListSection}>
        <h3>Schedules</h3>
        {scheduleState.schedules.length === 0 ? (
          <p className={styles.noSchedules}>No schedules defined</p>
        ) : (
          <ul className={styles.scheduleList}>
            {scheduleState.schedules.map((schedule) => (
              <li
                key={schedule.id}
                onClick={() => scheduleActions.handleSelectSchedule(schedule)}
                className={
                  scheduleState.selectedSchedule?.id === schedule.id
                    ? styles.selected
                    : ""
                }
              >
                <div className={styles.scheduleHeader}>
                  <span className={styles.scheduleName}>{schedule.name}</span>
                  <span
                    className={`${styles.statusBadge} ${
                      schedule.enabled ? styles.success : styles.disabled
                    }`}
                  >
                    {schedule.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <span className={styles.scheduleCommand}>
                  {schedule.command}
                </span>
                <div className={styles.scheduleCron}>
                  <small>Cron: {schedule.cronExpression}</small>
                </div>
                <div className={styles.scheduleFooter}>
                  <small>Next run: {formatDate(schedule.nextRun)}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.scheduleDetailsSection}>
        {isEditing && editingSchedule ? (
          <div className={styles.editScheduleForm}>
            <h3>Edit Schedule</h3>
            <div className={styles.formGroup}>
              <label htmlFor="editName">Name:</label>
              <input
                id="editName"
                type="text"
                value={editingSchedule.name}
                onChange={(e) =>
                  setEditingSchedule({
                    ...editingSchedule,
                    name: e.target.value,
                  })
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="editCommand">Command:</label>
              <input
                id="editCommand"
                type="text"
                value={editingSchedule.command}
                onChange={(e) =>
                  setEditingSchedule({
                    ...editingSchedule,
                    command: e.target.value,
                  })
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="editCron">Cron Expression:</label>
              <input
                id="editCron"
                type="text"
                value={editingSchedule.cronExpression}
                onChange={(e) =>
                  setEditingSchedule({
                    ...editingSchedule,
                    cronExpression: e.target.value,
                  })
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="editTimeout">Timeout (seconds):</label>
              <input
                id="editTimeout"
                type="number"
                min="0"
                value={
                  editingSchedule.options?.timeout
                    ? editingSchedule.options.timeout / 1000
                    : ""
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setEditingSchedule({
                    ...editingSchedule,
                    options: {
                      ...(editingSchedule.options || {}),
                      timeout: value ? Number(value) * 1000 : undefined,
                    },
                  });
                }}
                placeholder="No timeout"
              />
            </div>

            <div className={styles.editActions}>
              <button
                className={styles.cancelButton}
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
              <button className={styles.saveButton} onClick={handleSaveEdit}>
                Save
              </button>
            </div>
          </div>
        ) : scheduleState.selectedSchedule ? (
          <div className={styles.scheduleDetail}>
            <div className={styles.scheduleDetailHeader}>
              <h3>{scheduleState.selectedSchedule.name}</h3>
              <div className={styles.scheduleActions}>
                <button
                  className={styles.editButton}
                  onClick={() =>
                    scheduleState.selectedSchedule &&
                    handleStartEdit(scheduleState.selectedSchedule)
                  }
                >
                  Edit
                </button>
                <button
                  className={
                    scheduleState.selectedSchedule.enabled
                      ? styles.disableButton
                      : styles.enableButton
                  }
                  onClick={() =>
                    scheduleActions.handleToggleEnabled(
                      scheduleState.selectedSchedule?.id || "",
                      !(scheduleState.selectedSchedule?.enabled ?? false)
                    )
                  }
                >
                  {scheduleState.selectedSchedule.enabled
                    ? "Disable"
                    : "Enable"}
                </button>
                <button
                  className={styles.runButton}
                  onClick={() =>
                    scheduleActions.handleExecuteNow(
                      scheduleState.selectedSchedule?.id ?? ""
                    )
                  }
                >
                  Run Now
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() =>
                    scheduleActions.handleRemoveSchedule(
                      scheduleState.selectedSchedule?.id ?? ""
                    )
                  }
                >
                  Delete
                </button>
              </div>
            </div>

            <div className={styles.scheduleInfo}>
              <div className={styles.scheduleInfoItem}>
                <span className={styles.scheduleInfoLabel}>Command:</span>
                <span>{scheduleState.selectedSchedule.command}</span>
              </div>
              <div className={styles.scheduleInfoItem}>
                <span className={styles.scheduleInfoLabel}>
                  Cron Expression:
                </span>
                <span>{scheduleState.selectedSchedule.cronExpression}</span>
              </div>
              <div className={styles.scheduleInfoItem}>
                <span className={styles.scheduleInfoLabel}>Status:</span>
                <span
                  className={
                    scheduleState.selectedSchedule.enabled
                      ? styles.success
                      : styles.disabled
                  }
                >
                  {scheduleState.selectedSchedule.enabled
                    ? "Enabled"
                    : "Disabled"}
                </span>
              </div>
              <div className={styles.scheduleInfoItem}>
                <span className={styles.scheduleInfoLabel}>Last Run:</span>
                <span>
                  {formatDate(scheduleState.selectedSchedule.lastRun)}
                </span>
              </div>
              <div className={styles.scheduleInfoItem}>
                <span className={styles.scheduleInfoLabel}>Next Run:</span>
                <span>
                  {formatDate(scheduleState.selectedSchedule.nextRun)}
                </span>
              </div>
              {scheduleState.selectedSchedule.options?.timeout && (
                <div className={styles.scheduleInfoItem}>
                  <span className={styles.scheduleInfoLabel}>Timeout:</span>
                  <span>
                    {scheduleState.selectedSchedule.options.timeout / 1000}{" "}
                    seconds
                  </span>
                </div>
              )}
            </div>

            <div className={styles.scheduleExecutions}>
              <h4>Recent Executions</h4>
              {scheduleExecutions.length === 0 ? (
                <p className={styles.noExecutions}>No executions yet</p>
              ) : (
                <ul className={styles.executionsList}>
                  {scheduleExecutions.map((execution) => {
                    const status = getExecutionStatusDisplay(execution);
                    return (
                      <li
                        key={execution.runId}
                        className={styles.executionItem}
                        onClick={() => handleExecutionClick(execution)}
                      >
                        <div className={styles.executionHeader}>
                          <span className={styles.executionTime}>
                            {new Date(execution.timestamp).toLocaleString()}
                          </span>
                          <span
                            className={`${styles.statusBadge} ${status.className}`}
                          >
                            {status.text}
                          </span>
                        </div>
                        <div className={styles.executionDetails}>
                          {!execution.isRunning && (
                            <span className={styles.executionDuration}>
                              Duration:{" "}
                              {(getDuration(execution) / 1000).toFixed(1)}s
                            </span>
                          )}
                          {execution.exitCode !== undefined && (
                            <span className={styles.executionExitCode}>
                              Exit Code: {execution.exitCode}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <p className={styles.noSelection}>
            Select a schedule to view details
          </p>
        )}
      </div>

      {/* Execution Details Modal */}
      {showExecutionModal && selectedExecution && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Execution Details</h3>
              <button
                className={styles.closeButton}
                onClick={handleCloseExecutionModal}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.executionDetailItem}>
                <span className={styles.detailLabel}>Command:</span>
                <span>{selectedExecution.command}</span>
              </div>
              <div className={styles.executionDetailItem}>
                <span className={styles.detailLabel}>Status:</span>
                <span
                  className={`${
                    getExecutionStatusDisplay(selectedExecution).className
                  }`}
                >
                  {getExecutionStatusDisplay(selectedExecution).text}
                </span>
              </div>
              <div className={styles.executionDetailItem}>
                <span className={styles.detailLabel}>Start Time:</span>
                <span>
                  {new Date(selectedExecution.timestamp).toLocaleString()}
                </span>
              </div>
              {!selectedExecution.isRunning && (
                <div className={styles.executionDetailItem}>
                  <span className={styles.detailLabel}>End Time:</span>
                  <span>
                    {new Date(
                      selectedExecution.timestamp +
                        getDuration(selectedExecution)
                    ).toLocaleString()}
                  </span>
                </div>
              )}
              {!selectedExecution.isRunning && (
                <div className={styles.executionDetailItem}>
                  <span className={styles.detailLabel}>Duration:</span>
                  <span>
                    {(getDuration(selectedExecution) / 1000).toFixed(1)} seconds
                  </span>
                </div>
              )}
              {selectedExecution.exitCode !== undefined && (
                <div className={styles.executionDetailItem}>
                  <span className={styles.detailLabel}>Exit Code:</span>
                  <span>{selectedExecution.exitCode}</span>
                </div>
              )}
              <div className={styles.executionDetailItem}>
                <span className={styles.detailLabel}>Run ID:</span>
                <span>{selectedExecution.runId}</span>
              </div>

              <div className={styles.outputSection}>
                <h4>Command Output:</h4>
                <pre className={styles.outputDisplay}>
                  {commandState.selectedResult?.output || "(No output)"}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
