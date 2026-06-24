import type { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CheckOption } from '../components/CheckOption';
import { colors } from '../constants/theme';
import { useCastleContent } from '../hooks/useCastleContent';
import { useCastleProgress } from '../hooks/useCastleProgress';
import { useI18n } from '../i18n';
import type { Castle } from '../types/castle';
import {
  openMapsParkingSearch,
  openMapsStampLocation,
} from '../utils/maps';

type CastleDetailScreenProps = {
  castle: Castle;
  onBack: () => void;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.actionButton,
        variant === 'secondary' && styles.actionButtonSecondary,
      ]}
    >
      <Text
        style={[
          styles.actionButtonLabel,
          variant === 'secondary' && styles.actionButtonLabelSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function CastleDetailScreen({ castle, onBack }: CastleDetailScreenProps) {
  const { t, getSeriesLabel } = useI18n();
  const content = useCastleContent(castle);
  const { getProgress, toggleProgress } = useCastleProgress();
  const progress = getProgress(castle.id);

  const badgeColor =
    castle.series === 'original' ? colors.originalLight : colors.continuedLight;
  const badgeTextColor =
    castle.series === 'original' ? colors.original : colors.continued;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>
          {t('common.number')} {castle.number}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={[styles.badgeText, { color: badgeTextColor }]}>
            {getSeriesLabel(castle.series, true)}
          </Text>
        </View>

        <Text style={styles.name}>{castle.name}</Text>
        {content.subtitle ? <Text style={styles.subtitle}>{content.subtitle}</Text> : null}

        <Section title={t('castle.progress')}>
          <CheckOption
            label={t('castle.visited')}
            checked={progress.visited}
            onToggle={() => toggleProgress(castle.id, 'visited')}
          />
          <CheckOption
            label={t('castle.meijoStamp')}
            checked={progress.meijoStamp}
            onToggle={() => toggleProgress(castle.id, 'meijoStamp')}
          />
          <CheckOption
            label={t('castle.goshuin')}
            checked={progress.goshuin}
            onToggle={() => toggleProgress(castle.id, 'goshuin')}
          />
        </Section>

        <Section title={t('common.location')}>
          <Text style={styles.body}>{content.locationLabel}</Text>
        </Section>

        <Section title={t('castle.description')}>
          <Text style={styles.body}>{content.description}</Text>
        </Section>

        <Section title={t('castle.stampLocation')}>
          <Text style={styles.body}>{content.stampLocation}</Text>
          <ActionButton
            label={t('castle.openStampMap')}
            variant="secondary"
            onPress={() => openMapsStampLocation(castle)}
          />
        </Section>

        <Section title={t('castle.traffic')}>
          <Text style={styles.subsectionTitle}>{t('castle.parkingNavigation')}</Text>
          <ActionButton
            label={t('castle.parkingNavigation')}
            onPress={() => openMapsParkingSearch(castle)}
          />

          <Text style={styles.subsectionTitle}>{t('castle.massTransportLabel')}</Text>
          <Text style={styles.body}>{content.massTransport}</Text>
        </Section>

        {castle.website ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(castle.website!)}
            style={styles.linkButton}
          >
            <Text style={styles.linkLabel}>{t('castle.website')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.background,
  },
  backLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.original,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
  },
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 32,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    color: colors.textMuted,
  },
  section: {
    gap: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  subsectionTitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  body: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 23,
  },
  subtle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
  },
  actionButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.original,
  },
  actionButtonSecondary: {
    backgroundColor: colors.originalLight,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surface,
  },
  actionButtonLabelSecondary: {
    color: colors.original,
  },
  linkButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.originalLight,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.original,
  },
});
