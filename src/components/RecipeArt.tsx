// 레시피 전용 SVG 일러스트. 이모지로 표현이 어려운 한식을 직접 그려서 씁니다.
// id 별로 컴포넌트를 등록하면 RecipeTile 이 이모지 대신 이 그림을 렌더해요.
import React from 'react';
import Svg, { Rect, Circle, Ellipse, Path, G } from 'react-native-svg';

type ArtProps = { size: number };

// 계란말이 — 돌돌 말린 노란 계란 단면(소용돌이) 슬라이스.
function EggRoll({ size }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* 살짝 비치는 그림자 */}
      <Ellipse cx={50} cy={82} rx={26} ry={6} fill="#000000" opacity={0.06} />
      {/* 계란말이 롤 단면 — 따뜻한 노란 둥근 단면 */}
      <Rect x={26} y={20} width={48} height={58} rx={20} fill="#F7C94B" stroke="#E0A52A" strokeWidth={3} />
      {/* 말린 결 (동심 라인) */}
      <Rect x={35} y={31} width={30} height={36} rx={14} fill="none" stroke="#EDB63C" strokeWidth={2.6} />
      <Rect x={43} y={41} width={14} height={17} rx={7} fill="none" stroke="#EDB63C" strokeWidth={2.6} />
      {/* 소용돌이 중심 */}
      <Circle cx={50} cy={49} r={2.6} fill="#E0A52A" />
      {/* 윗면 하이라이트 */}
      <Path d="M37 24 Q50 18 63 24" stroke="#FBE08A" strokeWidth={3} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

// 두부김치 — 접시 가장자리에 큼직하고 납작한 네모 두부를 빙 둘러, 가운데 볶은김치까지 꽉 차게.
function TofuKimchi({ size }: ArtProps) {
  const n = 9; // 가장자리 두부 조각 수
  const tofu = [];
  for (let i = 0; i < n; i++) {
    tofu.push(
      <G key={i} transform={`rotate(${(360 / n) * i} 50 50)`}>
        {/* 부친 두부 한 조각 — 크고 납작한 네모, 살짝 노릇한 테두리. 안쪽이 김치에 닿게 길게. */}
        <Rect x={41} y={4} width={18} height={25} rx={2} fill="#FFFDF5" stroke="#E7CE8C" strokeWidth={1.8} />
      </G>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* 접시 그림자 */}
      <Ellipse cx={50} cy={85} rx={31} ry={6} fill="#000000" opacity={0.06} />
      {/* 흰 접시 */}
      <Circle cx={50} cy={50} r={47} fill="#FFFFFF" stroke="#E7DFCF" strokeWidth={3} />
      {/* 가장자리 두부 (접시 전체를 꽉 채움) */}
      {tofu}
      {/* 가운데 볶은김치 더미 — 두부 안쪽에 꽉 차게 */}
      <G>
        <Ellipse cx={50} cy={50} rx={20} ry={19} fill="#D4422A" />
        <Ellipse cx={43} cy={46} rx={8} ry={6} fill="#E5663A" transform="rotate(-20 43 46)" />
        <Ellipse cx={57} cy={54} rx={7.5} ry={5.5} fill="#B5331E" transform="rotate(25 57 54)" />
        <Ellipse cx={54} cy={45} rx={5} ry={3.5} fill="#EE8049" />
        <Ellipse cx={45} cy={57} rx={4.5} ry={3.2} fill="#C73B22" />
        <Ellipse cx={56} cy={44} rx={3} ry={2.2} fill="#F0905A" />
        {/* 참기름 윤기 */}
        <Circle cx={49} cy={48} r={1.8} fill="#FFD9A0" opacity={0.85} />
      </G>
    </Svg>
  );
}

// id → 전용 일러스트 컴포넌트. 없으면 RecipeTile 이 이모지로 폴백.
export const RECIPE_ART: Record<string, React.FC<ArtProps>> = {
  'egg-roll': EggRoll,
  'tofu-kimchi': TofuKimchi,
};
