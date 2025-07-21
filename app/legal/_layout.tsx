import { Stack } from 'expo-router';
import React from 'react';

export default function LegalLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="sms-consent" 
        options={{ 
          title: 'سياسة الموافقة على الرسائل',
          headerTitleAlign: 'center'
        }} 
      />
      <Stack.Screen 
        name="privacy-policy" 
        options={{ 
          title: 'سياسة الخصوصية',
          headerTitleAlign: 'center'
        }} 
      />
      <Stack.Screen 
        name="terms-of-service" 
        options={{ 
          title: 'شروط الخدمة',
          headerTitleAlign: 'center'
        }} 
      />
    </Stack>
  );
}
