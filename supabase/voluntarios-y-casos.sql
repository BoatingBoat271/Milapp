-- Script para agregar funcionalidades de Voluntarios y Cierre de Casos
-- Ejecutar este script DESPUÉS de migration-v1-to-v2.sql

-- ============================================
-- 1. EXTENDER USER_PROFILES PARA VOLUNTARIOS
-- ============================================

-- Agregar columnas de voluntario a user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_volunteer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS volunteer_available BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS volunteer_coverage_radius_km INTEGER DEFAULT 5, -- Radio de cobertura en km
ADD COLUMN IF NOT EXISTS volunteer_coverage_location TEXT, -- Ubicación base del voluntario
ADD COLUMN IF NOT EXISTS volunteer_coverage_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS volunteer_coverage_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS volunteer_skills TEXT[], -- Array de habilidades: ['search', 'rescue', 'transport', 'vet']
ADD COLUMN IF NOT EXISTS volunteer_experience_years INTEGER DEFAULT 0;

-- ============================================
-- 2. TABLA DE ASIGNACIONES DE VOLUNTARIOS A CASOS
-- ============================================

CREATE TABLE IF NOT EXISTS volunteer_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES user_profiles(id), -- Quien asignó (dueño u organizador)
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  notes TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pet_id, volunteer_id) -- Un voluntario solo puede estar asignado una vez por caso
);

-- ============================================
-- 3. TABLA DE UNIDADES DE RESCATE
-- ============================================

CREATE TABLE IF NOT EXISTS rescue_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- Nombre de la unidad (ej: "Auto 1", "Dron Alpha")
  type TEXT NOT NULL, -- 'vehicle', 'drone', 'canine', 'other'
  subtype TEXT, -- 'car', 'motorcycle', 'quad', 'drone', 'search_dog', etc.
  owner_id UUID REFERENCES user_profiles(id), -- Dueño de la unidad
  capacity INTEGER DEFAULT 1, -- Capacidad (personas, perros, etc.)
  description TEXT,
  status TEXT DEFAULT 'available', -- 'available', 'assigned', 'maintenance', 'unavailable'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. TABLA DE ASIGNACIONES DE UNIDADES A CASOS
-- ============================================

CREATE TABLE IF NOT EXISTS unit_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES rescue_units(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES user_profiles(id),
  zone_description TEXT, -- Zona asignada
  zone_latitude DECIMAL(10, 8),
  zone_longitude DECIMAL(11, 8),
  zone_radius_km DECIMAL(5, 2) DEFAULT 1, -- Radio de la zona en km
  shift_start TIMESTAMP WITH TIME ZONE,
  shift_end TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed', 'cancelled'
  notes TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. TABLA DE ACTUALIZACIONES DE BÚSQUEDA
-- ============================================

CREATE TABLE IF NOT EXISTS search_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES user_profiles(id), -- Quien reporta
  update_type TEXT NOT NULL, -- 'sighted', 'no_signs', 'zone_covered', 'other'
  title TEXT NOT NULL,
  description TEXT,
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  location_description TEXT,
  is_confirmed BOOLEAN DEFAULT FALSE, -- Si está confirmado por otros
  confirmation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. TABLA DE CIERRE DE CASOS
-- ============================================

CREATE TABLE IF NOT EXISTS case_closures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  closed_by UUID NOT NULL REFERENCES user_profiles(id), -- Quien cerró (dueño)
  closure_type TEXT NOT NULL, -- 'found', 'returned', 'other'
  closure_reason TEXT,
  closure_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT FALSE, -- Verificado por comunidad
  verification_count INTEGER DEFAULT 0,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pet_id) -- Un caso solo puede cerrarse una vez
);

-- ============================================
-- 7. TABLA DE CONFIRMACIONES DE CIERRE
-- ============================================

CREATE TABLE IF NOT EXISTS closure_confirmations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  closure_id UUID NOT NULL REFERENCES case_closures(id) ON DELETE CASCADE,
  confirmed_by UUID NOT NULL REFERENCES user_profiles(id),
  confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(closure_id, confirmed_by) -- Un usuario solo puede confirmar una vez
);

