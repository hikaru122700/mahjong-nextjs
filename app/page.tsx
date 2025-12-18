'use client';

import { useState } from 'react';
import {
  TILES,
  TILE_DISPLAY,
  sortHand,
  calculateScore,
  type Tile,
  type AgariOptions,
  type CalculationResult
} from '@/lib/mahjong';

export default function Home() {
  const [hand, setHand] = useState<Tile[]>([]);
  const [winningTile, setWinningTile] = useState<Tile | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string>('');
  const [agariType, setAgariType] = useState<'tsumo' | 'ron'>('tsumo');
  const [bakaze, setBakaze] = useState<string>('ton');
  const [jikaze, setJikaze] = useState<string>('ton');
  const [riichi, setRiichi] = useState<boolean>(false);
  const [ippatsu, setIppatsu] = useState<boolean>(false);
  const [menzen, setMenzen] = useState<boolean>(false);

  const addTileToHand = (tile: Tile) => {
    if (hand.length >= 13) {
      setWinningTile(tile);
      return;
    }
    setHand(sortHand([...hand, tile]));
    setError('');
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
      isIppatsu: ippatsu,
      isMenzen: menzen
    };

    const calcResult = calculateScore(hand, winningTile, options);

    if ('error' in calcResult) {
      setError(calcResult.error);
      setResult(null);
    } else {
      setResult(calcResult);
      setError('');
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
                  {TILE_DISPLAY[tile]}
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
                  {TILE_DISPLAY[tile]}
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
                  {TILE_DISPLAY[tile]}
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
                  {TILE_DISPLAY[tile]}
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
          <div className="hand-title">手牌 (<span>{hand.length}</span>/13枚)</div>
          <div className="hand-tiles">
            {hand.map((tile, index) => (
              <div
                key={index}
                className="hand-tile"
                onClick={() => removeTileFromHand(index)}
              >
                {TILE_DISPLAY[tile]}
              </div>
            ))}
          </div>
          <div className="info-text">※ 手牌は自動的にソートされます。</div>
        </div>
        <div className="hand-display" style={{ marginTop: '15px' }}>
          <div className="hand-title">和了牌 (<span>{winningTile ? 1 : 0}</span>/1枚)</div>
          <div className="hand-tiles">
            {winningTile && (
              <div
                className="hand-tile winning-tile"
                onClick={removeWinningTile}
              >
                {TILE_DISPLAY[winningTile]}
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
            <div className="option-title">その他</div>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={riichi}
                  onChange={(e) => setRiichi(e.target.checked)}
                />
                リーチ
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={ippatsu}
                  onChange={(e) => setIppatsu(e.target.checked)}
                />
                一発
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={menzen}
                  onChange={(e) => setMenzen(e.target.checked)}
                />
                門前（鳴きなし）
              </label>
            </div>
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
                <div key={index} className="yaku-item">
                  <span>{yaku.name}</span>
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
