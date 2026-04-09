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
  {
    name: 'Dave',
    picks: [
      'Scottie Scheffler', // Tier 1
      'Brooks Koepka',     // Tier 2
      'Sepp Straka',       // Tier 3
      'Cameron Smith',     // Tier 4
      'Max Homa',          // Tier 5
      'Ryan Gerard',       // Tier 6
    ],
    winningScoreGuess: -11,
  },
  {
    name: 'Tom',
    picks: [
      'Collin Morikawa',   // Tier 1
      'Brooks Koepka',     // Tier 2
      'Kyle Lowry',        // Tier 3
      'Cameron Smith',     // Tier 4
      'Max Homa',          // Tier 5
      'Brian Harman',      // Tier 6
    ],
    winningScoreGuess: -16,
  },
  {
    name: 'Josh',
    picks: [
      'Jon Rahm',          // Tier 1
      'Hideki Matsuyama',  // Tier 2
      'Justin Thomas',     // Tier 3
      'Sam Burns',         // Tier 4
      'Keegan Bradley',    // Tier 5
      'Wyndham Clark',     // Tier 6
    ],
    winningScoreGuess: -9, // TODO: pending from participant
  },
  {
    name: 'Connor',
    picks: [
      'Scottie Scheffler', // Tier 1
      'Patrick Reed',      // Tier 2
      'Min Woo Lee',       // Tier 3
      'Corey Conners',     // Tier 4
      'Sungjae Im',        // Tier 5
      'Ryan Gerard',       // Tier 6
    ],
    winningScoreGuess: -12,
  },
  {
    name: 'Travis',
    picks: [
      'Jon Rahm',          // Tier 1
      'Patrick Reed',      // Tier 2
      'Jake Knapp',        // Tier 3
      'Jacob Bridgeman',   // Tier 4
      'Ben Griffin',       // Tier 5
      'Mason Howell',      // Tier 6
    ],
    winningScoreGuess: -16,
  },
  {
    name: 'Pat',
    picks: [
      'Ludvig Aberg',      // Tier 1
      'Justin Rose',       // Tier 2
      'Akshay Bhatia',     // Tier 3
      'J.J. Spaun',        // Tier 4
      'Ben Griffin',       // Tier 5
      'Nicolas Echavarria',// Tier 6
    ],
    winningScoreGuess: -11, // TODO: pending from participant
  },
  {
    name: 'Carp',
    picks: [
      'Scottie Scheffler', // Tier 1
      'Justin Rose',       // Tier 2
      'Akshay Bhatia',     // Tier 3
      'Jacob Bridgeman',   // Tier 4
      'Max Homa',          // Tier 5
      'Ryan Fox',          // Tier 6
    ],
    winningScoreGuess: -10,
  },
  {
    name: 'John',
    picks: [
      'Collin Morikawa',   // Tier 1
      'Patrick Reed',      // Tier 2
      'Adam Scott',        // Tier 3
      'Maverick McNealy',  // Tier 4
      'Max Homa',          // Tier 5
      'Dustin Johnson',    // Tier 6
    ],
    winningScoreGuess: null, // TODO: pending from participant
  },
  {
    name: 'Shawn',
    picks: [
      'Scottie Scheffler', // Tier 1
      'Hideki Matsuyama',  // Tier 2
      'Akshay Bhatia',     // Tier 3
      'J.J. Spaun',        // Tier 4
      'Rasmus Højgaard',   // Tier 5
      'Wyndham Clark',     // Tier 6
    ],
    winningScoreGuess: -10,
  },
];
