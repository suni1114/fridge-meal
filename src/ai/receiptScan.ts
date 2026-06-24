// 웹/Expo Go 폴백 — 온디바이스 OCR(ML Kit)이 없어 데모용 샘플을 돌려준다.
// 실제 OCR은 설치 앱(EAS 빌드)에서 receiptScan.native.ts가 동작한다.
// (Metro가 네이티브에선 .native.ts, 웹에선 이 파일을 선택)
import { RecognizedItem } from './receiptParser';

export const RECEIPT_OCR_NATIVE = false;

export type ScanResult = { items: RecognizedItem[]; text: string };

export async function scanReceipt(): Promise<ScanResult | null> {
  return {
    items: [
      { name: '계란', amount: '1' },
      { name: '우유', amount: '1' },
      { name: '두부', amount: '1' },
      { name: '대파', amount: '1' },
    ],
    text: '(웹 데모 — 실제 OCR은 설치 앱에서 동작해요)',
  };
}
