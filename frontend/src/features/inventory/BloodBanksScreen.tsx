import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, type Region } from 'react-native-maps';
import { AppHeader } from '@/components/AppHeader';
import { colors, borderRadius, spacing } from '@/theme';
import { useBloodBanks } from './hooks';
import { inventoryStrings } from './strings';
import type { BloodGroup } from './types';
import { BankCard } from './components/BankCard';
import { EmptyState, ErrorState, LoadingSkeleton } from './components';

const strings = inventoryStrings.en;

const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const colomboRegion: Region = { latitude: 6.9271, longitude: 79.8612, latitudeDelta: 0.12, longitudeDelta: 0.12 };
type StockFilter = 'nearest' | 'open' | 'high';

export function BloodBanksScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>('nearest');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | undefined>();
  const [region, setRegion] = useState<Region>(colomboRegion);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);

  useEffect(() => {
    let active = true;
    const requestLocation = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!active) return;
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationMessage(strings.locationPermission);
        setLocationReady(true);
        return;
      }
      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active) return;
        const { latitude, longitude } = position.coords;
        setRegion({ latitude, longitude, latitudeDelta: 0.12, longitudeDelta: 0.12 });
      } catch (error) {
        console.error('[inventory] Location request failed:', error);
        setLocationMessage(strings.locationPermission);
      } finally {
        if (active) setLocationReady(true);
      }
    };
    void requestLocation();
    return () => { active = false; };
  }, []);

  const banks = useBloodBanks({
    lat: locationReady ? region.latitude : undefined,
    lng: locationReady ? region.longitude : undefined,
    radiusKm: 50,
    bloodGroup,
    filter,
  });
  const filteredBanks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return banks.data;
    return banks.data.filter((bank) => `${bank.name} ${bank.address} ${bank.district}`.toLowerCase().includes(query));
  }, [banks.data, search]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={strings.title} subtitle={strings.subtitle} />
      <ScrollView contentContainerStyle={styles.content}>
        {banks.isOfflineDemo ? <Text style={styles.offlineBanner}>{strings.offlineDemo}</Text> : null}
        {locationMessage ? <Text style={styles.locationMessage}>{locationMessage}</Text> : null}
        <MapView style={styles.map} initialRegion={region} region={region} accessibilityLabel={strings.mapLabel}>
          {banks.data.map((bank) => (
            <Marker
              key={bank.id}
              coordinate={{ latitude: bank.location.coordinates[1], longitude: bank.location.coordinates[0] }}
              title={bank.name}
              description={bank.address}
              onCalloutPress={() => router.push(`/inventory/${bank.id}`)}
            />
          ))}
        </MapView>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={strings.searchPlaceholder}
          accessibilityLabel={strings.searchLabel}
          style={styles.search}
          returnKeyType="search"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {([
            ['nearest', strings.nearest],
            ['open', strings.openNow],
            ['high', strings.highStock],
          ] as const).map(([value, label]) => (
            <TouchableOpacity key={value} onPress={() => setFilter(value)} style={[styles.filterChip, filter === value && styles.activeChip]} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: filter === value }}>
              <Text style={[styles.chipText, filter === value && styles.activeChipText]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <TouchableOpacity onPress={() => setBloodGroup(undefined)} style={[styles.groupChip, !bloodGroup && styles.activeGroupChip]} accessibilityRole="button" accessibilityLabel={strings.allBloodGroups}>
            <Text style={styles.groupText}>{strings.all}</Text>
          </TouchableOpacity>
          {bloodGroups.map((group) => (
            <TouchableOpacity key={group} onPress={() => setBloodGroup(group)} style={[styles.groupChip, bloodGroup === group && styles.activeGroupChip]} accessibilityRole="button" accessibilityLabel={`${strings.bloodGroup} ${group}`}>
              <Text style={styles.groupText}>{group}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {banks.loading ? <LoadingSkeleton rows={3} /> : banks.error ? (
          <ErrorState message={banks.error} actionLabel={strings.tryAgain} onRetry={() => void banks.refetch()} />
        ) : filteredBanks.length === 0 ? <EmptyState title={strings.noBanks} /> : (
          <View style={styles.list}>
            {filteredBanks.map((bank) => (
              <TouchableOpacity key={bank.id} onPress={() => router.push(`/inventory/${bank.id}`)} accessibilityRole="button" accessibilityLabel={`${strings.openDetails} ${bank.name}`}>
                <BankCard bank={bank} openLabel={strings.open} closedLabel={strings.closed} distanceLabel={strings.distanceUnavailable} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        {banks.loading ? <ActivityIndicator color={colors.primary} accessibilityLabel={strings.loading} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md, gap: spacing.sm },
  offlineBanner: { padding: spacing.sm, borderRadius: borderRadius.sm, backgroundColor: colors.tertiaryLight, color: colors.tertiaryDark, fontWeight: '700' },
  locationMessage: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  map: { height: 210, borderRadius: borderRadius.md, overflow: 'hidden' },
  search: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: colors.text },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  filterChip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: borderRadius.full, backgroundColor: colors.secondarySoft },
  activeChip: { backgroundColor: colors.primary },
  chipText: { color: colors.textSecondary, fontWeight: '700' },
  activeChipText: { color: colors.textInverted },
  groupChip: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.full, backgroundColor: colors.primaryLight },
  activeGroupChip: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  groupText: { color: colors.primaryDark, fontWeight: '800' },
  list: { gap: spacing.sm },
});
