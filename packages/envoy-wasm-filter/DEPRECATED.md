# DEPRECATED: Go WASM Filter

⚠️ **This Go WASM filter implementation is deprecated and will be removed in a future version.**

## Reason for Deprecation

The Go/TinyGo WASM implementation has been replaced by a Rust implementation due to:

- **Runtime instability**: Frequent crashes in TinyGo WASM runtime
- **Memory management issues**: Fundamental limitations in TinyGo garbage collection
- **Limited Redis support**: Cannot make direct TCP connections in WASM sandbox
- **Async operation failures**: Goroutines and HTTP callbacks cause runtime errors

## Migration Path

Please use the new **Rust WASM Filter** instead:

- **Location**: `packages/rust-wasm-filter/`
- **Benefits**: 
  - Stable memory management in WASM
  - Better async support
  - More reliable Redis integration via Envoy Redis proxy
  - No runtime crashes

## Build Instructions

To build the new Rust filter:

```bash
cd packages/rust-wasm-filter
make build
```

The compiled WASM file will be placed in `packages/envoy-wasm-filter/build/challenge-authz.wasm` and automatically used by Envoy.

## Timeline

- **Current**: Both implementations exist
- **Next Release**: Go implementation will show deprecation warnings
- **Future Release**: Go implementation will be removed entirely