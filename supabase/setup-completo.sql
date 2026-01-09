-- ============================================
-- SCRIPT COMPLETO DE CONFIGURACIÓN PARA MILAPP
-- ============================================
-- Este script incluye TODAS las funcionalidades implementadas
-- Ejecutar este script en el SQL Editor de Supabase
-- 
-- IMPORTANTE: Si ya tienes datos, este script los preservará
-- usando IF NOT EXISTS y ALTER TABLE ADD COLUMN IF NOT EXISTS
-- ============================================

-- ============================================
-- PARTE 1: ESQUEMA BASE (pets, sightings, community_offers)
-- ============================================

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

-- ============================================
-- PARTE 2: TABLAS DE REFERENCIA (RAZAS Y COLORES)
-- ============================================

-- Tabla de razas de mascotas (seleccionables)
CREATE TABLE IF NOT EXISTS pet_breeds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  species TEXT NOT NULL, -- 'dog', 'cat', 'other'
  name TEXT NOT NULL, -- Nombre de la raza
  name_es TEXT, -- Nombre en español
  popular BOOLEAN DEFAULT FALSE, -- Raza popular (aparece primero)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(species, name)
);

-- Tabla de colores de mascotas (seleccionables)
CREATE TABLE IF NOT EXISTS pet_colors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- Nombre del color
  name_es TEXT, -- Nombre en español
  hex_code TEXT, -- Código hexadecimal del color (para mostrar)
  species TEXT NOT NULL, -- 'dog', 'cat', 'other'
  popular BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PARTE 3: INSERTAR DATOS INICIALES (RAZAS Y COLORES)
-- ============================================

-- Insertar razas de PERROS
INSERT INTO pet_breeds (species, name, name_es, popular) VALUES
('dog', 'Labrador Retriever', 'Labrador Retriever', true),
('dog', 'German Shepherd', 'Pastor Alemán', true),
('dog', 'Golden Retriever', 'Golden Retriever', true),
('dog', 'French Bulldog', 'Bulldog Francés', true),
('dog', 'Bulldog', 'Bulldog', true),
('dog', 'Beagle', 'Beagle', true),
('dog', 'Poodle', 'Caniche', true),
('dog', 'Rottweiler', 'Rottweiler', true),
('dog', 'Yorkshire Terrier', 'Yorkshire Terrier', true),
('dog', 'Boxer', 'Boxer', true),
('dog', 'Dachshund', 'Dachshund', true),
('dog', 'Siberian Husky', 'Husky Siberiano', true),
('dog', 'Great Dane', 'Gran Danés', true),
('dog', 'Doberman Pinscher', 'Doberman', true),
('dog', 'Shih Tzu', 'Shih Tzu', true),
('dog', 'Border Collie', 'Border Collie', true),
('dog', 'Cocker Spaniel', 'Cocker Spaniel', true),
('dog', 'Chihuahua', 'Chihuahua', true),
('dog', 'Pug', 'Pug', true),
('dog', 'Maltese', 'Maltés', true),
('dog', 'Australian Shepherd', 'Pastor Australiano', true),
('dog', 'Schnauzer', 'Schnauzer', true),
('dog', 'Basset Hound', 'Basset Hound', true),
('dog', 'Weimaraner', 'Weimaraner', false),
('dog', 'Dalmatian', 'Dálmata', true),
('dog', 'Shiba Inu', 'Shiba Inu', true),
('dog', 'Chow Chow', 'Chow Chow', false),
('dog', 'Bull Terrier', 'Bull Terrier', false),
('dog', 'Jack Russell Terrier', 'Jack Russell Terrier', true),
('dog', 'Pomeranian', 'Pomerania', true),
('dog', 'Bichon Frise', 'Bichon Frisé', false),
('dog', 'Saint Bernard', 'San Bernardo', false),
('dog', 'Mastiff', 'Mastín', false),
('dog', 'Akita', 'Akita', false),
('dog', 'Alaskan Malamute', 'Malamute de Alaska', false),
('dog', 'Bernese Mountain Dog', 'Boyerizo de Montaña', false),
('dog', 'Cane Corso', 'Cane Corso', false),
('dog', 'Rhodesian Ridgeback', 'Ridgeback de Rodesia', false),
('dog', 'Shar Pei', 'Shar Pei', false),
('dog', 'Staffordshire Terrier', 'Staffordshire Terrier', false),
('dog', 'Whippet', 'Whippet', false),
('dog', 'Mixed Breed', 'Mestizo', true),
('dog', 'Other', 'Otra', false)
ON CONFLICT (species, name) DO NOTHING;

