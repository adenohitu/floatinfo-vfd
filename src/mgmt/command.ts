import fs from "fs";
import path from "path";
import { app } from "electron";
import { spawn } from "child_process";
import crypto from "crypto";
import jschardet from "jschardet";
import iconv from "iconv-lite";

export interface CommandResult {
  id: string;
  runId: string;
  command: string;
  output: string;
  timestamp: number;
  isRunning?: boolean;
  exitCode?: number | null;
  scheduleId?: string; // Added to track which schedule this command execution belongs to
  executionTime?: number; // 実行時間（ミリ秒）
}

export interface CommandExecutionOptions {
  timeout?: number; // Timeout in milliseconds
  scheduleId?: string; // ID of the schedule this command is executed from
}

export class commandMgmt {
  private logBasePath: string;
  private inMemoryResults: CommandResult[] = [];
  private maxResults = 50; // Maximum number of results to keep in memory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private activeCommands: Map<
    string,
    {
      process: import("child_process").ChildProcess | null;
      timeoutId?: NodeJS.Timeout;
    }
  > = new Map();
  private notifyCallback?: (result: CommandResult) => void;

  constructor() {
    // Create base log directory in userData folder
    this.logBasePath = path.join(app.getPath("userData"), "logdata");
    this.ensureDirectoryExists(this.logBasePath);

    // Load most recent results into memory for quick access
    this.loadRecentResults();
  }

  // Generate a command ID based on the command text
  private generateCommandId(command: string): string {
    // Create a hash of the command
    const hash = crypto.createHash("md5").update(command).digest("hex");
    // Use first 8 characters of the hash for brevity
    return `cmd-${hash.substring(0, 8)}`;
  }

  // New helper method to generate run ID
  private generateRunId(commandId: string, timestamp: number): string {
    // Add a random suffix to ensure uniqueness even for commands executed in the same millisecond
    const randomSuffix = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `${commandId}_${timestamp}_${randomSuffix}`;
  }

