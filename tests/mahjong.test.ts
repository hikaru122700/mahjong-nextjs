import { describe, expect, it } from 'vitest';

import {
  calculateFu,
  calculateFinalScore,
  calculateScore,
  detectYaku,
  isWinningHand,
  type AgariOptions,
  type Tile,
} from '../lib/mahjong';

const baseOptions: AgariOptions = {
  isTsumo: true,
  bakaze: 'ton',
  jikaze: 'nan',
  isRiichi: false,
  isDoubleRiichi: false,
  isIppatsu: false,
  isMenzen: true,
  isOya: false,
  doraTiles: [],
  uraDoraTiles: [],
  redDora: { man: 0, pin: 0, sou: 0 },
  isHaitei: false,
  isHoutei: false,
  isRinshan: false,
  isChankan: false,
  isNagashiMangan: false,
};

describe('isWinningHand', () => {
  it('recognizes a standard hand', () => {
    const hand: Tile[] = ['1m', '1m', '2m', '3m', '4m', '4p', '5p', '6p', '2s', '3s', '4s', '6s', '7s', '8s'];
    expect(isWinningHand(hand)).toBe(true);
  });

  it('recognizes seven pairs', () => {
    const hand: Tile[] = ['1m', '1m', '2m', '2m', '3p', '3p', '4p', '4p', '5s', '5s', '6s', '6s', '東', '東'];
    expect(isWinningHand(hand)).toBe(true);
  });

  it('recognizes kokushi musou', () => {
    const hand: Tile[] = ['1m', '9m', '1p', '9p', '1s', '9s', '東', '南', '西', '北', '白', '發', '中', '1m'];
    expect(isWinningHand(hand)).toBe(true);
  });

  it('rejects an invalid shape', () => {
    const hand: Tile[] = ['1m', '1m', '1m', '2m', '2m', '2m', '3m', '3m', '3m', '4m', '4m', '4m', '5m', '5p'];
    expect(isWinningHand(hand)).toBe(false);
  });
});

