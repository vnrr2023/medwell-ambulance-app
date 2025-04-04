"use client"

import { useState, useEffect } from "react"
import {Linking, View, Text, Alert, SafeAreaView, Clipboard, TouchableOpacity } from "react-native"
import MapView, { Polyline, Marker } from "react-native-maps"

import * as Location from "expo-location"
import polyline from "@mapbox/polyline"
import { StatusBar } from "expo-status-bar"
import Loader from "@/components/loader"
import { Phone, Clock, User, AlertCircle, Siren, MapPinned } from "lucide-react-native"
import { Modalize } from "react-native-modalize"
import { GestureHandlerRootView } from "react-native-gesture-handler"

const INITIAL_POLYLINE =
  "g`trBgfn{L{AtA{@|@Db@Lb@pAxBjHyFrIcGfBeAhAi@zA}@xAq@~BuAr@]lBy@~CmAz@QzDeA~Ac@nAWtH}@~BUdFWlDKtAGxDe@~Ce@jDc@b@HDKXK|BYfC@lPR|GBx@@NOXY`@YN{AR}@`A}CNm@Jw@d@wD\\uBECGGGMCO@SHOLMPEN?RHJLFH?Pd@R"

const LiveTrackingMap = () => {
  const [routeCoords, setRouteCoords] = useState<any[]>([])
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<any>(null)
  const [eta, setEta] = useState("12 min")
 
  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        return
      }

      const location = await Location.getCurrentPositionAsync({})
      setDriverLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })
    })()
  }, [])

  useEffect(() => {
    const decodedCoords = polyline.decode(INITIAL_POLYLINE).map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }))
    setRouteCoords(decodedCoords)
  }, [])

  useEffect(() => {
    if (!driverLocation || routeCoords.length === 0) return

    while (routeCoords.length > 1 && getDistance(routeCoords[0], driverLocation) < 5) {
      routeCoords.shift() 
    }
    setRouteCoords([...routeCoords]) 
  }, [driverLocation])

  const handleEnRoute = () => {
    console.log("En route to location")
  }

  const handleReachedLocation = () => {
    console.log("Reached user location")
  }

  const handleFinishRide = () => {
    console.log("Finish ride")
  }

  if (errorMsg)
    return (
      <View>
        <Text>{errorMsg}</Text>
      </View>
    )
  if (!driverLocation)
    return (
      <View className="h-screen">
        <Loader />
      </View>
    )

  return (
    <GestureHandlerRootView className="flex-1 bg-white">
      <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Top Bar */}
      
      <View className="bg-blue-600 px-4 py-3 shadow-md z-10 pt-10">
        
        <Text className="text-white text-2xl font-bold text-center"><Siren color="white"/>Location<Siren color="white"/></Text>
        <View className="flex flex-row justify-center gap-2 p-2">
          <MapPinned color="white"/>
        <Text className="text-white">Bhandarwada Hill Reservoir</Text>
        </View>
      </View>

      {/* Map View */}
      <View className="flex-1 relative">
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="blue" />
          <Marker coordinate={driverLocation} title="Driver" />
        </MapView>
      </View>

      {/* Bottom Bar */}
      <Modalize alwaysOpen={200}
                  adjustToContentHeight
                  scrollViewProps={{
                    scrollEnabled: true,
                    nestedScrollEnabled:true
                  }}
                  >
        <View className="p-2">
        <Text className="text-gray-700 font-medium mb-3 text-lg">Update Journey Status:</Text>
            <View className="flex flex-row justify-between gap-2 p-2">
              <TouchableOpacity onPress={handleEnRoute} className="flex-1 border-2 border-blue-600 py-3 px-2 rounded-lg justify-center">
                <Text className="text-blue-600 font-medium text-center text-xl">En route</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleReachedLocation} className="flex-1 border-2 border-teal-500  py-3 px-2 rounded-lg justify-center">
                <Text className="text-teal-500 font-medium text-center text-xl">Reached User</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleFinishRide} className="flex-1 border-2 border-green-600 py-3 px-2 rounded-lg justify-center">
                <Text className="text-green-600 font-medium text-center text-xl">Finish Ride</Text>
              </TouchableOpacity>
            </View>
            <View className="mb-2"></View>
          </View>
    </Modalize>
     </SafeAreaView>
    </GestureHandlerRootView>
  )
}

// Utility function to calculate distance (Haversine formula)
const getDistance = (pointA: any, pointB: any) => {
  const R = 6371000 // Radius of Earth in meters
  const lat1 = pointA.latitude * (Math.PI / 180)
  const lat2 = pointB.latitude * (Math.PI / 180)
  const dLat = lat2 - lat1
  const dLng = (pointB.longitude - pointA.longitude) * (Math.PI / 180)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

export default LiveTrackingMap

