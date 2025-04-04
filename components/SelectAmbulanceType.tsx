import { Image } from "expo-image";
import React from "react";
import { SafeAreaView, StatusBar, TouchableOpacity, Text, View } from "react-native";

export default function SelectAmbulanceType({saveAmbulanceType}:any){
    const handleSaveAmbuType=(data:string)=>{
        saveAmbulanceType(data)
    }
    return(
        <SafeAreaView className="flex-1 justify-center items-center bg-blue-500 h-full">
        <StatusBar className="bg-blue-500"/>
        <Text className="text-white text-xl">Select Ambulance Type</Text>
        <Text className="text-white text-xl">Choose the type of ambulance you need</Text>
        <TouchableOpacity onPress={()=>handleSaveAmbuType("mini")}><Image 
          source={require("@/assets/images/mini.png")} 
          className="opacity-30"
          contentFit="cover"
          style={{ width: 300, height: 300 }}
        />
        <Text  className="text-center text-white text-2xl">Mini</Text>
        <View className="border-b border-white p-2"></View>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>handleSaveAmbuType("xl")}><Image 
          source={require("@/assets/images/xl.png")} 
          className="opacity-30"
          contentFit="cover"
          style={{ width: 300, height: 200, margin:50 }}
        />
        <Text className="text-center text-white text-2xl p-4">XL</Text>
        </TouchableOpacity>
        </SafeAreaView>
    )    
}
