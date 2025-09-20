import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import styles from './UpdatePassword.module.css'

interface UpdatePasswordState {
  password: string
  confirmPassword: string
  loading: boolean
  error: string
  success: boolean
  showPassword: boolean
  showConfirmPassword: boolean
}

const UpdatePassword: React.FC = () => {
  const [state, setState] = useState<UpdatePasswordState>({
    password: '',
    confirmPassword: '',
    loading: false,
    error: '',
    success: false,
    showPassword: false,
    showConfirmPassword: false
  })

  useEffect(() => {
    // Check if user has a valid session from password reset
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Redirect to login if no session
        window.location.href = 'https://usehyperfocus.com/'
      }
    }
    checkSession()
  }, [])

  const handleInputChange = (field: keyof UpdatePasswordState, value: string | boolean) => {
    setState(prev => ({ ...prev, [field]: value, error: '' }))
  }

  const togglePasswordVisibility = () => {
    setState(prev => ({ ...prev, showPassword: !prev.showPassword }))
  }

  const toggleConfirmPasswordVisibility = () => {
    setState(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (state.password !== state.confirmPassword) {
      setState(prev => ({ ...prev, error: 'Las contraseñas no coinciden' }))
      return
    }

    if (state.password.length < 6) {
      setState(prev => ({ ...prev, error: 'La contraseña debe tener al menos 6 caracteres' }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: '' }))

    try {
      const { error } = await supabase.auth.updateUser({
        password: state.password
      })

      if (error) throw error

      setState(prev => ({ ...prev, success: true, loading: false }))
      
      // Redirect to main app after successful password update
      setTimeout(() => {
        window.location.href = 'https://usehyperfocus.com/'
      }, 2000)

    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Error al actualizar la contraseña',
        loading: false 
      }))
    }
  }

  if (state.success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>✅ Contraseña Actualizada</h1>
            <p className={styles.subtitle}>Tu contraseña ha sido cambiada exitosamente</p>
          </div>
          <div className={styles.successMessage}>
            <p>Serás redirigido a la aplicación en unos segundos...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>🔒 Actualizar Contraseña</h1>
          <p className={styles.subtitle}>Ingresa tu nueva contraseña</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Nueva Contraseña</label>
            <div className={styles.passwordContainer}>
              <input
                type={state.showPassword ? "text" : "password"}
                className={styles.input}
                value={state.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
              {state.password && (
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={togglePasswordVisibility}
                >
                  {state.showPassword ? '🙈' : '👁️'}
                </button>
              )}
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Confirmar Nueva Contraseña</label>
            <div className={styles.passwordContainer}>
              <input
                type={state.showConfirmPassword ? "text" : "password"}
                className={styles.input}
                value={state.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
              {state.confirmPassword && (
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={toggleConfirmPasswordVisibility}
                >
                  {state.showConfirmPassword ? '🙈' : '👁️'}
                </button>
              )}
            </div>
          </div>

          {state.error && (
            <div className={styles.error}>
              {state.error}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={state.loading}
          >
            {state.loading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default UpdatePassword