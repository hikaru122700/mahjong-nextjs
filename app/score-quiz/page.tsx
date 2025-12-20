'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { calculateScore, type AgariOptions, type Tile } from '@/lib/mahjong';
import TileFace from '@/app/components/TileFace';

type QuizQuestion = {
  id: string;
  hand: Tile[];
  winningTile: Tile;
  options: AgariOptions;
  label: string;
};

const buildOptions = (overrides: Partial<AgariOptions>): AgariOptions => ({
  isTsumo: false,
  bakaze: 'ton',
  jikaze: 'ton',
  isRiichi: false,
  isDoubleRiichi: false,
  isIppatsu: false,
  isMenzen: true,
  isOya: false,
  melds: undefined,
  isTenhou: false,
  isChiihou: false,
  isHaitei: false,
  isHoutei: false,
  isRinshan: false,
  isChankan: false,
  isNagashiMangan: false,
  doraTiles: [],
  uraDoraTiles: [],
  redDora: { man: 0, pin: 0, sou: 0 },
  ...overrides
});

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    label: '平和ツモ（子）',
    hand: ['2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '6m', '7m', '2p', '2p'],
    winningTile: '8m',
    options: buildOptions({ isTsumo: true, isOya: false, isRiichi: true })
  },
  {
    id: 'q2',
    label: 'タンヤオ系ロン（子）',
    hand: ['2m', '3m', '4m', '2p', '3p', '4p', '6s', '7s', '8s', '5m', '6m', '6p', '6p'],
    winningTile: '7m',
    options: buildOptions({ isTsumo: false, isOya: false, isRiichi: true })
  },
  {
    id: 'q3',
    label: '役牌ロン（親）',
    hand: ['東', '東', '2m', '3m', '4m', '2p', '3p', '4p', '5s', '6s', '7s', '9p', '9p'],
    winningTile: '東',
    options: buildOptions({ isTsumo: false, isOya: true, bakaze: 'ton' })
  }
];

type ExpectedScore =
  | { type: 'ron'; ron: number }
  | { type: 'tsumo-oya'; perPerson: number }
  | { type: 'tsumo-ko'; ko: number; oya: number };

const parseExpectedScore = (scoreText: string): ExpectedScore | null => {
  const tsumoKoMatch = scoreText.match(/子:\s*(\d+)点、親:\s*(\d+)点/);
  if (tsumoKoMatch) {
    return { type: 'tsumo-ko', ko: Number(tsumoKoMatch[1]), oya: Number(tsumoKoMatch[2]) };
  }
  const tsumoOyaMatch = scoreText.match(/(\d+)点オール/);
  if (tsumoOyaMatch) {
    return { type: 'tsumo-oya', perPerson: Number(tsumoOyaMatch[1]) };
  }
  const ronMatch = scoreText.match(/(\d+)点/);
  if (ronMatch) {
    return { type: 'ron', ron: Number(ronMatch[1]) };
  }
  return null;
};

