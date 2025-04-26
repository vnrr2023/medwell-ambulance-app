import { useState, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput } from "react-native"
import MapView, { Marker } from "react-native-maps"
import * as Location from "expo-location"
import axios from "axios"
import { StatusBar } from "expo-status-bar"
import { ngrok_url } from "@/data/id"
import { useLocalSearchParams, router } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Image } from 'expo-image';

export default function DropoffLocationPicker() {
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  // Properly type the mapRef to match MapView
  const mapRef = useRef<MapView | null>(null)
  const { bookingId } = useLocalSearchParams()

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        return
      }

      const currentLocation = await Location.getCurrentPositionAsync({})
      setLocation(currentLocation.coords)

      // Set initial region to user's current location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        })
      }
    })()
  }, [])

  // Handle map marker drag
  const handleMapPress = (event: any) => {
    const { coordinate } = event.nativeEvent
    setSelectedLocation({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    })
  }

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      const locationResult = await Location.geocodeAsync(searchQuery)
      if (locationResult.length > 0) {
        const { latitude, longitude } = locationResult[0]
        setSelectedLocation({ latitude, longitude })

        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          })
        }
      }
    } catch (error) {
      console.error("Error searching location:", error)
      setErrorMsg("Failed to search location")
    }
  }

  const submitDropoffLocation = async () => {
    if (!selectedLocation) {
      setErrorMsg("Please select a dropoff location first")
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const response = await axios.post(ngrok_url + "/ambulance/set-dropoff-location", {
        lat: selectedLocation.latitude,
        lon: selectedLocation.longitude,
        bookingId,
      })

      const { gmapsUrl } = response.data
      console.log("Google Maps URL:", gmapsUrl)

      // Store the URL in AsyncStorage for the main map to access
      try {
        await AsyncStorage.setItem(`gmapsUrl_${bookingId}`, gmapsUrl)
        console.log("Stored Google Maps URL in AsyncStorage")
      } catch (storageError) {
        console.error("Error storing Google Maps URL:", storageError)
      }

      // Navigate back to the previous screen
      setLoading(false)
      router.back()
    } catch (error) {
      console.error("Error setting dropoff location:", error)
      setErrorMsg("Failed to set dropoff location. Please try again.")
      setLoading(false)
    }
  }

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
        style={{ flex: 1, width: "100%", height: "100%" }}
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
            <TouchableOpacity className="p-2" onPress={() => setSearchQuery("")}>
              <Image
                source={require("./../../assets/icons/x.svg")}
                style={{ width: 20, height: 20, tintColor: "#666" }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity className="p-2 ml-1" onPress={handleSearch}>
          <Image
            source={require("./../../assets/icons/search.svg")}
            style={{ width: 20, height: 20, tintColor: "#666" }}
            resizeMode="contain"
          />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="absolute inset-0 bg-black/70 justify-center items-center z-20">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-white text-lg mt-4 font-bold">Setting drop-off location...</Text>
        </View>
      ) : (
        <TouchableOpacity
          className={`absolute bottom-8 self-center bg-blue-500 py-4 px-8 rounded-full ${!selectedLocation ? "bg-gray-400" : ""}`}
          onPress={submitDropoffLocation}
          disabled={!selectedLocation}
        >
          <Text className="text-white font-bold text-base">Confirm Dropoff Location</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
