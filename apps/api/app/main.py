# apps/api/app/main.py
from fastapi import FastAPI, Depends, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime
import os
import hashlib
import json
import hmac
import unicodedata
import re
try:
    from mangum import Mangum  # type: ignore
except ImportError:  # pragma: no cover - optional dependency for serverless
    Mangum = None  # type: ignore[assignment]
    
# Configuración
SUPABASE_URL_ENV_KEYS = (
    "SUPABASE_URL",
    "PUBLIC_SUPABASE_URL",
)
SUPABASE_KEY_ENV_KEYS = (
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE",
    "SUPABASE_SERVICE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_KEY",
    "SUPABASE_ANON_KEY",
    "PUBLIC_SUPABASE_ANON_KEY",
)
JWT_SECRET = os.getenv("JWT_SECRET")
AUDIT_SECRET = os.getenv("AUDIT_SECRET", "change-this-secret-key-in-production")

EMAIL_REGEX = re.compile(r"^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$", re.IGNORECASE)
ALLOWED_ROLES = {"DOCENTE", "ADMINISTRATIVO", "TI", "DIRECTOR", "LIDER_TI"}

class LazySupabaseClient:
    """Inicializa el cliente de Supabase únicamente cuando se necesita."""

    def __init__(self) -> None:
        self._client: Optional[Client] = None
        self._config: Optional[tuple[str, str]] = None

    @staticmethod
    def _resolve_supabase_config() -> Optional[tuple[str, str]]:
        def first_present(keys: tuple[str, ...]) -> Optional[str]:
            for key in keys:
                value = os.getenv(key)
                if value:
                    return value
            return None

        url = first_present(SUPABASE_URL_ENV_KEYS)
        key = first_present(SUPABASE_KEY_ENV_KEYS)

        if not url or not key:
            return None

        return url, key

    def _get_client(self) -> Client:
        config = self._resolve_supabase_config()

        if config is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase no está configurado correctamente",
            )

        if self._client is None or self._config != config:
            url, key = config
            self._client = create_client(url, key)
            self._config = config

        return self._client

    def __getattr__(self, item):  # type: ignore[override]
        return getattr(self._get_client(), item)        


supabase = LazySupabaseClient()


def handle_supabase_error(response, default_message: str) -> None:
    """Valida la respuesta de Supabase y arroja HTTPException con mensajes claros."""

    error = getattr(response, "error", None)
    if error:
        # El objeto error puede ser un dict del cliente de Supabase o un string.
        message = getattr(error, "message", None) or (
            error.get("message") if isinstance(error, dict) else str(error)
        )
        raise HTTPException(status_code=400, detail=message or default_message)

    data = getattr(response, "data", None)
    if data in (None, []):
        raise HTTPException(status_code=502, detail=default_message)
        
