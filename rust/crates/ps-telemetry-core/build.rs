fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cloud_transport = std::env::var("CARGO_FEATURE_CLOUD_TRANSPORT").is_ok();

    if cloud_transport {
        // Full build: prost messages + tonic gRPC client stubs
        tonic_build::configure()
            .build_server(false)
            .build_client(true)
            .compile_protos(&["../../../proto/telemetry.proto"], &["../../../proto/"])?;
    } else {
        // Capture-only build: prost messages only (no tonic dependency)
        prost_build::compile_protos(&["../../../proto/telemetry.proto"], &["../../../proto/"])?;
    }

    Ok(())
}
