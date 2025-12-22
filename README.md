# 🧠 Gemelli IT - Sistema de Inventario & HelpDesk

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.10+-blue.svg)
![Node](https://img.shields.io/badge/node-24.12.0-green.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

Sistema completo de gestión de inventario TI y mesa de ayuda con auditoría mediante Hash Chain.

## 🎯 Características Principales

- ✅ **Gestión de Inventario TI**: Hoja de vida completa de cada dispositivo
- ✅ **HelpDesk Inteligente**: Sistema de tickets con triage automático vía ChatGPT MCP
- ✅ **Auditoría con Hash Chain**: Sistema de cadena de hash inmutable para registros críticos
- ✅ **Dashboard Analítico**: Métricas y KPIs en tiempo real
- ✅ **Control de Backups**: Calendario y seguimiento de copias de seguridad
- ✅ **Multi-tenant**: Políticas RLS por dependencia organizacional
- ✅ **Mobile-First**: Totalmente responsivo

## 🏗️ Arquitectura
```
Frontend: Astro + React + TailwindCSS + shadcn/ui
Backend: FastAPI + Python
Database: PostgreSQL (Supabase)
Auth: Supabase Auth (Email/OAuth)
Audit: Hash Chain con HMAC (SHA-256)
AI: OpenAI + MCP Server
Deployment: Netlify + Supabase
```

## 📁 Estructura del Proyecto
```
gemelli-it/
├── apps/
│   ├── web/              # Frontend (Astro + React)
│   ├── api/              # Backend (FastAPI)
│   └── mcp/              # MCP Connector
├── infra/
│   ├── supabase.sql      # Schema + RLS
│   └── seed.sql          # Data inicial
├── docs/                 # Documentación
├── .env.example
├── README.md
├── netlify.toml
└── package.json
```

## 🚀 Instalación y Configuración

### 1. Prerrequisitos
```bash
Node.js 24.12.0
Python >= 3.10
pnpm >= 8
PostgreSQL (o cuenta Supabase)
```

### 2. Clonar y configurar
```bash
# Clonar repositorio
git clone https://github.com/tu-org/gemelli-it.git
cd gemelli-it

# Instalar dependencias
pnpm install

# Copiar variables de entorno
cp .env.example .env
```

### 3. Configurar variables de entorno (.env)
```env
# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE=tu_service_role_key

# Auth
JWT_SECRET=tu_secreto_jwt_256bits
AUDIT_SECRET=tu_secreto_para_auditorias

# OpenAI + MCP
OPENAI_API_KEY=sk-...
MCP_SERVER_URL=http://localhost:8001

# API
API_URL=http://localhost:8000
```

### 4. Configurar Base de Datos
```bash
# Ejecutar schema
pnpm db:push

# Cargar datos de prueba
pnpm db:seed
```

### 5. Ejecutar en desarrollo
```bash
# Terminal 1: Backend
cd apps/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2: MCP Server
cd apps/mcp
source venv/bin/activate
python server.py

# Terminal 3: Frontend
cd apps/web
pnpm dev
```

Accede a: `http://localhost:4321`

## 📊 Modelo de Datos

### Tablas Principales

- **org_units**: Dependencias organizacionales
- **users**: Usuarios con roles (DOCENTE, ADMINISTRATIVO, TI, DIRECTOR, LIDER_TI)
- **devices**: Equipos de TI (PC, LAPTOP, IMPRESORA, RED, OTRO)
- **device_specs**: Especificaciones técnicas (CPU, RAM, disco, OS, licencias)
- **device_logs**: Historial de cambios y mantenimientos
- **backups**: Copias de seguridad (incremental, completa, nube, local)
- **tickets**: Requerimientos del HelpDesk
- **ticket_comments**: Comentarios y adjuntos
- **audit_chain**: Cadena de hash para auditoría inmutable
- **attachments**: Archivos adjuntos

## 🔐 Roles y Permisos

| Rol | Crear Ticket | Ver Inventario | Editar Inventario | Asignar Tickets | Dashboard |
|-----|--------------|----------------|-------------------|-----------------|-----------|
| DOCENTE | ✅ | ✅ (limitado) | ❌ | ❌ | ❌ |
| ADMINISTRATIVO | ✅ | ✅ (limitado) | ❌ | ❌ | ❌ |
| DIRECTOR | ✅ | ✅ | ❌ | ❌ | ✅ |
| TI | ✅ | ✅ | ✅ | ✅ | ✅ |
| LIDER_TI | ✅ | ✅ | ✅ | ✅ | ✅ |

## 🔗 API Endpoints

### Auth
- `POST /auth/login` - Autenticación
- `GET /auth/profile` - Perfil del usuario

### Inventario
- `GET /inventory/devices` - Listar dispositivos
- `POST /inventory/devices` - Crear dispositivo
- `GET /inventory/devices/{id}` - Detalle
- `GET /inventory/devices/{id}/cv` - Hoja de vida completa
- `PUT /inventory/devices/{id}` - Actualizar
- `DELETE /inventory/devices/{id}` - Eliminar

### HelpDesk
- `GET /tickets` - Listar tickets
- `POST /tickets` - Crear ticket
- `GET /tickets/{id}` - Detalle
- `PUT /tickets/{id}` - Actualizar estado
- `POST /tickets/{id}/comments` - Agregar comentario
- `POST /tickets/{id}/ai-triage` - Obtener sugerencias AI

### Backups
- `GET /backups` - Listar copias
- `POST /backups` - Registrar backup
- `GET /backups/calendar` - Vista de calendario

### Dashboard
- `GET /dashboard/metrics` - KPIs generales

### Auditoría
- `POST /audit/hash` - Generar hash de auditoría
- `GET /audit/verify/{hash}` - Verificar integridad
- `GET /audit/chain/verify` - Verificar toda la cadena
- `GET /audit/entity/{id}` - Historial de entidad

## 🤖 Integración MCP + ChatGPT

El sistema incluye un servidor MCP que expone herramientas para ChatGPT:
```python
# Tool: summarize_and_triage
Input: ticket_thread (conversación completa del ticket)
Output: {
  "resumen": "...",
  "causa_probable": "...",
  "pasos_siguientes": ["...", "..."],
  "prioridad_sugerida": "ALTA|MEDIA|BAJA"
}
```

## 📝 Scripts Disponibles
```bash
# Desarrollo
pnpm dev              # Inicia todo (frontend + backend)
pnpm dev:web          # Solo frontend
pnpm dev:api          # Solo backend
pnpm dev:mcp          # Solo MCP server

# Base de datos
pnpm db:push          # Aplicar schema
pnpm db:seed          # Cargar datos de prueba
pnpm db:reset         # Resetear DB

# Build
pnpm build            # Build completo
pnpm build:web        # Solo frontend
pnpm build:api        # Solo backend

# Testing
pnpm test             # Todos los tests
pnpm test:unit        # Unit tests
pnpm test:integration # Integration tests
pnpm test:e2e         # End-to-end tests

# Linting
pnpm lint             # Lint todo
pnpm lint:fix         # Auto-fix

# Deployment
pnpm deploy           # Deploy completo
```

## 🚢 Despliegue en Producción

### Netlify (Frontend + Functions)

- **Proveedor**: Netlify. El archivo [`netlify.toml`](./netlify.toml) declara el comando de build (`npm --prefix apps/web run build`) y la carpeta a publicar (`apps/web/dist`). Las funciones serverless viven en `apps/api/netlify-functions` y se empaquetan incluyendo `apps/api/app/**`.
- **Variables requeridas** (definirlas en Netlify UI y en tu `.env` local):
  - `SUPABASE_URL` / `PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE` (o `SUPABASE_SERVICE_ROLE_KEY`), `SUPABASE_ANON_KEY`
  - `JWT_SECRET`, `AUDIT_SECRET`
  - `OPENAI_API_KEY`, `OPENAI_MODEL`
  - `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_SUPABASE_URL`, `PUBLIC_API_URL`
  - Opcionales: `LOG_LEVEL`, `LOG_FILE`, `SMTP_*`
- **Revisión de despliegues**: el repositorio no incluye pipelines CI/CD; valida el historial de Deploys directamente en Netlify (Deploy Logs). Si se usa CLI, `netlify status` muestra el estado del último sitio autenticado.
- **Ejecutar funciones en local**:
  1. Instala dependencias de Python: `pip install -r apps/api/netlify-functions/requirements.txt`.
  2. Arranca las funciones: `npx netlify-cli functions:serve --functions apps/api/netlify-functions --port 9999`.
  3. Prueba salud: `curl http://localhost:9999/.netlify/functions/main/health`.
- **Redeploy manual**: desde Netlify UI selecciona *Trigger deploy > Clear cache and deploy site* o ejecuta `netlify deploy --prod --build` (requiere `NETLIFY_AUTH_TOKEN` y `NETLIFY_SITE_ID`).
- **Pruebas de endpoints desplegados**: el redirect `/api/*` apunta a `/.netlify/functions/main`. Valida `https://<tu-sitio>.netlify.app/api/health` y agrega monitores si es posible.
- **Test automatizado de salud**: `apps/api/tests/test_health.py` verifica que `/health` responda correctamente antes de publicar.

### Supabase (Database)
```bash
# Crear proyecto en supabase.com
# Ejecutar migrations
supabase db push --db-url "postgresql://..."
```

## 🧪 Testing
```bash
# Backend tests
cd apps/api
pytest

# Frontend tests
cd apps/web
pnpm test

# E2E tests
pnpm test:e2e
```

📌 **Pruebas específicas de inventario**: sigue el checklist de `docs/PRUEBAS_INVENTARIO.md` para validar que el backend (o la función serverless de Netlify) responde correctamente antes de depurar el frontend.

## 🌱 Datos de Ejemplo

El archivo `infra/seed.sql` incluye:

- **2 org_units**: Colegio, Administración
- **8 usuarios**: 1 Líder TI, 2 técnicos, 3 docentes, 2 administrativos, 1 director
- **8 dispositivos** con hojas de vida completas
- **6 tickets** en varios estados
- **3 registros de backup**
- **1 entrada en cadena de auditoría**

**Usuario de prueba:**
```
Email: admin@gemelli.edu.co
Password: Admin123!
Rol: LIDER_TI
```

## 🐛 Troubleshooting

### Error: "Supabase connection failed"
```bash
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
curl $SUPABASE_URL/rest/v1/
```

### Error: "OpenAI rate limit exceeded"
Espera unos minutos o actualiza tu plan de OpenAI.

### La aplicación está lenta
Verifica queries lentos en Supabase Dashboard > Database > Query Performance

## 📚 Documentación Adicional

- [Guía de Inicio Rápido](docs/QUICKSTART.md)
- [Sistema Hash Chain](docs/HASH_CHAIN.md)
- [Arquitectura Técnica](docs/ARCHITECTURE.md)
- [Preguntas Frecuentes](docs/FAQ.md)
- [Cambios sin Blockchain](docs/CAMBIOS.md)

## 🤝 Contribuir
```bash
# 1. Fork el repositorio
# 2. Crear rama feature
git checkout -b feature/nueva-funcionalidad

# 3. Commit con formato convencional
git commit -m "feat: agregar exportación de reportes"

# 4. Push y crear PR
git push origin feature/nueva-funcionalidad
```

### Convenciones de Commits
```
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
style: formato, sin cambios de código
refactor: refactorización de código
test: agregar o actualizar tests
chore: tareas de mantenimiento
```

## 📄 Licencia

MIT License - ver [LICENSE](./LICENSE) para detalles

## 👥 Equipo

Desarrollado para Colegio Gemelli

## 🆘 Soporte

- 📧 Email: sistemas@gemelli.edu.co
- 📞 Tel: +57 320 676 6574
- 🌐 Web: https://colgemelli.edu.co
- 🐛 Issues: https://github.com/tu-org/gemelli-it/issues

## 🎯 Roadmap

### v1.0 (Actual)
- ✅ Gestión de inventario
- ✅ Sistema de tickets
- ✅ Auditoría con hash chain
- ✅ MCP integration

### v1.1 (Próximo)
- [ ] Notificaciones push
- [ ] Reportes PDF
- [ ] QR codes para equipos
- [ ] App móvil nativa

### v2.0 (Futuro)
- [ ] IA predictiva para mantenimiento
- [ ] Integración con Active Directory
- [ ] Dashboard ejecutivo avanzado
- [ ] API pública documentada

---

**🚀 ¡Listo para producción!**

Para comenzar: `pnpm install && pnpm dev`

**Desarrollado por JMontes86**
