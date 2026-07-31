import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { COUNTRIES_BY_CODE } from '@/constants/countries';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { flagEmoji } from '@/lib/utils';

type CountryInfoModalProps = {
  countryCode: string | null;
  isVisited: boolean;
  initialNotes: string;
  onClose: () => void;
  onSave: (options: { isVisited: boolean; notes: string }) => Promise<void>;
};

export function CountryInfoModal({
  countryCode,
  isVisited,
  initialNotes,
  onClose,
  onSave,
}: CountryInfoModalProps) {
  const theme = useTheme();
  const country = countryCode ? COUNTRIES_BY_CODE[countryCode] : null;

  const [visited, setVisited] = useState(isVisited);
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setVisited(isVisited);
    setNotes(initialNotes);
  }, [countryCode, isVisited, initialNotes]);

  if (!countryCode || !country) return null;

  async function handleSave() {
    setIsSaving(true);
    try {
      const shouldMarkVisited = visited || notes.trim().length > 0;
      await onSave({ isVisited: shouldMarkVisited, notes });
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <View style={styles.header}>
            <ThemedView type={visited ? 'accentSoft' : 'backgroundSelected'} style={styles.flagBadge}>
              <ThemedText style={styles.flagEmoji}>{flagEmoji(countryCode)}</ThemedText>
            </ThemedView>
            <View style={styles.headerText}>
              <ThemedText type="subtitle">{country.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {country.continent}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={Spacing.two}
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: visited }}
            onPress={() => setVisited((current) => !current)}
            style={({ pressed }) => [styles.visitedRow, pressed && styles.visitedRowPressed]}>
            <View
              style={[
                styles.checkCircle,
                {
                  borderColor: visited ? theme.accent : theme.border,
                  backgroundColor: visited ? theme.accent : 'transparent',
                },
              ]}>
              {visited ? (
                <ThemedText type="smallBold" themeColor="onAccent">
                  ✓
                </ThemedText>
              ) : null}
            </View>
            <ThemedText>Mark as visited</ThemedText>
          </Pressable>

          <View style={styles.notesSection}>
            <ThemedText type="label" themeColor="textSecondary">
              Notes
            </ThemedText>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="When did you visit? What stood out?"
              placeholderTextColor={theme.textSecondary}
              multiline
              textAlignVertical="top"
              style={[
                styles.notesInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  fontFamily: Fonts.body,
                },
              ]}
            />
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.actionButton,
                styles.cancelButton,
                { borderColor: theme.border },
                pressed && styles.actionButtonPressed,
              ]}>
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.actionButton,
                styles.saveButton,
                { backgroundColor: theme.accent },
                pressed && styles.actionButtonPressed,
                isSaving && styles.saveButtonDisabled,
              ]}>
              {isSaving ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <ThemedText type="smallBold" themeColor="onAccent">
                  Save
                </ThemedText>
              )}
            </Pressable>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flagBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagEmoji: {
    fontSize: 26,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  closeButton: {
    padding: Spacing.half,
  },
  closeButtonPressed: {
    opacity: 0.6,
  },
  visitedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  visitedRowPressed: {
    opacity: 0.6,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesSection: {
    gap: Spacing.two,
  },
  notesInput: {
    minHeight: 100,
    fontSize: 16,
    lineHeight: 24,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {},
  actionButtonPressed: {
    opacity: 0.7,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});
