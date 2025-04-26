import { useState, useEffect,useCallback, useRef } from "react"
import { View, Text, TouchableOpacity, Modal } from "react-native"
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from "react-native"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import * as Location from "expo-location"
import { StatusBar } from "expo-status-bar"
import { Modalize } from "react-native-modalize"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { Image } from "expo-image"
import { useNavigation, useFocusEffect, useRouter, Route } from "expo-router"
import {  ngrok_url } from "@/data/id"
import axios from "axios"

type AmbulanceLocation = {
  location: {
    latitude: number
    longitude: number
  }
  ambulanceId: string
}

type Ambulance = {
  id: string
  name: string
  distance: string
  eta: string
  phone: string
  location: {
    latitude: number
    longitude: number
  }
}

export default function Home() {
  const [location, setLocation] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<any>(null)
  const [ambulanceType, setAmbulanceType] = useState<"XL" | "MINI" | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [ambulanceIds, setAmbulanceIds] = useState<string[]>([])
  const router = useRouter()
  const mapRef = useRef<any>(null)
  const webSocketRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const fetchNearbyAmbulances = async (latitude: number, longitude: number) => {
    try {
      const response = await axios.get(`${ngrok_url}/customer/get-nearby-ambulances/${latitude}/${longitude}`)
      // const response = await axios.get(`${ngrok_url}/customer/get-nearby-ambulances/18.952613555387067/72.82096453487598`)

      const nearbyAmbulances = response.data.map((ambulance: any, index: number) => ({
        id: ambulance.ambulanceId || `amb-${index}`,
        name: ambulance.name || `Ambulance ${index + 1}`,
        distance: ambulance.distance || "Calculating...",
        eta: ambulance.eta || "Calculating...",
        phone: ambulance.phone || "Not available",
        location: {
          latitude: ambulance.location?.latitude || 0,
          longitude: ambulance.location?.longitude || 0,
        },
      }))

      const ids = nearbyAmbulances.map((amb: Ambulance) => amb.id)
      setAmbulanceIds(ids)
      setAmbulances(nearbyAmbulances)

      return nearbyAmbulances
    } catch (error) {
      console.error("Error fetching nearby ambulances:", error)
      return []
    }
  }

  const connectWebSocket = (idList: string[]) => {
    if (webSocketRef.current) {
      webSocketRef.current.close()
    }

    const domain = ngrok_url.replace(/^https?:\/\//, "")
    const wsUrl = `ws://${domain}/nearby-ambulance-locations`
    console.log("Connecting to WebSocket:", wsUrl)

    const ws = new WebSocket(wsUrl)
    webSocketRef.current = ws

    ws.onopen = () => {
      console.log("WebSocket Connected")
      ws.send(JSON.stringify({ idList }))
      console.log("Sent idList to WebSocket")

      intervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ idList }))
          console.log("Sent idList again to WebSocket")
        }
      }, 10000)
    }

    ws.onmessage = (event) => {
      try {
        console.log("WebSocket received data:", event.data)
        const data = JSON.parse(event.data) as AmbulanceLocation[]

        if (Array.isArray(data) && data.length > 0) {
          setAmbulances((prevAmbulances) =>
            prevAmbulances.map((amb) => {
              const update = data.find((item) => item.ambulanceId === amb.id)
              return update
                ? {
                    ...amb,
                    location: {
                      latitude: update.location.latitude,
                      longitude: update.location.longitude,
                    },
                  }
                : amb
            })
          )
        }
      } catch (error) {
        console.error("Error parsing WebSocket data:", error)
      }
    }

    ws.onerror = (error) => {
      console.error("WebSocket error:", error)
    }

    ws.onclose = (event) => {
      console.log("WebSocket disconnected:", event.code, event.reason)

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }

  useFocusEffect(
    useCallback(() => {
      
      const fetchLocationAndAmbulances = async () => {
        const customerID=await AsyncStorage.getItem("customerID")
        if (!customerID){
          router.push('/auth/signup/CUSTOMER');
          return
        }
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied")
          return
        }

        const location = await Location.getCurrentPositionAsync({})
        setLocation(location)

        if (location?.coords ) {
          const nearbyAmbulances = await fetchNearbyAmbulances(location.coords.latitude, location.coords.longitude)
          // const nearbyAmbulances = await fetchNearbyAmbulances(18.967150952658418, 72.84068598144172)
          const ids = nearbyAmbulances.map((amb: Ambulance) => amb.id)
          connectWebSocket(ids)
        }
      }

      fetchLocationAndAmbulances()

      return () => {
        if (webSocketRef.current) {
          webSocketRef.current.close()
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }, [])
  )

  const handleAmbulanceSelect = (type: "XL" | "MINI") => {
    setAmbulanceType(type)
    setShowConfirmation(true)
  }

  const confirmBooking = async () => {
    const customerID=await AsyncStorage.getItem("customerID")
    const data = {
      customerId: customerID,
      lat: location.coords.latitude,
      lon: location.coords.longitude,
      ambulanceType,
    }
    // const data = {
    //   customerId: customerID,
    //   lat: 18.967150952658418, 
    //   lon: 72.84068598144172,
    //   ambulanceType,
    // }
    console.log("bookuing", data)


    try {
      const response = await axios.post(`${ngrok_url}/customer/request-booking`, data)
      console.log("booking response",response.data)
      const bookingId = response.data.bookingId
      await AsyncStorage.setItem("bookingId", bookingId)
      router.push("/user/routepage",)
    } catch (error) {
      console.log("Booking Error " + error)
    }

    setShowConfirmation(false)
  }

  let initialRegion = {
    latitude: 18.9634,
    longitude: 72.8351,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }

  if (location) {
    initialRegion = {
      latitude: 18.952613555387067,
      longitude: 72.82096453487598,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }
  }

  return (
    <GestureHandlerRootView className="flex-1 h-screen">
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="dark" />

        {errorMsg ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-red-500">{errorMsg}</Text>
          </View>
        ) : (
          <View className="flex-1">
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={{ flex: 1 }}
              initialRegion={initialRegion}
              showsUserLocation
              showsMyLocationButton
            >
              {ambulances.map((ambulance) => (
                <Marker
                  key={ambulance.id}
                  coordinate={ambulance.location}
                  title={ambulance.name}
                  description={`ETA: ${ambulance.eta}`}
                >
                  <View className="bg-white p-2 rounded-full shadow-md">
                    <Image source={require("@/assets/images/top.png")} style={{ width: 24, height: 24 }} />
                  </View>
                </Marker>
              ))}
            </MapView>

            <Modalize
              alwaysOpen={200}
              adjustToContentHeight
              handleStyle={{ width: 40, height: 4, backgroundColor: "#999" }}
              scrollViewProps={{
                scrollEnabled: true,
                nestedScrollEnabled: true,
              }}
            >
              <View className="px-4 py-2 border-b border-gray-200">
                <Text className="text-xl font-bold">Book an Ambulance</Text>
                <Text className="text-gray-500">{ambulances.length} ambulances available</Text>
              </View>

              <View className="px-4 py-4">
                <Text className="text-xl font-bold mb-4">Select Ambulance Type</Text>
                <View className="flex-row justify-between">
                  <TouchableOpacity
                    className={`w-[48%] border-2 rounded-xl p-3 ${ambulanceType === "XL" ? "border-red-500" : "border-gray-200"}`}
                    onPress={() => handleAmbulanceSelect("XL")}
                  >
                    <View className="items-center justify-center">
                      <Image
                        source={require("@/assets/images/xl.png")}
                        style={{ width: 120, height: 80 }}
                        contentFit="contain"
                      />
                      <Text className="font-bold text-lg mt-2">Ambulance XL</Text>
                      <Text className="text-gray-500 text-center mt-1">Full medical equipment</Text>
                      <Text className="text-gray-500 text-center">For critical emergencies</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`w-[48%] border-2 rounded-xl p-3 ${ambulanceType === "MINI" ? "border-red-500" : "border-gray-200"}`}
                    onPress={() => handleAmbulanceSelect("MINI")}
                  >
                    <View className="items-center justify-center">
                      <Image
                        source={require("@/assets/images/mini.png")}
                        style={{ width: 120, height: 80 }}
                        contentFit="contain"
                      />
                      <Text className="font-bold text-lg mt-2">Ambulance Mini</Text>
                      <Text className="text-gray-500 text-center mt-1">Basic equipment</Text>
                      <Text className="text-gray-500 text-center">For non-critical transport</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {ambulanceType && (
                  <TouchableOpacity
                    className="bg-green-500 p-4 rounded-xl mt-6"
                    onPress={() => setShowConfirmation(true)}
                  >
                    <Text className="text-white text-center font-bold text-lg">
                      Book {ambulanceType.toUpperCase()} Ambulance
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Modalize>

            {/* Confirmation Modal */}
            <Modal
              animationType="fade"
              transparent={true}
              visible={showConfirmation}
              onRequestClose={() => setShowConfirmation(false)}
            >
              <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-white p-6 rounded-xl w-[80%] items-center">
                  <Image
                    source={
                      ambulanceType === "XL" ? require("@/assets/images/xl.png") : require("@/assets/images/mini.png")
                    }
                    style={{ width: 150, height: 100 }}
                    contentFit="contain"
                  />
                  <Text className="text-xl font-bold mt-4">Confirm Booking</Text>
                  <Text className="text-gray-600 text-center my-3">
                    Are you sure you want to book an {ambulanceType?.toUpperCase()} ambulance?
                  </Text>

                  <View className="flex-row justify-between w-full mt-4">
                    <TouchableOpacity
                      className="bg-gray-200 p-3 rounded-lg w-[48%]"
                      onPress={() => setShowConfirmation(false)}
                    >
                      <Text className="text-center font-semibold">Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="bg-green-500 p-3 rounded-lg w-[48%]" onPress={confirmBooking}>
                      <Text className="text-white text-center font-semibold">Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}
