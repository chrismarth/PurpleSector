//! Live statistics tracking for the tray app.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Instant;

/// Thread-safe live statistics, shared between the pipeline and the UI.
#[derive(Debug, Clone)]
pub struct PipelineStats {
    inner: Arc<Inner>,
}

#[derive(Debug)]
struct Inner {
    samples_captured: AtomicU64,
    batches_sent: AtomicU64,
    batches_failed: AtomicU64,
    wal_depth: AtomicU64,
    bytes_sent: AtomicU64,
    start_time: Instant,
}

/// Snapshot of stats at a point in time (for UI display).
#[derive(Debug, Clone, Default)]
pub struct StatsSnapshot {
    pub samples_captured: u64,
    pub batches_sent: u64,
    pub batches_failed: u64,
    pub wal_depth: u64,
    pub bytes_sent: u64,
    pub uptime_secs: f64,
    pub samples_per_sec: f64,
}

impl PipelineStats {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Inner {
                samples_captured: AtomicU64::new(0),
                batches_sent: AtomicU64::new(0),
                batches_failed: AtomicU64::new(0),
                wal_depth: AtomicU64::new(0),
                bytes_sent: AtomicU64::new(0),
                start_time: Instant::now(),
            }),
        }
    }

    pub fn inc_samples(&self) {
        self.inner.samples_captured.fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_batches_sent(&self) {
        self.inner.batches_sent.fetch_add(1, Ordering::Relaxed);
    }

    pub fn inc_batches_failed(&self) {
        self.inner.batches_failed.fetch_add(1, Ordering::Relaxed);
    }

    pub fn set_wal_depth(&self, depth: u64) {
        self.inner.wal_depth.store(depth, Ordering::Relaxed);
    }

    pub fn add_bytes_sent(&self, bytes: u64) {
        self.inner.bytes_sent.fetch_add(bytes, Ordering::Relaxed);
    }

    /// Take a snapshot for display.
    pub fn snapshot(&self) -> StatsSnapshot {
        let uptime = self.inner.start_time.elapsed().as_secs_f64();
        let samples = self.inner.samples_captured.load(Ordering::Relaxed);
        StatsSnapshot {
            samples_captured: samples,
            batches_sent: self.inner.batches_sent.load(Ordering::Relaxed),
            batches_failed: self.inner.batches_failed.load(Ordering::Relaxed),
            wal_depth: self.inner.wal_depth.load(Ordering::Relaxed),
            bytes_sent: self.inner.bytes_sent.load(Ordering::Relaxed),
            uptime_secs: uptime,
            samples_per_sec: if uptime > 0.0 {
                samples as f64 / uptime
            } else {
                0.0
            },
        }
    }
}
