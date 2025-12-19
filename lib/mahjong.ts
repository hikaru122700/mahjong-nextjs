export type Tile = string;

export interface Yaku {
  name: string;
  han: number;
}

export interface AgariOptions {
  isTsumo: boolean;
  bakaze: string;
  jikaze: string;
  isRiichi: boolean;
  isIppatsu: boolean;
  isMenzen: boolean;
}

export interface CalculationResult {
  han: number;
  fu: number;
  score: string;
  yaku: Yaku[];
}

export const TILES = {
  manzu: ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m'],
  pinzu: ['1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p'],
  souzu: ['1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s'],
  jihai: ['東', '南', '西', '北', '白', '發', '中']
};

export const TILE_DISPLAY: Record<string, string> = {
  '1m': '一萬', '2m': '二萬', '3m': '三萬', '4m': '四萬', '5m': '五萬',
  '6m': '六萬', '7m': '七萬', '8m': '八萬', '9m': '九萬',
  '1p': '①', '2p': '②', '3p': '③', '4p': '④', '5p': '⑤',
  '6p': '⑥', '7p': '⑦', '8p': '⑧', '9p': '⑨',
  '1s': '1索', '2s': '2索', '3s': '3索', '4s': '4索', '5s': '5索',
  '6s': '6索', '7s': '7索', '8s': '8索', '9s': '9索',
  '東': '東', '南': '南', '西': '西', '北': '北', '白': '白', '發': '發', '中': '中'
};

export const TILE_ORDER: Record<string, number> = {
  '1m': 1, '2m': 2, '3m': 3, '4m': 4, '5m': 5, '6m': 6, '7m': 7, '8m': 8, '9m': 9,
  '1p': 11, '2p': 12, '3p': 13, '4p': 14, '5p': 15, '6p': 16, '7p': 17, '8p': 18, '9p': 19,
  '1s': 21, '2s': 22, '3s': 23, '4s': 24, '5s': 25, '6s': 26, '7s': 27, '8s': 28, '9s': 29,
  '東': 31, '南': 32, '西': 33, '北': 34, '白': 35, '發': 36, '中': 37
};

const BAKAZE_MAP: Record<string, string> = { ton: '東', nan: '南', sha: '西', pei: '北' };
const JIKAZE_MAP: Record<string, string> = { ton: '東', nan: '南', sha: '西', pei: '北' };

type MeldType = 'shuntsu' | 'koutsu' | 'kantsu';

interface Meld {
  type: MeldType;
  tiles: Tile[];
}

interface HandShape {
  pair: Tile;
  melds: Meld[];
}

interface MentsuPattern {
  jantou: Tile;
  mentsu: Tile[][];
}

export function sortHand(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => TILE_ORDER[a] - TILE_ORDER[b]);
}

function parseTile(tile: Tile): [number | null, string | null] {
  if (tile.length === 2) {
    const num = parseInt(tile[0]);
    const suit = tile[1];
    return [num, suit];
  }
  return [null, null];
}

function countTiles(tiles: Tile[]): Record<string, number> {
  const counts: Record<string, number> = {};
  tiles.forEach(tile => {
    counts[tile] = (counts[tile] || 0) + 1;
  });
  return counts;
}

function isYaochuhai(tile: Tile): boolean {
  if (tile.length === 1) return true;
  const num = parseInt(tile[0]);
  return num === 1 || num === 9;
}

function isValueTile(tile: Tile, bakazeTile?: string | null, jikazeTile?: string | null): boolean {
  if (tile === '白' || tile === '發' || tile === '中') return true;
  if (bakazeTile && tile === bakazeTile) return true;
  if (jikazeTile && tile === jikazeTile) return true;
  return false;
}

