# ❓ Gemelli IT - Preguntas Frecuentes (FAQ)

## 🚀 Inicio y Configuración

### ¿Cuánto tiempo toma configurar el sistema?

La configuración inicial completa toma aproximadamente **30-45 minutos**:
- 5 min: Clonar repo e instalar dependencias
- 10 min: Configurar Supabase y variables de entorno
- 10 min: Inicializar base de datos con datos de prueba
- 5 min: Probar el sistema localmente

### ¿Necesito conocimientos de blockchain?

**No**. El sistema usa Hash Chain en lugar de blockchain, que es mucho más simple. No necesitas:
- ❌ Conocer Solidity
- ❌ Tener wallet cripto
- ❌ Obtener MATIC
- ❌ Desplegar smart contracts

Todo funciona con PostgreSQL y Python estándar.

### ¿Qué servicios externos necesito configurar?

1. **Supabase** (gratis): Base de datos y autenticación
2. **OpenAI** (pago): API para análisis con IA (opcional pero recomendado)
3. **Netlify** (gratis): Hosting del frontend

### ¿Puedo usar esto sin la IA de OpenAI?

**Sí**. La funcionalidad de triage con IA es opcional:
- El sistema funciona perfectamente sin ella
- Los tickets se gestionan manualmente
- Puedes implementar reglas heurísticas simples

---

## 💰 Costos

### ¿Cuánto cuesta ejecutar este sistema?

**Plan Mínimo (Gratis):**
- Supabase: Free tier (500MB DB, 2GB storage)
- Netlify: Free tier (100GB bandwidth)
- **Total: $0/mes**

**Plan Recomendado (Producción):**
- Supabase Pro: $25/mes (8GB DB, 100GB storage)
- Netlify Pro: $19/mes (400GB bandwidth)
- OpenAI API: ~$10-30/mes (según uso)
- **Total: ~$54-74/mes**

### ¿Por qué es más barato que otros sistemas?

- ❌ Sin costos de blockchain (gas fees)
- ❌ Sin infraestructura cripto
- ✅ Solo pagas base de datos y hosting
- ✅ OpenAI opcional

---

## 🔧 Técnico

### ¿Por qué Astro y no Next.js?

**Astro** ofrece ventajas específicas:
- **Mejor SEO**: HTML estático por defecto
- **Menor JavaScript**: Islands architecture
- **Flexibilidad**: Puedes usar React, Vue, Svelte
- **Performance**: Carga más rápida

Pero puedes migrar fácilmente a Next.js si prefieres.

### ¿Por qué FastAPI y no Node.js/Express?

**FastAPI** es ideal para este proyecto:
- **Type safety**: Validación automática con Pydantic
- **Async nativo**: Alto rendimiento
- **OpenAPI automático**: Swagger docs incluido
- **Fácil integración**: Con ML/AI libraries de Python

### ¿Puedo usar MySQL en lugar de PostgreSQL?

**No es recomendado**. PostgreSQL tiene características clave:
- **JSONB**: Para datos flexibles (specs, metadata)
- **RLS**: Row Level Security nativo
- **Enums**: Tipos personalizados
- **Triggers**: Automatizaciones

Supabase solo soporta PostgreSQL.

### ¿Cómo escalo la base de datos?

**Opciones de escalado:**
1. **Vertical**: Upgrade plan Supabase (más CPU/RAM)
2. **Read replicas**: Para queries pesados
3. **Particionamiento**: Dividir tablas grandes
4. **Caché**: Redis para datos frecuentes
5. **Archiving**: Mover datos antiguos

Supabase gestiona la mayoría automáticamente.

---

## 🔐 Seguridad

### ¿Es seguro almacenar datos sensibles?

**Sí**, con las siguientes medidas:
- **Encriptación en tránsito**: HTTPS obligatorio
- **Encriptación en reposo**: Supabase encripta la DB
- **RLS**: Control granular de acceso
- **Hash Chain**: Auditoría inmutable
- **Secrets**: Variables de entorno seguras

