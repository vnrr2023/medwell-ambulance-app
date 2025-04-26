import { useState, useEffect } from "react"
import { View, Text, TextInput, Image, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from "react-native"
import axios from "axios"
import { ngrok_url } from "@/data/id"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useRouter } from "expo-router"

export default function AmbulanceProfile() {
  const [loading, setLoading] = useState(false)
  const [ambulanceData, setAmbulanceData] = useState({
    ambulanceType: "",
    numberPlate: "",
    ambulanceBrandName: "",
    userId: "",
  })
  const router = useRouter()

  // Load userId when component mounts
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const userId = await AsyncStorage.getItem("ambulanceID")
        if (userId) {
          setAmbulanceData(prev => ({ ...prev, userId }))
        }
      } catch (error) {
        console.error("Error loading user ID:", error)
      }
    }
    
    loadUserId()
  }, [])

  const handleSubmit = async () => {
    if (!ambulanceData.ambulanceType || !ambulanceData.numberPlate || !ambulanceData.ambulanceBrandName) {
      Alert.alert("Error", "Please fill all the fields")
      return
    }

    setLoading(true)
    
    try {
      // Store the ambulance type for future reference
      await AsyncStorage.setItem("ambulanceTYPE", ambulanceData.ambulanceType)
      
      // Make API call with complete data
      const response = await axios.post(ngrok_url + "/ambulance/complete-profile", ambulanceData)
      
      console.log("Profile completed successfully:", response.data)
      Alert.alert("Success", "Ambulance profile completed successfully!")
      
      router.push("/ems/home")
    } catch (error) {
      console.error("Error completing profile:", error)
      Alert.alert("Error", "Failed to complete profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const AmbulanceTypeOption = ({ type, image }:{type:any,image:any}) => (
    <TouchableOpacity
      className={`flex-row items-center p-4 border rounded-lg mb-2 ${
        ambulanceData.ambulanceType === type ? "border-blue-500 bg-blue-50" : "border-gray-300"
      }`}
      onPress={() => setAmbulanceData({ ...ambulanceData, ambulanceType: type })}
    >
      <Image source={image} className="w-16 h-16 mr-4" resizeMode="contain" />
      <Text className="text-lg font-medium">{type}</Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView className="flex-1 bg-white p-4 justify-center">
      <Text className="text-2xl font-bold mb-6">Complete Ambulance Profile</Text>

      <View className="mb-6">
        <Text className="text-lg font-medium mb-2">Ambulance Type</Text>
        <AmbulanceTypeOption type="XL" image={require("@/assets/images/xl.png")} />
        <AmbulanceTypeOption type="MINI" image={require("@/assets/images/mini.png")} />
      </View>

      <View className="mb-4">
        <Text className="text-lg font-medium mb-2">Number Plate</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 text-base"
          placeholder="e.g. MH12AB1234"
          value={ambulanceData.numberPlate}
          onChangeText={(text) => setAmbulanceData({ ...ambulanceData, numberPlate: text })}
        />
      </View>

      <View className="mb-6">
        <Text className="text-lg font-medium mb-2">Ambulance Brand Name</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 text-base"
          placeholder="e.g. TATA"
          value={ambulanceData.ambulanceBrandName}
          onChangeText={(text) => setAmbulanceData({ ...ambulanceData, ambulanceBrandName: text })}
        />
      </View>

      <TouchableOpacity
        className={`py-4 rounded-lg items-center ${loading ? "bg-blue-300" : "bg-blue-500"}`}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white font-bold text-lg">Complete Profile</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  )
}