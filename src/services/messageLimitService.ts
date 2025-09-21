import { supabase } from './supabaseClient';

export interface MessageUsage {
  messageCount: number;
  canSendMessage: boolean;
  messagesRemaining: number;
}

export interface MessageLimitResult {
  newCount: number;
  canSendMore: boolean;
  messagesRemaining: number;
}

export class MessageLimitService {
  private static readonly DAILY_LIMIT = 20;
  private static readonly WARNING_THRESHOLD = 15;

  /**
   * Get current daily usage for the authenticated user
   */
  static async getCurrentUsage(): Promise<MessageUsage | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .rpc('get_or_create_daily_usage', { p_user_id: user.id });

      if (error) {
        console.error('Error getting daily usage:', error);
        return null;
      }

      if (data && data.length > 0) {
        const usage = data[0];
        return {
          messageCount: usage.message_count,
          canSendMessage: usage.can_send_message,
          messagesRemaining: usage.messages_remaining
        };
      }

      return null;
    } catch (error) {
      console.error('Error in getCurrentUsage:', error);
      return null;
    }
  }

  /**
   * Check if user can send a message (before sending)
   */
  static async canSendMessage(): Promise<boolean> {
    const usage = await this.getCurrentUsage();
    return usage?.canSendMessage ?? false;
  }

  /**
   * Check if user should see warning (at message 15)
   */
  static async shouldShowWarning(): Promise<boolean> {
    const usage = await this.getCurrentUsage();
    return usage ? usage.messageCount >= this.WARNING_THRESHOLD : false;
  }

  /**
   * Increment message count after sending a message
   */
  static async incrementMessageCount(): Promise<MessageLimitResult | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .rpc('increment_message_count', { p_user_id: user.id });

      if (error) {
        console.error('Error incrementing message count:', error);
        return null;
      }

      if (data && data.length > 0) {
        const result = data[0];
        return {
          newCount: result.new_count,
          canSendMore: result.can_send_more,
          messagesRemaining: result.messages_remaining
        };
      }

      return null;
    } catch (error) {
      console.error('Error in incrementMessageCount:', error);
      return null;
    }
  }

  /**
   * Get limit reached message
   */
  static getLimitReachedMessage(): string {
    return "You've reached your daily limit of 20 messages. Your message quota will reset in 24 hours. Thank you for using our beta version!";
  }

  /**
   * Get warning message (shown at message 15)
   */
  static getWarningMessage(messagesRemaining: number): string {
    return `You have ${messagesRemaining} messages remaining today. Your quota will reset in 24 hours.`;
  }

  /**
   * Get time until reset (for display purposes)
   */
  static getTimeUntilReset(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  /**
   * Check if it's a new day (for client-side reset detection)
   */
  static isNewDay(lastCheckDate: string): boolean {
    const today = new Date().toDateString();
    return lastCheckDate !== today;
  }

  /**
   * Get current date string for storage
   */
  static getCurrentDateString(): string {
    return new Date().toDateString();
  }
}