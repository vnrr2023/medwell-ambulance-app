"use client"

import {  useLocalSearchParams, useRouter } from "expo-router"
import { useState } from "react"
import { SafeAreaView, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import { ngrok_url } from "@/data/id"

export default function Signup() {
  const { role } = useLocalSearchParams()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [loading, setLoading] = useState(false)
    const navigation:any=useRouter()
  const userType = role 

  const handleSignup = async () => {
    if (!name || !email || !mobileNumber) {
      Alert.alert("Error", "Please fill all fields")
      return
    }

    try {
      setLoading(true)
            try{
                console.log(email,mobileNumber,name,userType)
                const datas= {
                    "email":email,
                    "mobileNumber":mobileNumber,
                    "name":name,
                    "userType":userType,
                }
                const response = await axios.post(`${ngrok_url}/authentication/register`,datas, {
                headers: {
                    "Content-Type": "application/json",
                },
                })

                const data = await response.data
                console.log(data)
                if (role=="AMBULANCE"){

                  await AsyncStorage.setItem("ambulanceID", data.id)
                }else{
                  await AsyncStorage.setItem("customerID", data.id)

                }

                await AsyncStorage.setItem("Role", role?.toString() || "")

                Alert.alert("Success", "Registration successful!", [{ text: "OK" }])
                if (role=="AMBULANCE"){
                    navigation.push("auth/complete-profile/profile")
                }else if(role=="CUSTOMER"){
                    navigation.push("/user/home")
                }
            }catch(error){
                console.log("Error while sending data",error)
            }


    } catch (error:any) {
      Alert.alert("Error", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 p-5 bg-white justify-center">
    
      <Text className="text-2xl font-bold mb-2 text-center">{role}</Text>
      <Text className="text-2xl font-bold mb-2 text-center"> Sign Up</Text>

      <View className="w-full">
        <Text className="text-base font-medium mb-2">Name</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 mb-4 text-base"
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
        />

        <Text className="text-base font-medium mb-2">Email</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 mb-4 text-base"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text className="text-base font-medium mb-2">Mobile Number</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 mb-4 text-base"
          value={mobileNumber}
          onChangeText={setMobileNumber}
          placeholder="Enter your mobile number"
          keyboardType="phone-pad"
          maxLength={10}
        />

        <TouchableOpacity
          className="bg-blue-500 p-4 rounded-lg items-center mt-4"
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-base font-bold">Register</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