app = FastAPI(
    title="Gemelli IT API",
    description="API para gestión de inventario y HelpDesk",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4321", "https://*.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# ==================== MODELS ====================

class UserProfile(BaseModel):
    id: str
    nombre: str
    email: str
    rol: Literal["DOCENTE", "ADMINISTRATIVO", "TI", "DIRECTOR", "LIDER_TI"]
    org_unit_id: Optional[str] = None
    org_unit_nombre: Optional[str] = None

class PeripheralInfo(BaseModel):
    nombre: Optional[str] = None
    serial: Optional[str] = None


class DeviceSpecsInput(BaseModel):
    procesador: Optional[str] = None
    procesador_velocidad: Optional[str] = None
    memoria_tipo: Optional[str] = None
    memoria_capacidad: Optional[str] = None
    disco_tipo: Optional[str] = None
    disco_capacidad: Optional[str] = None
    teclado: Optional[PeripheralInfo] = None
    mouse: Optional[PeripheralInfo] = None


class DeviceCreate(BaseModel):
    nombre: str
    tipo: Literal["PC", "LAPTOP", "IMPRESORA", "RED", "OTRO"]
    estado: Literal["ACTIVO", "REPARACIÓN", "RETIRADO"]
    usuario_actual_id: Optional[str] = None
    ubicacion: str
    imagen: Optional[str] = None
    notas: Optional[str] = None
    serial: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    specs: Optional[DeviceSpecsInput] = None

class DeviceUpdate(BaseModel):
    nombre: Optional[str] = None
    estado: Optional[Literal["ACTIVO", "REPARACIÓN", "RETIRADO"]] = None
    usuario_actual_id: Optional[str] = None
    ubicacion: Optional[str] = None
    notas: Optional[str] = None
    imagen: Optional[str] = None
    serial: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None

class DeviceSpecs(BaseModel):
    device_id: str
    cpu: Optional[str] = None
    cpu_velocidad: Optional[str] = None
    ram: Optional[str] = None
    ram_capacidad: Optional[str] = None
    disco: Optional[str] = None
    disco_capacidad: Optional[str] = None
    os: Optional[str] = None
    licencias: Optional[dict] = None
    red: Optional[dict] = None
    perifericos: Optional[dict] = None
    otros: Optional[dict] = None

class DeviceLog(BaseModel):
    device_id: str
    tipo: Literal["ASIGNACION", "MANTENIMIENTO", "REPARACION", "BACKUP", "OTRO"]
    descripcion: str
    realizado_por: str

class BackupCreate(BaseModel):
    device_id: str
    tipo: Literal["INCREMENTAL", "COMPLETA", "DIFERENCIAL"]
    almacenamiento: Literal["NUBE", "LOCAL", "HIBRIDO"]
    frecuencia: str
    evidencia_url: Optional[str] = None
    notas: Optional[str] = None

class TicketCreate(BaseModel):
    titulo: str
    descripcion: str
    prioridad: Literal["BAJA", "MEDIA", "ALTA", "CRITICA"]
    device_id: Optional[str] = None

class TicketUpdate(BaseModel):
    estado: Optional[Literal["ABIERTO", "EN_PROCESO", "RESUELTO", "CERRADO"]] = None
    prioridad: Optional[Literal["BAJA", "MEDIA", "ALTA", "CRITICA"]] = None
    asignado_a: Optional[str] = None

class TicketComment(BaseModel):
    ticket_id: str
    comentario: str
    adjunto_url: Optional[str] = None


class InventoryPermissionCreate(BaseModel):
    email: str = Field(..., max_length=255)
    notes: Optional[str] = Field(default=None, max_length=500)


class InventoryPermissionResponse(BaseModel):
    id: str
    email: str
    notes: Optional[str]
    granted_at: Optional[datetime]
    granted_by: Optional[str]

    
class AdminUserBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150)
    email: str = Field(..., max_length=255)
    rol: Literal["DOCENTE", "ADMINISTRATIVO", "TI", "DIRECTOR", "LIDER_TI"]
    org_unit_id: Optional[str] = None
    activo: bool = True

    @field_validator("nombre")
    @classmethod
    def validate_nombre(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres")
        return cleaned

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        if not normalized or not EMAIL_REGEX.match(normalized):
            raise ValueError("Correo electrónico inválido")
        return normalized


class AdminUserCreate(AdminUserBase):
    password: str = Field(..., min_length=8, max_length=128)


class AdminUserUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=150)
    rol: Optional[Literal["DOCENTE", "ADMINISTRATIVO", "TI", "DIRECTOR", "LIDER_TI"]] = None
    org_unit_id: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)

    @field_validator("nombre")
    @classmethod
    def validate_optional_nombre(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres")
        return cleaned
# ==================== AUDIT HASH SYSTEM ====================

def generate_audit_hash(action: str, entity_id: str, user_id: str, data: dict = None) -> dict:
    """
    Genera un hash de auditoría criptográfico para transacciones importantes.
    Este sistema reemplaza blockchain con una cadena de hash verificable.
    """
    timestamp = datetime.utcnow().isoformat()
    
    # Construir payload de la transacción
    payload = {
        "action": action,
        "entity_id": entity_id,
        "user_id": user_id,
        "timestamp": timestamp,
        "data": data or {}
    }
    
    # Generar hash SHA256 del payload
    payload_str = json.dumps(payload, sort_keys=True)
    content_hash = hashlib.sha256(payload_str.encode()).hexdigest()
    
    # Obtener hash del registro anterior (crear cadena)
    previous_record = supabase.table("audit_chain").select("hash").order(
        "created_at", desc=True
    ).limit(1).execute()
    
    previous_hash = previous_record.data[0]["hash"] if previous_record.data else "0" * 64
    
    # Generar hash de la cadena (previous_hash + content_hash)
    chain_data = f"{previous_hash}:{content_hash}"
    chain_hash = hashlib.sha256(chain_data.encode()).hexdigest()
    
    # Generar firma HMAC para verificación de integridad
    signature = hmac.new(
        AUDIT_SECRET.encode(),
        chain_hash.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Calcular número de bloque secuencial
    count_result = supabase.table("audit_chain").select("id", count="exact").execute()
    block_number = (count_result.count or 0) + 1
    
    return {
        "hash": chain_hash,
        "content_hash": content_hash,
        "previous_hash": previous_hash,
        "signature": signature,
        "block_number": block_number,
        "payload": payload
    }

def verify_audit_chain() -> dict:
    """
    Verifica la integridad de toda la cadena de auditoría.
    Retorna si la cadena es válida y cualquier hash corrupto.
    """
    records = supabase.table("audit_chain").select("*").order("block_number").execute()
    
    if not records.data:
        return {"valid": True, "message": "Cadena vacía"}
    
    corrupted = []
    previous_hash = "0" * 64
    
    for record in records.data:
        # Reconstruir hash esperado
        payload = {
            "action": record["action"],
            "entity_id": record["entity_id"],
            "user_id": record["user_id"],
            "timestamp": record["timestamp"],
            "data": record.get("metadata", {})
        }
        
        payload_str = json.dumps(payload, sort_keys=True)
        content_hash = hashlib.sha256(payload_str.encode()).hexdigest()
        
        chain_data = f"{previous_hash}:{content_hash}"
        expected_hash = hashlib.sha256(chain_data.encode()).hexdigest()
        
        # Verificar firma HMAC
        expected_signature = hmac.new(
            AUDIT_SECRET.encode(),
            expected_hash.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if record["hash"] != expected_hash or record["signature"] != expected_signature:
            corrupted.append({
                "block_number": record["block_number"],
                "hash": record["hash"],
                "expected_hash": expected_hash
            })
        
        previous_hash = record["hash"]
    
    return {
        "valid": len(corrupted) == 0,
        "total_blocks": len(records.data),
        "corrupted_blocks": corrupted
    }

async def register_audit_event(action: str, entity_id: str, user_id: str, metadata: dict = None):
    """Registra un evento en la cadena de auditoría"""
    audit_data = generate_audit_hash(action, entity_id, user_id, metadata)
    
    # Guardar en base de datos
    supabase.table("audit_chain").insert({
        "hash": audit_data["hash"],
        "content_hash": audit_data["content_hash"],
        "previous_hash": audit_data["previous_hash"],
        "signature": audit_data["signature"],
        "action": action,
        "entity_id": entity_id,
        "user_id": user_id,
        "timestamp": audit_data["payload"]["timestamp"],
        "block_number": audit_data["block_number"],
        "metadata": metadata or {}
    }).execute()
    
    return audit_data

# ==================== AUTH ====================

def normalize_role_value(role: Optional[str]) -> Optional[str]:
    """Normaliza un valor de rol proveniente de Supabase."""
    if role is None:
        return None

    # Remover acentos y normalizar caracteres
    normalized = unicodedata.normalize("NFKD", str(role))
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))

    # Limpiar espacios, guiones y mayúsculas
    normalized = normalized.strip().upper()
    normalized = normalized.replace("-", "_").replace(" ", "_")

    # Colapsar múltiples guiones bajos consecutivos
    normalized = re.sub(r"_+", "_", normalized)

    return normalized or None


def ensure_allowed_role(raw_role: Optional[str]) -> str:
    normalized_role = normalize_role_value(raw_role)
    if normalized_role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Rol en Supabase inválido: {raw_role}",
        )
    return normalized_role


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserProfile:
    """Obtener usuario autenticado desde JWT"""
    try:
        token = credentials.credentials
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Usuario no autenticado")
        
        # Obtener datos completos del usuario
        user_data = supabase.table("users").select(
            "id, nombre, email, rol, org_unit_id, org_units(nombre)"
        ).eq("id", user_response.user.id).single().execute()
        
        data = user_data.data or {}

        raw_role = data.get("rol")
        normalized_role = ensure_allowed_role(raw_role)

        org_unit_info = data.get("org_units") or {}
        org_unit_nombre: Optional[str] = None

        if isinstance(org_unit_info, dict):
            org_unit_nombre = org_unit_info.get("nombre")
            
        return UserProfile(
            id=data["id"],
            nombre=data["nombre"],
            email=data["email"],
            rol=normalized_role,
            org_unit_id=data.get("org_unit_id"),
            org_unit_nombre=org_unit_nombre,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Error de autenticación: {str(e)}")

def require_role(allowed_roles: List[str], allowed_emails: Optional[List[str]] = None):
    """Decorator para verificar roles"""

    normalized_allowed_emails = {
        email.strip().lower()
        for email in (allowed_emails or [])
        if isinstance(email, str) and email.strip()
    }
    
    def role_checker(user: UserProfile = Depends(get_current_user)):
        if user.rol == "LIDER_TI":
            return user
        user_email = (user.email or "").strip().lower()
        if user_email and user_email in normalized_allowed_emails:
            return user
        if user.rol not in allowed_roles:
            raise HTTPException(status_code=403, detail="Permisos insuficientes")
        return user
        
    return role_checker


def normalize_email_value(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = value.strip().lower()
    return normalized or None


def serialize_user_record(record: Dict[str, Any]) -> Dict[str, Any]:
    org_unit_data = record.get("org_units") or {}
    normalized_role = normalize_role_value(record.get("rol"))
    return {
        "id": record.get("id"),
        "nombre": record.get("nombre"),
        "email": record.get("email"),
        "rol": normalized_role if normalized_role else record.get("rol"),
        "activo": record.get("activo"),
        "org_unit_id": record.get("org_unit_id"),
        "org_unit_nombre": org_unit_data.get("nombre"),
    }


def fetch_user_profile_by_id(user_id: str) -> Dict[str, Any]:
    try:
        response = (
            supabase.table("users")
            .select("id, nombre, email, rol, activo, org_unit_id, org_units(nombre)")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"No se pudo obtener el usuario: {exc}")

    if not response.data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return serialize_user_record(response.data[0])


def get_inventory_permission_by_email(email: Optional[str]) -> Optional[dict]:
    normalized = normalize_email_value(email)
    if not normalized:
        return None

    try:
        response = (
            supabase.table("inventory_access_grants")
            .select("id, email, notes, granted_at, granted_by")
            .eq("email", normalized)
            .limit(1)
            .execute()
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"No se pudo verificar permisos delegados: {exc}")

    if response.data:
        return response.data[0]
    return None


def inventory_override_exists(email: Optional[str]) -> bool:
    return get_inventory_permission_by_email(email) is not None


def require_global_admin():
    async def dependency(user: UserProfile = Depends(get_current_user)):
        if user.rol != "LIDER_TI":
            raise HTTPException(status_code=403, detail="Permisos insuficientes")
        return user

    return dependency


def require_inventory_manager():
    async def dependency(user: UserProfile = Depends(get_current_user)):
        if user.rol in ("TI", "LIDER_TI"):
            return user

        if inventory_override_exists(user.email):
            return user

        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    return dependency

# ==================== ROUTES ====================

@app.get("/")
async def root():
    return {
        "app": "Gemelli IT API",
        "version": "1.0.0",
        "status": "running",
        "audit_system": "Hash Chain"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# --- AUTH ---

@app.get("/auth/profile", response_model=UserProfile)
async def get_profile(user: UserProfile = Depends(get_current_user)):
    """Obtener perfil del usuario autenticado"""
    return user

# --- ADMIN ---

@app.get("/admin/users")
async def admin_list_users(user: UserProfile = Depends(require_global_admin())):
    try:
        response = (
            supabase.table("users")
            .select("id, nombre, email, rol, activo, org_unit_id, org_units(nombre)")
            .order("nombre")
            .execute()
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"No se pudieron obtener los usuarios: {exc}")

    records = [serialize_user_record(item) for item in (response.data or [])]
    return {"data": records, "count": len(records)}


@app.post("/admin/users", status_code=201)
async def admin_create_user(payload: AdminUserCreate, user: UserProfile = Depends(require_global_admin())):
    normalized_email = normalize_email_value(payload.email)
    if not normalized_email or not EMAIL_REGEX.match(normalized_email):
        raise HTTPException(status_code=422, detail="Correo electrónico inválido")

    normalized_role = ensure_allowed_role(payload.rol)

    try:
        existing = (
            supabase.table("users")
            .select("id")
            .eq("email", normalized_email)
            .limit(1)
            .execute()
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"No se pudo verificar usuarios existentes: {exc}")

    if existing.data:
        raise HTTPException(status_code=409, detail="El correo electrónico ya está registrado")

    try:
        auth_response = supabase.auth.admin.create_user({
            "email": normalized_email,
            "password": payload.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": payload.nombre,
                "role": normalized_role,
                "org_unit_id": payload.org_unit_id,
                "active": payload.activo,
            },
        })
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"No se pudo crear el usuario en Supabase: {exc}")

    new_user = getattr(auth_response, "user", None)
    if new_user is None:
        raise HTTPException(status_code=400, detail="Supabase no devolvió el usuario creado")

    profile_payload = {
        "id": new_user.id,
        "nombre": payload.nombre,
        "email": normalized_email,
        "rol": normalized_role,
        "org_unit_id": payload.org_unit_id,
        "activo": payload.activo,
    }

    try:
        supabase.table("users").insert(profile_payload).execute()
    except HTTPException:
        raise
    except Exception as exc:
        try:
            supabase.auth.admin.delete_user(new_user.id)
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=f"No se pudo guardar el perfil del usuario: {exc}")

    await register_audit_event(
        "CREATE_USER",
        new_user.id,
        user.id,
        {
            "email": normalized_email,
            "rol": normalized_role,
            "org_unit_id": payload.org_unit_id,
            "activo": payload.activo,
        },
    )

    return {"data": fetch_user_profile_by_id(new_user.id)}


