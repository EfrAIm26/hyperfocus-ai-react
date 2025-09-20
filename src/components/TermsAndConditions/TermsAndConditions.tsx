import React from 'react'
import styles from './TermsAndConditions.module.css'

interface TermsAndConditionsProps {
  onAccept: () => void
  onClose: () => void
}

const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({ onAccept, onClose }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Terms and Conditions</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.termsText}>
            <ul className={styles.termsList}>
              <li>You must be at least 13 years old to use this service.</li>
              <li>You are responsible for maintaining the security of your account and password.</li>
              <li>You agree to use the service only for lawful purposes and not to upload malicious or harmful content.</li>
              <li>We reserve the right to suspend or terminate your account at any time for violating these terms.</li>
              <li>The service is provided "as is" without any warranties of any kind.</li>
              <li>We are not liable for any damages or losses resulting from your use of the service.</li>
              <li>You retain ownership of the content you create, but you grant us a license to operate the service.</li>
              <li>We may modify or update these terms at any time, and your continued use of the service constitutes acceptance of the new terms.</li>
              <li>AI-generated content may contain inaccuracies; you are responsible for verifying important information.</li>
              <li>Your use of the service is subject to our Privacy Policy.</li>
            </ul>
          </div>
        </div>
        
        <div className={styles.footer}>
          <button className={styles.acceptButton} onClick={onAccept}>
            I Accept
          </button>
        </div>
      </div>
    </div>
  )
}

export default TermsAndConditions