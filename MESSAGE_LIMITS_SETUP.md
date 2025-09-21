# Message Limits System Setup Guide

## Overview
This system implements daily message limits for the beta launch of Hyperfocus AI. Users are limited to 20 messages per day, with a warning shown at message 15.

## Features Implemented
- ✅ 20 messages per day limit per user
- ✅ Warning message at message 15
- ✅ Automatic blocking after message 20
- ✅ Real-time message counter in UI
- ✅ Daily reset at midnight
- ✅ Secure server-side validation

## Setup Instructions

### 1. Database Setup (Supabase)

**IMPORTANT: You must execute the SQL script in Supabase before the system will work.**

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the entire content from `supabase-setup.sql`
4. Execute the script
5. Verify that the following were created:
   - Table: `daily_message_usage`
   - Functions: `get_or_create_daily_usage`, `increment_message_count`, `cleanup_old_usage_records`
   - RLS policies for security

### 2. Verify Implementation

The following files have been created/modified:

**New Files:**
- `src/services/messageLimitService.ts` - Core service for message limits
- `src/components/MessageCounter/MessageCounter.tsx` - UI component
- `src/components/MessageCounter/MessageCounter.module.css` - Styles
- `supabase-setup.sql` - Database setup script

**Modified Files:**
- `src/components/ChatWindow/ChatWindow.tsx` - Integrated limit checking
- `src/components/ChatWindow/ChatWindow.module.css` - Added header center styles

### 3. Testing the System

1. **Test Normal Usage:**
   - Send messages normally (should work up to 20)
   - Verify counter updates in real-time

2. **Test Warning (Message 15):**
   - Send 15 messages
   - Verify warning appears after the 15th message

3. **Test Limit (Message 20):**
   - Send 20 messages
   - Verify blocking message appears
   - Try to send another message (should be blocked)

4. **Test Reset:**
   - Wait until next day OR manually update the database date
   - Verify counter resets to 20

### 4. Manual Database Testing (Optional)

```sql
-- Check current usage for a user
SELECT * FROM get_or_create_daily_usage('USER_ID_HERE');

-- Manually increment count for testing
SELECT * FROM increment_message_count('USER_ID_HERE');

-- View all usage records
SELECT * FROM daily_message_usage ORDER BY created_at DESC;

-- Reset a user's count for testing (change date to yesterday)
UPDATE daily_message_usage 
SET usage_date = CURRENT_DATE - INTERVAL '1 day'
WHERE user_id = 'USER_ID_HERE' AND usage_date = CURRENT_DATE;
```

### 5. Configuration

The limits are configured in `messageLimitService.ts`:

```typescript
private static readonly DAILY_LIMIT = 20;
private static readonly WARNING_THRESHOLD = 15;
```

To change limits, modify these values and redeploy.

### 6. Monitoring & Maintenance

**Database Cleanup:**
Run this periodically to clean old records:
```sql
SELECT cleanup_old_usage_records();
```

**Usage Analytics:**
```sql
-- Daily usage stats
SELECT 
  usage_date,
  COUNT(*) as active_users,
  AVG(message_count) as avg_messages,
  SUM(message_count) as total_messages
FROM daily_message_usage 
WHERE usage_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY usage_date
ORDER BY usage_date DESC;
```

## Security Features

- **Row Level Security (RLS):** Users can only access their own usage data
- **Server-side validation:** All limits enforced in Supabase functions
- **No client-side bypassing:** Limits cannot be circumvented from frontend

## Error Handling

- If Supabase is unavailable, users can still send messages (graceful degradation)
- All errors are logged to console for debugging
- UI shows appropriate fallback states

## Beta Launch Notes

- System is configured for free beta usage
- Messages clearly indicate "beta version"
- All text is in English as requested
- Counter shows time until reset for user clarity

## Troubleshooting

**Issue: Counter not showing**
- Check browser console for errors
- Verify Supabase connection
- Ensure SQL script was executed

**Issue: Limits not enforcing**
- Check RLS policies are enabled
- Verify user authentication
- Check function execution in Supabase logs

**Issue: Counter shows wrong number**
- Check system timezone settings
- Verify database date/time configuration
- Clear browser cache and reload

---

**Ready for Beta Launch! 🚀**

The system is now configured for your YouTube beta launch with proper message limits and user-friendly messaging.