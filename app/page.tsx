'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TILES,
  TILE_DISPLAY,
  sortHand,
  calculateScore,
  type Tile,
  type Meld,
  type MeldType,
  type AgariOptions,
  type CalculationResult
} from '@/lib/mahjong';
import Link from 'next/link';
import TileFace from './components/TileFace';
import TileBack from './components/TileBack';
const HONOR_INPUT_MAP: Record<string, Tile> = {
  ton: '東',
  nan: '南',
  sha: '西',
  pei: '北',
  haku: '白',
  hatsu: '發',
  chun: '中'
};

const RED_TILES = [
  { tile: '5m', suit: 'man', label: '赤5m' },
  { tile: '5p', suit: 'pin', label: '赤5p' },
  { tile: '5s', suit: 'sou', label: '赤5s' }
] as const;

type RedSuit = (typeof RED_TILES)[number]['suit'];
type ParsedTile = { num: number; suit: string } | null;

interface HistoryEntry {
  id: string;
  timestamp: number;
  hand: Tile[];
  winningTile: Tile;
  options: AgariOptions;
  result: CalculationResult;
  redHandFlags?: boolean[];
  redMeldFlags?: boolean[][];
  redWinningFlag?: boolean;
}

const HISTORY_KEY = 'mahjong-history';

const getMeldTileCount = (meldList: Meld[]): number =>
  meldList.reduce((sum, meld) => sum + (meld.tiles.length === 4 ? 3 : meld.tiles.length), 0);

const normalizeTileCode = (value: string): Tile | null => {
  const raw = value.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  if (HONOR_INPUT_MAP[lower]) {
    return HONOR_INPUT_MAP[lower];
  }

  const kanaMap: Record<string, Tile> = {
    '東': '東',
    '南': '南',
    '西': '西',
    '北': '北',
    '白': '白',
    '發': '發',
    '中': '中'
  };
  if (kanaMap[raw]) {
    return kanaMap[raw];
  }

  if (/^[1-9][mps]$/i.test(lower)) {
    return `${lower[0]}${lower[1]}` as Tile;
  }

  return null;
};

const cloneOptionsForHistory = (options: AgariOptions): AgariOptions => ({
  ...options,
  melds: options.melds ? options.melds.map(meld => ({ type: meld.type, tiles: [...meld.tiles] })) : undefined,
  doraTiles: options.doraTiles ? [...options.doraTiles] : [],
  uraDoraTiles: options.uraDoraTiles ? [...options.uraDoraTiles] : [],
  redDora: options.redDora ? { ...options.redDora } : undefined,
  kyotaku: options.kyotaku ?? 0,
  honba: options.honba ?? 0,
});

const formatBooleanOption = (value?: boolean) => (value ? 'あり' : 'なし');

const logClientError = (message: string, error: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(message, error);
  }
};

