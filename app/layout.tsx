import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { supabase } from '../supabase/client';

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('=== CHECKING AUTH ===');
        
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        console.log('User found:', !!user);
        
        if (user && !hasNavigated.current) {
          console.log('✅ User logged in, going to feed');
          hasNavigated.current = true;
          router.replace('/(tabs)');
        } else if (!user && !hasNavigated.current) {
          console.log('❌ No user, going to login');
          hasNavigated.current = true;
          router.replace('/login');
        }
        
      } catch (error) {
        console.error('Auth check failed:', error);
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          router.replace('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('⚠️ Timeout - going to login');
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        setLoading(false);
        router.replace('/login');
      }
    }, 3000);

    checkAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      
      if (event === 'SIGNED_IN' && session?.user && !hasNavigated.current) {
        console.log('✅ Sign in detected, going to feed');
        hasNavigated.current = true;
        router.replace('/(tabs)');
      } else if (event === 'SIGNED_OUT' && !hasNavigated.current) {
        console.log('❌ Sign out detected, going to login');
        hasNavigated.current = true;
        router.replace('/login');
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' }}>
        <Text style={{ fontSize: 16, color: '#6b7280' }}>Loading...</Text>
        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Checking authentication...</Text>
        <Pressable 
          style={{ backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 20 }}
          onPress={() => {
            setLoading(false);
            hasNavigated.current = true;
            router.replace('/login');
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Skip to Login</Text>
        </Pressable>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
} 