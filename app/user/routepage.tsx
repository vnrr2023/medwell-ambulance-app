"use client"

import { useState, useEffect, useRef } from "react"
import { Linking, View, Text, Alert, Clipboard, TouchableOpacity } from "react-native"
import MapView, { Polyline, Marker } from "react-native-maps"

import polyline from "@mapbox/polyline"
import { StatusBar } from "expo-status-bar"
import Loader from "@/components/loader"
import { Phone, Clock, User, AlertCircle, Siren } from "lucide-react-native"
import { Modalize } from "react-native-modalize"
import { GestureHandlerRootView } from "react-native-gesture-handler"

const INITIAL_POLYLINE =
  "g`trBgfn{L{AtA{@|@Db@Lb@pAxBjHyFrIcGfBeAhAi@zA}@xAq@~BuAr@]lBy@~CmAz@QzDeA~Ac@nAWtH}@~BUdFWlDKtAGxDe@~Ce@jDc@b@HDKXK|BYfC@lPR|GBx@@NOXY`@YN{AR}@`A}CNm@Jw@d@wD\\uBECGGGMCO@SHOLMPEN?RHJLFH?Pd@R"

const LiveTrackingMap = () => {
  const [routeCoords, setRouteCoords] = useState<any[]>([])
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<any>(null)
  const [eta, setEta] = useState("12 min")
  const [isConnected, setIsConnected] = useState(false)
  const [ambulanceDetails, setAmbulanceDetails] = useState({
    driverName: "Vivek Chouhan",
    vehicleNumber: "MH 01 AB 1234",
    phoneNumber: "+91 9876543210",
    status: "Eating vadapav",
  })

  const wsRef = useRef<WebSocket | null>(null)

  // Setup WebSocket connection
  useEffect(() => {
    // Replace with your actual WebSocket server URL
    const wsUrl = "wss://your-websocket-server.com/ambulance-tracking"

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log("WebSocket connection established")
          setIsConnected(true)
          setErrorMsg(null)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            // Assuming the server sends location data in this format
            if (data.latitude && data.longitude) {
              setDriverLocation({
                latitude: data.latitude,
                longitude: data.longitude,
              })

              // If the server also sends ETA, update it
              if (data.eta) {
                setEta(data.eta)
              }
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error)
          }
        }

        ws.onerror = (error) => {
          console.error("WebSocket error:", error)
          setErrorMsg("Connection error. Please try again.")
        }

        ws.onclose = (event) => {
          console.log("WebSocket connection closed:", event.code, event.reason)
          setIsConnected(false)

          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (wsRef.current?.readyState !== WebSocket.OPEN) {
              connectWebSocket()
            }
          }, 5000)
        }

        wsRef.current = ws
      } catch (error) {
        console.error("Failed to connect to WebSocket:", error)
        setErrorMsg("Failed to connect to tracking service")
      }
    }

    connectWebSocket()

    // Cleanup function to close WebSocket when component unmounts
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Decode polyline on component mount
  useEffect(() => {
    const decodedCoords = polyline.decode(INITIAL_POLYLINE).map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }))
    setRouteCoords(decodedCoords)
  }, [])

  // Update route based on driver location
  useEffect(() => {
    if (!driverLocation || routeCoords.length === 0) return

    while (routeCoords.length > 1 && getDistance(routeCoords[0], driverLocation) < 5) {
      routeCoords.shift()
    }
    setRouteCoords([...routeCoords])
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

  if (errorMsg) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-red-500 text-center px-4">{errorMsg}</Text>
        <TouchableOpacity
          className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
          onPress={() => {
            if (wsRef.current) wsRef.current.close()
            setErrorMsg(null)
          }}
        >
          <Text className="text-white">Retry Connection</Text>
        </TouchableOpacity>
      </View>
    )
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

  return R * c // Distance in meters
}

export default LiveTrackingMap

