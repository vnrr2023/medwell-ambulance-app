import React from "react";
import { Text, SafeAreaView, FlatList, View, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Clock, Phone, ArrowRight } from "lucide-react-native";

const EMERGENCIES = [
  {
    id: "1",
    coordinates: { latitude: 40.7128, longitude: -74.006 },
    timeReported: "10:23",
    contactNumber: "1234567891",
  },
  {
    id: "2",
    coordinates: { latitude: 40.7328, longitude: -74.026 },
    timeReported: "10:45",
    contactNumber: "1234567891",
  },
  {
    id: "3",
    coordinates: { latitude: 40.7228, longitude: -74.016 },
    timeReported: "21:02",
    contactNumber: "1234567891",
  },
  {
    id: "4",
    coordinates: { latitude: 40.7328, longitude: -74.016 },
    timeReported: "11:15",
    contactNumber: "1234567891",
  },
  {
    id: "5",
    coordinates: { latitude: 40.7428, longitude: -74.036 },
    timeReported: "21:30",
    contactNumber: "1234567891",
  },
  {
    id: "6",
    coordinates: { latitude: 40.7528, longitude: -74.046 },
    timeReported: "11:45",
    contactNumber: "1234567891",
  },
  {
    id: "7",
    coordinates: { latitude: 40.7628, longitude: -74.056 },
    timeReported: "12:05",
    contactNumber: "1234567891",
  },
];

export default function Home() {
  const navigation = useNavigation<any>();

  const handleAcceptEmergency = (emergencyId: string) => {
    navigation.navigate("ems/routepage", { emergencyId });
  };
  
  const renderEmergencyItem = ({ item }: { item: any }) => (
    <View className="bg-white rounded-xl shadow-md mb-4 overflow-hidden">
      <View className="p-4">
        <View className="mb-2">
          <Text className="text-lg font-bold">Emergency #{item.id}</Text>
        </View>
        
        <View className="flex-row items-center mb-2">
          <Clock size={16} color="#6b7280" />
          <Text className="text-gray-600 ml-2 text-sm">{item.timeReported}</Text>
        </View>
        
        <View className="flex-row items-center">
          <Phone size={16} color="#6b7280" />
          <Text className="text-gray-600 ml-2">{item.contactNumber}</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        className="bg-blue-600 py-3 px-4 flex-row justify-center items-center"
        onPress={() => handleAcceptEmergency(item.id)}
      >
        <Text className="text-white font-bold text-center mr-2">ACCEPT EMERGENCY</Text>
        <ArrowRight size={18} color="white" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="bg-blue-700 px-4 py-4">
        <Text className="text-white text-2xl font-bold">EMS Dispatch</Text>
        <Text className="text-blue-100 text-sm">Active Emergencies: {EMERGENCIES.length}</Text>
      </View>
      
      <FlatList
        data={EMERGENCIES}
        renderItem={renderEmergencyItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}