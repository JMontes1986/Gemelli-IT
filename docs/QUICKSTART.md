# 🚀 Gemelli IT - Guía de Inicio Rápido

## ⚡ Inicio Rápido (5 minutos)

### 1. Clonar y configurar
```bash
# Clonar repositorio
git clone https://github.com/tu-org/gemelli-it.git
cd gemelli-it

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores reales
```

### 2. Configurar Supabase
```bash
# Ir a https://supabase.com y crear un proyecto

# Ejecutar esquema
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" < infra/supabase.sql

# Cargar datos de prueba
```

### 3. Iniciar desarrollo
```bash
# En la raíz del proyecto
pnpm dev

# Esto inicia:
# - Frontend en http://localhost:4321
# - Backend en http://localhost:8000
# - MCP Server en http://localhost:8001
```

### 4. Acceder a la aplicación
```
URL: http://localhost:4321
Usuario: admin@gemelli.edu.co
Password: Admin123!
```

---

## 📋 Checklist de Configuración

- [ ] Node.js 24.12.0 instalado
- [ ] Python >= 3.10 instalado
- [ ] pnpm >= 8 instalado
- [ ] Cuenta en Supabase creada
- [ ] Proyecto Supabase configurado
- [ ] Variables de entorno en .env
- [ ] OpenAI API Key configurada
- [ ] Base de datos inicializada

---

## 🐛 Errores comunes

### Error FK al insertar usuarios en `public.users`

**Error típico:**
```
ERROR: insert or update on table "users" violates foreign key constraint "users_id_fkey"
```

**Causa**: El usuario no existe en **Auth** (`auth.users`).

**Solución**:
1. Crear el usuario primero en Supabase **Auth > Users**.
2. Copiar el UUID generado.
3. Insertar el registro en `public.users` con ese UUID.

---

## 🔧 Comandos Esenciales

### Desarrollo
```bash
pnpm dev              # Iniciar todo
pnpm dev:web          # Solo frontend
pnpm dev:api          # Solo backend
pnpm dev:mcp          # Solo MCP server
```

### Base de Datos
```bash
pnpm db:push          # Aplicar schema
pnpm db:seed          # Cargar datos de prueba
pnpm db:reset         # Resetear completamente
```

### Auditoría
```bash
# Generar hash de auditoría
curl -X POST /audit/hash \
  -H "Authorization: Bearer TOKEN"

# Verificar integridad de cadena
curl /audit/chain/verify \
  -H "Authorization: Bearer TOKEN"

# Ver historial de entidad
curl /audit/entity/{entity_id} \
  -H "Authorization: Bearer TOKEN"
```

### Testing
```bash
pnpm test             # Todos los tests
pnpm test:web         # Tests de frontend
pnpm test:api         # Tests de backend
pnpm test:e2e         # Tests end-to-end
```

### Build y Deploy
```bash
pnpm build            # Build completo
pnpm deploy           # Deploy a Netlify
```

---

## 🎯 Casos de Uso Rápidos

### Crear un Nuevo Dispositivo
```bash
curl -X POST http://localhost:8000/inventory/devices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "PC-TEST-001",
    "tipo": "PC",
    "estado": "ACTIVO",
    "ubicacion": "Sala 101"
  }'
```

### Crear un Ticket
```bash
curl -X POST http://localhost:8000/tickets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Problema de red",
    "descripcion": "No hay internet en la sala 302",
    "prioridad": "ALTA"
  }'
```

### Obtener Triage con AI
```bash
curl -X POST http://localhost:8001/tools/summarize_and_triage \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "123",
    "titulo": "Internet lento",
    "descripcion": "La conexión está muy lenta desde ayer",
    "prioridad": "MEDIA",
    "estado": "ABIERTO",
    "mensajes": []
  }'
```

### Registrar en Auditoría
```bash
curl -X POST http://localhost:8000/audit/hash \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "CLOSE_TICKET",
    "entity_id": "ticket-id-here",
    "metadata": {"status": "RESUELTO"}
  }'
```

---

## 🗂️ Estructura de Archivos Importantes
```
gemelli-it/
├── apps/
│   ├── web/                    # Frontend Astro + React
│   │   ├── src/
│   │   │   ├── components/     # Componentes React
│   │   │   ├── pages/          # Páginas Astro
│   │   │   └── layouts/        # Layouts
│   │   └── astro.config.mjs
│   │
│   ├── api/                    # Backend FastAPI
│   │   ├── app/
│   │   │   ├── main.py         # ⭐ Punto de entrada
│   │   │   ├── routers/        # Endpoints
│   │   │   ├── models/         # Modelos Pydantic
│   │   │   └── services/       # Lógica de negocio
│   │   └── requirements.txt
│   │
│   └── mcp/                    # MCP Server
│       ├── server.py           # ⭐ Servidor MCP
│       └── requirements.txt
│
├── infra/
│   ├── supabase.sql           # ⭐ Schema completo
│   └── seed.sql               # ⭐ Datos de prueba
│
├── .env.example               # ⭐ Plantilla de variables
├── package.json               # ⭐ Scripts principales
└── netlify.toml               # ⭐ Config de despliegue
```