export default function ScoreQuizPage() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState({
    ron: '',
    tsumoTotal: '',
    tsumoAll: ''
  });
  const [judgeResult, setJudgeResult] = useState<{ ok: boolean; expectedText: string } | null>(null);

  const question = QUESTIONS[questionIndex % QUESTIONS.length];
  const calcResult = useMemo(
    () => calculateScore(question.hand, question.winningTile, question.options),
    [question]
  );

  const expected = 'error' in calcResult ? null : parseExpectedScore(calcResult.score);

  const expectedText = useMemo(() => {
    if (!expected) return '';
    if (expected.type === 'ron') return `${expected.ron}点`;
    if (expected.type === 'tsumo-oya') return `${expected.perPerson}点オール`;
    return `子: ${expected.ko}点 / 親: ${expected.oya}点`;
  }, [expected]);

  const isInputCorrect = () => {
    if (!expected) return false;
    if (expected.type === 'ron') {
      const input = Number(answer.ron);
      return !Number.isNaN(input) && input === expected.ron;
    }
    if (expected.type === 'tsumo-oya') {
      const input = Number(answer.tsumoAll);
      return !Number.isNaN(input) && input === expected.perPerson;
    }
    const inputTotal = Number(answer.tsumoTotal);
    const total = expected.ko * 2 + expected.oya;
    return !Number.isNaN(inputTotal) && inputTotal === total;
  };

  const handleJudge = (choice: 'ok' | 'ng') => {
    if (!expected) return;
    const inputOk = isInputCorrect();
    const ok = choice === 'ok' ? inputOk : !inputOk;
    setJudgeResult({ ok, expectedText });
  };

  const handleNext = () => {
    const next = QUESTIONS.length > 1
      ? Math.floor(Math.random() * QUESTIONS.length)
      : 0;
    setQuestionIndex(next);
    setAnswer({ ron: '', tsumoTotal: '', tsumoAll: '' });
    setJudgeResult(null);
  };

  const renderInput = () => {
    if (!expected) {
      return <div className="info-text">問題の計算に失敗しました。</div>;
    }
    if (expected.type === 'ron') {
      return (
        <label className="checkbox-label">
          ロン点数
          <input
            type="number"
            value={answer.ron}
            onChange={(e) => setAnswer(prev => ({ ...prev, ron: e.target.value }))}
          />
        </label>
      );
    }
    if (expected.type === 'tsumo-oya') {
      return (
        <label className="checkbox-label">
          ツモ（オール）
          <input
            type="number"
            value={answer.tsumoAll}
            onChange={(e) => setAnswer(prev => ({ ...prev, tsumoAll: e.target.value }))}
          />
        </label>
      );
    }
    return (
      <label className="checkbox-label">
        ツモ合計
        <input
          type="number"
          value={answer.tsumoTotal}
          onChange={(e) => setAnswer(prev => ({ ...prev, tsumoTotal: e.target.value }))}
        />
      </label>
    );
  };

  return (
    <div className="container">
      <h1>🀄 点数○×ゲーム</h1>
      <div className="controls" style={{ justifyContent: 'center' }}>
        <Link className="btn btn-secondary" href="/">点数計算に戻る</Link>
      </div>

      <div className="section compact">
        <div className="section-title">問題</div>
        <div className="info-text">{question.label}</div>
        <div className="hand-display">
          <div className="hand-title">手牌</div>
          <div className="hand-tiles">
            {question.hand.map((tile, index) => (
              <div key={`${tile}-${index}`} className="hand-tile">
                <TileFace tile={tile} />
              </div>
            ))}
            <div className="hand-tile winning-tile">
              <TileFace tile={question.winningTile} />
            </div>
          </div>
        </div>
        <div className="hand-display">
          <div className="hand-title">条件</div>
          <div className="history-option-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '6px' }}>
            <div>和了方法: {question.options.isTsumo ? 'ツモ' : 'ロン'}</div>
            <div>親番: {question.options.isOya ? '親' : '子'}</div>
            <div>場風: {question.options.bakaze}</div>
            <div>自風: {question.options.jikaze}</div>
            <div>リーチ: {question.options.isRiichi ? 'あり' : 'なし'}</div>
            <div>門前: {question.options.isMenzen ? 'あり' : 'なし'}</div>
          </div>
        </div>
        <div className="hand-display">
          <div className="hand-title">候補点数</div>
          {expectedText ? (
            <div className="info-text">{expectedText}</div>
          ) : (
            <div className="info-text">未計算</div>
          )}
        </div>
      </div>

      <div className="section compact">
        <div className="section-title">解答入力</div>
        {renderInput()}
        <div className="controls" style={{ marginTop: '12px' }}>
          <button className="btn btn-primary" onClick={() => handleJudge('ok')}>○ 正しい</button>
          <button className="btn btn-danger" onClick={() => handleJudge('ng')}>× 間違い</button>
          <button className="btn btn-secondary" onClick={handleNext}>次の問題</button>
        </div>
        {judgeResult && (
          <div className="info-text" style={{ marginTop: '10px' }}>
            {judgeResult.ok ? '○ 正解！' : `× 不正解（正解: ${judgeResult.expectedText}）`}
          </div>
        )}
        {'error' in calcResult && (
          <div className="error-message show" style={{ marginTop: '10px' }}>
            {calcResult.error}
          </div>
        )}
      </div>
    </div>
  );
}
