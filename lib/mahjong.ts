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

function isPinfu(hand: Tile[], winningTile: Tile, isMenzen: boolean): boolean {
  if (!isMenzen) return false;
  const hasJihai = hand.some(tile => tile.length === 1);
  return !hasJihai && isTanyao(hand);
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
  const bakazeMap: Record<string, string> = { ton: '東', nan: '南', sha: '西' };
  const jikazeMap: Record<string, string> = { ton: '東', nan: '南', sha: '西', pei: '北' };
  const bakazeTile = bakazeMap[bakaze];
  const jikazeTile = jikazeMap[jikaze];

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

// メンツ構造を抽出する補助型
interface MentsuSet {
  shuntsu: string[][]; // 順子リスト
  koutsu: string[];    // 刻子リスト
  jantou: string;      // 雀頭
}

// 全てのメンツ組み合わせを取得
function extractAllMentsuSets(tileCounts: Record<string, number>): MentsuSet[] {
  const results: MentsuSet[] = [];
  
  // 雀頭を選択
  for (let jantou in tileCounts) {
    if (tileCounts[jantou] >= 2) {
      const remaining = {...tileCounts};
      remaining[jantou] -= 2;
      
      // 残りのメンツを抽出
      const mentsuCombinations = extractMentsu(remaining, 4);
      for (const combination of mentsuCombinations) {
        results.push({
          shuntsu: combination.shuntsu,
          koutsu: combination.koutsu,
          jantou
        });
      }
    }
  }
  
  return results;
}

// メンツを再帰的に抽出
function extractMentsu(tiles: Record<string, number>, count: number): Array<{shuntsu: string[][], koutsu: string[]}> {
  if (count === 0) {
    const isEmpty = Object.values(tiles).every(c => c === 0);
    return isEmpty ? [{shuntsu: [], koutsu: []}] : [];
  }
  
  const results: Array<{shuntsu: string[][], koutsu: string[]}> = [];
  
  // 刻子を試す
  for (let tile in tiles) {
    if (tiles[tile] >= 3) {
      const remaining = {...tiles};
      remaining[tile] -= 3;
      const subResults = extractMentsu(remaining, count - 1);
      for (const sub of subResults) {
        results.push({
          shuntsu: sub.shuntsu,
          koutsu: [tile, ...sub.koutsu]
        });
      }
    }
  }
  
  // 順子を試す
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
          const subResults = extractMentsu(remaining, count - 1);
          for (const sub of subResults) {
            results.push({
              shuntsu: [[tile, tile2, tile3], ...sub.shuntsu],
              koutsu: sub.koutsu
            });
          }
        }
      }
    }
  }
  
  return results;
}

// 一盃口（イーペーコー）: 同じ順子が2組ある
function isIipeikou(tileCounts: Record<string, number>): boolean {
  const mentsuSets = extractAllMentsuSets(tileCounts);
  
  for (const set of mentsuSets) {
    // 順子が4つある必要がある（二盃口の条件も満たしてしまうので後で優先度を考慮）
    if (set.shuntsu.length < 2) continue;
    
    // 順子を正規化して比較
    const shuntsuStrings = set.shuntsu.map(s => s.join(','));
    const counts: Record<string, number> = {};
    shuntsuStrings.forEach(s => {
      counts[s] = (counts[s] || 0) + 1;
    });
    
    // 同じ順子が2組以上あるかチェック
    if (Object.values(counts).some(c => c >= 2)) {
      return true;
    }
  }
  
  return false;
}

// 二盃口（リャンペーコー）: 一盃口が2組ある（4つの順子が2ペア）
function isRyanpeikou(tileCounts: Record<string, number>): boolean {
  const mentsuSets = extractAllMentsuSets(tileCounts);
  
  for (const set of mentsuSets) {
    // 全て順子である必要がある
    if (set.shuntsu.length !== 4 || set.koutsu.length !== 0) continue;
    
    // 順子を正規化して比較
    const shuntsuStrings = set.shuntsu.map(s => s.join(','));
    const counts: Record<string, number> = {};
    shuntsuStrings.forEach(s => {
      counts[s] = (counts[s] || 0) + 1;
    });
    
    // 2組のペアがあるかチェック（ちょうど2種類の順子が各2つずつ）
    const pairs = Object.values(counts).filter(c => c === 2);
    if (pairs.length === 2) {
      return true;
    }
  }
  
  return false;
}

