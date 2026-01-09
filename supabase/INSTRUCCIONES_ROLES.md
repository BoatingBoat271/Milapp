# Sistema de Roles y Usuarios

## Estructura de Usuarios

### 1. Usuario Maestro/Admin
- **Rol**: `admin`
- **Privilegios**: 
  - Acceso completo al panel de administración
  - Ver historial completo de todas las actividades
  - Ver información detallada de todos los usuarios
  - Gestionar organizaciones
  - Verificar organizaciones

### 2. Usuario Común/Miembro
- **Rol**: `member`
- **Tipo**: `individual`
- **Características**:
  - Aparece en la lista pública de miembros
  - Información básica visible públicamente (activo, qué mascota busca, qué pide/dona)
  - Información detallada solo visible para admin

### 3. Usuario Organización/Institución
- **Rol**: `organization`
- **Tipo**: `organization`
- **Características**:
  - Nombre, logo, descripción
  - Usuarios asociados (solo nombre, ciudad, contacto, email)
  - Solo el registrador necesita verificar correo
  - Los usuarios asociados participan representando a la institución

## Instalación

1. Ejecuta el script SQL en Supabase:
   ```sql
   -- Ejecutar: supabase/sistema-roles-usuarios-v2.sql
   ```

2. Crear un usuario admin:
   ```sql
   -- Reemplaza 'tu_email@ejemplo.com' con el email del usuario que será admin
   UPDATE user_profiles 
   SET user_role = 'admin' 
   WHERE email = 'tu_email@ejemplo.com';
   ```

## Uso

### Panel de Administración
- Ruta: `/admin`
- Solo accesible para usuarios con `user_role = 'admin'`
- Muestra:
  - Historial completo de actividad
  - Lista de todos los usuarios
  - Lista de organizaciones

### Lista de Miembros
- Ruta: `/members`
- Accesible para todos
- Muestra información pública de miembros activos
- Los admins ven información adicional

### Registro de Organización
- Al registrarse, seleccionar "Organización"
- Después del registro, completar datos de la organización en el perfil
- Los usuarios asociados se agregan desde el perfil de la organización
