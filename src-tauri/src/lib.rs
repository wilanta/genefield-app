// GeneField desktop persistence and lifecycle configuration.
// Read-only reference SQLite is isolated from writable candidate migrations.
use tauri::Manager;
mod reference;
use tauri_plugin_sql::{Builder, Migration, MigrationKind};

/// Apply the same compact scale to text, fixed-pixel layouts, and overlays.
const DESKTOP_UI_ZOOM: f64 = 0.85;

/// Connection string for the candidate-store database. The `sqlite:` prefix is
/// mandatory; the path after it is resolved relative to the app data dir.
const GENEFIELD_DB: &str = "sqlite:genefield.db";

/// Schema migrations, up-only, applied in version order. All queries in the
/// adapter are parameterized, so these are the only DDL the app owns.
///
/// - v1: creates the `candidates` table.
/// - v2: creates the `seed_state` marker table. It holds a single row that
///   records that first-run demo seeding has been performed. The marker
///   intentionally lives in its own table (NOT on any candidate row), so it
///   survives the user deleting every candidate; it is additive and never
///   alters `candidates`, so already-applied v1 databases upgrade cleanly.
fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create candidates table",
            sql: r#"
CREATE TABLE IF NOT EXISTS candidates (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL UNIQUE COLLATE NOCASE,
    parent_a      TEXT NOT NULL,
    parent_b      TEXT NOT NULL,
    notes         TEXT NOT NULL DEFAULT '',
    source        TEXT NOT NULL DEFAULT 'manual',
    review_status TEXT NOT NULL DEFAULT 'draft',
    tags          TEXT NOT NULL DEFAULT '[]',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create seed_state marker table",
            sql: r#"
CREATE TABLE IF NOT EXISTS seed_state (
    key          TEXT PRIMARY KEY,
    seeded_at    TEXT NOT NULL,
    demo_count   INTEGER NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'in_progress'
);"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "persist authoritative analysis snapshots",
            sql: "ALTER TABLE candidates ADD COLUMN analysis_json TEXT;",
            kind: MigrationKind::Up,
        },
    ]
}

/// No-op scaffold command kept from the template (not part of the candidate
/// store). Registered so any existing caller keeps working.
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                window.set_zoom(DESKTOP_UI_ZOOM)?;
            }
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            Builder::new()
                .add_migrations(GENEFIELD_DB, migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            greet,
            reference::reference_snapshot
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
