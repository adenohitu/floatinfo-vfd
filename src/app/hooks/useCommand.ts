import { atom, useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { CommandResult } from "../../mgmt/command";

const commandAtom = atom("");
const timeoutAtom = atom<number | "">(10);
const commandResultsAtom = atom<CommandResult[]>([]);
const selectedResultAtom = atom<CommandResult>();

export function useCommandState() {
  const [command] = useAtom(commandAtom);
  const [timeout] = useAtom(timeoutAtom);
  const [commandResults] = useAtom(commandResultsAtom);
  const [selectedResult] = useAtom(selectedResultAtom);

  return { command, timeout, commandResults, selectedResult };
}

export function useCommandActions() {
  const [command, setCommand] = useAtom(commandAtom);
  const [timeout, setTimeout] = useAtom(timeoutAtom);
  const [, setCommandResults] = useAtom(commandResultsAtom);
  const [selectedResult, setSelectedResult] = useAtom(selectedResultAtom);

  const selectedResultIdRef = useRef<string | null>(null);

  useEffect(() => {
    // 選択されている結果のrunIdを記録
    selectedResultIdRef.current = selectedResult?.runId || null;
  }, [selectedResult]);

  useEffect(() => {
    window.electronAPI.getCommandResults().then((results) => {
      setCommandResults(results);
    });

    const handleCommandResult = (result: CommandResult) => {
      setCommandResults((prev) => {
        const newResults = [...prev];
        // runIdを使って結果を特定する
        const existingIndex = newResults.findIndex(
          (r) => r.runId === result.runId
        );

        if (existingIndex >= 0) {
          newResults[existingIndex] = result;
        } else {
          newResults.unshift(result);
        }

        return newResults;
      });

      // 選択されている結果の更新は、runIdで比較する
      if (selectedResultIdRef.current === result.runId) {
        setSelectedResult(result);
      }
    };

    window.electronAPI.onCommandResult(handleCommandResult);

    // Add listener for showing command by runId (from schedule execution)
    const handleShowCommandByRunId = (runId: string) => {
      // Find the command result with the given runId
      window.electronAPI.getCommandResults().then((results) => {
        const result = results.find((r) => r.runId === runId);
        if (result) {
          // Set it as the selected result
          setSelectedResult(result);
        }
      });
    };

    // Set up the listener for show-command-by-runid using the exposed API
    window.electronAPI.onShowCommandByRunId(handleShowCommandByRunId);

    return () => {
      // No need for cleanup as the IPC event listeners are managed by electron
    };
  }, [setCommandResults, setSelectedResult]);

  const handleExecute = () => {
    if (!command.trim()) return;

    const options =
      typeof timeout === "number" && timeout > 0
        ? { timeout: timeout * 1000 } // Ensure options is an object
        : undefined;

    window.electronAPI.executeCommand(command, options);
    setCommand("");
  };

  const handleKillCommand = (id: string) => {
    window.electronAPI.killCommand(id);
  };

  const handleResultClick = (result: CommandResult) => {
    setSelectedResult(result);
  };

  return {
    setCommand,
    setTimeout,
    handleExecute,
    handleKillCommand,
    handleResultClick,
    setSelectedResult,
  };
}
