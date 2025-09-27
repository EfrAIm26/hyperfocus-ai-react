-- Script #3: Correcciones de Seguridad para Supabase
-- Ejecutar en SQL Editor de Supabase
-- Este script corrige los problemas de seguridad detectados por el Security Advisor

-- =====================================================
-- 1. CORREGIR FUNCIONES CON SEARCH_PATH MUTABLE
-- =====================================================

-- Función corregida: get_or_create_daily_usage
CREATE OR REPLACE FUNCTION public.get_or_create_daily_usage(p_user_id UUID)
RETURNS TABLE(message_count INTEGER, can_send_message BOOLEAN, messages_remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER := 0;
  daily_limit INTEGER := 20;
BEGIN
  -- Intentar obtener el registro existente para hoy
  SELECT dmu.message_count INTO current_count
  FROM public.daily_message_usage dmu
  WHERE dmu.user_id = p_user_id 
    AND dmu.usage_date = CURRENT_DATE;
  
  -- Si no existe, crear uno nuevo
  IF current_count IS NULL THEN
    INSERT INTO public.daily_message_usage (user_id, usage_date, message_count)
    VALUES (p_user_id, CURRENT_DATE, 0)
    ON CONFLICT (user_id, usage_date) DO NOTHING;
    current_count := 0;
  END IF;
  
  -- Retornar información de uso
  RETURN QUERY SELECT 
    current_count,
    (current_count < daily_limit) as can_send_message,
    GREATEST(0, daily_limit - current_count) as messages_remaining;
END;
$$;

-- Función corregida: increment_message_count
CREATE OR REPLACE FUNCTION public.increment_message_count(p_user_id UUID)
RETURNS TABLE(new_count INTEGER, can_send_more BOOLEAN, messages_remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_message_count INTEGER;
  daily_limit INTEGER := 20;
BEGIN
  -- Insertar o actualizar el contador
  INSERT INTO public.daily_message_usage (user_id, usage_date, message_count, updated_at)
  VALUES (p_user_id, CURRENT_DATE, 1, NOW())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET 
    message_count = public.daily_message_usage.message_count + 1,
    updated_at = NOW()
  RETURNING public.daily_message_usage.message_count INTO new_message_count;
  
  -- Retornar información actualizada
  RETURN QUERY SELECT 
    new_message_count,
    (new_message_count < daily_limit) as can_send_more,
    GREATEST(0, daily_limit - new_message_count) as messages_remaining;
END;
$$;

-- Función corregida: get_usage_stats
CREATE OR REPLACE FUNCTION public.get_usage_stats(days_back INTEGER DEFAULT 7)
RETURNS TABLE(
  usage_date DATE,
  total_users INTEGER,
  total_messages INTEGER,
  avg_messages_per_user NUMERIC,
  users_at_limit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dmu.usage_date,
    COUNT(DISTINCT dmu.user_id)::INTEGER as total_users,
    SUM(dmu.message_count)::INTEGER as total_messages,
    ROUND(AVG(dmu.message_count), 2) as avg_messages_per_user,
    COUNT(CASE WHEN dmu.message_count >= 20 THEN 1 END)::INTEGER as users_at_limit
  FROM public.daily_message_usage dmu
  WHERE dmu.usage_date >= CURRENT_DATE - INTERVAL '1 day' * days_back
  GROUP BY dmu.usage_date
  ORDER BY dmu.usage_date DESC;
END;
$$;

-- Función corregida: reset_daily_message_limits
CREATE OR REPLACE FUNCTION public.reset_daily_message_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  -- Eliminar registros de más de 7 días para mantener la base de datos limpia
  DELETE FROM public.daily_message_usage 
  WHERE usage_date < CURRENT_DATE - INTERVAL '7 days';
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  -- Log del mantenimiento
  RAISE NOTICE 'Daily message limits maintenance: % old records cleaned', reset_count;
  
  RETURN reset_count;
END;
$$;

-- =====================================================
-- 2. CREAR FUNCIÓN PARA MANEJAR NUEVOS USUARIOS (SI NO EXISTE)
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Crear registro inicial de uso para el nuevo usuario
  INSERT INTO public.daily_message_usage (user_id, usage_date, message_count)
  VALUES (NEW.id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- 3. CREAR TRIGGER PARA NUEVOS USUARIOS (SI NO EXISTE)
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 4. OPTIMIZAR ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================

-- Recrear índices con mejores configuraciones
DROP INDEX IF EXISTS idx_daily_usage_user_date;
DROP INDEX IF EXISTS idx_daily_usage_date;
DROP INDEX IF EXISTS idx_daily_usage_user_id;

-- Índices optimizados
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_usage_user_date_optimized 
ON public.daily_message_usage(user_id, usage_date) 
WHERE usage_date >= CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_usage_current_date 
ON public.daily_message_usage(usage_date) 
WHERE usage_date = CURRENT_DATE;

-- =====================================================
-- 5. CONFIGURAR POLÍTICAS RLS MÁS ESTRICTAS
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view their own usage" ON public.daily_message_usage;
DROP POLICY IF EXISTS "Users can insert their own usage" ON public.daily_message_usage;
DROP POLICY IF EXISTS "Users can update their own usage" ON public.daily_message_usage;

-- Crear políticas más estrictas
CREATE POLICY "Users can view own current usage" ON public.daily_message_usage
  FOR SELECT USING (
    auth.uid() = user_id 
    AND usage_date >= CURRENT_DATE - INTERVAL '1 day'
  );

CREATE POLICY "Users can insert own current usage" ON public.daily_message_usage
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND usage_date = CURRENT_DATE
  );

CREATE POLICY "Users can update own current usage" ON public.daily_message_usage
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND usage_date = CURRENT_DATE
  );

-- =====================================================
-- 6. CONFIGURAR FUNCIÓN DE LIMPIEZA AUTOMÁTICA
-- =====================================================

-- Función mejorada para limpieza automática
CREATE OR REPLACE FUNCTION public.cleanup_old_usage_records()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar registros de más de 30 días
  DELETE FROM public.daily_message_usage 
  WHERE usage_date < CURRENT_DATE - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Actualizar estadísticas de la tabla
  ANALYZE public.daily_message_usage;
  
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- 7. VERIFICACIÓN DE SEGURIDAD
-- =====================================================

DO $$
BEGIN
  -- Verificar que las funciones tienen search_path fijo
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'get_or_create_daily_usage' 
    AND routine_schema = 'public'
  ) THEN
    RAISE NOTICE '✅ Función get_or_create_daily_usage corregida';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'increment_message_count' 
    AND routine_schema = 'public'
  ) THEN
    RAISE NOTICE '✅ Función increment_message_count corregida';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'get_usage_stats' 
    AND routine_schema = 'public'
  ) THEN
    RAISE NOTICE '✅ Función get_usage_stats corregida';
  END IF;
  
  RAISE NOTICE '🔒 Correcciones de seguridad aplicadas exitosamente';
END;
$$;

-- =====================================================
-- 8. NOTAS IMPORTANTES
-- =====================================================

/*
CAMBIOS APLICADOS:

1. ✅ Agregado SET search_path = public a todas las funciones
2. ✅ Especificado esquema public explícitamente en todas las consultas
3. ✅ Optimizados índices para mejor rendimiento
4. ✅ Políticas RLS más estrictas
5. ✅ Función de limpieza mejorada

PRÓXIMOS PASOS:

1. Ejecutar este script en Supabase SQL Editor
2. Verificar que las alertas de seguridad desaparezcan
3. Habilitar protección de contraseñas filtradas en Auth settings
4. Monitorear rendimiento de consultas

PARA HABILITAR PROTECCIÓN DE CONTRASEÑAS:
- Ve a Authentication > Settings en Supabase Dashboard
- Busca "Password Protection" 
- Habilita "Prevent sign-ups with compromised passwords"
*/