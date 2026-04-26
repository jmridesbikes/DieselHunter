import MapView, { Marker, type Region } from 'react-native-maps';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StationLatestRow } from '../types/station';

type Props = {
  center: [number, number];
  locationReady: boolean;
  stations: StationLatestRow[];
  onBoundsFromMap: (b: { ne: [number, number]; sw: [number, number] }) => void;
  onMarkerPress: (row: StationLatestRow) => void;
};

function regionToNE_SW(r: Region): { ne: [number, number]; sw: [number, number] } {
  const halfLat = r.latitudeDelta / 2;
  const halfLng = r.longitudeDelta / 2;
  return {
    ne: [r.longitude + halfLng, r.latitude + halfLat],
    sw: [r.longitude - halfLng, r.latitude - halfLat],
  };
}

export function RNMapsMapView({
  center,
  locationReady,
  stations,
  onBoundsFromMap,
  onMarkerPress,
}: Props) {
  const mapRef = useRef<MapView | null>(null);

  const onRegionChangeComplete = useCallback(
    (r: Region) => {
      onBoundsFromMap(regionToNE_SW(r));
    },
    [onBoundsFromMap]
  );

  useEffect(() => {
    if (!locationReady) return;
    const r: Region = {
      latitude: center[1],
      longitude: center[0],
      latitudeDelta: 0.12,
      longitudeDelta: 0.12,
    };
    mapRef.current?.animateToRegion(r, 500);
  }, [locationReady, center]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      mapType="standard"
      showsUserLocation
      showsMyLocationButton={false}
      initialRegion={{
        latitude: center[1],
        longitude: center[0],
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      }}
      onRegionChangeComplete={onRegionChangeComplete}
    >
      {stations.map((row) => {
        const conf = row.display_confidence_level;
        const bg =
          conf === 'High' ? 'rgba(34,197,94,0.9)' : conf === 'Medium' ? 'rgba(234,179,8,0.95)' : 'rgba(239,68,68,0.9)';
        return (
          <Marker
            key={row.station_id}
            coordinate={{ latitude: row.latitude, longitude: row.longitude }}
            onPress={() => onMarkerPress(row)}
            tracksViewChanges={false}
          >
            <View style={styles.bubbleRow}>
              <View style={[styles.bubble, { backgroundColor: bg }]}>
                <Text style={styles.bubblePrice}>
                  {row.latest_price != null ? `R${Number(row.latest_price).toFixed(2)}` : '—'}
                </Text>
                <Text style={styles.bubbleSub}>{row.display_confidence_level}</Text>
                {row.is_outdated && <Text style={styles.bubbleSub}>outdated</Text>}
              </View>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { alignItems: 'center' },
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
