import { SerialPort } from "serialport";
import dayjs from "dayjs";

// UTF8 から SJIS への変換ユーティリティ
export function convertUTF8toSJIS(text: string): Buffer {
  const encoder = new TextEncoder();
  const utf8 = encoder.encode(text);

  // 実際のプロジェクトでは適切な変換ライブラリを使用する必要があります
  // この実装はシンプルな例として提供しています
  return Buffer.from(utf8);
}

// シリアル通信で送信するテキストデータの型定義
export interface SerialTextLine {
  text: string;
  speed: number;
  space: number;
  enabled: boolean;
  maxLength: number; // 行ごとの最大文字数
}

// 空のテキスト行を作成する関数
export function createEmptyTextLine(): SerialTextLine {
  return {
    text: "",
    speed: 0,
    space: 0,
    enabled: true,
    maxLength: 20, // デフォルトは20文字
  };
}

export interface SerialTextData {
  stateName: string;
  lines: SerialTextLine[];
  dayformat: string;
}

// シリアルポート管理クラス
export class SerialManager {
  private connections: Map<string, SerialPort> = new Map();
  private textDataMap: Map<string, SerialTextData> = new Map();
  private timerMap: Map<string, NodeJS.Timeout> = new Map();
  private lastRenderMap: Map<string, string> = new Map();

  // シリアルポート一覧の取得
  async getSerialPorts() {
    return await SerialPort.list();
  }

  // 使用中のシリアルポートパスを取得
  getConnectedPaths(): string[] {
    const paths: string[] = [];
    this.connections.forEach((port) => {
      paths.push(port.path);
    });
    return paths;
  }

  // シリアルポートへの接続
  async connectSerial(
    path: string,
    baudRate: number,
    tabId: string
  ): Promise<[string, number]> {
    // 既存の接続を閉じる
    if (this.connections.has(tabId)) {
      await this.closeSerial(tabId);
    }

    // 新しい接続を作成
    const port = new SerialPort({ path, baudRate });
    this.connections.set(tabId, port);

    // 定期更新タイマーを設定
    this.setupTimer(tabId);

    return [path, baudRate];
  }

  // シリアルポートの切断
  async closeSerial(tabId: string): Promise<void> {
    const port = this.connections.get(tabId);
    if (port?.isOpen) {
      port.close();
    }

    this.connections.delete(tabId);

    // タイマーを停止
    const timer = this.timerMap.get(tabId);
    if (timer) {
      clearInterval(timer);
      this.timerMap.delete(tabId);
    }
  }

  // テキスト更新の設定
  writeSerialText(tabId: string, data: SerialTextData): void {
    this.textDataMap.set(tabId, data);
  }

  // テキスト更新のタイマーを設定
  private setupTimer(tabId: string): void {
    // 既存のタイマーを停止
    if (this.timerMap.has(tabId)) {
      clearInterval(this.timerMap.get(tabId)!);
    }

    // 新しいタイマーを設定
    const timer = setInterval(() => {
      this.updateDisplay(tabId);
    }, 10);

    this.timerMap.set(tabId, timer);
  }

  // ディスプレイ更新処理
  private updateDisplay(tabId: string): void {
    const port = this.connections.get(tabId);
    const data = this.textDataMap.get(tabId);

    if (!port?.isOpen || !data) return;

    // ディスプレイに表示するテキストを生成
    let renderData = "";
    const now = Date.now();
    const dayFormatted = dayjs().format(data.dayformat);

    // 各行のテキストを処理
    data.lines.forEach((line, index) => {
      if (!line.enabled) return;

      // 各行の最大文字数 (デフォルトは20)
      const maxLength = line.maxLength || 20;

      // 日付置換とパディング
      const textReplaced = line.text
        .replaceAll("$date", dayFormatted)
        .padEnd(maxLength + line.space, " ");

      // スクロール位置の計算
      const startIndex =
        line.speed !== 0
          ? Math.floor((now / Math.abs(line.speed)) % textReplaced.length)
          : 0;

      // スクロール方向の処理
      let lineText;
      if (line.speed >= 0) {
        lineText = (
          textReplaced.slice(startIndex) + textReplaced.slice(0, startIndex)
        ).slice(0, maxLength);
      } else {
        lineText = (
          textReplaced.slice(-startIndex) + textReplaced.slice(0, -startIndex)
        ).slice(0, maxLength);
      }

      renderData += lineText;
    });

    // 前回と同じ内容なら更新しない
    if (this.lastRenderMap.get(tabId) !== renderData) {
      this.lastRenderMap.set(tabId, renderData);

      // CR文字を送信してカーソルを行頭に戻す
      port.write(Buffer.from([0x0d]));
      console.log(`${tabId}¥n`);

      console.log(renderData);

      // テキスト送信
      port.write(convertUTF8toSJIS(renderData));
    }
  }

  // ディスプレイクリア
  clearDisplay(tabId: string): void {
    const port = this.connections.get(tabId);
    if (port?.isOpen) {
      port.write(Buffer.from([0x0c]));
    }
  }
}
