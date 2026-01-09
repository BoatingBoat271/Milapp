-- Esquema de base de datos actualizado para Milapp v2
-- Incluye: autenticación, perfiles de usuario, mejoras en animales, medicamentos y donaciones

-- ============================================
-- USUARIOS Y AUTENTICACIÓN
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
  organization_images TEXT[], -- Array de URLs de imágenes (carrusel)
  verified_organization BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ANIMALES (MEJORADO)
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
  species TEXT, -- 'dog', 'cat', NULL para ambos
  popular BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de mascotas mejorada
CREATE TABLE IF NOT EXISTS pets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  species TEXT NOT NULL, -- 'dog', 'cat', 'other'
  
  -- Raza (seleccionable + personalizada)
  breed_id UUID REFERENCES pet_breeds(id),
  breed_custom TEXT, -- Raza personalizada si no está en la lista
  
  -- Color (seleccionable + personalizado)
  color_id UUID REFERENCES pet_colors(id),
  color_custom TEXT, -- Color personalizado si no está en la lista
  
  size TEXT, -- 'small', 'medium', 'large'
  gender TEXT, -- 'male', 'female', 'unknown'
  age TEXT, -- 'puppy', 'young', 'adult', 'senior', 'unknown'
  apparent_age_months INTEGER, -- Edad aparente en meses
  
  -- Medidas físicas
  height_cm DECIMAL(5, 2), -- Estatura en centímetros
  width_cm DECIMAL(5, 2), -- Ancho en centímetros
  
  -- Estado de salud
  has_wounds BOOLEAN DEFAULT FALSE, -- Si tiene heridas
  wounds_description TEXT, -- Descripción de heridas
  
  description TEXT,
  status TEXT NOT NULL DEFAULT 'sighted', -- 'lost', 'found', 'sighted', 'in_shelter', 'adopted', 'returned'
  registration_source TEXT DEFAULT 'street', -- 'street', 'shelter', 'person'
  registered_by UUID REFERENCES user_profiles(id),
  shelter_id UUID REFERENCES user_profiles(id), -- Si está en una protectora
  
  -- Ficha médica
  medical_history TEXT,
  vaccinations TEXT[], -- Array de vacunas
  spayed_neutered BOOLEAN,
  special_needs TEXT,
  condition TEXT DEFAULT 'good', -- 'good', 'fair', 'poor', 'critical'
  
  -- Fotos
  primary_image_url TEXT, -- Foto principal
  image_urls TEXT[], -- Galería de fotos
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de avistamientos mejorada
CREATE TABLE IF NOT EXISTS sightings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES user_profiles(id),
  is_anonymous BOOLEAN DEFAULT FALSE,
  anonymous_contact TEXT, -- Mínimo número de contacto si es anónimo
  
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT, -- Dirección formateada
  notes TEXT,
  image_url TEXT, -- Foto del avistamiento
  
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verification_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE
);

-- ============================================
-- MEDICAMENTOS (SISTEMA DE TRUEQUE)
-- ============================================

CREATE TABLE IF NOT EXISTS medication_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) NOT NULL,
  
  offer_type TEXT NOT NULL, -- 'offer', 'request', 'exchange'
  medication_name TEXT NOT NULL,
  quantity TEXT, -- "10 tabletas", "1 frasco", etc.
  expiration_date DATE,
  condition_status TEXT, -- 'new', 'opened', 'expired_soon'
  
  description TEXT,
  location TEXT,
  contact_info TEXT NOT NULL,
  
  -- Trueque
  willing_to_exchange BOOLEAN DEFAULT FALSE,
  exchange_for TEXT, -- Qué está buscando a cambio
  
  price DECIMAL(10, 2), -- Si hay precio (opcional en trueque)
  currency TEXT DEFAULT 'CLP',
  
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DONACIONES (MEJORADO)
-- ============================================

CREATE TABLE IF NOT EXISTS donation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES user_profiles(id),
  donation_type TEXT NOT NULL, -- 'direct_to_shelter', 'to_app', 'to_person', 'to_pet'
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_needed DECIMAL(10, 2),
  amount_collected DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'CLP',
  
  -- Destino
  target_type TEXT, -- 'shelter', 'app', 'person', 'pet'
  target_shelter_id UUID REFERENCES user_profiles(id),
  target_pet_id UUID REFERENCES pets(id),
  target_person_id UUID REFERENCES user_profiles(id),
  
  -- Para qué es
  purpose TEXT, -- 'veterinary', 'food', 'shelter', 'medication', 'general'
  urgent BOOLEAN DEFAULT FALSE,
  
  contact_info TEXT,
  payment_methods TEXT[], -- ['bank_transfer', 'paypal', 'cash', etc.]
  
  active BOOLEAN DEFAULT TRUE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de donaciones recibidas
