Stock Prediction Game
======================

A static web game that fetches real historical stock prices from Alpha Vantage and lets you predict whether the next day goes up or down. Ready for GitHub Pages.

Local Run
---------

Open `index.html` directly in a browser, or serve the folder with any static server.

How it works
------------

- Enter a valid stock ticker (e.g., `MSFT`).
- The app picks a random weekday between 7 and 100 days ago and shows the prior 7 trading days plus the starting day.
- Predict up or down; the next day's adjusted close is revealed, the date advances, the chart extends, and your score updates.

GitHub Pages Deployment
-----------------------

Option A: Deploy from `main` root

1. Push these files to a GitHub repository.
2. In GitHub: Settings → Pages → Build and deployment → Source: Deploy from a branch.
3. Select Branch: `main`, Folder: `/ (root)`, then Save.
4. Wait for publish: `https://<username>.github.io/<repo>/`.

Option B: Deploy from `docs/`

1. Create a `docs/` folder and move `index.html`, `styles.css`, and `app.js` into it.
2. Settings → Pages → Source: Deploy from a branch → Branch: `main`, Folder: `/docs`.
3. Save and wait for publish.

Notes
-----

- Uses Alpha Vantage `TIME_SERIES_DAILY_ADJUSTED`. Free-tier rate limits may apply.
- If a ticker is invalid or data is missing, the UI shows an error.
- Client-only app; no server required.