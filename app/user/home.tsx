"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, Modal } from "react-native"
import { SafeAreaView } from "react-native"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import * as Location from "expo-location"
import { StatusBar } from "expo-status-bar"
import { Modalize } from "react-native-modalize"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { Image } from "expo-image"
import { useNavigation } from "expo-router"

const AMBULANCES = [
  {
    id: "1",
    name: "Global Hospital Ambulance",
    distance: "0.5 km",
    eta: "2 min",
    phone: "+91 22 6772 6772",
    location: {
      latitude: 40.7628,
      longitude: 72.8422,
    },
  },
  {
    id: "2",
    name: "Wadia Hospital Ambulance",
    distance: "1.1 km",
    eta: "4 min",
    phone: "+91 22 2372 1111",
    location: {
      latitude: 18.9788,
      longitude: 72.8395,
    },
  },
  {
    id: "3",
    name: "Masina Hospital Emergency",
    distance: "1.8 km",
    eta: "7 min",
    phone: "+91 22 6960 6060",
    location: {
      latitude: 18.9895,
      longitude: 72.8324,
    },
  },
  {
    id: "4",
    name: "J.J. Hospital Ambulance",
    distance: "2.3 km",
    eta: "9 min",
    phone: "+91 22 2373 5555",
    location: {
      latitude: 18.9634,
      longitude: 72.8351,
    },
  },
  {
    id: "5",
    name: "KEM Hospital Ambulance",
    distance: "3.1 km",
    eta: "12 min",
    phone: "+91 22 2410 7000",
    location: {
      latitude: 18.9895,
      longitude: 72.8345,
    },
  },
]

export default function Home() {
  const [location, setLocation] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<any>(null)
  const [ambulanceType, setAmbulanceType] = useState<"xl" | "mini" | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const navigation=useNavigation<any>()
  const mapRef = useRef<any>(null)

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        return
      }

      const location = await Location.getCurrentPositionAsync({})
      setLocation(location)
    })()
  }, [])

  const handleAmbulanceSelect = (type: "xl" | "mini") => {
    setAmbulanceType(type)
    setShowConfirmation(true)
  }

  const confirmBooking = () => {
    navigation.navigate("user/routepage")
    setShowConfirmation(false)
    // Additional booking confirmation logic
  }

  let initialRegion = {
    latitude: 18.9634,
    longitude: 72.8351,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }

  if (location) {
    initialRegion = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
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
              {AMBULANCES.map((ambulance) => (
                <Marker
                  key={ambulance.id}
                  coordinate={ambulance.location}
                  title={ambulance.name}
                  description={`ETA: ${ambulance.eta}`}
                >
                  <View className="bg-white p-2 rounded-full shadow-md">
                    <Image source={require("@/assets/images/mini.png")} style={{ width: 24, height: 24 }} />
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
                <Text className="text-gray-500">{AMBULANCES.length} ambulances available</Text>
              </View>

              <View className="px-4 py-4">
                <Text className="text-xl font-bold mb-4">Select Ambulance Type</Text>
                <View className="flex-row justify-between">
                  <TouchableOpacity
                    className={`w-[48%] border-2 rounded-xl p-3 ${ambulanceType === "xl" ? "border-red-500" : "border-gray-200"}`}
                    onPress={() => handleAmbulanceSelect("xl")}
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
                    className={`w-[48%] border-2 rounded-xl p-3 ${ambulanceType === "mini" ? "border-red-500" : "border-gray-200"}`}
                    onPress={() => handleAmbulanceSelect("mini")}
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
                      ambulanceType === "xl" ? require("@/assets/images/xl.png") : require("@/assets/images/mini.png")
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