**Recomendaciones adicionales:**
- Rotar claves cada 90 días
- Habilitar 2FA en Supabase
- Limitar IPs en producción
- Backups diarios automatizados

### ¿Qué pasa si alguien accede a mi .env?

**Medidas preventivas:**
- ✅ Nunca subir .env al repositorio
- ✅ Usar secrets de Netlify/Render
- ✅ Diferentes claves por entorno
- ✅ Rate limiting en la API

**Si se compromete:**
1. Rotar inmediatamente todas las claves
2. Revisar logs de acceso
3. Invalidar tokens JWT existentes
4. Notificar al equipo

### ¿Por qué aparece el mensaje "Rol en Supabase inválido"?

La API valida que el rol entregado por Supabase pertenezca al conjunto soportado (`DOCENTE`, `ADMINISTRATIVO`, `TI`, `DIRECTOR`, `LIDER_TI`).
Si llega cualquier otro valor (por ejemplo, `guest`), el endpoint devolverá un **HTTP 422** con el detalle `"Rol en Supabase inválido: <valor>"` para que soporte corrija el perfil en Supabase antes de reintentar.

### ¿Los tickets son privados?

**Sí**. RLS garantiza que:
- Docentes solo ven sus propios tickets
- TI ve todos los tickets de su organización
- Cada org_unit está aislada
- Los comentarios siguen las mismas reglas

### ¿El Hash Chain es tan seguro como blockchain?

**Para sistemas internos, SÍ**:
- ✅ Inmutabilidad criptográfica (SHA-256)
- ✅ Detección de manipulación
- ✅ Firmas HMAC verificables
- ✅ Cadena enlazada inquebrantable

**Lo único que no tiene**:
- ❌ Descentralización (no necesaria internamente)
- ❌ Verificación externa independiente

Para un colegio, Hash Chain es suficiente y superior.

---

## 🤖 Inteligencia Artificial

### ¿Qué hace exactamente el MCP Server?

El **MCP Server** proporciona herramientas de IA para:
1. **Triage automático**: Analizar tickets y sugerir prioridades
2. **Resúmenes**: Condensar hilos largos de tickets
3. **Clasificación**: Categorizar automáticamente problemas
4. **Sugerencias**: Proponer soluciones basadas en problemas similares

### ¿Puedo usar otro LLM en lugar de OpenAI?

**Sí**. Puedes modificar el MCP server para usar:
- Claude (Anthropic)
- Llama (Meta)
- Gemini (Google)
- Modelos locales (Ollama)

Solo necesitas cambiar el cliente API.

### ¿Los datos de los tickets se envían a OpenAI?

**Sí**, cuando usas el triage automático:
- Se envía el contenido del ticket
- OpenAI lo procesa y devuelve análisis
- **NO se almacena** en los servidores de OpenAI (según política de API)

Si te preocupa la privacidad:
- Usa modelos locales (Ollama + Llama)
- Desactiva la funcionalidad de IA
- Usa solo para tickets no sensibles

---

## 📱 Uso y Funcionalidades

### ¿Funciona en móviles?

**Sí, completamente**. El diseño es mobile-first:
- Interfaz responsiva
- Touch-friendly
- Optimizado para pantallas pequeñas
- PWA-ready (Progressive Web App)

Puedes instalarlo como app en Android/iOS.

### ¿Puedo personalizar la interfaz?

**Absolutamente**. Es fácil personalizar:
- **Colores**: Editar TailwindCSS config
- **Logo**: Reemplazar en assets
- **Componentes**: Todos son modificables
- **Temas**: Soporta modo oscuro

### ¿Cómo importo mi inventario existente?

**Opción 1: CSV Import**
```bash
# Preparar CSV con columnas:
nombre,tipo,estado,ubicacion,serial,marca,modelo

# Ejecutar script de importación (crear custom)
python scripts/import_devices.py inventory.csv
```

**Opción 2: API Bulk Insert**
```bash
curl -X POST /api/inventory/devices/bulk \
  -H "Authorization: Bearer TOKEN" \
  -d @devices.json
```

