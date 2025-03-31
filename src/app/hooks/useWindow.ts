import { atom, useAtom } from "jotai";

// ウィンドウのタイプを定義
type WindowType = "command" | "schedule" | "setting" | "serial";

// 現在のアクティブウィンドウを保存するアトム
const activeWindowAtom = atom<WindowType>("serial");

export function useWindow() {
  const [activeWindow, setActiveWindow] = useAtom(activeWindowAtom);

  return {
    activeWindow,
    setActiveWindow,
  };
}
