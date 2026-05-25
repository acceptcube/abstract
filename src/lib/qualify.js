// Pure deterministic core of the snapshot mechanic. No IO. Single source of
// truth for the 15 minute rolling hold timer, balance dip reset, exclusions,
// one per wallet, and the first N qualification ordering.

export function makeState() {
  return { started: false, startedAt: null, timers: {}, winners: [], winnerSet: [] };
}

export function processTick(state, balances, now, opts) {
  const { thresholdUi, holdMs, winnerLimit } = opts;
  const justQualified = [];
  const winnerSet = new Set(state.winnerSet);

  if (!state.started) {
    if (balances.size === 0) return justQualified;
    state.started = true;
    state.startedAt = now;
  }

  const holdingNow = new Map();
  for (const [wallet, ui] of balances) {
    if (ui >= thresholdUi) holdingNow.set(wallet, ui);
  }

  for (const wallet of Object.keys(state.timers)) {
    if (state.timers[wallet].since != null && !holdingNow.has(wallet)) {
      state.timers[wallet].since = null;
    }
  }

  for (const [wallet, ui] of holdingNow) {
    if (winnerSet.has(wallet)) continue;
    if (state.winners.length >= winnerLimit) break;
    const t = state.timers[wallet] || { since: null };
    if (t.since == null) t.since = now;
    if (now - t.since >= holdMs) {
      const w = {
        rank: state.winners.length + 1,
        wallet,
        balance: ui,
        qualifiedAt: new Date(now).toISOString(),
      };
      state.winners.push(w);
      winnerSet.add(wallet);
      justQualified.push(w);
    }
    state.timers[wallet] = t;
  }

  state.winnerSet = [...winnerSet];
  return justQualified;
}

export const isComplete = (state, winnerLimit) =>
  state.winners.length >= winnerLimit;