**Opción 3: Manual**
- Crear desde la interfaz web
- Ideal para inventarios pequeños (<50 dispositivos)

### ¿Puedo exportar reportes?

**Sí**. Formatos disponibles:
- **JSON**: Datos crudos vía API
- **CSV**: Exportar desde la interfaz
- **PDF**: Implementar con reportlab (Python)
- **Excel**: Implementar con openpyxl (Python)

(Requiere implementar endpoints de exportación)

---

## 🔄 Mantenimiento

### ¿Cómo actualizo el sistema?
```bash
# 1. Backup de la base de datos
pg_dump $SUPABASE_URL > backup.sql

# 2. Pull últimos cambios
git pull origin main

# 3. Actualizar dependencias
pnpm install
cd apps/api && pip install -r requirements.txt

# 4. Ejecutar migraciones (si hay)
pnpm db:migrate

# 5. Rebuild y deploy
pnpm build && pnpm deploy
```

### ¿Con qué frecuencia debo hacer backups?

**Recomendado:**
- **Base de datos**: Diario (automático en Supabase)
- **Archivos adjuntos**: Semanal
- **Configuración**: Con cada cambio importante

Supabase hace backups automáticos, pero es buena práctica tener copias propias.

### ¿Qué sucede si Supabase cae?

**Plan de contingencia:**
1. Supabase tiene 99.9% uptime
2. Puedes migrar a otra instancia PostgreSQL
3. Los datos están en tu control
4. Backups disponibles para restaurar

**Alternativas a Supabase:**
- Neon
- Railway
- Render PostgreSQL
- Self-hosted PostgreSQL

---

## 👥 Usuarios y Roles

### ¿Cómo agrego nuevos usuarios?

**Opción 1: Panel Admin** (recomendado)
1. Login como LIDER_TI
2. Ir a Administración > Usuarios
3. Crear nuevo usuario
4. Enviar credenciales por email

**Opción 2: Supabase Dashboard**
1. Auth > Users > Add User
2. Copiar UUID
3. Insertar en tabla `users`
> **Nota:** no insertes directo en `public.users` sin crear primero el usuario en **Auth** (tabla `auth.users`), o fallará la FK.

**Opción 3: API**
```bash
curl -X POST /api/admin/users \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@gemelli.edu.co",
    "rol": "DOCENTE",
    "org_unit_id": "uuid"
  }'
```

### ¿Puedo tener múltiples colegios?

**Sí**. El sistema es multi-tenant:
- Cada colegio = 1 org_unit
- RLS separa automáticamente los datos
- Cada org_unit tiene sus propios usuarios y dispositivos

### ¿Cómo cambio el rol de un usuario?

Solo el LIDER_TI puede cambiar roles:
```sql
UPDATE users 
SET rol = 'TI' 
WHERE id = 'user-uuid';
```

O desde el panel de administración web.

---

## 🐛 Problemas Comunes

### Error: "Row Level Security policy violation"

**Causa**: El usuario no tiene permisos para ver/editar ese recurso.

**Solución:**
1. Verificar que el usuario pertenece al org_unit correcto
2. Revisar el rol del usuario
3. Verificar políticas RLS en Supabase

### Error: "OpenAI rate limit exceeded"

**Causa**: Límite de requests a la API de OpenAI.

**Solución:**
1. Esperar unos minutos
2. Implementar caché de respuestas
3. Upgrade plan de OpenAI
4. Usar otro LLM

### La aplicación está lenta

**Posibles causas:**
1. **Base de datos**: Queries sin índices
2. **API**: Muchos requests concurrentes
3. **Frontend**: Componentes no optimizados
4. **Network**: Latencia alta

**Soluciones:**
```bash
# Ver queries lentos en Supabase
# Dashboard > Database > Query Performance

# Optimizar imágenes
pnpm optimize-images

# Enable caching
# Configurar Redis (opcional)
```

### Los backups no se registran

**Checklist:**
1. ✅ Usuario tiene rol TI o LIDER_TI
2. ✅ device_id existe
3. ✅ Token JWT válido
4. ✅ RLS policies correctas

