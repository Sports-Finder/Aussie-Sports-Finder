import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSportsConnect } from "@/context/SportsConnectContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@/utils/apiClient";

const TOPICS = [
  "Reporting a bug or issue with the app",
  "Reporting Abuse or Misuse on the app",
  "Suggesting a Feature Request for the app",
  "Other app enquiry",
] as const;

type Topic = (typeof TOPICS)[number];

function useCountdown(cooldownUntil: string | null) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!cooldownUntil) { setRemaining(0); return; }
    const update = () => {
      const diff = new Date(cooldownUntil).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  return remaining;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default function ContactAdminModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentAccount, adminUpdateAccount } = useSportsConnect();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const remaining = useCountdown(cooldownUntil);
  const isCoolingDown = remaining > 0;

  const charCount = message.length;
  const canSubmit = !submitting && !isCoolingDown && !isDisabled && !!topic && message.trim().length > 0 && charCount <= 250;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setFetchError(false);
    setTopic(null);
    setMessage("");
    api.getContactStatus()
      .then((status) => {
        if (cancelled) return;
        setIsDisabled(status.contactUsDisabled);
        setCooldownUntil(status.cooldownUntil);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [visible]);

  const senderName =
    currentAccount?.clubName ||
    currentAccount?.fullName ||
    currentAccount?.parentGuardianName ||
    currentAccount?.email ||
    "Unknown";

  const senderEmail = currentAccount?.email ?? "";

  const handleSubmit = async () => {
    if (!canSubmit || !topic) return;
    setSubmitting(true);
    try {
      const result = await api.sendContactMessage({ topic, message: message.trim() });
      setCooldownUntil(result.cooldownUntil);
      setTopic(null);
      setMessage("");
      if (currentAccount?.id) {
        const sentAt = new Date(new Date(result.cooldownUntil).getTime() - 24 * 60 * 60 * 1000).toISOString();
        adminUpdateAccount(currentAccount.id, { contactLastSentAt: sentAt });
      }
      Alert.alert(
        "Message sent",
        "Your message has been sent to the admin team. You can send another message in 24 hours.",
        [{ text: "OK", onPress: onClose }]
      );
    } catch (err: unknown) {
      const status = (err as { status?: number } | null)?.status;
      if (status === 429) {
        const body = (err as { body?: { cooldownUntil?: string } } | null)?.body;
        if (body?.cooldownUntil) setCooldownUntil(body.cooldownUntil);
        Alert.alert("Rate limited", "You can only send one message every 24 hours.");
      } else if (status === 403) {
        Alert.alert("Unavailable", "Contact Us has been disabled for your account by an administrator.");
      } else {
        Alert.alert("Error", "Something went wrong. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.shell, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 14, borderBottomColor: colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="mail" size={20} color={colors.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.foreground }]}>Contact Us</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Send a message to the admin team</Text>
          </View>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="x" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : fetchError ? (
            <View style={[styles.disabledBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-triangle" size={20} color="#DC2626" />
              <Text style={styles.disabledText}>
                Could not load Contact Us status. Please close and try again.
              </Text>
            </View>
          ) : isDisabled ? (
            <View style={[styles.disabledBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="slash" size={20} color="#DC2626" />
              <Text style={styles.disabledText}>
                Contact Us has been disabled for your account. Please contact support through another channel.
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.senderBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <View style={styles.senderRow}>
                  <Feather name="user" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.senderValue, { color: colors.foreground }]}>{senderName}</Text>
                  <Text style={[styles.lockedLabel, { color: colors.mutedForeground }]}>(read-only)</Text>
                </View>
                <View style={styles.senderRow}>
                  <Feather name="mail" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.senderValue, { color: colors.foreground }]}>{senderEmail}</Text>
                </View>
              </View>

              <Text style={[styles.label, { color: colors.foreground }]}>Topic *</Text>
              <View style={styles.topicsWrap}>
                {TOPICS.map((t) => {
                  const active = topic === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => !isCoolingDown && setTopic(t)}
                      style={({ pressed }) => [
                        styles.topicBtn,
                        {
                          backgroundColor: active ? colors.primary : colors.card,
                          borderColor: active ? colors.primary : colors.border,
                          opacity: isCoolingDown ? 0.5 : pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.topicText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                        {t}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.foreground }]}>Message *</Text>
                <Text style={[styles.wordCount, { color: charCount > 250 ? "#EF4444" : colors.mutedForeground }]}>
                  {charCount}/250
                </Text>
              </View>
              <TextInput
                value={message}
                onChangeText={isCoolingDown ? undefined : setMessage}
                editable={!isCoolingDown}
                placeholder="Describe your enquiry…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                style={[
                  styles.messageInput,
                  {
                    color: colors.foreground,
                    backgroundColor: isCoolingDown ? colors.secondary : colors.card,
                    borderColor: charCount > 250 ? "#EF4444" : colors.border,
                  },
                ]}
              />
              {charCount > 250 ? (
                <Text style={styles.overLimitText}>Message must be 250 characters or fewer</Text>
              ) : null}

              {isCoolingDown ? (
                <View style={[styles.cooldownBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                  <Feather name="clock" size={16} color="#DC2626" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cooldownTitle}>Message already sent</Text>
                    <Text style={styles.cooldownTimer}>Next message available in: {formatCountdown(remaining)}</Text>
                  </View>
                </View>
              ) : null}

              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.submitBtn,
                  {
                    backgroundColor: canSubmit ? colors.primary : colors.secondary,
                    opacity: !canSubmit ? 0.5 : pressed ? 0.8 : 1,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <>
                    <Feather name="send" size={16} color={canSubmit ? colors.primaryForeground : colors.mutedForeground} />
                    <Text style={[styles.submitText, { color: canSubmit ? colors.primaryForeground : colors.mutedForeground }]}>
                      Send message
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 18,
    gap: 12,
  },
  disabledBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 20,
  },
  disabledText: {
    flex: 1,
    color: "#991B1B",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  senderBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  senderValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  lockedLabel: {
    fontSize: 11,
    fontStyle: "italic",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wordCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  topicsWrap: {
    gap: 8,
  },
  topicBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  topicText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: "top",
  },
  overLimitText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: -6,
  },
  cooldownBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cooldownTitle: {
    color: "#991B1B",
    fontWeight: "700",
    fontSize: 13,
  },
  cooldownTimer: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 15,
    marginTop: 2,
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "800",
  },
});
