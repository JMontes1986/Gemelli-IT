-- infra/supabase.sql
-- Schema para Gemelli IT - Inventario & HelpDesk

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== ENUMS ====================

CREATE TYPE user_role AS ENUM ('DOCENTE', 'ADMINISTRATIVO', 'TI', 'DIRECTOR', 'LIDER_TI');
CREATE TYPE device_type AS ENUM ('PC', 'LAPTOP', 'IMPRESORA', 'RED', 'OTRO');
CREATE TYPE device_status AS ENUM ('ACTIVO', 'REPARACIÓN', 'RETIRADO');
CREATE TYPE log_type AS ENUM ('ASIGNACION', 'MANTENIMIENTO', 'REPARACION', 'BACKUP', 'OTRO');
CREATE TYPE backup_type AS ENUM ('INCREMENTAL', 'COMPLETA', 'DIFERENCIAL');
CREATE TYPE storage_type AS ENUM ('NUBE', 'LOCAL', 'HIBRIDO');
CREATE TYPE ticket_priority AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');
CREATE TYPE ticket_status AS ENUM ('ABIERTO', 'EN_PROCESO', 'RESUELTO', 'CERRADO');

-- ==================== TABLES ====================

-- Unidades Organizacionales
CREATE TABLE org_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol user_role NOT NULL DEFAULT 'DOCENTE',
    org_unit_id UUID REFERENCES org_units(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE users
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Permisos delegados para inventario
CREATE TABLE inventory_access_grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    notes TEXT,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dispositivos
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    tipo device_type NOT NULL,
    estado device_status NOT NULL DEFAULT 'ACTIVO',
    org_unit_id UUID REFERENCES org_units(id) ON DELETE CASCADE,
    usuario_actual_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ubicacion VARCHAR(300),
    imagen TEXT,
    serial VARCHAR(200),
    marca VARCHAR(100),
    modelo VARCHAR(100),
    fecha_ingreso DATE DEFAULT CURRENT_DATE,
    fecha_garantia DATE,
    notas TEXT,
    creado_por UUID REFERENCES users(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Especificaciones de Dispositivos
CREATE TABLE device_specs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    cpu VARCHAR(200),
    cpu_velocidad VARCHAR(100),
    ram VARCHAR(100),
    ram_capacidad VARCHAR(100),
    disco VARCHAR(100),
    disco_capacidad VARCHAR(100),
    os VARCHAR(100),
    licencias JSONB,
    red JSONB,
    perifericos JSONB,
    otros JSONB,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id)
);

-- Logs de Dispositivos (Historial)
CREATE TABLE device_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    tipo log_type NOT NULL,
    descripcion TEXT NOT NULL,
    realizado_por UUID REFERENCES users(id) ON DELETE SET NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backups
CREATE TABLE backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    tipo backup_type NOT NULL,
    almacenamiento storage_type NOT NULL,
    frecuencia VARCHAR(100),
    proximo_backup DATE,
    fecha_backup TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exitoso BOOLEAN DEFAULT TRUE,
    tamanio_mb NUMERIC(10, 2),
    evidencia_url TEXT,
    notas TEXT,
    realizado_por UUID REFERENCES users(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets (HelpDesk)
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(300) NOT NULL,
    descripcion TEXT NOT NULL,
    prioridad ticket_priority NOT NULL DEFAULT 'MEDIA',
    estado ticket_status NOT NULL DEFAULT 'ABIERTO',
    org_unit_id UUID REFERENCES org_units(id) ON DELETE CASCADE,
    solicitante_id UUID REFERENCES users(id) ON DELETE SET NULL,
    asignado_a UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_asignacion TIMESTAMP WITH TIME ZONE,
    fecha_resolucion TIMESTAMP WITH TIME ZONE,
    fecha_cierre TIMESTAMP WITH TIME ZONE,
    tiempo_respuesta_minutos INTEGER,
    tiempo_resolucion_minutos INTEGER
);

