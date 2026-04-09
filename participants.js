/* ==========================================================================
   participants.js — Pool participants and their 6 picks.
   --------------------------------------------------------------------------

   EDIT THIS FILE to update participants. Each entry is:

     {
       name:    'Display name',
       picks:   ['Golfer 1', 'Golfer 2', ..., 'Golfer 6'],   // exactly 6
       winningScoreGuess: -10,   // optional; used as tiebreaker #3
     }

   Name matching is fuzzy, so "Scottie Scheffler", "S. Scheffler" and
   "scheffler" all resolve to the same player. Prefer full names for clarity.
   ========================================================================== */

window.PARTICIPANTS = [
  // ---- PLACEHOLDER DATA — replace with real picks once provided ----
  {
    name: 'Sample Participant',
    picks: [
      'Scottie Scheffler',   // Tier 1
      'Rory McIlroy',        // Tier 2
      'Xander Schauffele',   // Tier 3
      'Hideki Matsuyama',    // Tier 4
      'Tommy Fleetwood',     // Tier 5
      'Min Woo Lee',         // Tier 6
    ],
    winningScoreGuess: -12,
  },
];
