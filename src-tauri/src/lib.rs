mod db;

use db::{DbState, MatchDto, MatchUpdate, NewMatch, SeedMatch};
use rusqlite::params;
use tauri::{Manager, State};

#[tauri::command]
fn get_matches(state: State<DbState>) -> Result<Vec<MatchDto>, String> {
  let conn = state.0.lock().map_err(|e| e.to_string())?;
  let mut stmt = conn
    .prepare("SELECT id, day, time, category, type, players, instance, result, stats FROM matches")
    .map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([], db::row_to_match)
    .map_err(|e| e.to_string())?;
  let mut matches = Vec::new();
  for row in rows {
    matches.push(row.map_err(|e| e.to_string())?);
  }
  Ok(matches)
}

#[tauri::command]
fn add_match(state: State<DbState>, new_match: NewMatch) -> Result<MatchDto, String> {
  let conn = state.0.lock().map_err(|e| e.to_string())?;
  let players_json = serde_json::to_string(&new_match.players).map_err(|e| e.to_string())?;
  conn.execute(
    "INSERT INTO matches (day, time, category, type, players, instance, result, stats) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, '{}')",
    params![new_match.day, new_match.time, new_match.category, new_match.match_type, players_json, new_match.instance],
  ).map_err(|e| e.to_string())?;
  let id = conn.last_insert_rowid();
  conn
    .query_row(
      "SELECT id, day, time, category, type, players, instance, result, stats FROM matches WHERE id = ?1",
      params![id],
      db::row_to_match,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_match(state: State<DbState>, update: MatchUpdate) -> Result<MatchDto, String> {
  let conn = state.0.lock().map_err(|e| e.to_string())?;
  let players_json = serde_json::to_string(&update.players).map_err(|e| e.to_string())?;
  conn.execute(
    "UPDATE matches SET day=?1, time=?2, category=?3, type=?4, players=?5, instance=?6 WHERE id=?7",
    params![update.day, update.time, update.category, update.match_type, players_json, update.instance, update.id],
  ).map_err(|e| e.to_string())?;
  conn
    .query_row(
      "SELECT id, day, time, category, type, players, instance, result, stats FROM matches WHERE id = ?1",
      params![update.id],
      db::row_to_match,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_match_result(state: State<DbState>, id: i64, result: String) -> Result<(), String> {
  let conn = state.0.lock().map_err(|e| e.to_string())?;
  let value = if result.trim().is_empty() { None } else { Some(result) };
  conn
    .execute("UPDATE matches SET result = ?1 WHERE id = ?2", params![value, id])
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
fn update_match_stat(
  state: State<DbState>,
  id: i64,
  player: String,
  stat_key: String,
  delta: i64,
) -> Result<i64, String> {
  let conn = state.0.lock().map_err(|e| e.to_string())?;
  let stats_json: String = conn
    .query_row("SELECT stats FROM matches WHERE id = ?1", params![id], |row| row.get(0))
    .map_err(|e| e.to_string())?;
  let mut stats: std::collections::HashMap<String, std::collections::HashMap<String, i64>> =
    serde_json::from_str(&stats_json).unwrap_or_default();
  let player_stats = stats.entry(player).or_default();
  let current = player_stats.get(&stat_key).copied().unwrap_or(0);
  let updated = (current + delta).max(0);
  player_stats.insert(stat_key, updated);
  let new_json = serde_json::to_string(&stats).map_err(|e| e.to_string())?;
  conn
    .execute("UPDATE matches SET stats = ?1 WHERE id = ?2", params![new_json, id])
    .map_err(|e| e.to_string())?;
  Ok(updated)
}

#[tauri::command]
fn seed_matches(state: State<DbState>, matches: Vec<SeedMatch>) -> Result<u32, String> {
  let conn = state.0.lock().map_err(|e| e.to_string())?;
  let mut inserted = 0u32;
  for m in matches {
    let players_json = serde_json::to_string(&m.players).map_err(|e| e.to_string())?;
    let exists: i64 = conn
      .query_row(
        "SELECT COUNT(*) FROM matches WHERE day=?1 AND time=?2 AND category=?3 AND players=?4",
        params![m.day, m.time, m.category, players_json],
        |row| row.get(0),
      )
      .map_err(|e| e.to_string())?;
    if exists == 0 {
      conn.execute(
        "INSERT INTO matches (day, time, category, type, players, instance, result, stats) VALUES (?1, ?2, ?3, ?4, ?5, NULL, NULL, '{}')",
        params![m.day, m.time, m.category, m.match_type, players_json],
      ).map_err(|e| e.to_string())?;
      inserted += 1;
    }
  }
  Ok(inserted)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      let conn = db::init_db(&app.handle());
      app.manage(DbState(std::sync::Mutex::new(conn)));
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_matches,
      add_match,
      update_match,
      update_match_result,
      update_match_stat,
      seed_matches
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
