import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type LegalType = "terms" | "privacy";

// ── Content ──────────────────────────────────────────────────────────────────

function TermsContent({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        Last updated: July 2026
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>1. Acceptance of Terms</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        By creating an account or using the Aussie Sports Club Finder app ("App"), you agree to be
        bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not
        use the App.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>2. Age Requirement</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        You must be 18 years of age or older to create an account. Parent or Guardian accounts may
        be created on behalf of a player under 18, but the parent or guardian must themselves be 18
        or older. Misrepresenting your age is a breach of these Terms and may result in immediate
        account termination and reporting to relevant authorities.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>3. Permitted Use</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        The App is designed solely to help players, coaches, and clubs connect for legitimate
        sporting opportunities within Australia. You must not use the App to:
      </Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Share personal contact information publicly in profiles or messages</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Harass, threaten, or abuse other users</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Post false, misleading, or deceptive information</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Circumvent moderation systems or administrative controls</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Use the App for any unlawful purpose</Text>

      <Text style={[s.heading, { color: colors.foreground }]}>4. User Content</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        All profile images, highlight reel links, sport requests, and other content you submit are
        subject to moderation. We reserve the right to remove or reject any content that we deem
        inappropriate, misleading, or in violation of these Terms — without notice.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>5. Messaging</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        In-app messaging is monitored for safety. Conversations that contain inappropriate language
        or contact details may be flagged, reviewed, or automatically closed. Persistent misuse of
        the messaging system may result in account suspension.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>6. Subscriptions & Payments</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        Premium features are available through auto-renewing subscriptions managed by the Apple App
        Store. Subscription pricing and renewal terms are displayed at the point of purchase.
        Cancellations must be managed through your Apple account settings. We do not process
        payments or store payment information directly.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>7. Account Termination</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        We reserve the right to suspend or permanently close any account at our sole discretion,
        without prior notice, for any violation of these Terms or any conduct we deem harmful to
        the community. Terminated accounts are not entitled to a refund of any subscription fees
        already charged.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>8. Limitation of Liability</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        The App is provided on an "as is" basis. We do not guarantee the accuracy of any
        user-provided information and are not responsible for any disputes, losses, or damages
        arising between users or from the use of the App. To the maximum extent permitted by
        Australian law, our liability is limited to the amount you paid (if any) for the App in
        the 12 months preceding the claim.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>9. Governing Law</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        These Terms are governed by the laws of New South Wales, Australia. Any disputes arising
        from these Terms or your use of the App shall be subject to the exclusive jurisdiction of
        the courts of New South Wales.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>10. Changes to These Terms</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        We may update these Terms from time to time. We will notify users of material changes via
        the App. Continued use of the App after changes are published constitutes your acceptance
        of the revised Terms.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>11. Contact</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        For questions about these Terms, please contact us through the "Contact Us" section in the
        App, or email aussiesportsclubfinder@gmail.com.
      </Text>
    </>
  );
}

