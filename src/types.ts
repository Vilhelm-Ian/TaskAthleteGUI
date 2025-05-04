// src/types.ts

// Match ExerciseType enum/string representation in Rust
export type ExerciseType = "body-weight" | "cardio" | "resistance"; // Adjust as per your lib's TryFrom<&str>

// Match Units enum if you expose it (currently not shown in main.rs commands)
// export type Units = "Metric" | "Imperial";

export interface Config {
    db_path: string;
    backup_path: string | null;
    units: string; // Assuming Units is represented as a string for simplicity now
    bodyweight: number | null;
    // Add other config fields if they exist and are serialized
}

// From PBInfo struct in lib (Needs Serialize)
export interface PBInfo {
    pb_type: string; // e.g., "Max Weight", "Max Reps"
    value: number;
    date: string; // ISO Date string "YYYY-MM-DD"
}

// From Workout struct in lib (Needs Serialize)
export interface Workout {
    id: number; // Assuming i64 maps to number
    exercise_name: string;
    exercise_type: ExerciseType;
    muscles: string | null; // Comma-separated?
    date: string; // ISO DateTime string from Utc::now() or parsed DateTime<Utc>
    sets: number | null;
    reps: number | null;
    weight: number | null;
    duration: number | null; // seconds?
    distance: number | null;
    notes: string | null;
    bodyweight: number | null;
    estimated_1rm: number | null;
    volume: number | null;
}

// From ExerciseDefinition struct in lib (Needs Serialize)
export interface ExerciseDefinition {
    id: number; // Assuming i64 maps to number
    name: string;
    exercise_type: ExerciseType;
    muscles: string | null;
    log_weight: boolean;
    log_reps: boolean;
    log_duration: boolean;
    log_distance: boolean;
    is_active: boolean;
    is_alias: boolean;
    alias_target: string | null;
}

// From ExerciseStats struct in lib (Needs Serialize)
export interface ExerciseStats {
    total_workouts: number;
    total_sets: number | null;
    total_reps: number | null;
    total_volume: number | null;
    total_duration: number | null;
    total_distance: number | null;
    first_workout_date: string | null; // ISO Date string "YYYY-MM-DD"
    last_workout_date: string | null; // ISO Date string "YYYY-MM-DD"
    // Add PersonalBests if it's part of this struct and serialized
    // personal_bests: PersonalBests | null; // Define PersonalBests interface if needed
}

// --- Interfaces for Tauri Command Parameters ---

// Mirror WorkoutFiltersCmdParams, using string dates/types
export interface WorkoutFiltersParams {
    exercise_name?: string;
    date?: string; // "YYYY-MM-DD"
    exercise_type?: ExerciseType; // Use the defined type
    muscle?: string;
    limit?: number;
}

// Mirror AddWorkoutCmdParams, using string dates/types
export interface AddWorkoutParams {
    exercise_identifier: string;
    date?: string; // ISO 8601 DateTime string (e.g., from new Date().toISOString())
    sets?: number;
    reps?: number;
    weight?: number;
    duration?: number;
    distance?: number;
    notes?: string;
    implicit_type?: ExerciseType; // Use the defined type
    implicit_muscles?: string;
    bodyweight_to_use?: number;
}

// Mirror EditWorkoutCmdParams, using string dates/types
export interface EditWorkoutParams {
    id: number;
    new_exercise_identifier?: string;
    new_sets?: number;
    new_reps?: number;
    new_weight?: number;
    new_bodyweight?: number;
    new_duration?: number;
    new_distance_arg?: number;
    new_notes?: string;
    new_date?: string; // "YYYY-MM-DD"
}

// Command parameter types for exercises
export interface CreateExerciseParams {
    name: string;
    type_str: ExerciseType; // Use the defined type
    muscles?: string;
    log_weight?: boolean;
    log_reps?: boolean;
    log_duration?: boolean;
    log_distance?: boolean;
}

export interface EditExerciseParams {
    identifier: string;
    new_name?: string;
    new_type_str?: ExerciseType; // Use the defined type
    new_muscles?: string | null; // Matching Option<Option<String>> - send null to clear, undefined to keep existing
    log_weight?: boolean;
    log_reps?: boolean;
    log_duration?: boolean;
    log_distance?: boolean;
}
