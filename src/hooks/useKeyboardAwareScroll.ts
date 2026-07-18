// 키패드가 올라올 때, 현재 포커스된 입력칸이 키패드에 가리면 그만큼 스크롤을 올려 보이게 한다.
// 화면마다 입력칸 ref를 일일이 달 필요 없이 TextInput.State.currentlyFocusedInput()으로
// 지금 포커스된 칸을 찾아 측정한다. (웹은 소프트 키패드가 없어 이벤트가 오지 않아 무해)
import { useEffect, useRef } from 'react';
import { Keyboard, TextInput, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

export function useKeyboardAwareScroll(scrollRef: React.RefObject<ScrollView | null>) {
  const offset = useRef(0); // 현재 세로 스크롤 위치(실측)
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  };
  useEffect(() => {
    const bring = () => {
      const focused: any = (TextInput as any).State?.currentlyFocusedInput?.();
      if (!focused || typeof focused.measureInWindow !== 'function') return;
      const kbTop = kbTopRef.current;
      if (!kbTop) return;
      focused.measureInWindow((_x: number, y: number, _w: number, h: number) => {
        const margin = 28;
        const overflow = y + h - (kbTop - margin); // 입력칸 하단이 키패드에 얼마나 가렸는지
        if (overflow > 0) scrollRef.current?.scrollTo({ y: offset.current + overflow, animated: true });
      });
    };
    const kbTopRef = { current: 0 };
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      kbTopRef.current = e.endCoordinates.screenY;
      // 포커스 이동 직후 레이아웃이 잡히도록 한 틱 뒤에 측정
      setTimeout(bring, 20);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => { kbTopRef.current = 0; });
    return () => { show.remove(); hide.remove(); };
  }, [scrollRef]);
  return { onScroll, scrollEventThrottle: 16 as const };
}
