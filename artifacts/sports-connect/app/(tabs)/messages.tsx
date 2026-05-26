import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState, ScreenShell } from "@/components/SportsUI";
import { Conversation, useSportsConnect } from "@/context/SportsConnectContext";
import { useColors } from "@/hooks/useColors";

const PAGE_SIZE = 6;
const BOX_GAP = 12;

function AvatarCircle({ label, color, size = 36 }: { label: string; color: string; size?: number }) {
  const initials = label
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={[avatarStyles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[avatarStyles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  initials: { color: "#FFFFFF", fontWeight: "800" },
});

function ChatBox({ conversation, onPress, boxWidth }: { conversation: Conversation; onPress: () => void; boxWidth: number }) {
  const colors = useColors();
  const isPending = conversation.status === "pending";
  const isDenied = conversation.status === "denied";
  const isUnread = !isPending && !isDenied && conversation.hasUnread;

  const borderColor = isDenied ? colors.border : isPending ? "#F59E0B" : isUnread ? "#EF4444" : colors.border;
  const bgColor = isDenied ? colors.muted : isPending ? "rgba(245,158,11,0.12)" : isUnread ? "rgba(239,68,68,0.10)" : colors.card;
  const badgeColor = isPending ? "#F59E0B" : isUnread ? "#EF4444" : "transparent";

  const lastMsg = conversation.messages[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chatBox,
        { width: boxWidth, backgroundColor: bgColor, borderColor, opacity: pressed ? 0.80 : 1 },
      ]}
    >
      {(isPending || isUnread) && (
        <View style={[styles.statusBar, { backgroundColor: badgeColor }]} />
      )}

      <View style={[styles.chatBoxInner, isDenied ? { opacity: 0.55 } : null]}>
        {isPending ? (
          <View style={styles.pendingIconWrap}>
            <View style={[styles.pendingIcon, { backgroundColor: "#F59E0B22" }]}>
              <Feather name="bell" size={22} color="#F59E0B" />
            </View>
            <Text style={[styles.chatBoxStatus, { color: "#F59E0B" }]}>Awaiting response</Text>
          </View>
        ) : isDenied ? (
          <View style={styles.pendingIconWrap}>
            <View style={[styles.pendingIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="x-circle" size={22} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.chatBoxStatus, { color: colors.mutedForeground }]}>Not agreed</Text>
          </View>
        ) : (
          <View style={styles.avatarsRow}>
            <AvatarCircle label={conversation.clubName} color={isUnread ? "#EF4444" : colors.primary} size={38} />
            <AvatarCircle label={conversation.playerName} color={colors.mutedForeground} size={32} />
          </View>
        )}

        <Text style={[styles.chatBoxName, { color: colors.foreground }]} numberOfLines={2}>
          {conversation.clubName}
        </Text>

        {conversation.sport ? (
          <Text style={[styles.chatBoxSport, { color: isPending ? "#F59E0B" : isDenied ? colors.mutedForeground : isUnread ? "#EF4444" : colors.primary }]} numberOfLines={1}>
            {conversation.sport}
          </Text>
        ) : null}

        {lastMsg ? (
          <Text style={[styles.chatBoxPreview, { color: isPending ? "#F59E0B" : colors.mutedForeground }]} numberOfLines={2}>
            {lastMsg.body}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function ChatRoom({ conversation, onClose, asAdmin }: { conversation: Conversation; onClose: () => void; asAdmin?: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sendMessage, adminSendMessage, markConversationRead, currentAccount, isAdmin } = useSportsConnect();
  const [draft, setDraft] = useState("");
  const adminMode = !!asAdmin && isAdmin;

  useEffect(() => {
    markConversationRead(conversation.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (adminMode) adminSendMessage(conversation.id, trimmed);
    else sendMessage(conversation.id, trimmed);
    setDraft("");
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.chatRoomWrap, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView behavior="padding" style={styles.flex} keyboardVerticalOffset={0}>
          <View style={[styles.chatRoomHeader, { paddingTop: insets.top + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </Pressable>
            <View style={styles.chatRoomHeaderText}>
              <Text style={[styles.chatRoomTitle, { color: colors.foreground }]} numberOfLines={1}>
                {conversation.clubName}
              </Text>
              <Text style={[styles.chatRoomSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                {conversation.sport} · {conversation.playerName}
              </Text>
            </View>
            <View style={[styles.onlineDot, {
              backgroundColor: conversation.status === "pending" ? "#F59E0B"
                : conversation.status === "denied" ? colors.mutedForeground
                : colors.primary,
            }]} />
          </View>

          <FlatList
            data={conversation.messages}
            inverted
            keyExtractor={(item) => item.id}
            style={styles.flex}
            contentContainerStyle={[styles.messageContent, { paddingBottom: insets.bottom + 20 }]}
            renderItem={({ item }) => {
              if (item.isSystem) {
                return (
                  <View style={[styles.systemBubble, { backgroundColor: colors.muted }]}>
                    <Feather name="info" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.systemBubbleText, { color: colors.mutedForeground }]}>
                      {item.body}
                    </Text>
                  </View>
                );
              }
              if (item.isAdmin) {
                return (
                  <View style={styles.adminBubbleWrap}>
                    <View style={styles.adminSenderRow}>
                      <Image source={require("@/assets/images/icon.png")} style={styles.adminAvatar} contentFit="cover" />
                      <Text style={styles.adminSenderName}>Admin</Text>
                    </View>
                    <View style={[styles.bubble, styles.adminBubble, { backgroundColor: "#7C2D12", borderColor: "#FCD34D" }]}>
                      <View style={styles.adminTagRow}>
                        <Feather name="shield" size={12} color="#FCD34D" />
                        <Text style={styles.adminTag}>ADMIN WARNING</Text>
                      </View>
                      <Text style={[styles.bubbleText, { color: "#FFF" }]}>{item.body}</Text>
                    </View>
                  </View>
                );
              }
              const isMyMessage = adminMode
                ? false
                : item.senderAccountId
                ? item.senderAccountId === currentAccount?.id
                : item.sender === "me";
              return (
                <View
                  style={[
                    styles.bubble,
                    isMyMessage ? styles.mine : styles.theirs,
                    { backgroundColor: isMyMessage ? colors.primary : colors.secondary },
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      { color: isMyMessage ? colors.primaryForeground : colors.secondaryForeground },
                    ]}
                  >
                    {item.body}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Feather name="message-circle" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyChatText, { color: colors.mutedForeground }]}>
                  No messages yet. Say hello!
                </Text>
              </View>
            }
          />

          {adminMode ? (
            <View style={[styles.composer, { borderTopColor: "#FCD34D", paddingBottom: insets.bottom + 10, borderTopWidth: 2, backgroundColor: "rgba(252,211,77,0.08)" }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Send an admin warning…"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
                onSubmitEditing={submit}
                returnKeyType="send"
              />
              <Pressable
                onPress={submit}
                style={({ pressed }) => [styles.send, { backgroundColor: "#7C2D12", opacity: pressed ? 0.75 : 1 }]}
              >
                <Feather name="shield" color="#FCD34D" size={18} />
              </Pressable>
            </View>
          ) : conversation.status === "pending" ? (
            <View style={[styles.composer, { borderTopColor: "#F59E0B", paddingBottom: insets.bottom + 10, borderTopWidth: 2 }]}>
              <View style={[styles.deniedBanner, { backgroundColor: colors.amberSoft }]}>
                <Feather name="clock" color="#B45309" size={16} />
                <Text style={[styles.deniedBannerText, { color: "#B45309" }]}>Chat inactive — awaiting acceptance of your connection request</Text>
              </View>
            </View>
          ) : conversation.status === "denied" ? (
            <View style={[styles.composer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 10 }]}>
              <View style={[styles.deniedBanner, { backgroundColor: colors.muted }]}>
                <Feather name="x-circle" color={colors.mutedForeground} size={16} />
                <Text style={[styles.deniedBannerText, { color: colors.mutedForeground }]}>Connection was not agreed — messaging disabled</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.composer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 10 }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Message privately…"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
                onSubmitEditing={submit}
                returnKeyType="send"
              />
              <Pressable
                onPress={submit}
                style={({ pressed }) => [styles.send, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}
              >
                <Feather name="send" color={colors.primaryForeground} size={18} />
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { conversations, markConversationRead } = useSportsConnect();
  const [page, setPage] = useState(0);
  const [openConv, setOpenConv] = useState<Conversation | null>(null);

  const boxWidth = Math.max(100, (screenWidth - 40 - BOX_GAP) / 2);
  const totalPages = Math.ceil(conversations.length / PAGE_SIZE);
  const paged = conversations.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleBoxPress = (conv: Conversation) => {
    if (conv.hasUnread && conv.status !== "pending") {
      markConversationRead(conv.id);
    }
    setOpenConv(conv);
  };

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={[styles.kicker, { color: colors.primary }]}>Private messaging</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Communication Hub</Text>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Connect request</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Unread messages</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Not agreed</Text>
          </View>
        </View>

        {conversations.length === 0 ? (
          <EmptyState
            icon="message-circle"
            title="No chats yet"
            text="Agree to connect on an advert and a private conversation will open here."
          />
        ) : (
          <>
            <View style={styles.grid}>
              {paged.map((conv) => (
                <ChatBox key={conv.id} conversation={conv} boxWidth={boxWidth} onPress={() => handleBoxPress(conv)} />
              ))}
            </View>

            {totalPages > 1 && (
              <View style={styles.pagination}>
                <Pressable
                  onPress={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={[styles.pageArrow, { opacity: page === 0 ? 0.3 : 1 }]}
                >
                  <Feather name="chevron-left" size={20} color={colors.foreground} />
                </Pressable>

                <View style={styles.pageDots}>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Pressable key={i} onPress={() => setPage(i)}>
                      <View
                        style={[
                          styles.pageDot,
                          { backgroundColor: i === page ? colors.primary : colors.border },
                          i === page && styles.pageDotActive,
                        ]}
                      />
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  style={[styles.pageArrow, { opacity: page === totalPages - 1 ? 0.3 : 1 }]}
                >
                  <Feather name="chevron-right" size={20} color={colors.foreground} />
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {openConv && <ChatRoom conversation={openConv} onClose={() => setOpenConv(null)} />}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  headerBlock: { gap: 4 },
  kicker: { fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontWeight: "700", fontSize: 32, letterSpacing: -0.8, marginTop: 4 },
  legendRow: { flexDirection: "row", gap: 18 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontWeight: "600", fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: BOX_GAP },
  chatBox: {
    minHeight: 160,
    borderRadius: 22,
    borderWidth: 2,
    overflow: "hidden",
  },
  statusBar: { height: 5, width: "100%" },
  chatBoxInner: { padding: 14, gap: 8, flex: 1 },
  pendingIconWrap: { alignItems: "center", gap: 6 },
  pendingIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chatBoxStatus: { fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  avatarsRow: { flexDirection: "row", alignItems: "center" },
  chatBoxName: { fontWeight: "700", fontSize: 14, lineHeight: 19, marginTop: 2 },
  chatBoxSport: { fontWeight: "700", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  chatBoxPreview: { fontWeight: "500", fontSize: 12, lineHeight: 17 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 4 },
  pageArrow: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pageDots: { flexDirection: "row", alignItems: "center", gap: 8 },
  pageDot: { width: 8, height: 8, borderRadius: 4 },
  pageDotActive: { width: 22, borderRadius: 4 },
  chatRoomWrap: { flex: 1 },
  chatRoomHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  chatRoomHeaderText: { flex: 1 },
  chatRoomTitle: { fontWeight: "700", fontSize: 18 },
  chatRoomSubtitle: { fontWeight: "500", fontSize: 13, marginTop: 1 },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  messageContent: { padding: 16, gap: 8 },
  bubble: { maxWidth: "84%", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 11 },
  mine: { alignSelf: "flex-end", borderBottomRightRadius: 5 },
  theirs: { alignSelf: "flex-start", borderBottomLeftRadius: 5 },
  bubbleText: { fontWeight: "500", fontSize: 15, lineHeight: 21 },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyChatText: { fontWeight: "500", fontSize: 15 },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontWeight: "500",
    fontSize: 15,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  deniedBanner: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14 },
  deniedBannerText: { fontWeight: "600", fontSize: 13, flex: 1 },
  systemBubble: { alignSelf: "center", flexDirection: "row", alignItems: "flex-start", gap: 6, marginVertical: 4, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, maxWidth: "92%" },
  systemBubbleText: { fontWeight: "500", fontSize: 13, lineHeight: 19, flex: 1, fontStyle: "italic" },
  adminBubbleWrap: { alignSelf: "center", maxWidth: "92%", gap: 6 },
  adminSenderRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 2 },
  adminAvatar: { width: 22, height: 22, borderRadius: 11 },
  adminSenderName: { color: "#FCD34D", fontWeight: "800", fontSize: 12, letterSpacing: 0.3 },
  adminBubble: { borderWidth: 1, gap: 6 },
  adminTagRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  adminTag: { color: "#FCD34D", fontWeight: "800", fontSize: 11, letterSpacing: 0.8 },
});
