// Script de prueba para verificar la conectividad con Supabase
import { createClient } from '@supabase/supabase-js'

// Cargar variables de entorno
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vhbyafbtdlftyztnuxgd.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYnlhZmJ0ZGxmdHl6dG51eGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzExMzIsImV4cCI6MjA3MTQwNzEzMn0.-emejE3ujxOGWHiYe2sGDzLOhAbRFtQLienyWt4fKE0'

console.log('🔍 Verificando configuración de Supabase...')
console.log('URL:', supabaseUrl)
console.log('Anon Key (primeros 20 chars):', supabaseAnonKey.substring(0, 20) + '...')

// Crear cliente
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Función de prueba
async function testSupabase() {
  try {
    console.log('\n📡 Probando conexión con Supabase...')
    
    // Probar conexión básica
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Error al obtener sesión:', error.message)
      return false
    }
    
    console.log('✅ Conexión exitosa con Supabase')
    console.log('Sesión actual:', data.session ? 'Usuario logueado' : 'Sin sesión')
    
    // Probar registro de prueba
    console.log('\n🧪 Probando registro de usuario de prueba...')
    const testEmail = 'test@gmail.com'
    const testPassword = 'testpassword123'
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:5173/confirm'
      }
    })
    
    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('⚠️ Usuario de prueba ya existe (esto es normal)')
      } else {
        console.error('❌ Error en registro de prueba:', signUpError.message)
        return false
      }
    } else {
      console.log('✅ Registro de prueba exitoso')
      console.log('Usuario creado:', signUpData.user ? 'Sí' : 'No')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Error inesperado:', error.message)
    return false
  }
}

// Ejecutar prueba
testSupabase().then(success => {
  if (success) {
    console.log('\n🎉 Todas las pruebas pasaron. Supabase está configurado correctamente.')
  } else {
    console.log('\n💥 Algunas pruebas fallaron. Revisa la configuración.')
  }
  process.exit(success ? 0 : 1)
})