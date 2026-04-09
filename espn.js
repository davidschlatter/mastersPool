/* ==========================================================================
   espn.js — Fetches and normalizes the current golf leaderboard from ESPN.
   Uses the public ESPN site API (returns JSON). The JSON response is much
   more reliable than scraping the HTML page, which reshapes after the cut.
   ========================================================================== */

(function (global) {
  'use strict';

  // Primary endpoint: the generic golf leaderboard returns the currently
  // featured PGA Tour event (which during Masters week = The Masters).
  const ENDPOINTS = [
    'https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard',
    'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard'
  ];

  // Fallback CORS proxies in case direct fetch is blocked (ESPN normally
  // sends CORS headers, but we want robustness for GitHub Pages hosting).
  const CORS_PROXIES = [
    (url) => 'https://corsproxy.io/?' + encodeURIComponent(url),
    (url) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)
  ];

  async function tryFetch(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function fetchLeaderboardRaw() {
    const errors = [];

    // 1) Direct requests first
    for (const endpoint of ENDPOINTS) {
      try {
        return await tryFetch(endpoint);
      } catch (e) {
        errors.push(`${endpoint}: ${e.message}`);
      }
    }
    // 2) Proxied fallbacks
    for (const endpoint of ENDPOINTS) {
      for (const proxy of CORS_PROXIES) {
        try {
          return await tryFetch(proxy(endpoint));
        } catch (e) {
          errors.push(`${proxy(endpoint)}: ${e.message}`);
        }
      }
    }
    throw new Error('All endpoints failed:\n' + errors.join('\n'));
  }

  // --- Helpers ---------------------------------------------------------------

  // Parse a "score to par" string like "-5", "E", "+3", "" into a number.
  function parseToPar(value) {
    if (value == null) return null;
    if (typeof value === 'number') return value;
    const s = String(value).trim().toUpperCase();
    if (s === '' || s === '-' || s === '--') return null;
    if (s === 'E' || s === 'EVEN' || s === '0') return 0;
    // ESPN sometimes uses the UTF-8 minus sign
    const cleaned = s.replace(/[−–—]/g, '-');
    const n = parseInt(cleaned, 10);
    return Number.isFinite(n) ? n : null;
  }

  // Format a numeric "to par" back to "-5", "E", "+3".
  function formatToPar(n) {
    if (n == null || !Number.isFinite(n)) return '—';
    if (n === 0) return 'E';
    if (n > 0) return '+' + n;
    return String(n);
  }

  // Detect cut/withdraw/DQ from various ESPN shapes.
  function detectCut(competitor) {
    const status = competitor.status || {};
    const posName = (status.position?.displayName || status.position?.id || '').toString().toUpperCase();
    const typeName = (status.type?.name || status.type?.description || '').toString().toUpperCase();
    const flags = [posName, typeName].join(' ');
    if (/CUT/.test(flags)) return { cut: true, reason: 'CUT' };
    if (/WD|WITHDRAW/.test(flags)) return { cut: true, reason: 'WD' };
    if (/DQ|DISQUALIF/.test(flags)) return { cut: true, reason: 'DQ' };
    return { cut: false, reason: null };
  }

  // Determine whether Friday (round 2) is finished — used for the "99 score"
  // rule. We consider Friday complete when round >= 3, or when the current
  // round is 2 and the competition status is "post" (finished).
  function determinePastFriday(status, competitors) {
    const period = status?.period ?? status?.type?.period ?? 0;
    const state = (status?.type?.state || '').toLowerCase();

    if (period >= 3) return true;
    if (period === 2 && state === 'post') return true;

    // Heuristic fallback: if any competitor has CUT status, ESPN has applied
    // the cut which only happens after Friday.
    if (competitors && competitors.some((c) => detectCut(c).cut)) return true;

    return false;
  }

  // Extract a numeric "to par" score from a competitor across the various
  // shapes the ESPN API returns.
  function extractScore(competitor) {
    // Preferred: statistics[] with name "scoreToPar" or abbreviation "TOT"
    const stats = competitor.statistics || [];
    for (const stat of stats) {
      const name = (stat.name || '').toLowerCase();
      const abbr = (stat.abbreviation || '').toLowerCase();
      if (name === 'scoretopar' || name === 'score' || abbr === 'sco' || abbr === 'tot') {
        const v = parseToPar(stat.displayValue ?? stat.value);
        if (v != null) return v;
      }
    }

    // Fallback: competitor.score can be a string or object
    if (competitor.score != null) {
      if (typeof competitor.score === 'object') {
        const v = parseToPar(competitor.score.displayValue ?? competitor.score.value);
        if (v != null) return v;
      } else {
        const v = parseToPar(competitor.score);
        if (v != null) return v;
      }
    }

    // Fallback: sum of round linescores relative to par (less reliable)
    if (Array.isArray(competitor.linescores) && competitor.linescores.length) {
      let total = 0;
      let any = false;
      for (const ls of competitor.linescores) {
        const v = parseToPar(ls.displayValue);
        if (v != null) { total += v; any = true; }
      }
      if (any) return total;
    }

    return null;
  }

  function extractThru(competitor) {
    const status = competitor.status || {};
    // displayValue is often "F", "13", "10:21 AM", etc.
    if (status.displayValue) return String(status.displayValue);
    if (status.thru != null) return status.thru === 18 ? 'F' : String(status.thru);
    if (status.type?.completed) return 'F';
    return '—';
  }

  function extractPosition(competitor) {
    const status = competitor.status || {};
    return (status.position?.displayName || status.position?.id || '').toString();
  }

  // --- Public: fetch + normalize --------------------------------------------

  async function fetchLeaderboard() {
    const data = await fetchLeaderboardRaw();

    // The ESPN payload exposes the current event as either:
    //   data.events[0]  -or-  data.leagues[0]?.events[0] depending on endpoint
    const event =
      data?.events?.[0] ??
      data?.leagues?.[0]?.events?.[0] ??
      null;

    if (!event) {
      return { event: null, players: [], pastFriday: false };
    }

    const competition = event.competitions?.[0] || event;
    const status = competition.status || event.status || {};
    const competitors = competition.competitors || [];

    const pastFriday = determinePastFriday(status, competitors);

    const players = competitors.map((c) => {
      const athlete = c.athlete || c.profile || {};
      const { cut, reason } = detectCut(c);
      const toPar = extractScore(c);
      const position = extractPosition(c);

      // Apply the pool rule: cut players score +99 after Friday.
      let effectiveScore;
      if (cut && pastFriday) {
        effectiveScore = 99;
      } else if (toPar == null) {
        // Player has no score yet (pre-tournament) — treat as 0 so they don't
        // artificially win the pool with a null.
        effectiveScore = 0;
      } else {
        effectiveScore = toPar;
      }

      return {
        id: String(athlete.id ?? c.id ?? athlete.uid ?? ''),
        name: athlete.displayName || athlete.fullName || athlete.name || 'Unknown',
        shortName: athlete.shortName || athlete.displayName || '',
        firstName: athlete.firstName || '',
        lastName: athlete.lastName || '',
        position,
        isCut: cut,
        cutReason: reason,
        toPar,                  // raw score relative to par, may be null
        toParDisplay: formatToPar(toPar),
        effectiveScore,         // what the pool uses for ranking
        thru: extractThru(c),
      };
    });

    // Work out the "winner" (used for tiebreaker 1). The winner exists only
    // when the tournament is complete and someone is in position 1.
    const tournamentComplete =
      (status.type?.state || '').toLowerCase() === 'post' &&
      (status.period || 0) >= 4;

    let winner = null;
    if (tournamentComplete) {
      winner = players.find((p) => /^1$|^T?1$/.test(p.position.replace(/\s/g, '')));
    }

    return {
      event: {
        id: event.id,
        name: event.name || event.shortName || 'Golf Tournament',
        round: status.period ?? null,
        state: status.type?.state ?? null,
        detail: status.type?.detail || status.type?.shortDetail || '',
        complete: tournamentComplete,
      },
      players,
      pastFriday,
      winner,
    };
  }

  // Expose
  global.EspnLeaderboard = {
    fetchLeaderboard,
    parseToPar,
    formatToPar,
  };
})(window);
