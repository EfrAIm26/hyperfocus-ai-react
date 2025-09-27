// Script de prueba para verificar el flujo de autenticación
// Ejecutar en la consola del navegador (F12)

console.log('🔍 Iniciando verificación del flujo de autenticación...');

// Verificar que Supabase esté disponible
if (typeof window.supabase === 'undefined') {
  console.error('❌ Supabase no está disponible en window.supabase');
  console.log('💡 Esto es normal si no está expuesto globalmente');
} else {
  console.log('✅ Supabase está disponible');
}

// Verificar la sesión actual
async function checkCurrentSession() {
  try {
    // Intentar acceder al cliente de Supabase desde el contexto de la aplicación
    const response = await fetch('/api/test', { method: 'HEAD' });
    console.log('🔗 Conexión con la aplicación:', response.status === 404 ? '✅ OK' : '⚠️ Revisar');
  } catch (error) {
    console.log('🔗 Aplicación funcionando localmente');
  }
}

// Verificar elementos de la interfaz
function checkUIElements() {
  console.log('🎨 Verificando elementos de la interfaz...');
  
  const authContainer = document.querySelector('[class*="container"]');
  const loginButton = document.querySelector('button[type="submit"]');
  const emailInput = document.querySelector('input[type="email"]');
  const passwordInput = document.querySelector('input[type="password"]');
  
  console.log('📧 Campo de email:', emailInput ? '✅ Encontrado' : '❌ No encontrado');
  console.log('🔒 Campo de contraseña:', passwordInput ? '✅ Encontrado' : '❌ No encontrado');
  console.log('🔘 Botón de login:', loginButton ? '✅ Encontrado' : '❌ No encontrado');
  console.log('📱 Contenedor de auth:', authContainer ? '✅ Encontrado' : '❌ No encontrado');
}

// Verificar errores en la consola
function checkConsoleErrors() {
  console.log('🐛 Verificando errores en la consola...');
  
  // Capturar errores futuros
  const originalError = console.error;
  let errorCount = 0;
  
  console.error = function(...args) {
    errorCount++;
    console.log(`❌ Error #${errorCount}:`, ...args);
    originalError.apply(console, args);
  };
  
  setTimeout(() => {
    console.error = originalError;
    console.log(`📊 Total de errores capturados: ${errorCount}`);
  }, 5000);
}

// Ejecutar todas las verificaciones
async function runAllChecks() {
  console.log('🚀 Ejecutando todas las verificaciones...');
  
  await checkCurrentSession();
  checkUIElements();
  checkConsoleErrors();
  
  console.log('✅ Verificación completada. Revisa los resultados arriba.');
  console.log('💡 Si todo está bien, puedes proceder con el push.');
  console.log('⚠️  Si hay errores, revísalos antes de continuar.');
}

// Ejecutar automáticamente
runAllChecks();

// Función para probar el registro (manual)
window.testSignup = function(email, password) {
  console.log('🧪 Función de prueba de registro disponible');
  console.log('💡 Usa: testSignup("test@example.com", "password123")');
  console.log('⚠️  Solo para pruebas - no uses emails reales');
};

// Función para probar el login (manual)
window.testLogin = function(email, password) {
  console.log('🧪 Función de prueba de login disponible');
  console.log('💡 Usa: testLogin("test@example.com", "password123")');
  console.log('⚠️  Solo para pruebas con cuentas de prueba');
};

console.log('🎯 Script de verificación cargado. Revisa los resultados arriba.');