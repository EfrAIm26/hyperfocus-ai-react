import React, { useState, useEffect } from 'react';
import { MessageLimitService } from '../../services/messageLimitService';
import styles from './MessageCounter.module.css';

interface MessageCounterProps {
  onLimitReached?: () => void;
}

const MessageCounter: React.FC<MessageCounterProps> = ({ onLimitReached }) => {
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  const loadUsageData = async () => {
    try {
      const usage = await MessageLimitService.getCurrentUsage();
      if (usage) {
        setMessagesRemaining(usage.messagesRemaining);
        if (usage.messagesRemaining === 0 && onLimitReached) {
          onLimitReached();
        }
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTimeUntilReset = () => {
    setTimeUntilReset(MessageLimitService.getTimeUntilReset());
  };

  useEffect(() => {
    loadUsageData();
    updateTimeUntilReset();

    // Update time every minute
    const timeInterval = setInterval(updateTimeUntilReset, 60000);

    // Refresh usage data every 5 minutes
    const usageInterval = setInterval(loadUsageData, 300000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(usageInterval);
    };
  }, []);

  // Refresh when component receives focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      loadUsageData();
      updateTimeUntilReset();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  if (messagesRemaining === null) {
    return null; // Don't show if we couldn't load data
  }

  const getCounterColor = () => {
    if (messagesRemaining === 0) return styles.counterDanger;
    if (messagesRemaining <= 5) return styles.counterWarning;
    return styles.counterNormal;
  };

  const getCounterText = () => {
    if (messagesRemaining === 0) {
      return `Limit reached • Resets in ${timeUntilReset}`;
    }
    if (messagesRemaining === 1) {
      return `${messagesRemaining} message left • Resets in ${timeUntilReset}`;
    }
    return `${messagesRemaining} messages left • Resets in ${timeUntilReset}`;
  };

  return (
    <div className={`${styles.messageCounter} ${getCounterColor()}`}>
      <div className={styles.counterIcon}>
        {messagesRemaining === 0 ? '🚫' : '💬'}
      </div>
      <div className={styles.counterText}>
        {getCounterText()}
      </div>
      {messagesRemaining <= 5 && messagesRemaining > 0 && (
        <div className={styles.betaNote}>
          Beta version - Free usage
        </div>
      )}
    </div>
  );
};

export default MessageCounter;