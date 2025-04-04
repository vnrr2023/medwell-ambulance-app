import {Text } from "react-native"
import { StatusBar } from "expo-status-bar"
import { Modalize } from "react-native-modalize"
import MapView,{ PROVIDER_GOOGLE } from "react-native-maps"
import { GestureHandlerRootView } from "react-native-gesture-handler";
export default function CommonRoutePg() {
  return (
    <GestureHandlerRootView >
        <StatusBar style="dark"/>
        <MapView 
            style={{ width: '100%', height: '100%' }} 
            provider={PROVIDER_GOOGLE} 
            initialRegion={{
                latitude: 18.9634,
                longitude: 72.8351,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            }}
            showsUserLocation
            showsMyLocationButton
            />
        <Modalize alwaysOpen={200}
                  adjustToContentHeight
                  scrollViewProps={{
                    scrollEnabled: true,
                    nestedScrollEnabled:true
                  }}>
                    <Text>Lorem ipsum dolor, sit amet consectetur adipisicing elit. Recusandae, quos perspiciatis autem libero quis ipsam? Excepturi praesentium libero blanditiis reprehenderit nam ut atque? Consectetur aliquid autem natus, a iusto rerum.Lorem ipsum dolor, sit amet consectetur adipisicing elit. Recusandae, quos perspiciatis autem libero quis ipsam? Excepturi praesentium libero blanditiis reprehenderit nam ut atque? Consectetur aliquid autem natus, a iusto rerum.Lorem ipsum dolor, sit amet consectetur adipisicing elit. Recusandae, quos perspiciatis autem libero quis ipsam? Excepturi praesentium libero blanditiis reprehenderit nam ut atque? Consectetur aliquid autem natus, a iusto rerum.Lorem ipsum dolor, sit amet consectetur adipisicing elit. Recusandae, quos perspiciatis autem libero quis ipsam? Excepturi praesentium libero blanditiis reprehenderit nam ut atque? Consectetur aliquid autem natus, a iusto rerum.Lorem ipsum dolor, sit amet consectetur adipisicing elit. Recusandae, quos perspiciatis autem libero quis ipsam? Excepturi praesentium libero blanditiis reprehenderit nam ut atque? Consectetur aliquid autem natus, a iusto rerum.Lorem ipsum dolor, sit amet consectetur adipisicing elit. Recusandae, quos perspiciatis autem libero quis ipsam? Excepturi praesentium libero blanditiis reprehenderit nam ut atque? Consectetur aliquid autem natus, a iusto rerum.</Text>
        </Modalize>
       
    </GestureHandlerRootView>
  )
}
