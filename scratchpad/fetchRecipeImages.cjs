// 만개의레시피 추천순 1등 레시피의 사진을 요리 200개에 대해 수집한다.
// 출력: assets/recipes/<menuId>.webp, src/data/recipeImages.ts, docs/seed/recipe-image-sources.json
// 실행: node scratchpad/fetchRecipeImages.cjs [--only=menuId,menuId]
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'recipes');
const MAP_FILE = path.join(ROOT, 'src', 'data', 'recipeImages.ts');
const SRC_FILE = path.join(ROOT, 'docs', 'seed', 'recipe-image-sources.json');

const SIZE = 360;
const QUALITY = 60;
const DELAY_MS = 400;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const recipes = require(path.join(ROOT, 'src', 'data', 'recipes.json'));
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').replace('--only=', '');
const targets = only ? recipes.filter((r) => only.split(',').includes(r.menuId)) : recipes;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 검색 결과 페이지에서 추천순 1등의 레시피 ID와 썸네일 주소를 뽑는다. */
function parseTop(html) {
  const re = /common_sp_thumb[\s\S]{0,400}?href="\/recipe\/(\d+)"[\s\S]{0,300}?<img[^>]+src="([^"]+)"/g;
  const m = re.exec(html);
  if (m) return { recipeId: m[1], imageUrl: m[2] };
  // 썸네일 블록 구조가 다를 때의 예비 경로
  const alt = /<img[^>]+src="(https:\/\/recipe1\.ezmember\.co\.kr\/cache\/recipe\/[^"]+)"/.exec(html);
  return alt ? { recipeId: null, imageUrl: alt[1] } : null;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchImage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`image HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function collect(recipe) {
  const html = await fetchText(recipe.recommendUrl);
  const top = parseTop(html);
  if (!top) throw new Error('검색 결과에서 사진을 찾지 못함');
  const raw = await fetchImage(top.imageUrl);
  const out = path.join(OUT_DIR, `${recipe.menuId}.webp`);
  await sharp(raw).resize(SIZE, SIZE, { fit: 'cover', position: 'centre' }).webp({ quality: QUALITY }).toFile(out);
  return { ...top, bytes: fs.statSync(out).size };
}

/** menuId → require() 정적 매핑. RN의 require는 리터럴 경로만 받으므로 파일로 생성한다. */
function writeMap(ids) {
  const lines = ids.map((id) => `  '${id}': require('../../assets/recipes/${id}.webp'),`).join('\n');
  const body = `// 자동 생성 — scratchpad/fetchRecipeImages.cjs
// 사진을 바꾸려면 assets/recipes/<menuId>.webp 를 같은 이름으로 덮어쓰면 된다. 이 파일은 손대지 않아도 된다.
import type { ImageSourcePropType } from 'react-native';

const RECIPE_IMAGES: Record<string, ImageSourcePropType> = {
${lines}
};

/** 요리 사진. 없으면 undefined — 화면은 카테고리 이모지로 대체한다. */
export function recipeImage(menuId: string): ImageSourcePropType | undefined {
  return RECIPE_IMAGES[menuId];
}
`;
  fs.writeFileSync(MAP_FILE, body, 'utf8');
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(SRC_FILE), { recursive: true });

  const sources = fs.existsSync(SRC_FILE) ? JSON.parse(fs.readFileSync(SRC_FILE, 'utf8')) : [];
  const byId = new Map(sources.map((s) => [s.menuId, s]));
  const failed = [];

  for (const [i, r] of targets.entries()) {
    let got = null;
    for (let attempt = 1; attempt <= 2 && !got; attempt++) {
      try {
        got = await collect(r);
      } catch (e) {
        if (attempt === 2) {
          failed.push({ menuId: r.menuId, name: r.name, reason: e.message });
          console.log(`[${i + 1}/${targets.length}] FAIL ${r.menuId} ${r.name} — ${e.message}`);
        } else {
          await sleep(1200);
        }
      }
    }
    if (got) {
      byId.set(r.menuId, {
        menuId: r.menuId,
        name: r.name,
        recipeId: got.recipeId,
        recipeUrl: got.recipeId ? `https://www.10000recipe.com/recipe/${got.recipeId}` : null,
        imageUrl: got.imageUrl,
        bytes: got.bytes,
      });
      console.log(`[${i + 1}/${targets.length}] OK   ${r.menuId} ${r.name} — ${(got.bytes / 1024).toFixed(1)}KB`);
    }
    await sleep(DELAY_MS);
  }

  const ordered = recipes.map((r) => byId.get(r.menuId)).filter(Boolean);
  fs.writeFileSync(SRC_FILE, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
  writeMap(ordered.map((s) => s.menuId));

  const total = ordered.reduce((sum, s) => sum + s.bytes, 0);
  console.log(`\n수집 ${ordered.length}/${recipes.length}장 · 합계 ${(total / 1024 / 1024).toFixed(2)}MB · 평균 ${(total / ordered.length / 1024).toFixed(1)}KB`);
  if (failed.length) console.log(`실패 ${failed.length}건: ${failed.map((f) => f.name).join(', ')}`);
})();
