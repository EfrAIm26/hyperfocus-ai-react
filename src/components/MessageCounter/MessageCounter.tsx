import React, { useState, useEffect } from 'react';
import { MessageLimitService } from '../../services/messageLimitService';
import { supabase } from '../../supabaseClient';
import styles from './MessageCounter.module.css';

interface MessageCounterProps {
  onLimitReached?: () => void;
}

const MessageCounter: React.FC<MessageCounterProps> = ({ onLimitReached }) => {
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  const loadUsageData = async () => {
    try {
      const usage = await MessageLimitService.getCurrentUsage();
      if (usage) {
        setMessagesRemaining(usage.messagesRemaining);
        setOptimisticCount(null); // Reset optimistic count when real data loads
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

  // Function to optimistically update the counter when a message is sent
  const decrementOptimistically = () => {
    if (messagesRemaining !== null) {
      const currentCount = optimisticCount !== null ? optimisticCount : messagesRemaining;
      const newCount = Math.max(0, currentCount - 1);
      setOptimisticCount(newCount);
      
      if (newCount === 0 && onLimitReached) {
        onLimitReached();
      }
    }
  };

  // Expose the decrement function globally for use by chat components
  React.useEffect(() => {
    (window as any).decrementMessageCounter = decrementOptimistically;
    return () => {
      delete (window as any).decrementMessageCounter;
    };
  }, [messagesRemaining, optimisticCount]);

  const updateTimeUntilReset = () => {
    setTimeUntilReset(MessageLimitService.getTimeUntilReset());
  };

  useEffect(() => {
    loadUsageData();
    updateTimeUntilReset();

    // Update time every minute
    const timeInterval = setInterval(updateTimeUntilReset, 60000);
    
    // Refresh usage every 5 minutes
    const usageInterval = setInterval(loadUsageData, 5 * 60 * 1000);

    // Set up real-time subscription for message usage updates
    const subscription = supabase
      .channel('message_usage_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'daily_message_usage' },
        (payload: any) => {
           console.log('Message usage updated:', payload);
           // Reload usage data when changes are detected
           loadUsageData();
         }
      )
      .subscribe();

    return () => {
      clearInterval(timeInterval);
      clearInterval(usageInterval);
      subscription.unsubscribe();
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

  // Use optimistic count if available, otherwise use real count
  const displayCount = optimisticCount !== null ? optimisticCount : messagesRemaining;

  const getCounterColor = () => {
    if (displayCount === 0) return styles.counterDanger;
    if (displayCount <= 5) return styles.counterWarning;
    return styles.counterNormal;
  };

  const getCounterText = () => {
    if (displayCount === 0) {
      return `Limit reached • Resets in ${timeUntilReset}`;
    }
    if (displayCount === 1) {
      return `${displayCount} message left • Resets in ${timeUntilReset}`;
    }
    return `${displayCount} messages left • Resets in ${timeUntilReset}`;
  };

  return (
    <div className={`${styles.messageCounter} ${getCounterColor()}`}>
      <div className={styles.counterIcon}>
        {displayCount === 0 ? '🚫' : '💬'}
      </div>
      <div className={styles.counterText}>
        {getCounterText()}
      </div>
      {displayCount <= 5 && displayCount > 0 && (
        <div className={styles.betaNote}>
          Beta version - Free usage
        </div>
      )}
    </div>
  );
};

export default MessageCounter;