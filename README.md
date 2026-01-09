# 🐾 Milapp - Ayuda y Seguimiento de Mascotas

Aplicación web progresiva (PWA) para ayudar y hacer seguimiento de mascotas perdidas en tiempo real.

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:
```
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_de_google_maps
```

### 3. Ejecutar en desarrollo
```bash
npm run dev
```

### 4. Base de datos

**IMPORTANTE: Ejecuta estos scripts en Supabase SQL Editor (en orden):**

1. **Primero**: `supabase/setup-completo.sql` (crea todas las tablas base)
2. **Segundo**: `supabase/agregar-campos-perdida.sql` (campos para pérdida de mascotas)
3. **Tercero**: `supabase/sistema-roles-usuarios-v2.sql` (sistema de roles y admin)

**Después de ejecutar los scripts:**
- Crea tu cuenta en la app (en `/login`)
- Luego ejecuta este SQL para convertirte en admin (reemplaza el email):

```sql
UPDATE user_profiles 
SET user_role = 'admin' 
WHERE email = 'tu_email@ejemplo.com';
```

📖 **Ver instrucciones detalladas**: `supabase/CREAR_USUARIO_ADMIN.md`

## 📦 Build para producción
```bash
npm run build
```

## 🎯 Funcionalidades

- ✅ Mapa interactivo con Google Maps
- ✅ Reporte de avistamientos con ubicación
- ✅ Selección de razas y colores por especie
- ✅ Subida de imágenes o enlaces desde redes sociales
- ✅ Mapa en detalles de mascota
- ✅ Línea de tiempo de avistamientos
- ✅ Alertas de proximidad (5km)
- ✅ Verificación comunitaria

## 🛠️ Tecnologías

- React + Vite
- Tailwind CSS
- Supabase (Base de datos y tiempo real)
- Google Maps API
- Lucide Icons

## 📝 Notas

- Asegúrate de tener configuradas las API Keys en `.env`
- La base de datos debe tener las tablas creadas antes de usar la app
- Para producción, configura las restricciones de la API Key de Google Maps