function PrivacyContent({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        Last updated: July 2026
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>1. Who We Are</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        Aussie Sports Club Finder ("we", "us", "our") operates the Aussie Sports Club Finder
        mobile application. This Privacy Policy explains how we collect, use, and protect your
        personal information when you use the App. By using the App you consent to the practices
        described in this policy.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>2. Information We Collect</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        When you create an account or use the App, we may collect:
      </Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Name, email address, and date of birth</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Profile photo and highlight reel links</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Suburb, state, and (for clubs) street address</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Sport preferences, experience level, and club/team affiliations</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Mobile number and social media profile links (if provided)</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Messages sent within the App</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Device push notification tokens (for admins and moderators only)</Text>

      <Text style={[s.heading, { color: colors.foreground }]}>3. How We Use Your Information</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        We use the information we collect to:
      </Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Create and manage your account</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Display your profile to other users for sporting connection purposes</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Facilitate in-app messaging between users</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Moderate content and enforce our Terms of Service</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Send push notifications related to the App (admin/moderator functions)</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Respond to contact and support requests</Text>

      <Text style={[s.heading, { color: colors.foreground }]}>4. Third-Party Services</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        The App uses the following third-party services that may process your data:
      </Text>
      <Text style={[s.subheading, { color: colors.foreground }]}>Clerk (Authentication)</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        We use Clerk to manage sign-up, login, and account security. Clerk stores your email
        address and authentication credentials. See clerk.com/privacy for their privacy practices.
      </Text>
      <Text style={[s.subheading, { color: colors.foreground }]}>RevenueCat (Subscriptions)</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        Premium subscriptions are managed through RevenueCat and the Apple App Store. RevenueCat
        stores your App Store user ID and subscription status. We do not store payment card
        details. See revenuecat.com/privacy for their privacy practices.
      </Text>
      <Text style={[s.subheading, { color: colors.foreground }]}>Nominatim / OpenStreetMap (Address Lookup)</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        When you search for a suburb or street address, your search query is sent to the
        Nominatim geocoding service (nominatim.openstreetmap.org). No account data is transmitted
        — only the search string. See openstreetmap.org/copyright for their data policy.
      </Text>
      <Text style={[s.subheading, { color: colors.foreground }]}>Expo (Push Notifications)</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        If you are an admin or moderator, your device push token is stored by Expo's notification
        service to deliver moderation alerts. See expo.dev/privacy for their privacy practices.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>5. Data Sharing</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        We do not sell or rent your personal information to third parties. Your profile information
        (name, sport, location, photo) is visible to other users of the App as part of the
        matching and discovery features. We may disclose information if required by law or to
        protect the safety of our users.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>6. Data Retention</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        We retain your personal information for as long as your account is active. If you close
        your account or request deletion, we will remove your personal data from our systems
        within 30 days, except where retention is required by law. Profile images are deleted
        from storage at the same time.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>7. Your Rights</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        Under Australian privacy law, you have the right to:
      </Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Access the personal information we hold about you</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Request correction of inaccurate information</Text>
      <Text style={[s.bullet, { color: colors.mutedForeground }]}>• Request deletion of your account and associated data</Text>
      <Text style={[s.body, { color: colors.mutedForeground, marginTop: 6 }]}>
        To exercise these rights, please use the "Contact Us" feature in the App or email
        aussiesportsclubfinder@gmail.com. We will respond within 30 days.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>8. Security</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        We implement reasonable technical and organisational measures to protect your personal
        information against unauthorised access, disclosure, or loss. All data is transmitted over
        encrypted connections (HTTPS/TLS). However, no system is completely secure and we cannot
        guarantee absolute security.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>9. Children's Privacy</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        The App is not intended for direct use by persons under 18. Player profiles for under-18s
        are created and managed by a parent or guardian who has agreed to these terms on the
        child's behalf. We do not knowingly collect personal information directly from minors.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>10. Changes to This Policy</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        We may update this Privacy Policy from time to time. We will notify you of material
        changes via the App. Continued use of the App after changes are published constitutes
        your acceptance of the revised policy.
      </Text>

      <Text style={[s.heading, { color: colors.foreground }]}>11. Contact Us</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>
        If you have any questions or concerns about this Privacy Policy, please contact us via
        the "Contact Us" section in the App, or email aussiesportsclubfinder@gmail.com.
      </Text>
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LegalModal({
  visible,
  type,
  onClose,
}: {
  visible: boolean;
  type: LegalType;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const title = type === "terms" ? "Terms of Service" : "Privacy Policy";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.shell, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            s.header,
            {
              paddingTop: insets.top + 14,
              borderBottomColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        >
          <Text style={[s.title, { color: colors.foreground }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={s.closeBtn}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Scrollable content */}
        <ScrollView
          contentContainerStyle={[
            s.content,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator
        >
          {type === "terms" ? (
            <TermsContent colors={colors} />
          ) : (
            <PrivacyContent colors={colors} />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  shell: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: "700", flex: 1 },
  closeBtn: { padding: 4, marginLeft: 12 },
  content: { padding: 20, paddingTop: 10 },
  heading: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 22,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
  bullet: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
    paddingLeft: 6,
    marginTop: 2,
  },
});
