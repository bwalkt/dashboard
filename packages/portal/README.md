# PZero Portal - Tauri Desktop Application

A Tauri-based desktop application for PZero device management with BLE support.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Environment Variables

### BLE Configuration

- **`NO_RETRIES`** - Controls the number of retry attempts for BLE device discovery
  - Type: `u32` (positive integer)
  - Default: `10`
  - Minimum: `1` (automatically enforced to ensure at least 500ms discovery window)
  - Each retry waits 500ms, so the total discovery timeout is `NO_RETRIES * 500ms`
  - Example: `NO_RETRIES=20` for 10 seconds total timeout
  - Setting to `0` will be automatically adjusted to `1` to prevent immediate scan failure
