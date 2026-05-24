-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: AGENCIAS
CREATE TABLE public.agencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    cuit VARCHAR(50) UNIQUE NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Habilitar RLS en Agencias
ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;

-- 2. TABLA: USUARIOS (Linkeado a auth.users de Supabase)
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    agencia_id UUID NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('admin', 'vendedor', 'gestor')),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Habilitar RLS en Usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para obtener el agencia_id del usuario autenticado actual de forma segura en las políticas RLS
CREATE OR REPLACE FUNCTION public.get_auth_agencia_id()
RETURNS UUID AS $$
  SELECT agencia_id FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. TABLA: VEHICULOS
CREATE TABLE public.vehiculos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agencia_id UUID NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    anio INTEGER NOT NULL CHECK (anio > 1900 AND anio < 2100),
    precio DECIMAL(12, 2) NOT NULL CHECK (precio >= 0),
    kilometraje INTEGER NOT NULL CHECK (kilometraje >= 0),
    estado VARCHAR(50) NOT NULL CHECK (estado IN ('disponible', 'reservado', 'vendido')),
    dias_en_stock INTEGER DEFAULT 0 NOT NULL CHECK (dias_en_stock >= 0),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Habilitar RLS en Vehiculos
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;

-- 4. TABLA: LEADS
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agencia_id UUID NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
    nombre_cliente VARCHAR(255) NOT NULL,
    telefono_whatsapp VARCHAR(50) NOT NULL,
    estado_lead VARCHAR(50) NOT NULL CHECK (estado_lead IN ('nuevo', 'en_contacto', 'interesado', 'no_interesado', 'vendido')),
    historial_conversacion JSONB DEFAULT '[]'::jsonb NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Habilitar RLS en Leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 5. TABLA: TRAMITES_GESTORIA
CREATE TABLE public.tramites_gestoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehiculo_id UUID UNIQUE NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
    estado_tramite VARCHAR(50) NOT NULL CHECK (estado_tramite IN ('pendiente', 'en_proceso', 'observado', 'finalizado')),
    checklist_documentos JSONB DEFAULT '{"titulo": false, "cedula_verde": false, "f08": false, "verificacion_policial": false, "libre_deuda": false}'::jsonb NOT NULL,
    costo_transferencia DECIMAL(10, 2) NOT NULL CHECK (costo_transferencia >= 0),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Habilitar RLS en Tramites de Gestoria
ALTER TABLE public.tramites_gestoria ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- POLÍTICAS RLS (Row Level Security) - MULTI-TENANT ESTRICTO
-- ============================================================================

-- A. Políticas para AGENCIAS
-- Un usuario solo puede ver la agencia a la que pertenece
CREATE POLICY agencia_select_policy ON public.agencias
    FOR SELECT USING (id = public.get_auth_agencia_id());

-- B. Políticas para USUARIOS
-- Los usuarios pueden leer perfiles de su misma agencia
CREATE POLICY usuarios_select_policy ON public.usuarios
    FOR SELECT USING (agencia_id = public.get_auth_agencia_id());

-- Solo administradores de la agencia pueden insertar, actualizar o borrar usuarios en su misma agencia
CREATE POLICY usuarios_insert_policy ON public.usuarios
    FOR INSERT WITH CHECK (
        agencia_id = public.get_auth_agencia_id() AND 
        (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY usuarios_update_policy ON public.usuarios
    FOR UPDATE USING (
        agencia_id = public.get_auth_agencia_id() AND 
        (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY usuarios_delete_policy ON public.usuarios
    FOR DELETE USING (
        agencia_id = public.get_auth_agencia_id() AND 
        (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
    );

-- C. Políticas para VEHICULOS
-- Todos los usuarios de la agencia pueden ver sus vehículos
CREATE POLICY vehiculos_select_policy ON public.vehiculos
    FOR SELECT USING (agencia_id = public.get_auth_agencia_id());

-- Vendedores y Admins pueden crear/modificar vehículos
CREATE POLICY vehiculos_all_policy ON public.vehiculos
    FOR ALL USING (agencia_id = public.get_auth_agencia_id())
    WITH CHECK (agencia_id = public.get_auth_agencia_id());

-- D. Políticas para LEADS
-- Todos los usuarios de la agencia pueden ver e interactuar con sus leads
CREATE POLICY leads_all_policy ON public.leads
    FOR ALL USING (agencia_id = public.get_auth_agencia_id())
    WITH CHECK (agencia_id = public.get_auth_agencia_id());

-- E. Políticas para TRAMITES_GESTORIA
-- Todos los usuarios de la agencia pueden ver los trámites si el vehículo pertenece a su agencia
CREATE POLICY tramites_select_policy ON public.tramites_gestoria
    FOR SELECT USING (
        vehiculo_id IN (SELECT id FROM public.vehiculos WHERE agencia_id = public.get_auth_agencia_id())
    );

-- Los gestores y admins pueden hacer todas las operaciones en trámites de su agencia
CREATE POLICY tramites_all_policy ON public.tramites_gestoria
    FOR ALL USING (
        vehiculo_id IN (SELECT id FROM public.vehiculos WHERE agencia_id = public.get_auth_agencia_id())
    )
    WITH CHECK (
        vehiculo_id IN (SELECT id FROM public.vehiculos WHERE agencia_id = public.get_auth_agencia_id())
    );


-- ============================================================================
-- TRIGGERS DE SEGURIDAD PARA CREACIÓN DE USUARIOS
-- ============================================================================
-- Al registrarse un usuario en auth.users, es necesario asignarle un perfil en public.usuarios.
-- Nota: En producción, este disparador suele crearse para automatizar el alta. Para evitar complejidades de cuellos de botella con la agencia_id inicial en el signup libre, crearemos un endpoint o permitiremos la creación manual/administración de usuarios.
