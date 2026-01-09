# 📁 Scripts SQL para Supabase

## ⭐ SCRIPT PRINCIPAL - EJECUTAR ESTE

### `setup-completo.sql` 🎯 **EJECUTAR ESTE PRIMERO**
**Script completo con TODAS las funcionalidades** - Todo en uno.
- ✅ Esquema base (pets, sightings, community_offers)
- ✅ Tablas de referencia (razas y colores con datos iniciales)
- ✅ Sistema de usuarios y perfiles
- ✅ Voluntarios y asignaciones
- ✅ Unidades de rescate
- ✅ Coordinación dueños-voluntarios
- ✅ Pistas con evidencia
- ✅ Sistema de reputación
- ✅ Mejoras en comunidad
- ✅ Todas las funciones, triggers, índices y políticas RLS
- **✅ Ejecutar ESTE script en el SQL Editor de Supabase**
- **✅ Preserva datos existentes** (usa `IF NOT EXISTS` y `ADD COLUMN IF NOT EXISTS`)

## 📋 Otros Archivos (Solo para Referencia)

### `schema.sql`
**Esquema original (v1)** - Solo para referencia histórica.

### `schema-v2.sql`
**Esquema completo v2** - Para referencia, pero usa `setup-completo.sql` en su lugar.

### `migration-v1-to-v2.sql`
**Migración v1 → v2** - Ya incluido en `setup-completo.sql`.

### `voluntarios-y-casos.sql`
**Voluntarios y casos** - Ya incluido en `setup-completo.sql`.

### `coordinacion-duenos-voluntarios.sql`
**Coordinación avanzada** - Ya incluido en `setup-completo.sql`.

### `pistas-y-reputacion.sql`
**Pistas y reputación** - Ya incluido en `setup-completo.sql`.

### `mejoras-comunidad.sql`
**Mejoras comunidad** - Ya incluido en `setup-completo.sql`.

## 🚀 Instrucciones

### Paso 1: Ejecutar el Script Principal
1. Abre Supabase Dashboard
2. Ve a SQL Editor
3. Copia y pega el contenido de `setup-completo.sql`
4. Ejecuta el script
5. Verifica que no haya errores

### Paso 2: Verificar
- Revisa que las tablas se hayan creado correctamente
- Verifica que los datos de razas y colores estén insertados

## 📝 Notas

- El script `setup-completo.sql` es **idempotente** (puedes ejecutarlo varias veces)
- Usa `IF NOT EXISTS` y `ADD COLUMN IF NOT EXISTS` para preservar datos
- Si hay errores, revisa la consola de Supabase para detalles
