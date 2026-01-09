-- Script para mejorar funcionalidades de la Comunidad
-- Ejecutar este script para agregar campos de estado y prioridad

-- ============================================
-- 1. EXTENDER COMMUNITY_OFFERS CON ESTADOS Y PRIORIDAD
-- ============================================

ALTER TABLE community_offers
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active', -- 'active', 'resolved', 'closed'
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal', -- 'normal', 'urgent'
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES user_profiles(id);

-- ============================================
-- 2. ÍNDICES PARA MEJORAR BÚSQUEDAS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_community_offers_status ON community_offers(status);
CREATE INDEX IF NOT EXISTS idx_community_offers_priority ON community_offers(priority) WHERE priority = 'urgent';
CREATE INDEX IF NOT EXISTS idx_community_offers_offering ON community_offers(offering);

-- ============================================
-- 3. FUNCIÓN PARA MARCAR COMO RESUELTO
-- ============================================

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
