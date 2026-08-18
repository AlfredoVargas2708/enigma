use rusqlite::{Connection, Row};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct DbState(pub Mutex<Connection>);

#[derive(Serialize, Deserialize, Clone)]
pub struct MatchDto {
    pub id: i64,
    pub day: String,
    pub time: String,
    pub category: String,
    #[serde(rename = "type")]
    pub match_type: String,
    pub players: Vec<String>,
    pub instance: Option<String>,
    pub result: Option<String>,
    pub stats: HashMap<String, HashMap<String, i64>>,
}

#[derive(Deserialize)]
pub struct NewMatch {
    pub day: String,
    pub time: String,
    pub category: String,
    #[serde(rename = "type")]
    pub match_type: String,
    pub players: Vec<String>,
    pub instance: Option<String>,
}

#[derive(Deserialize)]
pub struct MatchUpdate {
    pub id: i64,
    pub day: String,
    pub time: String,
    pub category: String,
    #[serde(rename = "type")]
    pub match_type: String,
    pub players: Vec<String>,
    pub instance: Option<String>,
}

#[derive(Deserialize)]
pub struct SeedMatch {
    pub day: String,
    pub time: String,
    pub category: String,
    #[serde(rename = "type")]
    pub match_type: String,
    pub players: Vec<String>,
}

pub fn init_db(app: &AppHandle) -> Connection {
    let dir = app
        .path()
        .app_data_dir()
        .expect("no se pudo resolver el directorio de datos de la app");
    std::fs::create_dir_all(&dir).expect("no se pudo crear el directorio de datos de la app");
    let conn = Connection::open(dir.join("enigma.db")).expect("no se pudo abrir la base de datos");
    conn.execute(
        "CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day TEXT NOT NULL,
            time TEXT NOT NULL,
            category TEXT NOT NULL,
            type TEXT NOT NULL,
            players TEXT NOT NULL,
            instance TEXT,
            result TEXT,
            stats TEXT NOT NULL DEFAULT '{}'
        )",
        [],
    )
    .expect("no se pudo crear la tabla matches");
    conn
}

pub fn row_to_match(row: &Row) -> rusqlite::Result<MatchDto> {
    let players_json: String = row.get("players")?;
    let stats_json: String = row.get("stats")?;
    Ok(MatchDto {
        id: row.get("id")?,
        day: row.get("day")?,
        time: row.get("time")?,
        category: row.get("category")?,
        match_type: row.get("type")?,
        players: serde_json::from_str(&players_json).unwrap_or_default(),
        instance: row.get("instance")?,
        result: row.get("result")?,
        stats: serde_json::from_str(&stats_json).unwrap_or_default(),
    })
}
