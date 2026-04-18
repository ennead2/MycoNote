import { describe, it, expect } from 'vitest';
import {
  matchSpeciesByTraits,
  hasDangerousCandidate,
  SCORING_CONSTANTS,
} from './identify-matcher-v2';
import type { Mushroom, Safety, SeasonRange } from '@/types/mushroom';

/** テスト用の最小 Mushroom ファクトリ。 */
function makeMushroom(
  id: string,
  ja: string,
  safety: Safety,
  traits: Record<string, number> | undefined,
  season: SeasonRange[] = [{ start_month: 6, end_month: 10 }],
): Mushroom {
  return {
    id,
    names: { ja, scientific: id },
    safety,
    season,
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

describe('matchSpeciesByTraits — 重み付きスコア', () => {
  // ベニテングタケ相当: 柄・白 19, 柄・桃 1, 傘・赤 19
  const beni = makeMushroom('beni', 'ベニテングタケ', 'toxic', {
    stipe_color_white: 19,
    stipe_color_pink: 1,
    pileus_color_red: 19,
  });
  // ヒラタケ相当: 柄・白 15 (ベニテングより弱いが他は持たず)
  const hira = makeMushroom('hira', 'ヒラタケ', 'edible', {
    stipe_color_white: 15,
  });
  const shii = makeMushroom('shii', 'シイタケ', 'edible', {
    pileus_color_brown: 10,
  });

  it('選択した色の count がそのまま得点になる', () => {
    const res = matchSpeciesByTraits(['stipe_color_white'], [beni, hira, shii]);
    const beniC = res.find((c) => c.mushroom.id === 'beni')!;
    const hiraC = res.find((c) => c.mushroom.id === 'hira')!;
    expect(beniC.rawScore).toBe(19);
    expect(hiraC.rawScore).toBe(15);
    // シイタケは stipe_color_white を持たない → 除外
    expect(res.find((c) => c.mushroom.id === 'shii')).toBeUndefined();
  });

  it('持たない色選択では得点 0 (候補から除外)', () => {
    // ベニテングは stipe_color_blue を持たない
    const res = matchSpeciesByTraits(['stipe_color_blue'], [beni]);
    expect(res).toHaveLength(0);
  });

  it('複数選択は各 count の和で加算される', () => {
    const res = matchSpeciesByTraits(['stipe_color_white', 'pileus_color_red'], [beni, hira]);
    const beniC = res.find((c) => c.mushroom.id === 'beni')!;
    expect(beniC.rawScore).toBe(19 + 19); // 38
    const hiraC = res.find((c) => c.mushroom.id === 'hira')!;
    expect(hiraC.rawScore).toBe(15); // 柄のみ
  });

  it('score は候補プール内の max rawScore で正規化される', () => {
    const res = matchSpeciesByTraits(['stipe_color_white'], [beni, hira]);
    const beniC = res.find((c) => c.mushroom.id === 'beni')!;
    const hiraC = res.find((c) => c.mushroom.id === 'hira')!;
    expect(beniC.score).toBe(1);
    expect(hiraC.score).toBeCloseTo(15 / 19, 5);
  });
});

describe('matchSpeciesByTraits — presence 暗黙マッチ', () => {
  // annulus_color_* はあるが annulus_presence_* はない (Trait Circus 抽出漏れ)
  const tama = makeMushroom('tama', 'タマゴタケ', 'edible', {
    annulus_color_orange: 5,
  });
  // annulus 系一切なし
  const shii = makeMushroom('shii', 'シイタケ', 'edible', {
    pileus_color_brown: 10,
  });
  // 明示的に annulus_presence_present
  const tengu = makeMushroom('tengu', 'テングタケ', 'toxic', {
    annulus_presence_present: 4,
  });

  it('presence=present 選択: element_* を持てば固定点暗黙マッチ', () => {
    const res = matchSpeciesByTraits(['annulus_presence_present'], [tama, shii, tengu]);
    const tamaC = res.find((c) => c.mushroom.id === 'tama')!;
    expect(tamaC.rawScore).toBe(SCORING_CONSTANTS.PRESENCE_IMPLICIT_POINTS); // 暗黙 3 点
    const tenguC = res.find((c) => c.mushroom.id === 'tengu')!;
    expect(tenguC.rawScore).toBe(4); // 直接マッチ (count 4)
    // シイタケは annulus 系なし
    expect(res.find((c) => c.mushroom.id === 'shii')).toBeUndefined();
  });

  it('presence=absent 選択: element_* を 1 つも持たなければ暗黙マッチ', () => {
    const res = matchSpeciesByTraits(['annulus_presence_absent'], [tama, shii, tengu]);
    const shiiC = res.find((c) => c.mushroom.id === 'shii')!;
    expect(shiiC.rawScore).toBe(SCORING_CONSTANTS.PRESENCE_IMPLICIT_POINTS);
    expect(res.find((c) => c.mushroom.id === 'tama')).toBeUndefined();
    expect(res.find((c) => c.mushroom.id === 'tengu')).toBeUndefined();
  });
});

describe('matchSpeciesByTraits — 月マッチ', () => {
  const summerM = makeMushroom('sm', '夏種', 'edible', { pileus_color_red: 3 }, [
    { start_month: 6, end_month: 8 },
  ]);
  const winterM = makeMushroom('wm', '冬種', 'edible', { pileus_color_red: 3 }, [
    { start_month: 11, end_month: 2 }, // wrap-around
  ]);

  it('month 指定で該当種に MONTH_MATCH_POINTS (=8) 加算', () => {
    const res = matchSpeciesByTraits(['pileus_color_red'], [summerM, winterM], { month: 7 });
    const sm = res.find((c) => c.mushroom.id === 'sm')!;
    const wm = res.find((c) => c.mushroom.id === 'wm')!;
    expect(sm.rawScore).toBe(3 + SCORING_CONSTANTS.MONTH_MATCH_POINTS); // 11
    expect(sm.monthMatched).toBe(true);
    expect(wm.rawScore).toBe(3); // 7 月は発生期外
    expect(wm.monthMatched).toBe(false);
  });

  it('month だけ指定 (形質選択なし) でも候補を返す', () => {
    const res = matchSpeciesByTraits([], [summerM, winterM], { month: 7 });
    expect(res).toHaveLength(1);
    expect(res[0].mushroom.id).toBe('sm');
    expect(res[0].rawScore).toBe(SCORING_CONSTANTS.MONTH_MATCH_POINTS);
  });

  it('冬またぎ期 (Nov-Feb) に 1 月マッチ', () => {
    const res = matchSpeciesByTraits([], [winterM], { month: 1 });
    expect(res[0].monthMatched).toBe(true);
  });
});

describe('matchSpeciesByTraits — ソート', () => {
  const beni = makeMushroom('beni', 'ベニテングタケ', 'toxic', {
    pileus_color_red: 19,
    stipe_color_white: 19,
  });
  const tama = makeMushroom('tama', 'タマゴタケ', 'edible', {
    pileus_color_red: 19,
    stipe_color_white: 19,
  });

  it('同率は safety priority (食用優先) で並ぶ', () => {
    const res = matchSpeciesByTraits(['pileus_color_red', 'stipe_color_white'], [beni, tama]);
    expect(res[0].mushroom.id).toBe('tama'); // edible
    expect(res[1].mushroom.id).toBe('beni'); // toxic
    expect(res[0].score).toBe(1);
    expect(res[1].score).toBe(1);
  });

  it('isDangerous は toxic/deadly で true', () => {
    const res = matchSpeciesByTraits(['pileus_color_red'], [beni, tama]);
    expect(res.find((c) => c.mushroom.id === 'beni')!.isDangerous).toBe(true);
    expect(res.find((c) => c.mushroom.id === 'tama')!.isDangerous).toBe(false);
  });
});

describe('matchSpeciesByTraits — 境界', () => {
  it('selectedTraits 空 & month なし → 空配列', () => {
    const m = makeMushroom('x', 'X', 'edible', { pileus_color_red: 1 });
    expect(matchSpeciesByTraits([], [m])).toEqual([]);
  });

  it('traits 未収録種は形質選択では拾われない', () => {
    const m = makeMushroom('x', 'X', 'edible', undefined);
    expect(matchSpeciesByTraits(['pileus_color_red'], [m])).toEqual([]);
  });

  it('traits 未収録種も月マッチは可能', () => {
    const m = makeMushroom('x', 'X', 'edible', undefined, [{ start_month: 5, end_month: 9 }]);
    const res = matchSpeciesByTraits([], [m], { month: 6 });
    expect(res).toHaveLength(1);
    expect(res[0].rawScore).toBe(SCORING_CONSTANTS.MONTH_MATCH_POINTS);
  });

  it('maxResults で打ち切り', () => {
    const pool = Array.from({ length: 5 }, (_, i) =>
      makeMushroom(`s${i}`, `種${i}`, 'edible', { pileus_color_red: i + 1 }),
    );
    const res = matchSpeciesByTraits(['pileus_color_red'], pool, { maxResults: 2 });
    expect(res).toHaveLength(2);
  });
});

describe('hasDangerousCandidate', () => {
  it('毒種を含むと true', () => {
    const toxic = makeMushroom('b', 'B', 'toxic', { x: 1 });
    const edible = makeMushroom('a', 'A', 'edible', { x: 1 });
    const r1 = matchSpeciesByTraits(['x'], [toxic, edible]);
    expect(hasDangerousCandidate(r1)).toBe(true);
    const r2 = matchSpeciesByTraits(['x'], [edible]);
    expect(hasDangerousCandidate(r2)).toBe(false);
    expect(hasDangerousCandidate([])).toBe(false);
  });
});
