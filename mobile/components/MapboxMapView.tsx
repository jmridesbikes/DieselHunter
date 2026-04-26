import Mapbox, { Camera, LocationPuck, MapView, MarkerView, type MapState, StyleURL } from '@rnmapbox/maps';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StationLatestRow } from '../types/station';

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
let tokenSet = false;
function ensureMapboxToken() {
  if (!mapboxToken || tokenSet) return;
  tokenSet = true;
  void Mapbox.setAccessToken(mapboxToken);
}

type Bounds = { ne: [number, number]; sw: [number, number] };

function stateToBounds(s: MapState | undefined): Bounds | null {
  if (!s?.properties?.bounds) return null;
  const { ne, sw } = s.properties.bounds;
  if (!ne || !sw) return null;
  return { ne: ne as [number, number], sw: sw as [number, number] };
}

type Props = {
  center: [number, number];
  locationReady: boolean;
  stations: StationLatestRow[];
  onBoundsFromMap: (b: { ne: [number, number]; sw: [number, number] }) => void;
  onMarkerPress: (row: StationLatestRow) => void;
};

export function MapboxMapView({
  center,
  locationReady,
  stations,
  onBoundsFromMap,
  onMarkerPress,
}: Props) {
  ensureMapboxToken();

  const onMapIdle = useCallback(
    (state: MapState) => {
      const b = stateToBounds(state);
      if (b) onBoundsFromMap(b);
    },
    [onBoundsFromMap]
  );

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      styleURL={StyleURL.Street}
      onMapIdle={onMapIdle}
      logoEnabled
      scaleBarEnabled={false}
    >
      <Camera
        key={`${locationReady}-${center[0]}-${center[1]}`}
        defaultSettings={{ centerCoordinate: center, zoomLevel: 10 }}
        animationMode="flyTo"
        animationDuration={locationReady ? 800 : 0}
      />
      <LocationPuck puckBearing="heading" />
      {stations.map((row) => {
        const conf = row.display_confidence_level;
        const bg =
          conf === 'High' ? 'rgba(34,197,94,0.9)' : conf === 'Medium' ? 'rgba(234,179,8,0.95)' : 'rgba(239,68,68,0.9)';
        return (
          <MarkerView
            key={row.station_id}
            coordinate={[row.longitude, row.latitude]}
            anchor={{ x: 0.5, y: 1 }}
            allowOverlap
          >
            <Pressable style={styles.markerWrap} onPress={() => onMarkerPress(row)}>
              <View style={[styles.bubble, { backgroundColor: bg }]}>
                <Text style={styles.bubblePrice}>
                  {row.latest_price != null ? `R${Number(row.latest_price).toFixed(2)}` : '—'}
                </Text>
                <Text style={styles.bubbleSub}>{row.display_confidence_level}</Text>
                {row.is_outdated && <Text style={styles.bubbleSub}>outdated</Text>}
              </View>
            </Pressable>
          </MarkerView>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  markerWrap: { alignItems: 'center' },
  bubble: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  bubblePrice: { color: '#0f1419', fontWeight: '800' },
  bubbleSub: { color: 'rgba(0,0,0,0.75)', fontSize: 10, fontWeight: '600' },
});
