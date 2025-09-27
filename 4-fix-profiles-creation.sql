-- Script #4: Solución para Creación Automática de Perfiles de Usuario
-- Ejecutar en SQL Editor de Supabase
-- Este script soluciona el problema donde nuevos usuarios no tienen perfiles creados

-- =====================================================
-- 1. CREAR TABLA PROFILES (SI NO EXISTE)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. HABILITAR ROW LEVEL SECURITY EN PROFILES
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CREAR POLÍTICAS RLS PARA PROFILES
-- =====================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Crear nuevas políticas
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- 4. FUNCIÓN MEJORADA PARA MANEJAR NUEVOS USUARIOS
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Crear perfil para el nuevo usuario
  INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuario'),
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', profiles.full_name),
    email = NEW.email,
    updated_at = NOW();

  -- Crear registro inicial de uso para el nuevo usuario
  INSERT INTO public.daily_message_usage (user_id, usage_date, message_count)
  VALUES (NEW.id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- 5. RECREAR TRIGGER PARA NUEVOS USUARIOS
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 6. CREAR PERFILES PARA USUARIOS EXISTENTES SIN PERFIL
-- =====================================================

-- Insertar perfiles para usuarios que no los tienen
INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Usuario') as full_name,
  u.email,
  u.created_at,
  NOW() as updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. FUNCIÓN PARA ACTUALIZAR PERFIL DE USUARIO
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN QUERY SELECT FALSE, 'Usuario no encontrado'::TEXT;
    RETURN;
  END IF;

  -- Actualizar perfil
  UPDATE public.profiles 
  SET 
    full_name = COALESCE(p_full_name, full_name),
    email = COALESCE(p_email, email),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Si no existe el perfil, crearlo
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
    VALUES (p_user_id, p_full_name, p_email, NOW(), NOW());
  END IF;

  RETURN QUERY SELECT TRUE, 'Perfil actualizado exitosamente'::TEXT;
END;
$$;

-- =====================================================
-- 8. ÍNDICES PARA OPTIMIZAR CONSULTAS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

-- =====================================================
-- 9. VERIFICACIÓN DE LA INSTALACIÓN
-- =====================================================

DO $$
DECLARE
  profiles_count INTEGER;
  users_count INTEGER;
  missing_profiles INTEGER;
BEGIN
  -- Contar usuarios y perfiles
  SELECT COUNT(*) INTO users_count FROM auth.users;
  SELECT COUNT(*) INTO profiles_count FROM public.profiles;
  
  missing_profiles := users_count - profiles_count;
  
  RAISE NOTICE '👥 Total de usuarios: %', users_count;
  RAISE NOTICE '📋 Total de perfiles: %', profiles_count;
  
  IF missing_profiles = 0 THEN
    RAISE NOTICE '✅ Todos los usuarios tienen perfiles creados';
  ELSE
    RAISE NOTICE '⚠️  Usuarios sin perfil: %', missing_profiles;
  END IF;
  
  -- Verificar trigger
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created configurado correctamente';
  ELSE
    RAISE NOTICE '❌ Error: Trigger on_auth_user_created no encontrado';
  END IF;
  
  -- Verificar función
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'handle_new_user' 
    AND routine_schema = 'public'
  ) THEN
    RAISE NOTICE '✅ Función handle_new_user configurada correctamente';
  ELSE
    RAISE NOTICE '❌ Error: Función handle_new_user no encontrada';
  END IF;
  
  RAISE NOTICE '🚀 Configuración de perfiles completada exitosamente';
END;
$$;

-- =====================================================
-- 10. COMANDOS DE PRUEBA (OPCIONAL)
-- =====================================================

/*
-- Para probar que todo funciona correctamente:

-- 1. Ver todos los perfiles
SELECT id, full_name, email, created_at FROM public.profiles ORDER BY created_at DESC;

-- 2. Ver usuarios sin perfil (debería estar vacío)
SELECT u.id, u.email, u.created_at 
FROM auth.users u 
LEFT JOIN public.profiles p ON u.id = p.id 
WHERE p.id IS NULL;

-- 3. Probar función de actualización de perfil
SELECT * FROM public.update_user_profile(
  'USER_ID_AQUI'::UUID, 
  'Nuevo Nombre', 
  'nuevo@email.com'
);

-- 4. Verificar que el trigger funciona creando un usuario de prueba
-- (Esto se haría desde la aplicación, no desde SQL)
*/

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

/*
PROBLEMA SOLUCIONADO:

✅ Tabla profiles creada con estructura correcta
✅ Políticas RLS configuradas para seguridad
✅ Trigger automático para nuevos usuarios
✅ Perfiles creados para usuarios existentes
✅ Función de actualización de perfiles
✅ Índices para optimizar consultas

RESULTADO ESPERADO:

1. Nuevos usuarios tendrán perfiles automáticamente
2. Usuarios existentes ahora tienen perfiles
3. Los mensajes y historial se mantendrán entre sesiones
4. La aplicación funcionará correctamente para todos los usuarios

PRÓXIMOS PASOS:

1. Ejecutar este script en Supabase SQL Editor
2. Verificar que no hay errores en la ejecución
3. Probar con un nuevo usuario (test5)
4. Confirmar que los mensajes persisten entre sesiones
*/