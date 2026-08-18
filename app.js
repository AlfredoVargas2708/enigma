const STORAGE_KEY = "padelStats";
const RESULTS_STORAGE_KEY = "padelResults";
const EXTRA_MATCHES_STORAGE_KEY = "padelExtraMatches";

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

function loadExtraMatches() {
  try {
    return JSON.parse(localStorage.getItem(EXTRA_MATCHES_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveExtraMatches(matches) {
  localStorage.setItem(EXTRA_MATCHES_STORAGE_KEY, JSON.stringify(matches));
}

let stats = loadStats();
let results = loadResults();
let extraMatches = loadExtraMatches();
let activeView = "calendar";
let scheduleSourceText = "";

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseSchedule(text) {
  const matches = [];
  let currentDay = "";
  const occurrences = {};

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.replace(/^\uFEFF/, "").trim();
    if (!line) return;

    const dayMatch = normalizeText(line).match(/^(viernes|sabado|domingo|lunes|martes|miercoles|jueves)$/);
    if (dayMatch) {
      currentDay = dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1).toLowerCase();
      if (normalizeText(currentDay) === "sabado") currentDay = "Sábado";
      if (normalizeText(currentDay) === "miercoles") currentDay = "Miércoles";
      return;
    }

    const matchLine = line.match(/^(\d{1,2}:\d{2})\s*-\s*(.+)$/);
    if (!currentDay || !matchLine) return;

    const time = matchLine[1].padStart(5, "0");
    let details = matchLine[2].trim();
    const categoryMatch = details.match(/^(.*?(?:mixto\s+open|varones|fem))\s*:?[ \t]*(.*)$/i);
    let category;
    let playersText;

    if (categoryMatch) {
      category = categoryMatch[1].trim();
      playersText = categoryMatch[2].trim();
    } else {
      const shortCategoryMatch = details.match(/^((?:\d+)(?:ra|era|da|ta))\s*:?[ \t]*(.*)$/i);
      if (!shortCategoryMatch) return;
      category = `${shortCategoryMatch[1]} Fem`;
      playersText = shortCategoryMatch[2].trim();
    }

    const players = playersText
      .replace(/^\s*\/\s*/, "")
      .split(/\s*\/\s*|\s+y\s+/i)
      .map((player) => player.trim())
      .filter(Boolean);
    if (!players.length) return;

    const normalizedCategory = normalizeText(category);
    const type = normalizedCategory.includes("mixto")
      ? "mixto"
      : normalizedCategory.includes("varones")
        ? "varones"
        : "fem";
    const signature = `${currentDay}|${time}|${normalizeText(category)}|${players.map(normalizeText).join("|")}`;
    occurrences[signature] = (occurrences[signature] || 0) + 1;
    matches.push({
      day: currentDay,
      time,
      category,
      type,
      players,
      id: `${signature}|${occurrences[signature]}`,
    });
  });

  return matches;
}

async function loadSchedule() {
  const status = document.getElementById("schedule-status");
  try {
    const response = await fetch("Horarios Campeonato.txt", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const sourceText = await response.text();
    if (sourceText === scheduleSourceText) return;
    scheduleSourceText = sourceText;
    MATCHES = [...parseSchedule(sourceText), ...extraMatches];
    renderDayPanels();
    renderMatches();
    renderPairsSummary();
    status.textContent = `Horarios cargados desde el TXT: ${MATCHES.length} partidos.`;
    status.className = "schedule-status loaded";
  } catch (error) {
    status.textContent = "No se pudo leer el TXT. Abrí la app con un servidor local para cargar los horarios automáticamente.";
    status.className = "schedule-status error";
    console.error("No se pudo cargar Horarios Campeonato.txt", error);
  }
}

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

function getMatchType(category) {
  const normalizedCategory = normalizeText(category);
  return normalizedCategory.includes("mixto")
    ? "mixto"
    : normalizedCategory.includes("varones")
      ? "varones"
      : "fem";
}

function buildAddMatchForm(day) {
  const form = document.createElement("form");
  form.className = "add-match-form";
  form.classList.add("hidden");
  form.innerHTML = `
    <div class="add-match-title">Agregar partido</div>
    <div class="add-match-fields">
      <input name="time" type="time" aria-label="Hora" required>
      <input name="category" type="text" placeholder="Categoría" aria-label="Categoría" required>
      <input name="players" type="text" placeholder="Pareja: Nombre / Nombre" aria-label="Pareja" required>
      <input name="instance" type="text" placeholder="Instancia: Semifinal" aria-label="Instancia" required>
      <button class="add-match-submit" type="submit">Agregar</button>
    </div>`;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const players = String(formData.get("players"))
      .split(/\s*\/\s*|\s+y\s+/i)
      .map((player) => player.trim())
      .filter(Boolean);
    if (!players.length) return;

    const match = {
      day,
      time: String(formData.get("time")),
      category: String(formData.get("category")).trim(),
      type: getMatchType(String(formData.get("category"))),
      players,
      instance: String(formData.get("instance")).trim(),
      id: `manual-${Date.now()}`,
    };
    extraMatches.push(match);
    saveExtraMatches(extraMatches);
    MATCHES.push(match);
    renderDayPanels();
    renderMatches();
    renderPairsSummary();
  });

  return form;
}

function renderDayPanels() {
  const columns = document.querySelector(".day-columns");
  const days = [...new Set([...MATCHES.map((match) => match.day), "Sábado", "Domingo"])];
  columns.innerHTML = "";
  days.forEach((day) => {
    const panel = document.createElement("div");
    panel.className = "day-panel";
    panel.innerHTML = `<div class="day-panel-header"><span class="cal-icon">📅</span> ${day.toUpperCase()}</div><div class="matches-container" data-day="${day}"></div>`;
    if (day === "Sábado" || day === "Domingo") {
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "add-match-toggle";
      addButton.textContent = "Agregar partido";
      const addForm = buildAddMatchForm(day);
      addButton.addEventListener("click", () => {
        const isHidden = addForm.classList.toggle("hidden");
        addButton.textContent = isHidden ? "Agregar partido" : "Ocultar formulario";
      });
      panel.appendChild(addButton);
      panel.appendChild(addForm);
    }
    columns.appendChild(panel);
  });
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
      if (match.instance) {
        const instance = document.createElement("div");
        instance.className = "match-instance";
        instance.textContent = match.instance;
        header.appendChild(instance);
      }

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
          <span class="pair-match-info">${match.day} ${match.time} · ${match.category}${match.instance ? ` · ${match.instance}` : ""}</span>
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

renderLegend();
renderStatsLegend();
loadSchedule();
setInterval(loadSchedule, 5000);
