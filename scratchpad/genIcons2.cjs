const fs = require('fs'), sharp = require('sharp');
const SRC = 'assets/logo.svg';

// 1) 원본을 큰 래스터로 렌더
const render = (size) => sharp(fs.readFileSync(SRC), { density: 600 })
  .resize(size, size, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } });

// 2) 초록 픽셀을 투명으로 (장바구니 슬릿/삼각형 안쪽 = 초록 → 투명 유지)
async function basketOnly(size) {
  const { data, info } = await render(size).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
    if (a === 0) continue;
    const greenness = g - Math.max(r, b);          // 초록일수록 큼
    if (greenness > 24) { out[i+3] = 0; }          // 확실한 초록 → 투명
    else if (greenness > 6) {                       // 경계 → 부드럽게
      out[i+3] = Math.round(a * (1 - (greenness - 6) / 18));
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png();
}

(async () => {
  const b = await basketOnly(1024);
  await b.clone().toFile('scratchpad/basket-cut.png');
  // 초록 배경 위 프리뷰
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#25DA2E' } })
    .composite([{ input: await b.clone().toBuffer() }])
    .resize(512, 512).png().toFile('scratchpad/basket-on-green.png');
  console.log('ok');
})().catch(e => console.error('ERR', e.message));
