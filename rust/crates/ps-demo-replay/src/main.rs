//! PurpleSector Demo Replay Tool
//!
//! Reads pre-recorded demo telemetry data (JSON) and replays it through the
//! cloud pipeline (batch → WAL → gRPC) at the original capture rate.
//!
//! Uses `DemoSource` from `ps-telemetry-core` for frame loading and pacing.

use std::path::PathBuf;

use anyhow::Result;
use tokio::sync::mpsc;
use tracing::{error, info};

use ps_telemetry_core::batch::{self, BatchConfig};
use ps_telemetry_core::capture::demo::{DemoConfig, DemoSource};
use ps_telemetry_core::capture::TelemetrySource;
use ps_telemetry_core::grpc::{self, GrpcConfig};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "ps_demo_replay=info,ps_telemetry_core=info".into()),
        )
        .init();

    let demo_file = std::env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("collectors/demo-data/demo-telemetry.json"));

    let demo_config = DemoConfig {
        file_path: demo_file,
        rate_hz: 60,
        loop_playback: true, // Loop continuously for live testing
    };
    
    let source_rate_hz = demo_config.rate_hz;

    let user_id = std::env::var("DEMO_USER_ID").unwrap_or_else(|_| "__demo__".to_string());
    let source = std::env::var("DEMO_SOURCE").unwrap_or_else(|_| "demo".to_string());

    info!("Demo replay configuration: user_id={}, source={}", user_id, source);

    let grpc_config = GrpcConfig::default();
    let (batch_tx, batch_rx) = mpsc::channel(256);

    let grpc_handle = tokio::spawn(async move {
        if let Err(e) = grpc::run_transport(grpc_config, batch_rx).await {
            error!("gRPC transport error: {e}");
        }
    });

    let mut demo_source = DemoSource::new(demo_config);
    demo_source.start().await?;
    info!("Replay started: {}", demo_source.name());

    // Single batch assembler for the entire replay - no session management at this level
    let (sample_tx, sample_rx) = mpsc::channel(4096);
    let batch_config = BatchConfig {
        flush_interval: std::time::Duration::from_millis(100),
        user_id: user_id.clone(),
        source_rate_hz,
        source: source.clone(),
    };
    
    let batch_tx_clone = batch_tx.clone();
    let _batch_handle = batch::spawn_batch_assembler(batch_config, sample_rx, batch_tx_clone);

    info!("Streaming telemetry from source '{}' - sessions will be assigned in RisingWave", &source);

    // Stream all telemetry continuously - RisingWave handles session/lap assignment
    loop {
        match demo_source.next_sample().await {
            Ok(sample) => {
                if sample_tx.send(sample).await.is_err() {
                    info!("Demo replay stopped");
                    drop(batch_tx);
                    let _ = grpc_handle.await;
                    return Ok(());
                }
            }
            Err(ps_telemetry_core::capture::CaptureError::Stopped) => {
                info!("Demo replay finished");
                drop(sample_tx);
                drop(batch_tx);
                let _ = grpc_handle.await;
                return Ok(());
            }
            Err(e) => {
                error!("Demo source error: {e}");
                drop(sample_tx);
                drop(batch_tx);
                let _ = grpc_handle.await;
                return Ok(());
            }
        }
    }
}
