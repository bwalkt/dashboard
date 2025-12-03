.PHONY: build clean build-docker

build:
	@echo "Building Go proxy-wasm filter with TinyGo..."
	@mkdir -p build
	@if command -v tinygo > /dev/null; then \
		tinygo build -o build/filter.wasm -scheduler=none -target=wasi .; \
	else \
		echo "TinyGo not found. Using Docker build instead..."; \
		$(MAKE) build-docker; \
	fi

build-docker:
	@echo "Building Go proxy-wasm filter using Docker..."
	@mkdir -p build
	docker run --rm \
		-v "$(PWD):/build" \
		-w /build \
		tinygo/tinygo:0.31.0 \
		tinygo build -o build/filter.wasm -scheduler=none -target=wasi .

clean:
	rm -rf build