function isYakuhai(tile: Tile, bakaze?: string, jikaze?: string): boolean {
  if (tile === '白' || tile === '發' || tile === '中') {
    return true;
  }

  if (bakaze && BAKAZE_MAP[bakaze] && tile === BAKAZE_MAP[bakaze]) {
    return true;
  }

  if (jikaze && JIKAZE_MAP[jikaze] && tile === JIKAZE_MAP[jikaze]) {
    return true;
  }

  return false;
}

function serializeCounts(counts: Record<string, number>): string {
  return Object.keys(counts)
    .sort((a, b) => TILE_ORDER[a] - TILE_ORDER[b])
    .map(key => `${key}:${counts[key]}`)
    .join('|');
}

function generateMeldCombinations(
  counts: Record<string, number>,
  memo: Map<string, Meld[][]> = new Map()
): Meld[][] {
  const remainingTiles = Object.values(counts).reduce((sum, c) => sum + c, 0);
  if (remainingTiles === 0) return [[]];

  const memoKey = serializeCounts(counts);
  if (memo.has(memoKey)) {
    return memo.get(memoKey)!;
  }

  const tiles = Object.keys(counts)
    .filter(tile => counts[tile] > 0)
    .sort((a, b) => TILE_ORDER[a] - TILE_ORDER[b]);

  const targetTile = tiles[0];
  const results: Meld[][] = [];

  // 刻子
  if (counts[targetTile] >= 3) {
    const updated = { ...counts, [targetTile]: counts[targetTile] - 3 };
    generateMeldCombinations(updated, memo).forEach(melds => {
      results.push([{ type: 'koutsu', tiles: [targetTile, targetTile, targetTile] }, ...melds]);
    });
  }

  // 順子
  const [num, suit] = parseTile(targetTile);
  if (num && suit && num <= 7) {
    const tile2 = `${num + 1}${suit}`;
    const tile3 = `${num + 2}${suit}`;
    if ((counts[tile2] || 0) > 0 && (counts[tile3] || 0) > 0) {
      const updated = { ...counts };
      updated[targetTile]--;
      updated[tile2]--;
      updated[tile3]--;
      generateMeldCombinations(updated, memo).forEach(melds => {
        results.push([{ type: 'shuntsu', tiles: [targetTile, tile2, tile3] }, ...melds]);
      });
    }
  }

  memo.set(memoKey, results);
  return results;
}

function serializeHandShape(shape: HandShape): string {
  const meldKey = shape.melds
    .map(m => `${m.type}:${sortHand(m.tiles).join(',')}`)
    .sort()
    .join('|');
  return `${shape.pair}|${meldKey}`;
}

function buildHandShapes(hand: Tile[]): HandShape[] {
  const counts = countTiles(hand);
  const shapes: HandShape[] = [];
  const seen = new Set<string>();

  Object.keys(counts).forEach(tile => {
    if (counts[tile] >= 2) {
      const remaining = { ...counts, [tile]: counts[tile] - 2 };
      const meldOptions = generateMeldCombinations(remaining);
      meldOptions.forEach(melds => {
        const shape: HandShape = { pair: tile, melds };
        const key = serializeHandShape(shape);
        if (!seen.has(key)) {
          seen.add(key);
          shapes.push(shape);
        }
      });
    }
  });

  return shapes;
}

function getMentsuPatterns(hand: Tile[]): MentsuPattern[] {
  return buildHandShapes(hand).map(shape => ({
    jantou: shape.pair,
    mentsu: shape.melds.map(meld => [...meld.tiles])
  }));
}

function isShuntsu(tiles: Tile[]): boolean {
  if (tiles.length !== 3) return false;
  const sorted = sortHand(tiles);
  const [num1, suit1] = parseTile(sorted[0]);
  const [num2, suit2] = parseTile(sorted[1]);
  const [num3, suit3] = parseTile(sorted[2]);

  if (num1 === null || num2 === null || num3 === null) return false;
  if (suit1 !== suit2 || suit2 !== suit3) return false;

  return num2 === num1 + 1 && num3 === num2 + 1;
}