// 三色同順（サンシキドウジュン）: 3種類の同じ数字の順子が揃う
function isSanshikudoujun(tileCounts: Record<string, number>): boolean {
  const mentsuSets = extractAllMentsuSets(tileCounts);
  
  for (const set of mentsuSets) {
    // 順子が3つ以上必要
    if (set.shuntsu.length < 3) continue;
    
    // 各順子の開始牌の数字を取得
    for (let i = 0; i < set.shuntsu.length; i++) {
      const [num1, suit1] = parseTile(set.shuntsu[i][0]);
      if (!num1 || !suit1) continue;
      
      // 同じ数字で異なるスートの順子を探す
      const suits = new Set([suit1]);
      for (let j = i + 1; j < set.shuntsu.length; j++) {
        const [num2, suit2] = parseTile(set.shuntsu[j][0]);
        if (num2 === num1 && suit2 && suit2 !== suit1) {
          suits.add(suit2);
        }
      }
      
      if (suits.size === 3) {
        return true;
      }
    }
  }
  
  return false;
}

// 一気通貫（イッキツウカン）: 同種の123、456、789の順子が揃う
function isIkkitsuukan(tileCounts: Record<string, number>): boolean {
  const mentsuSets = extractAllMentsuSets(tileCounts);
  
  for (const set of mentsuSets) {
    // 順子が3つ以上必要
    if (set.shuntsu.length < 3) continue;
    
    // 各スートについてチェック
    const suits = ['m', 'p', 's'];
    for (const suit of suits) {
      const has123 = set.shuntsu.some(s => 
        s[0] === `1${suit}` && s[1] === `2${suit}` && s[2] === `3${suit}`
      );
      const has456 = set.shuntsu.some(s => 
        s[0] === `4${suit}` && s[1] === `5${suit}` && s[2] === `6${suit}`
      );
      const has789 = set.shuntsu.some(s => 
        s[0] === `7${suit}` && s[1] === `8${suit}` && s[2] === `9${suit}`
      );
      
      if (has123 && has456 && has789) {
        return true;
      }
    }
  }
  
  return false;
}

// 么九牌（ヤオチュウハイ）かどうか判定
function isYaochuuhai(tile: Tile): boolean {
  if (tile.length === 1) return true; // 字牌
  if (tile.length === 2) {
    const num = parseInt(tile[0]);
    return num === 1 || num === 9;
  }
  return false;
}

// 一九牌（イーチュウハイ）かどうか判定（端牌のみ、字牌は含まない）
function isTerminal(tile: Tile): boolean {
  if (tile.length === 2) {
    const num = parseInt(tile[0]);
    return num === 1 || num === 9;
  }
  return false;
}

// 混全帯么九（チャンタ）: 全ての面子と雀頭に么九牌が含まれる
function isChanta(tileCounts: Record<string, number>): boolean {
  const mentsuSets = extractAllMentsuSets(tileCounts);
  
  for (const set of mentsuSets) {
    // 雀頭が么九牌か
    if (!isYaochuuhai(set.jantou)) continue;
    
    // 全ての刻子が么九牌か
    const allKoutsuValid = set.koutsu.every(tile => isYaochuuhai(tile));
    if (!allKoutsuValid) continue;
    
    // 全ての順子に么九牌が含まれるか（1-2-3 または 7-8-9）
    const allShuntsuValid = set.shuntsu.every(s => {
      const [num] = parseTile(s[0]);
      return num === 1 || num === 7;
    });
    if (!allShuntsuValid) continue;
    
    // 字牌と数牌が混在しているか確認（純チャンでない）
    const hasJihai = [set.jantou, ...set.koutsu].some(tile => tile.length === 1) ||
                      set.shuntsu.length === 0; // 順子がない場合は字牌の存在をチェック
    const hasNumber = [set.jantou, ...set.koutsu].some(tile => tile.length === 2) ||
                      set.shuntsu.length > 0;
    
    if (hasJihai && hasNumber) {
      return true;
    }
  }
  
  return false;
}

