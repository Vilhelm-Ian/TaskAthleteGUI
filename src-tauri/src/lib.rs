use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize}; // Serialize might be needed if any local structs are returned
use std::sync::{Arc, Mutex};
// For HashMap in list_aliases, though often implicitly available via std prelude
// use std::collections::HashMap; // Explicit import not strictly necessary for HashMap usually

// Import your library crate - assuming the name is task_athlete_lib
use task_athlete_lib::{
    AddWorkoutParams,
    AppService,
    Config,
    // ConfigError, // Handled as String
    // DbError, // Handled as String
    EditWorkoutParams,
    ExerciseDefinition,
    ExerciseStats,
    ExerciseType,
    GraphType,
    PBInfo,
    PersonalBests,
    Units,
    VolumeFilters,
    Workout,
    WorkoutFilters,
    SyncSummary,
    sync_client
};



// Type alias for the shared state
type AppState = Arc<Mutex<AppService>>;

#[derive(Deserialize, Serialize)]
struct SyncResultPayload {
    sent: SyncSummary,
    received: SyncSummary,
}

struct SyncPrelude {
    server_url: String,
    last_sync_ts: Option<DateTime<Utc>>,
    local_changes: sync_client::ChangesPayload,
    summary_sent: SyncSummary,
}



// --- Command Input Structs ---
#[derive(Deserialize)]
struct AddWorkoutCmdParams {
    pub exercise_identifier: String,
    pub date: Option<String>,
    pub sets: Option<i64>,
    pub reps: Option<i64>,
    pub weight: Option<f64>,
    pub duration: Option<i64>,
    pub distance: Option<f64>,
    pub notes: Option<String>,
    pub implicit_type: Option<String>,
    pub implicit_muscles: Option<String>,
    pub bodyweight_to_use: Option<f64>,
}

#[derive(Deserialize)]
struct GetDataForGraphPayload {
    identifier: String,
    #[serde(alias = "graphTypeStr")]
    graph_type_str: String,
    start_date: Option<String>,
    end_date: Option<String>,
}

#[derive(Deserialize)]
struct SetUnitsPayload {
    units: String,
}

#[derive(Deserialize)]
struct MonthYearQuery {
    year: i32,
    month: u32,
}

#[derive(Deserialize)]
struct EditWorkoutCmdParams {
    pub id: i64,
    pub new_exercise_identifier: Option<String>,
    pub new_sets: Option<i64>,
    pub new_reps: Option<i64>,
    pub new_weight: Option<f64>,
    pub new_bodyweight: Option<f64>,
    pub new_duration: Option<i64>,
    pub new_distance_arg: Option<f64>,
    pub new_notes: Option<String>,
    pub new_date: Option<String>,
}

#[derive(Deserialize, Default)]
struct WorkoutFiltersCmdParams {
    pub exercise_name: Option<String>,
    pub date: Option<String>,
    pub exercise_type: Option<String>,
    pub muscle: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Deserialize, Default)]
struct VolumeFiltersCmdParams {
    pub exercise_name: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub exercise_type: Option<String>,
    pub muscle: Option<String>,
    pub limit_days: Option<u32>,
}

#[derive(Deserialize)]
struct GetPreviousWorkoutDetailsPayload {
    identifier: String,
    n: u32,
}

// --- Helper Functions ---
fn parse_naive_date(date_str: &str) -> Result<NaiveDate, String> {
    NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
        .map_err(|e| format!("Invalid date format '{}': {}", date_str, e))
}

fn parse_datetime(date_str: &str) -> Result<DateTime<Utc>, String> {
    DateTime::parse_from_rfc3339(date_str)
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(|e| format!("Invalid timestamp format '{}': {}", date_str, e))
}

fn parse_exercise_type(type_str: &str) -> Result<ExerciseType, String> {
    ExerciseType::try_from(type_str)
        .map_err(|e| format!("Invalid exercise type string: {} ({})", type_str, e))
}

// --- Tauri Commands ---

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}