  // Set a callback function to be called when command results are updated
  setNotifyCallback(callback: (result: CommandResult) => void): void {
    this.notifyCallback = callback;
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private getCommandLogPath(runId: string): string {
    // Extract command ID and timestamp from runId, accounting for the new format with random suffix
    const parts = runId.split("_");
    const commandId = parts[0]; // This remains the same
    const timestamp = parseInt(parts[1], 10); // This is still the timestamp

    const date = new Date(timestamp);
    const runDate = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}_${String(
      date.getHours()
    ).padStart(2, "0")}-${String(date.getMinutes()).padStart(2, "0")}-${String(
      date.getSeconds()
    ).padStart(2, "0")}`;

    const commandDir = path.join(this.logBasePath, commandId);
    const runDir = path.join(commandDir, runDate);

    this.ensureDirectoryExists(commandDir);
    this.ensureDirectoryExists(runDir);

    return runDir;
  }

  // 文字コードを検出して UTF-8 に変換するヘルパーメソッド
  private convertToUtf8(buffer: Buffer): string {
    // 文字コードを検出
    const detected = jschardet.detect(buffer);
    const encoding = detected.encoding || "utf8";

    // UTF-8 の場合はそのまま返す
    if (
      encoding.toLowerCase() === "utf-8" ||
      encoding.toLowerCase() === "utf8" ||
      encoding.toLowerCase() === "ascii"
    ) {
      return buffer.toString();
    }

    // 文字コード変換を行う
    try {
      return iconv.decode(buffer, encoding);
    } catch (err) {
      console.error(`Failed to convert from ${encoding} to UTF-8:`, err);
      // 変換に失敗した場合は UTF-8 として解釈
      return buffer.toString();
    }
  }

  // Windows環境用の文字コード変換メソッド
  private convertToUtf8ForWindows(buffer: Buffer): string {
    // まずShift-JIS (CP932)として変換を試みる
    try {
      return iconv.decode(buffer, "cp932");
    } catch (err) {
      console.error(
        "Failed to convert using cp932, falling back to detection:",
        err
      );
      // 失敗した場合は一般的な検出ロジックに戻る
      return this.convertToUtf8(buffer);
    }
  }

  executeCommand(
    command: string,
    options?: CommandExecutionOptions
  ): CommandResult {
    // Generate ID from command
    const id = this.generateCommandId(command);
    const timestamp = Date.now();
    const runId = this.generateRunId(id, timestamp);

    // 同じコマンドIDのプロセスが既に実行中かチェック
    if (this.activeCommands.has(id)) {
      // 同じコマンドが実行中の場合はエラーメッセージを含む結果を返す
      const result: CommandResult = {
        id,
        runId,
        command,
        output:
          "Error: 同じコマンドが既に実行中です。実行がキャンセルされました。",
        timestamp,
        isRunning: false,
        exitCode: -5, // 重複実行エラーを示す特別なコード
        scheduleId: options?.scheduleId, // Store the scheduleId if provided
      };

      // 結果を保存して通知
      this.saveCommandResult(result);
      this.notifyCommandResult(result);

      return result;
    } else {
      // Create a result object with initial state
      const result: CommandResult = {
        id,
        runId,
        command,
        output: "",
        timestamp,
        isRunning: true,
        exitCode: null,
        scheduleId: options?.scheduleId, // Store the scheduleId if provided
      };

      // Store initial result and notify renderer
      this.saveCommandResult(result);
      this.notifyCommandResult(result);

      // 開始時間を記録
      const startTime = process.hrtime();

      // Parse command into components for spawn
      const args = command.split(/\s+/);
      const cmd = args.shift() || "";

      // Windows環境でのエンコーディング設定
      const spawnOptions: import("child_process").SpawnOptions = {
        shell: true, // Use shell to support shell features like pipes
      };

      // Windows環境の場合、コマンドに応じて適切な文字コード設定を追加
      if (process.platform === "win32") {
        spawnOptions.env = {
          ...process.env,
          PYTHONIOENCODING: "utf-8", // Python用
        };

        // コマンドプロンプトの場合はUTF-8モードに切り替え
        if (cmd.toLowerCase() === "cmd" || cmd.toLowerCase() === "cmd.exe") {
          const originalCommand = args.join(" ");
          args.length = 0;
          args.push("/c", `chcp 65001 >nul && ${originalCommand}`);
        }
        // PowerShellの場合はUTF-8出力を指定
        else if (cmd.toLowerCase().includes("powershell")) {
          if (!args.includes("-OutputEncoding")) {
            args.unshift("-OutputEncoding", "utf8");
          }
        }
      }

      // Execute the command with spawn instead of exec to get real-time output
      const spawnedProcess = spawn(cmd, args, spawnOptions);

      // Set up timeout if specified
      let timeoutId: NodeJS.Timeout | undefined;
      if (options?.timeout) {
        timeoutId = setTimeout(() => {
          // 先にプロセスを終了させる
          this.killCommand(id);

          // タイムアウトメッセージの追加と状態更新を1回の操作にまとめる
          const existingIndex = this.inMemoryResults.findIndex(r => r.runId === runId);
          if (existingIndex >= 0) {
            // 結果オブジェクトをコピー
            const result = { ...this.inMemoryResults[existingIndex] };
            
            // タイムアウトメッセージを追加
            result.output += `\nCommand timed out after ${
              options.timeout / 1000
            } seconds and was terminated.\n`;
            
            // 実行時間を計算して状態を更新
            const executionTimeMs = Date.now() - timestamp;
            result.isRunning = false;
            result.exitCode = -3;
            result.executionTime = executionTimeMs;
            
            // メモリ内の結果を更新
            this.inMemoryResults[existingIndex] = result;
            
            // 更新した結果をファイルに書き込み
            const logPath = this.getCommandLogPath(result.runId);
            const markdownContent = this.convertResultToMarkdown(result);
            fs.writeFileSync(path.join(logPath, "result.md"), markdownContent);
            
            // 更新された結果を通知
            this.notifyCommandResult(result);
          }
        }, options.timeout);
      }

      // Store the active command
      this.activeCommands.set(id, { process: spawnedProcess, timeoutId });

      // Capture stdout data - Windows環境に特化した処理を使用
      spawnedProcess.stdout.on("data", (data) => {
        const output =
          global.process.platform === "win32"
            ? this.convertToUtf8ForWindows(data)
            : this.convertToUtf8(data);
        this.updateCommandByRunId(runId, { output });
      });

      // Capture stderr data - 同様に特化した処理
      spawnedProcess.stderr.on("data", (data) => {
        const output =
          process.platform === "win32"
            ? this.convertToUtf8ForWindows(data)
            : this.convertToUtf8(data);
        this.updateCommandByRunId(runId, { output });
      });

      // Handle process completion
      spawnedProcess.on("close", (code) => {
        // Clear the timeout if it exists
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Remove from active commands
        this.activeCommands.delete(id);

        // 実行時間を計算 (ミリ秒単位)
        const endTime = process.hrtime(startTime);
        const executionTimeMs = Math.round(
          endTime[0] * 1000 + endTime[1] / 1000000
        );

        // Update command status and add execution time
        this.updateCommandByRunId(runId, {
          isRunning: false,
          exitCode: code,
          executionTime: executionTimeMs
        });
      });

      // Handle process errors
      spawnedProcess.on("error", (err) => {
        // Clear the timeout if it exists
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Remove from active commands
        this.activeCommands.delete(id);

        // 実行時間を計算 (ミリ秒単位)
        const endTime = process.hrtime(startTime);
        const executionTimeMs = Math.round(
          endTime[0] * 1000 + endTime[1] / 1000000
        );

        // Append error message and mark as failed with execution time
        this.updateCommandByRunId(runId, {
          output: `\n\nError executing command: ${err.message}`,
          isRunning: false,
          exitCode: 1,
          executionTime: executionTimeMs
        });
      });

      // Return the command result for linking with schedules
      return result;
    }
  }

  killCommand(id: string): void {
    const commandObj = this.activeCommands.get(id);
    if (commandObj) {
      const { process, timeoutId } = commandObj;

      // Clear the timeout if it exists
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Kill the process
      if (process && !process.killed) {
        try {
          process.kill();
        } catch (err) {
          console.error(`Error killing process for command ${id}:`, err);
        }
      }

      // Remove from active commands
      this.activeCommands.delete(id);

      // Mark command as terminated abnormally in one operation
      const currentResult = this.getCommandResults().find((r) => r.id === id);
      if (currentResult) {
        // 結果オブジェクトをコピー
        const result = { ...currentResult };
        
        // 状態を異常終了に更新
        result.isRunning = false;
        result.exitCode = -2; // 異常終了を示す特別なコード
        
        // メモリ内の結果を更新
        const existingIndex = this.inMemoryResults.findIndex(r => r.runId === currentResult.runId);
        if (existingIndex >= 0) {
          this.inMemoryResults[existingIndex] = result;
          
          // 更新した結果をファイルに書き込み
          const logPath = this.getCommandLogPath(result.runId);
          const markdownContent = this.convertResultToMarkdown(result);
          fs.writeFileSync(path.join(logPath, "result.md"), markdownContent);
          
          // 更新された結果を通知
          this.notifyCommandResult(result);
        }
      }
    }
  }

  manualKillCommand(id: string): void {
    const commandObj = this.activeCommands.get(id);
    if (commandObj) {
      const { process, timeoutId } = commandObj;

      // Clear the timeout if it exists
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Kill the process
      if (process && !process.killed) {
        try {
          process.kill();
        } catch (err) {
          console.error(`Error killing process for command ${id}:`, err);
        }
      }

      // Remove from active commands
      this.activeCommands.delete(id);

      // Mark command as manually terminated with message
      const currentResult = this.getCommandResults().find((r) => r.id === id);
      if (currentResult) {
        // appendCommandOutputとmarkCommandCompleteを1回のファイル操作にまとめる
        const runId = currentResult.runId;
        
        // 結果オブジェクトをコピー
        const result = { ...currentResult };
        
        // 停止メッセージを追加して状態を更新
        result.output += `\n\nCommand was manually stopped by user.`;
        result.isRunning = false;
        result.exitCode = -4; // -4 for manual termination
        
        // メモリ内の結果を更新
        const existingIndex = this.inMemoryResults.findIndex(r => r.runId === runId);
        if (existingIndex >= 0) {
          this.inMemoryResults[existingIndex] = result;
          
          // 更新した結果をファイルに書き込み
          const logPath = this.getCommandLogPath(result.runId);
          const markdownContent = this.convertResultToMarkdown(result);
          fs.writeFileSync(path.join(logPath, "result.md"), markdownContent);
          
          // 更新された結果を通知
          this.notifyCommandResult(result);
        }
      }
    }
  }

  private notifyCommandResult(result: CommandResult): void {
    if (this.notifyCallback) {
      // 渡されたresultパラメータを直接使用する
      this.notifyCallback(result);
    }
  }

  saveCommandResult(result: CommandResult): void {
    const existingIndex = this.inMemoryResults.findIndex(
      (r) => r.runId === result.runId
    );

    if (existingIndex >= 0) {
      this.inMemoryResults[existingIndex] = { ...result };
    } else {
      this.inMemoryResults.unshift({ ...result });
      if (this.inMemoryResults.length > this.maxResults) {
        this.inMemoryResults.length = this.maxResults;
      }
    }

    const logPath = this.getCommandLogPath(result.runId);
    const markdownContent = this.convertResultToMarkdown(result);
    fs.writeFileSync(path.join(logPath, "result.md"), markdownContent);
  }

  appendCommandOutput(id: string, output: string, timestamp: number): void {
    // Find command in memory using runId format for backwards compatibility
    const runId = this.generateRunId(id, timestamp);

    // Find the command by runId directly
    const existingIndex = this.inMemoryResults.findIndex(
      (r) => r.runId === runId
    );

    if (existingIndex >= 0) {
      // コピーを作成して操作
      const result = { ...this.inMemoryResults[existingIndex] };

      // 新しい出力を追加
      result.output += output;

      // メモリ内の結果を更新
      this.inMemoryResults[existingIndex] = result;

      // 更新した結果をファイルに書き込み
      const logPath = this.getCommandLogPath(result.runId);
      const markdownContent = this.convertResultToMarkdown(result);
      fs.writeFileSync(path.join(logPath, "result.md"), markdownContent);

      // 更新された結果を一度だけ通知
      this.notifyCommandResult(result);
    }
  }

  // 新しい関数: 出力追加とステータス更新を一度にできるように統合
  updateCommandByRunId(
    runId: string, 
    options?: {
      output?: string;
      isRunning?: boolean;
      exitCode?: number | null;
      executionTime?: number;
    }
  ): void {
    // Find the command by runId directly
    const existingIndex = this.inMemoryResults.findIndex(
      (r) => r.runId === runId
    );

    if (existingIndex >= 0) {
      // コピーを作成して操作
      const result = { ...this.inMemoryResults[existingIndex] };

      // 各オプションを適用
      if (options?.output) {
        result.output += options.output;
      }
      
      if (options?.isRunning !== undefined) {
        result.isRunning = options.isRunning;
      }
      
      if (options?.exitCode !== undefined) {
        result.exitCode = options.exitCode;
      }
      
      if (options?.executionTime !== undefined) {
        result.executionTime = options.executionTime;
      }

      // メモリ内の結果を更新
      this.inMemoryResults[existingIndex] = result;

      // 更新した結果をファイルに書き込み
      const logPath = this.getCommandLogPath(result.runId);
      const markdownContent = this.convertResultToMarkdown(result);
      fs.writeFileSync(path.join(logPath, "result.md"), markdownContent);

      // 更新された結果を通知
      this.notifyCommandResult(result);
    }
  }

  private convertResultToMarkdown(result: CommandResult): string {
    let statusText;
    if (result.isRunning) {
      statusText = "Running";
    } else if (result.exitCode === 0) {
      statusText = "Success";
    } else if (result.exitCode === -2) {
      statusText = "Terminated abnormally";
    } else if (result.exitCode === -3) {
      statusText = "Timeout terminated";
    } else if (result.exitCode === -4) {
      statusText = "Manually stopped";
    } else if (result.exitCode === -5) {
      statusText = "Duplicate execution prevented";
    } else {
      statusText = `Failed (exit code: ${
        result.exitCode !== null ? result.exitCode : "unknown"
      })`;
    }

    // 数値ステータスを明確に定義して保存
    const statusValue = result.exitCode;

    // Build the markdown content
    let markdown = `# Command Execution Result

- **Command:** \`${result.command}\`
- **ID:** \`${result.id}\`
- **Timestamp:** ${new Date(result.timestamp).toLocaleString()}
- **Status:** ${statusValue}
- **Status Text:** ${statusText}`;

    // Add execution time if available
    if (result.executionTime !== undefined) {
      const seconds = (result.executionTime / 1000).toFixed(3);
      markdown += `\n- **Execution Time:** ${seconds} seconds`;
    }

    // Add scheduleId if it exists
    if (result.scheduleId) {
      markdown += `\n- **ScheduleID:** \`${result.scheduleId}\``;
    }

    // Add the output section
    markdown += `\n\n## Output
\`\`\`
${result.output || "(No output yet)"}
\`\`\`
`;

    return markdown;
  }