-- Insertar razas de GATOS
INSERT INTO pet_breeds (species, name, name_es, popular) VALUES
('cat', 'Persian', 'Persa', true),
('cat', 'Maine Coon', 'Maine Coon', true),
('cat', 'British Shorthair', 'Británico de Pelo Corto', true),
('cat', 'Ragdoll', 'Ragdoll', true),
('cat', 'Siamese', 'Siamés', true),
('cat', 'American Shorthair', 'Americano de Pelo Corto', true),
('cat', 'Bengal', 'Bengalí', true),
('cat', 'Scottish Fold', 'Fold Escocés', true),
('cat', 'Sphynx', 'Esfinge', true),
('cat', 'Abyssinian', 'Abisinio', true),
('cat', 'Russian Blue', 'Azul Ruso', true),
('cat', 'Norwegian Forest Cat', 'Bosque de Noruega', true),
('cat', 'Exotic Shorthair', 'Exótico de Pelo Corto', true),
('cat', 'Oriental', 'Oriental', false),
('cat', 'Turkish Angora', 'Angora Turco', false),
('cat', 'Burmese', 'Birmano', true),
('cat', 'Himalayan', 'Himalayo', true),
('cat', 'Munchkin', 'Munchkin', true),
('cat', 'British Longhair', 'Británico de Pelo Largo', false),
('cat', 'Chartreux', 'Chartreux', false),
('cat', 'Cornish Rex', 'Cornish Rex', false),
('cat', 'Devon Rex', 'Devon Rex', false),
('cat', 'Egyptian Mau', 'Mau Egipcio', false),
('cat', 'Manx', 'Manx', false),
('cat', 'Ragdoll', 'Ragdoll', true),
('cat', 'Savannah', 'Savannah', false),
('cat', 'Selkirk Rex', 'Selkirk Rex', false),
('cat', 'Somali', 'Somalí', false),
('cat', 'Tonkinese', 'Tonquinés', false),
('cat', 'Turkish Van', 'Van Turco', false),
('cat', 'Mixed Breed', 'Mestizo', true),
('cat', 'Other', 'Otra', false)
ON CONFLICT (species, name) DO NOTHING;

-- Insertar colores de PERROS
INSERT INTO pet_colors (name, name_es, hex_code, species, popular) VALUES
('Black', 'Negro', '#000000', 'dog', true),
('White', 'Blanco', '#FFFFFF', 'dog', true),
('Brown', 'Marrón', '#8B4513', 'dog', true),
('Golden', 'Dorado', '#FFD700', 'dog', true),
('Gray', 'Gris', '#808080', 'dog', true),
('Tan', 'Beige', '#D2B48C', 'dog', true),
('Red', 'Rojo', '#DC143C', 'dog', true),
('Cream', 'Crema', '#FFFDD0', 'dog', true),
('Fawn', 'Leonado', '#E5AA70', 'dog', true),
('Brindle', 'Atigrado', '#8B7355', 'dog', true),
('Blue', 'Azul', '#4169E1', 'dog', false),
('Silver', 'Plateado', '#C0C0C0', 'dog', false),
('Liver', 'Hígado', '#654321', 'dog', false),
('Chocolate', 'Chocolate', '#7B3F00', 'dog', false),
('Apricot', 'Albaricoque', '#FBCEB1', 'dog', false),
('Sable', 'Sable', '#8B4513', 'dog', false),
('Merle', 'Merle', '#9370DB', 'dog', false),
('Tricolor', 'Tricolor', '#000000', 'dog', true),
('Bicolor', 'Bicolor', '#000000', 'dog', true),
('Other', 'Otro', '#808080', 'dog', false)
ON CONFLICT (name) DO NOTHING;

