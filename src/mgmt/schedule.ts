import fs from "fs";
import path from "path";
import { app } from "electron";
import { v4 as uuidv4 } from "uuid";
// Fix import for cron-parser
import { CronExpressionParser } from "cron-parser";
import { commandMgmt, CommandResult } from "./command";

// Interface for schedule configuration
export interface ScheduleConfig {
  id: string;
  name: string;
  commandId: string;
  command: string;
  cronExpression: string;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  options?: {
    timeout?: number;
  };
  createdAt: number;
  updatedAt: number;
}

// Events that can be emitted by the scheduler
export type ScheduleEventType =
  | "schedule-added"
  | "schedule-updated"
  | "schedule-removed";

// Event handler type
export type ScheduleEventHandler = (data: ScheduleConfig) => void;

export class scheduleMgmt {
  private scheduleBasePath: string;
  private schedules: ScheduleConfig[] = [];
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private commandMgmt: commandMgmt;
  private eventHandlers: Map<ScheduleEventType, ScheduleEventHandler[]> =
    new Map();

  constructor(cmdMgmt: commandMgmt) {
    // Use the command management instance
    this.commandMgmt = cmdMgmt;

    // Create schedule directory in userData folder
    this.scheduleBasePath = path.join(app.getPath("userData"), "scheduledata");
    this.ensureDirectoryExists(this.scheduleBasePath);

    // Load schedules from storage
    this.loadSchedules();

    // Set up a listener for command results to track scheduled command executions
    this.commandMgmt.setNotifyCallback(this.handleCommandResult.bind(this));

    // Start all enabled schedules
    this.startAllSchedules();
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // Event handling methods
  on(eventType: ScheduleEventType, handler: ScheduleEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)?.push(handler);
  }

