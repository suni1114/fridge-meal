const fs = require('fs'), sharp = require('sharp');
const svg = fs.readFileSync('assets/logo.svg', 'utf8');

// 흰/회색 계열(장바구니) path만 남긴다: R≈G≈B 이고 충분히 밝은 것
const head = svg.slice(0, svg.indexOf('<path'));
const paths = svg.match(/<path[^>]*>/g) || [];
const isBasket = (p) => {
  const m = p.match(/fill="#([0-9A-Fa-f]{6})"/);
  if (!m) return false;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16));
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const lum = (r + g + b) / 3;
  return spread < 26 && lum > 140;
};
const kept = paths.filter(isBasket);
console.log(`basket paths: ${kept.length} / ${paths.length}`);
fs.writeFileSync('scratchpad/logo-basket.svg', head + kept.join('\n') + '</svg>');

sharp(Buffer.from(fs.readFileSync('scratchpad/logo-basket.svg')), { density: 300 })
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .flatten({ background: '#25DA2E' })   // 프리뷰용: 초록 배경 위에 얹어서 확인
  .png().toFile('scratchpad/basket-preview.png')
  .then(() => console.log('preview ok'))
  .catch(e => console.error('ERR', e.message));
