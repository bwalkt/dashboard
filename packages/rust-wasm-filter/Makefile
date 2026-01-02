.PHONY: build clean install-deps

# Target for WASM compilation
TARGET = wasm32-wasi
OUTPUT_DIR = ../envoy-wasm-filter/build
WASM_FILE = challenge-authz.wasm

# Install build dependencies
install-deps:
	@echo "Installing wasm32-wasi target..."
	@rustup target add $(TARGET)

# Build the WASM filter
build: install-deps
	@echo "Building Rust WASM filter..."
	@cargo build --target $(TARGET) --release
	@mkdir -p $(OUTPUT_DIR)
	@cp target/$(TARGET)/release/rust_wasm_filter.wasm $(OUTPUT_DIR)/$(WASM_FILE)
	@echo "WASM filter built: $(OUTPUT_DIR)/$(WASM_FILE)"
	@ls -lh $(OUTPUT_DIR)/$(WASM_FILE)

# Clean build artifacts
clean:
	@cargo clean
	@rm -f $(OUTPUT_DIR)/$(WASM_FILE)
	@echo "Cleaned build artifacts"

# Development build (with debug symbols)
dev:
	@echo "Building Rust WASM filter in debug mode..."
	@cargo build --target $(TARGET)
	@mkdir -p $(OUTPUT_DIR)
	@cp target/$(TARGET)/debug/rust_wasm_filter.wasm $(OUTPUT_DIR)/$(WASM_FILE)
	@echo "Debug WASM filter built: $(OUTPUT_DIR)/$(WASM_FILE)"