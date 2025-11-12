// Supabase removed - using Django API only

export const testRLSPolicies = async () => {
  try {
    console.log('🔍 Testing RLS policies...');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ No authenticated user found:', userError);
      return false;
    }

    console.log('🔍 Testing with user:', user.id);
    
    // Try to insert a notification with minimal data (no profile_id)
    const minimalNotification = {
      user_id: user.id,
      type: 'system',
      title: 'RLS Test',
      message: 'Testing RLS policies'
    };

    const { data, error } = await supabase
      .from('notifications' as any)
      .insert(minimalNotification)
      .select('id')
      .single();

    if (error) {
      console.error('❌ RLS policy test failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }

    console.log('✅ RLS policies allow notification creation');
    
    // Clean up
    await supabase
      .from('notifications' as any)
      .delete()
      .eq('id', (data as any).id);
    
    return true;
  } catch (error) {
    console.error('❌ Exception testing RLS policies:', error);
    return false;
  }
};

export const testNotificationsTable = async () => {
  try {
    console.log('🔍 Testing notifications table...');
    
    // Try to query the notifications table
    const { data, error } = await supabase
      .from('notifications' as any)
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('relation "notifications" does not exist')) {
        console.log('❌ Notifications table does not exist');
        return false;
      }
      console.error('❌ Error querying notifications table:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }

    console.log('✅ Notifications table exists and is accessible');
    console.log('📊 Sample data:', data);
    
    // Test table structure by trying to get column info
    const { data: columnData, error: columnError } = await supabase
      .from('notifications' as any)
      .select('id, user_id, type, title, message, read, created_at')
      .limit(0);
    
    if (columnError) {
      console.warn('⚠️ Column structure test failed:', columnError);
    } else {
      console.log('✅ Table structure is valid');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Exception testing notifications table:', error);
    return false;
  }
};

export const testCreateNotification = async () => {
  try {
    console.log('🔍 Testing notification creation...');
    
    // First, get the current user to use a real user_id
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ No authenticated user found:', userError);
      throw new Error('No authenticated user found');
    }

    console.log('🔍 Using user ID:', user.id);
    
    const testNotification = {
      user_id: user.id,
      // Don't include profile_id at all - let it be null by default
      type: 'system',
      title: 'Test Notification',
      message: 'This is a test notification',
      read: false,
      action_url: '/test',
      metadata: { test: true }
    };

    console.log('🔍 Attempting to insert notification:', testNotification);

    const { data, error } = await supabase
      .from('notifications' as any)
      .insert(testNotification)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error creating test notification:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    console.log('✅ Test notification created successfully:', (data as any).id);
    
    // Clean up the test notification
    const { error: deleteError } = await supabase
      .from('notifications' as any)
      .delete()
      .eq('id', (data as any).id);
    
    if (deleteError) {
      console.warn('⚠️ Failed to clean up test notification:', deleteError);
    } else {
      console.log('🧹 Test notification cleaned up');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Exception creating test notification:', error);
    throw error;
  }
};
