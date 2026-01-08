# 🐾 Milapp - Ayuda y Seguimiento de Mascotas

Aplicación web para ayudar y hacer seguimiento de mascotas perdidas en tiempo real.

## 📋 ¿Qué hace esta aplicación?

- **Mapa interactivo**: Ver y reportar avistamientos de mascotas en un mapa
- **Seguimiento de rutas**: Ver el historial de movimientos de una mascota
- **Alertas cercanas**: Recibir notificaciones cuando hay mascotas cerca (5km)
- **Comunidad**: Ofrecer o pedir casas de acogida, medicamentos y donaciones
- **Verificación**: Los usuarios pueden confirmar si una mascota sigue en un lugar

## 🚀 Cómo empezar

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto (gratis)
3. Ve a **SQL Editor** y ejecuta el contenido del archivo `supabase/schema.sql`
4. Ve a **Settings** > **API** y copia:
   - **Project URL**
   - **anon public** key (o publishable key)

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_key_aqui
```

### 4. Ejecutar la aplicación

```bash
npm run dev
```

Abre tu navegador en `http://localhost:3000`

## 🛠️ Tecnologías usadas

- [React](https://react.dev/) - Interfaz de usuario
- [Vite](https://vitejs.dev/) - Herramienta de desarrollo
- [Tailwind CSS](https://tailwindcss.com/) - Estilos
- [Leaflet](https://leafletjs.com/) - Mapas
- [Supabase](https://supabase.com/) - Base de datos

## 📱 Funcionalidades principales

### Reportar avistamiento
1. Haz clic en el botón verde "Reportar ahora"
2. Completa el formulario con la información de la mascota
3. La ubicación se captura automáticamente
4. Guarda el reporte

### Ver perfil de mascota
- Haz clic en cualquier marcador del mapa
- Verás toda la información, historial médico y línea de tiempo de avistamientos

### Comunidad
- Ve a la sección "Comunidad"
- Ofrece o solicita ayuda (casas de acogida, medicamentos, donaciones)

## 🔧 Comandos disponibles

```bash
npm run dev      # Iniciar servidor de desarrollo
npm run build    # Construir para producción
npm run preview  # Previsualizar build de producción
```

## 📝 Notas importantes

- La aplicación funciona mejor si permites la ubicación en el navegador
- Las notificaciones deben estar habilitadas para recibir alertas
- Asegúrate de ejecutar el SQL en Supabase antes de usar la aplicación

## 📚 Documentación

- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev/learn)
- [Leaflet Docs](https://leafletjs.com/reference.html)

## 🌐 Publicar en Internet

Para compartir tu aplicación con otros, puedes desplegarla en:

- **[Vercel](https://vercel.com)** - Gratis y muy fácil (recomendado)
- **[Netlify](https://netlify.com)** - Gratis y fácil
- **[GitHub Pages](https://pages.github.com)** - Gratis

Ver instrucciones detalladas en [DEPLOY.md](DEPLOY.md)

### 🔗 Tu Link en Vercel

Tu link es: **`milapp.vercel.app`**

**Siguiente paso** (si ya configuraste las variables):
1. Haz clic en **"Deploy"** o **"Redeploy"** en Vercel
2. Espera 1-2 minutos
3. ¡Listo! El link funcionará

Ver guía completa en [SIGUIENTE_PASO.md](SIGUIENTE_PASO.md)

### Acceso Local desde Red

Si quieres acceder desde otro dispositivo en tu misma red:

1. El servidor ya está configurado para permitir acceso externo
2. Encuentra tu IP local:
   - Windows: `ipconfig` (busca IPv4)
   - Mac/Linux: `ifconfig`
3. Accede desde otro dispositivo: `http://TU_IP:3000`

## 📄 Licencia

MIT
