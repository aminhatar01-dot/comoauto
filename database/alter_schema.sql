-- 1. Actualizar tabla USUARIOS: Añadir teléfono del vendedor y configuraciones privadas
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS telefono_whatsapp VARCHAR(50),
ADD COLUMN IF NOT EXISTS config_conexion_whatsapp JSONB DEFAULT '{"conectado": false, "numero": "", "qr_code": "", "api_url": "", "api_token": ""}'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS config_redes_sociales JSONB DEFAULT '{"facebook": {"usuario": "", "contrasena": ""}, "instagram": {"usuario": "", "contrasena": ""}, "tiktok": {"usuario": "", "contrasena": ""}}'::jsonb NOT NULL;

-- 2. Actualizar tabla AGENCIAS: Añadir configuraciones del Bot (horarios y respuestas) y del Constructor Web
ALTER TABLE public.agencias 
ADD COLUMN IF NOT EXISTS config_bot JSONB DEFAULT '{"encendido": true, "hora_inicio": "09:00", "hora_fin": "20:00", "estrategia": "catalogo"}'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS config_web JSONB DEFAULT '{"tema_color": "emerald", "texto_hero": "Encuentra tu próximo auto hoy", "contacto_email": "", "contacto_telefono": "", "dominio_personalizado": "", "mostrar_stock": true}'::jsonb NOT NULL;

-- 3. Actualizar tabla LEADS: Añadir vendedor asignado para soportar multi-vendedor
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS vendedor_asignado_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- 4. Modificar políticas RLS para LEADS por privacidad estricta de vendedores
DROP POLICY IF EXISTS leads_all_policy ON public.leads;

-- Política para administradores (pueden ver/gestionar todos los leads de la agencia)
DROP POLICY IF EXISTS leads_admin_policy ON public.leads;
CREATE POLICY leads_admin_policy ON public.leads
    FOR ALL USING (
        agencia_id = public.get_auth_agencia_id() AND 
        (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
    )
    WITH CHECK (
        agencia_id = public.get_auth_agencia_id() AND 
        (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
    );

-- Política para vendedores (solo pueden ver/gestionar sus propios leads)
DROP POLICY IF EXISTS leads_vendedor_policy ON public.leads;
CREATE POLICY leads_vendedor_policy ON public.leads
    FOR ALL USING (
        agencia_id = public.get_auth_agencia_id() AND 
        vendedor_asignado_id = auth.uid()
    )
    WITH CHECK (
        agencia_id = public.get_auth_agencia_id() AND 
        vendedor_asignado_id = auth.uid()
    );

-- 5. Actualizar tabla VEHICULOS: Añadir columnas de control de costos internos
ALTER TABLE public.vehiculos
ADD COLUMN IF NOT EXISTS valor_compra DECIMAL(12, 2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS costo_reparaciones DECIMAL(12, 2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS detalles_internos TEXT,
ADD COLUMN IF NOT EXISTS avance_preparacion INTEGER DEFAULT 0 NOT NULL CHECK (avance_preparacion >= 0 AND avance_preparacion <= 100),
ADD COLUMN IF NOT EXISTS notas_internas TEXT;

-- 6. Actualizar tabla TRAMITES_GESTORIA: Añadir datos del cliente y almacenamiento de archivos reales
ALTER TABLE public.tramites_gestoria
ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(255),
ADD COLUMN IF NOT EXISTS cliente_dni VARCHAR(50),
ADD COLUMN IF NOT EXISTS archivos_formularios JSONB DEFAULT '{}'::jsonb NOT NULL;

-- 7. Crear tabla HISTORIAL_TRANSACCIONES para registrar compras, reservas y ventas de stock
CREATE TABLE IF NOT EXISTS public.historial_transacciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agencia_id UUID NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
    vehiculo_id UUID REFERENCES public.vehiculos(id) ON DELETE SET NULL,
    vehiculo_info JSONB NOT NULL,
    tipo_transaccion VARCHAR(50) NOT NULL CHECK (tipo_transaccion IN ('compra', 'venta', 'reserva')),
    monto DECIMAL(12, 2) NOT NULL CHECK (monto >= 0),
    cliente_nombre VARCHAR(255),
    cliente_contacto VARCHAR(100),
    vendedor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    fecha_transaccion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Habilitar RLS en Historial de Transacciones
ALTER TABLE public.historial_transacciones ENABLE ROW LEVEL SECURITY;

-- Política de RLS para Historial de Transacciones
DROP POLICY IF EXISTS historial_all_policy ON public.historial_transacciones;
CREATE POLICY historial_all_policy ON public.historial_transacciones
    FOR ALL USING (agencia_id = public.get_auth_agencia_id())
    WITH CHECK (agencia_id = public.get_auth_agencia_id());
