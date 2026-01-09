# 🛡️ Cómo Crear el Usuario Admin

## ⚠️ IMPORTANTE: Orden de Ejecución

**Ejecuta los scripts SQL ANTES de crear tu cuenta de usuario.**

## 📋 Paso 1: Ejecutar Scripts SQL en Supabase

### 1.1. Abre Supabase SQL Editor
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. En el menú lateral, haz clic en **"SQL Editor"**
4. Haz clic en **"New query"**

### 1.2. Ejecuta los Scripts (en este orden)

**Script 1: Setup Completo** (si no lo has ejecutado antes)
- Abre el archivo `supabase/setup-completo.sql`
- Copia TODO el contenido
- Pégalo en el SQL Editor
- Haz clic en **"Run"** (o Ctrl+Enter)
- Espera a que termine (debe decir "Success")

**Script 2: Campos de Pérdida**
- Abre el archivo `supabase/agregar-campos-perdida.sql`
- Copia TODO el contenido
- Pégalo en el SQL Editor
- Haz clic en **"Run"**

**Script 3: Sistema de Roles** ⭐ (NUEVO)
- Abre el archivo `supabase/sistema-roles-usuarios-v2.sql`
- Copia TODO el contenido
- Pégalo en el SQL Editor
- Haz clic en **"Run"**

## 👤 Paso 2: Crear tu Cuenta de Usuario

1. En la aplicación, ve a `/login`
2. Haz clic en **"¿No tienes cuenta? Regístrate"**
3. Completa el formulario:
   - **Nombre Completo**: Tu nombre
   - **Teléfono**: Tu número
   - **Email**: ⚠️ **Este será tu email de admin** (anótalo)
   - **Contraseña**: Tu contraseña
   - **Tipo de Usuario**: Selecciona "👤 Individual"
4. Haz clic en **"Crear Cuenta"**
5. Si Supabase te envía un email, verifica tu correo

## 🔑 Paso 3: Convertir tu Usuario en Admin

### Opción A: Usar el Script Pre-hecho (Más Fácil) ⭐ RECOMENDADO

1. Ve a Supabase → **SQL Editor**
2. Abre el archivo `supabase/crear-admin.sql`
3. **Reemplaza** `'tu_email@ejemplo.com'` con el email que usaste en el Paso 2
4. Copia el script completo (con tu email)
5. Pégalo en el SQL Editor
6. Haz clic en **"Run"**
7. Deberías ver algo como: "Success. 1 row updated"

### Opción B: Ejecutar Manualmente

1. Ve a Supabase → **SQL Editor**
2. Ejecuta este comando (reemplaza el email):

```sql
UPDATE user_profiles 
SET user_role = 'admin' 
WHERE email = 'tu_email_aqui@ejemplo.com';
```

3. Haz clic en **"Run"**

## ✅ Paso 4: Verificar que Funciona

1. En la aplicación, **cierra sesión** (si estás logueado)
2. **Vuelve a iniciar sesión** con tu email y contraseña
3. Deberías ver el botón **"Admin"** 🛡️ en la barra de navegación (arriba)
4. Haz clic en "Admin" y deberías ver el panel de administración

## 🎯 ¿Qué Puede Hacer el Admin?

- Ver historial completo de todas las actividades
- Ver información detallada de todos los usuarios
- Gestionar organizaciones
- Ver estadísticas del sistema

## ❓ Problemas Comunes

**No veo el botón "Admin":**
- Asegúrate de haber ejecutado el script SQL del Paso 3
- Cierra sesión y vuelve a iniciar sesión
- Verifica en Supabase que tu usuario tiene `user_role = 'admin'`

**Error al ejecutar el script:**
- Asegúrate de haber ejecutado primero `sistema-roles-usuarios-v2.sql`
- Verifica que el email sea exactamente el mismo que usaste al registrarte

## 📝 Resumen Rápido

1. ✅ Ejecuta `sistema-roles-usuarios-v2.sql` en Supabase
2. ✅ Crea tu cuenta en la app
3. ✅ Ejecuta `crear-admin.sql` (con tu email) en Supabase
4. ✅ Cierra sesión y vuelve a iniciar sesión
5. ✅ Deberías ver el botón "Admin"
