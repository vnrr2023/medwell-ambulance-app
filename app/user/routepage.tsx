import { useState, useEffect, useRef, useCallback } from "react"
import { Linking, View, Text, Alert, Clipboard, TouchableOpacity, Image } from "react-native"
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from "react-native-maps"
import polyline from "@mapbox/polyline"
import { StatusBar } from "expo-status-bar"
import Loader from "@/components/loader"
import { Modalize } from "react-native-modalize"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ngrok_url } from "@/data/id"
import * as Location from "expo-location"
import axios from "axios"

// Add the dummy polyline constant
const dummyPolyline = "_iwrBwxq{L@?"

const LiveTrackingMap = () => {
  const [routeCoords, setRouteCoords] = useState<any[]>([])
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<any>(null)
  const [eta, setEta] = useState("12 min")
  const [location, setLocation] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [bookingId, setBookingId] = useState("")
  const [imageLoaded, setImageLoaded] = useState(false)
  const [ambulanceDetails, setAmbulanceDetails] = useState({
    driverName: "Vivek Chouhan",
    vehicleNumber: "MH 01 AB 1234",
    phoneNumber: "+91 9876543210",
    status: "Driving",
  })

  // Use null initially for destination location
  const [destinationLocation, setDestinationLocation] = useState<any>(null)

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const markerRef = useRef(null)
  const prevLocationRef: any = useRef(null)
  const prevRouteUpdateRef: any = useRef(null)
  const mapRef: any = useRef(null)
  const bookingDetailsFetchedRef = useRef(false)
  const driverLocationSetOnceRef = useRef(false)

  // Get user's current location
  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        return
      }
      const id = await getBookingIdFromStorage()
      console.log("booker", id)

      const userLocation = await Location.getCurrentPositionAsync({})
      setLocation(userLocation)
      // setLocation({ latitude: 18.952613555387067, longitude: 72.82096453487598 })

      // Set destination as user's current location
      setDestinationLocation({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      })
      // setDestinationLocation({
      //   latitude: 18.952613555387067,
      //   longitude: 72.82096453487598,
      // })
    })()
  }, [])

  const getBookingIdFromStorage = async () => {
    try {
      const id = await AsyncStorage.getItem("bookingId")
      setBookingId(`${id}`)
      return id
    } catch (err) {
      console.log("booking id was not found", err)
      return null
    }
  }

  // Fetch booking details function - will be called only once after driver location is set
  const fetchBookingDetails = useCallback(async (id:any) => {
    if (!id || bookingDetailsFetchedRef.current) return
    
    try {
      console.log("Fetching booking details...")
      bookingDetailsFetchedRef.current = true
      const response = await axios.get(`${ngrok_url}/customer/booking-details/${id}`)
      console.log("booking details response", response.data.routeToCustomer)
      
      if (response.data.routeToCustomer) {
        const decodedCoords = polyline.decode(response.data.routeToCustomer).map(([lat, lng]) => ({
          latitude: lat,
          longitude: lng,
        }))
        setRouteCoords(decodedCoords)
        console.log("Route polyline decoded successfully")
      }
    } catch (error) {
      console.error("Error fetching booking details:", error)
      bookingDetailsFetchedRef.current = false // Allow retry if failed
    }
  }, [])

  // Effect to fetch booking details once after driver location is initially set
  useEffect(() => {
    const getBookingDetailsAfterDriverLocation = async () => {
      // Only run this effect if we have driver location and haven't fetched booking details yet
      if (driverLocation && !driverLocationSetOnceRef.current && !bookingDetailsFetchedRef.current) {
        driverLocationSetOnceRef.current = true
        const id = await getBookingIdFromStorage()
        if (id) {
          await fetchBookingDetails(id)
        }
      }
    }
    
    getBookingDetailsAfterDriverLocation()
  }, [driverLocation, fetchBookingDetails])

  // Modified fetchLocationData to NOT fetch booking details
  const fetchLocationData = useCallback(async (id:any) => {
    if (!id) return

    try {
      console.log(id)
      const response = await fetch(`${ngrok_url}/customer/current-location-ambulance/${id}`)

      if (response.ok) {
        const data = await response.json()
        console.log(data)
        if (data && data.lat && data.lon) {
          const newLocation = {
            latitude: data.lat,
            longitude: data.lon,
          }

          // Directly set the new location without animation
          setDriverLocation(newLocation)
          prevLocationRef.current = newLocation
          setIsConnected(true)
          setErrorMsg(null)
        }
      } else {
        // For 400 errors, just log but don't show error to user
        console.log(`HTTP error! Status: ${response.status}`)
        // Keep showing loader by not setting error message
      }
    } catch (error) {
      console.error("Error fetching location data:", error)
      setIsConnected(false)
      // Don't set error message to keep showing loader
    }
  }, []) // No dependencies needed anymore

  const startLocationPolling = useCallback(
    (id:any) => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }

      fetchLocationData(id)

      pollingIntervalRef.current = setInterval(() => {
        console.log("s")
        fetchLocationData(id)
      }, 3000)

      console.log("Location polling started")
    },
    [fetchLocationData]
  )

  const stopLocationPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      setIsConnected(false)
      console.log("Location polling stopped")
    }
  }, [])

  useEffect(() => {
    console.log("Initializing location polling")

    const initialize = async () => {
      const id = await getBookingIdFromStorage()
      if (id) {
        // Start location polling - booking details will be fetched after driver location is set
        startLocationPolling(id)
      }
    }

    initialize()

    // Only clean up when component unmounts
    return () => {
      console.log("Component unmounting, stopping location polling")
      stopLocationPolling()
    }
  }, [startLocationPolling, stopLocationPolling]) // These dependencies won't change

  // Carefully manage route updates to avoid infinite loops
  useEffect(() => {
    if (!driverLocation || routeCoords.length === 0) return

    // Use stringified location to check if we've already processed this location
    const locationKey = `${driverLocation.latitude},${driverLocation.longitude}`
    if (prevRouteUpdateRef.current === locationKey) return
    prevRouteUpdateRef.current = locationKey

    // Remove passed points from the route
    const updatedRoute = [...routeCoords]
    let changed = false
    
    while (updatedRoute.length > 1 && getDistance(updatedRoute[0], driverLocation) < 5) {
      updatedRoute.shift()
      changed = true
    }

    // Only update state if the route actually changed
    if (changed) {
      setRouteCoords(updatedRoute)
    }
  }, [driverLocation, routeCoords])

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
        <View className="flex-row justify-center items-center gap-2">
          <Image
            source={require("./../../assets/icons/siren.svg")}
            style={{ width: 24, height: 24, tintColor: "#fff" }}
            resizeMode="contain"
          />
          <Text className="text-white text-2xl font-bold text-center">Have Patience</Text>
          <Image
            source={require("./../../assets/icons/siren.svg")}
            style={{ width: 24, height: 24, tintColor: "#fff" }}
            resizeMode="contain"
          />
        </View>

        <Text className="text-white text-2xl font-bold text-center mt-1">
          Ambulance is on the way
        </Text>

        <View className="flex flex-row justify-center gap-2 p-2 items-center">
          <Image
            source={require("./../../assets/icons/clock.svg")}
            style={{ width: 20, height: 20, tintColor: "#fff" }}
            resizeMode="contain"
          />
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
                source={require("@/assets/images/top.png")}
                style={{ width: 32, height: 32 }}
                onError={handleImageError}
                onLoad={handleImageLoad}
              />

              {/* Fallback icon if image fails to load */}
              {!imageLoaded && (
                <Image
                  source={require("./../../assets/icons/ambulance.svg")}
                  style={{
                    position: "absolute",
                    width: 24,
                    height: 24,
                    tintColor: "#FF0000", 
                  }}
                  resizeMode="contain"
                />
              )}
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
              <Image
                source={require("./../../assets/icons/user.svg")}
                style={{ width: 18, height: 18, tintColor: "#666" }}
                resizeMode="contain"
              />
              <Text className="text-gray-800 font-medium ml-2">{ambulanceDetails.driverName}</Text>
            </View>
            <View className="flex-row items-center">
              <Image
                source={require("./../../assets/icons/clock.svg")}
                style={{ width: 18, height: 18, tintColor: "#666" }}
                resizeMode="contain"
              />
              <Text className="text-gray-800 font-medium ml-2">{eta} away</Text>
            </View>
          </View>

          <View className="flex-row items-center mb-2">
            <Image
              source={require("./../../assets/icons/circle-alert.svg")}
              style={{ width: 18, height: 18, tintColor: "#666" }}
              resizeMode="contain"
            />
            <Text className="text-gray-800 ml-2">{ambulanceDetails.vehicleNumber}</Text>
          </View>

          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-gray-600">{ambulanceDetails.status}</Text>
            <TouchableOpacity
              onPress={handleCallDriver}
              className="bg-green-600 px-4 py-2 rounded-full flex-row items-center"
            >
              <Image
                source={require("./../../assets/icons/phone.svg")}
                style={{ width: 16, height: 16, tintColor: "#fff" }}
                resizeMode="contain"
              />
              <Text className="text-white font-medium ml-2">Call Driver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modalize>
    </GestureHandlerRootView>
  )
}

// Utility function to calculate distance (Haversine formula)
const getDistance = (pointA:any, pointB:any) => {
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