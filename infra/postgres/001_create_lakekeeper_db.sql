-- Create a separate database for LakeKeeper catalog to avoid mixing
-- catalog tables with PurpleSector app metadata tables.

SELECT 'CREATE DATABASE lakekeeper'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'lakekeeper')
\gexec
