/* ==========================================================================
   app.js — Glues the fetcher + scorer to the DOM.
   ========================================================================== */

(function () {
  'use strict';

  const REFRESH_INTERVAL_MS = 2 * 60 * 1000; // auto-refresh every 2 minutes

  const els = {
    eventName: document.getElementById('event-name'),
    eventRound: document.getElementById('event-round'),
    year: document.getElementById('year'),
    poolLb: document.getElementById('pool-leaderboard'),
    picksGrid: document.getElementById('picks-grid'),
    lastUpdated: document.getElementById('last-updated'),
    refreshBtn: document.getElementById('refresh-btn'),
  };

  // --- Rendering ------------------------------------------------------------

  function formatTotal(n) {
    if (!Number.isFinite(n)) return '—';
    if (n === 0) return 'E';
    if (n > 0) return '+' + n;
    return String(n);
  }

  function scoreClass(n) {
    if (!Number.isFinite(n)) return '';
    if (n < 0) return 'score-red';
    return 'score-even';
  }

  function displayPos(participant) {
    return (participant.tied ? 'T' : '') + participant.position;
  }

  function renderEvent(leaderboard) {
    if (!leaderboard || !leaderboard.event) {
      els.eventName.textContent = 'No active tournament';
      els.eventRound.textContent = '—';
      return;
    }
    els.eventName.textContent = leaderboard.event.name || 'Golf Tournament';
    const detail = leaderboard.event.detail || '';
    const round = leaderboard.event.round;
    els.eventRound.textContent =
      detail || (round ? `Round ${round}` : 'Pre-tournament');

    // Year header matches the tournament year if available
    if (leaderboard.event.name) {
      const m = leaderboard.event.name.match(/\b(20\d{2})\b/);
      if (m) els.year.textContent = m[1];
    }
  }

  function renderPoolLeaderboard(participants) {
    const head = els.poolLb.querySelector('.scoreboard-head');
    els.poolLb.innerHTML = '';
    els.poolLb.appendChild(head);

    if (!participants.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<strong>No participants yet.</strong><br>Add picks to <code>participants.js</code>.';
      els.poolLb.appendChild(empty);
      return;
    }

    participants.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'scoreboard-row' + (i === 0 ? ' leader' : '');

      const pos = document.createElement('div');
      pos.className = 'col-pos';
      pos.textContent = displayPos(p);

      const name = document.createElement('div');
      name.className = 'col-name';
      name.textContent = p.name;

      const thru = document.createElement('div');
      thru.className = 'col-thru';
      thru.textContent = `${p.madeCutCount}/6`;

      const score = document.createElement('div');
      score.className = 'col-score ' + scoreClass(p.total);
      score.textContent = formatTotal(p.total);

      row.appendChild(pos);
      row.appendChild(name);
      row.appendChild(thru);
      row.appendChild(score);
      els.poolLb.appendChild(row);
    });
  }

  function renderPicksGrid(participants) {
    els.picksGrid.innerHTML = '';

    if (!participants.length) return;

    participants.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'pick-card';

      // Header
      const head = document.createElement('div');
      head.className = 'pick-card-head';
      const nameEl = document.createElement('div');
      nameEl.className = 'pick-name';
      nameEl.textContent = p.name;
      const totalEl = document.createElement('div');
      totalEl.className = 'pick-total ' + scoreClass(p.total);
      totalEl.textContent = formatTotal(p.total);
      head.appendChild(nameEl);
      head.appendChild(totalEl);
      card.appendChild(head);

      // Body
      const body = document.createElement('div');
      body.className = 'pick-body';

      // Ordered picks: top 4 first (counting), then dropped
      const ordered = [...p.top4.map((x) => ({ ...x, drop: false })),
                       ...p.dropped.map((x) => ({ ...x, drop: true }))];

      ordered.forEach((entry, i) => {
        const row = document.createElement('div');
        const isCut = entry.player && entry.player.isCut;
        const missing = !entry.player;
        row.className = 'pick-row ' +
          (entry.drop ? 'drop' : 'top4') +
          (isCut ? ' cut' : '') +
          (missing ? ' missing' : '');

        const golfer = document.createElement('div');
        golfer.className = 'pick-golfer';
        golfer.textContent = entry.player ? entry.player.name : (entry.pickName + ' (not found)');

        const badge = document.createElement('div');
        if (isCut) {
          badge.className = 'pick-badge cut';
          badge.textContent = entry.player.cutReason || 'CUT';
        } else if (entry.drop) {
          badge.className = 'pick-badge drop';
          badge.textContent = 'Drop';
        } else {
          badge.className = 'pick-badge';
          badge.textContent = `#${i + 1}`;
        }

        const scoreEl = document.createElement('div');
        scoreEl.className = 'pick-score';
        if (entry.player) {
          scoreEl.textContent = entry.player.isCut
            ? 'CUT'
            : (entry.player.toParDisplay || 'E');
        } else {
          scoreEl.textContent = '—';
        }

        row.appendChild(golfer);
        row.appendChild(badge);
        row.appendChild(scoreEl);
        body.appendChild(row);
      });

      // Meta row
      const meta = document.createElement('div');
      meta.className = 'pick-meta';
      meta.innerHTML = `
        <span>Made cut: <strong>${p.madeCutCount}/6</strong></span>
        <span>Top 4 Total: <strong>${formatTotal(p.total)}</strong></span>
      `;
      body.appendChild(meta);

      card.appendChild(body);
      els.picksGrid.appendChild(card);
    });
  }

  function showError(message) {
    // Insert an error banner at the top of the leaderboard card if not present
    let banner = document.querySelector('.error-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'error-banner';
      const card = document.querySelector('.leaderboard-card');
      card.insertBefore(banner, card.firstChild);
    }
    banner.textContent = message;
  }

  function clearError() {
    const banner = document.querySelector('.error-banner');
    if (banner) banner.remove();
  }

  function updateTimestamp() {
    const now = new Date();
    const opts = { hour: 'numeric', minute: '2-digit', hour12: true };
    els.lastUpdated.textContent = now.toLocaleTimeString([], opts);
  }

  // --- Main refresh cycle ---------------------------------------------------

  async function refresh() {
    if (els.refreshBtn.classList.contains('spinning')) return;
    els.refreshBtn.classList.add('spinning');

    try {
      const leaderboard = await EspnLeaderboard.fetchLeaderboard();
      clearError();

      renderEvent(leaderboard);

      const participants = window.PARTICIPANTS || [];
      const ranked = Pool.rankParticipants(participants, leaderboard);

      renderPoolLeaderboard(ranked);
      renderPicksGrid(ranked);
      updateTimestamp();
    } catch (err) {
      console.error('Refresh failed', err);
      showError("Couldn't load ESPN leaderboard. Check your connection and tap refresh.");
    } finally {
      els.refreshBtn.classList.remove('spinning');
    }
  }

  // --- Init ------------------------------------------------------------------

  function init() {
    els.refreshBtn.addEventListener('click', refresh);

    // Refresh when the tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh();
    });

    refresh();
    setInterval(refresh, REFRESH_INTERVAL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
