'use client';

import { useState } from 'react';
import Link from 'next/link';
import { calculateScore, TILES, type AgariOptions, type Tile } from '@/lib/mahjong';
import TileFace from '@/app/components/TileFace';

type QuizQuestion = {
  id: string;
  hand: Tile[];
  winningTile: Tile;
  options: AgariOptions;
  label: string;
  presentedText: string;
  expectedText: string;
  isCorrect: boolean;
  doraIndicators: Tile[];
};

type CandidateQuestion = {
  tiles: Tile[];
  winningTile: Tile;
  options: AgariOptions;
  label: string;
  requiredYaku: string[];
  doraIndicators: Tile[];
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

const formatExpectedScore = (expected: ExpectedScore): string => {
  if (expected.type === 'ron') return `${expected.ron}点`;
  if (expected.type === 'tsumo-oya') return `${expected.perPerson}点オール`;
  return `子: ${expected.ko}点 / 親: ${expected.oya}点`;
};

const isSameExpectedScore = (a: ExpectedScore, b: ExpectedScore): boolean => {
  if (a.type !== b.type) return false;
  if (a.type === 'ron' && b.type === 'ron') return a.ron === b.ron;
  if (a.type === 'tsumo-oya' && b.type === 'tsumo-oya') return a.perPerson === b.perPerson;
  if (a.type === 'tsumo-ko' && b.type === 'tsumo-ko') return a.ko === b.ko && a.oya === b.oya;
  return false;
};

const SUITS = ['m', 'p', 's'] as const;
const SUIT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const TANYAO_NUMBERS = [2, 3, 4, 5, 6, 7, 8] as const;
const SEQUENCE_STARTS = [1, 2, 3, 4, 5, 6, 7] as const;
const NON_EDGE_SEQUENCE_STARTS = [2, 3, 4, 5, 6] as const;
const HONORS = ['東', '南', '西', '北', '白', '發', '中'] as const;
const YAKUHAI_TILES = ['東', '白', '發', '中'] as const;
const ALL_TILES: Tile[] = [
  ...TILES.manzu,
  ...TILES.pinzu,
  ...TILES.souzu,
  ...TILES.jihai
];
const WIND_LABEL: Record<string, string> = {
  ton: '東',
  nan: '南',
  sha: '西',
  pei: '北'
};
const BALANCE_WINDOW = 10;
const MAX_HAND_TRIES = 140;
const MAX_QUESTION_TRIES = 180;
const MAX_PAIR_TRIES = 40;

const pickOne = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

const getDoraFromIndicator = (tile: Tile): Tile => {
  if (tile.length === 2) {
    const num = Number(tile[0]);
    const suit = tile[1];
    const next = num === 9 ? 1 : num + 1;
    return `${next}${suit}` as Tile;
  }
  const honorOrder: Tile[] = ['東', '南', '西', '北', '白', '發', '中'];
  const index = honorOrder.indexOf(tile);
  return honorOrder[(index + 1) % honorOrder.length];
};

const buildRandomExtras = (): {
  isRiichi: boolean;
  doraIndicators: Tile[];
  doraTiles: Tile[];
} => {
  const isRiichi = Math.random() < 0.35;
  const indicatorCount = Math.random() < 0.4 ? 0 : Math.random() < 0.7 ? 1 : 2;
  const doraIndicators: Tile[] = Array.from({ length: indicatorCount }, () => pickOne(ALL_TILES));
  const doraTiles = doraIndicators.map(getDoraFromIndicator);
  return { isRiichi, doraIndicators, doraTiles };
};

const applyTiles = (counts: Record<string, number>, target: Tile[], tiles: Tile[]): boolean => {
  const addCounts: Record<string, number> = {};
  tiles.forEach(tile => {
    addCounts[tile] = (addCounts[tile] ?? 0) + 1;
  });
  for (const [tile, addCount] of Object.entries(addCounts)) {
    if ((counts[tile] ?? 0) + addCount > 4) return false;
  }
  tiles.forEach(tile => {
    counts[tile] = (counts[tile] ?? 0) + 1;
    target.push(tile);
  });
  return true;
};

const buildHandFromGroups = (groups: Tile[][]): Tile[] | null => {
  const counts: Record<string, number> = {};
  const tiles: Tile[] = [];
  for (const group of groups) {
    if (!applyTiles(counts, tiles, group)) return null;
  }
  return tiles.length === 14 ? tiles : null;
};

const buildSequence = (suit: typeof SUITS[number], start: number): Tile[] => [
  `${start}${suit}`,
  `${start + 1}${suit}`,
  `${start + 2}${suit}`
];

const buildTriplet = (tile: Tile): Tile[] => [tile, tile, tile];

const pickRandomSequence = (startPool: readonly number[] = SEQUENCE_STARTS): Tile[] => {
  const suit = pickOne(SUITS);
  const start = pickOne(startPool);
  return buildSequence(suit, start);
};

const pickRandomTriplet = (includeHonors = true): Tile[] => {
  if (includeHonors && Math.random() < 0.3) {
    const honor = pickOne(HONORS);
    return buildTriplet(honor);
  }
  const suit = pickOne(SUITS);
  const num = pickOne(SUIT_NUMBERS);
  return buildTriplet(`${num}${suit}`);
};

const pickRandomMeld = (includeHonors = true): Tile[] => {
  if (Math.random() < 0.6) return pickRandomSequence();
  return pickRandomTriplet(includeHonors);
};

const pickSuitPair = (numbers: readonly number[] = SUIT_NUMBERS): Tile[] => {
  const suit = pickOne(SUITS);
  const num = pickOne(numbers);
  return [`${num}${suit}`, `${num}${suit}`];
};

const pickHonorPair = (): Tile[] => {
  const honor = pickOne(HONORS);
  return [honor, honor];
};

const removeOneTile = (tiles: Tile[], tile: Tile): Tile[] | null => {
  const index = tiles.indexOf(tile);
  if (index === -1) return null;
  return [...tiles.slice(0, index), ...tiles.slice(index + 1)];
};

const createTanyaoHand = (): Tile[] | null => {
  for (let attempt = 0; attempt < MAX_HAND_TRIES; attempt += 1) {
    const counts: Record<string, number> = {};
    const tiles: Tile[] = [];
    let ok = true;
    for (let i = 0; i < 4; i += 1) {
      const useShuntsu = Math.random() < 0.7;
      const meld = useShuntsu
        ? buildSequence(pickOne(SUITS), pickOne([2, 3, 4, 5, 6]))
        : buildTriplet(`${pickOne(TANYAO_NUMBERS)}${pickOne(SUITS)}`);
      if (!applyTiles(counts, tiles, meld)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    let pairOk = false;
    for (let attemptPair = 0; attemptPair < MAX_PAIR_TRIES; attemptPair += 1) {
      const pair = pickSuitPair(TANYAO_NUMBERS);
      if (applyTiles(counts, tiles, pair)) {
        pairOk = true;
        break;
      }
    }
    if (!pairOk) continue;
    if (tiles.length === 14) return tiles;
  }
  return null;
};

const createAnyMenzenHand = (): Tile[] | null => {
  for (let attempt = 0; attempt < MAX_HAND_TRIES; attempt += 1) {
    const counts: Record<string, number> = {};
    const tiles: Tile[] = [];
    let ok = true;
    for (let i = 0; i < 4; i += 1) {
      const meld = pickRandomMeld(true);
      if (!applyTiles(counts, tiles, meld)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    let pairOk = false;
    for (let attemptPair = 0; attemptPair < MAX_PAIR_TRIES; attemptPair += 1) {
      const pair = Math.random() < 0.2 ? pickHonorPair() : pickSuitPair();
      if (applyTiles(counts, tiles, pair)) {
        pairOk = true;
        break;
      }
    }
    if (!pairOk) continue;
    if (tiles.length === 14) return tiles;
  }
  return null;
};

const createYakuhaiHand = (): Tile[] | null => {
  for (let attempt = 0; attempt < MAX_HAND_TRIES; attempt += 1) {
    const counts: Record<string, number> = {};
    const tiles: Tile[] = [];
    const yakuhai = pickOne(YAKUHAI_TILES);
    if (!applyTiles(counts, tiles, buildTriplet(yakuhai))) continue;
    let ok = true;
    for (let i = 0; i < 3; i += 1) {
      const meld = pickRandomMeld(false);
      if (!applyTiles(counts, tiles, meld)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    let pairOk = false;
    for (let attemptPair = 0; attemptPair < MAX_PAIR_TRIES; attemptPair += 1) {
      const pair = pickSuitPair();
      if (applyTiles(counts, tiles, pair)) {
        pairOk = true;
        break;
      }
    }
    if (!pairOk) continue;
    if (tiles.length === 14) return tiles;
  }
  return null;
};

const createSanshokuHand = (): Tile[] | null => {
  for (let attempt = 0; attempt < MAX_HAND_TRIES; attempt += 1) {
    const start = pickOne(SEQUENCE_STARTS);
    const groups: Tile[][] = [
      buildSequence('m', start),
      buildSequence('p', start),
      buildSequence('s', start),
      pickRandomMeld(false)
    ];
    const pair = pickSuitPair();
    const tiles = buildHandFromGroups([...groups, pair]);
    if (tiles) return tiles;
  }
  return null;
};

const createIttsuuHand = (): Tile[] | null => {
  for (let attempt = 0; attempt < MAX_HAND_TRIES; attempt += 1) {
    const suit = pickOne(SUITS);
    const groups: Tile[][] = [
      buildSequence(suit, 1),
      buildSequence(suit, 4),
      buildSequence(suit, 7),
      pickRandomMeld(false)
    ];
    const pair = pickSuitPair();
    const tiles = buildHandFromGroups([...groups, pair]);
    if (tiles) return tiles;
  }
  return null;
};

const createHonitsuHand = (): Tile[] | null => {
  for (let attempt = 0; attempt < MAX_HAND_TRIES; attempt += 1) {
    const suit = pickOne(SUITS);
    const groups: Tile[][] = [];
    for (let i = 0; i < 4; i += 1) {
      const useShuntsu = Math.random() < 0.7;
      const meld = useShuntsu
        ? buildSequence(suit, pickOne(SEQUENCE_STARTS))
        : buildTriplet(`${pickOne(SUIT_NUMBERS)}${suit}`);
      groups.push(meld);
    }
    const pair = pickHonorPair();
    const tiles = buildHandFromGroups([...groups, pair]);
    if (tiles) return tiles;
  }
  return null;
};

const createPinfuHand = (): { tiles: Tile[]; winningTile: Tile } | null => {
  for (let attempt = 0; attempt < MAX_HAND_TRIES; attempt += 1) {
    const counts: Record<string, number> = {};
    const tiles: Tile[] = [];
    const sequences: Tile[][] = [];
    let ok = true;
    for (let i = 0; i < 4; i += 1) {
      const sequence = pickRandomSequence(NON_EDGE_SEQUENCE_STARTS);
      if (!applyTiles(counts, tiles, sequence)) {
        ok = false;
        break;
      }
      sequences.push(sequence);
    }
    if (!ok) continue;
    let pairOk = false;
    for (let attemptPair = 0; attemptPair < MAX_PAIR_TRIES; attemptPair += 1) {
      const pair = pickSuitPair(TANYAO_NUMBERS);
      if (applyTiles(counts, tiles, pair)) {
        pairOk = true;
        break;
      }
    }
    if (!pairOk) continue;
    if (tiles.length !== 14) continue;
    const waitSequence = pickOne(sequences);
    const winningTile = Math.random() < 0.5 ? waitSequence[0] : waitSequence[2];
    return { tiles, winningTile };
  }
  return null;
};

const chooseCorrectness = (history: boolean[]): boolean => {
  const window = history.slice(-BALANCE_WINDOW);
  const correctCount = window.filter(Boolean).length;
  const incorrectCount = window.length - correctCount;
  if (correctCount > incorrectCount) return false;
  if (incorrectCount > correctCount) return true;
  return Math.random() < 0.5;
};

const makeIncorrectScore = (expected: ExpectedScore): ExpectedScore => {
  const offsets = [100, 200, 300, 400, 500];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const flip = Math.random() < 0.5 ? -1 : 1;
    if (expected.type === 'ron') {
      const offset = pickOne(offsets);
      const candidate = { type: 'ron', ron: Math.max(100, expected.ron + offset * flip) } as const;
      if (!isSameExpectedScore(candidate, expected)) return candidate;
      continue;
    }
    if (expected.type === 'tsumo-oya') {
      const offset = pickOne(offsets);
      const candidate = {
        type: 'tsumo-oya',
        perPerson: Math.max(100, expected.perPerson + offset * flip)
      } as const;
      if (!isSameExpectedScore(candidate, expected)) return candidate;
      continue;
    }
    const offset = pickOne(offsets);
    if (Math.random() < 0.5) {
      const candidate = {
        type: 'tsumo-ko',
        ko: Math.max(100, expected.ko + offset * flip),
        oya: expected.oya
      } as const;
      if (!isSameExpectedScore(candidate, expected)) return candidate;
      continue;
    }
    const candidate = {
      type: 'tsumo-ko',
      ko: expected.ko,
      oya: Math.max(100, expected.oya + offset * flip)
    } as const;
    if (!isSameExpectedScore(candidate, expected)) return candidate;
  }
  if (expected.type === 'ron') return { type: 'ron', ron: expected.ron + 100 };
  if (expected.type === 'tsumo-oya') return { type: 'tsumo-oya', perPerson: expected.perPerson + 100 };
  return { type: 'tsumo-ko', ko: expected.ko + 100, oya: expected.oya };
};

const buildRiichiCandidate = (): CandidateQuestion | null => {
  const tiles = createAnyMenzenHand();
  if (!tiles) return null;
  const extras = buildRandomExtras();
  const winningTile = pickOne(tiles);
  return {
    tiles,
    winningTile,
    options: buildOptions({
      isRiichi: true,
      isTsumo: Math.random() < 0.5,
      isOya: Math.random() < 0.5,
      doraTiles: extras.doraTiles
    }),
    label: 'リーチ',
    requiredYaku: ['リーチ'],
    doraIndicators: extras.doraIndicators
  };
};

const buildPinfuCandidate = (): CandidateQuestion | null => {
  const pinfu = createPinfuHand();
  if (!pinfu) return null;
  const extras = buildRandomExtras();
  return {
    tiles: pinfu.tiles,
    winningTile: pinfu.winningTile,
    options: buildOptions({
      isTsumo: Math.random() < 0.5,
      isOya: Math.random() < 0.5,
      isRiichi: extras.isRiichi,
      doraTiles: extras.doraTiles
    }),
    label: '平和',
    requiredYaku: ['平和'],
    doraIndicators: extras.doraIndicators
  };
};

const buildTanyaoCandidate = (): CandidateQuestion | null => {
  const tiles = createTanyaoHand();
  if (!tiles) return null;
  const extras = buildRandomExtras();
  return {
    tiles,
    winningTile: pickOne(tiles),
    options: buildOptions({
      isTsumo: Math.random() < 0.5,
      isOya: Math.random() < 0.5,
      isRiichi: extras.isRiichi,
      doraTiles: extras.doraTiles
    }),
    label: '断么九',
    requiredYaku: ['断么九'],
    doraIndicators: extras.doraIndicators
  };
};

const buildYakuhaiCandidate = (): CandidateQuestion | null => {
  const tiles = createYakuhaiHand();
  if (!tiles) return null;
  const extras = buildRandomExtras();
  return {
    tiles,
    winningTile: pickOne(tiles),
    options: buildOptions({
      isTsumo: Math.random() < 0.5,
      isOya: Math.random() < 0.5,
      isRiichi: extras.isRiichi,
      doraTiles: extras.doraTiles
    }),
    label: '役牌',
    requiredYaku: ['白', '發', '中', '場風 東', '自風 東', '場風・自風 東'],
    doraIndicators: extras.doraIndicators
  };
};

const buildSanshokuCandidate = (): CandidateQuestion | null => {
  const tiles = createSanshokuHand();
  if (!tiles) return null;
  const extras = buildRandomExtras();
  return {
    tiles,
    winningTile: pickOne(tiles),
    options: buildOptions({
      isTsumo: Math.random() < 0.5,
      isOya: Math.random() < 0.5,
      isRiichi: extras.isRiichi,
      doraTiles: extras.doraTiles
    }),
    label: '三色同順',
    requiredYaku: ['三色同順'],
    doraIndicators: extras.doraIndicators
  };
};

const buildSurpriseCandidate = (): CandidateQuestion | null => {
  const extras = buildRandomExtras();
  if (Math.random() < 0.5) {
    const tiles = createIttsuuHand();
    if (!tiles) return null;
    return {
      tiles,
      winningTile: pickOne(tiles),
      options: buildOptions({
        isTsumo: Math.random() < 0.5,
        isOya: Math.random() < 0.5,
        isRiichi: extras.isRiichi,
        doraTiles: extras.doraTiles
      }),
      label: '意外性枠',
      requiredYaku: ['一気通貫'],
      doraIndicators: extras.doraIndicators
    };
  }
  const tiles = createHonitsuHand();
  if (!tiles) return null;
  return {
    tiles,
    winningTile: pickOne(tiles),
    options: buildOptions({
      isTsumo: Math.random() < 0.5,
      isOya: Math.random() < 0.5,
      isRiichi: extras.isRiichi,
      doraTiles: extras.doraTiles
    }),
    label: '意外性枠',
    requiredYaku: ['混一色'],
    doraIndicators: extras.doraIndicators
  };
};

const CANDIDATE_BUILDERS = [
  buildRiichiCandidate,
  buildPinfuCandidate,
  buildTanyaoCandidate,
  buildYakuhaiCandidate,
  buildSanshokuCandidate,
  buildSurpriseCandidate
];

const generateQuestion = (history: boolean[]): QuizQuestion | null => {
  for (let attempt = 0; attempt < MAX_QUESTION_TRIES; attempt += 1) {
    const builder = pickOne(CANDIDATE_BUILDERS);
    const candidate = builder();
    if (!candidate) continue;
    const hand = removeOneTile(candidate.tiles, candidate.winningTile);
    if (!hand) continue;
    const calcResult = calculateScore(hand, candidate.winningTile, candidate.options);
    if ('error' in calcResult) continue;
    const hasRequired = candidate.requiredYaku.some(required =>
      calcResult.yaku.some(yaku => yaku.name === required)
    );
    if (!hasRequired) continue;
    const expected = parseExpectedScore(calcResult.score);
    if (!expected) continue;
    const expectedText = formatExpectedScore(expected);
    const shouldBeCorrect = chooseCorrectness(history);
    const presented = shouldBeCorrect ? expected : makeIncorrectScore(expected);
    const presentedText = formatExpectedScore(presented);
    return {
      id: `q-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      label: `自動生成（${candidate.label}）`,
      hand,
      winningTile: candidate.winningTile,
      options: candidate.options,
      presentedText,
      expectedText,
      isCorrect: shouldBeCorrect,
      doraIndicators: candidate.doraIndicators
    };
  }
  return null;
};

export default function ScoreQuizPage() {
  const [history, setHistory] = useState<boolean[]>([]);
  const [question, setQuestion] = useState<QuizQuestion | null>(() => generateQuestion([]));
  const [judgeResult, setJudgeResult] = useState<{
    ok: boolean;
    expectedText: string;
    choice: 'ok' | 'ng';
    isCorrect: boolean;
  } | null>(null);

  const handleJudge = (choice: 'ok' | 'ng') => {
    if (!question) return;
    const ok = choice === 'ok' ? question.isCorrect : !question.isCorrect;
    setJudgeResult({
      ok,
      expectedText: question.expectedText,
      choice,
      isCorrect: question.isCorrect
    });
  };

  const handleNext = () => {
    setJudgeResult(null);
    setHistory(prev => {
      const nextHistory = question
        ? [...prev, question.isCorrect].slice(-BALANCE_WINDOW)
        : prev;
      setQuestion(generateQuestion(nextHistory));
      return nextHistory;
    });
  };

  return (
    <div className="container">
      <h1>🀄 点数○×ゲーム</h1>
      <div className="controls" style={{ justifyContent: 'center' }}>
        <Link className="btn btn-secondary" href="/">点数計算に戻る</Link>
      </div>

      <div className="section compact">
        <div className="section-title">問題</div>
        <div className="info-text">{question?.label ?? '問題生成に失敗しました。'}</div>
        <div className="hand-display">
          <div className="hand-title">手牌</div>
          <div className="hand-tiles">
            {question?.hand.map((tile, index) => (
              <div key={`${tile}-${index}`} className="hand-tile">
                <TileFace tile={tile} />
              </div>
            ))}
            {question && (
              <div className="hand-tile winning-tile">
                <TileFace tile={question.winningTile} />
              </div>
            )}
          </div>
        </div>
        <div className="hand-display" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div className="hand-title">条件</div>
            <div className="history-option-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '6px' }}>
              <div>和了方法: {question ? (question.options.isTsumo ? 'ツモ' : 'ロン') : '-'}</div>
              <div>親番: {question ? (question.options.isOya ? '親' : '子') : '-'}</div>
              <div>場風: {question ? (WIND_LABEL[question.options.bakaze] ?? question.options.bakaze) : '-'}</div>
              <div>自風: {question ? (WIND_LABEL[question.options.jikaze] ?? question.options.jikaze) : '-'}</div>
              <div>リーチ: {question ? (question.options.isRiichi ? 'あり' : 'なし') : '-'}</div>
            </div>
          </div>
          <div style={{ minWidth: '160px' }}>
            <div className="hand-title">ドラ表示牌</div>
            {question && question.doraIndicators.length > 0 ? (
              <div className="hand-tiles" style={{ justifyContent: 'flex-end' }}>
                {question.doraIndicators.map((tile, index) => (
                  <div key={`${tile}-${index}`} className="hand-tile">
                    <TileFace tile={tile} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="info-text">なし</div>
            )}
          </div>
        </div>
        <div className="hand-display">
          <div className="hand-title">候補点数</div>
          {question?.presentedText ? (
            <div className="info-text">{question.presentedText}</div>
          ) : (
            <div className="info-text">問題生成に失敗しました。</div>
          )}
        </div>
      </div>

      <div className="section compact">
        <div className="section-title">解答</div>
        <div className="controls" style={{ marginTop: '12px' }}>
          <button className="btn btn-primary" onClick={() => handleJudge('ok')}>○ 正しい</button>
          <button className="btn btn-danger" onClick={() => handleJudge('ng')}>× 間違い</button>
          <button className="btn btn-secondary" onClick={handleNext}>次の問題</button>
        </div>
        {judgeResult && (
          <div className="info-text" style={{ marginTop: '10px' }}>
            <div>{judgeResult.ok ? '○ 正解！' : '× 不正解'}</div>
            <div>あなたの回答: {judgeResult.choice === 'ok' ? '○' : '×'}</div>
            <div>候補は{judgeResult.isCorrect ? '正しい' : '誤り'}でした。</div>
            {judgeResult.ok && judgeResult.choice === 'ng' && (
              <div>正解: {judgeResult.expectedText}</div>
            )}
            {!judgeResult.ok && <div>正解: {judgeResult.expectedText}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
