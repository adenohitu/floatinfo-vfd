import { atom, useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { ScheduleConfig } from "../../mgmt/schedule";

// Atom states for schedules
const schedulesAtom = atom<ScheduleConfig[]>([]);
const selectedScheduleAtom = atom<ScheduleConfig | null>();

// Form input atoms
const scheduleNameAtom = atom<string>("");
const scheduleCommandAtom = atom<string>("");
const scheduleCronAtom = atom<string>("0 * * * *"); // Default: hourly
const scheduleTimeoutAtom = atom<number | "">("");
const scheduleEnabledAtom = atom<boolean>(true);

// Hook for schedule state
export function useScheduleState() {
  const [schedules] = useAtom(schedulesAtom);
  const [selectedSchedule] = useAtom(selectedScheduleAtom);
  const [scheduleName] = useAtom(scheduleNameAtom);
  const [scheduleCommand] = useAtom(scheduleCommandAtom);
  const [scheduleCron] = useAtom(scheduleCronAtom);
  const [scheduleTimeout] = useAtom(scheduleTimeoutAtom);
  const [scheduleEnabled] = useAtom(scheduleEnabledAtom);

  return {
    schedules,
    selectedSchedule,
    scheduleName,
    scheduleCommand,
    scheduleCron,
    scheduleTimeout,
    scheduleEnabled,
  };
}

// Hook for schedule actions
export function useScheduleActions() {
  const [schedules, setSchedules] = useAtom(schedulesAtom);
  const [selectedSchedule, setSelectedSchedule] = useAtom(selectedScheduleAtom);
  const [scheduleName, setScheduleName] = useAtom(scheduleNameAtom);
  const [scheduleCommand, setScheduleCommand] = useAtom(scheduleCommandAtom);
  const [scheduleCron, setScheduleCron] = useAtom(scheduleCronAtom);
  const [scheduleTimeout, setScheduleTimeout] = useAtom(scheduleTimeoutAtom);
  const [scheduleEnabled, setScheduleEnabled] = useAtom(scheduleEnabledAtom);

  // State to track validation errors
  const [cronError, setCronError] = useState<string | null>(null);

  // Reference to the selected schedule ID for event tracking
  const selectedScheduleIdRef = useRef<string | null>(null);

  // Update ref when selected schedule changes
  useEffect(() => {
    selectedScheduleIdRef.current = selectedSchedule?.id || null;
  }, [selectedSchedule]);

  // Load schedules and set up event listener
  useEffect(() => {
    // Load existing schedules
    window.electronAPI.getSchedules().then((result) => {
      setSchedules(result);
    });

    // Listen for schedule events
    const handleScheduleEvent = (data: ScheduleConfig) => {
      // It's a ScheduleConfig event
      setSchedules((prev) => {
        const newSchedules = [...prev];
        const existingIndex = newSchedules.findIndex((s) => s.id === data.id);

        if (existingIndex >= 0) {
          newSchedules[existingIndex] = data as ScheduleConfig;
        } else {
          newSchedules.push(data as ScheduleConfig);
        }

        return newSchedules;
      });

      // Update selected schedule if needed
      if (selectedScheduleIdRef.current === data.id) {
        setSelectedSchedule(data as ScheduleConfig);
      }
    };

    window.electronAPI.onScheduleEvent(handleScheduleEvent);

    return () => {
      // Cleanup if needed
    };
  }, [setSchedules, setSelectedSchedule]);

  // Validate cron expression
  const validateCron = (expression: string): boolean => {
    try {
      // We can attempt to parse it
      // This is just a basic validation; we'll rely on the backend for actual parsing
      const parts = expression.split(" ");
      if (parts.length !== 5) {
        setCronError(
          "Cron expression must have 5 parts (minute, hour, day, month, weekday)"
        );
        return false;
      }

      setCronError(null);
      return true;
    } catch (error) {
      setCronError("Invalid cron expression");
      return false;
    }
  };

  // Handler for adding a new schedule
  const handleAddSchedule = async () => {
    if (!scheduleName.trim()) {
      alert("Schedule name is required");
      return;
    }

    if (!scheduleCommand.trim()) {
      alert("Command is required");
      return;
    }

    if (!validateCron(scheduleCron)) {
      return;
    }

    const newSchedule: Omit<ScheduleConfig, "id" | "createdAt" | "updatedAt"> =
      {
        name: scheduleName.trim(),
        command: scheduleCommand.trim(),
        commandId: "", // This will be assigned by the backend
        cronExpression: scheduleCron,
        enabled: scheduleEnabled,
        options:
          typeof scheduleTimeout === "number" && scheduleTimeout > 0
            ? { timeout: scheduleTimeout * 1000 }
            : undefined,
      };

    try {
      const result = await window.electronAPI.addSchedule(newSchedule);

      // Clear form
      setScheduleName("");
      setScheduleCommand("");
      setScheduleCron("0 * * * *");
      setScheduleTimeout("");
      setScheduleEnabled(true);

      // Select the new schedule
      setSelectedSchedule(result);
    } catch (error) {
      console.error("Failed to add schedule:", error);
      alert("Failed to add schedule");
    }
  };

  // Handler for updating a schedule
  const handleUpdateSchedule = async (
    id: string,
    updates: Partial<ScheduleConfig>
  ) => {
    // Validate cron expression if it's being updated
    if (updates.cronExpression && !validateCron(updates.cronExpression)) {
      return;
    }

    try {
      const updatedSchedule = await window.electronAPI.updateSchedule(
        id,
        updates
      );
      if (updatedSchedule) {
        // Update selected schedule if this is the one being edited
        if (selectedSchedule?.id === id) {
          setSelectedSchedule(updatedSchedule);
        }
      }
    } catch (error) {
      console.error("Failed to update schedule:", error);
      alert("Failed to update schedule");
    }
  };

  // Handler for removing a schedule
  const handleRemoveSchedule = async (id: string) => {
    try {
      const success = await window.electronAPI.removeSchedule(id);
      if (success) {
        // If the removed schedule was selected, clear selection
        if (selectedSchedule?.id === id) {
          setSelectedSchedule(null);
        }

        // Update schedules list
        setSchedules(schedules.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error("Failed to remove schedule:", error);
      alert("Failed to remove schedule");
    }
  };

  // Handler for selecting a schedule
  const handleSelectSchedule = async (schedule: ScheduleConfig) => {
    setSelectedSchedule(schedule);
  };

  // Handler for executing a schedule immediately
  const handleExecuteNow = async (id: string) => {
    try {
      await window.electronAPI.executeScheduleNow(id);
    } catch (error) {
      console.error("Failed to execute schedule:", error);
      alert("Failed to execute schedule");
    }
  };

  // Handler for toggling the enabled state of a schedule
  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await window.electronAPI.setScheduleEnabled(id, enabled);
    } catch (error) {
      console.error("Failed to update schedule enabled state:", error);
      alert("Failed to update schedule");
    }
  };

  return {
    setScheduleName,
    setScheduleCommand,
    setScheduleCron,
    setScheduleTimeout,
    setScheduleEnabled,
    handleAddSchedule,
    handleUpdateSchedule,
    handleRemoveSchedule,
    handleSelectSchedule,
    handleExecuteNow,
    handleToggleEnabled,
    cronError,
  };
}
