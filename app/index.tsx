import { Link } from "expo-router";
import { Text, View, TouchableOpacity, StatusBar } from "react-native";
import { Image } from 'expo-image';

export default function Index() {
  return (
    <View className="flex-1 bg-blue-500">
       <StatusBar backgroundColor="#3b82f6" barStyle="light-content" />
      <View className="absolute w-full top-20 items-center overflow-hidden">
        <Image 
          source={require("@/assets/images/line.png")} 
          className="opacity-30"
          contentFit="cover"
          style={{ width: '200%', height: 300 }}
        />
      </View>
      
      <View className="flex-1 justify-center items-center px-6">
        <View className="w-64 h-64 rounded-full overflow-hidden mb-12 border-4 border-white shadow-xl bg-white">
        <Image source={require("@/assets/images/ambulance.gif")} 
            style={{height:220,width:220}} 
            className="w-full h-full"
            contentFit="cover" 
            autoplay
          />
        </View>
        
        <View className="w-full max-w-xs gap-6">
          <Link href={"/user/home"} asChild>
            <TouchableOpacity className="bg-white py-5 rounded-xl shadow-lg active:bg-gray-100 flex-row items-center justify-center">
            <Image
              source={require("@/assets/icons/user.svg")}
              style={{ width: 24, height: 24, tintColor: "#3b82f6" }}
              resizeMode="contain"
            />

              <Text className="text-blue-500 font-bold text-lg ml-2">User</Text>
            </TouchableOpacity>
          </Link>
          
          <Link href={"/ems/home"} asChild>
            <TouchableOpacity className="bg-blue-600 py-5 rounded-xl shadow-lg active:bg-blue-700 flex-row items-center justify-center">
            <Image
              source={require("@/assets/icons/ambulance.svg")}
              style={{ width: 24, height: 24, tintColor: "#fff" }}
              resizeMode="contain"
            />
              <Text className="text-white font-bold text-lg ml-2">EMS</Text>
            </TouchableOpacity>
          </Link>
        </View>
        
        <View className="mt-16 items-center">
          <Link href={"/ems/fireed"}>
          <Image 
            source={require("@/assets/images/logo.png")} 
            style={{height: 50, width: 50}}
            className="mb-2"
          />
          </Link>
          <Text className="text-white text-xl font-semibold opacity-90">MedWell</Text>
        </View>
      </View>
    </View>
  );
}