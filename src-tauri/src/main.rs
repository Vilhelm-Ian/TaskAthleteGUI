// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::{DateTime, NaiveDate, Utc}; // Added via Cargo.toml
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex}; // Keep only one import

// Import your library crate - assuming the name is task_athlete_lib
use task_athlete_lib::{
    self,             // Use the crate name
    AddWorkoutParams, // Original lib struct
    AppService,
    Config,
    // ConfigError, // Add Serialize/Display if needed, or handle as String
    // DbError, // Add Serialize/Display if needed, or handle as String
    EditWorkoutParams, // Original lib struct
    ExerciseDefinition,
    ExerciseStats,
    ExerciseType, // Needs Serialize/Deserialize in lib
    GraphType,    // Needs Serialize/Deserialize in lib (if used as input/output directly)
    PBInfo,       // Needs Serialize in lib
    // Add other necessary types from your lib here...
    PersonalBests,  // Needs Serialize in lib
    Units,          // Needs Serialize/Deserialize in lib
    VolumeFilters,  // Original lib struct
    Workout,        // Needs Serialize in lib
    WorkoutFilters, // Original lib struct
};

// Type alias for the shared state
type AppState = Arc<Mutex<AppService>>;

// --- Command Input Structs (Defined ONCE, without pub unless needed elsewhere) ---
#[derive(Deserialize)]
struct AddWorkoutCmdParams {
    pub exercise_identifier: String,
    pub date: Option<String>, // Pass as ISO 8601 String
    pub sets: Option<i64>,
    pub reps: Option<i64>,
    pub weight: Option<f64>,
    pub duration: Option<i64>,
    pub distance: Option<f64>,
    pub notes: Option<String>,
    pub implicit_type: Option<String>, // Pass ExerciseType as String
    pub implicit_muscles: Option<String>,
    pub bodyweight_to_use: Option<f64>,
}

#[derive(Deserialize)]
struct GetDataForGraphPayload {
    identifier: String,
    #[serde(alias = "graphTypeStr")]
    graph_type_str: String,
    start_date: Option<String>, // YYYY-MM-DD
    end_date: Option<String>,   // YYYY-MM-DD
}

#[derive(Deserialize)]
struct SetUnitsPayload {
    units: String, // "metric" or "imperial"
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
    pub new_date: Option<String>, // Pass NaiveDate as "YYYY-MM-DD" String
}

#[derive(Deserialize, Default)]
struct WorkoutFiltersCmdParams {
    pub exercise_name: Option<String>,
    pub date: Option<String>, // Pass NaiveDate as "YYYY-MM-DD" String
    pub exercise_type: Option<String>, // Pass ExerciseType as String
    pub muscle: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Deserialize, Default)]
struct VolumeFiltersCmdParams {
    pub exercise_name: Option<String>,
    pub start_date: Option<String>, // Pass NaiveDate as "YYYY-MM-DD" String
    pub end_date: Option<String>,   // Pass NaiveDate as "YYYY-MM-DD" String
    pub exercise_type: Option<String>, // Pass ExerciseType as String
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
    // Use the TryFrom implementation defined in the library
    ExerciseType::try_from(type_str)
        .map_err(|e| format!("Invalid exercise type string: {} ({})", type_str, e))
}

// --- Tauri Commands ---

#[tauri::command]
fn get_config(state: tauri::State<'_, AppState>) -> Result<Config, String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    // Config needs to derive Serialize in the library
    Ok(service.config.clone())
}