@app.patch("/admin/users/{user_id}")
async def admin_update_user(
    user_id: str,
    payload: AdminUserUpdate,
    user: UserProfile = Depends(require_global_admin()),
):
    updates: Dict[str, Any] = {}
    metadata_updates: Dict[str, Any] = {}
    audit_metadata: Dict[str, Any] = {}

    if payload.nombre is not None:
        updates["nombre"] = payload.nombre
        metadata_updates["full_name"] = payload.nombre
        audit_metadata["nombre"] = payload.nombre

    if payload.rol is not None:
        normalized_role = ensure_allowed_role(payload.rol)
        updates["rol"] = normalized_role
        metadata_updates["role"] = normalized_role
        audit_metadata["rol"] = normalized_role

    if payload.org_unit_id is not None:
        updates["org_unit_id"] = payload.org_unit_id
        metadata_updates["org_unit_id"] = payload.org_unit_id
        audit_metadata["org_unit_id"] = payload.org_unit_id

    if payload.activo is not None:
        updates["activo"] = payload.activo
        metadata_updates["active"] = payload.activo
        audit_metadata["activo"] = payload.activo

    if payload.password:
        audit_metadata["password_reset"] = True

    if not updates and not payload.password:
        raise HTTPException(status_code=400, detail="No se proporcionaron cambios para actualizar")

    try:
        if updates:
            response = (
                supabase.table("users")
                .update(updates)
                .eq("id", user_id)
                .execute()
            )

            if not response.data:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")

        if metadata_updates or payload.password:
            update_payload: Dict[str, Any] = {}
            if metadata_updates:
                update_payload["user_metadata"] = metadata_updates
            if payload.password:
                update_payload["password"] = payload.password
            supabase.auth.admin.update_user_by_id(user_id, update_payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"No se pudo actualizar el usuario: {exc}")

    if audit_metadata:
        await register_audit_event("UPDATE_USER", user_id, user.id, audit_metadata)

    return {"data": fetch_user_profile_by_id(user_id)}


