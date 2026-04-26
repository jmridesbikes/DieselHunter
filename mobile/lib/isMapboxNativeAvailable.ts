import { NativeModules } from 'react-native';

/** False in Expo Go and any build without @rnmapbox/maps linked. */
export const isMapboxNativeAvailable = NativeModules.RNMBXModule != null;
