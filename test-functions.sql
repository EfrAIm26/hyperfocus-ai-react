-- Script de Verificación de Funciones SQL
-- Ejecutar en Supabase SQL Editor para verificar que todo funciona

-- =====================================================
-- 1. VERIFICAR QUE LAS FUNCIONES EXISTEN Y TIENEN search_path FIJO
-- =====================================================

SELECT 
  routine_name as "Función",
  routine_schema as "Esquema",
  security_type as "Seguridad",
  CASE 
    WHEN routine_definition LIKE '%SET search_path%' THEN '✅ Seguro'
    ELSE '❌ Vulnerable'
  END as "Estado Seguridad"
FROM information_schema.routines 
WHERE routine_name IN (
  'get_or_create_daily_usage',
  'increment_message_count', 
  'get_usage_stats',
  'handle_new_user',
  'cleanup_old_usage_records'
)
AND routine_schema = 'public'
ORDER BY routine_name;

-- =====================================================
-- 2. VERIFICAR TABLA Y ESTRUCTURA
-- =====================================================

-- Verificar que la tabla existe
SELECT 
  table_name as "Tabla",
  table_schema as "Esquema",
  CASE 
    WHEN row_security = 'YES' THEN '✅ RLS Habilitado'
    ELSE '❌ RLS Deshabilitado'
  END as "Seguridad RLS"
FROM information_schema.tables 
WHERE table_name = 'daily_message_usage';

-- Verificar columnas de la tabla
SELECT 
  column_name as "Columna",
  data_type as "Tipo",
  is_nullable as "Nullable",
  column_default as "Default"
FROM information_schema.columns 
WHERE table_name = 'daily_message_usage' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 3. VERIFICAR POLÍTICAS RLS
-- =====================================================

SELECT 
  policyname as "Política",
  cmd as "Comando",
  qual as "Condición"
FROM pg_policies 
WHERE tablename = 'daily_message_usage';

-- =====================================================
-- 4. VERIFICAR ÍNDICES
-- =====================================================

SELECT 
  indexname as "Índice",
  indexdef as "Definición"
FROM pg_indexes 
WHERE tablename = 'daily_message_usage'
ORDER BY indexname;

-- =====================================================
-- 5. VERIFICAR TRIGGER
-- =====================================================

SELECT 
  trigger_name as "Trigger",
  event_manipulation as "Evento",
  action_statement as "Acción"
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- =====================================================
-- 6. PROBAR FUNCIONES (SOLO SI TIENES UN USER_ID VÁLIDO)
-- =====================================================

-- IMPORTANTE: Reemplaza 'TU_USER_ID_AQUI' con un UUID real de un usuario
-- Puedes obtener un user_id ejecutando: SELECT id FROM auth.users LIMIT 1;

-- Comentado para evitar errores - descomenta y reemplaza el UUID para probar:

/*
-- Probar get_or_create_daily_usage
SELECT * FROM get_or_create_daily_usage('TU_USER_ID_AQUI');

-- Probar increment_message_count
SELECT * FROM increment_message_count('TU_USER_ID_AQUI');

-- Probar get_usage_stats
SELECT * FROM get_usage_stats(7);

-- Probar cleanup (no debería eliminar nada si no hay registros antiguos)
SELECT cleanup_old_usage_records() as "Registros eliminados";
*/

-- =====================================================
-- 7. VERIFICAR USUARIOS EXISTENTES
-- =====================================================

-- Ver cuántos usuarios hay registrados
SELECT 
  COUNT(*) as "Total Usuarios",
  COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as "Usuarios Hoy"
FROM auth.users;

-- Ver registros de uso existentes
SELECT 
  COUNT(*) as "Total Registros Uso",
  COUNT(CASE WHEN usage_date = CURRENT_DATE THEN 1 END) as "Registros Hoy",
  MAX(usage_date) as "Última Fecha",
  MIN(usage_date) as "Primera Fecha"
FROM daily_message_usage;

-- =====================================================
-- 8. RESULTADO FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🔍 Verificación completada. Revisa los resultados arriba.';
  RAISE NOTICE '✅ Si todas las funciones muestran "Seguro", puedes hacer push.';
  RAISE NOTICE '⚠️  Si hay problemas, revisa las correcciones antes de continuar.';
END;
$$;