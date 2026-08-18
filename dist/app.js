const tauriInvoke = window.__TAURI__ && window.__TAURI__.core ? window.__TAURI__.core.invoke : null;

function dbGetMatches() {
  return tauriInvoke("get_matches");
}

function dbAddMatch(newMatch) {
  return tauriInvoke("add_match", { newMatch });
}

function dbUpdateMatch(update) {
  return tauriInvoke("update_match", { update });
}

function dbUpdateResult(id, result) {
  return tauriInvoke("update_match_result", { id, result });
}

function dbUpdateStat(id, player, statKey, delta) {
  return tauriInvoke("update_match_stat", { id, player, statKey, delta });
}

function dbSeedMatches(scheduleMatches) {
  return tauriInvoke("seed_matches", { matches: scheduleMatches });
}

let activeView = "calendar";
let scheduleSourceText = "";
let selectedMobileDay = "";

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseSchedule(text) {
  const matches = [];
  let currentDay = "";

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.replace(/^\uFEFF/, "").trim();
    if (!line) return;

    const dayMatch = normalizeText(line).match(
      /^(viernes|sabado|domingo|lunes|martes|miercoles|jueves)$/,
    );
    if (dayMatch) {
      currentDay =
        dayMatch[1].charAt(0).toUpperCase() +
        dayMatch[1].slice(1).toLowerCase();
      if (normalizeText(currentDay) === "sabado") currentDay = "Sábado";
      if (normalizeText(currentDay) === "miercoles") currentDay = "Miércoles";
      return;
    }

    const matchLine = line.match(/^(\d{1,2}:\d{2})\s*-\s*(.+)$/);
    if (!currentDay || !matchLine) return;

    const time = matchLine[1].padStart(5, "0");
    let details = matchLine[2].trim();
    const categoryMatch = details.match(
      /^(.*?(?:mixto\s+open|varones|fem))\s*:?[ \t]*(.*)$/i,
    );
    let category;
    let playersText;

    if (categoryMatch) {
      category = categoryMatch[1].trim();
      playersText = categoryMatch[2].trim();
    } else {
      const shortCategoryMatch = details.match(
        /^((?:\d+)(?:ra|era|da|ta))\s*:?[ \t]*(.*)$/i,
      );
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
    matches.push({ day: currentDay, time, category, type, players });
  });

  return matches;
}

async function refreshMatches() {
  MATCHES = (await dbGetMatches()) || [];
  renderDayPanels();
  renderMatches();
  if (activeView === "pairs") renderPairsSummary();
  if (activeView === "stats") renderStatsSummary();
}

