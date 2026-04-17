import { describe, it, expect } from 'vitest';
import { matchSpeciesByTraits, hasDangerousCandidate } from './identify-matcher-v2';
import type { Mushroom, Safety } from '@/types/mushroom';

/** テスト用の最小 Mushroom ファクトリ。必須フィールドのみダミー埋め。 */
function makeMushroom(
  id: string,
  ja: string,
  safety: Safety,
  traits: string[] | undefined,
): Mushroom {
  return {
    id,
    names: { ja, scientific: id },
    safety,
    season: [{ start_month: 6, end_month: 10 }],
    habitat: [],
    regions: [],
    description: '',
    features: '',
    cooking_preservation: null,
    poisoning_first_aid: null,
    caution: null,
    similar_species: [],
    sources: [],
    image_local: null,
    images_remote: [],
    traits,
  };
}

describe('matchSpeciesByTraits', () => {
  const tamagotake = makeMushroom('tamagotake', 'タマゴタケ', 'edible', [
    'pileus_color_red',
    'pileus_color_orange',
    'stipe_color_yellow',
    'volva_presence_present',
  ]);
  const benitengutake = makeMushroom('benitengutake', 'ベニテングタケ', 'toxic', [
    'pileus_color_red',
    'pileus_surface_warty',
    'stipe_color_white',
    'volva_presence_present',
  ]);
  const shiitake = makeMushroom('shiitake', 'シイタケ', 'edible', [
    'pileus_color_brown',
    'lamellae_color_white',
  ]);
  const missingTraits = makeMushroom('missing', 'ウラベニホテイシメジ', 'caution', undefined);

  const pool = [tamagotake, benitengutake, shiitake, missingTraits];

  it('空の selectedTraits なら空配列を返す', () => {
    expect(matchSpeciesByTraits([], pool)).toEqual([]);
  });

  it('traits を持たない種は候補から除外される', () => {
    const res = matchSpeciesByTraits(['pileus_color_red'], pool);
    expect(res.find((c) => c.mushroom.id === 'missing')).toBeUndefined();
  });

  it('hitCount=0 の種は除外される', () => {
    const res = matchSpeciesByTraits(['pileus_color_red'], pool);
    // シイタケは pileus_color_brown のみで red を持たない → 除外
    expect(res.find((c) => c.mushroom.id === 'shiitake')).toBeUndefined();
  });

  it('score は hitCount / selectedCount で計算される', () => {
    const res = matchSpeciesByTraits(
      ['pileus_color_red', 'volva_presence_present'],
      pool,
    );
    const tama = res.find((c) => c.mushroom.id === 'tamagotake')!;
    expect(tama.hitCount).toBe(2);
    expect(tama.selectedCount).toBe(2);
    expect(tama.score).toBe(1);
  });

  it('同率は safety priority で food 側を先頭に', () => {
    // タマゴタケ (edible) とベニテングタケ (toxic) の共通形質で引く → score 同率 1.0
    const res = matchSpeciesByTraits(
      ['pileus_color_red', 'volva_presence_present'],
      pool,
    );
    expect(res[0].mushroom.id).toBe('tamagotake'); // edible priority=0
    expect(res[1].mushroom.id).toBe('benitengutake'); // toxic priority=3
  });

  it('isDangerous フラグは toxic / deadly で true', () => {
    const res = matchSpeciesByTraits(
      ['pileus_color_red', 'volva_presence_present'],
      pool,
    );
    expect(res.find((c) => c.mushroom.id === 'tamagotake')!.isDangerous).toBe(false);
    expect(res.find((c) => c.mushroom.id === 'benitengutake')!.isDangerous).toBe(true);
  });

  it('minScore 未満の候補は除外', () => {
    // 10 個選んで 1 個だけマッチ = 0.1。minScore=0.2 なら除外。
    const pileus = [
      'pileus_color_red',
      'pileus_color_blue',
      'pileus_color_green',
      'pileus_color_purple',
      'pileus_color_pink',
      'pileus_color_grey',
      'pileus_color_black',
      'pileus_color_orange',
      'pileus_color_yellow',
      'pileus_color_white',
    ];
    const loose = matchSpeciesByTraits(pileus, pool, { minScore: 0.1 });
    expect(loose.length).toBeGreaterThan(0);
    const strict = matchSpeciesByTraits(pileus, pool, { minScore: 0.3 });
    // タマゴタケは red/orange 2 件で score=0.2、strict では除外
    expect(strict.find((c) => c.mushroom.id === 'tamagotake')).toBeUndefined();
  });

  it('maxResults で結果が打ち切られる', () => {
    const res = matchSpeciesByTraits(['pileus_color_red'], pool, { maxResults: 1 });
    expect(res.length).toBe(1);
  });

  it('score 降順でソートされる', () => {
    const res = matchSpeciesByTraits(
      ['pileus_color_red', 'pileus_surface_warty', 'volva_presence_present'],
      pool,
    );
    // ベニテングタケ: red + warty + volva = 3/3 = 1.0
    // タマゴタケ: red + volva = 2/3 ≒ 0.67
    expect(res[0].mushroom.id).toBe('benitengutake');
    expect(res[1].mushroom.id).toBe('tamagotake');
  });
});

describe('hasDangerousCandidate', () => {
  it('candidates に toxic / deadly が含まれれば true', () => {
    const edible = makeMushroom('a', 'A', 'edible', ['x']);
    const toxic = makeMushroom('b', 'B', 'toxic', ['y']);
    const deadly = makeMushroom('c', 'C', 'deadly', ['z']);
    expect(
      hasDangerousCandidate([
        { mushroom: edible, hitCount: 1, selectedCount: 1, score: 1, isDangerous: false },
      ]),
    ).toBe(false);
    expect(
      hasDangerousCandidate([
        { mushroom: edible, hitCount: 1, selectedCount: 1, score: 1, isDangerous: false },
        { mushroom: toxic, hitCount: 1, selectedCount: 1, score: 1, isDangerous: true },
      ]),
    ).toBe(true);
    expect(
      hasDangerousCandidate([
        { mushroom: deadly, hitCount: 1, selectedCount: 1, score: 1, isDangerous: true },
      ]),
    ).toBe(true);
  });

  it('空配列なら false', () => {
    expect(hasDangerousCandidate([])).toBe(false);
  });
});