// 純全帯么九（ジュンチャン）: 全ての面子と雀頭に一九牌が含まれる（字牌なし）
function isJunchan(tileCounts: Record<string, number>): boolean {
  const mentsuSets = extractAllMentsuSets(tileCounts);
  
  for (const set of mentsuSets) {
    // 字牌が含まれていたら純チャンではない
    const hasJihai = [set.jantou, ...set.koutsu].some(tile => tile.length === 1);
    if (hasJihai) continue;
    
    // 雀頭が一九牌か
    if (!isTerminal(set.jantou)) continue;
    
    // 全ての刻子が一九牌か
    const allKoutsuValid = set.koutsu.every(tile => isTerminal(tile));
    if (!allKoutsuValid) continue;
    
    // 全ての順子に一九牌が含まれるか（1-2-3 または 7-8-9）
    const allShuntsuValid = set.shuntsu.every(s => {
      const [num] = parseTile(s[0]);
      return num === 1 || num === 7;
    });
    
    if (allShuntsuValid) {
      return true;
    }
  }
  
  return false;
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
  if (isPinfu(hand, winningTile, options.isMenzen)) {
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

  // 二盃口（リャンペーコー）- 七対子より優先度が高い
  if (pairs.length !== 7 && isRyanpeikou(tileCounts)) {
    yaku.push({ name: '二盃口', han: 3 });
  }

  // 一盃口（イーペーコー）- 二盃口がある場合は除外
  if (pairs.length !== 7 && !isRyanpeikou(tileCounts) && isIipeikou(tileCounts)) {
    yaku.push({ name: '一盃口', han: 1 });
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

  // 純全帯么九（ジュンチャン）
  if (isJunchan(tileCounts)) {
    yaku.push({ name: '純全帯么九', han: 3 });
  }

  // 混全帯么九（チャンタ）- 純チャンがある場合は除外
  if (!isJunchan(tileCounts) && isChanta(tileCounts)) {
    yaku.push({ name: '混全帯么九', han: 2 });
  }

  // 一気通貫（イッキツウカン）
  if (isIkkitsuukan(tileCounts)) {
    yaku.push({ name: '一気通貫', han: 2 });
  }

  // 三色同順（サンシキドウジュン）
  if (isSanshikudoujun(tileCounts)) {
    yaku.push({ name: '三色同順', han: 2 });
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

export function calculateFu(hand: Tile[], winningTile: Tile, isTsumo: boolean, isMenzen: boolean): number {
  let fu = 20; // 基本符

  // ツモ符
  if (isTsumo) fu += 2;

  // 門前ロン符
  if (!isTsumo && isMenzen) fu += 10;

  // 雀頭符
  const tileCounts: Record<string, number> = {};
  hand.forEach(tile => {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });

  // 役牌雀頭
  if (tileCounts['白'] === 2 || tileCounts['發'] === 2 || tileCounts['中'] === 2) {
    fu += 2;
  }

  // 刻子符
  for (let tile in tileCounts) {
    if (tileCounts[tile] >= 3) {
      const isYaochuhai = tile.length === 1 || tile[0] === '1' || tile[0] === '9';
      const isAnkou = true; // 簡易判定
      if (isYaochuhai) {
        fu += isAnkou ? 8 : 4;
      } else {
        fu += isAnkou ? 4 : 2;
      }
    }
  }

  // 待ち符（簡易的に辺張、嵌張、単騎の場合+2）
  fu += 2;

  // 符の繰り上げ（10符単位）
  fu = Math.ceil(fu / 10) * 10;

  // 平和ツモは20符固定
  if (isTsumo && isMenzen && fu === 20) {
    return 20;
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
  const fu = calculateFu(fullHand, winningTile, options.isTsumo, options.isMenzen);

  // 点数計算
  const score = calculateFinalScore(totalHan, fu, options.jikaze === 'ton', options.isTsumo);

  return { han: totalHan, fu, score, yaku };
}
