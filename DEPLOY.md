# 🚀 Cómo Publicar la Aplicación en Internet

Hay varias formas de hacer que tu aplicación sea accesible desde internet. Aquí te explico las opciones más fáciles:

## Opción 1: Vercel (Recomendado - Más Fácil) ⭐

### Pasos:

1. **Instala Vercel CLI** (opcional, también puedes usar la web):
   ```bash
   npm install -g vercel
   ```

2. **Inicia sesión en Vercel**:
   ```bash
   vercel login
   ```

3. **Despliega tu proyecto**:
   ```bash
   vercel
   ```
   
   O simplemente ve a [vercel.com](https://vercel.com) y:
   - Conecta tu repositorio de GitHub
   - O arrastra la carpeta del proyecto

4. **Configura variables de entorno**:
   - En el dashboard de Vercel, ve a Settings > Environment Variables
   - Agrega:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

5. **¡Listo!** Obtendrás un link como: `https://milapp.vercel.app`

---

## Opción 2: Netlify

### Pasos:

1. Ve a [netlify.com](https://netlify.com) y crea una cuenta

2. **Opción A - Arrastrar y soltar**:
   - Ejecuta `npm run build` en tu proyecto
   - Arrastra la carpeta `dist` a Netlify

3. **Opción B - Conectar GitHub**:
   - Conecta tu repositorio
   - Configura:
     - Build command: `npm run build`
     - Publish directory: `dist`

4. **Configura variables de entorno**:
   - Site settings > Environment variables
   - Agrega tus variables de Supabase

5. **¡Listo!** Obtendrás un link como: `https://milapp.netlify.app`

---

## Opción 3: Exponer Servidor Local (Temporal)

Si solo quieres mostrar algo rápido temporalmente:

1. **Modifica vite.config.js**:
   ```js
   server: {
     host: '0.0.0.0', // Permite acceso desde fuera
     port: 3000
   }
   ```

2. **Ejecuta**:
   ```bash
   npm run dev
   ```

3. **Obtén tu IP local**:
   - Windows: `ipconfig` (busca IPv4)
   - Mac/Linux: `ifconfig` o `ip addr`

4. **Accede desde otro dispositivo en la misma red**:
   - `http://TU_IP:3000`
   - Ejemplo: `http://192.168.1.100:3000`

⚠️ **Nota**: Esto solo funciona en tu red local, no desde internet.

---

## Opción 4: GitHub Pages

1. **Instala gh-pages**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Agrega script a package.json**:
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

3. **Ejecuta**:
   ```bash
   npm run deploy
   ```

4. **Configura en GitHub**:
   - Settings > Pages
   - Selecciona la rama `gh-pages`

---

## 🎯 Recomendación

**Usa Vercel** porque:
- ✅ Es gratis
- ✅ Muy fácil de usar
- ✅ Despliegue automático desde GitHub
- ✅ SSL automático (https)
- ✅ Muy rápido

## 📝 Importante

Recuerda configurar las **variables de entorno** en la plataforma que elijas:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Sin estas variables, la aplicación no se conectará a Supabase.
