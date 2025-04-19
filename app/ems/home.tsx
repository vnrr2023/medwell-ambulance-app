"use client"

import React, { useEffect, useRef, useState } from "react"
import { Text, SafeAreaView, FlatList, View, TouchableOpacity } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import { Clock, Phone, ArrowRight, MapPin } from "lucide-react-native"
import { ngrok_url } from "@/data/id"
import axios from "axios"
import * as Location from "expo-location"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useRouter } from "expo-router"

export default function Home() {
  const router = useRouter()
  const socketRef = useRef<WebSocket | null>(null)
  const locationWatchId = useRef<any>(null)
  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [location, setLocation] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [emergencies, setEmergencies] = useState<any[]>([])

  useEffect(() => {
    const sendType = async () => {
      const ambulanceID = await AsyncStorage.getItem("ambulanceID")
      const ambulanceTYPES = await AsyncStorage.getItem("ambulanceTYPE")
      if (!ambulanceID) {
        router.push("/auth/signup/AMBULANCE")
        return
      }
      const formData = new FormData()
      console.log(ambulanceTYPES)
      formData.append("ambulanceId", `${ambulanceID}`)
      formData.append("type", `${ambulanceTYPES}`)
      try {
        const response = await axios.post(`${ngrok_url}/ambulance/send-type`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        console.log(response.data)
      } catch (error) {
        console.log("Error in sending type:", error)
      }
    }
    sendType()
  }, [])

  // Function to send location update via WebSocket
  const sendLocationUpdate = async () => {
    // Stop here if WebSocket is not open
    if (socketRef.current?.readyState !== WebSocket.OPEN) return

    try {
      const ambulanceID = await AsyncStorage.getItem("ambulanceID")
      const currentLocation = location || await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      })

      const message = {
        ambulanceId: ambulanceID,
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      }
      
      socketRef.current.send(JSON.stringify(message))
      console.log("Sent location update:", message)
    } catch (error) {
      console.error("Error sending location update:", error)
    }
  }

  const startLocationWatching = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        return
      }

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      })
      setLocation(initialLocation)
      
      // Start watching for location changes (only to update state, not tied to sending messages)
      locationWatchId.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update if moved 10 meters
          timeInterval: 5000    // Or every 5 seconds
        },
        (newLocation) => {
          setLocation(newLocation)
          // Location update doesn't trigger message sending anymore
        }
      )

      // Set up interval to send location updates regardless of location changes
      messageIntervalRef.current = setInterval(sendLocationUpdate, 3000) // Send every 3 seconds
    } catch (error) {
      console.error("Error starting location watching:", error)
      setErrorMsg("Failed to start location tracking")
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      const setupWebSocketAndLocation = async () => {
        try {
          const domain = ngrok_url.replace(/^https?:\/\//, "")
          socketRef.current = new WebSocket(`ws://${domain}/ambulance-location`)

          socketRef.current.onopen = () => {
            console.log("WebSocket connected ✅")
            // Start watching location once WebSocket is connected
            startLocationWatching()
            
            // Send initial location update immediately upon connection
            sendLocationUpdate()
          }

          socketRef.current.onmessage = (event) => {
            try {
              const rawData = event.data
              console.log("Raw WebSocket data:", rawData)

              let parsedData
              try {
                // First try to parse the raw data
                parsedData = JSON.parse(rawData)

                // Check if parsedData is an array of strings (each string is a JSON object)
                if (Array.isArray(parsedData)) {
                  console.log("Received array of emergency data")

                  // Process each item in the array
                  parsedData.forEach((item) => {
                    try {
                      // Parse each string item into a JSON object
                      const emergencyData = JSON.parse(item)
                      console.log("Parsed emergency item:", emergencyData)

                      const newEmergency = {
                        id: emergencyData.bookingId || emergencyData.requestId,
                        bookingId: emergencyData.bookingId,
                        requestId: emergencyData.requestId,
                        coordinates: {
                          latitude: emergencyData.pickupLat,
                          longitude: emergencyData.pickupLon,
                        },
                        distance: emergencyData.distance,
                        otherAmbulances: emergencyData.otherAmbulances,
                        timeReported: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        contactNumber: "Emergency Services",
                      }

                      setEmergencies((prevEmergencies) => {
                        const exists = prevEmergencies.some((e) => e.id === newEmergency.id)
                        if (!exists) {
                          return [...prevEmergencies, newEmergency]
                        }
                        return prevEmergencies
                      })
                    } catch (itemError) {
                      console.log("Error parsing individual emergency item:", itemError)
                    }
                  })
                } else {
                  // Handle single object case (your original logic)
                  console.log("Received single emergency data")

                  const newEmergency = {
                    id: parsedData.bookingId || parsedData.requestId,
                    bookingId: parsedData.bookingId,
                    requestId: parsedData.requestId,
                    coordinates: {
                      latitude: parsedData.pickupLat,
                      longitude: parsedData.pickupLon,
                    },
                    distance: parsedData.distance,
                    otherAmbulances: parsedData.otherAmbulances,
                    timeReported: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    contactNumber: "Emergency Services",
                  }

                  setEmergencies((prevEmergencies) => {
                    const exists = prevEmergencies.some((e) => e.id === newEmergency.id)
                    if (!exists) {
                      return [...prevEmergencies, newEmergency]
                    }
                    return prevEmergencies
                  })
                }
              } catch (parseError) {
                console.log("Error parsing WebSocket data:", parseError)
                return
              }
            } catch (err) {
              console.log("Error handling WebSocket message:", err)
            }
          }

          socketRef.current.onerror = (err) => {
            console.error("WebSocket error:", err)
          }

          socketRef.current.onclose = () => {
            console.log("WebSocket closed ❌")
          }
        } catch (error) {
          console.error("Error in setupWebSocketAndLocation:", error)
        }
      }

      setupWebSocketAndLocation()

      return () => {
        // Clean up resources when component unmounts or loses focus
        if (socketRef.current) {
          socketRef.current.close()
        }
        if (locationWatchId.current) {
          locationWatchId.current.remove()
        }
        if (messageIntervalRef.current) {
          clearInterval(messageIntervalRef.current)
        }
      }
    }, []),
  )

  const handleAcceptEmergency = async (emergency: any) => {
    const ambulanceID = await AsyncStorage.getItem("ambulanceID")
    const loc = location || await Location.getCurrentPositionAsync({})
    const datas = {
      ambulanceId: ambulanceID,
      bookingId: emergency.bookingId,
      otherAmbulances: emergency.otherAmbulances,
      requestId: emergency.requestId,
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    }
    console.log(datas)
    try {
      const response = await axios.post(ngrok_url + "/ambulance/accept-booking", datas)
      console.log("booking response while accept",response.data)
      console.log(emergency.coordinates.latitude, emergency.coordinates.longitude)
      router.push({
        pathname: "/ems/routepage",
        params: {bookingId:emergency.bookingId, pickupLat: emergency.coordinates.latitude, pickupLon: emergency.coordinates.longitude, routeToCustomer: response.data.booking.routeToCustomer },
      })
    } catch (error) {
      console.log("Error while accepting emergency", error)
    }
  }

  const renderEmergencyItem = ({ item }: { item: any }) => (
    <View className="bg-white rounded-xl shadow-md mb-4 overflow-hidden">
      <View className="p-4">
        <Text className="text-lg font-bold">Emergency #{item.id.substring(0, 8)}</Text>
        <View className="flex-row items-center mb-2">
          <Clock size={16} color="#6b7280" />
          <Text className="text-gray-600 ml-2 text-sm">{item.timeReported}</Text>
        </View>
        <View className="flex-row items-center mb-2">
          <MapPin size={16} color="#6b7280" />
          <Text className="text-gray-600 ml-2 text-sm">Distance: {Number.parseFloat(item.distance).toFixed(2)} km</Text>
        </View>
        <View className="flex-row items-center">
          <Phone size={16} color="#6b7280" />
          <Text className="text-gray-600 ml-2">{item.contactNumber}</Text>
        </View>
        {item.otherAmbulances && item.otherAmbulances.length > 0 && (
          <View className="mt-2">
            <Text className="text-gray-600 text-sm">Other ambulances: {item.otherAmbulances.join(", ")}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        className="bg-blue-600 py-3 px-4 flex-row justify-center items-center"
        onPress={() => handleAcceptEmergency(item)}
      >
        <Text className="text-white font-bold text-center mr-2">ACCEPT EMERGENCY</Text>
        <ArrowRight size={18} color="white" />
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="bg-blue-700 px-4 py-4">
        <Text className="text-white text-2xl font-bold">EMS Dispatch</Text>
        <Text className="text-blue-100 text-sm">Active Emergencies: {emergencies.length}</Text>
        {location && (
          <Text className="text-blue-100 text-xs">
            Position: {location.coords.latitude.toFixed(5)}, {location.coords.longitude.toFixed(5)}
          </Text>
        )}
      </View>

      {emergencies.length > 0 ? (
        <FlatList
          data={emergencies}
          renderItem={renderEmergencyItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-lg text-gray-500 text-center">No active emergencies at the moment.</Text>
          <Text className="text-sm text-gray-400 text-center mt-2">
            New emergency calls will appear here automatically.
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}