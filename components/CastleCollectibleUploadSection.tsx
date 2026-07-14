import { lazy, Suspense, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '../constants/theme';
import { useCastleCollectibles } from '../hooks/useCastleCollectibles';
import { useI18n } from '../i18n';
import type { CollectibleKind } from '../types/castleCollectible';
import type { CollectibleUploadSource } from '../utils/castleCollectibleUpload';
import { isImageCollectible } from '../utils/castleCollectibleStorage';
import { getDisplayImageUri } from '../utils/collectibleFileIO';

type CastleCollectibleUploadSectionProps = {
  castleId: number;
  kind: CollectibleKind;
  title: string;
};

const UPLOAD_SOURCES: CollectibleUploadSource[] = ['scan', 'file', 'gallery'];

const CollectibleGalleryViewer = lazy(async () => {
  const module = await import('./CollectibleGalleryViewer');
  return { default: module.CollectibleGalleryViewer };
});

function getUploadSourceLabel(
  source: CollectibleUploadSource,
  t: (key: string) => string,
): string {
  switch (source) {
    case 'scan':
      return t('castle.collectibleScan');
    case 'file':
      return t('castle.collectibleUploadFile');
    case 'gallery':
      return t('castle.collectiblePhotoLibrary');
  }
}

function getErrorMessage(error: string | null, t: (key: string) => string): string | null {
  if (!error) {
    return null;
  }

  switch (error) {
    case 'camera-permission-denied':
      return t('castle.collectibleCameraPermissionDenied');
    case 'media-permission-denied':
      return t('castle.collectibleMediaPermissionDenied');
    case 'collectible-load-failed':
      return t('castle.collectibleLoadFailed');
    case 'collectible-upload-failed':
      return t('castle.collectibleUploadFailed');
    case 'Failed to read selected file':
    case 'Failed to write selected file':
    case 'Failed to save collectible':
    case 'Failed to persist upload image':
    case 'picker-timeout':
      return t('castle.collectibleUploadFailed');
    default:
      return error;
  }
}

export function CastleCollectibleUploadSection({
  castleId,
  kind,
  title,
}: CastleCollectibleUploadSectionProps) {
  const { t } = useI18n();
  const { items, loading, uploading, error, uploadFromSource, removeItem } =
    useCastleCollectibles(castleId, kind);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const handleSelectSource = async (source: CollectibleUploadSource) => {
    setPickerVisible(false);
    await uploadFromSource(source);
  };

  const errorMessage = getErrorMessage(error, t);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={uploading}
          onPress={() => setPickerVisible(true)}
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Text style={styles.uploadButtonLabel}>{t('castle.collectibleUpload')}</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.hint}>{t('castle.collectibleStorageHint')}</Text>

      {loading ? (
        <ActivityIndicator size="small" color={colors.original} />
      ) : items.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => {
                setViewerIndex(index);
                setViewerVisible(true);
              }}
              onLongPress={() => removeItem(item)}
              style={styles.thumbnailCard}
            >
              {isImageCollectible(item) ? (
                <Image
                  source={{ uri: getDisplayImageUri(item.uri) }}
                  style={styles.thumbnailImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.pdfThumbnail}>
                  <Text style={styles.pdfLabel}>PDF</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.emptyText}>{t('castle.collectibleEmpty')}</Text>
      )}

      {items.length > 0 ? (
        <Text style={styles.deleteHint}>{t('castle.collectibleDeleteHint')}</Text>
      ) : null}

      {viewerVisible ? (
        <Suspense fallback={null}>
          <CollectibleGalleryViewer
            items={items}
            initialIndex={viewerIndex}
            visible={viewerVisible}
            onClose={() => setViewerVisible(false)}
          />
        </Suspense>
      ) : null}

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('castle.collectibleChooseSource')}</Text>
            {UPLOAD_SOURCES.map((source) => (
              <Pressable
                key={source}
                accessibilityRole="button"
                onPress={() => void handleSelectSource(source)}
                style={styles.modalOption}
              >
                <Text style={styles.modalOptionLabel}>{getUploadSourceLabel(source, t)}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerVisible(false)}
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelLabel}>{t('common.close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  uploadButton: {
    minWidth: 88,
    minHeight: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: colors.original,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surface,
  },
  gallery: {
    gap: 10,
    paddingVertical: 4,
  },
  thumbnailCard: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  pdfThumbnail: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.originalLight,
  },
  pdfLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.original,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  deleteHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 13,
    color: colors.continued,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  modalOption: {
    borderRadius: 12,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  modalOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalCancel: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalCancelLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.original,
  },
});
