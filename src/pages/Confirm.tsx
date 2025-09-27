import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import styles from './Confirm.module.css'

interface ConfirmState {
  loading: boolean
  error: string | null
  success: boolean
}

const Confirm: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [state, setState] = useState<ConfirmState>({
    loading: true,
    error: null,
    success: false
  })

  useEffect(() => {
    const confirmUser = async () => {
      try {
        // Obtener los parámetros de la URL
        const access_token = searchParams.get('access_token')
        const refresh_token = searchParams.get('refresh_token')
        const type = searchParams.get('type')

        console.log('🔍 Parámetros de confirmación:', { access_token: !!access_token, refresh_token: !!refresh_token, type })

        // Si no hay tokens, intentar obtenerlos del hash (formato alternativo)
        if (!access_token || !refresh_token) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const hashAccessToken = hashParams.get('access_token')
          const hashRefreshToken = hashParams.get('refresh_token')
          
          if (hashAccessToken && hashRefreshToken) {
            console.log('🔍 Tokens encontrados en hash')
            await handleTokens(hashAccessToken, hashRefreshToken)
            return
          }
        }

        // Si tenemos tokens en los parámetros de búsqueda
        if (access_token && refresh_token) {
          console.log('🔍 Tokens encontrados en search params')
          await handleTokens(access_token, refresh_token)
          return
        }

        // Si es una confirmación de email sin tokens explícitos
        if (type === 'signup') {
          console.log('🔍 Confirmación de signup detectada')
          // Verificar si el usuario ya está autenticado
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            setState({ loading: false, error: null, success: true })
            setTimeout(() => navigate('/'), 2000)
            return
          }
        }

        // Si llegamos aquí, no pudimos confirmar
        setState({ 
          loading: false, 
          error: 'No se pudieron encontrar los tokens de confirmación. Por favor, verifica el enlace del email.', 
          success: false 
        })

      } catch (error) {
        console.error('❌ Error en confirmación:', error)
        setState({ 
          loading: false, 
          error: 'Ocurrió un error durante la confirmación. Por favor, intenta nuevamente.', 
          success: false 
        })
      }
    }

    const handleTokens = async (accessToken: string, refreshToken: string) => {
      try {
        console.log('🔐 Estableciendo sesión con tokens...')
        
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (error) {
          console.error('❌ Error al establecer sesión:', error)
          setState({ 
            loading: false, 
            error: `Error de autenticación: ${error.message}`, 
            success: false 
          })
          return
        }

        if (data.session?.user) {
          console.log('✅ Usuario confirmado exitosamente:', data.session.user.email)
          setState({ loading: false, error: null, success: true })
          
          // Redirigir después de 2 segundos
          setTimeout(() => {
            navigate('/')
          }, 2000)
        } else {
          setState({ 
            loading: false, 
            error: 'No se pudo establecer la sesión. Por favor, intenta iniciar sesión manualmente.', 
            success: false 
          })
        }
      } catch (error) {
        console.error('❌ Error al manejar tokens:', error)
        setState({ 
          loading: false, 
          error: 'Error inesperado durante la confirmación.', 
          success: false 
        })
      }
    }

    confirmUser()
  }, [navigate, searchParams])

  const handleRetry = () => {
    setState({ loading: true, error: null, success: false })
    window.location.reload()
  }

  const handleGoToLogin = () => {
    navigate('/auth')
  }

  if (state.loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Hyperfocus AI</h1>
            <p className={styles.subtitle}>Confirmando tu cuenta</p>
          </div>
          
          <div className={styles.content}>
            <div className={styles.spinner}></div>
            <h2 className={styles.message}>Confirmando tu cuenta...</h2>
            <p className={styles.description}>
              Por favor espera mientras verificamos tu email y activamos tu cuenta.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (state.success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Hyperfocus AI</h1>
            <p className={styles.subtitle}>¡Cuenta confirmada!</p>
          </div>
          
          <div className={styles.content}>
            <div className={styles.successIcon}>✅</div>
            <h2 className={styles.message}>¡Bienvenido a Hyperfocus AI!</h2>
            <p className={styles.description}>
              Tu cuenta ha sido confirmada exitosamente. Serás redirigido automáticamente...
            </p>
            <div className={styles.redirectInfo}>
              Redirigiendo en unos segundos...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Hyperfocus AI</h1>
          <p className={styles.subtitle}>Error de confirmación</p>
        </div>
        
        <div className={styles.content}>
          <div className={styles.errorIcon}>❌</div>
          <h2 className={styles.message}>No se pudo confirmar tu cuenta</h2>
          <p className={styles.description}>
            {state.error}
          </p>
          
          <div className={styles.actions}>
            <button 
              className={styles.primaryButton}
              onClick={handleRetry}
            >
              Intentar nuevamente
            </button>
            <button 
              className={styles.secondaryButton}
              onClick={handleGoToLogin}
            >
              Ir al login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Confirm