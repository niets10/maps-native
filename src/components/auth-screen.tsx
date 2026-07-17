import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WorldMap } from "@/components/world-map";
import { Fonts, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";

type Mode = "sign-in" | "sign-up";

export function AuthScreen() {
  const theme = useTheme();
  const {
    signInWithPassword,
    signUpWithPassword,
    signInWithMagicLink,
    signInWithGoogle,
  } = useAuth();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function runAction(action: () => Promise<void>) {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      await action();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit() {
    if (!email || !password) {
      setError("Enter your email and password to continue.");
      return;
    }
    runAction(() =>
      mode === "sign-in"
        ? signInWithPassword(email, password)
        : signUpWithPassword(email, password),
    );
  }

  function handleMagicLink() {
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    runAction(async () => {
      await signInWithMagicLink(email);
      setNotice("Check your inbox for a sign-in link.");
    });
  }

  function handleGoogle() {
    runAction(() => signInWithGoogle());
  }

  return (
    <ThemedView style={styles.root}>
      <WorldMap visited={new Set()} watermark interactive={false} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              <View style={styles.heroBlock}>
                <ThemedText type="label" themeColor="accent">
                  Field Atlas
                </ThemedText>
                <ThemedText type="display" style={styles.headline}>
                  Every border{"\n"}you&apos;ve crossed.
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.subhead}>
                  Sign in to keep your travel map in sync across every device.
                </ThemedText>
              </View>

              <View style={styles.modeSwitch}>
                <ModeButton
                  label="Sign in"
                  active={mode === "sign-in"}
                  onPress={() => setMode("sign-in")}
                />
                <ModeButton
                  label="Create account"
                  active={mode === "sign-up"}
                  onPress={() => setMode("sign-up")}
                />
              </View>

              <View style={styles.form}>
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                />
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="password"
                />

                {error ? (
                  <ThemedText themeColor="danger" style={styles.errorText}>
                    {error}
                  </ThemedText>
                ) : null}
                {notice ? (
                  <ThemedText themeColor="accent" style={styles.noticeText}>
                    {notice}
                  </ThemedText>
                ) : null}

                <Pressable
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { backgroundColor: theme.accent },
                    pressed && styles.pressed,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={theme.onAccent} />
                  ) : (
                    <ThemedText type="smallBold" themeColor="onAccent">
                      {mode === "sign-in" ? "Sign in" : "Create account"}
                    </ThemedText>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleMagicLink}
                  disabled={isSubmitting}
                  style={styles.linkRow}
                >
                  <ThemedText type="linkPrimary">
                    Email me a sign-in link instead
                  </ThemedText>
                </Pressable>
              </View>

              {/* <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                <ThemedText type="label" themeColor="textSecondary">
                  or
                </ThemedText>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>

              <Pressable
                onPress={handleGoogle}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.googleButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">Continue with Google</ThemedText>
              </Pressable> */}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.modeButton}>
      <ThemedText
        type="smallBold"
        themeColor={active ? "text" : "textSecondary"}
      >
        {label}
      </ThemedText>
      <View
        style={[
          styles.modeUnderline,
          { backgroundColor: active ? theme.accent : "transparent" },
        ]}
      />
    </Pressable>
  );
}

function Field(
  props: React.ComponentProps<typeof TextInput> & { label: string },
) {
  const theme = useTheme();
  const { label, style, ...rest } = props;
  return (
    <View style={styles.fieldContainer}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          {
            color: theme.text,
            borderBottomColor: theme.border,
            fontFamily: Fonts.body,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  content: {
    width: "100%",
    maxWidth: 440,
    gap: Spacing.five,
  },
  heroBlock: {
    gap: Spacing.two,
  },
  headline: {
    marginTop: Spacing.one,
  },
  subhead: {
    marginTop: Spacing.two,
    maxWidth: 360,
  },
  modeSwitch: {
    flexDirection: "row",
    gap: Spacing.five,
  },
  modeButton: {
    gap: Spacing.two,
  },
  modeUnderline: {
    height: 2,
    borderRadius: 1,
  },
  form: {
    gap: Spacing.four,
  },
  fieldContainer: {
    gap: Spacing.two,
  },
  input: {
    fontSize: 17,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  errorText: {},
  noticeText: {},
  primaryButton: {
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  linkRow: {
    alignItems: "center",
    marginTop: -Spacing.two,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  googleButton: {
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
  },
});
