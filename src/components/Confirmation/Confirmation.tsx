import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Confirmation.module.css'

const Confirmation: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Wait 2 seconds to let the user read the message, then redirect to home
    const timer = setTimeout(() => {
      navigate('/')
    }, 2000)

    // Cleanup timer on component unmount
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <div className={styles.checkIcon}>✓</div>
        </div>
        <h1 className={styles.title}>Confirmando tu cuenta...</h1>
        <p className={styles.message}>
          Tu cuenta está siendo verificada. Serás redirigido automáticamente en unos segundos.
        </p>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    </div>
  )
}

export default Confirmation