describe('yaku detection', () => {
  it('detects Tanyao', () => {
    const fullHand: Tile[] = ['2m', '3m', '4m', '5p', '6p', '7p', '2s', '3s', '4s', '5s', '6s', '7s', '3m', '3m'];
    const yaku = detectYaku(fullHand, '3m', { ...baseOptions });
    expect(yaku.map(y => y.name)).toContain('断么九');
  });

  it('detects Toitoihou', () => {
    const fullHand: Tile[] = ['1m', '1m', '1m', '3m', '3m', '3m', '5p', '5p', '5p', '7s', '7s'];
    const yaku = detectYaku(fullHand, '7s', {
      ...baseOptions,
      isTsumo: false,
      isMenzen: false,
      melds: [{ type: 'pon', tiles: ['東', '東', '東'] }],
    });
    expect(yaku.map(y => y.name)).toContain('対々和');
  });

  it('detects Honitsu', () => {
    const fullHand: Tile[] = ['1p', '1p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '8p', '8p', '東', '東'];
    const yaku = detectYaku(fullHand, '東', { ...baseOptions });
    expect(yaku.map(y => y.name)).toContain('混一色');
  });

  it('detects Chinitsu', () => {
    const fullHand: Tile[] = ['1s', '2s', '3s', '4s', '5s', '6s', '7s', '7s', '7s', '8s', '8s', '8s', '9s', '9s'];
    const yaku = detectYaku(fullHand, '9s', { ...baseOptions });
    expect(yaku.map(y => y.name)).toContain('清一色');
  });

  it('detects Double Riichi and Ippatsu', () => {
    const fullHand: Tile[] = ['2m', '3m', '4m', '2p', '3p', '4p', '2s', '3s', '4s', '5m', '6m', '7m', '9p', '9p'];
    const yaku = detectYaku(fullHand, '7m', {
      ...baseOptions,
      isTsumo: false,
      isRiichi: true,
      isDoubleRiichi: true,
      isIppatsu: true,
    });
    const names = yaku.map(y => y.name);
    expect(names).toContain('ダブルリーチ');
    expect(names).toContain('一発');
    expect(names).not.toContain('リーチ');
  });

  it('detects Haitei and Rinshan for tsumo', () => {
    const fullHand: Tile[] = ['1m', '2m', '3m', '3p', '4p', '5p', '6p', '7p', '8p', '2s', '3s', '4s', '8m', '8m'];
    const yaku = detectYaku(fullHand, '3s', {
      ...baseOptions,
      isHaitei: true,
      isRinshan: true,
    });
    const names = yaku.map(y => y.name);
    expect(names).toContain('海底摸月');
    expect(names).toContain('嶺上開花');
  });

  it('detects Houtei, Chankan, and Nagashi Mangan', () => {
    const fullHand: Tile[] = ['1m', '2m', '3m', '1p', '2p', '3p', '1s', '2s', '3s', '5p', '6p', '7p', '4m', '4m'];
    const yaku = detectYaku(fullHand, '7p', {
      ...baseOptions,
      isTsumo: false,
      isHoutei: true,
      isChankan: true,
      isNagashiMangan: true,
    });
    const names = yaku.map(y => y.name);
    expect(names).toContain('河底撈魚');
    expect(names).toContain('槍槓');
    expect(names).toContain('流し満貫');
  });
});

describe('mahjong scoring', () => {
  it('calculates Pinfu tsumo correctly', () => {
    const hand: Tile[] = ['1m', '1m', '2m', '3m', '4m', '5p', '6p', '6s', '7s', '8s', '2s', '3s', '4s'];
    const winningTile: Tile = '4p';

    const result = calculateScore(hand, winningTile, baseOptions);

    if ('error' in result) {
      throw new Error(result.error);
    }

    expect(result.han).toBeGreaterThanOrEqual(2);
    expect(result.fu).toBe(20);
    expect(result.score).toBe('子: 400点、親: 700点（合計1500点）');
    const yakuNames = result.yaku.map(y => y.name);
    expect(yakuNames).toContain('平和');
    expect(yakuNames).toContain('門前清自摸和');
  });

  it('detects Chiitoitsu ron scoring', () => {
    const hand: Tile[] = ['1m', '1m', '2p', '2p', '3s', '3s', '4m', '4m', '5p', '5p', '6s', '6s', '東'];
    const winningTile: Tile = '東';

    const options: AgariOptions = {
      ...baseOptions,
      isTsumo: false,
    };

    const result = calculateScore(hand, winningTile, options);

    if ('error' in result) {
      throw new Error(result.error);
    }

    expect(result.fu).toBe(25);
    expect(result.score).toBe('1600点');
    expect(result.yaku.map(y => y.name)).toContain('七対子');
  });

  it('applies dora bonuses when configured', () => {
    const hand: Tile[] = ['2m', '3m', '4m', '5p', '6p', '7p', '2s', '3s', '4s', '6s', '7s', '8s', '5m'];
    const winningTile: Tile = '5m';

    const options: AgariOptions = {
      ...baseOptions,
      isRiichi: true,
      doraTiles: ['5m'],
      uraDoraTiles: ['2s'],
      redDora: { man: 1, pin: 0, sou: 0 },
    };

    const result = calculateScore(hand, winningTile, options);

    if ('error' in result) {
      throw new Error(result.error);
    }

    const yakuNames = result.yaku.map(y => y.name);
    expect(yakuNames).toContain('ドラ2');
    expect(yakuNames).toContain('裏ドラ1');
    expect(yakuNames).toContain('赤ドラ1');
  });
});

describe('calculateFu', () => {
  it('returns 25 for seven pairs', () => {
    const tiles: Tile[] = ['1m', '1m', '2m', '2m', '3p', '3p', '4p', '4p', '5s', '5s', '6s', '6s', '東', '東'];
    const fu = calculateFu(tiles, '東', false, true);
    expect(fu).toBe(25);
  });

  it('enforces 30 fu minimum for open hands', () => {
    const tiles: Tile[] = ['2m', '3m', '4m', '5m', '6m', '7m', '2p', '3p', '4p', '5p', '5p'];
    const melds = [{ type: 'pon' as const, tiles: ['東', '東', '東'] }];
    const fu = calculateFu(tiles, '5p', false, false, undefined, undefined, melds);
    expect(fu).toBeGreaterThanOrEqual(30);
  });
});

describe('calculateFinalScore', () => {
  it('computes child ron below mangan', () => {
    expect(calculateFinalScore(3, 30, false, false)).toBe('3900点');
  });

  it('computes child tsumo mangan', () => {
    expect(calculateFinalScore(5, 30, false, true)).toBe('子: 2000点、親: 4000点（合計8000点）');
  });
});

describe('calculateScore validations', () => {
  it('errors when hand size is invalid', () => {
    const result = calculateScore(['1m', '2m'], '3m', baseOptions);
    expect('error' in result).toBe(true);
  });

  it('errors when no yaku are present', () => {
    const hand: Tile[] = ['1m', '2m', '3m', '4m', '5m', '6m', '7p', '8p', '9p', '2s', '3s', '4s', '5m'];
    const result = calculateScore(hand, '5m', { ...baseOptions, isRiichi: false, isTsumo: false });
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('役がありません');
    }
  });
});