  getCommandResults(): CommandResult[] {
    return this.inMemoryResults;
  }

  // Load the most recent command results from filesystem
  private loadRecentResults(): void {
    try {
      if (!fs.existsSync(this.logBasePath)) return;

      // Get all command directories
      const commandDirs = fs.readdirSync(this.logBasePath);

      const allResults: CommandResult[] = [];

      for (const commandId of commandDirs) {
        const commandPath = path.join(this.logBasePath, commandId);
        if (!fs.statSync(commandPath).isDirectory()) continue;

        // Get all run date directories for this command
        const runDirs = fs.readdirSync(commandPath);

        for (const runDir of runDirs) {
          const resultPath = path.join(commandPath, runDir, "result.md");

          if (fs.existsSync(resultPath)) {
            try {
              const resultData = fs.readFileSync(resultPath, "utf8");
              const result = this.parseMarkdownToResult(resultData);
              if (result) {
                allResults.push(result);
              }
            } catch (err) {
              console.error(`Error reading result file ${resultPath}:`, err);
            }
          }
        }
      }

      // Sort by timestamp (newest first) and limit results
      allResults.sort((a, b) => b.timestamp - a.timestamp);
      this.inMemoryResults = allResults.slice(0, this.maxResults);
    } catch (err) {
      console.error("Error loading command results:", err);
    }
  }

