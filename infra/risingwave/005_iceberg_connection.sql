-- ══════════════════════════════════════════════════════════════════════
-- Iceberg Connection (REST Catalog via LakeKeeper)
-- ══════════════════════════════════════════════════════════════════════
-- Uses LakeKeeper REST catalog for Iceberg metadata management.
-- This provides a modern, compatible solution that works with both
-- RisingWave and Trino, eliminating Hive Metastore compatibility issues.

-- Drop existing connection if it exists.
-- NOTE: RisingWave does not support CASCADE on DROP CONNECTION.
-- Dependent sinks must be dropped first (see 006_iceberg_sinks.sql).
DROP CONNECTION IF EXISTS iceberg_minio;

-- Create Iceberg connection using LakeKeeper REST catalog
-- Must include explicit S3 credentials for MinIO; without them RisingWave's
-- opendal layer tries the EC2 metadata service (169.254.169.254) which fails.
CREATE CONNECTION iceberg_minio WITH (
    type = 'iceberg',
    catalog.type = 'rest',
    catalog.uri = 'http://lakekeeper:8181/catalog/',
    warehouse.path = 'purplesector-iceberg',
    s3.endpoint = 'http://minio:9000',
    s3.access.key = 'minioadmin',
    s3.secret.key = 'minioadmin',
    s3.region = 'us-east-1',
    s3.path.style.access = 'true'
);
