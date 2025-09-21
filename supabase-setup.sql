-- Script SQL para configurar el sistema de límites de mensajes diarios
-- Ejecutar en el SQL Editor de Supabase

-- 1. Crear tabla para trackear uso diario de mensajes
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

-- 2. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_message_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON daily_message_usage(usage_date);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE daily_message_usage ENABLE ROW LEVEL SECURITY;

-- 4. Crear política RLS para que usuarios solo vean sus propios datos
CREATE POLICY "Users can view their own usage" ON daily_message_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" ON daily_message_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" ON daily_message_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. Función para obtener o crear registro de uso diario
CREATE OR REPLACE FUNCTION get_or_create_daily_usage(p_user_id UUID)
RETURNS TABLE(message_count INTEGER, can_send_message BOOLEAN, messages_remaining INTEGER)
LANGUAGE plpgsql
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

-- 6. Función para incrementar contador de mensajes
CREATE OR REPLACE FUNCTION increment_message_count(p_user_id UUID)
RETURNS TABLE(new_count INTEGER, can_send_more BOOLEAN, messages_remaining INTEGER)
LANGUAGE plpgsql
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

-- 7. Función para limpiar registros antiguos (opcional, para mantenimiento)
CREATE OR REPLACE FUNCTION cleanup_old_usage_records()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar registros de más de 30 días
  DELETE FROM daily_message_usage 
  WHERE usage_date < CURRENT_DATE - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 8. Comentarios para el desarrollador
/*
INSTRUCCIONES DE USO:

1. Ejecuta este script completo en el SQL Editor de Supabase
2. Verifica que todas las funciones se crearon correctamente
3. La aplicación React usará estas funciones para:
   - get_or_create_daily_usage(): Verificar límites antes de enviar
   - increment_message_count(): Incrementar contador después de enviar

LÍMITES CONFIGURADOS:
- 20 mensajes por día por usuario
- Advertencia en mensaje 15
- Bloqueo después del mensaje 20
- Reset automático cada día a medianoche

MANTENIMIENTO:
- Ejecutar cleanup_old_usage_records() periódicamente para limpiar datos antiguos
*/