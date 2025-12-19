export type Tile = string;

export type MeldType = 'chii' | 'pon' | 'minkan' | 'ankan';

export interface Meld {
  type: MeldType;
  tiles: Tile[];
}

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
  melds?: Meld[];
  isTenhou?: boolean;
  isChiihou?: boolean;
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

function checkNormalWinningHand(tileCounts: Record<string, number>, requiredMentsu: number = 4): boolean {
  // 雀頭を選択
  for (let tile in tileCounts) {
    if (tileCounts[tile] >= 2) {
      const remaining = {...tileCounts};
      remaining[tile] -= 2;
      if (checkMentsu(remaining, requiredMentsu)) {
        return true;
      }
    }
  }
  return false;
}

export function isWinningHand(hand: Tile[], melds?: Meld[]): boolean {
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  const meldCount = melds?.length || 0;
  const hasMelds = meldCount > 0;

  // 七対子チェック（鳴きがある場合は不可）
  if (!hasMelds) {
    const pairs = Object.values(tileCounts).filter(count => count === 2);
    if (pairs.length === 7) return true;
  }

  // 国士無双チェック（鳴きがある場合は不可）
  if (!hasMelds) {
    const yaochuhai = ['1m', '9m', '1p', '9p', '1s', '9s', '東', '南', '西', '北', '白', '發', '中'];
    const hasAllYaochuhai = yaochuhai.every(tile => tileCounts[tile] >= 1);
    if (hasAllYaochuhai) return true;
  }

  // 通常の和了形チェック（鳴きの数に応じて必要な面子数を減らす）
  const requiredMentsu = 4 - meldCount;
  return checkNormalWinningHand(tileCounts, requiredMentsu);
}

