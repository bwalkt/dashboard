// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Program entry point that starts the application.
///
/// # Examples
///
/// ```no_run
/// // Starts the application (not executed during doctests)
/// main();
/// ```
fn main() {
    salesforce_dashboard_lib::run()
}