@app.get("/admin/org-units")
async def admin_list_org_units(user: UserProfile = Depends(require_global_admin())):
    try:
        response = (
            supabase.table("org_units")
            .select("id, nombre")
            .order("nombre")
            .execute()
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"No se pudieron obtener las unidades organizacionales: {exc}",
        )

    data = response.data or []
    return {"data": data, "count": len(data)}

# --- INVENTORY ---

@app.get("/inventory/devices")
async def list_devices(
    estado: Optional[str] = None,
    tipo: Optional[str] = None,
    user: UserProfile = Depends(get_current_user)
):
    """Listar dispositivos (filtrados por org_unit del usuario)"""
    query = supabase.table("devices").select(
        "*, usuario_actual:users!usuario_actual_id(nombre, email)"
    )

    if user.rol != "LIDER_TI":
        query = query.eq("org_unit_id", user.org_unit_id)
    
    if estado:
        query = query.eq("estado", estado)
    if tipo:
        query = query.eq("tipo", tipo)
    
    response = query.execute()
    return {"data": response.data, "count": len(response.data)}

@app.post("/inventory/devices", status_code=201)
async def create_device(
    device: DeviceCreate,
    user: UserProfile = Depends(require_inventory_manager()),
):
    """Crear nuevo dispositivo (personal TI o Líder TI autorizado)"""
    device_data = device.model_dump()
    specs_data = device_data.pop("specs", None)
    device_data = {k: v for k, v in device_data.items() if v is not None}
    device_data["org_unit_id"] = user.org_unit_id
    device_data["creado_por"] = user.id
    device_data["fecha_ingreso"] = datetime.utcnow().date().isoformat()
    
    response = supabase.table("devices").insert(device_data).execute()
    handle_supabase_error(response, "No se pudo crear el dispositivo en Supabase")

    device_record = response.data[0]
    device_id = device_record["id"]

    if specs_data:
        specs_payload = {
            "device_id": device_id,
            "cpu": specs_data.get("procesador"),
            "cpu_velocidad": specs_data.get("procesador_velocidad"),
            "ram": specs_data.get("memoria_tipo"),
            "ram_capacidad": specs_data.get("memoria_capacidad"),
            "disco": specs_data.get("disco_tipo"),
            "disco_capacidad": specs_data.get("disco_capacidad"),
        }

        perifericos: dict[str, dict[str, Optional[str]]] = {}

        for perif_name in ("teclado", "mouse"):
            perif_data = specs_data.get(perif_name) or {}
            if isinstance(perif_data, dict):
                perif_clean = {k: v for k, v in perif_data.items() if v not in (None, "")}
                if perif_clean:
                    perifericos[perif_name] = perif_clean

        if perifericos:
            specs_payload["perifericos"] = perifericos

        specs_payload = {
            key: value for key, value in specs_payload.items() if value not in (None, "", {})
        }

        if len(specs_payload.keys()) > 1:
            specs_response = supabase.table("device_specs").insert(specs_payload).execute()
            handle_supabase_error(specs_response, "No se pudieron guardar las especificaciones del dispositivo")
            
    # Log de creación
    log_response = supabase.table("device_logs").insert({
        "device_id": device_id,
        "tipo": "OTRO",
        "descripcion": f"Dispositivo creado por {user.nombre}",
        "realizado_por": user.id,
    }).execute()
    handle_supabase_error(log_response, "No se pudo registrar el log del dispositivo")

    # Registrar en auditoría
    await register_audit_event(
        "CREATE_DEVICE",
        device_id,
        user.id,
        {"device_name": device.nombre, "type": device.tipo},
    )

    return {"data": device_record, "message": "Dispositivo creado exitosamente"}

