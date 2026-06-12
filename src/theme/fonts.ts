// Pretendard font family — the typeface used across the mockup.
// In React Native each weight is a distinct fontFamily (fontWeight does not
// combine reliably with custom fonts), so we expose named weights.

export const fontAssets = {
  'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.otf'),
  'Pretendard-Medium': require('../../assets/fonts/Pretendard-Medium.otf'),
  'Pretendard-SemiBold': require('../../assets/fonts/Pretendard-SemiBold.otf'),
  'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.otf'),
  'Pretendard-ExtraBold': require('../../assets/fonts/Pretendard-ExtraBold.otf'),
  'Pretendard-Black': require('../../assets/fonts/Pretendard-Black.otf'),
};

export const font = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium', // 500
  semibold: 'Pretendard-SemiBold', // 600
  bold: 'Pretendard-Bold', // 700
  extrabold: 'Pretendard-ExtraBold', // 800
  black: 'Pretendard-Black', // 900
} as const;