### Error: "Audit chain corrupted"

**Solución**: Ejecuta verificación:
```bash
curl http://localhost:8000/audit/chain/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Si la cadena está rota:
1. Revisar logs del servidor
2. Verificar backups recientes
3. Puede indicar intento de manipulación
4. Contactar al administrador del sistema

---

## 🌐 Internacionalización

### ¿Puedo usar el sistema en otro idioma?

**Actualmente**: Español solamente

**Para agregar inglés:**
1. Instalar i18next
2. Crear archivos de traducción
3. Envolver strings en `t('key')`
4. Selector de idioma en UI

Es un feature del roadmap para v2.0.

---

## 📊 Analytics

### ¿Cómo puedo ver estadísticas avanzadas?

**Dashboard incluido**: Métricas básicas

**Para análisis avanzado:**
- Exportar datos a Excel
- Conectar con Metabase/Superset
- Usar API de dashboard con Python/R
- Implementar custom reports

### ¿Puedo integrar con Google Analytics?

**Sí**, agregar en el `<head>` de tu layout:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

---

## 🔮 Futuro

### ¿Qué viene en próximas versiones?

**v1.1 (Próximo trimestre):**
- [ ] Notificaciones push
- [ ] QR codes para equipos
- [ ] App móvil nativa
- [ ] Reportes PDF

**v2.0 (Próximo año):**
- [ ] IA predictiva para mantenimiento
- [ ] Integración con Active Directory
- [ ] Dashboard ejecutivo avanzado
- [ ] Multi-idioma

### ¿Cómo puedo contribuir?

1. **Reportar bugs**: GitHub Issues
2. **Sugerir features**: Discussions
3. **Código**: Pull Requests
4. **Documentación**: Mejorar docs
5. **Traducciones**: Agregar idiomas

---

## 📞 Soporte

### ¿Dónde obtengo ayuda?

1. **Documentación**: README.md, QUICKSTART.md, HASH_CHAIN.md
2. **GitHub Issues**: Para bugs y features
3. **Discussions**: Para preguntas generales
4. **Email**: soporte@gemelli.edu.co

### ¿Ofrecen soporte comercial?

Actualmente es un proyecto open-source. Para soporte comercial, contáctanos en: comercial@gemelli.edu.co

---

## ✅ Checklist Pre-Producción

Antes de lanzar en producción:

**Seguridad:**
- [ ] Cambiar todas las claves y secrets
- [ ] Habilitar 2FA en Supabase
- [ ] Configurar rate limiting
- [ ] Revisar políticas RLS
- [ ] Configurar CSP headers

**Performance:**
- [ ] Optimizar imágenes
- [ ] Habilitar caching
- [ ] Configurar CDN
- [ ] Probar con carga esperada

**Datos:**
- [ ] Backup automático configurado
- [ ] Plan de recovery documentado
- [ ] Datos de producción listos
- [ ] Migrations ejecutadas

**Monitoreo:**
- [ ] Logs configurados
- [ ] Alertas configuradas
- [ ] Analytics habilitado
- [ ] Health checks activos

**Documentación:**
- [ ] Manual de usuario
- [ ] Guía de administración
- [ ] Procedimientos de soporte
- [ ] Contactos de emergencia

---

## 🎓 Recursos de Aprendizaje

### Para Desarrolladores

- **FastAPI**: https://fastapi.tiangolo.com/tutorial/
- **Astro**: https://docs.astro.build/en/tutorial/0-introduction/
- **Supabase**: https://supabase.com/docs/guides/getting-started
- **React**: https://react.dev/learn

### Para Administradores

- **PostgreSQL**: https://www.postgresql.org/docs/
- **OpenAI API**: https://platform.openai.com/docs

### Cursos Recomendados

- Full Stack con FastAPI (Udemy)
- React + TypeScript (Frontend Masters)
- PostgreSQL para Administradores (Pluralsight)

---

**¿No encuentras tu pregunta?**

Crea un issue en GitHub: https://github.com/tu-org/gemelli-it/issues

---

*Última actualización: Octubre 2025*
