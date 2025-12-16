.PHONY: build clean build-docker

build:
	@echo "Building Go proxy-wasm filter with upstream Go 1.24+ and GOOS=wasip1..."
	@mkdir -p build
	@if go version | grep -q "go1\.2[4-9]\|go1\.[3-9][0-9]\|go[2-9]\."; then \
		GOOS=wasip1 GOARCH=wasm go build -o build/filter.wasm .; \
	else \
		echo "Go 1.24+ not found. Using Docker build instead..."; \
		$(MAKE) build-docker; \
	fi

build-docker:
	@echo "Building Go proxy-wasm filter using Docker with Go 1.24..."
	@mkdir -p build
	docker run --rm \
		-v "$(PWD):/build" \
		-w /build \
		golang:1.24-alpine \
		sh -c "GOOS=wasip1 GOARCH=wasm go build -o build/filter.wasm ."

clean:
	rm -rf build