---

## 🔐 Autenticación

### Obtener Token JWT
```bash
# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gemelli.edu.co",
    "password": "Admin123!"
  }'

# Respuesta:
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### Usar Token en Requests
```bash
# Incluir en header Authorization
-H "Authorization: Bearer eyJhbGc..."
```

---

## 🐛 Solución de Problemas Comunes

### Error: "Supabase connection failed"
```bash
# Verificar variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Probar conexión
curl $SUPABASE_URL/rest/v1/
```

**Solución**: Verifica que las variables en `.env` sean correctas y que el proyecto Supabase esté activo.

### Error: "Module not found"
```bash
# Reinstalar dependencias
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Error: "Port already in use"
```bash
# Matar proceso en puerto 8000
lsof -ti:8000 | xargs kill -9

# O cambiar puerto en .env
API_PORT=8001
```

### Error: "OpenAI API rate limit"

**Solución**: Espera unos minutos o actualiza tu plan de OpenAI.

### Error: "RLS policy violation"

**Solución**: Verifica que el usuario tenga el rol correcto en la tabla `users`.

### Error: "Audit chain corrupted"

**Solución**: Ejecuta verificación de integridad:
```bash
curl http://localhost:8000/audit/chain/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Si la cadena está rota, revisa logs y backups. Puede indicar manipulación de datos.

---

## 📊 Monitoreo y Logs

### Ver logs del backend
```bash
cd apps/api
tail -f logs/api.log
```

### Ver logs del MCP
```bash
cd apps/mcp
tail -f logs/mcp.log
```

### Ver cadena de auditoría
```bash
# Verificar integridad
curl http://localhost:8000/audit/chain/verify \
  -H "Authorization: Bearer YOUR_TOKEN"

# Ver historial de dispositivo
curl http://localhost:8000/audit/entity/device-id \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Métricas del sistema
```bash
# Dashboard interno
curl http://localhost:8000/dashboard/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🧪 Testing

### Backend Tests
```bash
cd apps/api
pytest                          # Todos los tests
pytest -v                       # Verbose
pytest tests/test_devices.py    # Tests específicos
pytest --cov                    # Con cobertura
```

### Frontend Tests
```bash
cd apps/web
pnpm test                       # Unit tests
pnpm test:watch                 # Watch mode
pnpm test:e2e                   # E2E tests
```

---

## 🚀 Despliegue a Producción

### 1. Preparar variables de producción
```bash
# En Netlify Dashboard:
# Settings > Environment Variables
# Agregar todas las variables del .env
```

### 2. Configurar Supabase Production
```bash
# Crear proyecto de producción en Supabase
# Ejecutar migrations
# Actualizar variables SUPABASE_URL y SUPABASE_ANON_KEY
```

### 3. Deploy a Netlify
```bash
# Conectar repositorio en Netlify
# O usar CLI:
netlify deploy --prod

# Verificar en:
https://tu-app.netlify.app
```

---

## 📚 Recursos Adicionales

### Documentación

- **API Docs**: http://localhost:8000/docs (Swagger)
- **Frontend**: `apps/web/README.md`
- **MCP Server**: `apps/mcp/README.md`
- **Hash Chain**: `HASH_CHAIN.md`

### Enlaces Útiles

- **Supabase Dashboard**: https://app.supabase.com
- **OpenAI Platform**: https://platform.openai.com
- **Netlify Dashboard**: https://app.netlify.com

### Soporte

- 📧 Email: soporte@gemelli.edu.co
- 🐛 Issues: https://github.com/tu-org/gemelli-it/issues
- 📖 Wiki: https://github.com/tu-org/gemelli-it/wiki

---

## 🎓 Próximos Pasos

1. **Personalizar** la aplicación con los datos de tu institución
2. **Configurar** notificaciones por email (opcional)
3. **Agregar** usuarios reales desde el panel de administración
4. **Importar** inventario existente (si aplica)
5. **Capacitar** al equipo de TI en el uso del sistema
6. **Monitorear** el uso y ajustar según necesidades

---

## 🎉 ¡Listo!

Tu sistema Gemelli IT está configurado y listo para usar. 

**Usuario de prueba:**
- Email: `admin@gemelli.edu.co`
- Password: `Admin123!`
- Rol: LIDER_TI

**Próximo paso:** Accede a http://localhost:4321 y explora el dashboard.

---

**Desarrollado por JMontes86*

*Versión 1.0.0 - Octubre 2025*
