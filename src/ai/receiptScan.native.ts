// 네이티브(설치 앱) — 영수증 사진을 찍거나 골라 ML Kit 온디바이스 OCR(한국어)로 읽고
// 아는 식재료를 추출한다. 반환: 인식 항목 배열 / null(취소·권한 거부).
import * as ImagePicker from 'expo-image-picker';
import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import { parseReceipt, RecognizedItem } from './receiptParser';

export const RECEIPT_OCR_NATIVE = true;

export type ScanResult = { items: RecognizedItem[]; text: string };

export async function scanReceipt(): Promise<ScanResult | null> {
  // 카메라 우선, 권한 없으면 갤러리에서 선택.
  let result: ImagePicker.ImagePickerResult;
  const cam = await ImagePicker.requestCameraPermissionsAsync();
  if (cam.granted) {
    result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  } else {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) return null;
    result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
  }
  if (result.canceled || !result.assets?.length) return null;

  const ocr = await TextRecognition.recognize(result.assets[0].uri, TextRecognitionScript.KOREAN);
  return { items: parseReceipt(ocr.text), text: ocr.text };
}