  private emit(eventType: ScheduleEventType, data: ScheduleConfig): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.forEach((handler) => handler(data));
  }

  // Load schedules from the JSON file
  private loadSchedules(): void {
    const filePath = path.join(this.scheduleBasePath, "schedules.json");

    if (fs.existsSync(filePath)) {
      try {
        const data = fs.readFileSync(filePath, "utf8");
        this.schedules = JSON.parse(data);

        // Update next run times for all loaded schedules
        this.schedules.forEach((schedule) => {
          if (schedule.enabled) {
            try {
              const interval = CronExpressionParser.parse(
                schedule.cronExpression
              );
              schedule.nextRun = interval.next().getTime();
            } catch (err) {
              console.error(
                `Error parsing cron expression for schedule ${schedule.id}:`,
                err
              );
              schedule.enabled = false; // Disable schedule with invalid cron expression
            }
          }
        });
      } catch (err) {
        console.error("Error loading schedules:", err);
        this.schedules = [];
      }
    }
  }

  // Save schedules to the JSON file
  private saveSchedules(): void {
    const filePath = path.join(this.scheduleBasePath, "schedules.json");
    try {
      fs.writeFileSync(filePath, JSON.stringify(this.schedules, null, 2));
    } catch (err) {
      console.error("Error saving schedules:", err);
    }
  }

  // Get all schedules
  getSchedules(): ScheduleConfig[] {
    return [...this.schedules];
  }

  // Get a specific schedule by ID
  getScheduleById(id: string): ScheduleConfig | undefined {
    return this.schedules.find((schedule) => schedule.id === id);
  }

  // Get recent executions
  getRecentExecutions(limit = 50): CommandResult[] {
    // Get command results that have a scheduleId (meaning they were executed by a schedule)
    const commandResults = this.commandMgmt
      .getCommandResults()
      .filter((result) => result.scheduleId);

    // Sort by timestamp, newest first
    commandResults.sort((a, b) => b.timestamp - a.timestamp);

    return commandResults.slice(0, limit);
  }

  // Get executions for a specific schedule
  getExecutionsForSchedule(scheduleId: string, limit = 10): CommandResult[] {
    // Filter executions that belong to the specified schedule
    return this.getRecentExecutions(100)
      .filter((execution) => execution.scheduleId === scheduleId)
      .slice(0, limit);
  }

  // Add a new schedule
  addSchedule(
    config: Omit<ScheduleConfig, "id" | "createdAt" | "updatedAt">
  ): ScheduleConfig {
    // Generate ID for the new schedule
    const id = uuidv4();
    const now = Date.now();

    // Create the schedule object
    const newSchedule: ScheduleConfig = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // Calculate next run time if enabled
    if (newSchedule.enabled) {
      try {
        const interval = CronExpressionParser.parse(newSchedule.cronExpression);
        newSchedule.nextRun = interval.next().getTime();
      } catch (err) {
        console.error(`Error parsing cron expression for new schedule:`, err);
        newSchedule.enabled = false; // Disable schedule with invalid cron expression
      }
    }

    // Add to the schedules list
    this.schedules.push(newSchedule);

    // Save schedules to disk
    this.saveSchedules();

    // Start the schedule if enabled
    if (newSchedule.enabled) {
      this.scheduleNextRun(newSchedule);
    }

    // Emit event
    this.emit("schedule-added", newSchedule);

    return newSchedule;
  }

  // Update an existing schedule
  updateSchedule(
    id: string,
    updates: Partial<Omit<ScheduleConfig, "id" | "createdAt" | "updatedAt">>
  ): ScheduleConfig | null {
    const index = this.schedules.findIndex((schedule) => schedule.id === id);
    if (index === -1) return null;

    // Get the current schedule
    const currentSchedule = { ...this.schedules[index] };

    // Clear existing timer if schedule exists
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id)!);
      this.timers.delete(id);
    }

    // Update the schedule with new values
    const updatedSchedule: ScheduleConfig = {
      ...currentSchedule,
      ...updates,
      updatedAt: Date.now(),
    };

    // Recalculate next run time if cron expression changed or schedule was enabled
    if (
      (updates.cronExpression &&
        updates.cronExpression !== currentSchedule.cronExpression) ||
      (updates.enabled === true && !currentSchedule.enabled)
    ) {
      try {
        const interval = CronExpressionParser.parse(
          updatedSchedule.cronExpression
        );
        updatedSchedule.nextRun = interval.next().getTime();
      } catch (err) {
        console.error(
          `Error parsing updated cron expression for schedule ${id}:`,
          err
        );
        updatedSchedule.enabled = false; // Disable schedule with invalid cron expression
      }
    }

    // Update the schedule in the list
    this.schedules[index] = updatedSchedule;

    // Save schedules to disk
    this.saveSchedules();

    // Schedule next run if enabled
    if (updatedSchedule.enabled) {
      this.scheduleNextRun(updatedSchedule);
    }

    // Emit event
    this.emit("schedule-updated", updatedSchedule);

    return updatedSchedule;
  }

  // Remove a schedule
  removeSchedule(id: string): boolean {
    const index = this.schedules.findIndex((schedule) => schedule.id === id);
    if (index === -1) return false;

    // Clear any existing timer
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id)!);
      this.timers.delete(id);
    }

    // Remove the schedule
    const [removedSchedule] = this.schedules.splice(index, 1);

    // Save schedules to disk
    this.saveSchedules();

    // Emit event
    this.emit("schedule-removed", removedSchedule);

    return true;
  }

  // Execute a schedule immediately
  executeNow(id: string): CommandResult | null {
    const schedule = this.schedules.find((s) => s.id === id);
    if (!schedule) return null;

    return this.executeSchedule(schedule);
  }

  // Start all enabled schedules
  startAllSchedules(): void {
    // Clear any existing timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Schedule each enabled schedule
    this.schedules.forEach((schedule) => {
      if (schedule.enabled) {
        this.scheduleNextRun(schedule);
      }
    });
  }

  // Enable or disable a schedule
  setScheduleEnabled(id: string, enabled: boolean): ScheduleConfig | null {
    return this.updateSchedule(id, { enabled });
  }

  // Handle the result of a command execution
  private handleCommandResult(result: CommandResult): void {
    // Check if this command result belongs to a schedule by checking the scheduleId field
    if (!result.scheduleId) {
      return; // Not a scheduled command
    }

    // Find the schedule this command belongs to
    const schedule = this.schedules.find((s) => s.id === result.scheduleId);
    if (!schedule) return;

    // Update schedule's last run timestamp directly in the schedules array without triggering a reschedule
    const index = this.schedules.findIndex((s) => s.id === schedule.id);
    if (index !== -1) {
      this.schedules[index].lastRun = Date.now();
      this.saveSchedules();

      // Emit an event that the schedule was updated
      this.emit("schedule-updated", this.schedules[index]);
    }
  }

  // Schedule the next run of a schedule
  private scheduleNextRun(schedule: ScheduleConfig): void {
    if (!schedule.enabled || !schedule.nextRun) return;

    const now = Date.now();
    let delay = schedule.nextRun - now;

    // If next run is in the past, recalculate
    if (delay < 0) {
      try {
        const interval = CronExpressionParser.parse(schedule.cronExpression);
        schedule.nextRun = interval.next().getTime();
        delay = schedule.nextRun - now;

        // Update the schedule
        const index = this.schedules.findIndex((s) => s.id === schedule.id);
        if (index !== -1) {
          this.schedules[index].nextRun = schedule.nextRun;
          this.saveSchedules();
        }
      } catch (err) {
        console.error(
          `Error parsing cron expression for schedule ${schedule.id}:`,
          err
        );
        return;
      }
    }

    // Schedule the execution
    const timer = setTimeout(() => {
      this.executeSchedule(schedule);

      // Schedule the next run
      try {
        const interval = CronExpressionParser.parse(schedule.cronExpression);
        schedule.nextRun = interval.next().getTime();

        // Update the schedule
        const index = this.schedules.findIndex((s) => s.id === schedule.id);
        if (index !== -1) {
          this.schedules[index].nextRun = schedule.nextRun;
          this.saveSchedules();
        }

        // Schedule the next run
        this.scheduleNextRun(schedule);
      } catch (err) {
        console.error(
          `Error scheduling next run for schedule ${schedule.id}:`,
          err
        );
      }
    }, delay);

    // Store the timer
    this.timers.set(schedule.id, timer);
  }

  // Execute a schedule
  private executeSchedule(schedule: ScheduleConfig): CommandResult {
    // Prepare execution options
    const options = {
      ...schedule.options,
      scheduleId: schedule.id, // Add scheduleId to the options
    };

    // Execute the command
    const commandResult = this.commandMgmt.executeCommand(
      schedule.command,
      options
    );

    // Update schedule's last run timestamp directly in the schedules array without triggering a reschedule
    const index = this.schedules.findIndex((s) => s.id === schedule.id);
    if (index !== -1) {
      this.schedules[index].lastRun = Date.now();
      this.saveSchedules();

      // Emit an event that the schedule was updated
      this.emit("schedule-updated", this.schedules[index]);
    }

    return commandResult;
  }
}
