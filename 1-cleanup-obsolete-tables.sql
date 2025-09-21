-- Script #1: Limpieza de Tablas Obsoletas
-- Ejecutar en SQL Editor de Supabase
-- Este script elimina las tablas que ya no se usan en el MVP actual

-- IMPORTANTE: Este script eliminará permanentemente las tablas y todos sus datos
-- Asegúrate de hacer un backup si necesitas conservar algún dato

-- Eliminar tabla schedule_events (si existe)
DROP TABLE IF EXISTS schedule_events CASCADE;

-- Eliminar tabla topics (si existe)
DROP TABLE IF EXISTS topics CASCADE;

-- Eliminar tabla courses (si existe)
DROP TABLE IF EXISTS courses CASCADE;

-- Verificar que las tablas fueron eliminadas
-- (Opcional: ejecutar para confirmar)
/*
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('courses', 'topics', 'schedule_events');
*/

-- Si la consulta anterior no devuelve filas, las tablas fueron eliminadas exitosamente

COMMIT;