@app.get("/inventory/devices/{device_id}/cv")
async def get_device_cv(
    device_id: str,
    user: UserProfile = Depends(get_current_user)
):
    """Obtener hoja de vida completa del dispositivo"""
    # Verificar acceso
    device_query = supabase.table("devices").select("*").eq("id", device_id)

    if user.rol != "LIDER_TI":
        device_query = device_query.eq("org_unit_id", user.org_unit_id)

    device = device_query.single().execute()
    
    if not device.data:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Obtener especificaciones
    specs = supabase.table("device_specs").select("*").eq("device_id", device_id).execute()
    
    # Obtener historial
    logs = supabase.table("device_logs").select(
        "*, usuario:users!realizado_por(nombre)"
    ).eq("device_id", device_id).order("fecha", desc=True).execute()
    
    # Obtener backups
    backups = supabase.table("backups").select("*").eq("device_id", device_id).order(
        "fecha_backup", desc=True
    ).execute()
    
    # Obtener auditoría
    audit = supabase.table("audit_chain").select("*").eq("entity_id", device_id).execute()
    
    return {
        "device": device.data,
        "specs": specs.data[0] if specs.data else None,
        "logs": logs.data,
        "backups": backups.data,
        "audit": audit.data
    }

@app.put("/inventory/devices/{device_id}")
async def update_device(
    device_id: str,
    updates: DeviceUpdate,
    user: UserProfile = Depends(require_inventory_manager()),
):
    """Actualizar dispositivo"""
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_data["actualizado_en"] = datetime.utcnow().isoformat()
    
    update_query = supabase.table("devices").update(update_data).eq("id", device_id)

    if user.rol != "LIDER_TI":
        update_query = update_query.eq("org_unit_id", user.org_unit_id)

    response = update_query.execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Log de actualización
    supabase.table("device_logs").insert({
        "device_id": device_id,
        "tipo": "OTRO",
        "descripcion": f"Dispositivo actualizado por {user.nombre}",
        "realizado_por": user.id
    }).execute()
    
    # Registrar en auditoría
    await register_audit_event(
        "UPDATE_DEVICE",
        device_id,
        user.id,
        {"changes": update_data}
    )
    
    return {"data": response.data[0], "message": "Dispositivo actualizado"}

