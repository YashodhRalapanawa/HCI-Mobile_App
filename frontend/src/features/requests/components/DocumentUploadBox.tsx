import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, borderRadius } from '@/theme';
import type { SelectedDocument } from '../types';

interface DocumentUploadBoxProps {
  document: SelectedDocument | null;
  onSelectDocument: (doc: SelectedDocument | null) => void;
  error?: string;
  disabled?: boolean;
}

export function DocumentUploadBox({
  document,
  onSelectDocument,
  error,
  disabled = false,
}: DocumentUploadBoxProps) {
  const handlePickDocument = async () => {
    if (disabled) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        if (file) {
          onSelectDocument({
            uri: file.uri,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
          });
        }
      }
    } catch (err) {
      console.warn('[upload] Document picker error:', err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${Math.round(kb)} KB`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.uploadBox,
          Boolean(error) && styles.uploadBoxError,
          Boolean(document) && styles.uploadBoxFilled,
        ]}
        onPress={handlePickDocument}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <View style={styles.contentRow}>
          <View style={[styles.iconBox, Boolean(document) && styles.iconBoxFilled]}>
            <Ionicons
              name={document ? 'document-text' : 'cloud-upload-outline'}
              size={24}
              color={colors.primary}
            />
          </View>

          <View style={styles.textContainer}>
            {document ? (
              <>
                <Text style={styles.fileName} numberOfLines={1}>
                  {document.name}
                </Text>
                <Text style={styles.fileMeta}>
                  {formatFileSize(document.size)} • Tap to replace file
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>Upload hospital request</Text>
                <Text style={styles.subtitle}>Tap to add a PDF, JPG or PNG</Text>
              </>
            )}
          </View>

          {document ? (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={(e) => {
                e.stopPropagation();
                onSelectDocument(null);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  uploadBox: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  uploadBoxError: {
    borderColor: colors.danger,
    backgroundColor: '#FEF2F2',
  },
  uploadBoxFilled: {
    borderStyle: 'solid',
    borderColor: colors.primarySoft,
    backgroundColor: '#FFFFFF',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxFilled: {
    backgroundColor: '#FFE4E6',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  fileMeta: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  removeBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
});
