import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, Platform, TextInput } from 'react-native';
import MapView, { Marker, MapViewProps, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { StatusBar } from 'expo-status-bar';
import { ngrok_url } from '@/data/id';
import { useLocalSearchParams } from 'expo-router';
import { Search, X } from 'lucide-react-native';

export default function DropoffLocationPicker() {
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  
  // Properly type the mapRef to match MapView
  const mapRef = useRef<MapView | null>(null);
  const { bookingId } = useLocalSearchParams();
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);
      
      // Set initial region to user's current location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    })();
  }, []);

  // Handle map marker drag
  const handleMapPress = (event: any) => {
    const { coordinate } = event.nativeEvent;
    setSelectedLocation({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const locationResult = await Location.geocodeAsync(searchQuery);
      if (locationResult.length > 0) {
        const { latitude, longitude } = locationResult[0];
        setSelectedLocation({ latitude, longitude });
        
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
        }
      }
    } catch (error) {
      console.error('Error searching location:', error);
      setErrorMsg('Failed to search location');
    }
  };

  const submitDropoffLocation = async () => {
    if (!selectedLocation) {
      setErrorMsg('Please select a dropoff location first');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      
      const response = await axios.post(ngrok_url+'/ambulance/set-dropoff-location', {
        lat: selectedLocation.latitude,
        lon: selectedLocation.longitude,
        bookingId,
      });

      const { gmapsUrl } = response.data;
      console.log(gmapsUrl)
      setRedirectUrl(gmapsUrl);
      
      // Open Google Maps
      Linking.openURL(gmapsUrl);
      
      // Start countdown for manual redirect
      let countdown = 5;
      setRedirectCountdown(countdown);
      
      const timer = setInterval(() => {
        countdown -= 1;
        setRedirectCountdown(countdown);
        
        if (countdown <= 0) {
          clearInterval(timer);
        }
      }, 1000);
    } catch (error) {
      console.error('Error setting dropoff location:', error);
      setErrorMsg('Failed to set dropoff location. Please try again.');
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 5000); // Keep loading indicator for at least 5 seconds
    }
  };

  // Handle manual redirect
  const handleManualRedirect = () => {
    if (redirectUrl) {
      Linking.openURL(redirectUrl);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="auto" />
      
      {errorMsg ? (
        <View className="absolute top-16 self-center bg-red-600/70 p-2.5 rounded z-10">
          <Text className="text-white font-bold">{errorMsg}</Text>
        </View>
      ) : null}
      
      <MapView
        ref={mapRef}
        style={{ flex: 1, width: '100%', height: '100%' }}
        initialRegion={{
          latitude: location?.latitude || 18.9584,  
          longitude: location?.longitude || 72.8199,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onPress={handleMapPress}
      >
        {selectedLocation && (
          <Marker
            coordinate={{
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
            }}
            draggable
            onDragEnd={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
            title="Dropoff Location"
            description="Drag to adjust"
          />
        )}
      </MapView>
      
      {/* Search bar as overlay on top of the map */}
      <View className="absolute top-12 left-2.5 right-2.5 z-10">
        <View className="flex-row items-center bg-white rounded-lg border border-gray-300 px-2 shadow-md">
          <TextInput
            className="flex-1 py-2.5 px-3"
            placeholder="Search for a location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              className="p-2" 
              onPress={() => setSearchQuery('')}
            >
              <X size={20} color="#666" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            className="p-2 ml-1" 
            onPress={handleSearch}
          >
            <Search size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
      
      {loading ? (
        <View className="absolute inset-0 bg-black/70 justify-center items-center z-20">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-white text-lg mt-4 font-bold">
            Redirecting to Google Maps...
          </Text>
          
          {redirectCountdown !== null && redirectCountdown > 0 ? (
            <Text className="text-white text-base mt-2">
              Automatic redirect in {redirectCountdown}s
            </Text>
          ) : redirectUrl ? (
            <TouchableOpacity 
              className="mt-5 bg-white/30 p-3 rounded-lg"
              onPress={handleManualRedirect}
            >
              <Text className="text-white font-bold">
                Tap here if Google Maps didn't open
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <TouchableOpacity
          className={`absolute bottom-8 self-center bg-blue-500 py-4 px-8 rounded-full ${!selectedLocation ? 'bg-gray-400' : ''}`}
          onPress={submitDropoffLocation}
          disabled={!selectedLocation}
        >
          <Text className="text-white font-bold text-base">Confirm Dropoff Location</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}