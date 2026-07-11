import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../constants/theme';
import { useI18n } from '../i18n';
import type { CastleCollectible } from '../types/castleCollectible';
import { isImageCollectible } from '../utils/castleCollectibleStorage';
import { getDisplayImageUri } from '../utils/collectibleFileIO';

type CollectibleGalleryViewerProps = {
  items: CastleCollectible[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
};

type GestureAxis = 'none' | 'x' | 'y';

const SWIPE_LOCK_THRESHOLD = 4;
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 0.6;
const PAGE_SWIPE_DISTANCE = 50;

export function CollectibleGalleryViewer({
  items,
  initialIndex,
  visible,
  onClose,
}: CollectibleGalleryViewerProps) {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const gestureAxis = useRef<GestureAxis>('none');
  const currentIndexRef = useRef(initialIndex);
  const translateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(1)).current;
  const contentHeight = height - insets.top - insets.bottom;
  const currentItem = items[currentIndex];

  const resetDismissAnimation = useCallback(() => {
    translateY.setValue(0);
    backdropOpacity.setValue(1);
  }, [backdropOpacity, translateY]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    gestureAxis.current = 'none';
    resetDismissAnimation();
    setCurrentIndex(initialIndex);
    currentIndexRef.current = initialIndex;
  }, [initialIndex, resetDismissAnimation, visible]);

  const dismissViewer = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: height,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      resetDismissAnimation();
    });
  }, [backdropOpacity, height, onClose, resetDismissAnimation, translateY]);

  const snapBack = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }),
      Animated.spring(backdropOpacity, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 0,
      }),
    ]).start();
  }, [backdropOpacity, translateY]);

  const shouldActivatePan = useCallback((dx: number, dy: number) => {
    if (gestureAxis.current !== 'none') {
      return true;
    }

    if (Math.abs(dx) < SWIPE_LOCK_THRESHOLD && Math.abs(dy) < SWIPE_LOCK_THRESHOLD) {
      return false;
    }

    gestureAxis.current = Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x';
    return true;
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          shouldActivatePan(gestureState.dx, gestureState.dy),
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          shouldActivatePan(gestureState.dx, gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          if (gestureAxis.current === 'y' && gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
            backdropOpacity.setValue(Math.max(0.35, 1 - gestureState.dy / (height * 0.75)));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureAxis.current === 'y') {
            const shouldDismiss =
              gestureState.dy > DISMISS_DISTANCE || gestureState.vy > DISMISS_VELOCITY;
            if (shouldDismiss) {
              dismissViewer();
            } else {
              snapBack();
            }
          } else if (gestureAxis.current === 'x' && items.length > 1) {
            const index = currentIndexRef.current;
            if (gestureState.dx <= -PAGE_SWIPE_DISTANCE && index < items.length - 1) {
              setCurrentIndex(index + 1);
            } else if (gestureState.dx >= PAGE_SWIPE_DISTANCE && index > 0) {
              setCurrentIndex(index - 1);
            }
          }

          gestureAxis.current = 'none';
        },
        onPanResponderTerminate: () => {
          gestureAxis.current = 'none';
          snapBack();
        },
      }),
    [dismissViewer, height, items.length, shouldActivatePan, snapBack, translateY, backdropOpacity],
  );

  const openPdf = async (uri: string) => {
    const canOpen = await Linking.canOpenURL(uri);
    if (canOpen) {
      await Linking.openURL(uri);
    }
  };

  if (!visible || items.length === 0 || !currentItem) {
    return null;
  }

  const isImage = isImageCollectible(currentItem);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <Animated.View
        style={[styles.container, { opacity: backdropOpacity, transform: [{ translateY }] }]}
      >
        <View pointerEvents="none" style={[styles.page, { height: contentHeight }]}>
          {isImage ? (
            <Image
              source={{ uri: getDisplayImageUri(currentItem.uri) }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.pdfPage}>
              <Text style={styles.pdfTitle}>PDF</Text>
              <Text style={styles.pdfFilename}>{currentItem.filename}</Text>
            </View>
          )}
        </View>

        <View
          collapsable={false}
          style={styles.gestureLayer}
          {...panResponder.panHandlers}
        >
          {!isImage ? (
            <View pointerEvents="box-none" style={styles.pdfInteractive}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void openPdf(currentItem.uri)}
                style={styles.openPdfButton}
              >
                <Text style={styles.openPdfLabel}>{t('castle.collectibleOpenPdf')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View
          pointerEvents="box-none"
          style={[styles.topBarOverlay, { paddingTop: insets.top + 8, paddingBottom: 12 }]}
        >
          <View pointerEvents="auto" style={styles.topBar}>
            <Text style={styles.counter}>
              {t('castle.collectibleViewerCounter', {
                current: currentIndex + 1,
                total: items.length,
              })}
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeLabel}>{t('common.close')}</Text>
            </Pressable>
          </View>
        </View>

        <View
          pointerEvents="none"
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <Text style={styles.swipeHint}>
            {items.length > 1
              ? t('castle.collectibleViewerSwipeHint')
              : t('castle.collectibleViewerDismissHint')}
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
  },
  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    elevation: 5,
  },
  topBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  counter: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
  closeButton: {
    minHeight: 40,
    minWidth: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surface,
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  pdfPage: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  pdfInteractive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.surface,
  },
  pdfFilename: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
  },
  openPdfButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.original,
  },
  openPdfLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 10,
  },
  swipeHint: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
  },
});
