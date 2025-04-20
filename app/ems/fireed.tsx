import React, { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { View, Text } from 'lucide-react-native';

export default function firedd(){
    const [tokensss, setTokensss]=useState("")
  useEffect(() => {
    requestPermission();
    getToken();

    const unsubscribe = messaging().onTokenRefresh(token => {
      console.log('New FCM Token:', token);
    });

    return unsubscribe;
  }, []);

  const requestPermission = async () => {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
    } else {
      Alert.alert('Permission denied', 'Enable notifications from settings');
    }
  };

  const getToken = async () => {
    const fcmToken = await messaging().getToken();

    if (fcmToken) {
      console.log('FCM Token:', fcmToken);
    } else {
      console.log('No token received');
    }
  };

  return (
   <View>
    <Text>HELLLO {tokensss && tokensss}</Text>
   </View>
  )
}