function isTanyao(hand: Tile[], melds?: Meld[]): boolean {
  const allTiles = [...hand];
  melds?.forEach(meld => allTiles.push(...meld.tiles));

  return allTiles.every(tile => {
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

function detectYakuhai(hand: Tile[], bakaze: string, jikaze: string, melds?: Meld[]): Yaku[] {
  const yaku: Yaku[] = [];
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  // 鳴きの牌も含める
  melds?.forEach(meld => {
    meld.tiles.forEach(tile => {
      tileCounts[tile] = (tileCounts[tile] || 0) + 1;
    });
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

function isToitoihou(hand: Tile[], melds?: Meld[]): boolean {
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  let koutsu = 0;
  for (let tile in tileCounts) {
    if (tileCounts[tile] >= 3) koutsu++;
  }

  // 鳴きの刻子もカウント
  melds?.forEach(meld => {
    if (meld.type === 'pon' || meld.type === 'minkan' || meld.type === 'ankan') {
      koutsu++;
    }
  });

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

function isHonroutou(hand: Tile[], melds?: Meld[]): boolean {
  const allTiles = [...hand];
  melds?.forEach(meld => allTiles.push(...meld.tiles));

  return allTiles.every(tile => {
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

function isHonitsu(hand: Tile[], melds?: Meld[]): boolean {
  const suits = new Set<string>();
  let hasJihai = false;

  const allTiles = [...hand];
  melds?.forEach(meld => allTiles.push(...meld.tiles));

  allTiles.forEach(tile => {
    if (tile.length === 2) {
      suits.add(tile[1]);
    } else {
      hasJihai = true;
    }
  });

  return suits.size === 1 && hasJihai;
}

function isChinitsu(hand: Tile[], melds?: Meld[]): boolean {
  const suits = new Set<string>();
  const allTiles = [...hand];
  melds?.forEach(meld => allTiles.push(...meld.tiles));

  allTiles.forEach(tile => {
    if (tile.length === 2) {
      suits.add(tile[1]);
    }
  });
  return suits.size === 1 && allTiles.every(tile => tile.length === 2);
}

// ========== 役満検出関数 ==========

/**
 * 国士無双（Kokushi Musou）- 13翻
 * 13種類のヤオチュー牌（1,9,字牌）がすべて1枚ずつ+いずれか1枚がダブり
 */
function isKokushi(hand: Tile[], melds?: Meld[]): boolean {
  // 鳴きがある場合は不可
  if (melds && melds.length > 0) return false;

  const yaochuhai = ['1m', '9m', '1p', '9p', '1s', '9s', '東', '南', '西', '北', '白', '發', '中'];
  const tileCounts: Record<string, number> = {};

  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  // すべてのヤオチュー牌が1枚以上あることを確認
  const hasAllYaochuhai = yaochuhai.every(tile => tileCounts[tile] >= 1);
  if (!hasAllYaochuhai) return false;

  // ヤオチュー牌以外がないことを確認
  const hasOnlyYaochuhai = Object.keys(tileCounts).every(tile => yaochuhai.includes(tile));
  return hasOnlyYaochuhai;
}

/**
 * 四暗刻（Suu Ankou）- 13翻
 * 4つの暗刻（門前で作った刻子）+ 雀頭
 */
function isSuuankou(hand: Tile[], winningTile: Tile, isTsumo: boolean, melds?: Meld[]): boolean {
  // 鳴きがある場合は不可
  if (melds && melds.length > 0) return false;

  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  // ロンの場合は和了牌を含む刻子はカウントしない（四暗刻単騎のみ可）
  if (!isTsumo && tileCounts[winningTile] === 3) {
    return false;
  }

  // 刻子の数をカウント
  const koutsuCount = Object.values(tileCounts).filter(count => count >= 3).length;
  return koutsuCount === 4;
}

/**
 * 大三元（Daisangen）- 13翻
 * 白、發、中の3種類すべてが刻子
 */
function isDaisangen(hand: Tile[], melds?: Meld[]): boolean {
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  // 鳴きの牌も含める
  melds?.forEach(meld => {
    meld.tiles.forEach(tile => {
      tileCounts[tile] = (tileCounts[tile] || 0) + 1;
    });
  });

  return tileCounts['白'] >= 3 && tileCounts['發'] >= 3 && tileCounts['中'] >= 3;
}

/**
 * 字一色（Tsuuiisou）- 13翻
 * 字牌のみで構成
 */
function isTsuuiisou(hand: Tile[], melds?: Meld[]): boolean {
  const allTiles = [...hand];
  melds?.forEach(meld => allTiles.push(...meld.tiles));

  return allTiles.every(tile => tile.length === 1);
}

/**
 * 緑一色（Ryuuiisou）- 13翻
 * 2,3,4,6,8索と發のみで構成
 */
function isRyuuiisou(hand: Tile[], melds?: Meld[]): boolean {
  const greenTiles = ['2s', '3s', '4s', '6s', '8s', '發'];
  const allTiles = [...hand];
  melds?.forEach(meld => allTiles.push(...meld.tiles));

  return allTiles.every(tile => greenTiles.includes(tile));
}

/**
 * 清老頭（Chinroutou）- 13翻
 * 1と9のみで構成
 */
function isChinroutou(hand: Tile[], melds?: Meld[]): boolean {
  const allTiles = [...hand];
  melds?.forEach(meld => allTiles.push(...meld.tiles));

  return allTiles.every(tile => {
    if (tile.length === 2) {
      const num = parseInt(tile[0]);
      return num === 1 || num === 9;
    }
    return false;
  });
}

/**
 * 九蓮宝燈（Chuuren Poutou）- 13翻
 * 門前で1つの色、1112345678999の形+同色の任意の1枚
 */
function isChuurenPoutou(hand: Tile[], melds?: Meld[]): boolean {
  // 鳴きがある場合は不可
  if (melds && melds.length > 0) return false;

  // 清一色であることを確認
  if (!isChinitsu(hand, melds)) return false;

  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  // 使用されている色を取得
  const suit = hand[0][1];

  // 1112345678999の形をチェック
  const expectedPattern: Record<string, number> = {
    [`1${suit}`]: 3,
    [`2${suit}`]: 1,
    [`3${suit}`]: 1,
    [`4${suit}`]: 1,
    [`5${suit}`]: 1,
    [`6${suit}`]: 1,
    [`7${suit}`]: 1,
    [`8${suit}`]: 1,
    [`9${suit}`]: 3
  };

  // 1つの牌だけが+1枚になっているかチェック
  let extraCount = 0;
  for (let i = 1; i <= 9; i++) {
    const tile = `${i}${suit}`;
    const expected = expectedPattern[tile];
    const actual = tileCounts[tile] || 0;

    if (actual < expected) return false;
    if (actual > expected) {
      extraCount += actual - expected;
    }
  }

  return extraCount === 1;
}

/**
 * 小四喜（Shousuushii）- 13翻
 * 4種の風牌のうち3つが刻子、1つが雀頭
 */
function isShousuushii(hand: Tile[], melds?: Meld[]): boolean {
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  // 鳴きの牌も含める
  melds?.forEach(meld => {
    meld.tiles.forEach(tile => {
      tileCounts[tile] = (tileCounts[tile] || 0) + 1;
    });
  });

  const winds = ['東', '南', '西', '北'];
  let koutsuCount = 0;
  let pairCount = 0;

  winds.forEach(wind => {
    if (tileCounts[wind] >= 3) koutsuCount++;
    if (tileCounts[wind] === 2) pairCount++;
  });

  return koutsuCount === 3 && pairCount === 1;
}

/**
 * 大四喜（Daisuushii）- 26翻（ダブル役満）
 * 4種の風牌すべてが刻子
 */
function isDaisuushii(hand: Tile[], melds?: Meld[]): boolean {
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  // 鳴きの牌も含める
  melds?.forEach(meld => {
    meld.tiles.forEach(tile => {
      tileCounts[tile] = (tileCounts[tile] || 0) + 1;
    });
  });

  const winds = ['東', '南', '西', '北'];
  return winds.every(wind => tileCounts[wind] >= 3);
}

export function detectYaku(hand: Tile[], winningTile: Tile, options: AgariOptions): Yaku[] {
  const yaku: Yaku[] = [];
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  const melds = options.melds || [];
  const hasMelds = melds.length > 0;

  // ========== 役満チェック（優先） ==========

  // 天和（親の配牌時和了）- 13翻
  if (options.isTenhou) {
    yaku.push({ name: '天和', han: 13 });
    return yaku;
  }

  // 地和（子の第一ツモ和了）- 13翻
  if (options.isChiihou) {
    yaku.push({ name: '地和', han: 13 });
    return yaku;
  }

  // 大四喜（ダブル役満）- 26翻
  if (isDaisuushii(hand, melds)) {
    yaku.push({ name: '大四喜', han: 26 });
    return yaku;
  }

  // 国士無双 - 13翻
  if (isKokushi(hand, melds)) {
    yaku.push({ name: '国士無双', han: 13 });
    return yaku;
  }

  // 四暗刻 - 13翻
  if (isSuuankou(hand, winningTile, options.isTsumo, melds)) {
    yaku.push({ name: '四暗刻', han: 13 });
    return yaku;
  }

  // 大三元 - 13翻
  if (isDaisangen(hand, melds)) {
    yaku.push({ name: '大三元', han: 13 });
    return yaku;
  }

  // 字一色 - 13翻
  if (isTsuuiisou(hand, melds)) {
    yaku.push({ name: '字一色', han: 13 });
    return yaku;
  }

  // 緑一色 - 13翻
  if (isRyuuiisou(hand, melds)) {
    yaku.push({ name: '緑一色', han: 13 });
    return yaku;
  }

  // 清老頭 - 13翻
  if (isChinroutou(hand, melds)) {
    yaku.push({ name: '清老頭', han: 13 });
    return yaku;
  }

  // 九蓮宝燈 - 13翻
  if (isChuurenPoutou(hand, melds)) {
    yaku.push({ name: '九蓮宝燈', han: 13 });
    return yaku;
  }

  // 小四喜 - 13翻
  if (isShousuushii(hand, melds)) {
    yaku.push({ name: '小四喜', han: 13 });
    return yaku;
  }

  // ========== 通常役のチェック ==========

  // リーチ（門前のみ）
  if (options.isRiichi && !hasMelds) {
    yaku.push({ name: 'リーチ', han: 1 });
    if (options.isIppatsu) {
      yaku.push({ name: '一発', han: 1 });
    }
  }

  // ツモ（門前のみ）
  if (options.isTsumo && options.isMenzen && !hasMelds) {
    yaku.push({ name: '門前清自摸和', han: 1 });
  }

  // 断么九（タンヤオ）
  if (isTanyao(hand, melds)) {
    yaku.push({ name: '断么九', han: 1 });
  }

  // 平和（ピンフ）- 門前のみ
  if (isPinfu(hand, winningTile, options.isMenzen, options.bakaze, options.jikaze) && !hasMelds) {
    yaku.push({ name: '平和', han: 1 });
  }


  // 役牌
  const yakuhai = detectYakuhai(hand, options.bakaze, options.jikaze, melds);
  yaku.push(...yakuhai);

  // 七対子（鳴きがある場合は不可）
  if (!hasMelds) {
    const pairs = Object.values(tileCounts).filter(count => count === 2);
    if (pairs.length === 7) {
      yaku.push({ name: '七対子', han: 2 });
    }
  }

  // 対々和
  if (isToitoihou(hand, melds)) {
    yaku.push({ name: '対々和', han: 2 });
  }

  // 三暗刻
  const ankou = countAnkou(hand);
  if (ankou === 3) {
    yaku.push({ name: '三暗刻', han: 2 });
  }

  // 混老頭
  if (isHonroutou(hand, melds)) {
    yaku.push({ name: '混老頭', han: 2 });
  }

  // 小三元
  if (isShouSangen(tileCounts)) {
    yaku.push({ name: '小三元', han: 2 });
  }

  // 混一色（鳴きがある場合は2翻）
  if (isHonitsu(hand, melds)) {
    yaku.push({ name: '混一色', han: hasMelds ? 2 : 3 });
  }

  // 清一色（鳴きがある場合は5翻）
  if (isChinitsu(hand, melds)) {
    yaku.push({ name: '清一色', han: hasMelds ? 5 : 6 });
  }

  return yaku;
}

type WaitPattern = 'ryanmen' | 'shanpon' | 'penchan' | 'kanchan' | 'tanki';

/**
 * 待ち形を検出する
 */
function detectWaitPattern(hand: Tile[], winningTile: Tile): WaitPattern {
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  // 単騎待ち（雀頭になる待ち）
  if (tileCounts[winningTile] === 2) {
    return 'tanki';
  }

  // 双碰待ち（刻子になる待ち）
  if (tileCounts[winningTile] === 3) {
    return 'shanpon';
  }

  // 数牌の待ち形判定
  const [num, suit] = parseTile(winningTile);
  if (num && suit) {
    const tile1 = `${num - 2}${suit}`;
    const tile2 = `${num - 1}${suit}`;
    const tile3 = `${num + 1}${suit}`;
    const tile4 = `${num + 2}${suit}`;

    // 辺張待ち
    if (num === 3 && tileCounts[tile2] >= 1 && tileCounts[`${num - 2}${suit}`] >= 1) {
      return 'penchan';
    }
    if (num === 7 && tileCounts[tile3] >= 1 && tileCounts[tile4] >= 1) {
      return 'penchan';
    }

    // 嵌張待ち
    if (num >= 2 && num <= 8) {
      if (tileCounts[tile2] >= 1 && tileCounts[tile3] >= 1) {
        // 中央の牌を引いた場合は嵌張の可能性
        const hasSequence = (tileCounts[tile2] >= 1 && tileCounts[tile3] >= 1);
        const hasRyanmen =
          (num >= 3 && tileCounts[`${num - 2}${suit}`] >= 1 && tileCounts[tile2] >= 1) ||
          (num <= 7 && tileCounts[tile3] >= 1 && tileCounts[`${num + 2}${suit}`] >= 1);

        if (hasSequence && !hasRyanmen) {
          return 'kanchan';
        }
      }
    }

    // 両面待ち（デフォルト）
    return 'ryanmen';
  }

  // 字牌の場合はタンキかシャンポン
  return 'tanki';
}

/**
 * 暗刻を検出する（和了牌を考慮）
 */
function getConcealedTriplets(hand: Tile[], winningTile: Tile, isTsumo: boolean): Set<string> {
  const tileCounts: Record<string, number> = {};
  const handWithoutWinning = hand.filter(t => t !== winningTile);

  // 和了牌を除いた手牌をカウント
  handWithoutWinning.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  const concealedTriplets = new Set<string>();

  for (let tile in tileCounts) {
    // ツモの場合、すべての3枚以上の組は暗刻
    if (isTsumo && tileCounts[tile] >= 3) {
      concealedTriplets.add(tile);
    }
    // ロンの場合、和了牌を含まない3枚の組のみ暗刻
    else if (!isTsumo) {
      if (tile === winningTile) {
        // 和了牌が4枚ある場合は暗槓
        if (tileCounts[tile] === 3) {
          concealedTriplets.add(tile);
        }
        // 和了牌が含まれる刻子は明刻扱い（暗刻に含めない）
      } else if (tileCounts[tile] >= 3) {
        concealedTriplets.add(tile);
      }
    }
  }

  return concealedTriplets;
}

export function calculateFu(
  hand: Tile[],
  winningTile: Tile,
  isTsumo: boolean,
  isMenzen: boolean,
  bakaze?: string,
  jikaze?: string,
  melds?: Meld[]
): number {
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  // 七対子は25符固定
  const pairs = Object.values(tileCounts).filter(count => count === 2);
  if (pairs.length === 7) {
    return 25;
  }

  // 平和ツモは20符固定
  if (isTsumo && isMenzen && isPinfu(hand, winningTile, isMenzen, bakaze, jikaze)) {
    return 20;
  }

  let fu = 20; // 基本符

  // ツモ符
  if (isTsumo) fu += 2;

  // 門前ロン符（鳴きがない場合のみ）
  const hasMelds = (melds?.length || 0) > 0;
  if (!isTsumo && isMenzen && !hasMelds) fu += 10;

  // 雀頭符（役牌雀頭）
  const bakazeMap: Record<string, string> = { ton: '東', nan: '南', sha: '西', pei: '北' };
  const jikazeMap: Record<string, string> = { ton: '東', nan: '南', sha: '西', pei: '北' };
  const bakazeTile = bakaze ? bakazeMap[bakaze] : null;
  const jikazeTile = jikaze ? jikazeMap[jikaze] : null;

  for (let tile in tileCounts) {
    if (tileCounts[tile] === 2) {
      // 三元牌
      if (tile === '白' || tile === '發' || tile === '中') {
        fu += 2;
      }
      // 場風
      else if (bakazeTile && tile === bakazeTile) {
        fu += 2;
      }
      // 自風
      else if (jikazeTile && tile === jikazeTile) {
        fu += 2;
      }
    }
  }

  // 刻子符（手牌の中の刻子）
  const concealedTriplets = getConcealedTriplets(hand, winningTile, isTsumo);

  for (let tile in tileCounts) {
    if (tileCounts[tile] >= 3) {
      const isYaochuhai = tile.length === 1 || tile[0] === '1' || tile[0] === '9';
      const isConcealed = concealedTriplets.has(tile);

      // 槓子の場合
      if (tileCounts[tile] === 4) {
        if (isYaochuhai) {
          fu += isConcealed ? 32 : 16;
        } else {
          fu += isConcealed ? 16 : 8;
        }
      }
      // 刻子の場合
      else {
        if (isYaochuhai) {
          fu += isConcealed ? 8 : 4;
        } else {
          fu += isConcealed ? 4 : 2;
        }
      }
    }
  }

  // 鳴きの符
  melds?.forEach(meld => {
    const tile = meld.tiles[0];
    const isYaochuhai = tile.length === 1 || tile[0] === '1' || tile[0] === '9';

    if (meld.type === 'pon') {
      // 明刻
      fu += isYaochuhai ? 4 : 2;
    } else if (meld.type === 'minkan') {
      // 明槓
      fu += isYaochuhai ? 16 : 8;
    } else if (meld.type === 'ankan') {
      // 暗槓
      fu += isYaochuhai ? 32 : 16;
    }
    // chiiは符なし
  });

  // 待ち形符
  const waitPattern = detectWaitPattern(hand, winningTile);
  if (waitPattern === 'penchan' || waitPattern === 'kanchan' || waitPattern === 'tanki') {
    fu += 2;
  }

  // 符の繰り上げ（10符単位）
  fu = Math.ceil(fu / 10) * 10;

  // 鳴きがある場合は最低30符
  if (hasMelds && fu < 30) {
    fu = 30;
  }

  return fu;
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
  const melds = options.melds || [];
  const meldTileCount = melds.reduce((sum, meld) => sum + meld.tiles.length, 0);
  const expectedHandSize = 14 - meldTileCount;

  if (hand.length !== expectedHandSize - 1) {
    return { error: `手牌は${expectedHandSize - 1}枚必要です（鳴き${melds.length}回）` };
  }

  if (!winningTile) {
    return { error: '和了牌を選択してください' };
  }

  // 和了形チェック
  const fullHand = [...hand, winningTile];
  if (!isWinningHand(fullHand, melds)) {
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
  const fu = calculateFu(fullHand, winningTile, options.isTsumo, options.isMenzen, options.bakaze, options.jikaze, melds);

  // 点数計算
  const score = calculateFinalScore(totalHan, fu, options.jikaze === 'ton', options.isTsumo);

  return { han: totalHan, fu, score, yaku };
}
