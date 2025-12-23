-- ================================
-- DermicaPro Database Initialization
-- ================================
-- This script runs when the PostgreSQL container is first created

-- Create database if not exists (already created by POSTGRES_DB env var)
-- CREATE DATABASE dermicapro_db;

-- Create extensions if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE dermicapro_db TO dermicapro;

-- Success message
SELECT 'DermicaPro database initialized successfully!' AS status;
