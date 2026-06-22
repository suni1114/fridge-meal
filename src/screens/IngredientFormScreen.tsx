// 식재료 등록/수정 — 페이지 분리:
//  0) 카테고리 선택(그리드) / 검색  →  1) 식재료 선택  →  2) 재료 상세 설정(등록일·소비기한·보관·수량·메모)
//  + AI 등록(영수증·사진).
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { ScreenHeader, AppButton } from '../components/ui';
import {
  STORAGE_LABEL,
  FINE_CATEGORIES,
  FINE_CATEGORY_ITEMS,
  fineCategoryOf,
  coarseFromFine,
  unitOf,
  UNIT_SUFFIX,
  stockFromQty,
  emojiFor,
} from '../data/constants';
import { useApp, infoFor } from '../data/store';
import { startOfToday, addDays, toISO, fromISO, daysUntil, todayISO, sameYMD, fmtFull, fmtDot, WEEKDAYS } from '../data/date';
import { useNav } from '../navigation/nav';

// 보관 위치는 냉장·냉동·실온 3가지만.
const STORAGE_PICKS: { code: string; icon: 'thermometer-cold' | 'snowflake' | 'sun-horizon' }[] = [
  { code: 'refrigerated', icon: 'thermometer-cold' },
  { code: 'frozen', icon: 'snowflake' },
  { code: 'room_temp', icon: 'sun-horizon' },
];
const STORAGE_CODES = STORAGE_PICKS.map((x) => x.code);
const normStorage = (s: string) => (STORAGE_CODES.includes(s) ? s : 'room_temp');

// 소비기한 빠른 선택(달력 시트 안에서).
const DDAY_PRESETS: { label: string; days: number | null }[] = [
  { label: '미설정', days: null },
  { label: '3일', days: 3 },
  { label: '7일', days: 7 },
  { label: '14일', days: 14 },
  { label: '30일', days: 30 },
];

// 데모용 AI 인식 결과 (실제 영수증/사진 인식 대신 샘플 — 사용자가 확인·수정 후 등록).
const AI_MOCK: Record<string, { name: string; amount: string }[]> = {
  receipt: [
    { name: '계란', amount: '10' },
    { name: '우유', amount: '100' },
    { name: '돼지고기', amount: '500' },
    { name: '대파', amount: '2' },
    { name: '두부', amount: '2' },
  ],
  photo: [
    { name: '사과', amount: '5' },
    { name: '당근', amount: '3' },
    { name: '브로콜리', amount: '1' },
  ],
};

type AiItem = { id: string; name: string; amount: string };

// 모든 카테고리의 식재료 (검색용).
const ALL_INGREDIENTS = Object.values(FINE_CATEGORY_ITEMS).flat();

