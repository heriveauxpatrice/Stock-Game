const API_KEY = 'IEA0926CEXP0VOMO';
const BASE_URL = 'https://www.alphavantage.co/query';

const form = document.getElementById('ticker-form');
const tickerInput = document.getElementById('ticker');
const errorEl = document.getElementById('error');
const gameSection = document.getElementById('game');
const symbolEl = document.getElementById('symbol');
const currentDateEl = document.getElementById('current-date');
const scoreEl = document.getElementById('score');
const feedbackEl = document.getElementById('feedback');
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnEnd = document.getElementById('btn-end');
const ctx = document.getElementById('chart').getContext('2d');

let chart;
let gameState = null;

function setError(message) {
  errorEl.textContent = message || '';
}

function setFeedback(message, color) {
  feedbackEl.textContent = message || '';
  feedbackEl.style.color = color || '';
}

function enablePrediction(enabled) {
  btnUp.disabled = !enabled;
  btnDown.disabled = !enabled;
  btnEnd.disabled = !enabled;
}

async function fetchDailyAdjusted(symbol) {
  const url = `${BASE_URL}?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${API_KEY}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Network error (${resp.status})`);
  const data = await resp.json();
  if (data['Error Message']) {
    throw new Error('Ticker not found. Please try another symbol.');
  }
  if (data['Note']) {
    throw new Error('Rate limit reached. Please wait a minute and try again.');
  }
  const meta = data['Meta Data'];
  const series = data['Time Series (Daily)'];
  if (!meta || !series) throw new Error('Unexpected API response.');
  return series;
}

function getRandomTradingStartDate(allDates) {
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - 100);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() - 7);

  const withinRangeDates = allDates.filter(d => {
    const dt = new Date(d);
    return dt >= minDate && dt <= maxDate;
  });
  if (withinRangeDates.length === 0) {
    throw new Error('Not enough recent data in the required range.');
  }

  // Filter to weekdays that are also trading days (dates array already trading days)
  const weekdayDates = withinRangeDates.filter(d => {
    const wd = new Date(d).getUTCDay();
    return wd !== 0 && wd !== 6; // not Sunday(0) or Saturday(6)
  });
  const pickFrom = weekdayDates.length > 0 ? weekdayDates : withinRangeDates;
  const idx = Math.floor(Math.random() * pickFrom.length);
  return pickFrom[idx];
}

function buildChart(labels, prices) {
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Adj Close',
        data: prices,
        tension: 0.25,
        borderColor: '#4f8cff',
        pointBackgroundColor: '#4f8cff',
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#a7b0c5' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: { ticks: { color: '#a7b0c5' }, grid: { color: 'rgba(255,255,255,0.06)' } }
      },
      plugins: {
        legend: { labels: { color: '#e7ecf5' } },
        tooltip: { mode: 'index', intersect: false }
      }
    }
  });
}

function updateChart(nextDate, nextPrice) {
  chart.data.labels.push(nextDate);
  chart.data.datasets[0].data.push(nextPrice);
  chart.update();
}

function formatDate(d) {
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = `${dt.getMonth() + 1}`.padStart(2, '0');
  const dd = `${dt.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function prepareGameState(series, symbol) {
  // series: { 'YYYY-MM-DD': { '5. adjusted close': '...' }, ... }
  const allDatesDesc = Object.keys(series).sort((a, b) => new Date(b) - new Date(a));
  const allDatesAsc = [...allDatesDesc].reverse();

  const startDate = getRandomTradingStartDate(allDatesAsc);
  const startIndex = allDatesAsc.indexOf(startDate);
  if (startIndex < 7 || startIndex === -1) {
    throw new Error('Insufficient prior days to seed the chart.');
  }

  const seedDates = allDatesAsc.slice(startIndex - 7, startIndex + 1);
  const seedPrices = seedDates.map(d => parseFloat(series[d]['5. adjusted close']));

  return {
    symbol,
    allDatesAsc,
    series,
    seedDates,
    seedPrices,
    currentIndex: startIndex, // last visible index is the start date
    score: 0
  };
}

function renderInitial(state) {
  symbolEl.textContent = state.symbol.toUpperCase();
  buildChart(state.seedDates, state.seedPrices);
  currentDateEl.textContent = state.seedDates[state.seedDates.length - 1];
  scoreEl.textContent = `${state.score}`;
  setFeedback('Make a prediction to reveal the next day.');
  enablePrediction(true);
}

function stepGame(state, guessUp) {
  // Reveal next day relative to current date
  const nextIndex = state.currentIndex + 1;
  if (nextIndex + 1 >= state.allDatesAsc.length) {
    setFeedback('No more data to continue. You reached the end.');
    enablePrediction(false);
    return state;
  }

  const prevDate = state.allDatesAsc[nextIndex];
  const nextDate = state.allDatesAsc[nextIndex + 1];
  const prevPrice = parseFloat(state.series[prevDate]['5. adjusted close']);
  const nextPrice = parseFloat(state.series[nextDate]['5. adjusted close']);

  const wentUp = nextPrice > prevPrice;
  const correct = (guessUp && wentUp) || (!guessUp && !wentUp);
  if (correct) {
    state.score += 1;
    setFeedback('Correct! ✅', '#22c55e');
  } else {
    setFeedback('Incorrect. ❌', '#ff6b6b');
  }
  scoreEl.textContent = `${state.score}`;

  updateChart(nextDate, nextPrice);
  currentDateEl.textContent = nextDate;
  state.currentIndex = nextIndex;
  return state;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setError('');
  setFeedback('');
  enablePrediction(false);

  const symbol = (tickerInput.value || '').trim().toUpperCase();
  if (!symbol) {
    setError('Please enter a stock ticker symbol.');
    return;
  }

  try {
    const series = await fetchDailyAdjusted(symbol);
    gameState = prepareGameState(series, symbol);
    gameSection.classList.remove('hidden');
    renderInitial(gameState);
  } catch (err) {
    console.error(err);
    setError(err.message || 'Failed to load data.');
  }
});

btnUp.addEventListener('click', () => {
  if (!gameState) return;
  gameState = stepGame(gameState, true);
});

btnDown.addEventListener('click', () => {
  if (!gameState) return;
  gameState = stepGame(gameState, false);
});

btnEnd.addEventListener('click', () => {
  if (!gameState) return;
  setFeedback('Game ended. You can enter a new ticker to play again.');
  enablePrediction(false);
});

