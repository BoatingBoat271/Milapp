-- ============================================
-- SISTEMA DE ROLES Y TIPOS DE USUARIO (V2 - Compatible)
-- ============================================
-- Este script extiende el sistema de usuarios para incluir:
-- 1. Usuario Maestro/Admin (todos los privilegios, historial completo)
-- 2. Usuario Común/Miembro (público, lista de miembros)
-- 3. Usuario Agrupación/Institución (con usuarios asociados)
-- ============================================

-- ============================================
-- PARTE 1: EXTENDER USER_PROFILES
-- ============================================

-- Agregar campos de rol y tipo de usuario (verificando si existen)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'user_role') THEN
    ALTER TABLE user_profiles ADD COLUMN user_role TEXT DEFAULT 'member';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_active') THEN
    ALTER TABLE user_profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'joined_at') THEN
    ALTER TABLE user_profiles ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_active_at') THEN
    ALTER TABLE user_profiles ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'organization_id') THEN
    ALTER TABLE user_profiles ADD COLUMN organization_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'verified') THEN
    ALTER TABLE user_profiles ADD COLUMN verified BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Actualizar joined_at para usuarios existentes
UPDATE user_profiles SET joined_at = created_at WHERE joined_at IS NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization ON user_profiles(organization_id) WHERE organization_id IS NOT NULL;

-- ============================================
-- PARTE 2: TABLA DE ORGANIZACIONES/INSTITUCIONES
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  city TEXT,
  address TEXT,
  
  -- Información de contacto
  contact_phone TEXT,
  contact_email TEXT NOT NULL,
  website_url TEXT,
  
  -- Redes sociales
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  
  -- Usuario administrador de la organización
  admin_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  
  -- Estado
  is_verified BOOLEAN DEFAULT FALSE, -- Verificado por admin
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para organizaciones
CREATE INDEX IF NOT EXISTS idx_organizations_admin ON organizations(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_verified ON organizations(is_verified);

-- Agregar foreign key para organization_id en user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_organization_id_fkey'
  ) THEN
    ALTER TABLE user_profiles 
    ADD CONSTRAINT user_profiles_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- PARTE 3: TABLA DE HISTORIAL/AUDITORÍA
-- ============================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'create_pet', 'update_pet', 'delete_pet', 'create_sighting', 'create_offer', 'delete_offer', etc.
  entity_type TEXT NOT NULL, -- 'pet', 'sighting', 'offer', 'user', etc.
  entity_id UUID, -- ID de la entidad afectada
  details JSONB, -- Detalles adicionales de la acción
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para historial
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- ============================================
-- PARTE 4: FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar last_active_at
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET last_active_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar last_active_at cuando hay actividad
DROP TRIGGER IF EXISTS update_last_active_on_activity ON activity_log;
CREATE TRIGGER update_last_active_on_activity
AFTER INSERT ON activity_log
FOR EACH ROW
EXECUTE FUNCTION update_user_last_active();

-- Función para registrar actividad
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO activity_log (user_id, action_type, entity_type, entity_id, details)
  VALUES (p_user_id, p_action_type, p_entity_type, p_entity_id, p_details);
EXCEPTION
  WHEN OTHERS THEN
    -- No fallar si hay error, solo registrar en logs
    RAISE WARNING 'Error registrando actividad: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar updated_at en organizations
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION update_organizations_updated_at();

-- ============================================
-- PARTE 5: ACTUALIZAR PETS PARA INCLUIR ORGANIZACIÓN
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pets' AND column_name = 'organization_id') THEN
    ALTER TABLE pets ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_pets_organization ON pets(organization_id);
  END IF;
END $$;

-- ============================================
-- PARTE 6: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Políticas para organizations
-- Todos pueden leer organizaciones activas
DROP POLICY IF EXISTS "Allow public read access on organizations" ON organizations;
CREATE POLICY "Allow public read access on organizations" ON organizations
  FOR SELECT USING (is_active = true);

-- Solo admins pueden crear organizaciones (o usuarios autenticados para crear su propia organización)
DROP POLICY IF EXISTS "Allow authenticated insert on organizations" ON organizations;
CREATE POLICY "Allow authenticated insert on organizations" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() = admin_user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

-- Solo el admin de la organización o un admin del sistema puede actualizarla
DROP POLICY IF EXISTS "Allow organization admin update" ON organizations;
CREATE POLICY "Allow organization admin update" ON organizations
  FOR UPDATE USING (
    admin_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

-- Políticas para activity_log
-- Solo admins pueden leer el historial completo
DROP POLICY IF EXISTS "Allow admin read access on activity_log" ON activity_log;
CREATE POLICY "Allow admin read access on activity_log" ON activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

-- Todos pueden insertar su propia actividad (se registrará automáticamente)
DROP POLICY IF EXISTS "Allow users to log their activity" ON activity_log;
CREATE POLICY "Allow users to log their activity" ON activity_log
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- 
-- NOTA: Para crear un usuario admin, ejecuta:
-- UPDATE user_profiles SET user_role = 'admin' WHERE email = 'tu_email@ejemplo.com';
-- ============================================
