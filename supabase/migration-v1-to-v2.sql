-- Script de Migración de v1 a v2
-- Este script actualiza las tablas existentes sin perder datos
-- Ejecuta este script DESPUÉS de haber ejecutado el schema.sql original

-- ============================================
-- 1. CREAR TABLAS DE REFERENCIA PRIMERO (RAZAS Y COLORES)
-- ============================================
-- IMPORTANTE: Estas tablas deben crearse ANTES de agregar columnas que las referencian

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
  popular BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. INSERTAR DATOS INICIALES EN TABLAS DE REFERENCIA
-- ============================================

-- Insertar razas de PERROS (listado completo)
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
('dog', 'Other', 'Otra', false),
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
('cat', 'Oriental Shorthair', 'Oriental de Pelo Corto', false),
('cat', 'Persian Longhair', 'Persa de Pelo Largo', false),
('cat', 'Ragdoll Point', 'Ragdoll Point', false),
('cat', 'Savannah', 'Savannah', false),
('cat', 'Somali', 'Somalí', false),
('cat', 'Tonkinese', 'Tonkinés', false),
('cat', 'Turkish Van', 'Van Turco', false),
('cat', 'Mixed Breed', 'Mestizo', true),
('cat', 'Other', 'Otra', false)
ON CONFLICT (species, name) DO NOTHING;

-- Tabla de colores actualizada para incluir especie
ALTER TABLE pet_colors ADD COLUMN IF NOT EXISTS species TEXT; -- 'dog', 'cat', NULL para ambos
CREATE INDEX IF NOT EXISTS idx_pet_colors_species ON pet_colors(species);

-- Insertar colores para PERROS
INSERT INTO pet_colors (name, name_es, hex_code, species, popular) VALUES
('Black', 'Negro', '#000000', 'dog', true),
('White', 'Blanco', '#FFFFFF', 'dog', true),
('Brown', 'Marrón', '#8B4513', 'dog', true),
('Gray', 'Gris', '#808080', 'dog', true),
('Cream', 'Crema', '#FFFDD0', 'dog', true),
('Tan', 'Beige', '#D2B48C', 'dog', true),
('Fawn', 'Leonado', '#E5AA70', 'dog', true),
('Golden', 'Dorado', '#FFD700', 'dog', true),
('Red', 'Rojo', '#DC143C', 'dog', true),
('Liver', 'Hígado', '#6B4423', 'dog', false),
('Blue', 'Azul Grisáceo', '#708090', 'dog', false),
('Brindle', 'Atigrado', '#8B4513', 'dog', true),
('Merle', 'Merle', '#9370DB', 'dog', false),
('Harlequin', 'Arlequín', '#FFFFFF', 'dog', false),
('Tricolor', 'Tricolor', NULL, 'dog', true),
('Bicolor', 'Bicolor', NULL, 'dog', true),
('Spotted', 'Manchado', NULL, 'dog', true),
('Striped', 'Rayado', NULL, 'dog', false),
('Sable', 'Sable', '#8B4513', 'dog', false),
('Other', 'Otro', NULL, 'dog', false)
ON CONFLICT (name) DO UPDATE SET species = COALESCE(EXCLUDED.species, pet_colors.species);

-- Insertar colores para GATOS
INSERT INTO pet_colors (name, name_es, hex_code, species, popular) VALUES
('Black', 'Negro', '#000000', 'cat', true),
('White', 'Blanco', '#FFFFFF', 'cat', true),
('Gray', 'Gris', '#808080', 'cat', true),
('Orange', 'Naranja', '#FFA500', 'cat', true),
('Cream', 'Crema', '#FFFDD0', 'cat', true),
('Brown', 'Marrón', '#8B4513', 'cat', true),
('Tortoiseshell', 'Carey', '#8B4513', 'cat', true),
('Calico', 'Calicó', NULL, 'cat', true),
('Tabby', 'Atigrado', '#8B4513', 'cat', true),
('Tuxedo', 'Esmoquin', '#000000', 'cat', true),
('Pointed', 'Point', '#C0C0C0', 'cat', true),
('Smoke', 'Humo', '#808080', 'cat', false),
('Silver', 'Plateado', '#C0C0C0', 'cat', false),
('Blue', 'Azul', '#708090', 'cat', true),
('Lilac', 'Lila', '#DDA0DD', 'cat', false),
('Chocolate', 'Chocolate', '#7B3F00', 'cat', false),
('Cinnamon', 'Canela', '#D2691E', 'cat', false),
('Fawn', 'Leonado', '#E5AA70', 'cat', false),
('Bicolor', 'Bicolor', NULL, 'cat', true),
('Tricolor', 'Tricolor', NULL, 'cat', true),
('Spotted', 'Manchado', NULL, 'cat', false),
('Striped', 'Rayado', NULL, 'cat', true),
('Other', 'Otro', NULL, 'cat', false)
ON CONFLICT (name) DO UPDATE SET species = COALESCE(pet_colors.species, EXCLUDED.species);