# --- INVENTORY PERMISSIONS ---

@app.get("/inventory/permissions/check")
async def check_inventory_permission(user: UserProfile = Depends(get_current_user)):
    if user.rol in ("TI", "LIDER_TI"):
        return {"can_manage": True, "source": "role"}

    override = get_inventory_permission_by_email(user.email)
    if override:
        return {"can_manage": True, "source": "override", "permission": override}

    return {"can_manage": False, "source": "none"}


@app.get("/inventory/permissions", response_model=dict)
async def list_inventory_permissions(
    user: UserProfile = Depends(require_role(["LIDER_TI"]))
):
    response = (
        supabase.table("inventory_access_grants")
        .select("id, email, notes, granted_at, granted_by, granted_by_user:users!granted_by(nombre, email)")
        .order("email", desc=False)
        .execute()
    )
    return {"data": response.data, "count": len(response.data)}


@app.post("/inventory/permissions", status_code=201)
async def create_inventory_permission(
    permission: InventoryPermissionCreate,
    user: UserProfile = Depends(require_role(["LIDER_TI"]))
):
    normalized_email = normalize_email_value(permission.email)

    if not normalized_email or not EMAIL_REGEX.match(normalized_email):
        raise HTTPException(status_code=422, detail="Correo electrónico inválido")

    if inventory_override_exists(normalized_email):
        raise HTTPException(status_code=409, detail="El correo ya tiene permisos especiales")

    payload = {
        "email": normalized_email,
        "notes": permission.notes,
        "granted_by": user.id,
        "granted_at": datetime.utcnow().isoformat(),
    }

    response = supabase.table("inventory_access_grants").insert(payload).execute()

    created = response.data[0]

    await register_audit_event(
        "GRANT_INVENTORY_ACCESS",
        created["id"],
        user.id,
        {"email": normalized_email}
    )

    return {"data": created, "message": "Permiso concedido"}


