"use client"

import React from "react"

import { useState, useEffect, useRef } from "react"
import { View, Text, SafeAreaView, TouchableOpacity, Image, Animated, Linking } from "react-native"
import MapView, { Polyline, Marker } from "react-native-maps"
import * as Location from "expo-location"
import polyline from "@mapbox/polyline"
import { StatusBar } from "expo-status-bar"
import Loader from "@/components/loader"
import { Siren, MapPinned, ChevronRight, Navigation } from "lucide-react-native"
import { Modalize } from "react-native-modalize"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import axios from "axios"
import { ngrok_url } from "@/data/id"
import { Link, useLocalSearchParams, useFocusEffect } from "expo-router"
import * as turf from "@turf/turf"
import AsyncStorage from "@react-native-async-storage/async-storage"

const domain = ngrok_url.replace(/^https?:\/\//, "")
const WEBSOCKET_URL = `ws://${domain}/send-real-time-location`

const LiveTrackingMap = () => {
  const [routeCoords, setRouteCoords] = useState<any[]>([])
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<any>(null)
  const [activeStatus, setActiveStatus] = useState<string>("EN_ROUTE")
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [dropOffEnabled, setDropOffEnabled] = useState<boolean>(false)
  const wsRef = useRef<WebSocket | null>(null)
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null)
  const params = useLocalSearchParams()
  const bookingId = params.bookingId as string
  const pickupLat = params.pickupLat as string
  const pickupLon = params.pickupLon as string
  const routeToCustomer = params.routeToCustomer as string

  const dropOffModalRef = useRef<Modalize>(null)

  const [prevCoords, setPrevCoords] = useState<any>(null)
  const animatedValueX = useRef(new Animated.Value(0)).current
  const animatedValueY = useRef(new Animated.Value(0)).current
  const markerCoordinate = useRef({
    latitude: 0,
    longitude: 0,
  }).current

  const [googleMapsUrl, setGoogleMapsUrl] = useState<string | null>(null)

  // Check for Google Maps URL in AsyncStorage when the component mounts or comes into focus
  const checkForGoogleMapsUrl = async () => {
    try {
      const storedUrl = await AsyncStorage.getItem(`gmapsUrl_${bookingId}`)
      if (storedUrl) {
        console.log("Retrieved Google Maps URL from AsyncStorage:", storedUrl)
        setGoogleMapsUrl(storedUrl)
      }
    } catch (error) {
      console.error("Error retrieving Google Maps URL:", error)
    }
  }

  useEffect(() => {
    checkForGoogleMapsUrl()
  }, [bookingId])

  // Also check when the screen comes into focus (after returning from the drop-off picker)
  useFocusEffect(
    React.useCallback(() => {
      checkForGoogleMapsUrl()
      return () => {}
    }, [bookingId]),
  )

  useEffect(() => {
    if (!bookingId) return

    wsRef.current = new WebSocket(WEBSOCKET_URL)
    console.log(bookingId)
    wsRef.current.onopen = () => {
      console.log("WebSocket connection established")
    }

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error)
    }

    wsRef.current.onclose = () => {
      console.log("WebSocket connection closed")
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove()
      }
    }
  }, [bookingId])

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        return
      }

      // Get initial position
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      })

      setDriverLocation({
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
      })
      setLocation(initialLocation)

      if (bookingId) {
        startLocationTracking()
      }
    })()
  }, [bookingId])

  useEffect(() => {
    if (!driverLocation || !routeToCustomer) return

    // Use the provided routeToCustomer directly
    try {
      const decodedCoords = polyline.decode(routeToCustomer).map(([lat, lng]) => ({
        latitude: lat,
        longitude: lng,
      }))
      setRouteCoords(decodedCoords)
      console.log("Decoded polyline successfully:", routeToCustomer)
    } catch (error) {
      console.error("Error decoding polyline:", error)
    }
  }, [driverLocation, routeToCustomer])

  useEffect(() => {
    if (!driverLocation || routeCoords.length === 0) return

    // Create a copy of the array first to avoid mutating the state directly
    const updatedRouteCoords = [...routeCoords]
    let changed = false

    while (updatedRouteCoords.length > 1 && getDistance(updatedRouteCoords[0], driverLocation) < 5) {
      updatedRouteCoords.shift()
      changed = true
    }

    if (changed) {
      setRouteCoords(updatedRouteCoords)
    }
  }, [driverLocation])

  const startLocationTracking = async () => {
    // Stop any existing subscription
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove()
    }

    try {
      // Start watching position with appropriate settings to reduce jumps
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 2, // Only update if moved at least 5 meters
          timeInterval: 100, // Minimum time between updates
        },
        (newLocation) => {
          const newCoords = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          }

          // Store previous coordinates before updating
          if (driverLocation) {
            setPrevCoords(driverLocation)
          }

          // Update local state
          setDriverLocation(newCoords)
          setLocation(newLocation)

          // Animate the marker movement
          if (prevCoords) {
            // Set initial position
            markerCoordinate.latitude = prevCoords.latitude
            markerCoordinate.longitude = prevCoords.longitude

            // Reset animation values
            animatedValueX.setValue(0)
            animatedValueY.setValue(0)

            // Calculate the distance between points
            const from = turf.point([prevCoords.longitude, prevCoords.latitude])
            const to = turf.point([newCoords.longitude, newCoords.latitude])
            const distance = turf.distance(from, to, { units: "kilometers" })

            // Adjust animation duration based on distance (faster for longer distances)
            const duration = Math.min(Math.max(distance * 5000, 300), 1000)

            // Start animation
            Animated.timing(animatedValueX, {
              toValue: 1,
              duration: duration,
              useNativeDriver: true,
            }).start()

            Animated.timing(animatedValueY, {
              toValue: 1,
              duration: duration,
              useNativeDriver: true,
            }).start()
          }

          // Send to WebSocket if connection is open
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && bookingId) {
            const locationData = {
              bookingId: bookingId,
              lat: newLocation.coords.latitude,
              lon: newLocation.coords.longitude,
            }
            wsRef.current.send(JSON.stringify(locationData))
            console.log("Location sent via WebSocket:", locationData)
          }
        },
      )

      // Store subscription reference for cleanup
      locationSubscriptionRef.current = subscription
    } catch (error) {
      console.error("Error setting up location tracking:", error)
    }
  }

  const updateBookingStatus = async (status: string) => {
    if (!bookingId) {
      console.error("No booking ID available")
      return
    }

    try {
      const response = await axios.post(`${ngrok_url}/ambulance/update-booking-status`, {
        updatedStatus: status,
        bookingId: bookingId,
      })

      console.log("Status updated successfully:", response.data)
      setActiveStatus(status)

      // Enable drop-off button after ARRIVED status
      if (status === "ARRIVED") {
        setDropOffEnabled(true)
      }
    } catch (error) {
      console.error("Error updating booking status:", error)
    }
  }

  const handleArrived = () => {
    updateBookingStatus("ARRIVED")
  }

  const handleInTransit = () => {
    updateBookingStatus("IN_TRANSIT")
  }

  const handleReached = () => {
    updateBookingStatus("REACHED")
  }

  const openGoogleMaps = () => {
    if (googleMapsUrl) {
      Linking.openURL(googleMapsUrl)
    }
  }

  const clearGoogleMapsUrl = async () => {
    try {
      await AsyncStorage.removeItem(`gmapsUrl_${bookingId}`)
      setGoogleMapsUrl(null)
      console.log("Cleared Google Maps URL from AsyncStorage")
    } catch (error) {
      console.error("Error clearing Google Maps URL:", error)
    }
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

  // Determine button states based on activeStatus
  const isArrivedDisabled = activeStatus !== "EN_ROUTE"
  const isInTransitDisabled = activeStatus !== "ARRIVED"
  const isReachedDisabled = activeStatus !== "IN_TRANSIT"

  return (
    <GestureHandlerRootView className="flex-1 bg-white">
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="dark" />

        {/* Top Bar */}
        <View className="bg-blue-600 px-4 py-3 shadow-md z-10 pt-10">
          <Text className="text-white text-2xl font-bold text-center">
            <Siren color="white" /> Location <Siren color="white" />
          </Text>
          <View className="flex flex-row justify-center gap-2 p-2">
            <MapPinned color="white" />
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
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
          >
            {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="blue" />}
            {driverLocation && prevCoords && (
              <Marker.Animated
                coordinate={{
                  latitude: animatedValueY.interpolate({
                    inputRange: [0, 1],
                    outputRange: [prevCoords.latitude, driverLocation.latitude],
                  }),
                  longitude: animatedValueX.interpolate({
                    inputRange: [0, 1],
                    outputRange: [prevCoords.longitude, driverLocation.longitude],
                  }),
                }}
                title="Driver"
              >
                <Image
                  source={require("@/assets/images/mini.png")}
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
              </Marker.Animated>
            )}

            {/* Fallback for initial render when prevCoords is null */}
            {driverLocation && !prevCoords && (
              <Marker coordinate={driverLocation} title="Driver">
                <Image
                  source={require("@/assets/images/mini.png")}
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
              </Marker>
            )}
            <Marker
              coordinate={{ latitude: Number(pickupLat), longitude: Number(pickupLon) }}
              title="Destination"
              pinColor="red"
            />
          </MapView>
        </View>

        {/* Bottom Bar */}
        <Modalize
          ref={dropOffModalRef}
          alwaysOpen={200}
          adjustToContentHeight
          scrollViewProps={{
            scrollEnabled: true,
            nestedScrollEnabled: true,
          }}
        >
          <View className="p-2">
            <Text className="text-gray-700 font-medium mb-3 text-lg">Update Journey Status:</Text>
            <View className="flex flex-row justify-between gap-2 p-2">
              <TouchableOpacity
                onPress={handleArrived}
                disabled={isArrivedDisabled}
                className={`flex-1 border-2 ${
                  activeStatus === "ARRIVED"
                    ? "bg-blue-600 border-blue-600"
                    : isArrivedDisabled
                      ? "border-gray-300 bg-gray-100"
                      : "border-blue-600"
                } py-3 px-2 rounded-lg justify-center`}
              >
                <Text
                  className={`${
                    activeStatus === "ARRIVED" ? "text-white" : isArrivedDisabled ? "text-gray-400" : "text-blue-600"
                  } font-medium text-center text-xl`}
                >
                  ARRIVED
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleInTransit}
                disabled={isInTransitDisabled}
                className={`flex-1 border-2 ${
                  activeStatus === "IN_TRANSIT"
                    ? "bg-teal-500 border-teal-500"
                    : isInTransitDisabled
                      ? "border-gray-300 bg-gray-100"
                      : "border-teal-500"
                } py-3 px-2 rounded-lg justify-center`}
              >
                <Text
                  className={`${
                    activeStatus === "IN_TRANSIT"
                      ? "text-white"
                      : isInTransitDisabled
                        ? "text-gray-400"
                        : "text-teal-500"
                  } font-medium text-center text-xl`}
                >
                  IN TRANSIT
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReached}
                disabled={isReachedDisabled}
                className={`flex-1 border-2 ${
                  activeStatus === "REACHED"
                    ? "bg-green-600 border-green-600"
                    : isReachedDisabled
                      ? "border-gray-300 bg-gray-100"
                      : "border-green-600"
                } py-3 px-2 rounded-lg justify-center`}
              >
                <Text
                  className={`${
                    activeStatus === "REACHED" ? "text-white" : isReachedDisabled ? "text-gray-400" : "text-green-600"
                  } font-medium text-center text-xl`}
                >
                  REACHED
                </Text>
              </TouchableOpacity>
            </View>
            <View className="mb-2"></View>
            {googleMapsUrl && (
              <View>
                
                <TouchableOpacity
                  onPress={openGoogleMaps}
                  className="bg-green-500 rounded-xl mx-4 p-4 shadow-md border border-gray-200"
                >
                  <View className="flex-row items-center">
                    <View className="bg-white w-11 h-11 rounded-full justify-center items-center mr-4">
                      <Navigation color="#22c55e" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-white">Open in Google Maps</Text>
                      <Text className="text-xs text-white/80 mt-0.5">Navigate to destination</Text>
                    </View>
                    <ChevronRight color="white" />
                  </View>
                </TouchableOpacity>
                <Link className="pl-4" href={{ pathname: "/ems/DropOff", params: { bookingId: bookingId } }}>
                        <Text className="font-semibold text-blue-500">Change Drop-off Location?</Text>
                </Link>
              </View>
            )}
            <Link href={{ pathname: "/ems/DropOff", params: { bookingId: bookingId } }} asChild>
              <TouchableOpacity
                className={`${activeStatus === "ARRIVED" || activeStatus === "IN_TRANSIT" || activeStatus === "REACHED" ? "bg-white" : "bg-gray-100"} rounded-xl mx-4 my-2.5 p-4 shadow-md border border-gray-200`}
                disabled={!(activeStatus === "ARRIVED" || activeStatus === "IN_TRANSIT" || activeStatus === "REACHED")}
              >
                <View className="flex-row items-center">
                  <View
                    className={`${activeStatus === "ARRIVED" || activeStatus === "IN_TRANSIT" || activeStatus === "REACHED" ? "bg-blue-500" : "bg-gray-400"} w-11 h-11 rounded-full justify-center items-center mr-4`}
                  >
                    <MapPinned color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-base font-semibold ${activeStatus === "ARRIVED" || activeStatus === "IN_TRANSIT" || activeStatus === "REACHED" ? "text-gray-800" : "text-gray-500"}`}
                    >
                      Set Drop-Off Location
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">Select destination for ambulance</Text>
                  </View>
                  <ChevronRight
                    color={
                      activeStatus === "ARRIVED" || activeStatus === "IN_TRANSIT" || activeStatus === "REACHED"
                        ? "#2196F3"
                        : "#9E9E9E"
                    }
                  />
                </View>
              </TouchableOpacity>
            </Link>
          </View>
        </Modalize>
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

const getDistance = (pointA: any, pointB: any) => {
  const R = 6371000 // Radius of Earth in meters
  const lat1 = pointA.latitude * (Math.PI / 180)
  const lat2 = pointB.latitude * (Math.PI / 180)
  const dLat = lat2 - lat1
  const dLng = (pointB.longitude - pointA.longitude) * (Math.PI / 180)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export default LiveTrackingMap