-- ============================================
-- 3. AGREGAR COLUMNAS NUEVAS A TABLAS EXISTENTES
-- ============================================

-- Agregar columnas nuevas a pets (ahora las tablas de referencia ya existen)
ALTER TABLE pets 
ADD COLUMN IF NOT EXISTS gender TEXT, -- 'male', 'female', 'unknown'
ADD COLUMN IF NOT EXISTS age TEXT, -- 'puppy', 'young', 'adult', 'senior', 'unknown'
ADD COLUMN IF NOT EXISTS apparent_age_months INTEGER, -- Edad aparente en meses
ADD COLUMN IF NOT EXISTS breed_id UUID, -- Raza seleccionable (sin constraint primero)
ADD COLUMN IF NOT EXISTS breed_custom TEXT, -- Raza personalizada si no está en la lista
ADD COLUMN IF NOT EXISTS color_id UUID, -- Color seleccionable (sin constraint primero)
ADD COLUMN IF NOT EXISTS color_custom TEXT, -- Color personalizado si no está en la lista
ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5, 2), -- Estatura en centímetros
ADD COLUMN IF NOT EXISTS width_cm DECIMAL(5, 2), -- Ancho en centímetros
ADD COLUMN IF NOT EXISTS has_wounds BOOLEAN DEFAULT FALSE, -- Si tiene heridas
ADD COLUMN IF NOT EXISTS wounds_description TEXT, -- Descripción de heridas
ADD COLUMN IF NOT EXISTS registration_source TEXT DEFAULT 'street',
ADD COLUMN IF NOT EXISTS registered_by UUID,
ADD COLUMN IF NOT EXISTS shelter_id UUID,
ADD COLUMN IF NOT EXISTS vaccinations TEXT[],
ADD COLUMN IF NOT EXISTS spayed_neutered BOOLEAN,
ADD COLUMN IF NOT EXISTS special_needs TEXT,
ADD COLUMN IF NOT EXISTS primary_image_url TEXT,
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Agregar constraints de foreign key después (si no existen)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pets_breed_id_fkey'
  ) THEN
    ALTER TABLE pets ADD CONSTRAINT pets_breed_id_fkey 
    FOREIGN KEY (breed_id) REFERENCES pet_breeds(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pets_color_id_fkey'
  ) THEN
    ALTER TABLE pets ADD CONSTRAINT pets_color_id_fkey 
    FOREIGN KEY (color_id) REFERENCES pet_colors(id);
  END IF;
END $$;

-- Agregar columnas nuevas a sightings
ALTER TABLE sightings
ADD COLUMN IF NOT EXISTS reported_by UUID,
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS anonymous_contact TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ============================================
-- 4. CREAR NUEVAS TABLAS PRINCIPALES
-- ============================================

-- Tabla de perfiles de usuario
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
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de medicamentos (reemplazo mejorado de community_offers para medicamentos)
CREATE TABLE IF NOT EXISTS medication_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) NOT NULL,
  
  offer_type TEXT NOT NULL, -- 'offer', 'request', 'exchange'
  medication_name TEXT NOT NULL,
  quantity TEXT,
  expiration_date DATE,
  condition_status TEXT, -- 'new', 'opened', 'expired_soon'
  
  description TEXT,
  location TEXT,
  contact_info TEXT NOT NULL,
  
  -- Trueque
  willing_to_exchange BOOLEAN DEFAULT FALSE,
  exchange_for TEXT,
  
  price DECIMAL(10, 2),
  currency TEXT DEFAULT 'CLP',
  
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de solicitudes de donación
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
  payment_methods TEXT[],
  
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
  receipt_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de casas de acogida mejorada