#[tauri::command]
async fn perform_sync(
    server_url_override: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<SyncResultPayload, String> {
    // Phase 1: Read data from the database (synchronous)
    let prelude = {
        let service = state
            .lock()
            .map_err(|e| format!("Failed to lock state for sync (read phase): {}", e))?;

        let server_url = service
            .get_server_url(server_url_override)
            .map_err(|e| e.to_string())?;
        let last_sync_ts = service.get_last_sync_timestamp();
        let local_changes = service
            .collect_local_changes(last_sync_ts)
            .map_err(|e| format!("Failed to collect local changes: {}", e))?;

        let summary_sent = SyncSummary {
            config: local_changes.config.is_some(),
            exercises: local_changes.exercises.len(),
            workouts: local_changes.workouts.len(),
            aliases: local_changes.aliases.len(),
            bodyweights: local_changes.bodyweights.len(),
        };

        SyncPrelude {
            server_url,
            last_sync_ts,
            local_changes,
            summary_sent,
        }
    }; // Mutex lock is released here as `service` goes out of scope.

    // Phase 2: Network communication (asynchronous)
    let client = sync_client::SyncClient::new(prelude.server_url.clone());
    println!("Pushing changes to server: {}...", prelude.server_url);
    let server_response = client
        .push_and_pull_changes(prelude.last_sync_ts, prelude.local_changes)
        .await
        .map_err(|e| format!("Sync communication with server failed: {}", e))?;

    // Phase 3: Write data to the database (synchronous)
    let summary_received = {
        let mut service = state
            .lock()
            .map_err(|e| format!("Failed to lock state for sync (write phase): {}", e))?;

        println!("Applying server changes...");
        let summary = service
            .apply_server_changes(server_response.data_to_client)
            .map_err(|e| format!("Failed to apply server changes: {}", e))?;

        service
            .set_last_sync_timestamp(server_response.server_current_ts)
            .map_err(|e| format!("Failed to update last sync timestamp in config: {}", e))?;

        println!("Local database and config updated with server changes.");
        summary
    }; // Mutex lock is released here.

    Ok(SyncResultPayload {
        sent: prelude.summary_sent,
        received: summary_received,
    })
}

#[tauri::command]
fn set_sync_server_url(url: Option<String>, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut service = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    service.set_sync_server_url(url).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_config(state: tauri::State<'_, AppState>) -> Result<Config, String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    Ok(service.config.clone())
}

#[tauri::command]
fn save_config(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service.save_config().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_bodyweight(weight: f64, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service.set_bodyweight(weight).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_workouts(
    filters: WorkoutFiltersCmdParams,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Workout>, String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    let lib_filters = WorkoutFilters {
        exercise_name: filters.exercise_name.as_deref(),
        date: filters.date.map(|s| parse_naive_date(&s)).transpose()?,
        exercise_type: filters
            .exercise_type
            .map(|s| parse_exercise_type(&s))
            .transpose()?,
        muscle: filters.muscle.as_deref(),
        limit: filters.limit,
    };
    service
        .list_workouts(&lib_filters)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_workout_dates_for_month(
    query: MonthYearQuery,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let service = state.lock().map_err(|e| {
        format!(
            "Failed to lock state for get_workout_dates_for_month: {}",
            e
        )
    })?;
    service
        .get_workout_dates_for_month(query.year, query.month)
        .map_err(|e| format!("Error fetching workout dates from lib: {}", e))
}

#[tauri::command]
fn add_workout(
    params: AddWorkoutCmdParams,
    state: tauri::State<'_, AppState>,
) -> Result<(i64, Option<PBInfo>), String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    let date = match params.date {
        Some(date_str) => parse_datetime(&date_str)?,
        None => Utc::now(),
    };
    let implicit_type = params
        .implicit_type
        .map(|s| parse_exercise_type(&s))
        .transpose()?;
    let lib_params = AddWorkoutParams {
        exercise_identifier: &params.exercise_identifier,
        date,
        sets: params.sets,
        reps: params.reps,
        weight: params.weight,
        duration: params.duration,
        distance: params.distance,
        notes: params.notes,
        implicit_type,
        implicit_muscles: params.implicit_muscles,
        bodyweight_to_use: params.bodyweight_to_use,
    };
    service.add_workout(lib_params).map_err(|e| e.to_string())
}

#[tauri::command]
fn edit_workout(
    params: EditWorkoutCmdParams,
    state: tauri::State<'_, AppState>,
) -> Result<u64, String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    let lib_params = EditWorkoutParams {
        id: params.id,
        new_exercise_identifier: params.new_exercise_identifier,
        new_sets: params.new_sets,
        new_reps: params.new_reps,
        new_weight: params.new_weight,
        new_bodyweight: params.new_bodyweight,
        new_duration: params.new_duration,
        new_distance_arg: params.new_distance_arg,
        new_notes: params.new_notes,
        new_date: params.new_date.map(|s| parse_naive_date(&s)).transpose()?,
    };
    service.edit_workout(lib_params).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_workouts(ids: Vec<i64>, state: tauri::State<'_, AppState>) -> Result<Vec<i64>, String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service.delete_workouts(&ids).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_exercises(
    type_filter_str: Option<String>,
    muscles_filter: Option<Vec<String>>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ExerciseDefinition>, String> {
    let muscle_refs: Option<Vec<&str>> = muscles_filter
        .as_ref()
        .map(|m| m.iter().map(|s| s.as_str()).collect());
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    let type_filter = type_filter_str
        .map(|s| parse_exercise_type(&s))
        .transpose()?;
    service
        .list_exercises(type_filter, muscle_refs)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_exercise(
    name: String,
    type_str: String,
    muscles: Option<String>,
    log_weight: Option<bool>,
    log_reps: Option<bool>,
    log_duration: Option<bool>,
    log_distance: Option<bool>,
    state: tauri::State<'_, AppState>,
) -> Result<i64, String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    let ex_type = parse_exercise_type(&type_str)?;
    let log_flags = Some((log_weight, log_reps, log_duration, log_distance));
    service
        .create_exercise(&name, ex_type, log_flags, muscles.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn edit_exercise(
    identifier: String,
    new_name: Option<String>,
    new_type_str: Option<String>,
    new_muscles: Option<Option<String>>,
    log_weight: Option<bool>,
    log_reps: Option<bool>,
    log_duration: Option<bool>,
    log_distance: Option<bool>,
    state: tauri::State<'_, AppState>,
) -> Result<u64, String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    let new_type = new_type_str.map(|s| parse_exercise_type(&s)).transpose()?;
    let new_muscles_ref = new_muscles.as_ref().map(|opt_s| opt_s.as_deref());
    let log_flags = Some((log_weight, log_reps, log_duration, log_distance));
    service
        .edit_exercise(
            &identifier,
            new_name.as_deref(),
            new_type,
            log_flags,
            new_muscles_ref,
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_exercise(
    identifiers: Vec<String>,
    state: tauri::State<'_, AppState>,
) -> Result<u64, String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service
        .delete_exercise(&identifiers)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_exercise_stats(
    identifier: String,
    state: tauri::State<'_, AppState>,
) -> Result<ExerciseStats, String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service
        .get_exercise_stats(&identifier)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_data_for_graph(
    payload: GetDataForGraphPayload,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<(NaiveDate, f64)>, String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    let graph_type = match payload.graph_type_str.as_str() {
        "Estimated1RM" => GraphType::Estimated1RM,
        "MaxWeight" => GraphType::MaxWeight,
        "MaxReps" => GraphType::MaxReps,
        "WorkoutVolume" => GraphType::WorkoutVolume,
        "WorkoutReps" => GraphType::WorkoutReps,
        "WorkoutDuration" => GraphType::WorkoutDuration,
        "WorkoutDistance" => GraphType::WorkoutDistance,
        _ => return Err(format!("Invalid graph type: {}", payload.graph_type_str)),
    };
    let start_date_filter = payload
        .start_date
        .map(|s| parse_naive_date(&s))
        .transpose()?;
    let end_date_filter = payload.end_date.map(|s| parse_naive_date(&s)).transpose()?;
    service
        .get_data_for_graph(
            &payload.identifier,
            graph_type,
            start_date_filter,
            end_date_filter,
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_aliases(
    state: tauri::State<'_, AppState>,
) -> Result<std::collections::HashMap<String, String>, String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service.list_aliases().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_alias(
    alias_name: String,
    exercise_identifier: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service
        .create_alias(&alias_name, &exercise_identifier)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_alias(alias_name: String, state: tauri::State<'_, AppState>) -> Result<u64, String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service.delete_alias(&alias_name).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_previous_workout_details(
    payload: GetPreviousWorkoutDetailsPayload,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Workout>, String> {
    let service = state.lock().map_err(|e| {
        format!(
            "Failed to lock state for get_previous_workout_details: {}",
            e
        )
    })?;
    if payload.n == 0 {
        return Err("n must be greater than 0 for get_previous_workout_details".to_string());
    }
    service
        .list_workouts_for_exercise_on_nth_last_day(&payload.identifier, payload.n)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_all_muscles(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state for list_all_muscles: {}", e))?;
    service
        .list_all_muscles()
        .map_err(|e| format!("Error fetching all muscles from lib: {}", e))
}

#[tauri::command]
fn set_units(payload: SetUnitsPayload, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    let units_enum = match payload.units.to_lowercase().as_str() {
        "metric" => Units::Metric,
        "imperial" => Units::Imperial,
        _ => return Err(format!("Invalid units string: {}", payload.units)),
    };
    service.set_units(units_enum).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_streak_interval(days: u32, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service.set_streak_interval(days).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_pb_notification_enabled(
    enabled: bool,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service
        .set_pb_notification_enabled(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_pb_notify_weight(enabled: bool, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service
        .set_pb_notify_weight(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_pb_notify_reps(enabled: bool, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service
        .set_pb_notify_reps(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_pb_notify_duration(enabled: bool, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service
        .set_pb_notify_duration(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_pb_notify_distance(enabled: bool, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service
        .set_pb_notify_distance(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_target_bodyweight(
    weight: Option<f64>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    service
        .set_target_bodyweight(weight)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_body_weights(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<(i64, DateTime<Utc>, f64)>, String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    let bodyweights = service
        .list_bodyweights(u32::MAX)
        .map_err(|e| e.to_string())?;
    Ok(bodyweights)
}

#[tauri::command]
fn add_bodyweight_entry(weight: f64, state: tauri::State<'_, AppState>) -> Result<i64, String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state for add_bodyweight_entry: {}", e))?;
    let timestamp = Utc::now();
    let entry_id = service
        .add_bodyweight_entry(timestamp, weight)
        .map_err(|e| format!("Failed to add bodyweight entry to log: {}", e.to_string()))?;
    if let Err(e) = service.set_bodyweight(weight) {
        eprintln!(
            "Failed to update current_bodyweight in config after adding new entry: {}",
            e.to_string()
        );
    }
    Ok(entry_id)
}

// Main application entry point function
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_service = match task_athlete_lib::AppService::initialize() {
        Ok(service) => {
            println!("AppService initialized successfully.");
            println!("Config Path: {:?}", service.get_config_path());
            println!("DB Path: {:?}", service.get_db_path());
            service
        }
        Err(e) => {
            eprintln!("FATAL: Failed to initialize AppService: {:?}", e);
            // In a real app, you might want to use Tauri's dialog API before exiting
            // tauri::api::dialog::blocking::message(None::<&tauri::Window>, "Initialization Error", format!("Failed to initialize: {}", e));
            std::process::exit(1);
        }
    };

    let app_state: AppState = Arc::new(Mutex::new(app_service));

    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_opener::init()) // Added from your initial lib.rs
        .invoke_handler(tauri::generate_handler![
            greet, // Added from your initial lib.rs
            get_config,
            save_config,
            get_workout_dates_for_month,
            set_bodyweight,
            list_workouts,
            add_workout,
            edit_workout,
            delete_workouts,
            list_exercises,
            create_exercise,
            edit_exercise,
            delete_exercise,
            get_exercise_stats,
            get_data_for_graph,
            list_aliases,
            create_alias,
            delete_alias,
            list_all_muscles,
            set_units,
            get_body_weights,
            // set_bodyweight_prompt_enabled, // This was commented out in your original code
            set_streak_interval,
            set_pb_notification_enabled,
            set_pb_notify_weight,
            set_pb_notify_reps,
            set_pb_notify_duration,
            set_pb_notify_distance,
            set_target_bodyweight,
            get_previous_workout_details,
            add_bodyweight_entry,
            perform_sync,
            set_sync_srver_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
