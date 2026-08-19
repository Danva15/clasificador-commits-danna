CREATE TABLE IF NOT EXISTS analyses (
    id SERIAL PRIMARY KEY,
    motor VARCHAR(20) NOT NULL,
    modelo VARCHAR(100),
    entrada TEXT NOT NULL,
    salida VARCHAR(20) NOT NULL,
    latencia_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
