'use client';

import { useState, useEffect } from 'react';
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
import TileFace from './components/TileFace';

const ALL_TILES: Tile[] = [...TILES.manzu, ...TILES.pinzu, ...TILES.souzu, ...TILES.jihai];
const HONOR_INPUT_MAP: Record<string, Tile> = {
  ton: '東',
  nan: '南',
  sha: '西',
  pei: '北',
  haku: '白',
  hatsu: '發',
  chun: '中'
};

interface HistoryEntry {
  id: string;
  timestamp: number;
  hand: Tile[];
  winningTile: Tile;
  options: AgariOptions;
  result: CalculationResult;
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
});

const formatBooleanOption = (value?: boolean) => (value ? 'あり' : 'なし');

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
  const [menzen, setMenzen] = useState<boolean>(true);
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
  const [doraSelect, setDoraSelect] = useState<Tile>(ALL_TILES[0]);
  const [uraDoraSelect, setUraDoraSelect] = useState<Tile>(ALL_TILES[0]);
  const [akaDora, setAkaDora] = useState<{ man: boolean; pin: boolean; sou: boolean }>({
    man: false,
    pin: false,
    sou: false
  });
  const [tileInput, setTileInput] = useState<string>('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'hand' | 'options' | 'result'>('hand');

  const getAllSelectedTiles = (options?: { includeWinningTile?: boolean }) => {
    const tiles: Tile[] = [...hand];
    melds.forEach(meld => tiles.push(...meld.tiles));
    tiles.push(...meldInput);
    if (winningTile && options?.includeWinningTile !== false) {
      tiles.push(winningTile);
    }
    return tiles;
  };

  const exceedsTileLimit = (tile: Tile, options?: { includeWinningTile?: boolean }) => {
    const count = getAllSelectedTiles(options).filter(t => t === tile).length;
    if (count >= 4) {
      setError('同じ牌は4枚まで選択できます');
      return true;
    }
    return false;
  };

  const addDoraTileValue = (type: 'dora' | 'ura') => {
    const target = type === 'dora' ? doraTiles : uraDoraTiles;
    const setter = type === 'dora' ? setDoraTiles : setUraDoraTiles;
    const selectedTile = type === 'dora' ? doraSelect : uraDoraSelect;

    if (type === 'ura' && !riichi) {
      setError('裏ドラはリーチ時のみ設定できます');
      return;
    }

    if (target.length >= 4) {
      setError('各ドラは最大4枚まで設定できます');
      return;
    }

    setter([...target, selectedTile]);
    setError('');
  };

  const removeDoraTileValue = (index: number, type: 'dora' | 'ura') => {
    const target = type === 'dora' ? doraTiles : uraDoraTiles;
    const setter = type === 'dora' ? setDoraTiles : setUraDoraTiles;
    const updated = [...target];
    updated.splice(index, 1);
    setter(updated);
  };

  const toggleAkaDora = (type: 'man' | 'pin' | 'sou') => {
    const nextValue = !akaDora[type];
    if (nextValue) {
      const targetTile: Tile = type === 'man' ? '5m' : type === 'pin' ? '5p' : '5s';
      const available = getAllSelectedTiles().filter(t => t === targetTile).length;
      if (available === 0) {
        setError(`${TILE_DISPLAY[targetTile]}を手牌または鳴きに含めてください`);
        return;
      }
    }
    setAkaDora(prev => ({ ...prev, [type]: nextValue }));
    setError('');
  };

  const addTileFromInput = () => {
    const normalized = normalizeTileCode(tileInput);
    if (!normalized) {
      setError('牌コードを正しく入力してください');
      return;
    }
    addTileToHand(normalized);
    setTileInput('');
  };

  const setWinningTileFromInput = () => {
    const normalized = normalizeTileCode(tileInput);
    if (!normalized) {
      setError('牌コードを正しく入力してください');
      return;
    }
    setWinningTileHandler(normalized);
    setTileInput('');
  };

  const pushHistoryEntry = (calcResult: CalculationResult, optionsSnapshot: AgariOptions) => {
    if (!winningTile) return;
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      hand: [...hand],
      winningTile,
      options: cloneOptionsForHistory(optionsSnapshot),
      result: calcResult
    };
    setHistory(prev => {
      const updated = [entry, ...prev];
      return updated.slice(0, 5);
    });
  };

  const restoreHistoryEntry = (entry: HistoryEntry) => {
    setHand(entry.hand);
    setWinningTile(entry.winningTile);
    setAgariType(entry.options.isTsumo ? 'tsumo' : 'ron');
    setBakaze(entry.options.bakaze);
    setJikaze(entry.options.jikaze);
    setRiichi(entry.options.isRiichi);
    setIsDoubleRiichi(Boolean(entry.options.isDoubleRiichi));
    setIppatsu(entry.options.isIppatsu);
    setMenzen(entry.options.isMenzen);
    setIsDealer(entry.options.isOya);
    setMelds(entry.options.melds ? entry.options.melds.map(meld => ({ type: meld.type, tiles: [...meld.tiles] })) : []);
    setIsTenhou(Boolean(entry.options.isTenhou));
    setIsChiihou(Boolean(entry.options.isChiihou));
    setIsHaitei(Boolean(entry.options.isHaitei));
    setIsHoutei(Boolean(entry.options.isHoutei));
    setIsRinshan(Boolean(entry.options.isRinshan));
    setIsChankan(Boolean(entry.options.isChankan));
    setIsNagashiMangan(Boolean(entry.options.isNagashiMangan));
    setDoraTiles(entry.options.doraTiles || []);
    setUraDoraTiles(entry.options.uraDoraTiles || []);
    setAkaDora({
      man: Boolean(entry.options.redDora?.man),
      pin: Boolean(entry.options.redDora?.pin),
      sou: Boolean(entry.options.redDora?.sou)
    });
    setResult(entry.result);
    setError('');
    setActiveHistoryId(entry.id);
    setActiveHistoryTab('hand');
  };

  // 鳴きの状態に応じて門前/リーチを制御（暗槓は門前扱い）
  useEffect(() => {
    const hasOpenMeld = melds.some(meld => meld.type !== 'ankan');
    if (hasOpenMeld) {
      if (menzen) {
        setMenzen(false);
      }
      if (riichi) {
        setRiichi(false);
      }
      if (isDoubleRiichi) {
        setIsDoubleRiichi(false);
      }
      if (ippatsu) {
        setIppatsu(false);
      }
    } else if (!menzen) {
      setMenzen(true);
    }
  }, [melds, menzen, riichi, isDoubleRiichi, ippatsu]);

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
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      try {
        const parsed: HistoryEntry[] = JSON.parse(stored);
        setHistory(parsed);
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const addTileToHand = (tile: Tile) => {
    const meldTileCount = getMeldTileCount(melds);
    const maxHandSize = 14 - meldTileCount - 1;

    if (hand.length >= maxHandSize) {
      if (exceedsTileLimit(tile, { includeWinningTile: false })) {
        return;
      }
      setWinningTile(tile);
      setError('');
      return;
    }
    if (exceedsTileLimit(tile)) {
      return;
    }
    setHand(sortHand([...hand, tile]));
    setError('');
  };

  const addTileToMeld = (tile: Tile) => {
    const requiredTiles = meldType === 'ankan' || meldType === 'minkan' ? 4 : 3;
    if (meldInput.length < requiredTiles) {
      if (exceedsTileLimit(tile)) {
        return;
      }
      setMeldInput([...meldInput, tile]);
      setError('');
    }
  };

  const removeTileFromMeld = (index: number) => {
    const newMeldInput = [...meldInput];
    newMeldInput.splice(index, 1);
    setMeldInput(newMeldInput);
  };

  const addMeld = () => {
    const requiredTiles = meldType === 'ankan' || meldType === 'minkan' ? 4 : 3;
    if (meldInput.length !== requiredTiles) {
      setError(`${requiredTiles}枚の牌を選択してください`);
      return;
    }
    setMelds([...melds, { type: meldType, tiles: meldInput }]);
    setMeldInput([]);
    setError('');
  };

  const removeMeld = (index: number) => {
    const newMelds = [...melds];
    newMelds.splice(index, 1);
    setMelds(newMelds);
  };

  const setWinningTileHandler = (tile: Tile) => {
    setWinningTile(tile);
    setError('');
  };

  const removeTileFromHand = (index: number) => {
    const newHand = [...hand];
    newHand.splice(index, 1);
    setHand(newHand);
  };

  const removeWinningTile = () => {
    setWinningTile(null);
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
    setMenzen(true);
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
    setAkaDora({ man: false, pin: false, sou: false });
    setDoraSelect(ALL_TILES[0]);
    setUraDoraSelect(ALL_TILES[0]);
  };

  const handleCalculate = () => {
    if (!winningTile) {
      setError('和了牌を選択してください');
      return;
    }

    const options: AgariOptions = {
      isTsumo: agariType === 'tsumo',
      bakaze,
      jikaze,
      isRiichi: riichi,
      isDoubleRiichi,
      isIppatsu: ippatsu,
      isMenzen: menzen,
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
      redDora: {
        man: akaDora.man ? 1 : 0,
        pin: akaDora.pin ? 1 : 0,
        sou: akaDora.sou ? 1 : 0
      }
    };

    const calcResult = calculateScore(hand, winningTile, options);

    if ('error' in calcResult) {
      setError(calcResult.error);
      setResult(null);
    } else {
      setResult(calcResult);
      setError('');
      pushHistoryEntry(calcResult, options);
    }
  };

  return (
    <div className="container">
      <h1>🀄 麻雀点数計算機</h1>

      {/* 牌選択セクション */}
      <div className="section">
        <div className="section-title">牌を選択</div>
        <div className="tile-selector">
          <div className="tile-group">
            <div className="tile-group-title">萬子（マンズ）</div>
            <div className="tiles">
              {TILES.manzu.map(tile => (
                <div
                  key={tile}
                  className="tile"
                  onClick={() => addTileToHand(tile)}
                >
                  <TileFace tile={tile} />
                </div>
              ))}
            </div>
          </div>
          <div className="tile-group">
            <div className="tile-group-title">筒子（ピンズ）</div>
            <div className="tiles">
              {TILES.pinzu.map(tile => (
                <div
                  key={tile}
                  className="tile"
                  onClick={() => addTileToHand(tile)}
                >
                  <TileFace tile={tile} />
                </div>
              ))}
            </div>
          </div>
          <div className="tile-group">
            <div className="tile-group-title">索子（ソーズ）</div>
            <div className="tiles">
              {TILES.souzu.map(tile => (
                <div
                  key={tile}
                  className="tile"
                  onClick={() => addTileToHand(tile)}
                >
                  <TileFace tile={tile} />
                </div>
              ))}
            </div>
          </div>
          <div className="tile-group">
            <div className="tile-group-title">字牌</div>
            <div className="tiles">
              {TILES.jihai.map(tile => (
                <div
                  key={tile}
                  className="tile"
                  onClick={() => addTileToHand(tile)}
                >
                  <TileFace tile={tile} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 現在の手牌表示 */}
      <div className="section">
        <div className="section-title">現在の手牌</div>
        <div className="hand-display">
          <div className="hand-title">手牌 (<span>{hand.length}</span>/{14 - getMeldTileCount(melds) - 1}枚)</div>
          <div className="hand-tiles">
            {hand.map((tile, index) => (
              <div
                key={index}
                className="hand-tile"
                onClick={() => removeTileFromHand(index)}
              >
                <TileFace tile={tile} />
              </div>
            ))}
          </div>
          <div className="info-text">※ 手牌は自動的にソートされます。</div>
        </div>

        {/* 鳴き表示 */}
        <div className="hand-display" style={{ marginTop: '15px' }}>
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
                  {meld.tiles.map((tile, tileIndex) => (
                    <div key={tileIndex} className="hand-tile" style={{ fontSize: '14px' }}>
                      <TileFace tile={tile} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="info-text">※ クリックして削除できます。</div>
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
          <div className="tile-selector" style={{ fontSize: '12px', marginBottom: '10px' }}>
            <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>牌を選択:</div>
            <div className="tile-group">
              <div className="tiles">
                {[...TILES.manzu, ...TILES.pinzu, ...TILES.souzu, ...TILES.jihai].map(tile => (
                  <div
                    key={tile}
                    className="tile tile--mini"
                    onClick={() => addTileToMeld(tile)}
                  >
                    <TileFace tile={tile} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="hand-tiles">
            {meldInput.map((tile, index) => (
              <div
                key={index}
                className="hand-tile"
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
              onClick={() => setMeldInput([])}
              disabled={meldInput.length === 0}
            >
              入力をクリア
            </button>
          </div>
          <div className="info-text" style={{ marginTop: '10px' }}>
            ※ チー・ポンは3枚、カンは4枚選択してください。
          </div>
        </div>

        <div className="hand-display" style={{ marginTop: '15px' }}>
          <div className="hand-title">和了牌 (<span>{winningTile ? 1 : 0}</span>/1枚)</div>
          <div className="hand-tiles">
            {winningTile && (
              <div
                className="hand-tile winning-tile"
                onClick={removeWinningTile}
              >
                <TileFace tile={winningTile} />
              </div>
            )}
          </div>
          <div className="info-text">※ 和了した牌を1枚選択してください。</div>
        </div>
        <div className="controls">
          <button className="btn btn-danger" onClick={clearAll}>すべてクリア</button>
        </div>
      </div>

      {/* オプション設定 */}
      <div className="section">
        <div className="section-title">和了条件</div>
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
                    if (checked) {
                      setMenzen(true);
                    } else {
                      setIppatsu(false);
                      setIsDoubleRiichi(false);
                    }
                  }}
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
                      setMenzen(true);
                    }
                  }}
                  disabled={!menzen}
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
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={menzen}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setMenzen(checked);
                    if (!checked) {
                      setRiichi(false);
                      setIppatsu(false);
                      setIsDoubleRiichi(false);
                    }
                  }}
                />
                門前（鳴きなし）
              </label>
            </div>
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
              <div className="option-group" style={{ marginTop: '8px' }}>
                <select value={doraSelect} onChange={(e) => setDoraSelect(e.target.value as Tile)}>
                  {ALL_TILES.map(tile => (
                    <option key={tile} value={tile}>
                      {TILE_DISPLAY[tile]}
                    </option>
                  ))}
                </select>
                <button className="btn" style={{ marginLeft: '8px' }} onClick={() => addDoraTileValue('dora')}>
                  追加
                </button>
              </div>
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
              <div className="option-group" style={{ marginTop: '8px' }}>
                <select value={uraDoraSelect} onChange={(e) => setUraDoraSelect(e.target.value as Tile)}>
                  {ALL_TILES.map(tile => (
                    <option key={tile} value={tile}>
                      {TILE_DISPLAY[tile]}
                    </option>
                  ))}
                </select>
                <button
                  className="btn"
                  style={{ marginLeft: '8px' }}
                  onClick={() => addDoraTileValue('ura')}
                  disabled={!riichi}
                >
                  追加
                </button>
              </div>
              {!riichi && <div className="info-text">リーチ時のみ有効です</div>}
            </div>
            <div className="dora-block" style={{ marginTop: '10px' }}>
              <div className="option-subtitle">赤ドラ</div>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={akaDora.man}
                    onChange={() => toggleAkaDora('man')}
                  />
                  赤5m
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={akaDora.pin}
                    onChange={() => toggleAkaDora('pin')}
                  />
                  赤5p
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={akaDora.sou}
                    onChange={() => toggleAkaDora('sou')}
                  />
                  赤5s
                </label>
              </div>
              <div className="info-text">※ 対応する5の牌が手牌/鳴きに含まれている必要があります。</div>
            </div>
          </div>
        </div>
        <div className="hand-display" style={{ marginTop: '20px' }}>
          <div className="hand-title">キーボード入力</div>
          <div className="tile-input-card">
            <input
              type="text"
              value={tileInput}
              placeholder="例: 1m, 9p, ton, 中"
              onChange={(e) => setTileInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addTileFromInput();
                }
              }}
            />
            <div className="tile-input-actions">
              <button className="btn btn-primary" onClick={addTileFromInput}>手牌に追加</button>
              <button className="btn" onClick={setWinningTileFromInput}>和了牌に設定</button>
            </div>
            <div className="info-text">※ 牌コードを入力して Enter またはボタンで追加できます。</div>
          </div>
        </div>
      </div>

      {/* 計算ボタン */}
      <div className="section">
        <button
          className="btn btn-primary"
          onClick={handleCalculate}
          style={{ width: '100%', fontSize: '1.2em', padding: '15px' }}
        >
          点数を計算する
        </button>
      </div>

      <div className="section">
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
                  <button className="btn btn-secondary" onClick={() => restoreHistoryEntry(entry)}>
                    この手を再表示
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
                          </div>
                        )}
                        {activeHistoryTab === 'result' && (
                          <div>
                            <div>翻数: {entry.result.han}翻 / 符: {entry.result.fu}符</div>
                            <div style={{ marginTop: '4px' }}>点数: {entry.result.score}</div>
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

      {/* 結果表示 */}
      {result && (
        <div>
          <div className="section">
            <div className="section-title">計算結果</div>
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
            </div>
            <div className="yaku-list">
              <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#667eea', fontSize: '1.2em' }}>
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
                    fontSize: '1.1em',
                    padding: '12px 15px',
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
        </div>
      )}

      {/* エラーメッセージ */}
      {error && (
        <div className="error-message show">
          {error}
        </div>
      )}
    </div>
  );
}
