import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CollectibleUploadConfirmModal } from './CollectibleUploadConfirmModal';
import { colors } from '../constants/theme';
import { useGlobalCollectibleUpload } from '../hooks/useGlobalCollectibleUpload';
import { useI18n } from '../i18n';
import type { Castle } from '../types/castle';
import type { CollectibleUploadSource } from '../utils/castleCollectibleUpload';

type GlobalCollectibleUploadProps = {
  castles: readonly Castle[];
  enabled: boolean;
  onRegisterOpen?: (openSourcePicker: () => void) => void;
};

const UPLOAD_SOURCES: CollectibleUploadSource[] = ['scan', 'file', 'gallery'];

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
    case 'global-upload-pdf-not-supported':
      return t('globalUpload.pdfNotSupported');
    case 'global-upload-failed':
      return t('globalUpload.failed');
    case 'Failed to read selected file':
    case 'Failed to write selected file':
    case 'Failed to save collectible':
    case 'Failed to persist upload image':
    case 'picker-timeout':
      return t('globalUpload.failed');
    default:
      return error;
  }
}

export function GlobalCollectibleUploadFab({
  castles,
  enabled,
  onRegisterOpen,
}: GlobalCollectibleUploadProps) {
  const { t } = useI18n();
  const {
    phase,
    draft,
    error,
    openSourcePicker,
    closeFlow,
    selectSource,
    confirmUpload,
  } = useGlobalCollectibleUpload();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    onRegisterOpen?.(openSourcePicker);
  }, [enabled, onRegisterOpen, openSourcePicker]);

  const errorMessage = getErrorMessage(error, t);
  const isConfirmPhase = phase === 'confirm' || phase === 'saving';
  const showSourcePicker = phase === 'source-picker';
  const isPicking = phase === 'picking';

  if (!enabled && !showSourcePicker && !isConfirmPhase && !isPicking) {
    return null;
  }

  return (
    <>
      <Modal visible={isPicking} transparent animationType="fade">
        <View style={styles.pickingOverlay}>
          <ActivityIndicator size="large" color={colors.surface} />
        </View>
      </Modal>

      <Modal
        visible={showSourcePicker}
        transparent
        animationType="fade"
        onRequestClose={closeFlow}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeFlow}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('globalUpload.chooseSource')}</Text>
            {UPLOAD_SOURCES.map((source) => (
              <Pressable
                key={source}
                accessibilityRole="button"
                onPress={() => void selectSource(source)}
                style={styles.modalOption}
              >
                <Text style={styles.modalOptionLabel}>
                  {getUploadSourceLabel(source, t)}
                </Text>
              </Pressable>
            ))}
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            <Pressable accessibilityRole="button" onPress={closeFlow} style={styles.modalCancel}>
              <Text style={styles.modalCancelLabel}>{t('common.close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {draft && isConfirmPhase ? (
        <CollectibleUploadConfirmModal
          key={draft.selection.uri}
          visible={isConfirmPhase}
          draft={draft}
          castles={castles}
          saving={phase === 'saving'}
          errorMessage={errorMessage}
          onClose={closeFlow}
          onConfirm={(castleId, kind) => void confirmUpload(castleId, kind)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
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
  errorText: {
    fontSize: 13,
    color: colors.continued,
    lineHeight: 18,
  },
  pickingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
});
