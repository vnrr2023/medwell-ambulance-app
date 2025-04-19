"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Linking, View, Text, Alert, Clipboard, TouchableOpacity, Image } from "react-native"
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from "react-native-maps"
import { useFocusEffect } from "@react-navigation/native"
import polyline from "@mapbox/polyline"
import { StatusBar } from "expo-status-bar"
import Loader from "@/components/loader"
import { Phone, Clock, User, AlertCircle, Siren, Ambulance } from "lucide-react-native"
import { Modalize } from "react-native-modalize"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ngrok_url } from "@/data/id"
import * as Location from "expo-location"

const dummyPolyline = "_iwrBwxq{L@?"

const LiveTrackingMap = () => {
  const [routeCoords, setRouteCoords] = useState<any[]>([])
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<any>(null)
  const [eta, setEta] = useState("12 min")
  const [location, setLocation] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [bookingId, setBookingId] = useState("")
  const [polylineR, setPolylineR] = useState("")
  const [imageLoaded, setImageLoaded] = useState(false)
  const [ambulanceDetails, setAmbulanceDetails] = useState({
    driverName: "Vivek Chouhan",
    vehicleNumber: "MH 01 AB 1234",
    phoneNumber: "+91 9876543210",
    status: "Eating vadapav",
  })

  // Use null initially for destination location
  const [destinationLocation, setDestinationLocation] = useState<any>(null)

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const markerRef = useRef(null)
  const prevLocationRef: any = useRef(null)
  const mapRef: any = useRef(null)
  // Add a ref to track animation frame IDs for cleanup
  const animationFrameIdRef = useRef<number | null>(null)
  // Add a ref to track if we're currently animating
  const isAnimatingRef = useRef(false)

  // Get user's current location
  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        return
      }

      const userLocation = await Location.getCurrentPositionAsync({})
      setLocation(userLocation)

      // Set destination as user's current location
      setDestinationLocation({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      })
    })()
  }, [])

  const getBookingIdFromStorage = async () => {
    try {
      const id = await AsyncStorage.getItem("bookingId")
      setBookingId(`${id}`)
      return id
    } catch (err) {
      console.log("booking id was not found", err)
    }
  }

  // Modified fetchLocationData to prevent unnecessary state updates
  const fetchLocationData = useCallback(
    async (id: any) => {
      if (!id) return

      // Don't fetch new data if we're currently animating
      if (isAnimatingRef.current) {
        return
      }

      try {
        console.log(id)
        const response = await fetch(`${ngrok_url}/customer/current-location-ambulance/${id}`)

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        console.log(data)
        if (data && data.lat && data.lon) {
          const newLocation = {
            latitude: data.lat,
            longitude: data.lon,
          }

          // Only update if location has actually changed and we're not currently animating
          if (!driverLocation) {
            // First update, set directly
            setDriverLocation(newLocation)
            prevLocationRef.current = newLocation
          } else if (
            !isAnimatingRef.current &&
            (newLocation.latitude !== driverLocation.latitude || newLocation.longitude !== driverLocation.longitude)
          ) {
            // Store previous location before updating
            prevLocationRef.current = { ...driverLocation }
            setDriverLocation(newLocation)
          }

          setIsConnected(true)
          setErrorMsg(null)
        }
      } catch (error) {
        console.error("Error fetching location data:", error)
        setIsConnected(false)
        setErrorMsg("Unable to fetch location updates. Please try again.")
      }
    },
    [driverLocation],
  )

  useEffect(() => {
    // Use the dummy polyline directly instead of fetching
    const decodedCoords = polyline.decode(dummyPolyline).map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }))
    setRouteCoords(decodedCoords)
  }, [])

  const startLocationPolling = useCallback(
    (id: any) => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }

      fetchLocationData(id)

      pollingIntervalRef.current = setInterval(() => {
        fetchLocationData(id)
      }, 5000)

      console.log("Location polling started")
    },
    [fetchLocationData],
  )

  const stopLocationPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      setIsConnected(false)
      console.log("Location polling stopped")
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, starting location polling")

      const initialize = async () => {
        const id = await getBookingIdFromStorage()
        startLocationPolling(id)
      }

      initialize()

      // When screen goes out of focus, stop polling
      return () => {
        console.log("Screen unfocused, stopping location polling")
        stopLocationPolling()
      }
    }, [startLocationPolling, stopLocationPolling]),
  )

  // Fixed animation useEffect to prevent infinite updates
  useEffect(() => {
    // If we don't have both current and previous locations, exit early
    if (!driverLocation || !prevLocationRef.current) {
      return
    }

    // If current and previous locations are the same, no need to animate
    if (
      driverLocation.latitude === prevLocationRef.current.latitude &&
      driverLocation.longitude === prevLocationRef.current.longitude
    ) {
      return
    }

    // Set animating flag to true
    isAnimatingRef.current = true

    const duration = 3000 // Animation duration in ms
    const start = Date.now()
    const startLat = prevLocationRef.current.latitude
    const startLng = prevLocationRef.current.longitude
    const destLat = driverLocation.latitude
    const destLng = driverLocation.longitude

    // Store the final destination to avoid updating state during animation
    const finalDestination = {
      latitude: destLat,
      longitude: destLng,
    }

    const animate = () => {
      const now = Date.now()
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)

      // Easing function for smoother animation
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      const nextLat = startLat + (destLat - startLat) * easeProgress
      const nextLng = startLng + (destLng - startLng) * easeProgress

      // Create a new location object to avoid direct mutation
      const animatedLocation = {
        latitude: nextLat,
        longitude: nextLng,
      }

      // Only update state if we're not at 100% progress
      if (progress < 1) {
        setDriverLocation(animatedLocation)
        animationFrameIdRef.current = requestAnimationFrame(animate)
      } else {
        // At the end of animation, make sure we're at the exact final position
        setDriverLocation(finalDestination)
        // Mark animation as complete
        isAnimatingRef.current = false
      }
    }

    // Cancel any existing animation before starting a new one
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current)
    }

    // Start the animation
    animationFrameIdRef.current = requestAnimationFrame(animate)

    // Clean up animation frame on unmount or when dependencies change
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current)
        animationFrameIdRef.current = null
      }
      isAnimatingRef.current = false
    }
  }, [driverLocation])

  // Update route when driver location changes
  useEffect(() => {
    if (!driverLocation || routeCoords.length === 0) return

    // Remove passed points from the route
    const updatedRoute = [...routeCoords]
    while (updatedRoute.length > 1 && getDistance(updatedRoute[0], driverLocation) < 5) {
      updatedRoute.shift()
    }

    setRouteCoords(updatedRoute)
  }, [driverLocation])

  const handleCallDriver = async () => {
    const phoneNumber = ambulanceDetails.phoneNumber
    Clipboard.setString(phoneNumber)

    const dialerUrl = `tel:${phoneNumber}`

    const canOpen = await Linking.canOpenURL(dialerUrl)

    if (canOpen) {
      await Linking.openURL(dialerUrl)
    } else {
      Alert.alert("Error", "Unable to open phone dialer")
    }
  }

  // Handle image loading error
  const handleImageError = () => {
    console.log("Failed to load ambulance image")
    setImageLoaded(false)
  }

  // Handle image loading success
  const handleImageLoad = () => {
    console.log("Ambulance image loaded successfully")
    setImageLoaded(true)
  }

  if (!driverLocation) {
    return (
      <View className="h-screen">
        <Loader />
      </View>
    )
  }

  return (
    <GestureHandlerRootView className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Top Bar */}
      <View className="bg-blue-600 px-4 py-3 shadow-md z-10 pt-10">
        <Text className="text-white text-2xl font-bold text-center">
          <Siren color="white" />
          Have Patience
          <Siren color="white" />
        </Text>
        <Text className="text-white text-2xl font-bold text-center">Ambulance is on the way</Text>
        <View className="flex flex-row justify-center gap-2 p-2">
          <Clock color="white" />
          <Text className="text-white text-md text-center">
            ETA: {eta} {!isConnected && "(Reconnecting...)"}
          </Text>
        </View>
      </View>

      {/* Map View */}
      <View className="flex-1 relative">
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="blue" />

          {/* Custom ambulance marker with fallback */}
          <Marker coordinate={driverLocation} title="Ambulance" description="On the way" tracksViewChanges={false}>
            <View
              style={{
                width: 40,
                height: 40,
                justifyContent: "center",
                alignItems: "center",
               
              }}
            >
              {/* Try to load the image with error handling */}
              <Image
                source={require("@/assets/images/mini.png")}
                style={{ width: 32, height: 32 }}
                onError={handleImageError}
                onLoad={handleImageLoad}
              />

              {/* Fallback icon if image fails to load */}
              {!imageLoaded && <Ambulance size={24} color="#FF0000" style={{ position: "absolute" }} />}
            </View>
          </Marker>

          {/* Destination marker (user's location) */}
          {destinationLocation && <Marker coordinate={destinationLocation} title="Your Location" pinColor="red" />}
        </MapView>
      </View>

      {/* Bottom Bar */}
      <Modalize
        alwaysOpen={200}
        adjustToContentHeight
        scrollViewProps={{
          scrollEnabled: true,
          nestedScrollEnabled: true,
        }}
      >
        <View className="bg-white px-4 py-3 shadow-lg border-t border-gray-200">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <User size={18} color="#666" />
              <Text className="text-gray-800 font-medium ml-2">{ambulanceDetails.driverName}</Text>
            </View>
            <View className="flex-row items-center">
              <Clock size={18} color="#666" />
              <Text className="text-gray-800 font-medium ml-2">{eta} away</Text>
            </View>
          </View>

          <View className="flex-row items-center mb-2">
            <AlertCircle size={18} color="#666" />
            <Text className="text-gray-800 ml-2">{ambulanceDetails.vehicleNumber}</Text>
          </View>

          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-gray-600">{ambulanceDetails.status}</Text>
            <TouchableOpacity
              onPress={handleCallDriver}
              className="bg-green-600 px-4 py-2 rounded-full flex-row items-center"
            >
              <Phone size={16} color="white" />
              <Text className="text-white font-medium ml-2">Call Driver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modalize>
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

  return R * c
}

export default LiveTrackingMap
