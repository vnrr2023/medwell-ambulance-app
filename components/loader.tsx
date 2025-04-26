import { useEffect, useRef, useState } from "react"
import { SafeAreaView, View, ActivityIndicator, Animated } from "react-native"
import { Image } from "expo-image"

export default function Loader() {
  const messages = [
    "MedWell is connecting Ambulance",
    "Your emergency is our priority",
    "Help is on the way",
    "Dispatching nearest available unit",
    "Tracking your location",
    "Bravo 6 going dark!"
  ]

  const [currentIndex, setCurrentIndex] = useState(0)
  const fadeAnim = useRef(new Animated.Value(1)).current
  const translateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const cycleMessages = () => {
      // Fade out and move current text up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: -20,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Update to next message while invisible
        setCurrentIndex((prevIndex) => (prevIndex + 1) % messages.length)
        translateAnim.setValue(20) // Position new text below

        // Fade in and move new text to center
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(translateAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start()
      })
    }

    // Start the cycle and repeat every 4 seconds
    const interval = setInterval(cycleMessages, 4000)

    // Clean up on unmount
    return () => clearInterval(interval)
  }, [])

  return (
    <SafeAreaView>
      <View className="flex items-center justify-center h-screen bg-blue-500">
        <Image
          source={require("@/assets/images/ambu3d.gif")}
          className="opacity-30"
          contentFit="cover"
          style={{ width: 300, height: 300 }}
        />
        <ActivityIndicator className="p-4" size="large" color="#ffffff" />
        <Animated.Text
          className="text-white text-xl text-center mt-4 px-6"
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: translateAnim }],
          }}
        >
          {messages[currentIndex]}
        </Animated.Text>
      </View>
    </SafeAreaView>
  )
}