export default function Home() {
  const [hand, setHand] = useState<Tile[]>([]);
  const [winningTile, setWinningTile] = useState<Tile | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string>('');
  const [agariType, setAgariType] = useState<'tsumo' | 'ron'>('tsumo');
  const [bakaze, setBakaze] = useState<string>('ton');
  const [jikaze, setJikaze] = useState<string>('ton');
  const [riichi, setRiichi] = useState<boolean>(false);
  const [isDoubleRiichi, setIsDoubleRiichi] = useState<boolean>(false);
  const [ippatsu, setIppatsu] = useState<boolean>(false);
  const [isDealer, setIsDealer] = useState<boolean>(true);
  const [melds, setMelds] = useState<Meld[]>([]);
  const [meldInput, setMeldInput] = useState<Tile[]>([]);
  const [meldType, setMeldType] = useState<MeldType>('chii');
  const [isTenhou, setIsTenhou] = useState<boolean>(false);
  const [isChiihou, setIsChiihou] = useState<boolean>(false);
  const [isHaitei, setIsHaitei] = useState<boolean>(false);
  const [isHoutei, setIsHoutei] = useState<boolean>(false);
  const [isRinshan, setIsRinshan] = useState<boolean>(false);
  const [isChankan, setIsChankan] = useState<boolean>(false);
  const [isNagashiMangan, setIsNagashiMangan] = useState<boolean>(false);
  const [doraTiles, setDoraTiles] = useState<Tile[]>([]);
  const [uraDoraTiles, setUraDoraTiles] = useState<Tile[]>([]);
  const [kyotakuCount, setKyotakuCount] = useState<number>(0);
  const [honbaCount, setHonbaCount] = useState<number>(0);
  const [tileSelectMode, setTileSelectMode] = useState<'hand' | 'meld' | 'dora' | 'ura'>('hand');
  const [redHandFlags, setRedHandFlags] = useState<boolean[]>([]);
  const [redMeldInputFlags, setRedMeldInputFlags] = useState<boolean[]>([]);
  const [redMeldFlags, setRedMeldFlags] = useState<boolean[][]>([]);
  const [redWinningFlag, setRedWinningFlag] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'hand' | 'options' | 'result'>('hand');
  const [activeInfoTab, setActiveInfoTab] = useState<'hand' | 'options' | 'result'>('hand');

  const getAllSelectedTiles = (options?: { includeWinningTile?: boolean }) => {
    const tiles: Tile[] = [...hand];
    melds.forEach(meld => tiles.push(...meld.tiles));
    tiles.push(...meldInput);
    if (winningTile && options?.includeWinningTile !== false) {
      tiles.push(winningTile);
    }
    return tiles;
  };

  const getTileCount = (tile: Tile, options?: { includeWinningTile?: boolean }) =>
    getAllSelectedTiles(options).filter(t => t === tile).length;

  const parseTile = (tile: Tile): ParsedTile => {
    if (tile.length !== 2) return null;
    const num = parseInt(tile[0], 10);
    if (Number.isNaN(num)) return null;
    return { num, suit: tile[1] };
  };

  const isValidMeld = (type: MeldType, tiles: Tile[]) => {
    if (type === 'pon') {
      return tiles.length === 3 && tiles.every(tile => tile === tiles[0]);
    }
    if (type === 'minkan' || type === 'ankan') {
      return tiles.length === 4 && tiles.every(tile => tile === tiles[0]);
    }
    if (type !== 'chii') return false;
    if (tiles.length !== 3) return false;
    const parsed = tiles.map(parseTile);
    if (parsed.some(item => !item)) return false;
    const suits = new Set(parsed.map(item => item!.suit));
    if (suits.size !== 1) return false;
    const numbers = parsed.map(item => item!.num).sort((a, b) => a - b);
    return numbers[0] + 1 === numbers[1] && numbers[1] + 1 === numbers[2];
  };

  const sortHandWithFlags = (tiles: Tile[], flags: boolean[]) => {
    const combined = tiles.map((tile, index) => ({ tile, isRed: flags[index] ?? false }));
    const sortedTiles = sortHand(tiles);
    const used = new Array(combined.length).fill(false);
    const sortedFlags: boolean[] = [];

    sortedTiles.forEach(tile => {
      const matchIndex = combined.findIndex((item, index) => !used[index] && item.tile === tile);
      if (matchIndex >= 0) {
        used[matchIndex] = true;
        sortedFlags.push(combined[matchIndex].isRed);
      } else {
        sortedFlags.push(false);
      }
    });

    return { tiles: sortedTiles, flags: sortedFlags };
  };

  const hasRedSelection = useCallback((suit: RedSuit) => {
    const targetTile: Tile = suit === 'man' ? '5m' : suit === 'pin' ? '5p' : '5s';
    const inHand = redHandFlags.some((isRed, index) => isRed && hand[index] === targetTile);
    const inWinning = redWinningFlag && winningTile === targetTile;
    const inMeldInput = redMeldInputFlags.some((isRed, index) => isRed && meldInput[index] === targetTile);
    const inMelds = redMeldFlags.some((flags, meldIndex) =>
      flags?.some((isRed, tileIndex) => isRed && melds[meldIndex]?.tiles[tileIndex] === targetTile)
    );
    return inHand || inWinning || inMeldInput || inMelds;
  }, [hand, melds, meldInput, winningTile, redHandFlags, redMeldInputFlags, redMeldFlags, redWinningFlag]);

  const exceedsTileLimit = (tile: Tile, options?: { includeWinningTile?: boolean }) => {
    const count = getAllSelectedTiles(options).filter(t => t === tile).length;
    if (count >= 4) {
      setError('同じ牌は4枚まで選択できます');
      return true;
    }
    return false;
  };

  const addDoraTileValue = (type: 'dora' | 'ura', tile: Tile) => {
    const target = type === 'dora' ? doraTiles : uraDoraTiles;
    const setter = type === 'dora' ? setDoraTiles : setUraDoraTiles;

    if (type === 'ura' && !riichi) {
      setError('裏ドラはリーチ時のみ設定できます');
      return;
    }

    if (target.length >= 4) {
      setError('各ドラは最大4枚まで設定できます');
      return;
    }

    setter([...target, tile]);
    setError('');
  };

  const removeDoraTileValue = (index: number, type: 'dora' | 'ura') => {
    const target = type === 'dora' ? doraTiles : uraDoraTiles;
    const setter = type === 'dora' ? setDoraTiles : setUraDoraTiles;
    const updated = [...target];
    updated.splice(index, 1);
    setter(updated);
  };


  const pushHistoryEntry = (calcResult: CalculationResult, optionsSnapshot: AgariOptions) => {
    if (!winningTile) return;
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      hand: [...hand],
      winningTile,
      options: cloneOptionsForHistory(optionsSnapshot),
      result: calcResult,
      redHandFlags: [...redHandFlags],
      redMeldFlags: redMeldFlags.map(flags => [...flags]),
      redWinningFlag
    };
    setHistory(prev => {
      const updated = [entry, ...prev];
      return updated.slice(0, 5);
    });
  };

  const toggleHistoryEntry = (entry: HistoryEntry) => {
    if (activeHistoryId === entry.id) {
      setActiveHistoryId(null);
      setActiveHistoryTab('hand');
      return;
    }
    setActiveHistoryId(entry.id);
    setActiveHistoryTab('hand');
  };

  const isMenzen = !melds.some(meld => meld.type !== 'ankan');

  // 鳴きの状態に応じてリーチを制御（暗槓は門前扱い）
  useEffect(() => {
    const hasOpenMeld = melds.some(meld => meld.type !== 'ankan');
    if (hasOpenMeld) {
      if (riichi) {
        setRiichi(false);
      }
      if (isDoubleRiichi) {
        setIsDoubleRiichi(false);
      }
      if (ippatsu) {
        setIppatsu(false);
      }
    }
  }, [melds, riichi, isDoubleRiichi, ippatsu]);

  useEffect(() => {
    if (agariType === 'tsumo') {
      if (isHoutei) setIsHoutei(false);
      if (isChankan) setIsChankan(false);
    } else {
      if (isHaitei) setIsHaitei(false);
      if (isRinshan) setIsRinshan(false);
    }
  }, [agariType, isHaitei, isHoutei, isRinshan, isChankan]);

  useEffect(() => {
    if (!riichi && tileSelectMode === 'ura') {
      setTileSelectMode('dora');
    }
  }, [riichi, tileSelectMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed: HistoryEntry[] = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (e) {
      logClientError('Failed to load history from localStorage', e);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      logClientError('Failed to save history to localStorage', e);
    }
  }, [history]);

  const addTileToHand = (tile: Tile): boolean => {
    const meldTileCount = getMeldTileCount(melds);
    const maxHandSize = 14 - meldTileCount - 1;

    if (hand.length >= maxHandSize) {
      if (exceedsTileLimit(tile, { includeWinningTile: false })) {
        return false;
      }
      setWinningTile(tile);
      setRedWinningFlag(false);
      setError('');
      return true;
    }
    if (exceedsTileLimit(tile)) {
      return false;
    }
    const sorted = sortHandWithFlags([...hand, tile], [...redHandFlags, false]);
    setHand(sorted.tiles);
    setRedHandFlags(sorted.flags);
    setError('');
    return true;
  };

  const addTileToMeld = (tile: Tile): boolean => {
    const requiredTiles = meldType === 'ankan' || meldType === 'minkan' ? 4 : 3;
    if (meldInput.length < requiredTiles) {
      if (exceedsTileLimit(tile)) {
        return false;
      }
      setMeldInput([...meldInput, tile]);
      setRedMeldInputFlags([...redMeldInputFlags, false]);
      setError('');
      return true;
    }
    return false;
  };

  const addRedTileToHand = (tile: Tile, suit: RedSuit) => {
    if (hasRedSelection(suit)) {
      setError(`${TILE_DISPLAY[tile]}は1枚まで選択できます`);
      return;
    }
    const meldTileCount = getMeldTileCount(melds);
    const maxHandSize = 14 - meldTileCount - 1;
    if (hand.length >= maxHandSize) {
      if (exceedsTileLimit(tile, { includeWinningTile: false })) {
        return;
      }
      setWinningTile(tile);
      setRedWinningFlag(true);
      setError('');
      return;
    }
    if (exceedsTileLimit(tile)) {
      return;
    }
    const sorted = sortHandWithFlags([...hand, tile], [...redHandFlags, true]);
    setHand(sorted.tiles);
    setRedHandFlags(sorted.flags);
    setError('');
  };

  const addRedTileToMeld = (tile: Tile, suit: RedSuit) => {
    if (hasRedSelection(suit)) {
      setError(`${TILE_DISPLAY[tile]}は1枚まで選択できます`);
      return;
    }
    const requiredTiles = meldType === 'ankan' || meldType === 'minkan' ? 4 : 3;
    if (meldInput.length < requiredTiles) {
      if (exceedsTileLimit(tile)) {
        return;
      }
      setMeldInput([...meldInput, tile]);
      setRedMeldInputFlags([...redMeldInputFlags, true]);
      setError('');
    }
  };

  const handleTileSelect = (tile: Tile) => {
    if (tileSelectMode === 'meld') {
      addTileToMeld(tile);
      return;
    }
    if (tileSelectMode === 'dora') {
      addDoraTileValue('dora', tile);
      return;
    }
    if (tileSelectMode === 'ura') {
      addDoraTileValue('ura', tile);
      return;
    }
    addTileToHand(tile);
  };

  const handleRedTileSelect = (tile: Tile, suit: RedSuit) => {
    if (tileSelectMode === 'meld') {
      addRedTileToMeld(tile, suit);
      return;
    }
    if (tileSelectMode === 'dora') {
      addDoraTileValue('dora', tile);
      return;
    }
    if (tileSelectMode === 'ura') {
      addDoraTileValue('ura', tile);
      return;
    }
    addRedTileToHand(tile, suit);
  };

  const removeTileFromMeld = (index: number) => {
    const newMeldInput = [...meldInput];
    newMeldInput.splice(index, 1);
    setMeldInput(newMeldInput);
    const newRedFlags = [...redMeldInputFlags];
    newRedFlags.splice(index, 1);
    setRedMeldInputFlags(newRedFlags);
  };

  const addMeld = () => {
    const requiredTiles = meldType === 'ankan' || meldType === 'minkan' ? 4 : 3;
    if (meldInput.length !== requiredTiles) {
      setError(`${requiredTiles}枚の牌を選択してください`);
      return;
    }
    if (!isValidMeld(meldType, meldInput)) {
      if (meldType === 'chii') {
        setError('チーは同一種の連続した3枚で選択してください');
      } else if (meldType === 'pon') {
        setError('ポンは同一牌3枚で選択してください');
      } else {
        setError('カンは同一牌4枚で選択してください');
      }
      return;
    }
    setMelds([...melds, { type: meldType, tiles: meldInput }]);
    setRedMeldFlags([...redMeldFlags, [...redMeldInputFlags]]);
    setMeldInput([]);
    setRedMeldInputFlags([]);
    setError('');
  };

  const removeMeld = (index: number) => {
    const newMelds = [...melds];
    newMelds.splice(index, 1);
    setMelds(newMelds);
    const newRedMelds = [...redMeldFlags];
    newRedMelds.splice(index, 1);
    setRedMeldFlags(newRedMelds);
  };

  const setWinningTileHandler = (tile: Tile) => {
    setWinningTile(tile);
    setRedWinningFlag(false);
    setError('');
  };

  const removeTileFromHand = (index: number) => {
    const newHand = [...hand];
    newHand.splice(index, 1);
    setHand(newHand);
    const newRedFlags = [...redHandFlags];
    newRedFlags.splice(index, 1);
    setRedHandFlags(newRedFlags);
  };

  const removeWinningTile = () => {
    setWinningTile(null);
    setRedWinningFlag(false);
  };

  const clearAll = () => {
    setHand([]);
    setWinningTile(null);
    setResult(null);
    setError('');
    setMelds([]);
    setMeldInput([]);
    setAgariType('tsumo');
    setBakaze('ton');
    setJikaze('ton');
    setRiichi(false);
    setIsDoubleRiichi(false);
    setIppatsu(false);
    setIsDealer(true);
    setIsTenhou(false);
    setIsChiihou(false);
    setIsHaitei(false);
    setIsHoutei(false);
    setIsRinshan(false);
    setIsChankan(false);
    setIsNagashiMangan(false);
    setDoraTiles([]);
    setUraDoraTiles([]);
    setRedHandFlags([]);
    setRedMeldInputFlags([]);
    setRedMeldFlags([]);
    setRedWinningFlag(false);
  };

  const getDoraFromIndicator = (tile: Tile): Tile => {
    if (tile.length === 2) {
      const num = parseInt(tile[0], 10);
      const suit = tile[1];
      const next = num === 9 ? 1 : num + 1;
      return `${next}${suit}` as Tile;
    }
    const honorOrder: Tile[] = ['東', '南', '西', '北', '白', '發', '中'];
    const index = honorOrder.indexOf(tile);
    if (index === -1) return tile;
    return honorOrder[(index + 1) % honorOrder.length];
  };

  const handleCalculate = () => {
    if (!winningTile) {
      setError('和了牌を選択してください');
      return;
    }

    const redDoraCounts = {
      man: hasRedSelection('man') ? 1 : 0,
      pin: hasRedSelection('pin') ? 1 : 0,
      sou: hasRedSelection('sou') ? 1 : 0
    };

    const options: AgariOptions = {
      isTsumo: agariType === 'tsumo',
      bakaze,
      jikaze,
      isRiichi: riichi,
      isDoubleRiichi,
      isIppatsu: ippatsu,
      isMenzen: isMenzen,
      isOya: isDealer,
      melds: melds.length > 0 ? melds : undefined,
      isTenhou,
      isChiihou,
      isHaitei,
      isHoutei,
      isRinshan,
      isChankan,
      isNagashiMangan,
      doraTiles,
      uraDoraTiles: riichi ? uraDoraTiles : [],
      redDora: redDoraCounts,
      kyotaku: kyotakuCount,
      honba: honbaCount
    };

    const calcOptions: AgariOptions = {
      ...options,
      doraTiles: doraTiles.map(getDoraFromIndicator),
      uraDoraTiles: riichi ? uraDoraTiles.map(getDoraFromIndicator) : []
    };

    const calcResult = calculateScore(hand, winningTile, calcOptions);

    if ('error' in calcResult) {
      setError(calcResult.error);
      setResult(null);
    } else {
      setResult(calcResult);
      setError('');
      setActiveInfoTab('result');
      pushHistoryEntry(calcResult, options);
    }
  };

  const currentMeldSummary = melds.length > 0
    ? melds.map(meld => `${meld.type.toUpperCase()}(${meld.tiles.join(' ')})`).join(' / ')
    : 'なし';

  return (
    <div className="container">
      <h1>🀄 麻雀点数計算機</h1>
      <div className="controls" style={{ justifyContent: 'center' }}>
        <Link className="btn btn-secondary" href="/score-quiz">点数○×ゲームへ</Link>
      </div>

      <div className="layout-grid">
        <div className="layout-left">
          {/* 牌選択セクション */}
          <div className="section compact">
            <div className="section-title">牌を選択</div>
            <div className="tile-select-modes">
              <button
                type="button"
                className={`btn ${tileSelectMode === 'hand' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTileSelectMode('hand')}
              >
                手牌に追加
              </button>
              <button
                type="button"
                className={`btn ${tileSelectMode === 'meld' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTileSelectMode('meld')}
              >
                鳴きに追加
              </button>
              <button
                type="button"
                className={`btn ${tileSelectMode === 'dora' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTileSelectMode('dora')}
              >
                表示ドラ
              </button>
              <button
                type="button"
                className={`btn ${tileSelectMode === 'ura' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTileSelectMode('ura')}
                disabled={!riichi}
              >
                裏ドラ
              </button>
            </div>
            <div className="info-text">
              {tileSelectMode === 'hand' && '※ 牌をクリックすると手牌に追加されます。'}
              {tileSelectMode === 'meld' && '※ 牌をクリックすると鳴き入力に追加されます。'}
              {tileSelectMode === 'dora' && '※ 牌をクリックすると表示ドラに追加されます。'}
              {tileSelectMode === 'ura' && '※ 牌をクリックすると裏ドラに追加されます（リーチ時のみ）。'}
            </div>
            <div className="tile-selector">
              <div className="tile-group">
                <div className="tile-group-title">萬子（マンズ）</div>
                <div className="tiles">
                  {TILES.manzu.map(tile => {
                    const isMaxed = getTileCount(tile) >= 4;
                    return (
                      <button
                        key={tile}
                        className={`tile${isMaxed ? ' tile--maxed' : ''}`}
                        onClick={() => handleTileSelect(tile)}
                        disabled={isMaxed}
                        aria-label={`${TILE_DISPLAY[tile]}${isMaxed ? '（選択不可）' : ''}`}
                        type="button"
                      >
                        <TileFace tile={tile} />
                      </button>
                    );
                  })}
                  {RED_TILES.filter(tile => tile.suit === 'man').map(tile => (
                    <button
                      key={tile.label}
                      className={`tile tile--red${getTileCount(tile.tile) >= 4 ? ' tile--maxed' : ''}`}
                      onClick={() => handleRedTileSelect(tile.tile, tile.suit)}
                      title={tile.label}
                      type="button"
                      disabled={getTileCount(tile.tile) >= 4}
                      aria-label={`${TILE_DISPLAY[tile.tile]}（赤）${getTileCount(tile.tile) >= 4 ? '（選択不可）' : ''}`}
                    >
                      <TileFace tile={tile.tile} />
                      <span className="tile-badge">赤</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="tile-group">
                <div className="tile-group-title">筒子（ピンズ）</div>
                <div className="tiles">
                  {TILES.pinzu.map(tile => {
                    const isMaxed = getTileCount(tile) >= 4;
                    return (
                      <button
                        key={tile}
                        className={`tile${isMaxed ? ' tile--maxed' : ''}`}
                        onClick={() => handleTileSelect(tile)}
                        disabled={isMaxed}
                        aria-label={`${TILE_DISPLAY[tile]}${isMaxed ? '（選択不可）' : ''}`}
                        type="button"
                      >
                        <TileFace tile={tile} />
                      </button>
                    );
                  })}
                  {RED_TILES.filter(tile => tile.suit === 'pin').map(tile => (
                    <button
                      key={tile.label}
                      className={`tile tile--red${getTileCount(tile.tile) >= 4 ? ' tile--maxed' : ''}`}
                      onClick={() => handleRedTileSelect(tile.tile, tile.suit)}
                      title={tile.label}
                      type="button"
                      disabled={getTileCount(tile.tile) >= 4}
                      aria-label={`${TILE_DISPLAY[tile.tile]}（赤）${getTileCount(tile.tile) >= 4 ? '（選択不可）' : ''}`}
                    >
                      <TileFace tile={tile.tile} />
                      <span className="tile-badge">赤</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="tile-group">
                <div className="tile-group-title">索子（ソーズ）</div>
                <div className="tiles">
                  {TILES.souzu.map(tile => {
                    const isMaxed = getTileCount(tile) >= 4;
                    return (
                      <button
                        key={tile}
                        className={`tile${isMaxed ? ' tile--maxed' : ''}`}
                        onClick={() => handleTileSelect(tile)}
                        disabled={isMaxed}
                        aria-label={`${TILE_DISPLAY[tile]}${isMaxed ? '（選択不可）' : ''}`}
                        type="button"
                      >
                        <TileFace tile={tile} />
                      </button>
                    );
                  })}
                  {RED_TILES.filter(tile => tile.suit === 'sou').map(tile => (
                    <button
                      key={tile.label}
                      className={`tile tile--red${getTileCount(tile.tile) >= 4 ? ' tile--maxed' : ''}`}
                      onClick={() => handleRedTileSelect(tile.tile, tile.suit)}
                      title={tile.label}
                      type="button"
                      disabled={getTileCount(tile.tile) >= 4}
                      aria-label={`${TILE_DISPLAY[tile.tile]}（赤）${getTileCount(tile.tile) >= 4 ? '（選択不可）' : ''}`}
                    >
                      <TileFace tile={tile.tile} />
                      <span className="tile-badge">赤</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="tile-group">
                <div className="tile-group-title">字牌</div>
                <div className="tiles">
                  {TILES.jihai.map(tile => {
                    const isMaxed = getTileCount(tile) >= 4;
                    return (
                      <button
                        key={tile}
                        className={`tile${isMaxed ? ' tile--maxed' : ''}`}
                        onClick={() => handleTileSelect(tile)}
                        disabled={isMaxed}
                        aria-label={`${TILE_DISPLAY[tile]}${isMaxed ? '（選択不可）' : ''}`}
                        type="button"
                      >
                        <TileFace tile={tile} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 現在の手牌表示 */}
          <div className="section compact">
            <button
              type="button"
              className="section-title section-title-button"
              onClick={() => setActiveInfoTab('hand')}
            >
              現在の手牌
            </button>
            <div className="hand-display hand-summary-grid">
              <div className="hand-summary-column">
                <div className="hand-title">手牌 (<span>{hand.length}</span>/{14 - getMeldTileCount(melds) - 1}枚)</div>
                <div className="hand-tiles">
                {hand.map((tile, index) => (
                  <div
                    key={index}
                    className={`hand-tile${redHandFlags[index] ? ' hand-tile--red' : ''}`}
                    onClick={() => removeTileFromHand(index)}
                  >
                    <TileFace tile={tile} />
                  </div>
                ))}
                </div>
                <div className="info-text">※ 手牌は自動的にソートされます。</div>
              </div>
              <div className="hand-summary-column hand-summary-winning">
                <div className="hand-title">和了牌 (<span>{winningTile ? 1 : 0}</span>/1枚)</div>
                <div className="hand-tiles">
                  {winningTile ? (
                    <div
                      className={`hand-tile winning-tile${redWinningFlag ? ' hand-tile--red' : ''}`}
                      onClick={removeWinningTile}
                    >
                      <TileFace tile={winningTile} />
                    </div>
                  ) : (
                    <div className="info-text">未選択</div>
                  )}
                </div>
                <div className="info-text">※ 和了した牌を1枚選択してください。</div>
              </div>
              <div className="hand-summary-column">
                <div className="hand-title">鳴き（副露） (<span>{melds.length}</span>回）</div>
                <div className="melds-container">
                  {melds.map((meld, index) => (
                    <div key={index} className="meld-group" onClick={() => removeMeld(index)}>
                      <div className="meld-type">
                        {meld.type === 'chii' && 'チー'}
                        {meld.type === 'pon' && 'ポン'}
                        {meld.type === 'minkan' && '明カン'}
                        {meld.type === 'ankan' && '暗カン'}
                      </div>
                      <div className="meld-tiles">
                        {meld.type === 'ankan' ? (
                          <>
                            <div key={0} className="hand-tile" style={{ fontSize: '14px' }}>
                              <TileBack />
                            </div>
                            <div
                              key={1}
                              className={`hand-tile${redMeldFlags[index]?.[1] ? ' hand-tile--red' : ''}`}
                              style={{ fontSize: '14px' }}
                            >
                              <TileFace tile={meld.tiles[1]} />
                            </div>
                            <div
                              key={2}
                              className={`hand-tile${redMeldFlags[index]?.[2] ? ' hand-tile--red' : ''}`}
                              style={{ fontSize: '14px' }}
                            >
                              <TileFace tile={meld.tiles[2]} />
                            </div>
                            <div key={3} className="hand-tile" style={{ fontSize: '14px' }}>
                              <TileBack />
                            </div>
                          </>
                        ) : (
                          meld.tiles.map((tile, tileIndex) => (
                            <div
                              key={tileIndex}
                              className={`hand-tile${redMeldFlags[index]?.[tileIndex] ? ' hand-tile--red' : ''}`}
                              style={{ fontSize: '14px' }}
                            >
                              <TileFace tile={tile} />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="info-text">※ クリックして削除できます。</div>
              </div>
            </div>

            {/* 鳴き入力 */}
            <div className="hand-display" style={{ marginTop: '15px' }}>
              <div className="hand-title">鳴きを追加</div>
              <div className="option-group" style={{ marginBottom: '10px' }}>
                <select
                  value={meldType}
                  onChange={(e) => setMeldType(e.target.value as MeldType)}
                  style={{ padding: '5px', fontSize: '14px' }}
                >
                  <option value="chii">チー（順子）</option>
                  <option value="pon">ポン（刻子）</option>
                  <option value="minkan">明カン（槓子）</option>
                  <option value="ankan">暗カン（槓子）</option>
                </select>
              </div>
              <div className="info-text">※ 牌選択は上部の牌テーブルから行います。</div>
              <div className="hand-tiles">
                {meldInput.map((tile, index) => (
                  <div
                    key={index}
                    className={`hand-tile${redMeldInputFlags[index] ? ' hand-tile--red' : ''}`}
                    onClick={() => removeTileFromMeld(index)}
                  >
                    <TileFace tile={tile} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  onClick={addMeld}
                  disabled={meldInput.length === 0}
                >
                  鳴きを確定
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setMeldInput([]);
                    setRedMeldInputFlags([]);
                  }}
                  disabled={meldInput.length === 0}
                >
                  入力をクリア
                </button>
              </div>
              <div className="info-text" style={{ marginTop: '10px' }}>
                ※ チー・ポンは3枚、カンは4枚選択してください。
              </div>
            </div>

            <div className="controls">
              <button className="btn btn-danger" onClick={clearAll}>すべてクリア</button>
            </div>
          </div>
        </div>

        <div className="layout-right">
          {/* オプション設定 */}
          <div className="section compact">
            <button
              type="button"
              className="section-title section-title-button"
              onClick={() => setActiveInfoTab('options')}
            >
              和了条件
            </button>
            <div className="options">
              <div className="option-group">
                <div className="option-title">和了方法</div>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="agari-type"
                      value="tsumo"
                      checked={agariType === 'tsumo'}
                      onChange={(e) => setAgariType(e.target.value as 'tsumo' | 'ron')}
                    />
                    ツモ
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="agari-type"
                      value="ron"
                      checked={agariType === 'ron'}
                      onChange={(e) => setAgariType(e.target.value as 'tsumo' | 'ron')}
                    />
                    ロン
                  </label>
                </div>
              </div>
              <div className="option-group">
                <div className="option-title">場風</div>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="bakaze"
                      value="ton"
                      checked={bakaze === 'ton'}
                      onChange={(e) => setBakaze(e.target.value)}
                    />
                    東
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="bakaze"
                      value="nan"
                      checked={bakaze === 'nan'}
                      onChange={(e) => setBakaze(e.target.value)}
                    />
                    南
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="bakaze"
                      value="sha"
                      checked={bakaze === 'sha'}
                      onChange={(e) => setBakaze(e.target.value)}
                    />
                    西
                  </label>
                </div>
              </div>
              <div className="option-group">
                <div className="option-title">自風</div>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="jikaze"
                      value="ton"
                      checked={jikaze === 'ton'}
                      onChange={(e) => setJikaze(e.target.value)}
                    />
                    東
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="jikaze"
                      value="nan"
                      checked={jikaze === 'nan'}
                      onChange={(e) => setJikaze(e.target.value)}
                    />
                    南
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="jikaze"
                      value="sha"
                      checked={jikaze === 'sha'}
                      onChange={(e) => setJikaze(e.target.value)}
                    />
                    西
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="jikaze"
                      value="pei"
                      checked={jikaze === 'pei'}
                      onChange={(e) => setJikaze(e.target.value)}
                    />
                    北
                  </label>
                </div>
              </div>
              <div className="option-group">
                <div className="option-title">親番</div>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="oya"
                      value="oya"
                      checked={isDealer}
                      onChange={() => setIsDealer(true)}
                    />
                    親（東家）
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="radio"
                      name="oya"
                      value="ko"
                      checked={!isDealer}
                      onChange={() => setIsDealer(false)}
                    />
                    子
                  </label>
                </div>
                <div className="info-text">※ 点数計算のみに利用されます。</div>
              </div>
              <div className="option-group">
                <div className="option-title">その他</div>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={riichi}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setRiichi(checked);
                        if (!checked) {
                          setIppatsu(false);
                          setIsDoubleRiichi(false);
                        }
                      }}
                      disabled={!isMenzen}
                    />
                    リーチ
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isDoubleRiichi}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsDoubleRiichi(checked);
                        if (checked) {
                          setRiichi(true);
                        }
                      }}
                      disabled={!isMenzen}
                    />
                    ダブルリーチ
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={ippatsu}
                      onChange={(e) => setIppatsu(e.target.checked)}
                      disabled={!riichi}
                    />
                    一発
                  </label>
                </div>
                <div className="info-text">門前は鳴き状態から自動判定されます。</div>
              </div>
              <div className="option-group">
                <div className="option-title">特殊和了条件</div>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isHaitei}
                      onChange={(e) => setIsHaitei(e.target.checked)}
                      disabled={agariType !== 'tsumo'}
                    />
                    海底摸月
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isHoutei}
                      onChange={(e) => setIsHoutei(e.target.checked)}
                      disabled={agariType !== 'ron'}
                    />
                    河底撈魚
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isRinshan}
                      onChange={(e) => setIsRinshan(e.target.checked)}
                      disabled={agariType !== 'tsumo'}
                    />
                    嶺上開花
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isChankan}
                      onChange={(e) => setIsChankan(e.target.checked)}
                      disabled={agariType !== 'ron'}
                    />
                    槍槓
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isNagashiMangan}
                      onChange={(e) => setIsNagashiMangan(e.target.checked)}
                    />
                    流し満貫
                  </label>
                </div>
              </div>
              <div className="option-group">
                <div className="option-title">役満（特殊条件）</div>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isTenhou}
                      onChange={(e) => {
                        setIsTenhou(e.target.checked);
                        if (e.target.checked) {
                          setIsChiihou(false);
                          setJikaze('ton');
                        }
                      }}
                      disabled={jikaze !== 'ton'}
                    />
                    天和（親の配牌時和了）
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isChiihou}
                      onChange={(e) => {
                        setIsChiihou(e.target.checked);
                        if (e.target.checked) {
                          setIsTenhou(false);
                        }
                      }}
                      disabled={jikaze === 'ton'}
                    />
                    地和（子の第一ツモ和了）
                  </label>
                </div>
              </div>
              <div className="option-group">
                <div className="option-title">供託・本場</div>
                <div className="counter-group">
                  <div className="counter-card">
                    <span className="counter-label">供託</span>
                    <button
                      type="button"
                      className="btn btn-secondary counter-btn"
                      onClick={() => setKyotakuCount(prev => Math.max(0, prev - 1))}
                    >
                      -
                    </button>
                    <span className="counter-value">{kyotakuCount}</span>
                    <button
                      type="button"
                      className="btn btn-secondary counter-btn"
                      onClick={() => setKyotakuCount(prev => prev + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="counter-card">
                    <span className="counter-label">本場</span>
                    <button
                      type="button"
                      className="btn btn-secondary counter-btn"
                      onClick={() => setHonbaCount(prev => Math.max(0, prev - 1))}
                    >
                      -
                    </button>
                    <span className="counter-value">{honbaCount}</span>
                    <button
                      type="button"
                      className="btn btn-secondary counter-btn"
                      onClick={() => setHonbaCount(prev => prev + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            <div className="option-group">
              <div className="option-title">ドラ設定</div>
              <div className="dora-block">
                <div className="option-subtitle">表示ドラ</div>
                <div className="hand-tiles">
                  {doraTiles.length === 0 && <div className="info-text">未設定</div>}
                  {doraTiles.map((tile, index) => (
                    <div
                      key={`${tile}-${index}`}
                      className="hand-tile"
                      onClick={() => removeDoraTileValue(index, 'dora')}
                    >
                      <TileFace tile={tile} />
                    </div>
                  ))}
                </div>
                <div className="info-text">※ 牌選択は上部の牌テーブルから行います。</div>
              </div>
              <div className="dora-block" style={{ marginTop: '10px' }}>
                <div className="option-subtitle">裏ドラ（リーチ時のみ）</div>
                <div className="hand-tiles">
                  {uraDoraTiles.length === 0 && <div className="info-text">未設定</div>}
                {uraDoraTiles.map((tile, index) => (
                  <div
                    key={`${tile}-ura-${index}`}
                    className="hand-tile"
                    onClick={() => removeDoraTileValue(index, 'ura')}
                  >
                    <TileFace tile={tile} />
                  </div>
                ))}
              </div>
              <div className="info-text">※ 牌選択は上部の牌テーブルから行います。</div>
              {!riichi && <div className="info-text">リーチ時のみ有効です</div>}
            </div>
              </div>
            </div>
          </div>

          {/* 計算ボタン */}
          <div className="section compact sticky-actions">
            <button
              className="btn btn-primary"
              onClick={handleCalculate}
              style={{ width: '100%', fontSize: '1.05em', padding: '12px' }}
            >
              点数を計算する
            </button>
          </div>
        </div>
      </div>

      <div className="section compact info-panel">
        <div className="section-title">情報パネル</div>
        <div className="info-tabs">
          <button
            type="button"
            className={`btn ${activeInfoTab === 'hand' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveInfoTab('hand')}
          >
            手牌
          </button>
          <button
            type="button"
            className={`btn ${activeInfoTab === 'options' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveInfoTab('options')}
          >
            条件
          </button>
          <button
            type="button"
            className={`btn ${activeInfoTab === 'result' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveInfoTab('result')}
          >
            結果
          </button>
        </div>
        <div className="info-content">
          {activeInfoTab === 'hand' && (
            <div>
              <div className="history-hand">
                <span className="history-label">手牌</span>
                <div className="history-tiles">
                  {hand.map((tile, index) => (
                    <span
                      key={`${tile}-${index}`}
                      className={`history-tile${redHandFlags[index] ? ' history-tile--red' : ''}`}
                    >
                      <TileFace tile={tile} />
                    </span>
                  ))}
                </div>
                <span className="history-label">和了牌</span>
                <span className={`history-tile history-tile-winning${redWinningFlag ? ' history-tile--red' : ''}`}>
                  {winningTile ? <TileFace tile={winningTile} /> : '未選択'}
                </span>
              </div>
              <div style={{ marginTop: '4px' }}>鳴き: {currentMeldSummary}</div>
            </div>
          )}
          {activeInfoTab === 'options' && (
            <div className="history-option-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px' }}>
              <div>和了方法: {agariType === 'tsumo' ? 'ツモ' : 'ロン'}</div>
              <div>リーチ: {formatBooleanOption(riichi)}</div>
              <div>ダブルリーチ: {formatBooleanOption(isDoubleRiichi)}</div>
              <div>一発: {formatBooleanOption(ippatsu)}</div>
              <div>門前: {formatBooleanOption(isMenzen)}</div>
              <div>親番: {formatBooleanOption(isDealer)}</div>
              <div>海底: {formatBooleanOption(isHaitei)}</div>
              <div>河底: {formatBooleanOption(isHoutei)}</div>
              <div>嶺上: {formatBooleanOption(isRinshan)}</div>
              <div>槍槓: {formatBooleanOption(isChankan)}</div>
              <div>流し満貫: {formatBooleanOption(isNagashiMangan)}</div>
              <div>供託: {kyotakuCount}</div>
              <div>本場: {honbaCount}</div>
            </div>
          )}
          {activeInfoTab === 'result' && (
            result ? (
              <div>
                <div className="result-box">
                  <div className="result-row">
                    <span className="result-label">翻数（ハン）</span>
                    <span className="result-value">{result.han}翻</span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">符（フ）</span>
                    <span className="result-value">{result.fu}符</span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">点数</span>
                    <span className="result-value">{result.score}</span>
                  </div>
                  {result.scoreBreakdown && (
                    <>
                      <div className="result-row">
                        <span className="result-label">基本点</span>
                        <span className="result-value">{result.scoreBreakdown.baseText}</span>
                      </div>
                      <div className="result-row">
                        <span className="result-label">本場</span>
                        <span className="result-value">{result.scoreBreakdown.honbaText ?? 'なし'}</span>
                      </div>
                      <div className="result-row">
                        <span className="result-label">供託</span>
                        <span className="result-value">{result.scoreBreakdown.kyotakuText ?? 'なし'}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="yaku-list">
                  <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#667eea', fontSize: '1.1em' }}>
                    成立役
                  </div>
                  {result.yaku.map((yaku, index) => (
                    <div
                      key={index}
                      className="yaku-item"
                      style={yaku.han >= 13 ? {
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1.05em',
                        padding: '10px 12px',
                        border: '2px solid #ffd700',
                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                      } : {}}
                    >
                      <span>{yaku.han >= 13 ? '🏆 ' : ''}{yaku.name}</span>
                      <span>{yaku.han}翻</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="info-text">まだ計算結果がありません。</div>
            )
          )}
        </div>
      </div>

      <div className="section compact">
        <div className="section-title">計算履歴</div>
        {history.length === 0 ? (
          <div className="info-text">まだ履歴がありません。</div>
        ) : (
          <div className="history-list">
            {history.map(entry => {
              const isActive = activeHistoryId === entry.id;
              const detailTabs: { key: 'hand' | 'options' | 'result'; label: string }[] = [
                { key: 'hand', label: '手牌情報' },
                { key: 'options', label: '条件' },
                { key: 'result', label: '結果' }
              ];
              const meldSummary = entry.options.melds && entry.options.melds.length > 0
                ? entry.options.melds.map(meld => `${meld.type.toUpperCase()}(${meld.tiles.join(' ')})`).join(' / ')
                : 'なし';
              return (
                <div key={entry.id} className="history-item">
                  <div>
                    <div className="history-score">{entry.result.score}</div>
                    <div className="history-meta">
                      {new Date(entry.timestamp).toLocaleString()} / {entry.result.han}翻 {entry.result.fu}符
                    </div>
                    <div className="history-hand">
                      <span className="history-label">手牌</span>
                      <div className="history-tiles">
                        {entry.hand.map((tile, index) => (
                          <span key={`${tile}-${index}`} className="history-tile">
                            <TileFace tile={tile} />
                          </span>
                        ))}
                      </div>
                      <span className="history-label">和了牌</span>
                      <span className="history-tile history-tile-winning">
                        <TileFace tile={entry.winningTile} />
                      </span>
                    </div>
                    <div className="history-yaku">
                      {entry.result.yaku.map(y => `${y.name}(${y.han}翻)`).join('、 ')}
                    </div>
                  </div>
                  <button className="btn btn-secondary" onClick={() => toggleHistoryEntry(entry)}>
                    {isActive ? '詳細を閉じる' : '詳細を表示'}
                  </button>
                  {isActive && (
                    <div className="history-detail" style={{ marginTop: '12px', background: '#f8f8ff', padding: '12px', borderRadius: '8px' }}>
                      <div className="history-tabs" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {detailTabs.map(tab => (
                          <button
                            key={tab.key}
                            type="button"
                            className={`btn ${activeHistoryTab === tab.key ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveHistoryTab(tab.key)}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <div className="history-detail-content">
                        {activeHistoryTab === 'hand' && (
                          <div>
                            <div className="history-hand">
                              <span className="history-label">手牌</span>
                              <div className="history-tiles">
                                {entry.hand.map((tile, index) => (
                                  <span key={`${tile}-${index}`} className="history-tile">
                                    <TileFace tile={tile} />
                                  </span>
                                ))}
                              </div>
                              <span className="history-label">和了牌</span>
                              <span className="history-tile history-tile-winning">
                                <TileFace tile={entry.winningTile} />
                              </span>
                            </div>
                            <div style={{ marginTop: '4px' }}>鳴き: {meldSummary}</div>
                          </div>
                        )}
                        {activeHistoryTab === 'options' && (
                          <div className="history-option-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px' }}>
                            <div>和了方法: {entry.options.isTsumo ? 'ツモ' : 'ロン'}</div>
                            <div>リーチ: {formatBooleanOption(entry.options.isRiichi)}</div>
                            <div>ダブルリーチ: {formatBooleanOption(entry.options.isDoubleRiichi)}</div>
                            <div>一発: {formatBooleanOption(entry.options.isIppatsu)}</div>
                            <div>門前: {formatBooleanOption(entry.options.isMenzen)}</div>
                            <div>親番: {formatBooleanOption(entry.options.isOya)}</div>
                            <div>海底: {formatBooleanOption(entry.options.isHaitei)}</div>
                            <div>河底: {formatBooleanOption(entry.options.isHoutei)}</div>
                            <div>嶺上: {formatBooleanOption(entry.options.isRinshan)}</div>
                            <div>槍槓: {formatBooleanOption(entry.options.isChankan)}</div>
                            <div>流し満貫: {formatBooleanOption(entry.options.isNagashiMangan)}</div>
                            <div>供託: {entry.options.kyotaku ?? 0}</div>
                            <div>本場: {entry.options.honba ?? 0}</div>
                          </div>
                        )}
                        {activeHistoryTab === 'result' && (
                          <div>
                            <div>翻数: {entry.result.han}翻 / 符: {entry.result.fu}符</div>
                            <div style={{ marginTop: '4px' }}>点数: {entry.result.score}</div>
                            {entry.result.scoreBreakdown && (
                              <>
                                <div style={{ marginTop: '4px' }}>基本点: {entry.result.scoreBreakdown.baseText}</div>
                                <div style={{ marginTop: '4px' }}>本場: {entry.result.scoreBreakdown.honbaText ?? 'なし'}</div>
                                <div style={{ marginTop: '4px' }}>供託: {entry.result.scoreBreakdown.kyotakuText ?? 'なし'}</div>
                              </>
                            )}
                            <div style={{ marginTop: '4px' }}>成立役: {entry.result.yaku.map(y => `${y.name}(${y.han}翻)`).join('、 ')}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="error-message show">
          {error}
        </div>
      )}
    </div>
  );
}
