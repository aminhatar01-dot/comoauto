-- 1. Actualizar tabla USUARIOS: Añadir teléfono del vendedor y configuraciones privadas
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS telefono_whatsapp VARCHAR(50),
ADD COLUMN IF NOT EXISTS config_conexion_whatsapp JSONB DEFAULT '{"conectado": false, "numero": "", "qr_code": ""}'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS config_redes_sociales JSONB DEFAULT '{"facebook": {"usuario": "", "contrasena": ""}, "instagram": {"usuario": "", "contrasena": ""}}'::jsonb NOT NULL;

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
CREATE POLICY leads_vendedor_policy ON public.leads
    FOR ALL USING (
        agencia_id = public.get_auth_agencia_id() AND 
        vendedor_asignado_id = auth.uid()
    )
    WITH CHECK (
        agencia_id = public.get_auth_agencia_id() AND 
        vendedor_asignado_id = auth.uid()
    );
