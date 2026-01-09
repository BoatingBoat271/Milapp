-- Script para agregar funcionalidades de coordinación entre dueños y voluntarios
-- Ejecutar este script DESPUÉS de voluntarios-y-casos.sql

-- ============================================
-- 1. TABLA DE SOLICITUDES DE AYUDA
-- ============================================

CREATE TABLE IF NOT EXISTS help_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES user_profiles(id),
  status TEXT DEFAULT 'active', -- 'active', 'fulfilled', 'cancelled'
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pet_id) -- Solo una solicitud activa por caso
);

-- ============================================
-- 2. TABLA DE ZONAS DE BÚSQUEDA
-- ============================================

CREATE TABLE IF NOT EXISTS search_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Nombre de la zona (ej: "Parque Central", "Zona Norte")
  description TEXT,
  center_latitude DECIMAL(10, 8) NOT NULL,
  center_longitude DECIMAL(11, 8) NOT NULL,
  radius_km DECIMAL(5, 2) DEFAULT 1, -- Radio de la zona en km
  assigned_to UUID REFERENCES user_profiles(id), -- Voluntario asignado
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  assigned_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id), -- Dueño u organizador
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. TABLA DE ACTUALIZACIONES OFICIALES
-- ============================================

CREATE TABLE IF NOT EXISTS official_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL REFERENCES user_profiles(id), -- Dueño
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  update_type TEXT DEFAULT 'general', -- 'general', 'sighting', 'clue', 'important'
  is_important BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. EXTENDER CASE_CLOSURES CON AGRADECIMIENTOS
-- ============================================

ALTER TABLE case_closures
ADD COLUMN IF NOT EXISTS thank_you_message TEXT,
ADD COLUMN IF NOT EXISTS volunteers_thanked UUID[]; -- Array de IDs de voluntarios agradecidos

-- ============================================
-- 5. ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_help_requests_pet_id ON help_requests(pet_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);

CREATE INDEX IF NOT EXISTS idx_search_zones_pet_id ON search_zones(pet_id);
CREATE INDEX IF NOT EXISTS idx_search_zones_assigned_to ON search_zones(assigned_to);
CREATE INDEX IF NOT EXISTS idx_search_zones_status ON search_zones(status);

CREATE INDEX IF NOT EXISTS idx_official_updates_pet_id ON official_updates(pet_id);
CREATE INDEX IF NOT EXISTS idx_official_updates_created_at ON official_updates(created_at DESC);

-- ============================================
-- 6. TRIGGERS
-- ============================================

CREATE TRIGGER update_help_requests_updated_at BEFORE UPDATE ON help_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_search_zones_updated_at BEFORE UPDATE ON search_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_official_updates_updated_at BEFORE UPDATE ON official_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_updates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. POLÍTICAS RLS
-- ============================================

-- Help requests: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on help_requests" ON help_requests
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on help_requests" ON help_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own help requests" ON help_requests
  FOR UPDATE USING (auth.uid() = requested_by);

-- Search zones: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on search_zones" ON search_zones
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on search_zones" ON search_zones
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update assigned search zones" ON search_zones
  FOR UPDATE USING (auth.uid() = assigned_to OR auth.uid() = created_by);

-- Official updates: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on official_updates" ON official_updates
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on official_updates" ON official_updates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own official updates" ON official_updates
  FOR UPDATE USING (auth.uid() = posted_by);
