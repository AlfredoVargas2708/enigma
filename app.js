const STORAGE_KEY = "padelStats";
const RESULTS_STORAGE_KEY = "padelResults";

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function loadResults() {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveResults(results) {
  localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(results));
}

let stats = loadStats();
let results = loadResults();
let activeView = "calendar";

function pairName(match) {
  return match.players.join(" / ");
}

function statKey(matchId, player) {
  return `${matchId}__${player}`;
}

function getPlayerStats(matchId, player) {
  const key = statKey(matchId, player);
  if (!stats[key]) {
    stats[key] = Object.fromEntries(STAT_FIELDS.map((f) => [f.key, 0]));
  }
  return stats[key];
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function renderMatches() {
  document.querySelectorAll(".matches-container").forEach((container) => {
    const day = container.dataset.day;
    const dayMatches = MATCHES.filter((m) => m.day === day)
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    container.innerHTML = "";
    dayMatches.forEach((match) => {
      const card = document.createElement("div");
      card.className = "match-card";

      const header = document.createElement("div");
      header.className = "match-header";

      const time = document.createElement("div");
      time.className = "match-time";
      time.innerHTML = `<span class="clock-icon">🕐</span> ${match.time}`;

      const category = document.createElement("div");
      category.className = `match-category type-${match.type}`;
      category.textContent = match.category;

      header.append(time, category);

      const playersBlock = document.createElement("div");
      playersBlock.className = "match-players-block";
      match.players.forEach((player) => {
        playersBlock.appendChild(buildPlayerStatBlock(match, player));
      });

      const resultRow = buildResultRow(match);

      card.append(header, playersBlock, resultRow);
      container.appendChild(card);
    });
  });
}

function buildResultRow(match) {
  const row = document.createElement("div");
  row.className = "result-row";

  const label = document.createElement("label");
  label.className = "result-label";
  label.textContent = "Resultado final";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "result-input";
  input.placeholder = "ej: 6-3, 6-4";
  input.value = results[match.id] || "";
  input.addEventListener("change", () => {
    results[match.id] = input.value.trim();
    saveResults(results);
    if (activeView === "pairs") renderPairsSummary();
  });

  row.append(label, input);
  return row;
}

function buildPlayerStatBlock(match, player) {
  const playerStats = getPlayerStats(match.id, player);

  const block = document.createElement("div");
  block.className = "player-inline-block";

  const name = document.createElement("div");
  name.className = "player-inline-name";
  name.textContent = player;
  block.appendChild(name);

  const controls = document.createElement("div");
  controls.className = "player-inline-controls";

  STAT_FIELDS.forEach((field) => {
    const mini = document.createElement("div");
    mini.className = "mini-stepper";
    mini.title = field.label;

    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "mini-btn";
    minusBtn.textContent = "−";

    const valueSpan = document.createElement("span");
    valueSpan.className = "mini-value";
    valueSpan.textContent = playerStats[field.key];

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "mini-btn";
    plusBtn.textContent = "+";

    const label = document.createElement("span");
    label.className = "mini-label";
    label.textContent = field.short;

    const updateValue = (delta) => {
      playerStats[field.key] = Math.max(0, (playerStats[field.key] || 0) + delta);
      valueSpan.textContent = playerStats[field.key];
      saveStats(stats);
      if (activeView === "stats") renderStatsSummary();
    };

    minusBtn.addEventListener("click", () => updateValue(-1));
    plusBtn.addEventListener("click", () => updateValue(1));

    mini.append(label, minusBtn, valueSpan, plusBtn);
    controls.appendChild(mini);
  });

  block.appendChild(controls);
  return block;
}

function renderLegend() {
  const container = document.getElementById("legend-items");
  container.innerHTML = "";
  Object.values(CATEGORY_TYPES).forEach((cat) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `<span class="legend-dot" style="background:${cat.color}"></span> <strong>${cat.label.split(" ")[0]}</strong> ${cat.label.split(" ").slice(1).join(" ")}`;
    container.appendChild(item);
  });
}

function renderStatsLegend() {
  const container = document.getElementById("stats-legend-items");
  container.innerHTML = "";
  STAT_FIELDS.forEach((field) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `<strong>${field.short}</strong> ${field.label}`;
    container.appendChild(item);
  });
}

function renderStatsSummary() {
  const container = document.getElementById("stats-summary");
  const totals = {};

  Object.entries(stats).forEach(([key, entry]) => {
    const player = key.split("__")[1];
    if (!totals[player]) {
      totals[player] = Object.fromEntries(STAT_FIELDS.map((f) => [f.key, 0]));
    }
    STAT_FIELDS.forEach((field) => {
      totals[player][field.key] += entry[field.key] || 0;
    });
  });

  container.innerHTML = "";
  const players = Object.keys(totals).sort();

  if (players.length === 0) {
    container.innerHTML = '<div class="empty-msg">Todavía no cargaste estadísticas. Tocá un jugador en el calendario para empezar.</div>';
    return;
  }

  players.forEach((player) => {
    const card = document.createElement("div");
    card.className = "player-stat-card";
    const title = document.createElement("h4");
    title.textContent = player;
    card.appendChild(title);

    STAT_FIELDS.forEach((field) => {
      const row = document.createElement("div");
      row.className = "player-stat-row";
      row.innerHTML = `<span>${field.label}</span><span>${totals[player][field.key]}</span>`;
      card.appendChild(row);
    });

    container.appendChild(card);
  });
}

function renderPairsSummary() {
  const container = document.getElementById("pairs-summary");
  const pairs = {};

  MATCHES.forEach((match) => {
    const pair = pairName(match);
    if (!pairs[pair]) pairs[pair] = [];
    pairs[pair].push(match);
  });

  container.innerHTML = "";
  const pairNames = Object.keys(pairs).sort();

  pairNames.forEach((pair) => {
    const card = document.createElement("div");
    card.className = "pair-card";

    const title = document.createElement("h4");
    title.textContent = pair;
    card.appendChild(title);

    pairs[pair]
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
      .forEach((match) => {
        const row = document.createElement("div");
        row.className = "pair-match-row";
        const resultText = results[match.id] ? results[match.id] : "Sin cargar";
        row.innerHTML = `
          <span class="pair-match-info">${match.day} ${match.time} · ${match.category}</span>
          <span class="pair-match-result">${resultText}</span>
        `;
        card.appendChild(row);
      });

    container.appendChild(card);
  });
}

function switchView(view) {
  activeView = view;
  document.querySelectorAll(".view-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  document.getElementById("calendar-view").classList.toggle("hidden", view !== "calendar");
  document.getElementById("stats-view").classList.toggle("hidden", view !== "stats");
  document.getElementById("pairs-view").classList.toggle("hidden", view !== "pairs");
  if (view === "stats") renderStatsSummary();
  if (view === "pairs") renderPairsSummary();
}

document.querySelectorAll(".view-tab").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

renderMatches();
renderLegend();
renderStatsLegend();
