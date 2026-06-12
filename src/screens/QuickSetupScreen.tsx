// 냉장고 빠른 세팅 (spec §9.2~9.5) — 유형 선택 → 기본재료 체크 → 빠진재료 추가 → 완료
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { AppButton } from '../components/ui';
import { CATEGORY } from '../data/constants';
import { PRESET_PACKS, useApp, matchAll, infoFor } from '../data/store';

const SUGGESTED = ['우유', '치즈', '콩나물', '토마토', '버섯', '참치캔', '두유', '사과'];

export function QuickSetupScreen({ onDone }: { onDone: () => void }) {
  const { fridge } = useApp();
  const [step, setStep] = useState(0);
  const [packCode, setPackCode] = useState('home_basic');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
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

  const addItem = (n: string) => {
    const name = n.trim();
    if (!name || added.includes(name) || pack.items.includes(name)) return;
    setAdded((a) => [...a, name]);
  };

  const matches = matchAll(fridge);
  const readyCount = matches.filter((m) => m.missing.length === 0).length;
  const almostCount = matches.filter((m) => m.missing.length >= 1 && m.missing.length <= 2).length;
  const total = pack.items.filter(isChecked).length + added.length;

  const back = () => (step === 0 ? undefined : setStep(step - 1));

  return (
    <View style={s.root}>
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
            <Text style={s.h1}>우리집에 있는 재료만{'\n'}남겨주세요.</Text>
            <Text style={s.sub}>기본은 체크된 상태예요. 없는 재료만 해제하세요.</Text>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            {Object.entries(grouped).map(([cat, items]) => (
              <View key={cat} style={{ marginBottom: 18 }}>
                <Text style={s.catLabel}>{CATEGORY[cat]?.label ?? cat}</Text>
                <View style={s.checkWrap}>
                  {items.map((n) => {
                    const on = isChecked(n);
                    return (
                      <Pressable key={n} onPress={() => toggle(n)} style={[s.checkTile, on && s.checkTileOn]}>
                        <Icon name={on ? 'check-circle' : 'plus-circle'} size={18} color={on ? colors.primary : colors.inkAsst} weight={on ? 'fill' : 'regular'} />
                        <Text style={[s.checkText, on && { color: colors.ink }]}>{n}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
          <AppButton label="다음" onPress={() => setStep(2)} style={s.cta} />
        </>
      )}

      {step === 2 && (
        <>
          <View style={s.head}>
            <Text style={s.h1}>빠진 재료가 있나요?</Text>
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
          <AppButton label="냉장고 만들기" icon="magic-wand" onPress={() => setStep(3)} style={s.cta} />
        </>
      )}

      {step === 3 && (
        <View style={s.done}>
          <View style={s.doneIcon}>
            <Icon name="check-circle" size={64} color={colors.primary} weight="fill" />
          </View>
          <Text style={s.doneTitle}>냉장고가 준비됐어요.</Text>
          <Text style={s.doneSub}>{pack.label} 기준으로 채웠어요.</Text>
          <View style={s.statCard}>
            <Stat n={fridge.length} label="등록된 식재료" />
            <View style={s.statDivider} />
            <Stat n={readyCount} label="바로 만드는 요리" />
            <View style={s.statDivider} />
            <Stat n={almostCount} label="조금만 사면" />
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  progressText: { fontFamily: font.bold, fontSize: 12, color: colors.inkAlt, width: 28, textAlign: 'right' },

  head: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 },
  h1: { fontFamily: font.extrabold, fontSize: 26, color: colors.ink, lineHeight: 34, letterSpacing: -0.5 },
  sub: { fontFamily: font.medium, fontSize: 14, color: colors.inkAlt, marginTop: 10 },

  cta: { marginHorizontal: 20, marginBottom: 20, marginTop: 6 },

  typeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.xl, padding: 18 },
  typeCardOn: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  typeIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontFamily: font.bold, fontSize: 17, color: colors.ink },
  typeDesc: { fontFamily: font.medium, fontSize: 13, color: colors.inkAlt, marginTop: 4 },

  catLabel: { fontFamily: font.extrabold, fontSize: 14, color: colors.inkAlt, marginBottom: 10 },
  checkWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkTile: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface },
  checkTileOn: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  checkText: { fontFamily: font.bold, fontSize: 14, color: colors.inkAsst },

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
