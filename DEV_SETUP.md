# Puesta en marcha (desarrollo local)

Pasos para levantar el proyecto en una máquina nueva (Windows, macOS o Linux).

## 1. Requisitos
- **Git** — https://git-scm.com
- **Node.js 20+** (en la VM se usa 24)
  - Windows: `winget install OpenJS.NodeJS.LTS` o el instalador de https://nodejs.org
  - Verifica: `node -v`

## 2. Clonar e instalar
```bash
git clone https://github.com/OscarFelVar/porra-mundial.git
cd porra-mundial
npm install
```
> `node_modules/` está ignorado por git: hay que instalar siempre.

## 3. Crear `.env.local`
**`.env.local` NO está en el repo** (está en `.gitignore`). Créalo en la raíz con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qiirzryeoyengqwiaydu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_WN7pnxeTspbH4ir7oluXtg_GcR1fyjM
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
> Son claves **públicas** (la seguridad la da el RLS). Si se rotan, las copias de Supabase → *Settings → API*.

## 4. Arrancar
```bash
npm run dev
```
Abre http://localhost:3000

## 5. Identidad de git (commits a tu nombre)
```bash
git config user.name "Oscar Felipe Vargas"
git config user.email "felipe.cvvargas@gmail.com"
```
El primer `git push` pedirá iniciar sesión en GitHub (Git Credential Manager abre el navegador) o usa `gh auth login`.

## Flujo entre máquinas
- **Antes de trabajar:** `git pull`
- **Al terminar:** `git add` → `git commit` → `git push`
- Evita trabajar en dos equipos a la vez sin sincronizar (pull/push).

## Notas
- Probar el login: pide el enlace mágico y ábrelo en el **mismo navegador** (guarda una clave temporal en cookies).
- Despliegue: cada `git push` a `main` redespliega solo en Vercel. Las variables de entorno de producción viven en Vercel (Settings → Environment Variables), no en este repo.
