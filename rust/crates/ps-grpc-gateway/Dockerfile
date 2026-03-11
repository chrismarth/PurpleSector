# Multi-stage build for ps-grpc-gateway
#
# Build: docker build -f rust/crates/ps-grpc-gateway/Dockerfile -t ps-grpc-gateway .
# (run from project root, NOT from rust/)
# Run:   docker run -p 50051:50051 -e KAFKA_BROKERS=redpanda:9092 -e AUTH_DISABLED=true ps-grpc-gateway

# ── Stage 1: Build ────────────────────────────────────────────────────
FROM rustlang/rust:nightly-bookworm AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    protobuf-compiler \
    cmake \
    libcurl4-openssl-dev \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy workspace manifest and lock
COPY rust/Cargo.toml rust/Cargo.lock ./

# Copy all crate manifests (for dependency caching)
COPY rust/crates/ps-telemetry-core/Cargo.toml crates/ps-telemetry-core/Cargo.toml
COPY rust/crates/ps-grpc-gateway/Cargo.toml crates/ps-grpc-gateway/Cargo.toml
COPY rust/crates/ps-tray-app/Cargo.toml crates/ps-tray-app/Cargo.toml
COPY rust/crates/ps-demo-replay/Cargo.toml crates/ps-demo-replay/Cargo.toml

# Create dummy source files for dependency caching
RUN mkdir -p crates/ps-telemetry-core/src && echo "pub fn _dummy() {}" > crates/ps-telemetry-core/src/lib.rs \
    && mkdir -p crates/ps-grpc-gateway/src && echo "fn main() {}" > crates/ps-grpc-gateway/src/main.rs \
    && mkdir -p crates/ps-tray-app/src && echo "fn main() {}" > crates/ps-tray-app/src/main.rs \
    && mkdir -p crates/ps-demo-replay/src && echo "fn main() {}" > crates/ps-demo-replay/src/main.rs

# Copy consolidated proto from project root and build scripts
COPY proto/ ../proto/
COPY rust/crates/ps-telemetry-core/build.rs crates/ps-telemetry-core/build.rs
COPY rust/crates/ps-grpc-gateway/build.rs crates/ps-grpc-gateway/build.rs

# Build dependencies only (cached layer)
RUN cargo build --release -p ps-grpc-gateway 2>/dev/null || true

# Copy actual source code
COPY rust/crates/ps-telemetry-core/src/ crates/ps-telemetry-core/src/
COPY rust/crates/ps-grpc-gateway/src/ crates/ps-grpc-gateway/src/

# Build the gateway binary (touch to force rebuild)
RUN touch crates/ps-grpc-gateway/src/main.rs && cargo build --release -p ps-grpc-gateway

# ── Stage 2: Runtime ──────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libcurl4 \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/target/release/ps-grpc-gateway /usr/local/bin/ps-grpc-gateway

# Default environment
ENV KAFKA_BROKERS=redpanda:9092
ENV KAFKA_TOPIC=telemetry-batches
ENV GRPC_PORT=50051
ENV AUTH_DISABLED=true
ENV RUST_LOG=info

EXPOSE 50051

CMD ["ps-grpc-gateway"]
