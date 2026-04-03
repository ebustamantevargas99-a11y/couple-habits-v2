# 💕 Hábitos en Pareja — Sincronización en Tiempo Real

## 🚀 SETUP PASO A PASO

### PASO 1: Configurar Supabase (3 minutos)

1. Ve a **https://supabase.com/dashboard**
2. Abre tu proyecto (o crea uno nuevo gratis)
3. En el menú izquierdo, click en **"SQL Editor"**
4. Copia y pega TODO el contenido del archivo `supabase-setup.sql`
5. Click en **"Run"** (el botón verde)
6. Debe decir "Success"

Ahora necesitas tus credenciales:
7. Ve a **Settings** (el engranaje ⚙️) → **API**
8. Copia el **"Project URL"** (algo como `https://xxxxx.supabase.co`)
9. Copia el **"anon public"** key (empieza con `eyJ...`)

### PASO 2: Subir a GitHub

1. Ve a **https://github.com/new**
2. Nombre: `couple-habits-v2`
3. Click **"Create repository"**
4. Click **"uploading an existing file"**
5. Arrastra todos los archivos de esta carpeta
6. Click **"Commit changes"**

### PASO 3: Deploy en Vercel

1. Ve a **https://vercel.com/new**
2. Importa `couple-habits-v2`
3. En **Root Directory** → Edit → selecciona `couple-habits-v2`
4. ANTES DE DARLE DEPLOY, abre **"Environment Variables"** y agrega:

   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | tu Project URL de Supabase |
   | `VITE_SUPABASE_ANON_KEY` | tu anon key de Supabase |

5. Click **"Deploy"**
6. ¡Espera 1-2 minutos y listo!

### PASO 4: Usar la app

**Tú (primer usuario):**
1. Abre el link de Vercel
2. Pon tu nombre y el de tu pareja
3. Click "Crear Sala"
4. Te dará un código de 6 letras (ej: `ABC123`)
5. Mándale ese código a tu pareja

**Tu pareja:**
1. Abre el mismo link
2. En "¿Tu pareja ya creó la sala?" ingresa el código
3. Click "Unirme"
4. Selecciona su nombre
5. ¡LISTO! Todo se sincroniza automáticamente

### 📱 Instalar como app en iPhone
1. Abre el link en **Safari**
2. Botón compartir (□↑) → **"Agregar a pantalla de inicio"**
3. Se instala como app nativa

---

## ✨ Funcionalidades
- 🔄 Sincronización automática en tiempo real
- ✅ Hábitos individuales y compartidos
- 📸 Verificación con foto
- 💰 Metas financieras compartidas
- 🏆 Logros desbloqueables en pareja
- 🎁 Recompensas por rachas juntos
- 😴 Días de descanso configurables
