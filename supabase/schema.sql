-- Esquema de base de datos para Milapp
-- Ejecutar este script en el SQL Editor de Supabase

-- Tabla de mascotas
CREATE TABLE IF NOT EXISTS pets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  species TEXT NOT NULL,
  breed TEXT,
  color TEXT,
  size TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'sighted', -- 'lost', 'found', 'sighted', 'returned'
  medical_history TEXT,
  condition TEXT DEFAULT 'good', -- 'good', 'fair', 'poor', 'critical'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de avistamientos
CREATE TABLE IF NOT EXISTS sightings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  notes TEXT,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verification_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE
);

-- Tabla de ofertas comunitarias
CREATE TABLE IF NOT EXISTS community_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'foster', 'medications', 'donations'
  offering BOOLEAN DEFAULT TRUE, -- true = ofreciendo, false = solicitando
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  contact TEXT NOT NULL,
  medication_name TEXT, -- Para tipo 'medications'
  amount DECIMAL(10, 2), -- Para tipo 'donations'
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_sightings_pet_id ON sightings(pet_id);
CREATE INDEX IF NOT EXISTS idx_sightings_created_at ON sightings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pets_status ON pets(status);
CREATE INDEX IF NOT EXISTS idx_community_offers_type ON community_offers(type);
CREATE INDEX IF NOT EXISTS idx_community_offers_active ON community_offers(active);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON pets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_offers_updated_at BEFORE UPDATE ON community_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_offers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Permitir lectura pública y escritura autenticada
-- Para desarrollo, puedes usar políticas más permisivas
-- En producción, deberías implementar autenticación adecuada

-- Políticas para pets
CREATE POLICY "Allow public read access on pets" ON pets
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on pets" ON pets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on pets" ON pets
  FOR UPDATE USING (true);

-- Políticas para sightings
CREATE POLICY "Allow public read access on sightings" ON sightings
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on sightings" ON sightings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on sightings" ON sightings
  FOR UPDATE USING (true);

-- Políticas para community_offers
CREATE POLICY "Allow public read access on community_offers" ON community_offers
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on community_offers" ON community_offers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on community_offers" ON community_offers
  FOR UPDATE USING (true);
