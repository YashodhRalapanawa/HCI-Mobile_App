import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';

interface RoleTabsProps {
  selectedRole: 'donor' | 'recipient';
  onSelectRole: (role: 'donor' | 'recipient') => void;
}

export function RoleTabs({ selectedRole, onSelectRole }: RoleTabsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, selectedRole === 'donor' && styles.tabActiveDonor]}
        onPress={() => onSelectRole('donor')}
        activeOpacity={0.8}
      >
        <Ionicons
          name="water"
          size={16}
          color={selectedRole === 'donor' ? '#FFFFFF' : colors.textMuted}
          style={{ marginRight: 6 }}
        />
        <Text style={[styles.tabText, selectedRole === 'donor' && styles.tabTextActive]}>
          Blood Donor
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedRole === 'recipient' && styles.tabActiveRecipient]}
        onPress={() => onSelectRole('recipient')}
        activeOpacity={0.8}
      >
        <Ionicons
          name="heart"
          size={16}
          color={selectedRole === 'recipient' ? '#FFFFFF' : colors.textMuted}
          style={{ marginRight: 6 }}
        />
        <Text style={[styles.tabText, selectedRole === 'recipient' && styles.tabTextActive]}>
          Recipient
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
  },
  tabActiveDonor: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabActiveRecipient: {
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