-- ============================================
-- 8. ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================

CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_pet_id ON volunteer_assignments(pet_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_volunteer_id ON volunteer_assignments(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_status ON volunteer_assignments(status);

CREATE INDEX IF NOT EXISTS idx_unit_assignments_pet_id ON unit_assignments(pet_id);
CREATE INDEX IF NOT EXISTS idx_unit_assignments_unit_id ON unit_assignments(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_assignments_status ON unit_assignments(status);

CREATE INDEX IF NOT EXISTS idx_search_updates_pet_id ON search_updates(pet_id);
CREATE INDEX IF NOT EXISTS idx_search_updates_volunteer_id ON search_updates(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_search_updates_created_at ON search_updates(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_closures_pet_id ON case_closures(pet_id);
CREATE INDEX IF NOT EXISTS idx_case_closures_is_verified ON case_closures(is_verified);

CREATE INDEX IF NOT EXISTS idx_user_profiles_volunteer_available ON user_profiles(volunteer_available) WHERE volunteer_available = TRUE;

-- ============================================
-- 9. TRIGGERS PARA ACTUALIZAR updated_at
-- ============================================

CREATE TRIGGER update_volunteer_assignments_updated_at BEFORE UPDATE ON volunteer_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rescue_units_updated_at BEFORE UPDATE ON rescue_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unit_assignments_updated_at BEFORE UPDATE ON unit_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_search_updates_updated_at BEFORE UPDATE ON search_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_closures_updated_at BEFORE UPDATE ON case_closures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. FUNCIÓN PARA ACTUALIZAR VERIFICACIÓN DE CIERRE
-- ============================================

CREATE OR REPLACE FUNCTION update_closure_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar contador de confirmaciones
  UPDATE case_closures
  SET verification_count = (
    SELECT COUNT(*) FROM closure_confirmations
    WHERE closure_id = NEW.closure_id
  ),
  is_verified = (
    SELECT COUNT(*) >= 2 FROM closure_confirmations
    WHERE closure_id = NEW.closure_id
  ),
  verified_at = CASE
    WHEN (SELECT COUNT(*) >= 2 FROM closure_confirmations WHERE closure_id = NEW.closure_id)
    THEN NOW()
    ELSE verified_at
  END
  WHERE id = NEW.closure_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_closure_verification_trigger
AFTER INSERT ON closure_confirmations
FOR EACH ROW
EXECUTE FUNCTION update_closure_verification();

-- ============================================
-- 11. HABILITAR ROW LEVEL SECURITY
-- ============================================

ALTER TABLE volunteer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescue_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE closure_confirmations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. POLÍTICAS RLS
-- ============================================

-- Volunteer assignments: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on volunteer_assignments" ON volunteer_assignments
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on volunteer_assignments" ON volunteer_assignments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own volunteer assignments" ON volunteer_assignments
  FOR UPDATE USING (auth.uid() = volunteer_id OR auth.uid() = assigned_by);

-- Rescue units: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on rescue_units" ON rescue_units
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on rescue_units" ON rescue_units
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own rescue units" ON rescue_units
  FOR UPDATE USING (auth.uid() = owner_id);

-- Unit assignments: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on unit_assignments" ON unit_assignments
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on unit_assignments" ON unit_assignments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own unit assignments" ON unit_assignments
  FOR UPDATE USING (auth.uid() = assigned_by);

-- Search updates: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on search_updates" ON search_updates
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on search_updates" ON search_updates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own search updates" ON search_updates
  FOR UPDATE USING (auth.uid() = volunteer_id);

-- Case closures: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on case_closures" ON case_closures
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on case_closures" ON case_closures
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own case closures" ON case_closures
  FOR UPDATE USING (auth.uid() = closed_by);

-- Closure confirmations: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on closure_confirmations" ON closure_confirmations
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on closure_confirmations" ON closure_confirmations
  FOR INSERT WITH CHECK (auth.uid() = confirmed_by);
