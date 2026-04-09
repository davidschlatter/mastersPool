# Masters Pool

A mobile-first, static web app for tracking a Masters Tournament pool among friends. Hosts on GitHub Pages. Data is fetched live from the public ESPN golf API.

## How it works

- `index.html` — page layout
- `styles.css` — Masters-themed styling (green / yellow / white / azalea pink)
- `espn.js` — fetches & normalizes the ESPN leaderboard JSON (with CORS-proxy fallbacks)
- `pool.js` — matches picks to golfers and applies the pool's tiebreakers
- `participants.js` — **edit this** to add participants and their 6 picks
- `app.js` — wires it together, renders the leaderboard and pick cards

## Pool rules (baked in)

- Each participant picks 6 golfers (one per tier).
- A participant's score = the sum of their top-4 golfers' scores to par.
- Lowest combined score wins.
- After Friday's round, any golfer who missed the cut is assigned a score of **+99**, so cut players never out-score players who actually played the weekend.
- Tiebreakers are applied in order:
  1. Masters winner picked in the top 4
  2. 5th golfer score, then 6th golfer score
  3. Closest guess of the winning score
  4. Most players to make the cut (max 6)

## Editing participants

Open `participants.js` and add one entry per player:

```js
window.PARTICIPANTS = [
  {
    name: 'Dave',
    picks: [
      'Scottie Scheffler', // Tier 1
      'Rory McIlroy',      // Tier 2
      'Xander Schauffele', // Tier 3
      'Hideki Matsuyama',  // Tier 4
      'Tommy Fleetwood',   // Tier 5
      'Min Woo Lee',       // Tier 6
    ],
    winningScoreGuess: -12, // optional, used for tiebreaker #3
  },
  // ... more participants
];
```

Name matching is fuzzy — "Scottie Scheffler", "S. Scheffler", and "scheffler" all resolve to the same player — but prefer full names for clarity.

## Running locally

Any static file server will work, for example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploying to GitHub Pages

1. Push the repo to GitHub.
2. Settings → Pages → Source: **Deploy from a branch** → select `main` (or your chosen branch) and `/ (root)`.
3. Your site will be live at `https://<user>.github.io/<repo>/`.

## Data source notes

We fetch ESPN's public JSON endpoint (`site.api.espn.com/apis/site/v2/sports/golf/...`). During Masters week this returns the Masters event automatically. If direct browser fetches are blocked by CORS, the code transparently falls back to a public CORS proxy. No scraping of the HTML leaderboard page is necessary, so the layout change after the cut isn't a problem — cut players are flagged in the JSON and handled correctly.
