CREATE TABLE IF NOT EXISTS analyses (
    id SERIAL PRIMARY KEY,
    motor VARCHAR(20) NOT NULL,
    modelo VARCHAR(100),
    entrada TEXT NOT NULL,
    salida VARCHAR(20) NOT NULL,
    latencia_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_roles
        WHERE rolname = 'api_user'
    ) THEN
        CREATE ROLE api_user LOGIN PASSWORD 'api_password';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE github_assistant TO api_user;
GRANT USAGE ON SCHEMA public TO api_user;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE analyses
TO api_user;

GRANT USAGE, SELECT
ON SEQUENCE analyses_id_seq
TO api_user;