async function loadSchedule() {
  const status = document.getElementById("schedule-status");
  if (!tauriInvoke) {
    status.textContent = "Esta función requiere ejecutar la app de escritorio.";
    status.className = "schedule-status error";
    return;
  }
  try {
    const response = await fetch("./Horarios_Campeonato.txt", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const sourceText = await response.text();
    if (sourceText !== scheduleSourceText) {
      scheduleSourceText = sourceText;
      const scheduleMatches = parseSchedule(sourceText);
      if (scheduleMatches.length) await dbSeedMatches(scheduleMatches);
    }
    await refreshMatches();
    status.className = "schedule-status loaded";
  } catch (error) {
    status.textContent = `Error al cargar horarios: ${error.message}`;
    status.className = "schedule-status error";
    console.error("No se pudo cargar Horarios Campeonato.txt", error);
  }
}

function pairName(match) {
  return match.players.join(" / ");
}

function getPlayerStats(match, player) {
  if (!match.stats) match.stats = {};
  if (!match.stats[player]) {
    match.stats[player] = Object.fromEntries(STAT_FIELDS.map((f) => [f.key, 0]));
  }
  return match.stats[player];
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

const TOURNAMENT_INSTANCES = [
  "Fase previa",
  "Fase de grupos",
  "Octavos de final",
  "Cuartos de final",
  "Semifinal",
  "Final",
];

function optionsHtml(values, current, placeholder) {
  const opts = values.map(
    (value) =>
      `<option value="${value}" ${value === current ? "selected" : ""}>${value}</option>`,
  );
  if (!current) opts.unshift(`<option value="" disabled selected>${placeholder}</option>`);
  return opts.join("");
}

function buildAddMatchForm(day) {
  const form = document.createElement("form");
  form.className = "add-match-form";
  form.classList.add("hidden");
  const categories = [
    ...new Set(MATCHES.map((match) => match.category)),
  ].sort();
  const pairs = [...new Set(MATCHES.map(pairName))].sort();
  form.innerHTML = `
    <div class="add-match-title">Agregar partido</div>
    <div class="add-match-fields">
      <input name="time" type="time" aria-label="Hora" required>
      <select name="category" aria-label="Categoría" required>${optionsHtml(categories, "", "Categoría")}</select>
      <select name="players" aria-label="Pareja" required>${optionsHtml(pairs, "", "Pareja")}</select>
      <select name="instance" aria-label="Instancia" required>${optionsHtml(TOURNAMENT_INSTANCES, "", "Instancia")}</select>
      <button class="add-match-submit" type="submit">Agregar</button>
    </div>`;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const players = String(formData.get("players"))
      .split(/\s*\/\s*|\s+y\s+/i)
      .map((player) => player.trim())
      .filter(Boolean);
    if (!players.length) return;

    const category = String(formData.get("category")).trim();
    const newMatch = {
      day,
      time: String(formData.get("time")),
      category,
      type: getMatchType(category),
      players,
      instance: String(formData.get("instance")).trim() || null,
    };
    await dbAddMatch(newMatch);
    form.reset();
    await refreshMatches();
  });

  return form;
}

function buildMatchEditForm(match) {
  const form = document.createElement("form");
  form.className = "add-match-form edit-match-form hidden";
  const days = [...new Set(MATCHES.map((m) => m.day))];
  const categories = [...new Set(MATCHES.map((m) => m.category))].sort();
  const pairs = [...new Set(MATCHES.map(pairName))].sort();
  form.innerHTML = `
    <div class="add-match-title">Editar partido</div>
    <div class="add-match-fields">
      <select name="day" aria-label="Día" required>${optionsHtml(days, match.day, "Día")}</select>
      <input name="time" type="time" aria-label="Hora" value="${match.time}" required>
      <select name="category" aria-label="Categoría" required>${optionsHtml(categories, match.category, "Categoría")}</select>
      <select name="players" aria-label="Pareja" required>${optionsHtml(pairs, pairName(match), "Pareja")}</select>
      <select name="instance" aria-label="Instancia" required>${optionsHtml(TOURNAMENT_INSTANCES, match.instance || "", "Instancia")}</select>
      <button class="add-match-submit" type="submit">Guardar</button>
    </div>`;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const players = String(formData.get("players"))
      .split(/\s*\/\s*|\s+y\s+/i)
      .map((player) => player.trim())
      .filter(Boolean);
    if (!players.length) return;

    const category = String(formData.get("category")).trim();
    const update = {
      id: match.id,
      day: String(formData.get("day")),
      time: String(formData.get("time")),
      category,
      type: getMatchType(category),
      players,
      instance: String(formData.get("instance")).trim() || null,
    };
    await dbUpdateMatch(update);
    await refreshMatches();
  });

  return form;
}