CREATE TABLE IF NOT EXISTS foster_homes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) NOT NULL,
  
  offer_type TEXT NOT NULL, -- 'offer', 'request'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  capacity INTEGER,
  currently_hosting INTEGER DEFAULT 0,
  available_spots INTEGER GENERATED ALWAYS AS (capacity - currently_hosting) STORED,
  
  location TEXT,
  address TEXT,
  contact_info TEXT NOT NULL,
  
  -- Requisitos/preferencias
  preferred_species TEXT[],
  preferred_size TEXT[],
  special_requirements TEXT,
  
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_pet_breeds_species ON pet_breeds(species);
CREATE INDEX IF NOT EXISTS idx_pet_breeds_popular ON pet_breeds(popular);
CREATE INDEX IF NOT EXISTS idx_pets_registered_by ON pets(registered_by);
CREATE INDEX IF NOT EXISTS idx_pets_breed_id ON pets(breed_id);
CREATE INDEX IF NOT EXISTS idx_pets_color_id ON pets(color_id);
CREATE INDEX IF NOT EXISTS idx_sightings_reported_by ON sightings(reported_by);
CREATE INDEX IF NOT EXISTS idx_medication_offers_user_id ON medication_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_offers_type ON medication_offers(offer_type);
CREATE INDEX IF NOT EXISTS idx_donation_requests_created_by ON donation_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_donations_request_id ON donations(donation_request_id);
CREATE INDEX IF NOT EXISTS idx_foster_homes_user_id ON foster_homes(user_id);

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Función ya debería existir, pero la creamos/reemplazamos por si acaso
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para nuevas tablas (solo si no existen)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_medication_offers_updated_at ON medication_offers;
CREATE TRIGGER update_medication_offers_updated_at BEFORE UPDATE ON medication_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_donation_requests_updated_at ON donation_requests;
CREATE TRIGGER update_donation_requests_updated_at BEFORE UPDATE ON donation_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_foster_homes_updated_at ON foster_homes;
CREATE TRIGGER update_foster_homes_updated_at BEFORE UPDATE ON foster_homes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. ROW LEVEL SECURITY PARA NUEVAS TABLAS
-- ============================================

ALTER TABLE pet_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE foster_homes ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Allow public read access on user_profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para medication_offers
CREATE POLICY "Allow public read access on medication_offers" ON medication_offers
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on medication_offers" ON medication_offers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medication offers" ON medication_offers
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para donation_requests
CREATE POLICY "Allow public read access on donation_requests" ON donation_requests
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on donation_requests" ON donation_requests
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own donation requests" ON donation_requests
  FOR UPDATE USING (auth.uid() = created_by);

-- Políticas para donations
CREATE POLICY "Allow public read access on donations" ON donations
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on donations" ON donations
  FOR INSERT WITH CHECK (true);

-- Políticas para foster_homes
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

-- ============================================
-- 8. MIGRAR DATOS DE community_offers (OPCIONAL)
-- ============================================

-- Si quieres migrar datos existentes de community_offers a las nuevas tablas:
-- (Ejecuta solo si tienes datos que quieres preservar)

-- Migrar medicamentos
-- INSERT INTO medication_offers (user_id, offer_type, medication_name, description, location, contact_info, active, created_at)
-- SELECT NULL, CASE WHEN offering THEN 'offer' ELSE 'request' END, medication_name, description, location, contact, active, created_at
-- FROM community_offers WHERE type = 'medications';

-- Migrar casas de acogida
-- INSERT INTO foster_homes (user_id, offer_type, title, description, location, contact_info, active, created_at)
-- SELECT NULL, CASE WHEN offering THEN 'offer' ELSE 'request' END, title, description, location, contact, active, created_at
-- FROM community_offers WHERE type = 'foster';

-- Migrar donaciones
-- INSERT INTO donation_requests (created_by, donation_type, title, description, amount_needed, contact_info, active, created_at)
-- SELECT NULL, 'to_app', title, description, amount, contact, active, created_at
-- FROM community_offers WHERE type = 'donations';

-- ============================================
-- NOTA: La tabla community_offers se puede mantener para compatibilidad
-- o eliminarla después de migrar los datos
-- ============================================
