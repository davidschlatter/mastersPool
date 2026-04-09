/* ==========================================================================
   pool.js — Matches participant picks against the leaderboard and ranks them.
   ========================================================================== */

(function (global) {
  'use strict';

  // --- Name matching --------------------------------------------------------

  // Map non-decomposable Latin letters (NFD leaves these alone) to their
  // closest ASCII equivalents. Needed for names like "Rasmus Højgaard",
  // "Thorbjørn Olesen", "Víctor Pérez", etc. so "o" and "ø" match.
  const LATIN_EXTRAS = {
    'ø': 'o', 'Ø': 'o',
    'æ': 'ae', 'Æ': 'ae',
    'œ': 'oe', 'Œ': 'oe',
    'ß': 'ss',
    'đ': 'd', 'Đ': 'd',
    'ð': 'd', 'Ð': 'd',
    'ł': 'l', 'Ł': 'l',
    'þ': 'th', 'Þ': 'th',
  };

  // Remove punctuation, diacritics, suffixes; lowercase.
  function normalizeName(name) {
    if (!name) return '';
    let s = name.toString();
    // Translate non-decomposable letters first so NFD-safe stripping below
    // doesn't wipe them out entirely (e.g. "ø" would become "").
    s = s.replace(/[øØæÆœŒßđĐðÐłŁþÞ]/g, (c) => LATIN_EXTRAS[c] || c);
    return s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')      // strip combining accents
      .toLowerCase()
      .replace(/\b(jr|sr|ii|iii|iv)\b/g, '')
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Build a lookup index to match picks (entered as strings) to ESPN players.
  // We match on exact full name, then on "last name only", then on
  // "first-initial + last-name" (e.g. "S. Scheffler" == "Scottie Scheffler").
  function buildPlayerIndex(players) {
    const byFull = new Map();
    const byLast = new Map();
    const byInitialLast = new Map();

    for (const p of players) {
      const full = normalizeName(p.name);
      if (full) {
        byFull.set(full, p);
      }
      const parts = full.split(' ').filter(Boolean);
      if (parts.length) {
        const last = parts[parts.length - 1];
        // Support double-barrelled last names by also indexing the last two words
        const lastTwo = parts.slice(-2).join(' ');
        if (!byLast.has(last)) byLast.set(last, p);
        if (!byLast.has(lastTwo)) byLast.set(lastTwo, p);

        if (parts.length > 1) {
          const initial = parts[0][0] + ' ' + last;
          if (!byInitialLast.has(initial)) byInitialLast.set(initial, p);
        }
      }
    }

    return {
      find(query) {
        const norm = normalizeName(query);
        if (!norm) return null;

        if (byFull.has(norm)) return byFull.get(norm);

        const parts = norm.split(' ').filter(Boolean);
        if (!parts.length) return null;

        // Try "first-initial + last" form
        if (parts.length > 1) {
          const initial = parts[0][0] + ' ' + parts.slice(-1)[0];
          if (byInitialLast.has(initial)) return byInitialLast.get(initial);
          const lastTwo = parts.slice(-2).join(' ');
          if (byLast.has(lastTwo)) return byLast.get(lastTwo);
        }

        const last = parts[parts.length - 1];
        if (byLast.has(last)) return byLast.get(last);

        // Loose contains match (last resort)
        for (const [key, player] of byFull.entries()) {
          if (key.includes(norm) || norm.includes(key)) return player;
        }
        return null;
      },
    };
  }

  // --- Scoring --------------------------------------------------------------

  // Sort picks ascending by effective score so top 4 are cheapest.
  function rankPicks(picks) {
    return [...picks].sort((a, b) => {
      const sa = a.player ? a.player.effectiveScore : 99;
      const sb = b.player ? b.player.effectiveScore : 99;
      return sa - sb;
    });
  }

  // Compute totals, tiebreaker data for a single participant.
  function scoreParticipant(participant, index, winner) {
    const picks = participant.picks.map((pickName) => {
      const player = index.find(pickName);
      return { pickName, player };
    });

    // Rank the picks so first 4 are the "scoring" picks.
    const ranked = rankPicks(picks);
    const top4 = ranked.slice(0, 4);
    const dropped = ranked.slice(4); // 5th and 6th

    const total = top4.reduce(
      (sum, pk) => sum + (pk.player ? pk.player.effectiveScore : 99),
      0
    );

    const cutCount = picks.filter((pk) => pk.player && pk.player.isCut).length;
    const madeCutCount = picks.filter((pk) => pk.player && !pk.player.isCut).length;

    // Tiebreaker: does the Masters winner appear in this participant's top 4?
    const winnerInTop4 = winner
      ? top4.some((pk) => pk.player && pk.player.id === winner.id)
      : false;

    // Tiebreaker: 5th and 6th golfer effective scores
    const fifthScore = dropped[0]?.player ? dropped[0].player.effectiveScore : 99;
    const sixthScore = dropped[1]?.player ? dropped[1].player.effectiveScore : 99;

    // Tiebreaker: closeness to winning score guess
    // Only applies if the tournament is complete AND participant provided a guess
    let winningScoreDiff = null;
    if (winner && winner.toPar != null && participant.winningScoreGuess != null) {
      winningScoreDiff = Math.abs(winner.toPar - participant.winningScoreGuess);
    }

    return {
      name: participant.name,
      picks,
      top4,
      dropped,
      total,
      cutCount,
      madeCutCount,
      winnerInTop4,
      fifthScore,
      sixthScore,
      winningScoreDiff,
      winningScoreGuess: participant.winningScoreGuess ?? null,
    };
  }

  // Compare two participants per the pool's tiebreaker rules.
  // Returns negative if a is better (ranked higher), positive if b is better.
  function compareParticipants(a, b) {
    // 0. Lowest combined score of top 4
    if (a.total !== b.total) return a.total - b.total;

    // 1. Winner in top 4 (true beats false) — only meaningful post-tournament
    if (a.winnerInTop4 !== b.winnerInTop4) return a.winnerInTop4 ? -1 : 1;

    // 2a. 5th golfer score (lower better)
    if (a.fifthScore !== b.fifthScore) return a.fifthScore - b.fifthScore;

    // 2b. 6th golfer score (lower better)
    if (a.sixthScore !== b.sixthScore) return a.sixthScore - b.sixthScore;

    // 3. Closest guess of winning score (only if both provided a guess & winner known)
    if (a.winningScoreDiff != null && b.winningScoreDiff != null) {
      if (a.winningScoreDiff !== b.winningScoreDiff) {
        return a.winningScoreDiff - b.winningScoreDiff;
      }
    }

    // 4. Most players to make the cut (higher better)
    if (a.madeCutCount !== b.madeCutCount) return b.madeCutCount - a.madeCutCount;

    return 0;
  }

  function rankParticipants(participants, leaderboard) {
    const index = buildPlayerIndex(leaderboard.players);
    const winner = leaderboard.winner || null;

    const scored = participants.map((p) => scoreParticipant(p, index, winner));
    scored.sort(compareParticipants);

    // Assign final positions, flagging ties
    scored.forEach((p, i) => {
      const prev = i === 0 ? null : scored[i - 1];
      if (prev && compareParticipants(prev, p) === 0) {
        p.position = prev.position;
        p.tied = true;
        prev.tied = true;
      } else {
        p.position = i + 1;
        p.tied = false;
      }
    });

    return scored;
  }

  global.Pool = {
    normalizeName,
    buildPlayerIndex,
    rankParticipants,
    scoreParticipant,
    compareParticipants,
  };
})(window);
