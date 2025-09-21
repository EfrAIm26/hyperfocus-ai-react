-- Script #2: Implementación Completa del Sistema de Límites de Mensajes
-- Ejecutar en SQL Editor de Supabase
-- Este script crea toda la infraestructura necesaria para el límite de 20 mensajes diarios

-- =====================================================
-- 1. CREAR TABLA PARA TRACKEAR USO DIARIO DE MENSAJES
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_message_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint para asegurar un registro por usuario por día
  UNIQUE(user_id, usage_date)
);

-- =====================================================
-- 2. CREAR ÍNDICES PARA OPTIMIZAR CONSULTAS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_message_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON daily_message_usage(usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_id ON daily_message_usage(user_id);

-- =====================================================
-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE daily_message_usage ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREAR POLÍTICAS RLS PARA SEGURIDAD
-- =====================================================

-- Política para que usuarios solo vean sus propios datos
CREATE POLICY "Users can view their own usage" ON daily_message_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Política para que usuarios solo inserten sus propios datos
CREATE POLICY "Users can insert their own usage" ON daily_message_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para que usuarios solo actualicen sus propios datos
CREATE POLICY "Users can update their own usage" ON daily_message_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 5. FUNCIÓN PARA OBTENER O CREAR REGISTRO DE USO DIARIO
-- =====================================================

CREATE OR REPLACE FUNCTION get_or_create_daily_usage(p_user_id UUID)
RETURNS TABLE(message_count INTEGER, can_send_message BOOLEAN, messages_remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER := 0;
  daily_limit INTEGER := 20;
BEGIN
  -- Intentar obtener el registro existente para hoy
  SELECT dmu.message_count INTO current_count
  FROM daily_message_usage dmu
  WHERE dmu.user_id = p_user_id 
    AND dmu.usage_date = CURRENT_DATE;
  
  -- Si no existe, crear uno nuevo
  IF current_count IS NULL THEN
    INSERT INTO daily_message_usage (user_id, usage_date, message_count)
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

-- =====================================================
-- 6. FUNCIÓN PARA INCREMENTAR CONTADOR DE MENSAJES
-- =====================================================

CREATE OR REPLACE FUNCTION increment_message_count(p_user_id UUID)
RETURNS TABLE(new_count INTEGER, can_send_more BOOLEAN, messages_remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_message_count INTEGER;
  daily_limit INTEGER := 20;
BEGIN
  -- Insertar o actualizar el contador
  INSERT INTO daily_message_usage (user_id, usage_date, message_count, updated_at)
  VALUES (p_user_id, CURRENT_DATE, 1, NOW())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET 
    message_count = daily_message_usage.message_count + 1,
    updated_at = NOW()
  RETURNING daily_message_usage.message_count INTO new_message_count;
  
  -- Retornar información actualizada
  RETURN QUERY SELECT 
    new_message_count,
    (new_message_count < daily_limit) as can_send_more,
    GREATEST(0, daily_limit - new_message_count) as messages_remaining;
END;
$$;

-- =====================================================
-- 7. FUNCIÓN PARA RESET DIARIO AUTOMÁTICO (CRON)
-- =====================================================

CREATE OR REPLACE FUNCTION reset_daily_message_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  -- El reset es automático porque usamos CURRENT_DATE
  -- Esta función es para mantenimiento y limpieza de registros antiguos
  
  -- Eliminar registros de más de 7 días para mantener la base de datos limpia
  DELETE FROM daily_message_usage 
  WHERE usage_date < CURRENT_DATE - INTERVAL '7 days';
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  -- Log del mantenimiento
  RAISE NOTICE 'Daily message limits maintenance: % old records cleaned', reset_count;
  
  RETURN reset_count;
END;
$$;

-- =====================================================
-- 8. CONFIGURAR CRON JOB PARA LIMPIEZA AUTOMÁTICA
-- =====================================================

-- NOTA: Para configurar el cron job automático, ve a:
-- Supabase Dashboard > Database > Extensions > pg_cron
-- Y ejecuta este comando:

/*
SELECT cron.schedule(
  'daily-message-cleanup',
  '0 2 * * *', -- Ejecutar a las 2:00 AM todos los días
  'SELECT reset_daily_message_limits();'
);
*/

-- =====================================================
-- 9. FUNCIÓN DE UTILIDAD PARA ADMINISTRADORES
-- =====================================================

CREATE OR REPLACE FUNCTION get_usage_stats(days_back INTEGER DEFAULT 7)
RETURNS TABLE(
  usage_date DATE,
  total_users INTEGER,
  total_messages INTEGER,
  avg_messages_per_user NUMERIC,
  users_at_limit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dmu.usage_date,
    COUNT(DISTINCT dmu.user_id)::INTEGER as total_users,
    SUM(dmu.message_count)::INTEGER as total_messages,
    ROUND(AVG(dmu.message_count), 2) as avg_messages_per_user,
    COUNT(CASE WHEN dmu.message_count >= 20 THEN 1 END)::INTEGER as users_at_limit
  FROM daily_message_usage dmu
  WHERE dmu.usage_date >= CURRENT_DATE - INTERVAL '%s days' 
  GROUP BY dmu.usage_date
  ORDER BY dmu.usage_date DESC;
END;
$$;

-- =====================================================
-- 10. VERIFICACIÓN DE INSTALACIÓN
-- =====================================================

-- Verificar que todo se creó correctamente
DO $$
BEGIN
  -- Verificar tabla
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_message_usage') THEN
    RAISE NOTICE '✅ Tabla daily_message_usage creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Tabla daily_message_usage no fue creada';
  END IF;
  
  -- Verificar funciones
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_or_create_daily_usage') THEN
    RAISE NOTICE '✅ Función get_or_create_daily_usage creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Función get_or_create_daily_usage no fue creada';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'increment_message_count') THEN
    RAISE NOTICE '✅ Función increment_message_count creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Función increment_message_count no fue creada';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'reset_daily_message_limits') THEN
    RAISE NOTICE '✅ Función reset_daily_message_limits creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Función reset_daily_message_limits no fue creada';
  END IF;
  
  RAISE NOTICE '🚀 Sistema de límites de mensajes instalado correctamente!';
  RAISE NOTICE '📊 Límite configurado: 20 mensajes por día por usuario';
  RAISE NOTICE '⚠️  Advertencia se muestra en el mensaje 15';
  RAISE NOTICE '🔒 Bloqueo total después del mensaje 20';
END $$;

-- =====================================================
-- INSTRUCCIONES FINALES
-- =====================================================

/*
🎯 SISTEMA DE LÍMITES DE MENSAJES INSTALADO

✅ COMPLETADO:
- Tabla daily_message_usage con RLS habilitado
- Funciones de servidor para manejo seguro de límites
- Políticas de seguridad configuradas
- Función de mantenimiento automático
- Función de estadísticas para administradores

📋 PRÓXIMOS PASOS:
1. El sistema ya está listo para usar
2. Tu aplicación React ya tiene el código integrado
3. Opcional: Configurar cron job para limpieza automática

🧪 PARA PROBAR:
-- Ver uso actual de un usuario
SELECT * FROM get_or_create_daily_usage('USER_ID_AQUI');

-- Simular envío de mensaje
SELECT * FROM increment_message_count('USER_ID_AQUI');

-- Ver estadísticas generales
SELECT * FROM get_usage_stats(7);

🚀 ¡LISTO PARA LANZAMIENTO BETA!
*/

COMMIT;