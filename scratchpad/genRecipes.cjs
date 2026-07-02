// 참고 md의 4개 카테고리 표(| 번호 | 메뉴명 | 메인식재료 | 서브식재료 |)를 읽어 recipes.json 생성.
const fs = require('fs');
const path = require('path');

const SRC = 'C:/Users/wooripc_003/Downloads/korean_recipe_categories_for_claude.md';
const OUT = path.join(__dirname, '..', 'src', 'data', 'recipes.json');

const SECTIONS = [
  { re: /국·찌개/, category: '국·찌개', prefix: 'stew' },
  { re: /반찬/, category: '반찬', prefix: 'side' },
  { re: /메인/, category: '메인', prefix: 'main' },
  { re: /간편/, category: '간편', prefix: 'easy' },
];
const splitList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);
const recipes = [];
let cur = null;
const counter = {};
for (const line of lines) {
  const h = line.match(/^#\s*\d+\.\s*(.+)$/); // "# 1. 국·찌개 50개"
  if (h) { cur = SECTIONS.find((sec) => sec.re.test(h[1])) || null; continue; }
  if (!cur || !line.startsWith('|')) continue;
  const cells = line.split('|').map((c) => c.trim()); // ['', 번호, 메뉴명, 메인, 서브, '']
  if (cells.length < 5) continue;
  if (!/^\d+$/.test(cells[1])) continue; // 헤더/구분선 스킵
  counter[cur.prefix] = (counter[cur.prefix] || 0) + 1;
  const nn = String(counter[cur.prefix]).padStart(2, '0');
  recipes.push({
    menuId: `${cur.prefix}-${nn}`,
    name: cells[2],
    category: cur.category,
    mainIngredients: splitList(cells[3]),
    subIngredients: splitList(cells[4]),
  });
}
fs.writeFileSync(OUT, JSON.stringify(recipes, null, 2), 'utf8');
console.log(`wrote ${recipes.length} recipes`);
console.log(recipes.reduce((m, r) => ((m[r.category] = (m[r.category] || 0) + 1), m), {}));