export function IngredientFormScreen({ itemId, prefillName }: { itemId?: string; prefillName?: string }) {
  const { fridge, upsertFridge, removeFridge } = useApp();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const editing = fridge.find((x) => x.id === itemId);

  const initialName = editing?.name ?? prefillName ?? '';
  // 수정/프리필이면 바로 상세(2단계), 신규는 카테고리 선택(0단계)부터.
  const [step, setStep] = useState<0 | 1 | 2>(editing || prefillName ? 2 : 0);
  const [fineCat, setFineCat] = useState<string>(
    editing ? fineCategoryOf(editing.name, editing.category) : initialName ? fineCategoryOf(initialName) : 'meat'
  );
  const [name, setName] = useState(initialName);
  const [nameEditing, setNameEditing] = useState(false); // 상세에서 이름 직접 수정 중인지
  const [q, setQ] = useState(''); // 0단계 식재료 검색어
  const [storage, setStorage] = useState(normStorage(editing?.storage ?? 'refrigerated'));
  const [expiry, setExpiry] = useState<string | null>(editing?.expiry ?? null);
  const [added, setAdded] = useState<string>(editing?.added ?? todayISO()); // 등록일 기본 오늘
  const [cal, setCal] = useState<null | 'expiry' | 'added'>(null);
  const [memo, setMemo] = useState(editing?.memo ?? '');

  const dleft = daysUntil(expiry); // null = 미설정
  const expiryDate = expiry ? fromISO(expiry) : null;
  const addedDate = fromISO(added);

  // 재료에 따라 수량 단위(개/그람/퍼센트) 자동 결정. 커스텀명은 선택한 카테고리 기준으로 유지.
  const unit = unitOf(name, fineCat);
  const defaultAmount = (u: string) => (u === 'percent' ? '100' : '1');
  const [amount, setAmount] = useState<string>(() => {
    const f = editing?.qty ? parseFloat(editing.qty) : NaN;
    return !isNaN(f) ? String(f) : defaultAmount(unitOf(initialName, fineCat));
  });
  const firstUnit = useRef(true);
  useEffect(() => {
    if (firstUnit.current) { firstUnit.current = false; return; }
    setAmount(defaultAmount(unit));
  }, [unit]);

  const catMeta = FINE_CATEGORIES.find((c) => c.code === fineCat);
  const items = FINE_CATEGORY_ITEMS[fineCat] ?? [];

  const pickCategory = (code: string) => {
    setFineCat(code);
    setName('');
    setStep(1);
  };
  const chooseIngredient = (n: string) => {
    setName(n);
    setStorage(normStorage(infoFor(n).storage));
    setNameEditing(false);
    setStep(2);
  };
  const nextWithTyped = () => {
    const nm = name.trim();
    if (!nm) return;
    setStorage(normStorage(infoFor(nm).storage));
    setStep(2);
  };
  const selectFromSearch = (n: string) => {
    const nm = n.trim();
    if (!nm) return;
    setName(nm);
    setFineCat(fineCategoryOf(nm));
    setStorage(normStorage(infoFor(nm).storage));
    setStep(2);
  };
  const searchHits = q.trim() ? ALL_INGREDIENTS.filter((n) => n.includes(q.trim())).slice(0, 40) : [];

  const stepSize = unit === 'gram' ? 50 : 1;
  const adjust = (d: number) => {
    const v = parseFloat(amount) || 0;
    setAmount(String(Math.max(0, Math.round((v + d) * 10) / 10)));
  };

  const amt = parseFloat(amount) || 0;
  const canSave = name.trim().length > 0 && amt > 0;
  const save = () => {
    if (!canSave) return;
    upsertFridge({
      id: editing?.id ?? `fr-${Date.now()}`,
      name: name.trim(),
      category: coarseFromFine(fineCat), // 카테고리는 그대로, 이름만 바뀔 수 있음
      storage,
      stock: stockFromQty(unit, amt),
      qty: `${amt}${UNIT_SUFFIX[unit]}`,
      expiry,
      added,
      memo: memo.trim() || undefined,
    });
    // 저장한 보관 위치(냉장/냉동/실온)에 맞는 냉장고 하위 탭으로 보낸다(어느 탭에서 열었든).
    nav.goToFridge(storage);
    nav.closeOverlay();
  };

  // ── AI 등록 ───────────────────────────────────────────────
  const [aiItems, setAiItems] = useState<AiItem[] | null>(null);
  const runAi = (kind: 'receipt' | 'photo') =>
    setAiItems(AI_MOCK[kind].map((r, i) => ({ id: `ai-${i}-${Date.now()}`, ...r })));
  const setAiField = (id: string, field: 'name' | 'amount', val: string) =>
    setAiItems((arr) => (arr ? arr.map((x) => (x.id === id ? { ...x, [field]: val } : x)) : arr));
  const removeAi = (id: string) => setAiItems((arr) => (arr ? arr.filter((x) => x.id !== id) : arr));
  const addAiRow = () => setAiItems((arr) => [...(arr ?? []), { id: `ai-new-${Date.now()}`, name: '', amount: '1' }]);
  const aiSave = () => {
    if (!aiItems) return;
    let firstStorage: string | undefined; // 여러 재료 중 첫 번째 저장 항목의 보관 위치로 이동
    aiItems.forEach((it, idx) => {
      const n = it.name.trim();
      const a = parseFloat(it.amount) || 0;
      if (!n || a <= 0) return;
      const u = unitOf(n);
      const info = infoFor(n);
      const st = normStorage(info.storage);
      if (firstStorage === undefined) firstStorage = st;
      upsertFridge({
        id: `fr-ai-${Date.now()}-${idx}`,
        name: n,
        category: info.category,
        storage: st,
        stock: stockFromQty(u, a),
        qty: `${a}${UNIT_SUFFIX[u]}`,
        expiry: null,
        added: todayISO(),
      });
    });
    setAiItems(null);
    // AI 등록 후에도 첫 재료의 보관 위치 하위 탭으로 이동.
    nav.goToFridge(firstStorage);
    nav.closeOverlay();
  };

  const onBack = () => {
    if (editing || prefillName) return nav.closeOverlay();
    if (step === 2) setStep(1);
    else if (step === 1) setStep(0);
    else nav.closeOverlay();
  };

  const headerTitle = editing ? '재료 상세 설정' : step === 2 ? '재료 상세 설정' : '식재료 추가';

  return (
    <View style={s.root}>
      <ScreenHeader title={headerTitle} onBack={onBack} />

      {/* ── 0단계: 카테고리 선택 / 검색 ───────────────────────── */}
      {step === 0 && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.searchRow}>
            <Icon name="search" size={18} color={colors.inkAsst} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="식재료 검색 또는 직접 입력"
              placeholderTextColor={colors.inkAsst}
              style={s.search}
            />
            {q.length > 0 && (
              <Pressable onPress={() => setQ('')} hitSlop={8}>
                <Icon name="x" size={16} color={colors.inkAsst} weight="bold" />
              </Pressable>
            )}
          </View>

          {q.trim() ? (
            <View>
              {searchHits.map((n) => (
                <Pressable key={n} style={s.resultRow} onPress={() => selectFromSearch(n)}>
                  <Text style={s.resultEmoji}>{emojiFor(n, coarseFromFine(fineCategoryOf(n)))}</Text>
                  <Text style={s.resultName}>{n}</Text>
                  <Text style={s.resultCat}>{FINE_CATEGORIES.find((c) => c.code === fineCategoryOf(n))?.label}</Text>
                </Pressable>
              ))}
              {!ALL_INGREDIENTS.includes(q.trim()) && (
                <Pressable style={s.resultRow} onPress={() => selectFromSearch(q.trim())}>
                  <Icon name="plus-circle" size={20} color={colors.primary} weight="fill" />
                  <Text style={[s.resultName, { color: colors.primary }]}>‘{q.trim()}’ 직접 등록</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              <View style={s.aiCard}>
                <View style={s.aiCardTop}>
                  <Text style={s.aiSparkle}>✨</Text>
                  <Text style={s.aiTitle}>AI로 빠르게 등록</Text>
                </View>
                <View style={s.aiBtnRow}>
                  <Pressable style={s.aiOpt} onPress={() => runAi('receipt')}>
                    <Text style={s.aiOptEmoji}>🧾</Text>
                    <Text style={s.aiOptText}>영수증 스캔</Text>
                  </Pressable>
                  <Pressable style={s.aiOpt} onPress={() => runAi('photo')}>
                    <Text style={s.aiOptEmoji}>📷</Text>
                    <Text style={s.aiOptText}>식재료 사진</Text>
                  </Pressable>
                </View>
                <Text style={s.aiHint}>인식한 재료를 확인·수정한 뒤 등록해요</Text>
              </View>

              <Text style={s.stepLabel}>어떤 종류인가요?</Text>
              <View style={s.catGrid}>
                {FINE_CATEGORIES.map((c) => (
                  <Pressable key={c.code} style={s.catGridItem} onPress={() => pickCategory(c.code)}>
                    <Text style={s.catGridEmoji}>{c.emoji}</Text>
                    <Text style={s.catGridLabel}>{c.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ── 1단계: 식재료 선택 ────────────────────────────────── */}
      {step === 1 && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Pressable style={s.catBadge} onPress={() => setStep(0)}>
            <Text style={s.catBadgeEmoji}>{catMeta?.emoji}</Text>
            <Text style={s.catBadgeLabel}>{catMeta?.label}</Text>
            <Text style={s.catBadgeChange}>변경</Text>
          </Pressable>

          <Text style={s.stepLabel}>어떤 재료인가요?</Text>
          {items.length > 0 && (
            <View style={s.wrap}>
              {items.map((n) => {
                const on = name === n;
                return (
                  <Pressable key={n} onPress={() => chooseIngredient(n)} style={[s.chip, on && s.chipOn]}>
                    <Text style={s.chipEmoji}>{emojiFor(n, coarseFromFine(fineCat))}</Text>
                    <Text style={[s.chipText, on && s.chipTextOn]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Text style={s.orLabel}>목록에 없으면 직접 입력</Text>
          <View style={s.searchRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="식재료 이름"
              placeholderTextColor={colors.inkAsst}
              style={s.search}
              onSubmitEditing={nextWithTyped}
              returnKeyType="next"
            />
          </View>
        </ScrollView>
      )}

      {/* ── 2단계: 재료 상세 설정 ─────────────────────────────── */}
      {step === 2 && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {/* 선택한 재료 히어로 (이름 직접 수정 가능) */}
          <View style={s.hero}>
            <View style={s.heroTile}>
              <Text style={s.heroEmoji}>{emojiFor(name, coarseFromFine(fineCat))}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroCat}>{catMeta?.label}</Text>
              {nameEditing ? (
                <View style={s.nameEditRow}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    autoFocus
                    placeholder="재료 이름"
                    placeholderTextColor={colors.inkAsst}
                    style={s.nameInput}
                    onSubmitEditing={() => setNameEditing(false)}
                    returnKeyType="done"
                  />
                  <Pressable onPress={() => setNameEditing(false)} hitSlop={8}>
                    <Icon name="check-circle" size={26} color={colors.primary} weight="fill" />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={s.nameRow} onPress={() => setNameEditing(true)}>
                  <Text style={s.heroName} numberOfLines={1}>{name || '재료 선택'}</Text>
                  <Icon name="pencil" size={17} color={colors.inkAsst} />
                </Pressable>
              )}
            </View>
          </View>

          {/* 설정 리스트 카드 */}
          <View style={s.card}>
            {/* 카테고리 */}
            {!editing && !prefillName ? (
              <Pressable style={s.listRow} onPress={() => setStep(1)}>
                <Text style={s.rowLabel}>카테고리</Text>
                <View style={s.rowRight}>
                  <Text style={s.rowValue}>{catMeta?.label}</Text>
                  <Icon name="caret-right" size={16} color={colors.inkAsst} weight="bold" />
                </View>
              </Pressable>
            ) : (
              <View style={s.listRow}>
                <Text style={s.rowLabel}>카테고리</Text>
                <Text style={s.rowValue}>{catMeta?.label}</Text>
              </View>
            )}
            <View style={s.divider} />

            {/* 등록일 */}
            <Pressable style={s.listRow} onPress={() => setCal('added')}>
              <Text style={s.rowLabel}>등록일</Text>
              <View style={s.rowRight}>
                <Text style={s.rowValue}>{fmtDot(addedDate)}</Text>
                <Icon name="caret-right" size={16} color={colors.inkAsst} weight="bold" />
              </View>
            </Pressable>
            <View style={s.divider} />

            {/* 소비기한 */}
            <Pressable style={s.listRow} onPress={() => setCal('expiry')}>
              <Text style={s.rowLabel}>소비기한</Text>
              <View style={s.rowRight}>
                {expiryDate && dleft != null ? (
                  <Text style={s.rowValue}>
                    {fmtDot(expiryDate)} · {dleft === 0 ? 'D-day' : dleft < 0 ? `D+${-dleft}` : `D-${dleft}`}
                  </Text>
                ) : (
                  <Text style={s.rowValueMuted}>미설정</Text>
                )}
                <Icon name="caret-right" size={16} color={colors.inkAsst} weight="bold" />
              </View>
            </Pressable>
            <View style={s.divider} />

            {/* 보관 위치 — 냉장/냉동/실온 */}
            <View style={s.listRowTop}>
              <Text style={s.rowLabel}>보관 위치</Text>
              <View style={s.segRow}>
                {STORAGE_PICKS.map((st) => {
                  const on = storage === st.code;
                  return (
                    <Pressable key={st.code} onPress={() => setStorage(st.code)} style={[s.seg, on && s.segOn]}>
                      <Icon name={st.icon} size={15} color={on ? colors.white : colors.inkAlt} weight="bold" />
                      <Text style={[s.segText, on && s.segTextOn]}>{STORAGE_LABEL[st.code]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={s.divider} />

            {/* 수량 */}
            <View style={s.listRowTop}>
              <Text style={s.rowLabel}>수량</Text>
              {unit === 'percent' ? (
                <View style={s.wrap}>
                  {['100', '75', '50', '25'].map((p) => (
                    <Pressable key={p} onPress={() => setAmount(p)} style={[s.chip, amount === p && s.chipOn]}>
                      <Text style={[s.chipText, amount === p && s.chipTextOn]}>{p}%</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={s.stepper}>
                  <Pressable onPress={() => adjust(-stepSize)} hitSlop={8}>
                    <Icon name="minus-circle" size={26} color={colors.inkAlt} weight="fill" />
                  </Pressable>
                  <TextInput
                    value={amount}
                    onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.inkAsst}
                    style={s.stepInput}
                    textAlign="center"
                  />
                  <Pressable onPress={() => adjust(stepSize)} hitSlop={8}>
                    <Icon name="plus-circle" size={26} color={colors.inkAlt} weight="fill" />
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {/* 등록 내역 */}
          <View style={s.card}>
            <Text style={s.historyTitle}>수량 변경 내역</Text>
            <View style={s.historyRow}>
              <View style={s.historyTag}><Text style={s.historyTagText}>등록</Text></View>
              <Text style={s.historyDate}>{added}</Text>
              <Text style={s.historyQty}>{amt}{UNIT_SUFFIX[unit]}</Text>
            </View>
          </View>

          {/* 메모 — 좌측 정렬, 길어지면 박스도 늘어남(멀티라인 자동 확장) */}
          <TextInput
            value={memo}
            onChangeText={setMemo}
            placeholder="메모 추가하기"
            placeholderTextColor={colors.inkAsst}
            style={s.memoInput}
            multiline
            textAlignVertical="top"
          />

          {editing && (
            <Pressable style={s.deleteBtn} onPress={() => { removeFridge(editing.id); nav.closeOverlay(); }}>
              <Icon name="trash" size={18} color={colors.coral} />
              <Text style={s.deleteText}>이 재료 삭제</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* 하단 버튼 */}
      {step === 1 && (
        <View style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
          <AppButton label="다음" onPress={nextWithTyped} disabled={!name.trim()} />
        </View>
      )}
      {step === 2 && (
        <View style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
          <AppButton label={editing ? '저장' : '냉장고에 추가'} onPress={save} disabled={!canSave} />
        </View>
      )}

      {/* AI 인식 결과 확인·수정 시트 */}
      <Modal visible={!!aiItems} transparent animationType="slide" onRequestClose={() => setAiItems(null)}>
        <View style={s.aiBackdrop}>
          <View style={[s.aiSheet, { paddingBottom: 16 + insets.bottom }]}>
            <View style={s.aiSheetHead}>
              <Text style={s.aiSheetTitle}>인식된 재료 확인</Text>
              <Pressable onPress={() => setAiItems(null)} hitSlop={8}>
                <Icon name="x" size={20} color={colors.inkAlt} weight="bold" />
              </Pressable>
            </View>
            <Text style={s.aiSheetSub}>잘못된 항목은 수정·삭제하고, 빠진 건 추가하세요.</Text>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {aiItems?.map((it) => (
                <View key={it.id} style={s.aiItemRow}>
                  <Text style={s.aiItemEmoji}>{emojiFor(it.name)}</Text>
                  <TextInput
                    value={it.name}
                    onChangeText={(t) => setAiField(it.id, 'name', t)}
                    placeholder="재료명"
                    placeholderTextColor={colors.inkAsst}
                    style={s.aiNameInput}
                  />
                  <TextInput
                    value={it.amount}
                    onChangeText={(t) => setAiField(it.id, 'amount', t.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    style={s.aiAmtInput}
                    textAlign="center"
                  />
                  <Text style={s.aiUnit}>{UNIT_SUFFIX[unitOf(it.name)]}</Text>
                  <Pressable onPress={() => removeAi(it.id)} hitSlop={6}>
                    <Icon name="x" size={16} color={colors.inkAsst} weight="bold" />
                  </Pressable>
                </View>
              ))}
              <Pressable style={s.aiAddRow} onPress={addAiRow}>
                <Icon name="plus" size={15} color={colors.primary} weight="bold" />
                <Text style={s.aiAddText}>직접 추가</Text>
              </Pressable>
            </ScrollView>
            <AppButton label={`${aiItems?.length ?? 0}개 냉장고에 등록`} onPress={aiSave} disabled={!aiItems || aiItems.length === 0} style={{ marginTop: 14 }} />
          </View>
        </View>
      </Modal>

      {/* 날짜 선택 달력 (등록일/소비기한 공용) */}
      <DatePickerModal
        visible={cal !== null}
        value={cal === 'added' ? addedDate : expiryDate ?? addDays(startOfToday(), 7)}
        title={cal === 'added' ? '등록일 선택' : '소비기한 선택'}
        hint={cal === 'added' ? '냉장고에 넣은 날짜예요.' : '날짜를 고르면 남은 일수가 자동 계산돼요.'}
        disableBefore={cal === 'expiry' ? startOfToday() : null}
        disableAfter={cal === 'added' ? startOfToday() : null}
        presets={cal === 'expiry' ? DDAY_PRESETS : undefined}
        presetSel={cal === 'expiry' ? (expiry === null ? 'none' : dleft) : undefined}
        onClear={cal === 'expiry' ? () => { setExpiry(null); setCal(null); } : undefined}
        onSelect={(d) => { if (cal === 'added') setAdded(toISO(d)); else setExpiry(toISO(d)); setCal(null); }}
        onClose={() => setCal(null)}
        insetsBottom={insets.bottom}
      />
    </View>
  );
}

// 외부 라이브러리 없이 RN 기본 요소로 만든 달력 — 웹/실기기 동일하게 동작.
// disableBefore / disableAfter 로 선택 범위 제한, presets 로 빠른 선택(소비기한) 제공.
function DatePickerModal({
  visible,
  value,
  title,
  hint,
  disableBefore,
  disableAfter,
  presets,
  presetSel,
  onSelect,
  onClear,
  onClose,
  insetsBottom,
}: {
  visible: boolean;
  value: Date;
  title: string;
  hint: string;
  disableBefore?: Date | null;
  disableAfter?: Date | null;
  presets?: { label: string; days: number | null }[];
  presetSel?: number | 'none' | null;
  onSelect: (d: Date) => void;
  onClear?: () => void;
  onClose: () => void;
  insetsBottom: number;
}) {
  const today = startOfToday();
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  useEffect(() => {
    if (visible) setView(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [visible]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const ym = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const viewYm = year * 12 + month;
  const canPrev = !disableBefore || viewYm > ym(disableBefore);
  const canNext = !disableAfter || viewYm < ym(disableAfter);
  const shift = (delta: number) => setView(new Date(year, month + delta, 1));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.aiBackdrop} onPress={onClose}>
        <Pressable style={[s.calSheet, { paddingBottom: 16 + insetsBottom }]} onPress={(e) => e.stopPropagation?.()}>
          <View style={s.aiSheetHead}>
            <Text style={s.aiSheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={20} color={colors.inkAlt} weight="bold" />
            </Pressable>
          </View>

          {presets && (
            <View style={[s.wrap, { marginTop: 14 }]}>
              {presets.map((p) => {
                const on = presetSel === (p.days ?? 'none');
                return (
                  <Pressable
                    key={p.label}
                    onPress={() => (p.days == null ? onClear?.() : onSelect(addDays(today, p.days)))}
                    style={[s.chip, on && s.chipOn]}
                  >
                    <Text style={[s.chipText, on && s.chipTextOn]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={s.calNav}>
            <Pressable onPress={() => canPrev && shift(-1)} hitSlop={8} disabled={!canPrev}>
              <Icon name="caret-left" size={22} color={canPrev ? colors.ink : colors.line} weight="bold" />
            </Pressable>
            <Text style={s.calMonthLabel}>{year}년 {month + 1}월</Text>
            <Pressable onPress={() => canNext && shift(1)} hitSlop={8} disabled={!canNext}>
              <Icon name="caret-right" size={22} color={canNext ? colors.ink : colors.line} weight="bold" />
            </Pressable>
          </View>

          <View style={s.calRow}>
            {WEEKDAYS.map((w, i) => (
              <View key={w} style={s.calCell}>
                <Text style={[s.calWeekday, i === 0 && { color: colors.coral }, i === 6 && { color: colors.primary }]}>{w}</Text>
              </View>
            ))}
          </View>

          <View style={s.calGrid}>
            {cells.map((d, i) => {
              if (d == null) return <View key={`e${i}`} style={s.calCell} />;
              const cellDate = new Date(year, month, d);
              const disabled =
                (!!disableBefore && cellDate.getTime() < disableBefore.getTime()) ||
                (!!disableAfter && cellDate.getTime() > disableAfter.getTime());
              const isToday = sameYMD(cellDate, today);
              const isSel = sameYMD(cellDate, value);
              return (
                <Pressable key={d} style={s.calCell} disabled={disabled} onPress={() => onSelect(cellDate)}>
                  <View style={[s.calDay, isSel && s.calDaySel, isToday && !isSel && s.calDayToday]}>
                    <Text style={[s.calDayText, disabled && s.calDayPast, isSel && s.calDayTextSel]}>{d}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={s.calHint}>{hint}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const EMOJI_FONT = Platform.OS === 'web' ? { fontFamily: '"Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif' } : null;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  stepLabel: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink, marginBottom: 14 },
  orLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.inkAsst, marginTop: 22, marginBottom: 10 },

  // 검색 / 직접 입력
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: 14, marginBottom: 18 },
  search: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink, paddingVertical: 12 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.line },
  resultEmoji: { fontSize: 18, ...(EMOJI_FONT || {}) },
  resultName: { flex: 1, fontFamily: font.bold, fontSize: 15, color: colors.ink },
  resultCat: { fontFamily: font.semibold, fontSize: 12, color: colors.inkAsst },

  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 13, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipEmoji: { fontSize: 14, ...(EMOJI_FONT || {}) },
  chipText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },
  chipTextOn: { color: colors.white },

  // 카테고리 그리드
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  catGridItem: { width: '31%', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 6 },
  catGridEmoji: { fontSize: 26, ...(EMOJI_FONT || {}) },
  catGridLabel: { fontFamily: font.bold, fontSize: 12, color: colors.ink, textAlign: 'center' },

  // 카테고리 배지(1단계)
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: colors.primaryBg, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 18 },
  catBadgeEmoji: { fontSize: 16, ...(EMOJI_FONT || {}) },
  catBadgeLabel: { fontFamily: font.extrabold, fontSize: 14, color: colors.primaryDark },
  catBadgeChange: { fontFamily: font.bold, fontSize: 12, color: colors.primary, marginLeft: 2 },

  // 상세 히어로
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18, paddingHorizontal: 4 },
  heroTile: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 34, ...(EMOJI_FONT || {}) },
  heroCat: { fontFamily: font.bold, fontSize: 13, color: colors.inkAsst, marginBottom: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroName: { fontFamily: font.extrabold, fontSize: 22, color: colors.ink, letterSpacing: -0.4, flexShrink: 1 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { flex: 1, fontFamily: font.extrabold, fontSize: 20, color: colors.ink, borderBottomWidth: 2, borderBottomColor: colors.primary, paddingVertical: 2 },

  // 설정 리스트 카드
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 14 },
  divider: { height: 1, backgroundColor: colors.line },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingVertical: 12 },
  listRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingVertical: 12, gap: 10 },
  rowLabel: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowValue: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  rowValueMuted: { fontFamily: font.bold, fontSize: 15, color: colors.inkAsst },

  // 보관 위치 세그먼트
  segRow: { flexDirection: 'row', gap: 7, flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' },
  seg: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line },
  segOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  segText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },
  segTextOn: { color: colors.white },

  // 수량 스테퍼 — 한 줄 유지, 컴팩트하게.
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.cream, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 6, paddingVertical: 3 },
  stepInput: { width: 44, fontFamily: font.bold, fontSize: 15, color: colors.ink, paddingVertical: 4, textAlign: 'center' },

  // 등록 내역
  historyTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink, marginTop: 12, marginBottom: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14 },
  historyTag: { backgroundColor: colors.primaryBg, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 12 },
  historyTagText: { fontFamily: font.bold, fontSize: 13, color: colors.primary },
  historyDate: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.inkAlt },
  historyQty: { fontFamily: font.bold, fontSize: 14, color: colors.ink },

  // 메모
  memoInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 14, fontFamily: font.medium, fontSize: 15, color: colors.ink, textAlign: 'left', minHeight: 50, marginBottom: 6 },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 8 },
  deleteText: { fontFamily: font.bold, fontSize: 15, color: colors.coral },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },

  // 달력 시트
  calSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, marginTop: 14, marginBottom: 10 },
  calMonthLabel: { fontFamily: font.extrabold, fontSize: 16, color: colors.ink },
  calRow: { flexDirection: 'row' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
  calWeekday: { fontFamily: font.bold, fontSize: 12, color: colors.inkAsst, paddingVertical: 6 },
  calDay: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  calDaySel: { backgroundColor: colors.primary },
  calDayToday: { borderWidth: 1.5, borderColor: colors.primary },
  calDayText: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  calDayTextSel: { color: colors.white },
  calDayPast: { color: colors.line },
  calHint: { fontFamily: font.medium, fontSize: 12, color: colors.inkAlt, marginTop: 12, textAlign: 'center' },

  // AI 등록 카드
  aiCard: { backgroundColor: colors.primaryBg, borderRadius: radius.xl, padding: 16, marginBottom: 20 },
  aiCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  aiSparkle: { fontSize: 16, ...(EMOJI_FONT || {}) },
  aiTitle: { fontFamily: font.extrabold, fontSize: 15, color: colors.primaryDark },
  aiBtnRow: { flexDirection: 'row', gap: 10 },
  aiOpt: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 14 },
  aiOptEmoji: { fontSize: 24, ...(EMOJI_FONT || {}) },
  aiOptText: { fontFamily: font.bold, fontSize: 13.5, color: colors.ink },
  aiHint: { fontFamily: font.medium, fontSize: 12, color: colors.primaryDark, marginTop: 10, textAlign: 'center' },

  // AI 확인 시트
  aiBackdrop: { flex: 1, backgroundColor: 'rgba(20,24,18,0.4)', justifyContent: 'flex-end' },
  aiSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  aiSheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiSheetTitle: { fontFamily: font.extrabold, fontSize: 18, color: colors.ink },
  aiSheetSub: { fontFamily: font.medium, fontSize: 13, color: colors.inkAlt, marginTop: 6, marginBottom: 12 },
  aiItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.line },
  aiItemEmoji: { fontSize: 20, ...(EMOJI_FONT || {}) },
  aiNameInput: { flex: 1, fontFamily: font.bold, fontSize: 15, color: colors.ink, paddingVertical: 6 },
  aiAmtInput: { width: 54, backgroundColor: colors.fill, borderRadius: radius.sm, paddingVertical: 6, fontFamily: font.bold, fontSize: 15, color: colors.ink },
  aiUnit: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt, width: 18 },
  aiAddRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  aiAddText: { fontFamily: font.bold, fontSize: 14, color: colors.primary },
});
