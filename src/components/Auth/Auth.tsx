import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import TermsAndConditions from '../TermsAndConditions/TermsAndConditions'
import styles from './Auth.module.css'

type AuthMode = 'login' | 'signup' | 'verify-email' | 'forgot-password'

interface AuthState {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  agreeToTerms: boolean
  loading: boolean
  error: string | null
  showPassword: boolean
  showConfirmPassword: boolean
  resetEmailSent: boolean
  showTermsModal: boolean
}

const Auth: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('login')
  const [state, setState] = useState<AuthState>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    agreeToTerms: false,
    loading: false,
    error: null,
    showPassword: false,
    showConfirmPassword: false,
    resetEmailSent: false,
    showTermsModal: false
  })

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // Check if this is a password reset flow
        const type = searchParams.get('type')
        if (type === 'recovery') {
          // Redirect to update password page
          navigate('/update-password')
          return
        }
        // User is already logged in, redirect will be handled by App.tsx
        return
      }
    }
    checkUser()
  }, [navigate, searchParams])

  const handleInputChange = (field: keyof AuthState, value: string | boolean) => {
    setState(prev => ({ ...prev, [field]: value }))
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.agreeToTerms) {
      setState(prev => ({ ...prev, error: 'You must agree to the Terms and Conditions' }))
      return
    }

    if (state.password !== state.confirmPassword) {
      setState(prev => ({ ...prev, error: 'Passwords do not match' }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Use production URL for email confirmation to avoid localhost issues
      const confirmationUrl = 'https://usehyperfocus.com/'
      
      const { error } = await supabase.auth.signUp({
        email: state.email,
        password: state.password,
        options: {
          data: {
            full_name: state.fullName
          },
          emailRedirectTo: confirmationUrl
        }
      })

      if (error) {
        setState(prev => ({ ...prev, error: error.message, loading: false }))
      } else {
        setMode('verify-email')
        setState(prev => ({ ...prev, loading: false }))
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'An unexpected error occurred', loading: false }))
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Use production URL for password reset to avoid localhost issues
      const redirectUrl = 'https://usehyperfocus.com/?type=recovery'
      
      const { error } = await supabase.auth.resetPasswordForEmail(state.email, {
        redirectTo: redirectUrl
      })

      if (error) {
        setState(prev => ({ ...prev, error: error.message, loading: false }))
      } else {
        setState(prev => ({ ...prev, resetEmailSent: true, loading: false }))
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'An unexpected error occurred', loading: false }))
    }
  }

  const togglePasswordVisibility = () => {
    setState(prev => ({ ...prev, showPassword: !prev.showPassword }))
  }

  const toggleConfirmPasswordVisibility = () => {
    setState(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: state.email,
        password: state.password
      })

      if (error) {
        setState(prev => ({ ...prev, error: error.message, loading: false }))
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'An unexpected error occurred', loading: false }))
    }
  }

  const renderVerifyEmail = () => (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Hyperfocus AI</h1>
          <p className={styles.subtitle}>Your intelligent study assistant</p>
        </div>
        
        <div className={styles.verifyContent}>
          <div className={styles.verifyIcon}>📧</div>
          <h2 className={styles.verifyTitle}>Check your email</h2>
          <p className={styles.verifyText}>
            We've sent a verification link to <strong>{state.email}</strong>
          </p>
          <p className={styles.verifySubtext}>
            Please check your inbox and click the link to activate your account.
          </p>
          
          <button 
            className={styles.linkButton}
            onClick={() => setMode('login')}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  )

  const renderForgotPassword = () => (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Hyperfocus AI</h1>
          <p className={styles.subtitle}>Your intelligent study assistant</p>
        </div>
        
        {state.resetEmailSent ? (
          <div className={styles.verifyContent}>
            <div className={styles.verifyIcon}>📧</div>
            <h2 className={styles.verifyTitle}>Check your email</h2>
            <p className={styles.verifyText}>
              If the email exists, you'll receive a link to reset your password.
            </p>
            <p className={styles.verifySubtext}>
              Please check your inbox and follow the instructions.
            </p>
            
            <button 
              className={styles.linkButton}
              onClick={() => setMode('login')}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <>
            <h2 className={styles.formTitle}>Reset Password</h2>
            <form onSubmit={handleForgotPassword} className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  className={styles.input}
                  value={state.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
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
                {state.loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div className={styles.switchMode}>
              <p>
                Remember your password?{' '}
                <button
                  className={styles.linkButton}
                  onClick={() => setMode('login')}
                >
                  Back to Login
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )

  const renderAuthForm = () => (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Hyperfocus AI</h1>
          <p className={styles.subtitle}>Your intelligent study assistant</p>
        </div>

        <div className={styles.toggleButtons}>
          <button
            className={`${styles.toggleButton} ${mode === 'login' ? styles.active : ''}`}
            onClick={() => setMode('login')}
          >
            Log In
          </button>
          <button
            className={`${styles.toggleButton} ${mode === 'signup' ? styles.active : ''}`}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={mode === 'signup' ? handleSignUp : handleSignIn} className={styles.form}>
          {mode === 'signup' && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Full Name</label>
              <input
                type="text"
                className={styles.input}
                value={state.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              value={state.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.passwordContainer}>
              <input
                type={state.showPassword ? "text" : "password"}
                className={styles.input}
                value={state.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="••••••••"
                required
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

          {mode === 'signup' && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Confirm Password</label>
              <div className={styles.passwordContainer}>
                <input
                  type={state.showConfirmPassword ? "text" : "password"}
                  className={styles.input}
                  value={state.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  required
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
          )}

          {mode === 'signup' && (
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={state.agreeToTerms}
                  onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                  required
                />
                <span className={styles.checkboxText}>
                  I agree to the{' '}
                  <button
                    type="button"
                    className={styles.termsLink}
                    onClick={() => setState(prev => ({ ...prev, showTermsModal: true }))}
                  >
                    Terms and Conditions
                  </button>
                </span>
              </label>
            </div>
          )}

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
            {state.loading ? 'Loading...' : (mode === 'signup' ? 'Create Account' : 'Log In')}
          </button>
        </form>

        {mode === 'login' && (
          <div className={styles.forgotPassword}>
            <button
              className={styles.linkButton}
              onClick={() => setMode('forgot-password')}
            >
              Forgot your password?
            </button>
          </div>
        )}

        <div className={styles.switchMode}>
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                className={styles.linkButton}
                onClick={() => setMode('signup')}
              >
                Sign up here
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                className={styles.linkButton}
                onClick={() => setMode('login')}
              >
                Log in here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )

  if (mode === 'verify-email') {
    return renderVerifyEmail()
  }

  if (mode === 'forgot-password') {
    return renderForgotPassword()
  }

  return (
    <>
      {renderAuthForm()}
      
      {state.showTermsModal && (
        <TermsAndConditions
          onAccept={() => {
            setState(prev => ({ 
              ...prev, 
              showTermsModal: false, 
              agreeToTerms: true 
            }))
          }}
          onClose={() => setState(prev => ({ ...prev, showTermsModal: false }))}
        />
      )}
    </>
  )
}

export default Auth