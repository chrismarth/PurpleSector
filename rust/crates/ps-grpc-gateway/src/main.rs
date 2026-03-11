//! PurpleSector gRPC Gateway — Cloud Ingress Service
//!
//! Terminates TLS, validates JWT tokens via OIDC/JWKS, and writes
//! `TelemetryBatch` messages to Redpanda (Kafka-compatible).

use anyhow::Result;
use tracing::info;

mod auth;
mod gateway;
mod proto;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "ps_grpc_gateway=info".into()),
        )
        .init();

    let listen_addr = std::env::var("LISTEN_ADDR").unwrap_or_else(|_| "0.0.0.0:50051".into());
    let kafka_brokers =
        std::env::var("KAFKA_BROKERS").unwrap_or_else(|_| "localhost:9092".into());
    let kafka_topic =
        std::env::var("KAFKA_TOPIC").unwrap_or_else(|_| "telemetry-batches".into());

    info!("Starting gRPC Gateway on {listen_addr}");
    info!("Kafka brokers: {kafka_brokers}, topic: {kafka_topic}");

    let auth_config = auth::AuthConfig::from_env();
    info!("Auth mode: {}", if auth_config.disabled { "DISABLED" } else { "OIDC/JWKS" });

    let service = gateway::TelemetryGatewayService::new(
        &kafka_brokers,
        &kafka_topic,
        auth_config,
    )
    .await?;

    let addr = listen_addr.parse()?;

    tonic::transport::Server::builder()
        .add_service(proto::purplesector::telemetry_ingress_server::TelemetryIngressServer::new(service))
        .serve(addr)
        .await?;

    Ok(())
}