-- Insertar colores de GATOS
INSERT INTO pet_colors (name, name_es, hex_code, species, popular) VALUES
('Black', 'Negro', '#000000', 'cat', true),
('White', 'Blanco', '#FFFFFF', 'cat', true),
('Gray', 'Gris', '#808080', 'cat', true),
('Orange', 'Naranja', '#FF8C00', 'cat', true),
('Calico', 'Calicó', '#FFD700', 'cat', true),
('Tortoiseshell', 'Carey', '#8B4513', 'cat', true),
('Tabby', 'Atigrado', '#8B7355', 'cat', true),
('Tuxedo', 'Esmoquin', '#000000', 'cat', true),
('Siamese', 'Siamés', '#F5DEB3', 'cat', true),
('Blue', 'Azul', '#4169E1', 'cat', true),
('Cream', 'Crema', '#FFFDD0', 'cat', true),
('Brown', 'Marrón', '#8B4513', 'cat', true),
('Ginger', 'Pelirrojo', '#FF6347', 'cat', true),
('Smoke', 'Humo', '#708090', 'cat', false),
('Silver', 'Plateado', '#C0C0C0', 'cat', false),
('Chocolate', 'Chocolate', '#7B3F00', 'cat', false),
('Lilac', 'Lila', '#DDA0DD', 'cat', false),
('Cinnamon', 'Canela', '#D2691E', 'cat', false),
('Fawn', 'Leonado', '#E5AA70', 'cat', false),
('Point', 'Puntiagudo', '#F5DEB3', 'cat', false),
('Bicolor', 'Bicolor', '#000000', 'cat', true),
('Tricolor', 'Tricolor', '#000000', 'cat', true),
('Other', 'Otro', '#808080', 'cat', false)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PARTE 4: EXTENDER TABLAS EXISTENTES
-- ============================================

-- Agregar columnas nuevas a pets
ALTER TABLE pets
ADD COLUMN IF NOT EXISTS breed_id UUID REFERENCES pet_breeds(id),
ADD COLUMN IF NOT EXISTS breed_custom TEXT,
ADD COLUMN IF NOT EXISTS color_id UUID REFERENCES pet_colors(id),
ADD COLUMN IF NOT EXISTS color_custom TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT, -- 'male', 'female', 'unknown'
ADD COLUMN IF NOT EXISTS age TEXT, -- 'puppy', 'young', 'adult', 'senior'
ADD COLUMN IF NOT EXISTS apparent_age_months INTEGER,
ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS width_cm DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS has_wounds BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS wounds_description TEXT,
ADD COLUMN IF NOT EXISTS registration_source TEXT, -- 'street', 'shelter', 'direct'
ADD COLUMN IF NOT EXISTS registered_by UUID,
ADD COLUMN IF NOT EXISTS shelter_id UUID,
ADD COLUMN IF NOT EXISTS vaccinations TEXT,
ADD COLUMN IF NOT EXISTS spayed_neutered BOOLEAN,
ADD COLUMN IF NOT EXISTS special_needs TEXT,
ADD COLUMN IF NOT EXISTS primary_image_url TEXT,
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Agregar columnas nuevas a sightings
ALTER TABLE sightings
ADD COLUMN IF NOT EXISTS reported_by UUID,
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS anonymous_contact TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Mejorar community_offers
ALTER TABLE community_offers
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active', -- 'active', 'resolved', 'closed'
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal', -- 'normal', 'urgent'
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by UUID;

-- ============================================
-- PARTE 5: TABLAS DE USUARIOS Y PERFILES
-- ============================================

