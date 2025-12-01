# 🔎 Apartado de Pruebas para Inventario

Este checklist sirve para diagnosticar errores como "El backend no respondió correctamente" al usar el inventario, tanto en local como en Netlify Functions.

## 1) Preparación rápida
- Revisa que las variables de Supabase y JWT estén cargadas (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `JWT_SECRET`).
- Si usas Netlify, confirma que las funciones señalan a `apps/api/netlify-functions` según `netlify.toml`.
- Ten a mano un token de sesión válido de Supabase (el frontend lo guarda como `access_token` en `localStorage` tras iniciar sesión).

## 2) Salud del backend
- **Local**: `curl -i http://localhost:8000/health`
- **Netlify**: `curl -i https://<tu-sitio>.netlify.app/.netlify/functions/main/health`

Debe responder `200` con `{"status":"healthy"...}`. Si Netlify devuelve HTML o 404, la función no está desplegada correctamente.

## 3) Inventario: pruebas mínimas
Usa un `ACCESS_TOKEN` real (de Supabase) para cada request.

```bash
# 3.1 Listar inventario
API="http://localhost:8000"  # o https://<tu-sitio>.netlify.app/.netlify/functions/main
curl -i "$API/inventory/devices" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 3.2 Consultar un equipo puntual
DEVICE_ID="<uuid-existente>"
curl -i "$API/inventory/devices/$DEVICE_ID/cv" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 3.3 Crear/actualizar (solo roles TI/LIDER_TI)
curl -i -X POST "$API/inventory/devices" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"nombre":"Laptop QA","tipo":"LAPTOP","estado":"ACTIVO","ubicacion":"Pruebas"}'
```

Si obtienes HTML o un error genérico, revisa que el `API` apunte al backend correcto y que el token no esté expirado.

## 4) ¿Por qué aparece el mensaje del frontend?
El frontend muestra _"El backend no respondió correctamente. Verifica que las funciones serverless estén desplegadas."_ cuando el fetch recibe HTML (Netlify sirviendo estáticos) en lugar de JSON. Esto suele indicar:

- La ruta `/\.netlify/functions/main` no existe o respondió un 30x/50x.
- `PUBLIC_API_URL` apunta al dominio del frontend pero sin la ruta de función.
- El backend local en `localhost:8000` no está corriendo.

## 5) Flujo sugerido de depuración
1. Ejecuta el paso de salud (2) en el entorno afectado.
2. Si falla, verifica variables y logs de Netlify Functions.
3. Repite las pruebas de inventario (3) con un token válido.
4. Si aún falla, revisa las reglas RLS en Supabase (`infra/supabase.sql`) y los permisos de inventario (`/inventory/permissions`).

Con este apartado deberías identificar rápidamente si el problema está en despliegue, autenticación o base de datos.
