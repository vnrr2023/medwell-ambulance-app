"use client"

import { useState, useEffect, useRef } from "react"
import { Linking, View, Text, Alert, Clipboard, TouchableOpacity, SafeAreaView } from "react-native"
import MapView, { Polyline, Marker } from "react-native-maps"
import { useFocusEffect } from '@react-navigation/native'
import { useCallback } from 'react'
import polyline from "@mapbox/polyline"
import { StatusBar } from "expo-status-bar"
import Loader from "@/components/loader"
import { Phone, Clock, User, AlertCircle, Siren } from "lucide-react-native"
import { Modalize } from "react-native-modalize"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ngrok_url } from "@/data/id"
import axios from "axios"
import * as Location from "expo-location"



const LiveTrackingMap = () => {
  const [routeCoords, setRouteCoords] = useState<any[]>([])
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<any>(null)
  const [eta, setEta] = useState("12 min")
  const [location, setLocation] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [bookingId, setBookingId] = useState("")
  const [polylineR,setPolylineR]=useState("")
  const [ambulanceDetails, setAmbulanceDetails] = useState({
    driverName: "Vivek Chouhan",
    vehicleNumber: "MH 01 AB 1234",
    phoneNumber: "+91 9876543210",
    status: "Eating vadapav",
  })

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const getBookingIdFromStorage = async () => {
    try{
      const id = await AsyncStorage.getItem("bookingId")
        setBookingId(`${id}`)
        return id
    }catch(err){
      console.log("booking id was not found",err)
    }
    
  }

  const fetchLocationData = useCallback(async (id:any) => {
    if (!id) return
    
    try {
      console.log(id)
      const response = await fetch(`${ngrok_url}/customer/current-location-ambulance/${id}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log(data)
      if (data && data.lat && data.lon) {
        setDriverLocation({
          latitude: data.lat,
          longitude: data.lon,
        })
        setIsConnected(true)
        setErrorMsg(null)
        
      }
    } catch (error) {
      console.error("Error fetching location data:", error)
      setIsConnected(false)
      setErrorMsg("Unable to fetch location updates. Please try again.")
    }
  }, [])
  useEffect(() => {
    const fetchPolyline = async () => {
      try {
        if (!driverLocation || !location) {
          return;
        }
        
        // const response = await axios.get(
        //   `https://gmapsmedwell.vercel.app/get-encoded-polyline/${driverLocation.latitude}/${driverLocation.longitude}/18.952613555387067/72.82096453487598`
        // );
        const response = await axios.get(
          `https://gmapsmedwell.vercel.app/get-encoded-polyline/${driverLocation.latitude}/${driverLocation.longitude}/${location.coords.latitude}/${location.coords.longitude}`
        );
        
        const polylineData = response.data.polyline;
        setPolylineR(polylineData);
        
        const decodedCoords = polyline.decode(polylineData).map(([lat, lng]) => ({
          latitude: lat,
          longitude: lng,
        }));
        setRouteCoords(decodedCoords);
      } catch (error) {
        console.error("Error fetching polyline:", error);
      }
    };
  
    fetchPolyline();
  }, [location]); 

  const startLocationPolling = useCallback((id:any) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
    
    fetchLocationData(id) 
    
    pollingIntervalRef.current = setInterval(() => {
      fetchLocationData(id)
    }, 5000)
    
    console.log("Location polling started")
  }, [fetchLocationData])

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
    }, [startLocationPolling, stopLocationPolling])
  )

  // Initialize the route coordinates from the polyline
  useEffect(() => {
    const decodedCoords = polyline.decode(polylineR).map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }))
    setRouteCoords(decodedCoords)
  }, [])

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

  return R * c 
}

export default LiveTrackingMap