# AI Video Director (Demo)

Aplicación full-stack para crear y editar videos asistida por IA con experiencia tipo chat. Incluye frontend Next.js + Tailwind, backend con API Routes, persistencia SQLite vía Prisma, cola de trabajos en memoria y pipeline de render con FFmpeg en modo demo (genera MP4 reales con placeholders).

## Requisitos
- Node.js 18+
- FFmpeg instalado y disponible en el PATH

## Instalación
```bash
npm install
npm run prisma:generate
npm run prisma:migrate  # crea prisma/dev.db
npm run seed            # carga el proyecto demo
```

Si tu entorno bloquea la descarga de paquetes desde npm, configura el registro interno de tu organización o instala las dependencias manualmente.

## Ejecución
```bash
npm run dev
```
La app se sirve en `http://localhost:3000`.

## API principal
- `POST /api/projects` crea proyecto
- `GET /api/projects/:id` obtiene estado
- `POST /api/projects/:id/chat` mensaje conversacional → acción JSON + estado actualizado
- `POST /api/projects/:id/render` encola render
- `GET /api/jobs/:jobId` estado del render
- `GET /api/renders/:renderId/download` descarga MP4

## Arquitectura
- **Frontend**: Next.js (App Router) + Tailwind. UI con chat a la derecha, vista previa/timeline y formularios de escena.
- **Backend**: API Routes. "Video Director Agent" convierte texto en acciones tipadas (Zod) y mantiene `projectState` con escenas, audio, subtítulos y versiones.
- **Persistencia**: SQLite (Prisma). `projectState` se guarda como JSON; escenas y audio también se indexan.
- **Cola de trabajos**: In-memory con *polling*; el render se procesa en background.
- **Render demo**: FFmpeg compone clips de color con texto, concatena, añade tono base y opcionalmente quema subtítulos. Los archivos quedan en `.renders/`.

## Modo seguro
Se incluye un filtro básico de palabras bloqueadas. Amplía la lista o conecta un moderador real según tus políticas.

## Datos de ejemplo
Al correr `npm run seed` se crea un proyecto demo con una escena de apertura, música ligera y subtítulos activos.

## Notas de extensión
- Sustituye la cola en memoria por Redis + BullMQ para producción.
- Implementa proveedores reales de generación de imagen/video/audio en `lib/render`.
- Añade autenticación y control de versiones avanzado conectando `versionHistory` a la BD.