  private parseMarkdownToResult(markdown: string): CommandResult | null {
    try {
      const lines = markdown.split("\n");
      const result: Partial<CommandResult> = {};

      // 出力内容を初期化
      result.output = "";

      for (const line of lines) {
        if (line.startsWith("- **Command:**")) {
          result.command = line
            .replace("- **Command:**", "")
            .trim()
            .slice(1, -1);
        } else if (line.startsWith("- **ID:**")) {
          result.id = line.replace("- **ID:**", "").trim().slice(1, -1);
        } else if (line.startsWith("- **Timestamp:**")) {
          result.timestamp = new Date(
            line.replace("- **Timestamp:**", "").trim()
          ).getTime();
        } else if (line.startsWith("- **Status:**")) {
          const statusValue = parseInt(
            line.replace("- **Status:**", "").trim(),
            10
          );

          // 数値ステータスから状態を復元
          if (statusValue === -1) {
            result.isRunning = true;
            result.exitCode = null;
          } else {
            result.isRunning = false;
            result.exitCode = statusValue;
          }
          // 内部で利用するrunIdを生成
          if (!result.runId && result.id && result.timestamp) {
            // Generate a new style runId if loading from an old format file
            // This ensures compatibility with existing data
            result.runId = this.generateRunId(result.id, result.timestamp);
          }
        } else if (line.startsWith("- **ScheduleID:**")) {
          // Parse ScheduleID if present
          result.scheduleId = line
            .replace("- **ScheduleID:**", "")
            .trim()
            .slice(1, -1);
        } else if (line.startsWith("```")) {
          const outputStart = lines.indexOf(line) + 1;
          const outputEnd = lines.indexOf("```", outputStart);
          if (outputStart < outputEnd) {
            result.output = lines.slice(outputStart, outputEnd).join("\n");
          }
          break;
        }
      }

      if (result.id && result.command && result.timestamp !== undefined) {
        // ファイルから読み込んだ「実行中」のコマンドは、異常終了扱いに変更
        if (result.isRunning) {
          result.isRunning = false;
          // すでにマイナスの値がexitCodeに設定されている場合、そのままにする
          if (result.exitCode === null || result.exitCode >= 0) {
            result.exitCode = -2; // 異常終了を示す特別なコード
          }
        }
        return result as CommandResult;
      }
    } catch (err) {
      console.error("Error parsing markdown:", err);
    }
    return null;
  }
}