-- Comentarios de Tickets
CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES users(id) ON DELETE SET NULL,
    comentario TEXT NOT NULL,
    adjunto_url TEXT,
    es_sistema BOOLEAN DEFAULT FALSE,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auditoría con Cadena de Hash (reemplazo de blockchain)
CREATE TABLE audit_chain (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hash VARCHAR(64) NOT NULL UNIQUE,
    content_hash VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    signature VARCHAR(64) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    block_number BIGINT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archivos Adjuntos
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(300) NOT NULL,
    tipo_mime VARCHAR(100),
    tamanio_bytes BIGINT,
    url TEXT NOT NULL,
    entidad_tipo VARCHAR(50),
    entidad_id UUID,
    subido_por UUID REFERENCES users(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== INDEXES ====================

CREATE INDEX idx_devices_org_unit ON devices(org_unit_id);
CREATE INDEX idx_devices_estado ON devices(estado);
CREATE INDEX idx_devices_usuario ON devices(usuario_actual_id);
CREATE INDEX idx_device_logs_device ON device_logs(device_id);
CREATE INDEX idx_device_logs_fecha ON device_logs(fecha DESC);
CREATE INDEX idx_backups_device ON backups(device_id);
CREATE INDEX idx_backups_fecha ON backups(fecha_backup DESC);
CREATE INDEX idx_tickets_org_unit ON tickets(org_unit_id);
CREATE INDEX idx_tickets_solicitante ON tickets(solicitante_id);
CREATE INDEX idx_tickets_asignado ON tickets(asignado_a);
CREATE INDEX idx_tickets_estado ON tickets(estado);
CREATE INDEX idx_tickets_fecha ON tickets(fecha_creacion DESC);
CREATE INDEX idx_ticket_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX idx_audit_chain_entity ON audit_chain(entity_id);
CREATE INDEX idx_audit_chain_hash ON audit_chain(hash);

-- ==================== FUNCIONES AUXILIARES PARA RLS ====================

CREATE OR REPLACE FUNCTION current_user_org_unit()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result UUID;
BEGIN
    SELECT org_unit_id INTO result
    FROM users
    WHERE id = auth.uid();
    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION current_user_has_role(target_role user_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND rol = target_role
    ) INTO result;
    RETURN COALESCE(result, FALSE);
END;
$$;

-- ==================== ROW LEVEL SECURITY (RLS) ====================

-- Habilitar RLS en todas las tablas
ALTER TABLE org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Políticas para USERS
CREATE POLICY "Los usuarios pueden ver su propio perfil"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden ver otros usuarios de su org_unit"
    ON users FOR SELECT
     USING (
        current_user_has_role('LIDER_TI')
        OR org_unit_id = current_user_org_unit()
    );

CREATE POLICY "Solo LIDER_TI puede actualizar usuarios"
    ON users FOR UPDATE
    USING (
        current_user_has_role('LIDER_TI')
    );

-- Políticas para DEVICES
CREATE POLICY "Los usuarios ven dispositivos de su org_unit"
    ON devices FOR SELECT
    USING (
        current_user_has_role('LIDER_TI')
        OR org_unit_id = current_user_org_unit()
    );

CREATE POLICY "Solo TI y LIDER_TI pueden crear dispositivos"
    ON devices FOR INSERT
    WITH CHECK (
        current_user_has_role('LIDER_TI')
        OR (
            current_user_has_role('TI')
            AND org_unit_id = current_user_org_unit()
        )
    );

CREATE POLICY "Solo TI y LIDER_TI pueden actualizar dispositivos"
    ON devices FOR UPDATE
    USING (
        current_user_has_role('LIDER_TI')
        OR (
            current_user_has_role('TI')
            AND org_unit_id = current_user_org_unit()
        )
    );

CREATE POLICY "Solo LIDER_TI puede eliminar dispositivos"
    ON devices FOR DELETE
    USING (
        current_user_has_role('LIDER_TI')
    );

-- Políticas para DEVICE_SPECS
CREATE POLICY "Los usuarios ven specs de dispositivos de su org_unit"
    ON device_specs FOR SELECT
    USING (
        current_user_has_role('LIDER_TI')
        OR device_id IN (
            SELECT id FROM devices WHERE
                org_unit_id = current_user_org_unit()
        )
    );

CREATE POLICY "Solo TI puede modificar specs"
    ON device_specs FOR ALL
    USING (
        current_user_has_role('TI')
        OR current_user_has_role('LIDER_TI')
    );

-- Políticas para DEVICE_LOGS
CREATE POLICY "Los usuarios ven logs de su org_unit"
    ON device_logs FOR SELECT
    USING (
        current_user_has_role('LIDER_TI')
        OR device_id IN (
            SELECT id FROM devices WHERE
                org_unit_id = current_user_org_unit()
        )
    );

CREATE POLICY "Solo TI puede crear logs"
    ON device_logs FOR INSERT
    WITH CHECK (
        current_user_has_role('TI')
        OR current_user_has_role('LIDER_TI')
    );

-- Políticas para BACKUPS
CREATE POLICY "Los usuarios ven backups de su org_unit"
    ON backups FOR SELECT
    USING (
        current_user_has_role('LIDER_TI')
        OR device_id IN (
            SELECT id FROM devices WHERE
                org_unit_id = current_user_org_unit()
        )
    );

CREATE POLICY "Solo TI puede gestionar backups"
    ON backups FOR ALL
    USING (
        current_user_has_role('TI')
        OR current_user_has_role('LIDER_TI')
    );

-- Políticas para TICKETS
CREATE POLICY "Los usuarios ven sus propios tickets"
    ON tickets FOR SELECT
    USING (
        solicitante_id = auth.uid()
        OR asignado_a = auth.uid()
        OR current_user_has_role('TI')
        OR current_user_has_role('LIDER_TI')
        OR current_user_has_role('DIRECTOR')
    );

CREATE POLICY "Todos los usuarios pueden crear tickets"
    ON tickets FOR INSERT
    WITH CHECK (
        solicitante_id = auth.uid()
    );

CREATE POLICY "Solo TI puede actualizar tickets"
    ON tickets FOR UPDATE
    USING (
        current_user_has_role('TI')
        OR current_user_has_role('LIDER_TI')
    );

-- Políticas para TICKET_COMMENTS
CREATE POLICY "Los usuarios ven comentarios de tickets que pueden ver"
    ON ticket_comments FOR SELECT
    USING (
        ticket_id IN (
            SELECT id FROM tickets WHERE 
            solicitante_id = auth.uid()
            OR asignado_a = auth.uid()
            OR current_user_has_role('TI')
            OR current_user_has_role('LIDER_TI')
            OR current_user_has_role('DIRECTOR')
        )
    );

CREATE POLICY "Los usuarios pueden comentar en sus tickets"
    ON ticket_comments FOR INSERT
    WITH CHECK (
        ticket_id IN (
            SELECT id FROM tickets WHERE
            solicitante_id = auth.uid()
            OR asignado_a = auth.uid()
            OR current_user_has_role('TI')
            OR current_user_has_role('LIDER_TI')
        )
    );

-- Políticas para AUDIT_CHAIN
CREATE POLICY "Todos pueden ver registros de auditoría"
    ON audit_chain FOR SELECT
    USING (true);

CREATE POLICY "Solo el sistema puede insertar en audit_chain"
    ON audit_chain FOR INSERT
    WITH CHECK (
        current_user_has_role('TI')
        OR current_user_has_role('LIDER_TI')
    );

-- Políticas para ATTACHMENTS
CREATE POLICY "Los usuarios ven attachments relacionados a recursos que pueden ver"
    ON attachments FOR SELECT
    USING (true);

CREATE POLICY "Los usuarios pueden subir attachments"
    ON attachments FOR INSERT
    WITH CHECK (subido_por = auth.uid());

-- ==================== TRIGGERS ====================

-- Actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_specs_updated_at BEFORE UPDATE ON device_specs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calcular tiempos de respuesta y resolución en tickets
CREATE OR REPLACE FUNCTION calculate_ticket_times()
RETURNS TRIGGER AS $$
BEGIN
    -- Tiempo de respuesta (desde creación hasta asignación)
    IF NEW.fecha_asignacion IS NOT NULL AND OLD.fecha_asignacion IS NULL THEN
        NEW.tiempo_respuesta_minutos = EXTRACT(EPOCH FROM (NEW.fecha_asignacion - NEW.fecha_creacion)) / 60;
    END IF;
    
    -- Tiempo de resolución (desde creación hasta resolución)
    IF NEW.fecha_resolucion IS NOT NULL AND OLD.fecha_resolucion IS NULL THEN
        NEW.tiempo_resolucion_minutos = EXTRACT(EPOCH FROM (NEW.fecha_resolucion - NEW.fecha_creacion)) / 60;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_ticket_times_trigger BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION calculate_ticket_times();

-- ==================== FUNCIONES ÚTILES ====================

-- Función para obtener estadísticas de dispositivos
CREATE OR REPLACE FUNCTION get_device_stats(p_org_unit_id UUID)
RETURNS TABLE (
    total BIGINT,
    activos BIGINT,
    reparacion BIGINT,
    retirados BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total,
        COUNT(*) FILTER (WHERE estado = 'ACTIVO')::BIGINT as activos,
        COUNT(*) FILTER (WHERE estado = 'REPARACIÓN')::BIGINT as reparacion,
        COUNT(*) FILTER (WHERE estado = 'RETIRADO')::BIGINT as retirados
    FROM devices
    WHERE org_unit_id = p_org_unit_id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de tickets
CREATE OR REPLACE FUNCTION get_ticket_stats(p_org_unit_id UUID)
RETURNS TABLE (
    total BIGINT,
    abiertos BIGINT,
    en_proceso BIGINT,
    resueltos BIGINT,
    cerrados BIGINT,
    tiempo_promedio_respuesta NUMERIC,
    tiempo_promedio_resolucion NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total,
        COUNT(*) FILTER (WHERE estado = 'ABIERTO')::BIGINT as abiertos,
        COUNT(*) FILTER (WHERE estado = 'EN_PROCESO')::BIGINT as en_proceso,
        COUNT(*) FILTER (WHERE estado = 'RESUELTO')::BIGINT as resueltos,
        COUNT(*) FILTER (WHERE estado = 'CERRADO')::BIGINT as cerrados,
        AVG(tiempo_respuesta_minutos) as tiempo_promedio_respuesta,
        AVG(tiempo_resolucion_minutos) as tiempo_promedio_resolucion
    FROM tickets
    WHERE org_unit_id = p_org_unit_id;
END;
$$ LANGUAGE plpgsql;

-- ==================== COMENTARIOS ====================

COMMENT ON TABLE org_units IS 'Dependencias organizacionales (Ej: Colegio, Administración)';
COMMENT ON TABLE users IS 'Usuarios del sistema con roles y permisos';
COMMENT ON TABLE devices IS 'Inventario de dispositivos TI';
COMMENT ON TABLE device_specs IS 'Especificaciones técnicas detalladas de cada dispositivo';
COMMENT ON TABLE device_logs IS 'Historial de eventos y cambios en dispositivos';
COMMENT ON TABLE backups IS 'Registro de copias de seguridad realizadas';
COMMENT ON TABLE tickets IS 'Tickets del sistema HelpDesk';
COMMENT ON TABLE ticket_comments IS 'Comentarios y seguimiento de tickets';
COMMENT ON TABLE audit_chain IS 'Registro inmutable de eventos importantes con cadena de hash';
COMMENT ON TABLE attachments IS 'Archivos adjuntos (imágenes, documentos, evidencias)';

-- ==================== GRANTS ====================

-- Otorgar permisos a usuarios autenticados
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ==================== FIN SCHEMA ====================

-- Script completado exitosamente
-- Ejecutar: psql "postgresql://..." < supabase.sql