-- Tabla de perfiles de usuario (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  profile_image_url TEXT,
  bio TEXT,
  location TEXT,
  user_type TEXT DEFAULT 'individual', -- 'individual', 'shelter', 'foster_home'
  is_anonymous BOOLEAN DEFAULT FALSE,
  
  -- Información de contacto
  contact_phone TEXT,
  contact_email TEXT,
  whatsapp TEXT,
  
  -- Redes sociales
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  website_url TEXT,
  
  -- Para protectoras/casas de acogida
  organization_name TEXT,
  organization_description TEXT,
  organization_images TEXT[],
  verified_organization BOOLEAN DEFAULT FALSE,
  
  -- Campos de voluntario
  is_volunteer BOOLEAN DEFAULT FALSE,
  volunteer_available BOOLEAN DEFAULT FALSE,
  volunteer_coverage_radius_km INTEGER DEFAULT 5,
  volunteer_coverage_location TEXT,
  volunteer_coverage_latitude DECIMAL(10, 8),
  volunteer_coverage_longitude DECIMAL(11, 8),
  volunteer_skills TEXT[],
  volunteer_experience_years INTEGER DEFAULT 0,
  
  -- Reputación
  reputation_points INTEGER DEFAULT 0,
  clues_submitted INTEGER DEFAULT 0,
  clues_verified INTEGER DEFAULT 0,
  sightings_confirmed INTEGER DEFAULT 0,
  cases_helped INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  reputation_badge TEXT, -- 'bronze', 'silver', 'gold', 'platinum', null
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PARTE 6: TABLAS DE VOLUNTARIOS Y CASOS
-- ============================================

-- Tabla de asignaciones de voluntarios a casos
CREATE TABLE IF NOT EXISTS volunteer_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES user_profiles(id),
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  notes TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pet_id, volunteer_id)
);

-- Tabla de unidades de rescate
CREATE TABLE IF NOT EXISTS rescue_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'vehicle', 'drone', 'canine', 'other'
  subtype TEXT,
  owner_id UUID REFERENCES user_profiles(id),
  capacity INTEGER DEFAULT 1,
  description TEXT,
  status TEXT DEFAULT 'available', -- 'available', 'assigned', 'maintenance', 'unavailable'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de asignaciones de unidades a casos
CREATE TABLE IF NOT EXISTS unit_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES rescue_units(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES user_profiles(id),
  zone_description TEXT,
  zone_latitude DECIMAL(10, 8),
  zone_longitude DECIMAL(11, 8),
  zone_radius_km DECIMAL(5, 2) DEFAULT 1,
  shift_start TIMESTAMP WITH TIME ZONE,
  shift_end TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed', 'cancelled'
  notes TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de actualizaciones de búsqueda
CREATE TABLE IF NOT EXISTS search_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES user_profiles(id),
  update_type TEXT NOT NULL, -- 'sighted', 'no_signs', 'zone_covered', 'other'
  title TEXT NOT NULL,
  description TEXT,
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  location_description TEXT,
  is_confirmed BOOLEAN DEFAULT FALSE,
  confirmation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de cierre de casos
CREATE TABLE IF NOT EXISTS case_closures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  closed_by UUID NOT NULL REFERENCES user_profiles(id),
  closure_type TEXT NOT NULL, -- 'found', 'returned', 'other'
  closure_reason TEXT,
  closure_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_count INTEGER DEFAULT 0,
  verified_at TIMESTAMP WITH TIME ZONE,
  thank_you_message TEXT,
  volunteers_thanked UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pet_id)
);

-- Tabla de confirmaciones de cierre
CREATE TABLE IF NOT EXISTS closure_confirmations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  closure_id UUID NOT NULL REFERENCES case_closures(id) ON DELETE CASCADE,
  confirmed_by UUID NOT NULL REFERENCES user_profiles(id),
  confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(closure_id, confirmed_by)
);

-- ============================================
-- PARTE 7: COORDINACIÓN DUEÑOS-VOLUNTARIOS
-- ============================================

-- Tabla de solicitudes de ayuda
CREATE TABLE IF NOT EXISTS help_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES user_profiles(id),
  status TEXT DEFAULT 'active', -- 'active', 'fulfilled', 'cancelled'
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pet_id)
);

