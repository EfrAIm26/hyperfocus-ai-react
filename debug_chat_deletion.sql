-- SCRIPT DE DIAGNÓSTICO PARA EL PROBLEMA DE ELIMINACIÓN DE CHATS
-- Ejecutar en SQL Editor de Supabase

-- ========================================
-- 1. VERIFICAR ESTADO ACTUAL DE LA TABLA CHATS
-- ========================================

-- Ver estructura de la tabla chats
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chats' 
ORDER BY ordinal_position;

-- ========================================
-- 2. VERIFICAR POLÍTICAS RLS
-- ========================================

-- Verificar si RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'chats';

-- Ver todas las políticas RLS para chats
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chats';

-- ========================================
-- 3. VERIFICAR FOREIGN KEYS Y CONSTRAINTS
-- ========================================

SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'chats';

-- ========================================
-- 4. VERIFICAR TRIGGERS
-- ========================================

SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'chats';

-- ========================================
-- 5. VERIFICAR DATOS ACTUALES
-- ========================================

-- Contar chats por usuario
SELECT 
    user_id,
    COUNT(*) as chat_count,
    MAX(created_at) as last_chat_created
FROM chats 
GROUP BY user_id;

-- Ver últimos chats creados
SELECT 
    id,
    user_id,
    title,
    created_at,
    updated_at
FROM chats 
ORDER BY created_at DESC 
LIMIT 10;

-- ========================================
-- 6. VERIFICAR USUARIOS ACTIVOS
-- ========================================

-- Ver usuarios en auth.users
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users 
ORDER BY last_sign_in_at DESC 
LIMIT 10;

-- ========================================
-- 7. VERIFICAR PERFILES
-- ========================================

-- Ver perfiles existentes
SELECT 
    id,
    email,
    created_at,
    updated_at
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- ========================================
-- 8. VERIFICAR MENSAJES
-- ========================================

-- Contar mensajes por chat
SELECT 
    chat_id,
    COUNT(*) as message_count,
    MAX(created_at) as last_message
FROM messages 
GROUP BY chat_id 
ORDER BY last_message DESC 
LIMIT 10;

-- ========================================
-- 9. VERIFICAR LOGS DE SUPABASE (si están disponibles)
-- ========================================

-- Nota: Los logs específicos pueden variar según la configuración de Supabase
-- Revisar en el dashboard de Supabase > Logs > Database

-- ========================================
-- 10. SCRIPT DE PRUEBA PARA REPRODUCIR EL PROBLEMA
-- ========================================

-- Crear un chat de prueba (ejecutar solo si tienes un user_id válido)
-- INSERT INTO chats (user_id, title) 
-- VALUES ('tu-user-id-aqui', 'Chat de prueba - ' || NOW());

-- Verificar que se creó
-- SELECT * FROM chats WHERE title LIKE 'Chat de prueba%';