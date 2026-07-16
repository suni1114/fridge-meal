const sharp = require('sharp');
const fs = require('fs');
const cur = fs.readFileSync('assets/logo-mark.png');           // 지금 적용된 것 = 원본 초록
// 브랜드 그린 버전을 임시로 렌더
const { execSync } = require('child_process');
(async () => {
  const label = (t) => Buffer.from(
    `<svg width="256" height="40"><text x="128" y="28" font-family="sans-serif" font-size="22" fill="#333" text-anchor="middle">${t}</text></svg>`
  );
  const orig = await sharp(cur).resize(220, 220).toBuffer();
  // brand 버전 아이콘을 메모리에서 생성 (assets는 건드리지 않음)
  const raw = await sharp(cur).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = raw;
  const out = Buffer.from(data);
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i+1], data[i+2]];
    if (g - Math.max(r, b) > 24) { out[i] = 0x4C; out[i+1] = 0x9A; out[i+2] = 0x5E; }
  }
  const brand = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(220, 220).png().toBuffer();

  await sharp({ create: { width: 560, height: 300, channels: 3, background: '#FBF8F1' } })
    .composite([
      { input: orig, top: 30, left: 30 },
      { input: brand, top: 30, left: 310 },
      { input: label('원본 #25DA2E'), top: 255, left: 30 },
      { input: label('브랜드 #4C9A5E'), top: 255, left: 310 },
    ])
    .png().toFile('scratchpad/logo-compare.png');
  console.log('ok → scratchpad/logo-compare.png');
})().catch(e => console.error('ERR', e.message));
