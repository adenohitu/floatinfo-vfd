import { atom, useAtom } from "jotai";

// ウィンドウのタイプを定義
type WindowType = "command" | "schedule" | "setting";

// 現在のアクティブウィンドウを保存するアトム
const activeWindowAtom = atom<WindowType>("command");

export function useWindow() {
  const [activeWindow, setActiveWindow] = useAtom(activeWindowAtom);

  return {
    activeWindow,
    setActiveWindow,
  };
}