function renderDayPanels() {
  const columns = document.querySelector(".day-columns");
  const days = [
    ...new Set([...MATCHES.map((match) => match.day), "Sábado", "Domingo"]),
  ];
  if (!days.includes(selectedMobileDay)) selectedMobileDay = days[0] || "";
  columns.innerHTML = "";
  days.forEach((day) => {
    const panel = document.createElement("div");
    panel.className = "day-panel";
    panel.dataset.day = day;
    panel.innerHTML = `<div class="day-panel-header"><span class="cal-icon">📅</span> ${day.toUpperCase()}</div><div class="matches-container" data-day="${day}"></div>`;
    if (day === "Sábado" || day === "Domingo") {
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "add-match-toggle";
      addButton.textContent = "Agregar partido";
      const addForm = buildAddMatchForm(day);
      addButton.addEventListener("click", () => {
        const isHidden = addForm.classList.toggle("hidden");
        addButton.textContent = isHidden
          ? "Agregar partido"
          : "Ocultar formulario";
      });
      panel.appendChild(addButton);
      panel.appendChild(addForm);
    }
    columns.appendChild(panel);
  });
  renderMobileDayMenu(days);
}

function renderMobileDayMenu(days) {
  const select = document.getElementById("mobile-day-select");
  select.innerHTML = "";
  days.forEach((day) => {
    const option = document.createElement("option");
    option.value = day;
    option.textContent = day;
    option.selected = day === selectedMobileDay;
    select.appendChild(option);
  });
  select.onchange = () => {
    selectedMobileDay = select.value;
    document.querySelectorAll(".day-panel").forEach((panel) => {
      panel.classList.toggle(
        "mobile-day-hidden",
        panel.dataset.day !== selectedMobileDay,
      );
    });
  };
  select.dispatchEvent(new Event("change"));
}

function renderMatches() {
  document.querySelectorAll(".matches-container").forEach((container) => {
    const day = container.dataset.day;
    const dayMatches = MATCHES.filter((m) => m.day === day).sort(
      (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time),
    );

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

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "edit-match-toggle";
      editButton.textContent = "✏️ Editar";
      header.appendChild(editButton);

      const playersBlock = document.createElement("div");
      playersBlock.className = "match-players-block";
      match.players.forEach((player) => {
        playersBlock.appendChild(buildPlayerStatBlock(match, player));
      });

      const resultRow = buildResultRow(match);
      const editForm = buildMatchEditForm(match);
      editButton.addEventListener("click", () => {
        const isHidden = editForm.classList.toggle("hidden");
        editButton.textContent = isHidden ? "✏️ Editar" : "Ocultar edición";
      });

      card.append(header, playersBlock, resultRow, editForm);
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
  input.value = match.result || "";
  input.addEventListener("change", () => {
    match.result = input.value.trim();
    dbUpdateResult(match.id, match.result).catch((error) => console.error(error));
    if (activeView === "pairs") renderPairsSummary();
  });

  row.append(label, input);
  return row;
}

function buildPlayerStatBlock(match, player) {
  const playerStats = getPlayerStats(match, player);

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
      playerStats[field.key] = Math.max(
        0,
        (playerStats[field.key] || 0) + delta,
      );
      valueSpan.textContent = playerStats[field.key];
      dbUpdateStat(match.id, player, field.key, delta).catch((error) =>
        console.error(error),
      );
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

  MATCHES.forEach((match) => {
    Object.entries(match.stats || {}).forEach(([player, entry]) => {
      if (!totals[player]) {
        totals[player] = Object.fromEntries(STAT_FIELDS.map((f) => [f.key, 0]));
      }
      STAT_FIELDS.forEach((field) => {
        totals[player][field.key] += entry[field.key] || 0;
      });
    });
  });

  container.innerHTML = "";
  const players = Object.keys(totals).sort();

  if (players.length === 0) {
    container.innerHTML =
      '<div class="empty-msg">Todavía no cargaste estadísticas. Tocá un jugador en el calendario para empezar.</div>';
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
        const resultText = match.result ? match.result : "Sin cargar";
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
  document
    .getElementById("calendar-view")
    .classList.toggle("hidden", view !== "calendar");
  document
    .getElementById("stats-view")
    .classList.toggle("hidden", view !== "stats");
  document
    .getElementById("pairs-view")
    .classList.toggle("hidden", view !== "pairs");
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
