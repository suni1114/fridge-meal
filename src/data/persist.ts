// 로컬 영구 저장 (AsyncStorage). 백엔드 없이 폰 안에 데이터를 보관한다.
// 냉장고/장보기 상태와 온보딩 단계를 JSON으로 직렬화해 저장/복원한다.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  fridge: 'fm.fridge.v1',
  shopping: 'fm.shopping.v1',
  phase: 'fm.phase.v1',
} as const;

// 저장된 값을 읽어 파싱한다. 없거나 손상되면 null.
export async function loadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// 값을 직렬화해 저장한다. 저장 실패(용량 부족 등)는 조용히 무시한다.
export async function saveJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write errors
  }
}
