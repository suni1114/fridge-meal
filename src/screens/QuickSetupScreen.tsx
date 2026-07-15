// 냉장고 빠른 세팅 (spec §9.2~9.5) — 유형 선택 → 기본재료 체크 → 빠진재료 추가 → 완료
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Platform, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { AppButton } from '../components/ui';
import { CATEGORY } from '../data/constants';
import { PRESET_PACKS, useApp, matchAll, infoFor, FridgeItem } from '../data/store';
import { isReady } from '../data/recommend';
import { todayISO } from '../data/date';
import { uid, nowISO } from '../data/id';
import { useNav } from '../navigation/nav';

const SUGGESTED = ['우유', '치즈', '콩나물', '토마토', '버섯', '참치캔', '두유', '사과'];

// 스텝2 선택 칩 전용 초록 — 밝은 로고 그린(colors.primary)은 로고·메인 버튼에만 쓰고,
// 칩 선택 상태는 명도·채도를 낮춘 '차분한 진초록'과 '아주 연한 초록 배경'으로 표현한다.
const CHIP_GREEN = '#2A6B4C'; // 차분한 진초록 (테두리·텍스트·체크)
const CHIP_GREEN_BG = '#F0F9F4'; // 아주 연한 초록 (선택 배경)

// 곳간 기본 생필품 — 거의 모든 집에 있는 품목은 기본 선택(def:true), 그 외는 옵션(def:false).
// 완료 시 kind:'household'로 곳간에 저장된다(식재료와 구분).
const HOUSEHOLD_PICK: { name: string; def: boolean }[] = [
  { name: '두루마리휴지', def: true },
  { name: '물티슈', def: true },
  { name: '주방세제', def: true },
  { name: '세탁세제', def: true },
  { name: '샴푸', def: true },
  { name: '린스', def: true },
  { name: '바디워시', def: true },
  { name: '비누', def: true },
  { name: '키친타월', def: false },
  { name: '섬유유연제', def: false },
  { name: '치약', def: false },
  { name: '기저귀', def: false },
];

