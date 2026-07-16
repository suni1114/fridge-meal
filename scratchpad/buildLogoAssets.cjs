// logo.svg → 앱 아이콘 세트 생성
//   node scratchpad/buildLogoAssets.cjs original   # 로고 원본 초록 (#25DA2E)
//   node scratchpad/buildLogoAssets.cjs brand      # 앱 테마 그린 (#4C9A5E)
//
// 원본 SVG는 래스터를 자동 벡터화한 것(264 path, 노이즈 색상 다수)이라 벡터로 쓰지 않고,
// 크로마키로 초록 배경을 제거해 장바구니만 뽑은 뒤 원하는 배경색 위에 재합성한다.
const fs = require('fs');
const sharp = require('sharp');

const VARIANTS = { original: '#25DA2E', brand: '#4C9A5E', teal: '#01A863' };
const variant = process.argv[2] || 'original';
const BG = VARIANTS[variant] || (/^#[0-9A-Fa-f]{6}$/.test(variant) ? variant.toUpperCase() : null);
if (!BG) { console.error(`variant는 ${Object.keys(VARIANTS).join(' | ')} 또는 #RRGGBB`); process.exit(1); }

const SRC = 'assets/logo.svg';

// 적응형 아이콘 전경이 캔버스에서 차지할 비율.
// 안드로이드는 108dp 캔버스 중 바깥 18dp를 잘라내 ~72dp만 보여주므로, 0.6이면
// 보이는 원의 90%를 장바구니가 채워 답답해 보인다. 0.48이면 ~72%로 여백이 생긴다.
const FG_RATIO = 0.48;
// 런처 아이콘(전경·모노크롬)만 다시 뽑고 스플래시/파비콘 등은 건드리지 않을 때 사용
const ADAPTIVE_ONLY = process.argv.includes('--adaptive-only');

// 초록 배경 제거 → 흰 장바구니만 남은 투명 PNG (슬릿 구멍 유지)
async function basketCut(size) {
  const { data, info } = await sharp(fs.readFileSync(SRC), { density: 600 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data);
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a === 0) continue;
    const greenness = g - Math.max(r, b);
    if (greenness > 24) out[i + 3] = 0;
    else if (greenness > 6) out[i + 3] = Math.round(a * (1 - (greenness - 6) / 18));
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

// 장바구니를 캔버스 중앙에 지정 비율로 배치한 투명 PNG
async function centered(basket, canvas, ratio, tint) {
  let sym = sharp(basket).trim();
  if (tint) sym = sym.tint(tint); // monochrome용
  const target = Math.round(canvas * ratio);
  const buf = await sym.resize(target, target, { fit: 'inside' }).toBuffer();
  const { width, height } = await sharp(buf).metadata();
  return sharp(buf)
    .extend({
      top: Math.round((canvas - height) / 2),
      bottom: canvas - height - Math.round((canvas - height) / 2),
      left: Math.round((canvas - width) / 2),
      right: canvas - width - Math.round((canvas - width) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

(async () => {
  const basket = await basketCut(1024);
  const square = (size, file) =>
    sharp(basket).flatten({ background: BG }).resize(size, size).png().toFile(file);

  // 1) 안드로이드 적응형 — 배경 단색, 전경은 안전영역 안의 장바구니 (런처 아이콘)
  await sharp(await centered(basket, 1024, FG_RATIO)).toFile('assets/android-icon-foreground.png');
  await sharp(await centered(basket, 1024, FG_RATIO, '#FFFFFF')).toFile('assets/android-icon-monochrome.png');

  if (!ADAPTIVE_ONLY) {
    await sharp({ create: { width: 1024, height: 1024, channels: 3, background: BG } })
      .png().toFile('assets/android-icon-background.png');

    // 2) 앱 아이콘 — 모서리까지 꽉 찬 초록 사각형 (iOS가 알아서 둥글게 마스킹)
    await square(1024, 'assets/icon.png');

    // 3) 스플래시 / 파비콘 / 앱 내 헤더 마크
    await square(1024, 'assets/splash-icon.png');
    await square(64, 'assets/favicon.png');
    await square(256, 'assets/logo-mark.png');
  }

  console.log(`variant=${variant}  bg=${BG}  전경비율=${FG_RATIO}${ADAPTIVE_ONLY ? '  (적응형만)' : ''}`);
  console.log('※ app.json의 android.adaptiveIcon.backgroundColor 도 같은 값이어야 합니다.');
})().catch((e) => { console.error('ERR', e); process.exit(1); });