function isRyanmenWait(
  hand: Tile[],
  winningTile: Tile,
  targetPattern?: MentsuPattern
): boolean {
  const patterns = targetPattern ? [targetPattern] : getMentsuPatterns(hand);
  return patterns.some(pattern => isRyanmenWaitForPattern(pattern, winningTile));
}

function isRyanmenWaitForPattern(pattern: MentsuPattern, winningTile: Tile): boolean {
  if (pattern.jantou === winningTile) return false;

  const targetMentsu = pattern.mentsu.find(mentsu => mentsu.includes(winningTile));
  if (!targetMentsu || targetMentsu.length !== 3) {
    return false;
  }

  if (!isShuntsu(targetMentsu)) {
    return false;
  }

  const sorted = sortHand(targetMentsu);
  const isLowest = winningTile === sorted[0];
  const isHighest = winningTile === sorted[2];

  if (!isLowest && !isHighest) {
    return false;
  }

  const [firstNum] = parseTile(sorted[0]);
  const [thirdNum] = parseTile(sorted[2]);

  if (firstNum === null || thirdNum === null) {
    return false;
  }

  if ((isHighest && firstNum === 1) || (isLowest && thirdNum === 9)) {
    return false;
  }

  return true;
}

function checkMentsu(tiles: Record<string, number>, count: number): boolean {
  if (count === 0) {
    return Object.values(tiles).every(c => c === 0);
  }

  // 刻子チェック
  for (let tile in tiles) {
    if (tiles[tile] >= 3) {
      const remaining = {...tiles};
      remaining[tile] -= 3;
      if (checkMentsu(remaining, count - 1)) {
        return true;
      }
    }
  }

  // 順子チェック
  for (let tile in tiles) {
    if (tiles[tile] > 0) {
      const [num, suit] = parseTile(tile);
      if (num && num <= 7) {
        const tile2 = `${num + 1}${suit}`;
        const tile3 = `${num + 2}${suit}`;
        if (tiles[tile2] > 0 && tiles[tile3] > 0) {
          const remaining = {...tiles};
          remaining[tile]--;
          remaining[tile2]--;
          remaining[tile3]--;
          if (checkMentsu(remaining, count - 1)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

function checkNormalWinningHand(tileCounts: Record<string, number>): boolean {
  // 雀頭を選択
  for (let tile in tileCounts) {
    if (tileCounts[tile] >= 2) {
      const remaining = {...tileCounts};
      remaining[tile] -= 2;
      if (checkMentsu(remaining, 4)) {
        return true;
      }
    }
  }
  return false;
}

export function isWinningHand(hand: Tile[]): boolean {
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  // 七対子チェック
  const pairs = Object.values(tileCounts).filter(count => count === 2);
  if (pairs.length === 7) return true;

  // 国士無双チェック
  const yaochuhai = ['1m', '9m', '1p', '9p', '1s', '9s', '東', '南', '西', '北', '白', '發', '中'];
  const hasAllYaochuhai = yaochuhai.every(tile => tileCounts[tile] >= 1);
  if (hasAllYaochuhai) return true;

  // 通常の和了形チェック
  return checkNormalWinningHand(tileCounts);
}

function isTanyao(hand: Tile[]): boolean {
  return hand.every(tile => {
    if (tile.length === 2) {
      const num = parseInt(tile[0]);
      return num >= 2 && num <= 8;
    }
    return false;
  });
}

function isPinfu(hand: Tile[], winningTile: Tile, isMenzen: boolean, bakaze?: string, jikaze?: string): boolean {
  if (!isMenzen) return false;

  const patterns = getMentsuPatterns(hand);
  if (patterns.length === 0) {
    return false;
  }

  return patterns.some(pattern => {
    const hasOnlyShuntsu = pattern.mentsu.every(mentsu => isShuntsu(mentsu));
    if (!hasOnlyShuntsu) {
      return false;
    }

    if (isYakuhai(pattern.jantou, bakaze, jikaze)) {
      return false;
    }

    return isRyanmenWait(hand, winningTile, pattern);
  });
}

function detectYakuhai(hand: Tile[], bakaze: string, jikaze: string): Yaku[] {
  const yaku: Yaku[] = [];
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  // 三元牌
  if (tileCounts['白'] >= 3) yaku.push({ name: '白', han: 1 });
  if (tileCounts['發'] >= 3) yaku.push({ name: '發', han: 1 });
  if (tileCounts['中'] >= 3) yaku.push({ name: '中', han: 1 });

  // 場風と自風
  const bakazeTile = BAKAZE_MAP[bakaze];
  const jikazeTile = JIKAZE_MAP[jikaze];

  // 場風と自風が同じ場合は2翻
  if (bakazeTile === jikazeTile && tileCounts[bakazeTile] >= 3) {
    yaku.push({ name: `場風・自風 ${bakazeTile}`, han: 2 });
  } else {
    // 別々の場合は個別に判定
    if (tileCounts[bakazeTile] >= 3) {
      yaku.push({ name: `場風 ${bakazeTile}`, han: 1 });
    }
    if (tileCounts[jikazeTile] >= 3) {
      yaku.push({ name: `自風 ${jikazeTile}`, han: 1 });
    }
  }

  return yaku;
}

function isToitoihou(hand: Tile[]): boolean {
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  let koutsu = 0;
  for (let tile in tileCounts) {
    if (tileCounts[tile] >= 3) koutsu++;
  }
  return koutsu >= 4;
}

function countAnkou(hand: Tile[]): number {
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  let ankou = 0;
  for (let tile in tileCounts) {
    if (tileCounts[tile] >= 3) ankou++;
  }
  return Math.min(ankou, 3);
}

function isHonroutou(hand: Tile[]): boolean {
  return hand.every(tile => {
    if (tile.length === 1) return true;
    if (tile.length === 2) {
      const num = parseInt(tile[0]);
      return num === 1 || num === 9;
    }
    return false;
  });
}

function isShouSangen(tileCounts: Record<string, number>): boolean {
  let sangenCount = 0;
  let sangenPair = 0;
  ['白', '發', '中'].forEach(tile => {
    if (tileCounts[tile] >= 3) sangenCount++;
    if (tileCounts[tile] === 2) sangenPair++;
  });
  return sangenCount === 2 && sangenPair === 1;
}

function isHonitsu(hand: Tile[]): boolean {
  const suits = new Set<string>();
  let hasJihai = false;

  hand.forEach(tile => {
    if (tile.length === 2) {
      suits.add(tile[1]);
    } else {
      hasJihai = true;
    }
  });

  return suits.size === 1 && hasJihai;
}

function isChinitsu(hand: Tile[]): boolean {
  const suits = new Set<string>();
  hand.forEach(tile => {
    if (tile.length === 2) {
      suits.add(tile[1]);
    }
  });
  return suits.size === 1 && hand.every(tile => tile.length === 2);
}

export function detectYaku(hand: Tile[], winningTile: Tile, options: AgariOptions): Yaku[] {
  const yaku: Yaku[] = [];
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  // リーチ
  if (options.isRiichi) {
    yaku.push({ name: 'リーチ', han: 1 });
    if (options.isIppatsu) {
      yaku.push({ name: '一発', han: 1 });
    }
  }

  // ツモ
  if (options.isTsumo && options.isMenzen) {
    yaku.push({ name: '門前清自摸和', han: 1 });
  }

  // 断么九（タンヤオ）
  if (isTanyao(hand)) {
    yaku.push({ name: '断么九', han: 1 });
  }

  // 平和（ピンフ）
  if (isPinfu(hand, winningTile, options.isMenzen, options.bakaze, options.jikaze)) {
    yaku.push({ name: '平和', han: 1 });
  }

  // 役牌
  const yakuhai = detectYakuhai(hand, options.bakaze, options.jikaze);
  yaku.push(...yakuhai);

  // 七対子
  const pairs = Object.values(tileCounts).filter(count => count === 2);
  if (pairs.length === 7) {
    yaku.push({ name: '七対子', han: 2 });
  }

  // 対々和
  if (isToitoihou(hand)) {
    yaku.push({ name: '対々和', han: 2 });
  }

  // 三暗刻
  const ankou = countAnkou(hand);
  if (ankou === 3) {
    yaku.push({ name: '三暗刻', han: 2 });
  }

  // 混老頭
  if (isHonroutou(hand)) {
    yaku.push({ name: '混老頭', han: 2 });
  }

  // 小三元
  if (isShouSangen(tileCounts)) {
    yaku.push({ name: '小三元', han: 2 });
  }

  // 混一色
  if (isHonitsu(hand)) {
    yaku.push({ name: '混一色', han: 3 });
  }

  // 清一色
  if (isChinitsu(hand)) {
    yaku.push({ name: '清一色', han: 6 });
  }

  return yaku;
}

type WaitPattern = 'ryanmen' | 'shanpon' | 'penchan' | 'kanchan' | 'tanki';

/**
 * 待ち形を手牌の構成から判定する
 */
function detectWaitPattern(shape: HandShape, winningTile: Tile): WaitPattern {
  if (shape.pair === winningTile) {
    return 'tanki';
  }

  const meld = shape.melds.find(m => m.tiles.includes(winningTile));
  if (!meld) return 'tanki';

  if (meld.type === 'koutsu' || meld.type === 'kantsu') {
    return 'shanpon';
  }

  const sorted = sortHand(meld.tiles);
  const [startNum] = parseTile(sorted[0]);
  const [winNum] = parseTile(winningTile);

  if (startNum === null || winNum === null) {
    return 'tanki';
  }

  if (winNum === startNum + 1) {
    return 'kanchan';
  }

  if ((startNum === 1 && winNum === 3) || (startNum === 7 && winNum === 7)) {
    return 'penchan';
  }

  return 'ryanmen';
}

function isPinfuShape(
  shape: HandShape,
  waitPattern: WaitPattern,
  isMenzen: boolean,
  bakazeTile?: string | null,
  jikazeTile?: string | null
): boolean {
  if (!isMenzen) return false;
  if (waitPattern !== 'ryanmen') return false;
  if (isValueTile(shape.pair, bakazeTile, jikazeTile)) return false;
  return shape.melds.every(m => m.type === 'shuntsu');
}

function calculateHeadFu(pair: Tile, bakazeTile?: string | null, jikazeTile?: string | null): number {
  return isValueTile(pair, bakazeTile, jikazeTile) ? 2 : 0;
}

function waitPatternFu(waitPattern: WaitPattern): number {
  return waitPattern === 'penchan' || waitPattern === 'kanchan' || waitPattern === 'tanki' ? 2 : 0;
}

function isMeldConcealed(meld: Meld, winningTile: Tile, isTsumo: boolean, isMenzen: boolean): boolean {
  if (meld.type === 'shuntsu') return true;
  if (!isMenzen) return false;
  if (!isTsumo && meld.tiles.includes(winningTile)) return false;
  return true;
}

function calculateMeldFu(meld: Meld, winningTile: Tile, isTsumo: boolean, isMenzen: boolean): number {
  if (meld.type === 'shuntsu') return 0;

  const concealed = isMeldConcealed(meld, winningTile, isTsumo, isMenzen);
  const yaochu = isYaochuhai(meld.tiles[0]);

  if (meld.type === 'kantsu') {
    if (yaochu) {
      return concealed ? 32 : 16;
    }
    return concealed ? 16 : 8;
  }

  if (yaochu) {
    return concealed ? 8 : 4;
  }
  return concealed ? 4 : 2;
}

export function calculateFu(
  hand: Tile[],
  winningTile: Tile,
  isTsumo: boolean,
  isMenzen: boolean,
  bakaze?: string,
  jikaze?: string
): number {
  const tileCounts = countTiles(hand);

  // 七対子は25符固定
  const pairs = Object.values(tileCounts).filter(count => count === 2);
  if (pairs.length === 7) {
    return 25;
  }

  const bakazeTile = bakaze ? BAKAZE_MAP[bakaze] : null;
  const jikazeTile = jikaze ? JIKAZE_MAP[jikaze] : null;

  const shapes = buildHandShapes(hand);
  if (shapes.length === 0) {
    return 0;
  }

  let bestFu = 0;

  shapes.forEach(shape => {
    const waitPattern = detectWaitPattern(shape, winningTile);
    const pinfuShape = isPinfuShape(shape, waitPattern, isMenzen, bakazeTile, jikazeTile);

    // 平和ツモは20符固定（門前のみ）
    if (isTsumo && pinfuShape) {
      bestFu = Math.max(bestFu, 20);
      return;
    }

    let fu = 20; // 基本符

    if (isTsumo) fu += 2;
    if (!isTsumo && isMenzen) fu += 10;

    fu += calculateHeadFu(shape.pair, bakazeTile, jikazeTile);

    shape.melds.forEach(meld => {
      fu += calculateMeldFu(meld, winningTile, isTsumo, isMenzen);
    });

    fu += waitPatternFu(waitPattern);
    fu = Math.ceil(fu / 10) * 10;

    bestFu = Math.max(bestFu, fu);
  });

  return bestFu;
}

export function calculateFinalScore(han: number, fu: number, isOya: boolean, isTsumo: boolean): string {
  let baseScore: number;

  // 満貫以上
  if (han >= 5) {
    if (han <= 5) baseScore = 2000; // 満貫
    else if (han <= 7) baseScore = 3000; // 跳満
    else if (han <= 10) baseScore = 4000; // 倍満
    else if (han <= 12) baseScore = 6000; // 三倍満
    else baseScore = 8000; // 役満
  } else {
    // 通常計算
    baseScore = fu * Math.pow(2, 2 + han);
  }

  let score: string;
  if (isOya) {
    if (isTsumo) {
      const perPerson = Math.ceil(baseScore * 2 / 100) * 100;
      score = `${perPerson}点オール（合計${perPerson * 3}点）`;
    } else {
      score = `${Math.ceil(baseScore * 6 / 100) * 100}点`;
    }
  } else {
    if (isTsumo) {
      const ko = Math.ceil(baseScore / 100) * 100;
      const oya = Math.ceil(baseScore * 2 / 100) * 100;
      score = `子: ${ko}点、親: ${oya}点（合計${ko * 2 + oya}点）`;
    } else {
      score = `${Math.ceil(baseScore * 4 / 100) * 100}点`;
    }
  }

  return score;
}

export function calculateScore(
  hand: Tile[],
  winningTile: Tile,
  options: AgariOptions
): CalculationResult | { error: string } {
  if (hand.length !== 13) {
    return { error: '手牌は13枚必要です' };
  }

  if (!winningTile) {
    return { error: '和了牌を選択してください' };
  }

  // 和了形チェック
  const fullHand = [...hand, winningTile];
  if (!isWinningHand(fullHand)) {
    return { error: '和了形ではありません' };
  }

  // 役の判定
  const yaku = detectYaku(fullHand, winningTile, options);

  if (yaku.length === 0) {
    return { error: '役がありません' };
  }

  // 翻数計算
  let totalHan = 0;
  yaku.forEach(y => totalHan += y.han);

  // 符計算
  const fu = calculateFu(fullHand, winningTile, options.isTsumo, options.isMenzen, options.bakaze, options.jikaze);

  // 点数計算
  const score = calculateFinalScore(totalHan, fu, options.jikaze === 'ton', options.isTsumo);

  return { han: totalHan, fu, score, yaku };
}