export function QuickSetupScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const append = nav.setupMode === 'append'; // 설정에서 '기존 냉장고에 추가하기'로 들어온 경우
  // 실기기 하단 제스처 바에 하단 CTA 버튼이 가리지 않도록 안전영역만큼 띄운다.
  const bottomPad = Platform.OS === 'web' ? 0 : insets.bottom;
  const { fridge, setFridge, logUsage, recipes } = useApp();
  const [step, setStep] = useState(0);
  const [packCode, setPackCode] = useState('home_basic');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  // 생필품 선택 상태 — 기본값은 HOUSEHOLD_PICK의 def(모든 집에 있는 품목은 미리 체크).
  const [hhChecked, setHhChecked] = useState<Record<string, boolean>>(
    () => Object.fromEntries(HOUSEHOLD_PICK.map((h) => [h.name, h.def]))
  );
  const [added, setAdded] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const pack = PRESET_PACKS.find((p) => p.code === packCode)!;

  // group pack items by category (default: all checked)
  const grouped = useMemo(() => {
    const g: Record<string, string[]> = {};
    pack.items.forEach((name) => {
      const c = infoFor(name).category;
      (g[c] ??= []).push(name);
    });
    return g;
  }, [pack]);

  const isChecked = (n: string) => checked[n] ?? true;
  const toggle = (n: string) => setChecked((c) => ({ ...c, [n]: !isChecked(n) }));
  const hhIsChecked = (n: string) => hhChecked[n] ?? false;
  const hhToggle = (n: string) => setHhChecked((c) => ({ ...c, [n]: !hhIsChecked(n) }));

  const addItem = (n: string) => {
    const name = n.trim();
    if (!name) return;
    // 함수형 업데이트로 최신 상태 기준 중복만 막는다(빠른 연타 시 중복/유실 방지).
    setAdded((a) => (a.includes(name) ? a : [...a, name]));
  };

  const matches = matchAll(recipes, fridge);
  const readyCount = matches.filter(isReady).length;
  const total = pack.items.filter(isChecked).length + added.length;

  // 선택한 프리셋 재료 + 직접 추가한 재료로 냉장고를 채운다.
  // 등록 단계라 수량은 '충분함', 유통기한은 미입력(null)으로 시작한다.
  // append 모드(설정 → 기존 냉장고에 추가하기)면 기존 재료를 보존하고 새 이름만 더한다.
  const buildFridge = () => {
    // 선택한 프리셋 재료 + 추가한 재료를 합치되 중복 이름은 한 번만.
    const names = [...new Set([...pack.items.filter(isChecked), ...added])];
    const toItem = (name: string): FridgeItem => {
      const info = infoFor(name);
      return { id: uid(), name, category: info.category, storage: info.storage, stock: 'enough', expiry: null, added: todayISO(), updatedAt: nowISO() };
    };
    // 선택한 생필품 — 곳간에 kind:'household'로 저장. 유통기한은 없고 늘 '충분함'으로 시작.
    const hhNames = HOUSEHOLD_PICK.filter((h) => hhIsChecked(h.name)).map((h) => h.name);
    const toHouseholdItem = (name: string): FridgeItem => ({
      id: uid(), name, category: 'etc', storage: 'household', kind: 'household', stock: 'enough', expiry: null, added: todayISO(), updatedAt: nowISO(),
    });
    if (append) {
      const existing = new Set(fridge.map((x) => x.name));
      const additions = names.filter((n) => !existing.has(n)).map(toItem);
      const hhAdditions = hhNames.filter((n) => !existing.has(n)).map(toHouseholdItem);
      setFridge((prev) => [...prev, ...additions, ...hhAdditions]);
      logUsage(additions.map((a) => ({ name: a.name, category: a.category })));
    } else {
      const items = names.map(toItem);
      setFridge([...items, ...hhNames.map(toHouseholdItem)]);
      logUsage(items.map((it) => ({ name: it.name, category: it.category })));
    }
  };

  const back = () => (step === 0 ? undefined : setStep(step - 1));

  // 하드웨어 백: 완료 화면→홈, 이전 스텝으로, 첫 스텝에서는
  // 설정에서 재세팅으로 들어왔으면 설정(메인)으로 복귀, 최초 실행이면 종료 허용.
  useEffect(() => {
    const onBack = () => {
      if (step === 3) { onDone(); return true; }
      if (step > 0) { setStep(step - 1); return true; }
      if (nav.setupMode !== 'fresh') { nav.setPhase('main'); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [step, nav.setupMode]);

  return (
    <View style={[s.root, { paddingBottom: bottomPad }]}>
      {/* progress */}
      <View style={s.progressRow}>
        {step > 0 ? (
          <Pressable onPress={back} hitSlop={8}>
            <Icon name="caret-left" size={24} color={colors.ink} weight="bold" />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${((step + 1) / 4) * 100}%` }]} />
        </View>
        <Text style={s.progressText}>{step + 1}/4</Text>
      </View>

      {step === 0 && (
        <>
          <View style={s.head}>
            <Text style={s.h1}>어떤 식생활에{'\n'}가까우세요?</Text>
            <Text style={s.sub}>고르면 기본 식재료를 채워드려요</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} showsVerticalScrollIndicator={false}>
            {PRESET_PACKS.map((p) => {
              const on = p.code === packCode;
              return (
                <Pressable key={p.code} onPress={() => setPackCode(p.code)} style={[s.typeCard, on && s.typeCardOn]}>
                  <View style={[s.typeIcon, on && { backgroundColor: colors.primary }]}>
                    <Icon name={p.icon} size={26} color={on ? colors.white : colors.primary} weight="fill" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.typeLabel}>{p.label}</Text>
                    <Text style={s.typeDesc}>{p.desc}</Text>
                  </View>
                  {on && <Icon name="check-circle" size={24} color={colors.primary} weight="fill" />}
                </Pressable>
              );
            })}
          </ScrollView>
          <AppButton label="다음" onPress={() => setStep(1)} style={s.cta} />
        </>
      )}

      {step === 1 && (
        <>
          <View style={s.head}>
            <Text style={s.stepLabel}>STEP 2 · 거의 다 됐어요</Text>
            <Text style={[s.h1, { fontSize: 24 }]}>있는 재료만 남겨주세요.</Text>
            <Text style={s.sub}>기본은 체크된 상태예요. 없는 것만 해제하세요.</Text>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            {/* 섹션 ① 생필품 — 곳간이 식재료뿐 아니라 생필품까지 챙기므로 맨 위에 둔다 */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>생필품</Text>
              <View style={s.checkWrap}>
                {HOUSEHOLD_PICK.map(({ name }) => (
                  <Chip key={name} label={name} on={hhIsChecked(name)} onPress={() => hhToggle(name)} />
                ))}
              </View>
            </View>
            {/* 섹션 ② 자주 쓰는 식재료 — 한 섹션 안에서 카테고리는 가벼운 소제목으로만 구분(복잡해 보이지 않게) */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>자주 쓰는 식재료</Text>
              {Object.entries(grouped).map(([cat, items]) => (
                <View key={cat} style={s.subGroup}>
                  <Text style={s.subCatLabel}>{CATEGORY[cat]?.label ?? cat}</Text>
                  <View style={s.checkWrap}>
                    {items.map((n) => (
                      <Chip key={n} label={n} on={isChecked(n)} onPress={() => toggle(n)} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
          <AppButton label="다음" onPress={() => setStep(2)} style={s.cta} />
        </>
      )}

      {step === 2 && (
        <>
          <View style={s.head}>
            <Text style={s.stepLabel}>STEP 3 · 마지막이에요</Text>
            <Text style={[s.h1, { fontSize: 24 }]}>빠진 재료가 있나요?</Text>
            <Text style={s.sub}>기본 세트에 없는 재료를 추가하세요.</Text>
          </View>
          <View style={{ paddingHorizontal: 20 }}>
            <View style={s.inputRow}>
              <Icon name="search" size={18} color={colors.inkAsst} />
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="식재료 검색 또는 직접 입력"
                placeholderTextColor={colors.inkAsst}
                style={s.input}
                onSubmitEditing={() => {
                  addItem(input);
                  setInput('');
                }}
              />
              <Pressable
                onPress={() => {
                  addItem(input);
                  setInput('');
                }}
                style={s.addBtn}
              >
                <Icon name="plus" size={18} color={colors.white} weight="bold" />
              </Pressable>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18 }} showsVerticalScrollIndicator={false}>
            <Text style={s.catLabel}>추천 재료</Text>
            <View style={s.checkWrap}>
              {SUGGESTED.filter((n) => !added.includes(n)).map((n) => (
                <Pressable key={n} onPress={() => addItem(n)} style={s.suggestChip}>
                  <Icon name="plus" size={14} color={colors.primary} weight="bold" />
                  <Text style={s.suggestText}>{n}</Text>
                </Pressable>
              ))}
            </View>
            {added.length > 0 && (
              <>
                <Text style={[s.catLabel, { marginTop: 22 }]}>추가한 재료 {added.length}</Text>
                <View style={s.checkWrap}>
                  {added.map((n) => (
                    <Pressable key={n} onPress={() => setAdded((a) => a.filter((x) => x !== n))} style={[s.checkTile, s.checkTileOn]}>
                      <Text style={[s.checkText, { color: colors.ink }]}>{n}</Text>
                      <Icon name="x" size={14} color={colors.inkAlt} weight="bold" />
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
          <AppButton label="냉장고 만들기" icon="magic-wand" onPress={() => { buildFridge(); setStep(3); }} style={s.cta} />
        </>
      )}

      {step === 3 && (
        <View style={s.done}>
          <View style={s.doneIcon}>
            <Icon name="check-circle" size={64} color={colors.primary} weight="fill" />
          </View>
          <Text style={s.doneTitle}>곳간이 채워졌어요.</Text>
          <Text style={s.doneSub}>{append ? `${pack.label} 재료를 기존 곳간에 더했어요.` : `${pack.label} 기준으로 채웠어요.`}</Text>
          <View style={s.statCard}>
            <Stat n={fridge.filter((x) => x.kind !== 'household').length} label="등록된 식재료" />
            <View style={s.statDivider} />
            <Stat n={fridge.filter((x) => x.kind === 'household').length} label="생필품" />
            <View style={s.statDivider} />
            <Stat n={readyCount} label="가능한 요리" />
          </View>
          <AppButton label="홈으로 가기" icon="house" onPress={onDone} style={{ alignSelf: 'stretch', marginHorizontal: 24, marginTop: 28 }} />
        </View>
      )}
    </View>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={s.statNum}>{n}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// 선택 칩 — 선택 시 초록 테두리+체크, 미선택 시 회색 배경+플러스. (생필품·식재료 공용)
function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.checkTile, on && s.checkTileOn]}>
      <Icon name={on ? 'check' : 'plus'} size={14} color={on ? CHIP_GREEN : colors.inkAsst} weight="bold" />
      <Text style={[s.checkText, on && s.checkTextOn]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  progressText: { fontFamily: font.bold, fontSize: 12, color: colors.inkAlt, width: 28, textAlign: 'right' },

  head: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  stepLabel: { fontFamily: font.bold, fontSize: 11, color: colors.primary, letterSpacing: 0.3, marginBottom: 6 },
  h1: { fontFamily: font.extrabold, fontSize: 26, color: colors.ink, lineHeight: 34, letterSpacing: -0.5 },
  sub: { fontFamily: font.regular, fontSize: 14, color: colors.inkAlt, marginTop: 10 },

  cta: { marginHorizontal: 20, marginBottom: 20, marginTop: 6 },

  typeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.xl, padding: 18 },
  typeCardOn: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  typeIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontFamily: font.bold, fontSize: 17, color: colors.ink },
  typeDesc: { fontFamily: font.medium, fontSize: 13, color: colors.inkAlt, marginTop: 4 },

  catLabel: { fontFamily: font.extrabold, fontSize: 14, color: colors.inkAlt, marginBottom: 10 },
  // 큰 섹션(생필품 · 자주 쓰는 식재료) — 화면을 딱 두 덩어리로 보이게 하는 상위 제목.
  section: { marginBottom: 24 },
  sectionLabel: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink, marginBottom: 12, letterSpacing: -0.3 },
  // 식재료 안의 카테고리 — 작고 옅은 소제목으로만 나눠 복잡해 보이지 않게.
  subGroup: { marginBottom: 14 },
  subCatLabel: { fontFamily: font.bold, fontSize: 12, color: colors.inkAsst, marginBottom: 8 },
  checkWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // 미선택 — 흰 박스 + 거의 안 보이는 옅은 회색 라인.
  checkTile: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface },
  // 선택 — 아주 연한 초록 배경 + 차분한 진초록 라인·글자.
  checkTileOn: { borderColor: CHIP_GREEN, backgroundColor: CHIP_GREEN_BG },
  checkText: { fontFamily: font.bold, fontSize: 13.5, color: colors.inkAsst },
  checkTextOn: { color: CHIP_GREEN },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 6 },
  input: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink, paddingVertical: 8 },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  suggestChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 13, borderRadius: radius.pill, backgroundColor: colors.primaryBg },
  suggestText: { fontFamily: font.bold, fontSize: 14, color: colors.primary },

  done: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  doneIcon: { marginBottom: 24 },
  doneTitle: { fontFamily: font.extrabold, fontSize: 26, color: colors.ink, letterSpacing: -0.5 },
  doneSub: { fontFamily: font.medium, fontSize: 15, color: colors.inkAlt, marginTop: 10 },
  statCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingVertical: 22, marginTop: 28, alignSelf: 'stretch', marginHorizontal: 8 },
  statDivider: { width: 1, height: 36, backgroundColor: colors.line },
  statNum: { fontFamily: font.black, fontSize: 26, color: colors.primary },
  statLabel: { fontFamily: font.medium, fontSize: 12, color: colors.inkAlt, marginTop: 4, textAlign: 'center' },
});
