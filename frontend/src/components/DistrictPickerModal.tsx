import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, borderRadius, spacing } from '@/theme';
import { SRI_LANKA_DISTRICTS, type SriLankaDistrict } from '@/utils/validation';

interface DistrictPickerModalProps {
  selectedDistrict: string;
  onSelectDistrict: (district: SriLankaDistrict) => void;
  onLocationDetected?: (coords: { lat: number; lng: number; district?: string; city?: string }) => void;
  label?: string;
  required?: boolean;
}

export function DistrictPickerModal({
  selectedDistrict,
  onSelectDistrict,
  onLocationDetected,
  label = 'District',
  required = true,
}: DistrictPickerModalProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [detecting, setDetecting] = useState(false);

  const filteredDistricts = SRI_LANKA_DISTRICTS.filter((d) =>
    d.toLowerCase().includes(search.toLowerCase().trim()),
  );

  const handleSelect = (d: SriLankaDistrict) => {
    onSelectDistrict(d);
    setModalVisible(false);
    setSearch('');
  };

  const handleDetectGPS = async () => {
    try {
      setDetecting(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Denied',
          'GPS location permissions are required to auto-detect your Sri Lankan district.',
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (address) {
        // Find matching district from subregion or region
        const candidate = address.subregion || address.region || address.city || '';
        const matched = SRI_LANKA_DISTRICTS.find((d) =>
          candidate.toLowerCase().includes(d.toLowerCase()),
        );

        if (matched) {
          onSelectDistrict(matched);
        } else {
          onSelectDistrict('Colombo');
        }

        if (onLocationDetected) {
          onLocationDetected({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            district: matched || 'Colombo',
            city: address.city || address.district || address.name || undefined,
          });
        }

        setModalVisible(false);
        Alert.alert(
          'Location Detected',
          `Auto-detected location: ${address.city || address.subregion || address.region || 'Colombo'}.`,
        );
      }
    } catch (err: any) {
      Alert.alert('GPS Notice', err.message || 'Could not fetch current coordinates. Please pick from list.');
    } finally {
      setDetecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>

      <TouchableOpacity
        style={styles.selectorBtn}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="location-outline" size={18} color="#64748B" style={styles.icon} />
        <Text
          style={[
            styles.selectorText,
            !selectedDistrict && { color: '#94A3B8' },
          ]}
          numberOfLines={1}
        >
          {selectedDistrict || 'Select District...'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#64748B" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Sri Lanka District</Text>
                <Text style={styles.modalSub}>Official 25 Administrative Districts</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {/* GPS Auto-detect Button */}
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleDetectGPS}
              disabled={detecting}
              activeOpacity={0.8}
            >
              {detecting ? (
                <ActivityIndicator size="small" color="#DC2626" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="navigate-circle" size={20} color="#DC2626" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.gpsBtnText}>
                {detecting ? 'Detecting via GPS...' : 'Use My Current GPS / Google Map Location'}
              </Text>
            </TouchableOpacity>

            {/* Search Box */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search district (e.g. Colombo, Kandy)..."
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* District List */}
            <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
              {filteredDistricts.map((d) => {
                const isSelected = selectedDistrict === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.item, isSelected && styles.itemSelected]}
                    onPress={() => handleSelect(d)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemLeft}>
                      <Ionicons
                        name="location-sharp"
                        size={16}
                        color={isSelected ? '#DC2626' : '#94A3B8'}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                        {d}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#DC2626" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  required: {
    color: '#DC2626',
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  selectorText: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: borderRadius.md,
  },
  gpsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  itemTextSelected: {
    color: '#DC2626',
    fontWeight: '800',
  },
});
