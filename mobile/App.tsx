import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MapScreen } from './components/MapScreen';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MapScreen />
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}