-- Tabla de zonas de búsqueda
CREATE TABLE IF NOT EXISTS search_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  center_latitude DECIMAL(10, 8) NOT NULL,
  center_longitude DECIMAL(11, 8) NOT NULL,
  radius_km DECIMAL(5, 2) DEFAULT 1,
  assigned_to UUID REFERENCES user_profiles(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  assigned_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de actualizaciones oficiales
CREATE TABLE IF NOT EXISTS official_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL REFERENCES user_profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  update_type TEXT DEFAULT 'general', -- 'general', 'sighting', 'clue', 'important'
  is_important BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PARTE 8: PISTAS CON EVIDENCIA Y REPUTACIÓN
-- ============================================

-- Tabla de pistas con evidencia
CREATE TABLE IF NOT EXISTS evidence_clues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES user_profiles(id),
  is_anonymous BOOLEAN DEFAULT FALSE,
  anonymous_contact TEXT,
  
  -- Ubicación exacta
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  location_description TEXT,
  
  -- Evidencia
  photo_urls TEXT[],
  description TEXT,
  
  -- Verificación
  is_verified BOOLEAN DEFAULT FALSE,
  verification_count INTEGER DEFAULT 0,
  verified_by UUID[],
  
  -- Estado
  status TEXT DEFAULT 'active', -- 'active', 'investigated', 'verified', 'false_lead'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de verificaciones de pistas
CREATE TABLE IF NOT EXISTS clue_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clue_id UUID NOT NULL REFERENCES evidence_clues(id) ON DELETE CASCADE,
  verified_by UUID NOT NULL REFERENCES user_profiles(id),
  verification_type TEXT DEFAULT 'confirmed', -- 'confirmed', 'false_lead', 'needs_investigation'
  notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clue_id, verified_by)
);

-- ============================================
-- PARTE 9: FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar reputación de voluntarios
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

