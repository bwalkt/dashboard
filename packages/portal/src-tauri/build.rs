/// Builds Tauri assets and metadata for the current crate.
///
/// # Examples
///
/// ```rust
/// // In a build script (`build.rs`):
/// fn main() {
///     tauri_build::build();
/// }
/// ```
fn main() {
    tauri_build::build()
}