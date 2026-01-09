-- Script para agregar funcionalidades de Pistas con Evidencia y Reputación de Voluntarios
-- Ejecutar este script DESPUÉS de coordinacion-duenos-voluntarios.sql

-- ============================================
-- 1. TABLA DE PISTAS CON EVIDENCIA
-- ============================================

CREATE TABLE IF NOT EXISTS evidence_clues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES user_profiles(id), -- Quien reporta (voluntario o ciudadano)
  is_anonymous BOOLEAN DEFAULT FALSE,
  anonymous_contact TEXT, -- Contacto si es anónimo
  
  -- Ubicación exacta
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  location_description TEXT, -- Descripción adicional del lugar
  
  -- Evidencia
  photo_urls TEXT[], -- Array de URLs de fotos (mínimo 1)
  description TEXT, -- Descripción de la pista
  
  -- Verificación
  is_verified BOOLEAN DEFAULT FALSE,
  verification_count INTEGER DEFAULT 0,
  verified_by UUID[], -- Array de IDs de usuarios que verificaron
  
  -- Estado
  status TEXT DEFAULT 'active', -- 'active', 'investigated', 'verified', 'false_lead'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. EXTENDER USER_PROFILES CON REPUTACIÓN
-- ============================================

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS reputation_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clues_submitted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clues_verified INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sightings_confirmed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cases_helped INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reputation_badge TEXT; -- 'bronze', 'silver', 'gold', 'platinum', null

-- ============================================
-- 3. TABLA DE VERIFICACIONES DE PISTAS
-- ============================================

CREATE TABLE IF NOT EXISTS clue_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clue_id UUID NOT NULL REFERENCES evidence_clues(id) ON DELETE CASCADE,
  verified_by UUID NOT NULL REFERENCES user_profiles(id),
  verification_type TEXT DEFAULT 'confirmed', -- 'confirmed', 'false_lead', 'needs_investigation'
  notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clue_id, verified_by) -- Un usuario solo puede verificar una vez
);

-- ============================================
-- 4. FUNCIÓN PARA ACTUALIZAR REPUTACIÓN
-- ============================================

CREATE OR REPLACE FUNCTION update_volunteer_reputation()
RETURNS TRIGGER AS $$
DECLARE
  new_points INTEGER;
  new_badge TEXT;
BEGIN
  -- Calcular puntos de reputación
  SELECT 
    (COALESCE(clues_submitted, 0) * 5) +
    (COALESCE(clues_verified, 0) * 10) +
    (COALESCE(sightings_confirmed, 0) * 3) +
    (COALESCE(cases_helped, 0) * 15)
  INTO new_points
  FROM user_profiles
  WHERE id = NEW.id;
  
  -- Determinar badge según puntos
  new_badge := CASE
    WHEN new_points >= 500 THEN 'platinum'
    WHEN new_points >= 200 THEN 'gold'
    WHEN new_points >= 100 THEN 'silver'
    WHEN new_points >= 50 THEN 'bronze'
    ELSE NULL
  END;
  
  -- Actualizar reputación
  UPDATE user_profiles
  SET 
    reputation_points = new_points,
    reputation_badge = new_badge,
    last_activity_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar reputación cuando cambian las métricas
CREATE TRIGGER update_reputation_on_metrics_change
AFTER UPDATE OF clues_submitted, clues_verified, sightings_confirmed, cases_helped
ON user_profiles
FOR EACH ROW
WHEN (OLD.clues_submitted IS DISTINCT FROM NEW.clues_submitted OR
      OLD.clues_verified IS DISTINCT FROM NEW.clues_verified OR
      OLD.sightings_confirmed IS DISTINCT FROM NEW.sightings_confirmed OR
      OLD.cases_helped IS DISTINCT FROM NEW.cases_helped)
EXECUTE FUNCTION update_volunteer_reputation();

-- ============================================
-- 5. FUNCIÓN PARA ACTUALIZAR VERIFICACIÓN DE PISTA
-- ============================================

CREATE OR REPLACE FUNCTION update_clue_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar contador de verificaciones
  UPDATE evidence_clues
  SET 
    verification_count = (
      SELECT COUNT(*) FROM clue_verifications
      WHERE clue_id = NEW.clue_id
        AND verification_type = 'confirmed'
    ),
    is_verified = (
      SELECT COUNT(*) >= 2 FROM clue_verifications
      WHERE clue_id = NEW.clue_id
        AND verification_type = 'confirmed'
    ),
    verified_by = (
      SELECT ARRAY_AGG(verified_by) FROM clue_verifications
      WHERE clue_id = NEW.clue_id
        AND verification_type = 'confirmed'
    )
  WHERE id = NEW.clue_id;
  
  -- Si la pista fue verificada, dar puntos al que la reportó
  IF NEW.verification_type = 'confirmed' THEN
    UPDATE user_profiles
    SET clues_verified = clues_verified + 1
    WHERE id = (SELECT reported_by FROM evidence_clues WHERE id = NEW.clue_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clue_verification_trigger
AFTER INSERT ON clue_verifications
FOR EACH ROW
EXECUTE FUNCTION update_clue_verification();

-- ============================================
-- 6. ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_evidence_clues_pet_id ON evidence_clues(pet_id);
CREATE INDEX IF NOT EXISTS idx_evidence_clues_reported_by ON evidence_clues(reported_by);
CREATE INDEX IF NOT EXISTS idx_evidence_clues_created_at ON evidence_clues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_clues_is_verified ON evidence_clues(is_verified);

CREATE INDEX IF NOT EXISTS idx_clue_verifications_clue_id ON clue_verifications(clue_id);
CREATE INDEX IF NOT EXISTS idx_clue_verifications_verified_by ON clue_verifications(verified_by);

CREATE INDEX IF NOT EXISTS idx_user_profiles_reputation_points ON user_profiles(reputation_points DESC) WHERE is_volunteer = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_profiles_reputation_badge ON user_profiles(reputation_badge) WHERE reputation_badge IS NOT NULL;

-- ============================================
-- 7. TRIGGERS PARA ACTUALIZAR updated_at
-- ============================================

CREATE TRIGGER update_evidence_clues_updated_at BEFORE UPDATE ON evidence_clues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE evidence_clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE clue_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. POLÍTICAS RLS
-- ============================================

-- Evidence clues: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on evidence_clues" ON evidence_clues
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on evidence_clues" ON evidence_clues
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own evidence clues" ON evidence_clues
  FOR UPDATE USING (auth.uid() = reported_by);

-- Clue verifications: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on clue_verifications" ON clue_verifications
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on clue_verifications" ON clue_verifications
  FOR INSERT WITH CHECK (auth.uid() = verified_by);
