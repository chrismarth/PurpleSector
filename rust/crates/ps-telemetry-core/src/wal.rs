//! Write-Ahead Log (WAL) for buffering telemetry batches locally.
//!
//! Uses SQLite to persist `TelemetryBatch` messages that have not yet been
//! acknowledged by the cloud gRPC gateway. On network disconnect, batches
//! accumulate in the WAL and are drained once connectivity is restored.
//!
//! Only available with the `cloud-transport` feature.

use anyhow::{Context, Result};
use prost::Message;
use rusqlite::{params, Connection};
use tracing::{debug, info};

use crate::proto::purplesector::TelemetryBatch;

/// SQLite-backed WAL for telemetry batches.
pub struct TelemetryWal {
    conn: Connection,
}

impl TelemetryWal {
    /// Open (or create) the WAL database at the given path.
    pub fn open(path: &std::path::Path) -> Result<Self> {
        let conn = Connection::open(path)
            .with_context(|| format!("Failed to open WAL database at {}", path.display()))?;

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS wal_batches (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
                data       BLOB NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_wal_created ON wal_batches(created_at);
            PRAGMA journal_mode=WAL;
            PRAGMA synchronous=NORMAL;
            ",
        )
        .context("Failed to initialize WAL schema")?;

        info!("WAL opened at {}", path.display());
        Ok(Self { conn })
    }

    /// Append a serialized `TelemetryBatch` to the WAL.
    pub fn push(&self, batch: &TelemetryBatch) -> Result<i64> {
        let data = batch.encode_to_vec();
        self.conn
            .execute("INSERT INTO wal_batches (data) VALUES (?1)", params![data])
            .context("Failed to write batch to WAL")?;
        let id = self.conn.last_insert_rowid();
        debug!("WAL push id={id}, size={} bytes", data.len());
        Ok(id)
    }

    /// Peek at the oldest `count` un-sent batches without removing them.
    pub fn peek(&self, count: usize) -> Result<Vec<(i64, TelemetryBatch)>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, data FROM wal_batches ORDER BY id ASC LIMIT ?1")
            .context("Failed to prepare WAL peek")?;

        let rows = stmt
            .query_map(params![count as i64], |row| {
                let id: i64 = row.get(0)?;
                let data: Vec<u8> = row.get(1)?;
                Ok((id, data))
            })
            .context("Failed to query WAL")?;

        let mut batches = Vec::new();
        for row in rows {
            let (id, data) = row.context("Failed to read WAL row")?;
            let batch = TelemetryBatch::decode(data.as_slice())
                .with_context(|| format!("Failed to decode WAL batch id={id}"))?;
            batches.push((id, batch));
        }
        Ok(batches)
    }

    /// Remove batches up to and including the given ID (after successful ACK).
    pub fn ack_up_to(&self, max_id: i64) -> Result<usize> {
        let deleted = self
            .conn
            .execute(
                "DELETE FROM wal_batches WHERE id <= ?1",
                params![max_id],
            )
            .context("Failed to delete ACKed batches")?;
        debug!("WAL ack_up_to id={max_id}, deleted={deleted}");
        Ok(deleted)
    }

    /// Number of pending (un-ACKed) batches in the WAL.
    pub fn depth(&self) -> Result<usize> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM wal_batches", [], |row| row.get(0))
            .context("Failed to count WAL depth")?;
        Ok(count as usize)
    }

    /// Remove all batches from the WAL.
    pub fn clear(&self) -> Result<usize> {
        let deleted = self
            .conn
            .execute("DELETE FROM wal_batches", [])
            .context("Failed to clear WAL")?;
        info!("WAL cleared, deleted={deleted}");
        Ok(deleted)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_batch(user_id: &str, size: u32) -> TelemetryBatch {
        TelemetryBatch {
            user_id: user_id.to_string(),
            source: "test".into(),
            batch_start_ts: 1000,
            batch_end_ts: 2000,
            batch_size: size,
            source_rate_hz: 60,
            samples: vec![],
            compressed_samples: None,
        }
    }

    #[test]
    fn test_push_peek_ack() {
        let dir = tempfile::tempdir().unwrap();
        let wal = TelemetryWal::open(&dir.path().join("test.db")).unwrap();

        assert_eq!(wal.depth().unwrap(), 0);

        let id1 = wal.push(&make_batch("user1", 10)).unwrap();
        let id2 = wal.push(&make_batch("user1", 20)).unwrap();
        assert_eq!(wal.depth().unwrap(), 2);

        let peeked = wal.peek(10).unwrap();
        assert_eq!(peeked.len(), 2);
        assert_eq!(peeked[0].0, id1);
        assert_eq!(peeked[0].1.batch_size, 10);
        assert_eq!(peeked[1].0, id2);

        wal.ack_up_to(id1).unwrap();
        assert_eq!(wal.depth().unwrap(), 1);

        wal.clear().unwrap();
        assert_eq!(wal.depth().unwrap(), 0);
    }
}