describe('additional yaku detection', () => {
  it('identifies Sanshoku Doujun', () => {
    const fullHand: Tile[] = ['2m', '3m', '4m', '2p', '3p', '4p', '2s', '3s', '4s', '5m', '6m', '7m', '9p', '9p'];
    const winningTile: Tile = '7m';

    const options: AgariOptions = {
      ...baseOptions,
      isTsumo: false,
    };

    const yaku = detectYaku(fullHand, winningTile, options);
    expect(yaku.map(y => y.name)).toContain('三色同順');
  });

  it('detects Sanshoku Doukou', () => {
    const fullHand: Tile[] = ['1m', '1m', '1m', '1p', '1p', '1p', '1s', '1s', '1s', '3m', '4m', '5m', '9p', '9p'];
    const yaku = detectYaku(fullHand, '5m', { ...baseOptions });
    expect(yaku.map(y => y.name)).toContain('三色同刻');
  });

  it('detects San Kantsu from melds', () => {
    const melds = [
      { type: 'minkan' as const, tiles: ['1m', '1m', '1m', '1m'] },
      { type: 'ankan' as const, tiles: ['2p', '2p', '2p', '2p'] },
      { type: 'minkan' as const, tiles: ['3s', '3s', '3s', '3s'] },
    ];
    const fullHand: Tile[] = ['4m', '5m', '6m', '9p', '9p'];
    const yaku = detectYaku(fullHand, '6m', {
      ...baseOptions,
      isMenzen: false,
      melds,
    });
    expect(yaku.map(y => y.name)).toContain('三槓子');
  });

  it('detects Suukantsu yakuman', () => {
    const melds = [
      { type: 'minkan' as const, tiles: ['1m', '1m', '1m', '1m'] },
      { type: 'ankan' as const, tiles: ['2p', '2p', '2p', '2p'] },
      { type: 'minkan' as const, tiles: ['3s', '3s', '3s', '3s'] },
      { type: 'ankan' as const, tiles: ['東', '東', '東', '東'] },
    ];
    const fullHand: Tile[] = ['9p', '9p'];
    const yaku = detectYaku(fullHand, '9p', {
      ...baseOptions,
      isMenzen: false,
      melds,
    });
    expect(yaku.map(y => y.name)).toContain('四槓子');
  });

  it('detects Kokushi Musou thirteen-sided wait', () => {
    const fullHand: Tile[] = ['1m', '1m', '9m', '1p', '9p', '1s', '9s', '東', '南', '西', '北', '白', '發', '中'];
    const yaku = detectYaku(fullHand, '1m', { ...baseOptions });
    expect(yaku.map(y => y.name)).toContain('国士無双十三面待ち');
  });

  it('detects Suuankou Tanki', () => {
    const fullHand: Tile[] = ['1m', '1m', '1m', '2m', '2m', '2m', '3p', '3p', '3p', '4p', '4p', '4p', '9s', '9s'];
    const yaku = detectYaku(fullHand, '9s', { ...baseOptions });
    expect(yaku.map(y => y.name)).toContain('四暗刻単騎');
  });

  it('detects Pure Chuuren Poutou', () => {
    const fullHand: Tile[] = ['1m', '1m', '1m', '2m', '3m', '4m', '5m', '5m', '6m', '7m', '8m', '9m', '9m', '9m'];
    const yaku = detectYaku(fullHand, '5m', { ...baseOptions });
    expect(yaku.map(y => y.name)).toContain('純正九蓮宝燈');
  });
});
