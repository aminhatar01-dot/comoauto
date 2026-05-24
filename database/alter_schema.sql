-- 1. Actualizar tabla USUARIOS: Añadir teléfono del vendedor
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS telefono_whatsapp VARCHAR(50);

-- 2. Actualizar tabla AGENCIAS: Añadir configuraciones del Bot (horarios y respuestas) y del Constructor Web
ALTER TABLE public.agencias 
ADD COLUMN IF NOT EXISTS config_bot JSONB DEFAULT '{"encendido": true, "hora_inicio": "09:00", "hora_fin": "20:00", "estrategia": "catalogo"}'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS config_web JSONB DEFAULT '{"tema_color": "emerald", "texto_hero": "Encuentra tu próximo auto hoy", "contacto_email": "", "contacto_telefono": "", "dominio_personalizado": "", "mostrar_stock": true}'::jsonb NOT NULL;

-- 3. Actualizar tabla LEADS: Añadir vendedor asignado para soportar multi-vendedor
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS vendedor_asignado_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;
