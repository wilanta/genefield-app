use rusqlite::{Connection, OpenFlags};
use serde_json::{json, Value};
use std::path::Path;
use tauri::Manager;

// A separate SQLite connection is always opened read-only. Frontend SQL plugin
// remains reserved for the writable workspace.
pub fn read_reference(path: &Path) -> Result<Value, String> {
    let db = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| format!("Reference database unavailable: {e}"))?;
    let mut query = db.prepare("SELECT l.line_id,l.has_genotype,l.observation_count,p.parent_1,p.parent_2 FROM lines l LEFT JOIN pedigree p ON p.line_id=l.line_id ORDER BY l.line_id").map_err(|e| e.to_string())?;
    let mut lines = query.query_map([], |r| Ok(json!({
        "id":r.get::<_,String>(0)?, "name":r.get::<_,String>(0)?,
        "hasGenotype":r.get::<_,i64>(1)? == 1,
        "hasPhenotype":r.get::<_,i64>(2)? > 0,
        "phenotypeObservations":r.get::<_,i64>(2)?,
        "knownParents":([r.get::<_,Option<String>>(3)?,r.get::<_,Option<String>>(4)?].into_iter().flatten().collect::<Vec<_>>()),
        "hasPedigree":r.get::<_,Option<String>>(3)?.is_some() || r.get::<_,Option<String>>(4)?.is_some(),
        "estimates":[]
    }))).map_err(|e|e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e|e.to_string())?;
    let positions: std::collections::HashMap<String, usize> = lines
        .iter()
        .enumerate()
        .map(|(i, l)| (l["id"].as_str().unwrap().to_string(), i))
        .collect();
    let mut query = db.prepare("SELECT line_id,trait,mean_value,units,observation_count FROM line_trait_summary ORDER BY line_id,trait").map_err(|e|e.to_string())?;
    let values = query.query_map([], |r| Ok((r.get::<_,String>(0)?,json!({"trait":r.get::<_,String>(1)?,"value":r.get::<_,Option<f64>>(2)?,"unit":r.get::<_,String>(3)?,"observationCount":r.get::<_,i64>(4)?})))).map_err(|e|e.to_string())?;
    for row in values {
        let (id, value) = row.map_err(|e| e.to_string())?;
        if let Some(i) = positions.get(&id) {
            lines[*i]["estimates"].as_array_mut().unwrap().push(value);
        }
    }
    let mut summary = serde_json::Map::new();
    let mut query = db
        .prepare("SELECT key,value FROM dataset_summary ORDER BY key")
        .map_err(|e| e.to_string())?;
    for row in query
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?
    {
        let (key, value) = row.map_err(|e| e.to_string())?;
        summary.insert(
            key,
            serde_json::from_str(&value).map_err(|e| e.to_string())?,
        );
    }
    Ok(json!({"lines":lines,"summary":summary}))
}

#[tauri::command]
pub fn reference_snapshot(app: tauri::AppHandle) -> Result<Value, String> {
    let path = app
        .path()
        .resolve(
            "data/genefield-reference.sqlite",
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|e| e.to_string())?;
    read_reference(&path)
}

#[cfg(test)]
mod tests {
    #[test]
    fn real_read_only_reference() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("resources/data/genefield-reference.sqlite");
        let value = super::read_reference(&path).unwrap();
        assert_eq!(
            value["summary"]["line_count"],
            value["lines"].as_array().unwrap().len()
        );
        assert!(value["lines"]
            .as_array()
            .unwrap()
            .iter()
            .any(|l| l["id"] == "GID_1233"));
    }
}
