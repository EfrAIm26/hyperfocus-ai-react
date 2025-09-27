-- Script #4B: Solución de Emergencia para Perfiles
-- Usar SOLO si el script principal (4-fix-profiles-creation.sql) falla
-- Este script es más agresivo y limpia problemas existentes

-- =====================================================
-- PASO 1: LIMPIAR ESTADO PROBLEMÁTICO
-- =====================================================

-- Eliminar tabla profiles si existe y tiene problemas
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =====================================================
-- PASO 2: RECREAR TABLA PROFILES LIMPIA
-- =====================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PASO 3: CONFIGURAR SEGURIDAD
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- PASO 4: FUNCIÓN PARA NUEVOS USUARIOS
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
  );

  -- Crear registro inicial de uso para el nuevo usuario
  INSERT INTO public.daily_message_usage (user_id, usage_date, message_count)
  VALUES (NEW.id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log del error pero no fallar
    RAISE WARNING 'Error en handle_new_user para %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- =====================================================
-- PASO 5: RECREAR TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PASO 6: CREAR PERFILES PARA USUARIOS EXISTENTES
-- =====================================================

-- Insertar perfiles uno por uno para evitar conflictos
DO $$
DECLARE
    user_record RECORD;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Creando perfiles para usuarios existentes...';
    
    FOR user_record IN 
        SELECT 
            u.id,
            COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Usuario') as full_name,
            u.email,
            u.created_at
        FROM auth.users u
        ORDER BY u.created_at
    LOOP
        BEGIN
            INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
            VALUES (
                user_record.id,
                user_record.full_name,
                user_record.email,
                user_record.created_at,
                NOW()
            );
            
            success_count := success_count + 1;
            RAISE NOTICE 'Perfil creado: % (%)', user_record.email, user_record.id;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE NOTICE 'Error con usuario %: %', user_record.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Resumen: % perfiles creados exitosamente, % errores', success_count, error_count;
END $$;

-- =====================================================
-- PASO 7: CREAR ÍNDICES
-- =====================================================

CREATE INDEX idx_profiles_email ON public.profiles(email) WHERE email IS NOT NULL;
CREATE INDEX idx_profiles_full_name ON public.profiles(full_name) WHERE full_name IS NOT NULL;

-- =====================================================
-- PASO 8: VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
  profiles_count INTEGER;
  users_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_count FROM auth.users;
  SELECT COUNT(*) INTO profiles_count FROM public.profiles;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '🔧 SCRIPT DE EMERGENCIA COMPLETADO';
  RAISE NOTICE '================================================';
  RAISE NOTICE '👥 Usuarios totales: %', users_count;
  RAISE NOTICE '📋 Perfiles creados: %', profiles_count;
  
  IF users_count = profiles_count THEN
    RAISE NOTICE '✅ ÉXITO: Todos los usuarios tienen perfiles';
  ELSE
    RAISE NOTICE '⚠️  Diferencia: % usuarios sin perfil', (users_count - profiles_count);
  END IF;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '💡 Próximos pasos:';
  RAISE NOTICE '   1. Probar registro de nuevo usuario';
  RAISE NOTICE '   2. Verificar que test4 puede usar la app';
  RAISE NOTICE '   3. Confirmar persistencia de mensajes';
  RAISE NOTICE '================================================';
END;
$$;

-- =====================================================
-- COMANDOS DE PRUEBA
-- =====================================================

/*
-- Verificar que todo está bien:
SELECT COUNT(*) as total_users FROM auth.users;
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- Ver usuarios específicos:
SELECT p.id, p.full_name, p.email, p.created_at 
FROM public.profiles p 
ORDER BY p.created_at DESC 
LIMIT 10;

-- Verificar test4 específicamente:
SELECT u.email, p.full_name, p.created_at as profile_created
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email LIKE '%test4%';
*/