@app.delete("/inventory/permissions/{permission_id}", status_code=204)
async def delete_inventory_permission(
    permission_id: str,
    user: UserProfile = Depends(require_role(["LIDER_TI"]))
):
    existing = (
        supabase.table("inventory_access_grants")
        .select("id, email")
        .eq("id", permission_id)
        .limit(1)
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")

    supabase.table("inventory_access_grants").delete().eq("id", permission_id).execute()

    await register_audit_event(
        "REVOKE_INVENTORY_ACCESS",
        permission_id,
        user.id,
        {"email": existing.data[0]["email"]}
    )

    return Response(status_code=204)
    
# --- BACKUPS ---

@app.get("/backups")
async def list_backups(
    device_id: Optional[str] = None,
    user: UserProfile = Depends(get_current_user)
):
    """Listar backups"""
    query = supabase.table("backups").select(
        "*, device:devices!device_id(nombre, tipo)"
    )
    
    if device_id:
        query = query.eq("device_id", device_id)
    
    response = query.order("fecha_backup", desc=True).execute()
    return {"data": response.data}

@app.post("/backups", status_code=201)
async def create_backup(
    backup: BackupCreate,
    user: UserProfile = Depends(require_role(["TI", "LIDER_TI"]))
):
    """Registrar backup"""
    backup_data = backup.model_dump()
    backup_data["realizado_por"] = user.id
    backup_data["fecha_backup"] = datetime.utcnow().isoformat()
    
    response = supabase.table("backups").insert(backup_data).execute()
    
    # Log en device
    supabase.table("device_logs").insert({
        "device_id": backup.device_id,
        "tipo": "BACKUP",
        "descripcion": f"Backup {backup.tipo} realizado",
        "realizado_por": user.id
    }).execute()
    
    # Auditoría
    await register_audit_event(
        "BACKUP",
        backup.device_id,
        user.id,
        {"backup_type": backup.tipo, "storage": backup.almacenamiento}
    )
    
    return {"data": response.data[0], "message": "Backup registrado"}

# --- TICKETS ---

@app.get("/tickets")
async def list_tickets(
    estado: Optional[str] = None,
    user: UserProfile = Depends(get_current_user)
):
    """Listar tickets"""
    if user.rol == "LIDER_TI":
        query = supabase.table("tickets").select(
            "*, solicitante:users!solicitante_id(nombre, email), asignado:users!asignado_a(nombre)"
        )
    elif user.rol in ["TI", "DIRECTOR"]:
        query = supabase.table("tickets").select(
            "*, solicitante:users!solicitante_id(nombre, email), asignado:users!asignado_a(nombre)"
        ).eq("org_unit_id", user.org_unit_id)
    else:
        query = supabase.table("tickets").select("*").eq("solicitante_id", user.id)
    
    if estado:
        query = query.eq("estado", estado)
    
    response = query.order("fecha_creacion", desc=True).execute()
    return {"data": response.data}

@app.post("/tickets", status_code=201)
async def create_ticket(
    ticket: TicketCreate,
    user: UserProfile = Depends(get_current_user)
):
    """Crear ticket"""
    ticket_data = ticket.model_dump()
    ticket_data["solicitante_id"] = user.id
    ticket_data["org_unit_id"] = user.org_unit_id
    ticket_data["estado"] = "ABIERTO"
    ticket_data["fecha_creacion"] = datetime.utcnow().isoformat()
    
    response = supabase.table("tickets").insert(ticket_data).execute()
    
    return {"data": response.data[0], "message": "Ticket creado exitosamente"}

@app.get("/tickets/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    user: UserProfile = Depends(get_current_user)
):
    """Obtener detalle de ticket con comentarios"""
    ticket = supabase.table("tickets").select(
        "*, solicitante:users!solicitante_id(nombre, email), asignado:users!asignado_a(nombre), device:devices(nombre, tipo)"
    ).eq("id", ticket_id).single().execute()
    
    if not ticket.data:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    
    # Verificar acceso
    if user.rol not in ["TI", "LIDER_TI", "DIRECTOR"]:
        if ticket.data["solicitante_id"] != user.id:
            raise HTTPException(status_code=403, detail="Acceso denegado")
    
    # Comentarios
    comments = supabase.table("ticket_comments").select(
        "*, usuario:users!usuario_id(nombre)"
    ).eq("ticket_id", ticket_id).order("fecha", desc=False).execute()
    
    return {
        "ticket": ticket.data,
        "comments": comments.data
    }

@app.put("/tickets/{ticket_id}")
async def update_ticket(
    ticket_id: str,
    updates: TicketUpdate,
    user: UserProfile = Depends(require_role(["TI", "LIDER_TI"]))
):
    """Actualizar ticket (solo TI)"""
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    response = supabase.table("tickets").update(update_data).eq("id", ticket_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    
    # Si se cierra, registrar en auditoría
    if updates.estado in ["RESUELTO", "CERRADO"]:
        await register_audit_event(
            "CLOSE_TICKET",
            ticket_id,
            user.id,
            {"final_status": updates.estado}
        )
    
    return {"data": response.data[0], "message": "Ticket actualizado"}

@app.post("/tickets/{ticket_id}/comments")
async def add_comment(
    ticket_id: str,
    comment: TicketComment,
    user: UserProfile = Depends(get_current_user)
):
    """Agregar comentario a ticket"""
    comment_data = {
        "ticket_id": ticket_id,
        "usuario_id": user.id,
        "comentario": comment.comentario,
        "adjunto_url": comment.adjunto_url,
        "fecha": datetime.utcnow().isoformat()
    }
    
    response = supabase.table("ticket_comments").insert(comment_data).execute()
    
    return {"data": response.data[0], "message": "Comentario agregado"}

# --- DASHBOARD ---

@app.get("/dashboard/metrics")
async def get_metrics(user: UserProfile = Depends(get_current_user)):
    """Obtener métricas del dashboard"""
    # Dispositivos
    devices_query = supabase.table("devices").select("estado", count="exact")
    if user.rol != "LIDER_TI":
        devices_query = devices_query.eq("org_unit_id", user.org_unit_id)
    devices = devices_query.execute()
    
    # Tickets
    tickets_query = supabase.table("tickets").select("estado, prioridad", count="exact")
    if user.rol != "LIDER_TI":
        tickets_query = tickets_query.eq("org_unit_id", user.org_unit_id)
    tickets = tickets_query.execute()
    
    # Backups
    backups = supabase.table("backups").select("id", count="exact").execute()
    
    return {
        "dispositivos": {
            "total": devices.count,
            "activos": len([d for d in devices.data if d["estado"] == "ACTIVO"]),
            "reparacion": len([d for d in devices.data if d["estado"] == "REPARACIÓN"])
        },
        "tickets": {
            "total": tickets.count,
            "abiertos": len([t for t in tickets.data if t["estado"] == "ABIERTO"]),
            "en_proceso": len([t for t in tickets.data if t["estado"] == "EN_PROCESO"])
        },
        "backups": {
            "total": backups.count
        }
    }

# --- AUDIT CHAIN ---

@app.post("/audit/hash")
async def generate_hash(
    action: str,
    entity_id: str,
    metadata: Optional[dict] = None,
    user: UserProfile = Depends(require_role(["TI", "LIDER_TI"]))
):
    """Generar y registrar hash en cadena de auditoría"""
    audit_data = await register_audit_event(action, entity_id, user.id, metadata)
    return {
        "hash": audit_data["hash"],
        "signature": audit_data["signature"],
        "block_number": audit_data["block_number"],
        "message": "Evento registrado en cadena de auditoría"
    }

@app.get("/audit/verify/{hash}")
async def verify_hash(hash: str):
    """Verificar hash en cadena de auditoría"""
    response = supabase.table("audit_chain").select("*").eq("hash", hash).single().execute()
    
    if not response.data:
        return {"valid": False, "message": "Hash no encontrado"}
    
    # Verificar firma HMAC
    expected_signature = hmac.new(
        AUDIT_SECRET.encode(),
        hash.encode(),
        hashlib.sha256
    ).hexdigest()
    
    signature_valid = response.data["signature"] == expected_signature
    
    return {
        "valid": signature_valid,
        "data": response.data,
        "verified": signature_valid
    }

@app.get("/audit/chain/verify")
async def verify_chain(user: UserProfile = Depends(require_role(["TI", "LIDER_TI"]))):
    """Verificar integridad de toda la cadena de auditoría"""
    result = verify_audit_chain()
    return result

@app.get("/audit/entity/{entity_id}")
async def get_entity_audit(entity_id: str, user: UserProfile = Depends(get_current_user)):
    """Obtener historial de auditoría de una entidad"""
    response = supabase.table("audit_chain").select("*").eq("entity_id", entity_id).order(
        "block_number", desc=True
    ).execute()
    
    return {"data": response.data, "count": len(response.data)}

if Mangum:
    handler = Mangum(app)
else:  # pragma: no cover - exposes app for ASGI servers
    handler = app  # type: ignore[assignment]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