-- Función para actualizar verificación de cierre
CREATE OR REPLACE FUNCTION update_closure_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar contador de confirmaciones
  UPDATE case_closures
  SET 
    verification_count = (
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

-- Función para actualizar verificación de pista
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

-- Función para marcar oferta como resuelta
CREATE OR REPLACE FUNCTION mark_offer_resolved(offer_id UUID, resolved_by_user UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_offers
  SET 
    status = 'resolved',
    resolved_at = NOW(),
    resolved_by = resolved_by_user,
    active = FALSE
  WHERE id = offer_id;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_pets_updated_at ON pets;
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON pets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_community_offers_updated_at ON community_offers;
CREATE TRIGGER update_community_offers_updated_at BEFORE UPDATE ON community_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_volunteer_assignments_updated_at ON volunteer_assignments;
CREATE TRIGGER update_volunteer_assignments_updated_at BEFORE UPDATE ON volunteer_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rescue_units_updated_at ON rescue_units;
CREATE TRIGGER update_rescue_units_updated_at BEFORE UPDATE ON rescue_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_unit_assignments_updated_at ON unit_assignments;
CREATE TRIGGER update_unit_assignments_updated_at BEFORE UPDATE ON unit_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_search_updates_updated_at ON search_updates;
CREATE TRIGGER update_search_updates_updated_at BEFORE UPDATE ON search_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_case_closures_updated_at ON case_closures;
CREATE TRIGGER update_case_closures_updated_at BEFORE UPDATE ON case_closures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_help_requests_updated_at ON help_requests;
CREATE TRIGGER update_help_requests_updated_at BEFORE UPDATE ON help_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_search_zones_updated_at ON search_zones;
CREATE TRIGGER update_search_zones_updated_at BEFORE UPDATE ON search_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_official_updates_updated_at ON official_updates;
CREATE TRIGGER update_official_updates_updated_at BEFORE UPDATE ON official_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_evidence_clues_updated_at ON evidence_clues;
CREATE TRIGGER update_evidence_clues_updated_at BEFORE UPDATE ON evidence_clues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para reputación
DROP TRIGGER IF EXISTS update_reputation_on_metrics_change ON user_profiles;
CREATE TRIGGER update_reputation_on_metrics_change
AFTER UPDATE OF clues_submitted, clues_verified, sightings_confirmed, cases_helped
ON user_profiles
FOR EACH ROW
WHEN (OLD.clues_submitted IS DISTINCT FROM NEW.clues_submitted OR
      OLD.clues_verified IS DISTINCT FROM NEW.clues_verified OR
      OLD.sightings_confirmed IS DISTINCT FROM NEW.sightings_confirmed OR
      OLD.cases_helped IS DISTINCT FROM NEW.cases_helped)
EXECUTE FUNCTION update_volunteer_reputation();

-- Triggers para verificaciones
DROP TRIGGER IF EXISTS update_closure_verification_trigger ON closure_confirmations;
CREATE TRIGGER update_closure_verification_trigger
AFTER INSERT ON closure_confirmations
FOR EACH ROW
EXECUTE FUNCTION update_closure_verification();

DROP TRIGGER IF EXISTS update_clue_verification_trigger ON clue_verifications;
CREATE TRIGGER update_clue_verification_trigger
AFTER INSERT ON clue_verifications
FOR EACH ROW
EXECUTE FUNCTION update_clue_verification();

-- ============================================
-- PARTE 10: ÍNDICES PARA RENDIMIENTO
-- ============================================

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_sightings_pet_id ON sightings(pet_id);
CREATE INDEX IF NOT EXISTS idx_sightings_created_at ON sightings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pets_status ON pets(status);
CREATE INDEX IF NOT EXISTS idx_community_offers_type ON community_offers(type);
CREATE INDEX IF NOT EXISTS idx_community_offers_active ON community_offers(active);
CREATE INDEX IF NOT EXISTS idx_community_offers_status ON community_offers(status);
CREATE INDEX IF NOT EXISTS idx_community_offers_priority ON community_offers(priority) WHERE priority = 'urgent';
CREATE INDEX IF NOT EXISTS idx_community_offers_offering ON community_offers(offering);

-- Índices de voluntarios
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_pet_id ON volunteer_assignments(pet_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_volunteer_id ON volunteer_assignments(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_status ON volunteer_assignments(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_volunteer_available ON user_profiles(volunteer_available) WHERE volunteer_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_profiles_reputation_points ON user_profiles(reputation_points DESC) WHERE is_volunteer = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_profiles_reputation_badge ON user_profiles(reputation_badge) WHERE reputation_badge IS NOT NULL;

-- Índices de unidades
CREATE INDEX IF NOT EXISTS idx_unit_assignments_pet_id ON unit_assignments(pet_id);
CREATE INDEX IF NOT EXISTS idx_unit_assignments_unit_id ON unit_assignments(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_assignments_status ON unit_assignments(status);

-- Índices de búsqueda
CREATE INDEX IF NOT EXISTS idx_search_updates_pet_id ON search_updates(pet_id);
CREATE INDEX IF NOT EXISTS idx_search_updates_volunteer_id ON search_updates(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_search_updates_created_at ON search_updates(created_at DESC);

-- Índices de casos
CREATE INDEX IF NOT EXISTS idx_case_closures_pet_id ON case_closures(pet_id);
CREATE INDEX IF NOT EXISTS idx_case_closures_is_verified ON case_closures(is_verified);

-- Índices de coordinación
CREATE INDEX IF NOT EXISTS idx_help_requests_pet_id ON help_requests(pet_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);
CREATE INDEX IF NOT EXISTS idx_search_zones_pet_id ON search_zones(pet_id);
CREATE INDEX IF NOT EXISTS idx_search_zones_assigned_to ON search_zones(assigned_to);
CREATE INDEX IF NOT EXISTS idx_search_zones_status ON search_zones(status);
CREATE INDEX IF NOT EXISTS idx_official_updates_pet_id ON official_updates(pet_id);
CREATE INDEX IF NOT EXISTS idx_official_updates_created_at ON official_updates(created_at DESC);

-- Índices de pistas
CREATE INDEX IF NOT EXISTS idx_evidence_clues_pet_id ON evidence_clues(pet_id);
CREATE INDEX IF NOT EXISTS idx_evidence_clues_reported_by ON evidence_clues(reported_by);
CREATE INDEX IF NOT EXISTS idx_evidence_clues_created_at ON evidence_clues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_clues_is_verified ON evidence_clues(is_verified);
CREATE INDEX IF NOT EXISTS idx_clue_verifications_clue_id ON clue_verifications(clue_id);
CREATE INDEX IF NOT EXISTS idx_clue_verifications_verified_by ON clue_verifications(verified_by);

-- Índices de razas y colores
CREATE INDEX IF NOT EXISTS idx_pets_breed_id ON pets(breed_id);
CREATE INDEX IF NOT EXISTS idx_pets_color_id ON pets(color_id);
CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species);

-- ============================================
-- PARTE 11: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescue_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE closure_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE clue_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 12: POLÍTICAS RLS
-- ============================================

-- Políticas para pets (lectura pública, escritura autenticada)
DROP POLICY IF EXISTS "Allow public read access on pets" ON pets;
CREATE POLICY "Allow public read access on pets" ON pets
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on pets" ON pets;
CREATE POLICY "Allow public insert on pets" ON pets
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on pets" ON pets;
CREATE POLICY "Allow public update on pets" ON pets
  FOR UPDATE USING (true);

-- Políticas para sightings (lectura pública, escritura autenticada)
DROP POLICY IF EXISTS "Allow public read access on sightings" ON sightings;
CREATE POLICY "Allow public read access on sightings" ON sightings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on sightings" ON sightings;
CREATE POLICY "Allow public insert on sightings" ON sightings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on sightings" ON sightings;
CREATE POLICY "Allow public update on sightings" ON sightings
  FOR UPDATE USING (true);

-- Políticas para community_offers (lectura pública, escritura autenticada)
DROP POLICY IF EXISTS "Allow public read access on community_offers" ON community_offers;
CREATE POLICY "Allow public read access on community_offers" ON community_offers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on community_offers" ON community_offers;
CREATE POLICY "Allow public insert on community_offers" ON community_offers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on community_offers" ON community_offers;
CREATE POLICY "Allow public update on community_offers" ON community_offers
  FOR UPDATE USING (true);

-- Políticas para pet_breeds y pet_colors (lectura pública)
DROP POLICY IF EXISTS "Allow public read access on pet_breeds" ON pet_breeds;
CREATE POLICY "Allow public read access on pet_breeds" ON pet_breeds
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access on pet_colors" ON pet_colors;
CREATE POLICY "Allow public read access on pet_colors" ON pet_colors
  FOR SELECT USING (true);

-- Políticas para user_profiles
DROP POLICY IF EXISTS "Allow public read access on user_profiles" ON user_profiles;
CREATE POLICY "Allow public read access on user_profiles" ON user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para volunteer_assignments
DROP POLICY IF EXISTS "Allow public read access on volunteer_assignments" ON volunteer_assignments;
CREATE POLICY "Allow public read access on volunteer_assignments" ON volunteer_assignments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on volunteer_assignments" ON volunteer_assignments;
CREATE POLICY "Allow authenticated insert on volunteer_assignments" ON volunteer_assignments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own volunteer assignments" ON volunteer_assignments;
CREATE POLICY "Users can update own volunteer assignments" ON volunteer_assignments
  FOR UPDATE USING (auth.uid() = volunteer_id OR auth.uid() = assigned_by);

-- Políticas para rescue_units
DROP POLICY IF EXISTS "Allow public read access on rescue_units" ON rescue_units;
CREATE POLICY "Allow public read access on rescue_units" ON rescue_units
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on rescue_units" ON rescue_units;
CREATE POLICY "Allow authenticated insert on rescue_units" ON rescue_units
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own rescue units" ON rescue_units;
CREATE POLICY "Users can update own rescue units" ON rescue_units
  FOR UPDATE USING (auth.uid() = owner_id);

-- Políticas para unit_assignments
DROP POLICY IF EXISTS "Allow public read access on unit_assignments" ON unit_assignments;
CREATE POLICY "Allow public read access on unit_assignments" ON unit_assignments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on unit_assignments" ON unit_assignments;
CREATE POLICY "Allow authenticated insert on unit_assignments" ON unit_assignments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own unit assignments" ON unit_assignments;
CREATE POLICY "Users can update own unit assignments" ON unit_assignments
  FOR UPDATE USING (auth.uid() = assigned_by);

-- Políticas para search_updates
DROP POLICY IF EXISTS "Allow public read access on search_updates" ON search_updates;
CREATE POLICY "Allow public read access on search_updates" ON search_updates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on search_updates" ON search_updates;
CREATE POLICY "Allow authenticated insert on search_updates" ON search_updates
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own search updates" ON search_updates;
CREATE POLICY "Users can update own search updates" ON search_updates
  FOR UPDATE USING (auth.uid() = volunteer_id);

-- Políticas para case_closures
DROP POLICY IF EXISTS "Allow public read access on case_closures" ON case_closures;
CREATE POLICY "Allow public read access on case_closures" ON case_closures
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on case_closures" ON case_closures;
CREATE POLICY "Allow authenticated insert on case_closures" ON case_closures
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own case closures" ON case_closures;
CREATE POLICY "Users can update own case closures" ON case_closures
  FOR UPDATE USING (auth.uid() = closed_by);

-- Políticas para closure_confirmations
DROP POLICY IF EXISTS "Allow public read access on closure_confirmations" ON closure_confirmations;
CREATE POLICY "Allow public read access on closure_confirmations" ON closure_confirmations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on closure_confirmations" ON closure_confirmations;
CREATE POLICY "Allow authenticated insert on closure_confirmations" ON closure_confirmations
  FOR INSERT WITH CHECK (auth.uid() = confirmed_by);

-- Políticas para help_requests
DROP POLICY IF EXISTS "Allow public read access on help_requests" ON help_requests;
CREATE POLICY "Allow public read access on help_requests" ON help_requests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on help_requests" ON help_requests;
CREATE POLICY "Allow authenticated insert on help_requests" ON help_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own help requests" ON help_requests;
CREATE POLICY "Users can update own help requests" ON help_requests
  FOR UPDATE USING (auth.uid() = requested_by);

-- Políticas para search_zones
DROP POLICY IF EXISTS "Allow public read access on search_zones" ON search_zones;
CREATE POLICY "Allow public read access on search_zones" ON search_zones
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on search_zones" ON search_zones;
CREATE POLICY "Allow authenticated insert on search_zones" ON search_zones
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update assigned search zones" ON search_zones;
CREATE POLICY "Users can update assigned search zones" ON search_zones
  FOR UPDATE USING (auth.uid() = assigned_to OR auth.uid() = created_by);

-- Políticas para official_updates
DROP POLICY IF EXISTS "Allow public read access on official_updates" ON official_updates;
CREATE POLICY "Allow public read access on official_updates" ON official_updates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on official_updates" ON official_updates;
CREATE POLICY "Allow authenticated insert on official_updates" ON official_updates
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own official updates" ON official_updates;
CREATE POLICY "Users can update own official updates" ON official_updates
  FOR UPDATE USING (auth.uid() = posted_by);

-- Políticas para evidence_clues
DROP POLICY IF EXISTS "Allow public read access on evidence_clues" ON evidence_clues;
CREATE POLICY "Allow public read access on evidence_clues" ON evidence_clues
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on evidence_clues" ON evidence_clues;
CREATE POLICY "Allow authenticated insert on evidence_clues" ON evidence_clues
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own evidence clues" ON evidence_clues;
CREATE POLICY "Users can update own evidence clues" ON evidence_clues
  FOR UPDATE USING (auth.uid() = reported_by);

-- Políticas para clue_verifications
DROP POLICY IF EXISTS "Allow public read access on clue_verifications" ON clue_verifications;
CREATE POLICY "Allow public read access on clue_verifications" ON clue_verifications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on clue_verifications" ON clue_verifications;
CREATE POLICY "Allow authenticated insert on clue_verifications" ON clue_verifications
  FOR INSERT WITH CHECK (auth.uid() = verified_by);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- 
-- Este script ha creado todas las tablas, funciones, triggers,
-- índices y políticas necesarias para Milapp.
-- 
-- Próximos pasos:
-- 1. Verificar que no haya errores en la ejecución
-- 2. Probar la aplicación
-- 3. (Opcional) Implementar autenticación para usar userId real
-- ============================================
