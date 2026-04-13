import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState, ScreenShell } from "@/components/SportsUI";
import { Conversation, useSportsConnect } from "@/context/SportsConnectContext";
import { useColors } from "@/hooks/useColors";

function ThreadButton({ conversation, selected, onPress }: { conversation: Conversation; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  const last = conversation.messages[0];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.thread, { backgroundColor: selected ? colors.pitchSoft : colors.card, borderColor: selected ? colors.primary : colors.border, opacity: pressed ? 0.75 : 1 }]}>
      <View style={[styles.threadIcon, { backgroundColor: colors.primary }]}>
        <Feather name="message-circle" color={colors.primaryForeground} size={18} />
      </View>
      <View style={styles.threadTextWrap}>
        <Text style={[styles.threadTitle, { color: colors.foreground }]} numberOfLines={1}>{conversation.clubName} · {conversation.playerName}</Text>
        <Text style={[styles.threadPreview, { color: colors.mutedForeground }]} numberOfLines={1}>{last?.body ?? "Start the conversation"}</Text>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations, sendMessage } = useSportsConnect();
  const [selectedId, setSelectedId] = useState(conversations[0]?.id);
  const [draft, setDraft] = useState("");
  const selected = useMemo(() => conversations.find((item) => item.id === selectedId) ?? conversations[0], [conversations, selectedId]);

  const submit = () => {
    if (!selected) return;
    sendMessage(selected.id, draft);
    setDraft("");
  };

  return (
    <ScreenShell>
      <KeyboardAvoidingView behavior="padding" style={styles.flex} keyboardVerticalOffset={0}>
        <View style={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 98 }]}>
          <View>
            <Text style={[styles.kicker, { color: colors.primary }]}>Private messaging</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Connected chats</Text>
          </View>

          {conversations.length === 0 ? (
            <EmptyState icon="message-circle" title="No private chats yet" text="Agree to connect on an advert and a private conversation will open here." />
          ) : (
            <>
              <FlatList horizontal data={conversations} keyExtractor={(item) => item.id} showsHorizontalScrollIndicator={false} renderItem={({ item }) => <ThreadButton conversation={item} selected={item.id === selected?.id} onPress={() => setSelectedId(item.id)} />} />
              <View style={[styles.chatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.chatHeader, { borderBottomColor: colors.border }]}>
                  <View>
                    <Text style={[styles.chatTitle, { color: colors.foreground }]}>{selected?.clubName}</Text>
                    <Text style={[styles.chatSubtitle, { color: colors.mutedForeground }]}>Connected with {selected?.playerName}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
                </View>
                <FlatList
                  data={selected?.messages ?? []}
                  inverted
                  keyExtractor={(item) => item.id}
                  style={styles.messages}
                  contentContainerStyle={styles.messageContent}
                  renderItem={({ item }) => (
                    <View style={[styles.bubble, item.sender === "me" ? styles.mine : styles.theirs, { backgroundColor: item.sender === "me" ? colors.primary : colors.secondary }]}>
                      <Text style={[styles.bubbleText, { color: item.sender === "me" ? colors.primaryForeground : colors.secondaryForeground }]}>{item.body}</Text>
                    </View>
                  )}
                />
                <View style={[styles.composer, { borderTopColor: colors.border }]}>
                  <TextInput value={draft} onChangeText={setDraft} placeholder="Message privately" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} />
                  <Pressable onPress={submit} style={({ pressed }) => [styles.send, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}>
                    <Feather name="send" color={colors.primaryForeground} size={18} />
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, gap: 16 },
  kicker: { fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontWeight: "700", fontSize: 32, letterSpacing: -0.8, marginTop: 4 },
  thread: { width: 268, borderWidth: 1, borderRadius: 22, padding: 14, marginRight: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  threadIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  threadTextWrap: { flex: 1 },
  threadTitle: { fontWeight: "700", fontSize: 15 },
  threadPreview: { fontWeight: "500", fontSize: 13, marginTop: 3 },
  chatCard: { flex: 1, borderWidth: 1, borderRadius: 28, overflow: "hidden" },
  chatHeader: { padding: 18, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chatTitle: { fontWeight: "700", fontSize: 18 },
  chatSubtitle: { fontWeight: "500", fontSize: 13, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  messages: { flex: 1 },
  messageContent: { padding: 16, gap: 10 },
  bubble: { maxWidth: "84%", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8 },
  mine: { alignSelf: "flex-end", borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", borderBottomLeftRadius: 6 },
  bubbleText: { fontWeight: "500", fontSize: 15, lineHeight: 21 },
  composer: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, height: 46, borderRadius: 16, paddingHorizontal: 14, fontWeight: "500", fontSize: 15 },
  send: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
