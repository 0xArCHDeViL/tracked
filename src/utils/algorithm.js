export const CATEGORIES = [
  { id: 'kanji', label: 'Kanji', color: '#FF4B1F', cssVar: 'var(--kanji)', num: '01', weight: 1.20, unit: 'menit', defaultTarget: 30 },
  { id: 'bunpou', label: 'Bunpou', color: '#0047AB', cssVar: 'var(--bunpou)', num: '02', weight: 1.15, unit: 'menit', defaultTarget: 25 },
  { id: 'vocab', label: 'Vocab', color: '#1A8A3E', cssVar: 'var(--vocab)', num: '03', weight: 1.00, unit: 'menit', defaultTarget: 30 },
  { id: 'listening', label: 'Listening', color: '#B8860B', cssVar: 'var(--listening)', num: '04', weight: 0.90, unit: 'menit', defaultTarget: 25 },
];

export function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function formatDateIndo(isoStr) {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${days[date.getDay()]}, ${d} ${months[date.getMonth()]} ${y}`;
}

export function formatShortDate(isoStr) {
  if (!isoStr) return '';
  const [, m, d] = isoStr.split('-');
  return `${d}/${m}`;
}

/**
 * Advanced Cognitive Scoring Algorithm:
 * 1. Cognitive Load Weighted Volume (Kanji 1.2x, Bunpou 1.15x, Vocab 1.0x, Listening 0.9x)
 * 2. Smooth Logarithmic Diminishing Returns: V_eff = 200 * (1 - e^(-V/100)) + 0.15 * V
 * 3. Guarded Shannon Entropy Balance Index: H = -sum(p * ln(p)) / ln(4)
 * 4. Variety Multiplier: 1.0 + (active * 0.15) + (H * 0.40), up to 2.0x
 */
export function computeScore(entry) {
  if (!entry) return 0;

  let weightedVolume = 0;
  let rawVolume = 0;
  let activeCats = 0;

  CATEGORIES.forEach((cat) => {
    const val = Math.max(0, entry[cat.id] || 0);
    rawVolume += val;
    weightedVolume += val * cat.weight;
    if (val > 0) activeCats += 1;
  });

  if (weightedVolume === 0) return 0;

  // Smooth sublinear saturation for minutes-based input
  const saturatedVolume = 200 * (1 - Math.exp(-weightedVolume / 100)) + 0.15 * weightedVolume;

  // Shannon Entropy for category balance
  let entropySum = 0;
  CATEGORIES.forEach((cat) => {
    const catWeighted = (Math.max(0, entry[cat.id] || 0)) * cat.weight;
    const p = catWeighted / weightedVolume;
    if (p > 0) {
      entropySum -= p * Math.log(p);
    }
  });

  const maxEntropy = Math.log(CATEGORIES.length); // ln(4)
  const normalizedEntropy = maxEntropy > 0 ? entropySum / maxEntropy : 0;

  // Variety multiplier: base + active category count bonus + balance harmony bonus
  const varietyMult = Math.min(2.0, 1.0 + activeCats * 0.15 + normalizedEntropy * 0.40);

  return Math.round(saturatedVolume * varietyMult);
}

/**
 * Detailed breakdown for the live math drawer
 */
export function computeScoreBreakdown(entry) {
  const current = entry || {};
  let rawVolume = 0;
  let weightedVolume = 0;
  let activeCats = 0;
  const categoryDetails = [];

  CATEGORIES.forEach((cat) => {
    const val = Math.max(0, current[cat.id] || 0);
    const catWeighted = val * cat.weight;
    rawVolume += val;
    weightedVolume += catWeighted;
    if (val > 0) activeCats += 1;
    categoryDetails.push({
      ...cat,
      value: val,
      weighted: Number(catWeighted.toFixed(1)),
    });
  });

  const saturatedVolume = weightedVolume > 0
    ? 200 * (1 - Math.exp(-weightedVolume / 100)) + 0.15 * weightedVolume
    : 0;

  let entropySum = 0;
  if (weightedVolume > 0) {
    categoryDetails.forEach((cat) => {
      const p = cat.weighted / weightedVolume;
      if (p > 0) entropySum -= p * Math.log(p);
    });
  }

  const maxEntropy = Math.log(CATEGORIES.length);
  const normalizedEntropy = maxEntropy > 0 ? entropySum / maxEntropy : 0;
  const varietyMult = weightedVolume > 0
    ? Math.min(2.0, 1.0 + activeCats * 0.15 + normalizedEntropy * 0.40)
    : 1.0;
  const finalScore = Math.round(saturatedVolume * varietyMult);

  return {
    rawVolume,
    weightedVolume: Number(weightedVolume.toFixed(1)),
    saturatedVolume: Number(saturatedVolume.toFixed(1)),
    activeCats,
    entropy: Number(normalizedEntropy.toFixed(2)),
    varietyMult: Number(varietyMult.toFixed(2)),
    finalScore,
    categoryDetails,
  };
}

/**
 * 14-Day Exponentially Weighted Moving Average (EWMA) Momentum
 */
export function computeMomentum(entries) {
  if (!entries || typeof entries !== 'object') return 0;
  let momentum = 0;
  const alpha = 0.30; // 30% weight to current day, 70% to previous momentum

  for (let i = 14; i >= 0; i--) {
    const date = daysAgoISO(i);
    const score = computeScore(entries[date]);
    momentum = alpha * score + (1 - alpha) * momentum;
  }

  return Math.round(momentum);
}

/**
 * Japanese Mastery Tiers based on EWMA Momentum
 */
export const MASTERY_TIERS = [
  { id: 'ronin', title: '浪人 Rōnin', minMomentum: 0, maxMomentum: 50, color: '#6B6658', desc: 'Memulai perjalanan & membentuk kedisiplinan dasar.' },
  { id: 'shugyosha', title: '修行者 Shugyōsha', minMomentum: 50, maxMomentum: 120, color: '#0047AB', desc: 'Disiplin belajar konsisten setiap hari.' },
  { id: 'tatsujin', title: '達人 Tatsujin', minMomentum: 120, maxMomentum: 200, color: '#1A8A3E', desc: 'Penguasaan tangguh dan momentum belajar tinggi.' },
  { id: 'meijin', title: '名人 Meijin', minMomentum: 200, maxMomentum: 9999, color: '#FF4B1F', desc: 'Tingkat tertinggi — master grind immersion!' },
];

export function getMasteryTier(momentum) {
  const m = Math.max(0, momentum || 0);
  for (let i = MASTERY_TIERS.length - 1; i >= 0; i--) {
    if (m >= MASTERY_TIERS[i].minMomentum) {
      return MASTERY_TIERS[i];
    }
  }
  return MASTERY_TIERS[0];
}

/**
 * Streak counter with 36-hour grace window
 */
export function computeStreak(entriesMap) {
  if (!entriesMap) return 0;
  let streak = 0;
  let cursor = todayISO();

  // If today has 0 points yet, check if yesterday had activity
  if (!entriesMap[cursor] || computeScore(entriesMap[cursor]) === 0) {
    cursor = daysAgoISO(1);
  }

  while (entriesMap[cursor] && computeScore(entriesMap[cursor]) > 0) {
    streak++;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }

  return streak;
}
