import React, { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { View, Text } from 'react-native';

export default function Firedd() {
  const [expoPushToken, setExpoPushToken] = useState('');

  useEffect(() => {
    console.log('Registering for push notifications...');
    registerForPushNotificationsAsync();
  }, []);

  async function registerForPushNotificationsAsync() {
    try {
      if (!Device.isDevice) {
        alert('Must use physical device for Push Notifications');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
      console.log(projectId)
      if (!projectId) {
        throw new Error('No projectId found in expo constants.');
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;

      console.log('Expo Push Token:', token);
      setExpoPushToken(token);

      // send token to your backend here
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 16, marginBottom: 10 }}>HELLO</Text>
      {expoPushToken ? (
        <Text selectable={true}>Token: {expoPushToken}</Text>
      ) : (
        <Text>Fetching push token...</Text>
      )}
    </View>
  );
}
