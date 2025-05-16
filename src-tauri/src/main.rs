// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use task_athlete_gui_lib::run;

fn main() {
    run();
}
