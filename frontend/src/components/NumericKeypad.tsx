import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';

interface NumericKeypadProps {
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
}

export function NumericKeypad({ onKeyPress, onBackspace, onClear }: NumericKeypadProps) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', 'DEL'],
  ];

  return (
    <View style={styles.container}>
      {keys.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            if (key === 'DEL') {
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.key, styles.specialKey]}
                  onPress={onBackspace}
                  activeOpacity={0.6}
                >
                  <Ionicons name="backspace-outline" size={24} color={colors.text} />
                </TouchableOpacity>
              );
            }
            if (key === 'C') {
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.key, styles.specialKey]}
                  onPress={onClear ? onClear : () => {}}
                  activeOpacity={0.6}
                >
                  <Text style={styles.specialKeyText}>C</Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={key}
                style={styles.key}
                onPress={() => onKeyPress(key)}
                activeOpacity={0.6}
              >
                <Text style={styles.keyText}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  key: {
    width: '30%',
    height: 58,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialKey: {
    backgroundColor: '#F9FAFB',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  specialKeyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMuted,
  },
});
