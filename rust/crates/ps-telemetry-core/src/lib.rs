//! PurpleSector Telemetry Core Library
//!
//! Shared library for sim data capture, used by both the System Tray app
//! (with cloud transport) and the Tauri Desktop app (capture only).
//!
//! # Feature flags
//!
//! - `capture` (default) — UDP and SharedMemory readers, protobuf types
//! - `cloud-transport` — WAL, gRPC client, and batch assembly (tray app only)

pub mod proto;
pub mod capture;

#[cfg(feature = "cloud-transport")]
pub mod wal;

#[cfg(feature = "cloud-transport")]
pub mod grpc;

#[cfg(feature = "cloud-transport")]
pub mod batch;

pub use proto::purplesector;
