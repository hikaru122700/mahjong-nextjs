import { describe, expect, it } from 'vitest';

import {
  calculateScore,
  detectYaku,
  type AgariOptions,
  type Tile,
} from '../lib/mahjong';

const baseOptions: AgariOptions = {
  isTsumo: true,
  bakaze: 'ton',
  jikaze: 'nan',
  isRiichi: false,
  isIppatsu: false,
  isMenzen: true,
  isOya: false,
};

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
});

describe('yaku detection', () => {
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
});
