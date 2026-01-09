-- Agregar campos para registrar cuándo y dónde desapareció la mascota
ALTER TABLE pets
ADD COLUMN IF NOT EXISTS lost_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lost_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS lost_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS lost_address TEXT;

-- Índice para búsquedas por fecha de pérdida
CREATE INDEX IF NOT EXISTS idx_pets_lost_at ON pets(lost_at) WHERE lost_at IS NOT NULL;