CREATE TABLE IF NOT EXISTS donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  donation_request_id UUID REFERENCES donation_requests(id) NOT NULL,
  donor_id UUID REFERENCES user_profiles(id),
  is_anonymous BOOLEAN DEFAULT FALSE,
  
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'CLP',
  payment_method TEXT,
  donation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  notes TEXT,
  receipt_url TEXT, -- Comprobante (opcional)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CASAS DE ACOGIDA (MEJORADO)
-- ============================================

CREATE TABLE IF NOT EXISTS foster_homes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) NOT NULL,
  
  offer_type TEXT NOT NULL, -- 'offer', 'request'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  capacity INTEGER, -- Cuántos animales puede acoger
  currently_hosting INTEGER DEFAULT 0,
  available_spots INTEGER GENERATED ALWAYS AS (capacity - currently_hosting) STORED,
  
  location TEXT,
  address TEXT,
  contact_info TEXT NOT NULL,
  
  -- Requisitos/preferencias
  preferred_species TEXT[], -- ['dog', 'cat', 'both']
  preferred_size TEXT[], -- ['small', 'medium', 'large']
  special_requirements TEXT,
  
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_pets_status ON pets(status);
CREATE INDEX IF NOT EXISTS idx_pets_registered_by ON pets(registered_by);
CREATE INDEX IF NOT EXISTS idx_sightings_pet_id ON sightings(pet_id);
CREATE INDEX IF NOT EXISTS idx_sightings_reported_by ON sightings(reported_by);
CREATE INDEX IF NOT EXISTS idx_sightings_created_at ON sightings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medication_offers_user_id ON medication_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_offers_type ON medication_offers(offer_type);
CREATE INDEX IF NOT EXISTS idx_medication_offers_active ON medication_offers(active);
CREATE INDEX IF NOT EXISTS idx_donation_requests_created_by ON donation_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_donation_requests_active ON donation_requests(active);
CREATE INDEX IF NOT EXISTS idx_donations_request_id ON donations(donation_request_id);
CREATE INDEX IF NOT EXISTS idx_foster_homes_user_id ON foster_homes(user_id);
CREATE INDEX IF NOT EXISTS idx_foster_homes_active ON foster_homes(active);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON pets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medication_offers_updated_at BEFORE UPDATE ON medication_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donation_requests_updated_at BEFORE UPDATE ON donation_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_foster_homes_updated_at BEFORE UPDATE ON foster_homes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE pet_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE foster_homes ENABLE ROW LEVEL SECURITY;

-- Políticas: Permitir lectura pública, escritura autenticada
-- En producción deberías ajustar estas políticas según tus necesidades

-- User profiles: lectura pública, escritura solo del propio perfil
CREATE POLICY "Allow public read access on user_profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Pets: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on pets" ON pets
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on pets" ON pets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on pets" ON pets
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Sightings: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on sightings" ON sightings
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on sightings" ON sightings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update on sightings" ON sightings
  FOR UPDATE USING (true);

-- Medication offers: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on medication_offers" ON medication_offers
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on medication_offers" ON medication_offers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medication offers" ON medication_offers
  FOR UPDATE USING (auth.uid() = user_id);

-- Donation requests: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on donation_requests" ON donation_requests
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on donation_requests" ON donation_requests
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own donation requests" ON donation_requests
  FOR UPDATE USING (auth.uid() = created_by);

-- Donations: lectura pública para el request, escritura autenticada
CREATE POLICY "Allow public read access on donations" ON donations
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on donations" ON donations
  FOR INSERT WITH CHECK (true);

-- Foster homes: lectura pública, escritura autenticada
CREATE POLICY "Allow public read access on foster_homes" ON foster_homes
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on foster_homes" ON foster_homes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own foster homes" ON foster_homes
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para tablas de referencia (solo lectura pública)
CREATE POLICY "Allow public read access on pet_breeds" ON pet_breeds
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on pet_colors" ON pet_colors
  FOR SELECT USING (true);