#[tauri::command]
fn save_config(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    // Convert ConfigError to String
    service.save_config().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_bodyweight(weight: f64, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    // Convert ConfigError to String
    service.set_bodyweight(weight).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_workouts(
    filters: WorkoutFiltersCmdParams,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Workout>, String> {
    // Workout needs Serialize in lib
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

    // Convert anyhow::Error to String
    service
        .list_workouts(&lib_filters)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_workout_dates_for_month(
    // This is the command for the frontend
    query: MonthYearQuery, // The input struct { year: i32, month: u32 }
    state: tauri::State<'_, AppState>,
) -> Result<Vec<String>, String> {
    // Returns Vec<String> of "YYYY-MM-DD" or an error string
    let service = state.lock().map_err(|e| {
        format!(
            "Failed to lock state for get_workout_dates_for_month: {}",
            e
        )
    })?;

    // Calls the AppService method from your lib.rs
    service
        .get_workout_dates_for_month(query.year, query.month)
        .map_err(|e| format!("Error fetching workout dates from lib: {}", e))
}

#[tauri::command]
fn add_workout(
    params: AddWorkoutCmdParams,
    state: tauri::State<'_, AppState>,
) -> Result<(i64, Option<PBInfo>), String> {
    // PBInfo needs Serialize in lib
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

    // Convert anyhow::Error to String
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

    // Convert anyhow::Error to String
    service.edit_workout(lib_params).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_workouts(ids: Vec<i64>, state: tauri::State<'_, AppState>) -> Result<Vec<i64>, String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    // Convert anyhow::Error to String
    service.delete_workouts(&ids).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_exercises(
    type_filter_str: Option<String>,
    muscles_filter: Option<Vec<String>>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ExerciseDefinition>, String> {
    // ExerciseDefinition needs Serialize in lib
    let muscle_refs: Option<Vec<&str>> = muscles_filter
        .as_ref()
        .map(|m| m.iter().map(|s| s.as_str()).collect());

    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    let type_filter = type_filter_str
        .map(|s| parse_exercise_type(&s))
        .transpose()?;
    // Convert anyhow::Error to String
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
    // Convert anyhow::Error to String
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

    // Convert anyhow::Error to String
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
    // Convert anyhow::Error to String
    service
        .delete_exercise(&identifiers)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_exercise_stats(
    identifier: String,
    state: tauri::State<'_, AppState>,
) -> Result<ExerciseStats, String> {
    // ExerciseStats needs Serialize in lib
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    // Convert anyhow::Error to String
    service
        .get_exercise_stats(&identifier)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_data_for_graph(
    payload: GetDataForGraphPayload,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<(NaiveDate, f64)>, String> {
    // Return type matches service
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
    // HashMap<String, String> is serializable
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    // Convert anyhow::Error to String
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
    // Convert anyhow::Error to String
    service
        .create_alias(&alias_name, &exercise_identifier)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_alias(alias_name: String, state: tauri::State<'_, AppState>) -> Result<u64, String> {
    let service = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    // Convert anyhow::Error to String
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

    // This calls the library function you provided
    service
        .list_workouts_for_exercise_on_nth_last_day(&payload.identifier, payload.n)
        .map_err(|e| {
            // It's okay if no previous workouts are found, this will likely result in an empty Vec or a specific error.
            // The frontend will handle an empty Vec gracefully.
            // If it's a more severe error, it will be propagated.
            e.to_string()
        })
}

// Add more commands for other AppService methods as needed...

// --- Main Function (Keep only ONE) ---
fn main() {
    // Initialize the AppService using the correct library name
    let app_service = match task_athlete_lib::AppService::initialize() {
        // Corrected crate name
        Ok(service) => {
            println!("AppService initialized successfully.");
            println!("Config Path: {:?}", service.get_config_path());
            println!("DB Path: {:?}", service.get_db_path());
            service
        }
        Err(e) => {
            eprintln!("FATAL: Failed to initialize AppService: {:?}", e);
            // Consider using a Tauri dialog to show the error before exiting
            // tauri::api::dialog::blocking::message(None::<&Window>, "Initialization Error", format!("Failed to initialize: {}", e));
            std::process::exit(1); // Exit cleanly
        }
    };

    let app_state: AppState = Arc::new(Mutex::new(app_service));

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            // Commands list
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
            // set_bodyweight_prompt_enabled,
            set_streak_interval,
            set_pb_notification_enabled,
            set_pb_notify_weight,
            set_pb_notify_reps,
            set_pb_notify_duration,
            set_pb_notify_distance,
            set_target_bodyweight,
            get_previous_workout_details,
            add_bodyweight_entry
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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

// #[tauri::command]
// fn set_bodyweight_prompt_enabled(
//     enabled: bool,
//     state: tauri::State<'_, AppState>,
// ) -> Result<(), String> {
//     let mut service = state
//         .lock()
//         .map_err(|e| format!("Failed to lock state: {}", e))?;
//     service
//         .set_bodyweight_prompt_enabled(enabled)
//         .map_err(|e| e.to_string())
// }

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

// Individual PB notification type toggles
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
    let mut service = state // Make service mutable
        .lock()
        .map_err(|e| format!("Failed to lock state for add_bodyweight_entry: {}", e))?;

    let timestamp = Utc::now(); // Generate timestamp in the backend

    // 1. Add the entry to the historical log
    let entry_id = service
        .add_bodyweight_entry(timestamp, weight)
        .map_err(|e| format!("Failed to add bodyweight entry to log: {}", e.to_string()))?;

    // 2. Update the config's current_bodyweight and save the config.
    // This assumes logging a new weight should also make it the "current" one.
    // The set_bodyweight method in AppService should handle updating
    // config.current_bodyweight and then saving the config.
    if let Err(e) = service.set_bodyweight(weight) {
        // Log this error, but proceed as the main entry was added.
        // Or, decide if this should be a hard error for the command.
        // For now, just log and return the entry_id.
        eprintln!(
            "Failed to update current_bodyweight in config after adding new entry: {}",
            e.to_string()
        );
        // If you want this to be a critical failure, you could return Err(e.to_string()) here.
    }

    Ok(entry_id) // Return the ID of the newly added bodyweight log entry
}
