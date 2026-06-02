import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform } from "react-native";

import { SportTheme, defaultSportThemes } from "@/constants/sports";
import { api } from "@/utils/apiClient";

type AdvertType = "player-looking" | "coach-looking" | "players-wanted" | "club-trials" | "coach-wanted";
type ProfileType = "player" | "club";
type ImageStatus = "pending" | "approved" | "rejected";
export type AccountRole = "player" | "guardian" | "coach" | "club";
export type AuthMethod = "apple" | "google" | "email";

export type SocialLinks = {
  instagram?: string;
  facebook?: string;
  x?: string;
  tiktok?: string;
};

export type SportRequest = {
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
};

export type HighlightLink = {
  id: string;
  owner: string;
  url: string;
  status: ImageStatus;
  submittedAt: string;
};

export type AccountStatus = "active" | "closed" | "banned";
export type ClubApprovalStatus = "pending" | "approved" | "rejected";
export type CoachAffiliateStatus = "pending" | "active" | "rejected" | "blocked";

export type CoachAffiliate = {
  coachAccountId: string;
  teamName?: string;
  ageGroup?: string;
  status: CoachAffiliateStatus;
  rejectionCount: number;
  rejectedAt?: string;
  requestedAt: string;
};

export type ModeratorPermissions = {
  closeChats: boolean;
  closeAdverts: boolean;
  closeAccounts: boolean;
  approveImages: boolean;
  approveHighlights: boolean;
  approveSports: boolean;
  approveClubs: boolean;
};

export type ModeratorAccount = {
  id: string;
  name: string;
  passcode: string;
  permissions: ModeratorPermissions;
};

export type UserAccount = {
  id: string;
  role: AccountRole;
  authMethod: AuthMethod;
  email: string;
  fullName?: string;
  parentGuardianName?: string;
  playerName?: string;
  clubName?: string;
  gender?: string;
  dateOfBirth?: string;
  location?: string;
  mobile?: string;
  sports: string[];
  defaultSport: string;
  profileImageId?: string;
  socialLinks: SocialLinks;
  highlightReelUrl?: string;
  highlightReelStatus?: ImageStatus;
  clubWebsite?: string;
  clubAddress?: string;
  clubSuburb?: string;
  clubPostcode?: string;
  clubContactEmail?: string;
  clubContactMobile?: string;
  password?: string;
  createdAt: string;
  approved: boolean;
  status?: AccountStatus;
  statusChangedAt?: string;
  statusReason?: string;
  bio?: string;
  socialId?: string;
  profileImageDeclines?: number;
  clubApprovalStatus?: ClubApprovalStatus;
  coachAffiliates?: CoachAffiliate[];
  affiliatedClubId?: string;
  affiliatedClubName?: string;
};

export type Advert = {
  id: string;
  ownerAccountId?: string;
  type: AdvertType;
  title: string;
  sport: string;
  location: string;
  distanceKm: number;
  postedBy: string;
  postedByType: ProfileType;
  level: string;
  availability: string;
  description: string;
  needs: string;
  createdAt: string;
  ageGroup?: string;
  preferredAge?: number;
  positions?: string[];
  playerDescription?: string;
  trainingDays?: string[];
  trainingTimeFrom?: string;
  trainingTimeTo?: string;
  trainingTbd?: boolean;
  gameDays?: string[];
  gameTimeFrom?: string;
  gameTimeTo?: string;
  gameTbd?: boolean;
  scheduleNote?: string;
  trialSlots?: { date: string; timeFrom: string; timeTo: string }[];
  coachRole?: string;
  coachExperienceLevel?: string;
  coachPositionTypes?: string[];
  coachSalary?: number;
  coachSalaryTbc?: boolean;
  seasonFees?: number;
  feesNegotiable?: boolean;
  feesFree?: boolean;
  trialRequired?: boolean;
  teamGender?: string;
  playerGender?: string;
  affiliatedClubId?: string;
  status?: "active" | "closed";
  closedAt?: string;
  closedReason?: string;
};

export type Conversation = {
  id: string;
  advertId: string;
  advertTitle?: string;
  ownerAccountId?: string;
  initiatorAccountId?: string;
  clubName: string;
  playerName: string;
  status: "pending" | "connected" | "denied";
  messages: Message[];
  hasUnread?: boolean;
  sport?: string;
  requesterLocation?: string;
  requesterType?: AccountRole;
  pendingRequest?: boolean;
  advertLocation?: string;
  advertPostedByType?: "player" | "club";
  affiliatedClubParticipants?: string[];
};

export type Message = {
  id: string;
  sender: "me" | "them";
  senderAccountId?: string;
  body: string;
  createdAt: string;
  isSystem?: boolean;
  isAdmin?: boolean;
};

type ProfileImage = {
  id: string;
  owner: string;
  uri: string;
  status: ImageStatus;
  submittedAt: string;
};

type ClubProfile = {
  name: string;
  sport: string;
  location: string;
  mapAddress?: string;
  bio: string;
  imageId?: string;
};

type PlayerProfile = {
  name: string;
  sports: string;
  location: string;
  bio: string;
  imageId?: string;
};

type NotificationSettings = {
  enabled: boolean;
  radiusKm: number;
  locationLabel: string;
  latitude?: number;
  longitude?: number;
};

type DraftAdvert = Omit<Advert, "id" | "createdAt" | "distanceKm" | "postedBy" | "postedByType">;
type DraftAccount = Omit<UserAccount, "id" | "createdAt" | "approved"> & { socialId?: string };
const normalizeAdvertType = (type: Advert["type"]): Advert["type"] => {
  if (type === "player-looking") return "coach-looking";
  return type;
};

type SportsConnectState = {
  adverts: Advert[];
  conversations: Conversation[];
  profileImages: ProfileImage[];
  pendingHighlightLinks: HighlightLink[];
  currentAccount?: UserAccount;
  clubProfile: ClubProfile;
  playerProfile: PlayerProfile;
  notificationSettings: NotificationSettings;
  sportsRegistry: SportTheme[];
  approvedSports: SportTheme[];
  pendingSportRequests: SportRequest[];
  selectedSport: string;
  activeProfile: ProfileType;
  isAdmin: boolean;
  isModerator: boolean;
  currentModerator: ModeratorAccount | null;
  moderators: ModeratorAccount[];
  moderatorLogin: (passcode: string) => boolean;
  moderatorSignOut: () => void;
  addModerator: (mod: Omit<ModeratorAccount, "id">) => boolean;
  deleteModerator: (modId: string) => void;
  isHydrated: boolean;
  showMemberStats: boolean;
  toggleShowMemberStats: () => void;
  showSportRequestField: boolean;
  toggleShowSportRequestField: () => void;
  setSelectedSport: (sport: string) => void;
  setActiveProfile: (profile: ProfileType) => void;
  requestSport: (name: string) => void;
  moderateSportRequest: (requestId: string, status: "approved" | "rejected") => Promise<void>;
  adminAddSport: (sport: SportTheme) => boolean;
  adminToggleSport: (sportName: string, enabled: boolean) => void;
  adminUpdateSport: (name: string, patch: Partial<SportTheme>) => void;
  adminDeleteSport: (name: string) => void;
  accounts: UserAccount[];
  bannedEmails: string[];
  loginWithEmail: (email: string, password: string) => boolean;
  loginWithSocial: (authMethod: AuthMethod, socialId: string) => boolean;
  autoRestoreSession: (email: string, authMethod: AuthMethod, socialId?: string) => boolean;
  createAccount: (draft: DraftAccount) => boolean;
  signOut: () => void;
  signOutResetToken: number;
  clearAllData: () => Promise<void>;
  adminLogin: (passcode: string) => boolean;
  adminSignOut: () => void;
  changeAdminPasscode: (current: string, next: string) => boolean;
  adminUpdateAccount: (accountId: string, patch: Partial<UserAccount>) => Promise<void>;
  adminSetAccountStatus: (accountId: string, status: AccountStatus, reason?: string) => Promise<void>;
  adminUnbanEmail: (email: string) => Promise<void>;
  adminSetAdvertStatus: (advertId: string, status: "active" | "closed", reason?: string, deleteChats?: boolean) => Promise<void>;
  adminSendMessage: (conversationId: string, body: string) => Promise<void>;
  adminDeleteConversation: (conversationId: string) => Promise<void>;
  adminApproveClub: (accountId: string) => Promise<void>;
  adminRejectClub: (accountId: string) => Promise<void>;
  resetClubApprovalAfterEdit: () => void;
  createAdvert: (draft: DraftAdvert & { postedBy?: string; affiliatedClubId?: string }) => Promise<void>;
  updateAdvert: (id: string, patch: Partial<DraftAdvert>) => Promise<void>;
  deleteAdvert: (id: string) => Promise<void>;
  connectOnAdvert: (advert: Advert) => Promise<string>;
  acceptConnection: (conversationId: string) => void;
  denyConnection: (conversationId: string) => void;
  sendMessage: (conversationId: string, body: string) => Promise<void>;
  broadcastMessage: (advertId: string, body: string) => Promise<void>;
  markConversationRead: (conversationId: string) => void;
  toggleNotifications: () => Promise<void>;
  setNotificationRadius: (radiusKm: number) => void;
  updateClubProfile: (profile: ClubProfile) => void;
  updatePlayerProfile: (profile: PlayerProfile) => void;
  updateAccount: (profile: Partial<UserAccount>) => void;
  pickProfileImage: (owner: "club" | "player") => Promise<void>;
  pickAccountImage: (owner: string, previousImageId?: string) => Promise<string | undefined>;
  clearProfileImage: (imageId: string) => Promise<void>;
  moderateImage: (imageId: string, status: ImageStatus) => Promise<void>;
  moderateHighlightLink: (linkId: string, status: ImageStatus) => void;
  getImageUri: (imageId?: string, includePending?: boolean) => string | undefined;
  getImageStatus: (imageId?: string) => ImageStatus | undefined;
  requestCoachAffiliation: (coachAccountId: string, teamName?: string, ageGroup?: string) => void;
  respondToAffiliationRequest: (clubAccountId: string, accept: boolean) => void;
  removeCoachAffiliate: (coachAccountId: string) => void;
  updateCoachAffiliateDetails: (coachAccountId: string, teamName?: string, ageGroup?: string) => void;
  unblockCoachAffiliate: (clubAccountId: string, coachAccountId: string) => void;
};

const storageKey = "sports-connect-state-v10-coach-affiliates";
const adminStorageKey = "sports-connect-admin-v1";
const sportsRegistryKey = "sports-connect-registry-v1";
const defaultAdminPasscode = "admin6969";

const now = () => new Date().toISOString();
const makeId = () => Date.now().toString() + Math.random().toString(36).slice(2, 9);

const seedAdverts: Advert[] = [
  {
    id: "ad-1",
    type: "players-wanted",
    title: "Melbourne club needs a box-to-box midfielder",
    sport: "Football (Soccer)",
    location: "Melbourne VIC",
    distanceKm: 4,
    postedBy: "Yarra United SC",
    postedByType: "club",
    level: "State league reserves",
    availability: "Training Tuesday and Thursday, matches Saturday",
    needs: "Central midfielder, age 18+, reliable weekly availability",
    description: "A community club in Melbourne's inner north is looking for a committed midfielder who enjoys high-tempo football and a positive team culture.",
    createdAt: now(),
  },
  {
    id: "ad-2",
    type: "coach-looking",
    title: "Goalkeeper moving to Brisbane and looking for a club",
    sport: "Football (Soccer)",
    location: "Brisbane QLD",
    distanceKm: 18,
    postedBy: "Jordan Miles",
    postedByType: "player",
    level: "NPL youth / metro senior",
    availability: "Evenings and weekends",
    needs: "Senior team with regular training and match minutes",
    description: "Experienced goalkeeper, vocal organiser, strong distribution, available immediately after moving for work.",
    createdAt: now(),
  },
  {
    id: "ad-3",
    type: "players-wanted",
    title: "Netball squad trialling new defenders",
    sport: "Netball",
    location: "Sydney NSW",
    distanceKm: 31,
    postedBy: "Bondi Harbour Netball Club",
    postedByType: "club",
    level: "Intermediate",
    availability: "Monday training, Sunday fixtures",
    needs: "GD, GK, WD players welcome",
    description: "Friendly but ambitious squad with qualified coaches and a clear pathway into our first team.",
    createdAt: now(),
  },
  {
    id: "ad-4",
    type: "coach-looking",
    title: "Fast outside back seeking rugby league club",
    sport: "Rugby League",
    location: "Gold Coast QLD",
    distanceKm: 27,
    postedBy: "Ava Roberts",
    postedByType: "player",
    level: "A-grade local competition",
    availability: "Weeknight training and weekend fixtures",
    needs: "Women’s club with performance pathway",
    description: "Wing/full-back with pace and kicking range, looking for coaching, structure and a welcoming Australian club culture.",
    createdAt: now(),
  },
  {
    id: "ad-5",
    type: "players-wanted",
    title: "Aussie Rules club searching for a ruck and half-forward",
    sport: "Aussie Rules Football",
    location: "Adelaide SA",
    distanceKm: 42,
    postedBy: "Parklands Footy Club",
    postedByType: "club",
    level: "Community league",
    availability: "Training Tuesday and Thursday, matches Saturday",
    needs: "Ruck, half-forward and utility players welcome",
    description: "A family-friendly community footy club with strong social culture and competitive senior teams.",
    createdAt: now(),
  },
  {
    id: "ad-6",
    type: "players-wanted",
    title: "Cricket club needs all-rounders for summer season",
    sport: "Cricket",
    location: "Perth WA",
    distanceKm: 48,
    postedBy: "Swan River Cricket Club",
    postedByType: "club",
    level: "Local senior grades",
    availability: "Training Wednesday, matches Saturday",
    needs: "Batting all-rounders and wicketkeeper considered",
    description: "Welcoming cricket club preparing squads for the summer season across multiple senior grades.",
    createdAt: now(),
  },
];

const seedConversations: Conversation[] = [
  {
    id: "conv-1",
    advertId: "ad-1",
    clubName: "Yarra United SC",
    playerName: "You",
    status: "connected",
    sport: "Football (Soccer)",
    messages: [
      { id: "m1", sender: "them", body: "Thanks for connecting. Are you free to come down to training this Thursday?", createdAt: now() },
      { id: "m2", sender: "me", body: "Yes, I can make Thursday. Please send the arrival time and kit colour.", createdAt: now() },
    ],
  },
  {
    id: "conv-2",
    advertId: "ad-3",
    clubName: "Bondi Harbour Netball Club",
    playerName: "You",
    status: "connected",
    sport: "Netball",
    hasUnread: true,
    messages: [
      { id: "m3", sender: "them", body: "Hi! We'd love to invite you to our next trial session on Sunday.", createdAt: now() },
    ],
  },
  {
    id: "conv-3",
    advertId: "ad-5",
    clubName: "Parklands Footy Club",
    playerName: "You",
    status: "pending",
    sport: "Aussie Rules Football",
    messages: [],
  },
  {
    id: "conv-4",
    advertId: "ad-6",
    clubName: "Swan River Cricket Club",
    playerName: "You",
    status: "connected",
    sport: "Cricket",
    hasUnread: true,
    messages: [
      { id: "m4", sender: "them", body: "We have a spot available for a batting all-rounder this season.", createdAt: now() },
      { id: "m5", sender: "them", body: "Are you available for a chat this week?", createdAt: now() },
    ],
  },
  {
    id: "conv-5",
    advertId: "ad-2",
    clubName: "Brisbane Rovers FC",
    playerName: "You",
    status: "pending",
    sport: "Football (Soccer)",
    messages: [],
  },
  {
    id: "conv-6",
    advertId: "ad-4",
    clubName: "Gold Coast Rugby League",
    playerName: "You",
    status: "connected",
    sport: "Rugby League",
    messages: [
      { id: "m6", sender: "me", body: "Looking forward to training!", createdAt: now() },
    ],
  },
  {
    id: "conv-7",
    advertId: "ad-1",
    clubName: "Melbourne City Basketball",
    playerName: "You",
    status: "connected",
    sport: "Basketball",
    messages: [
      { id: "m7", sender: "them", body: "Welcome to the squad!", createdAt: now() },
    ],
  },
];

const defaultState = {
  adverts: [] as Advert[],
  conversations: [] as Conversation[],
  profileImages: [] as ProfileImage[],
  pendingHighlightLinks: [] as HighlightLink[],
  accounts: [] as UserAccount[],
  currentAccount: undefined as UserAccount | undefined,
  clubProfile: {
    name: "Yarra United SC",
    sport: "Football (Soccer)",
    location: "Melbourne VIC",
    mapAddress: "Princes Park, Carlton North VIC",
    bio: "A community club with senior, academy and development teams. We recruit players who are reliable, coachable and good teammates across Melbourne.",
  },
  playerProfile: {
    name: "You",
    sports: "Football (Soccer), Futsal (Indoor Soccer)",
    location: "Melbourne VIC",
    bio: "Midfielder available for competitive local soccer. Strong fitness, positive attitude and regular availability.",
  },
  notificationSettings: {
    enabled: false,
    radiusKm: 25,
    locationLabel: "Melbourne area",
  },
  pendingSportRequests: [] as SportRequest[],
  selectedSport: "All Sports",
  activeProfile: "player" as ProfileType,
};

const SportsConnectContext = createContext<SportsConnectState | null>(null);

export function SportsConnectProvider({ children }: { children: React.ReactNode }) {
  const [adverts, setAdverts] = useState<Advert[]>(defaultState.adverts);
  const [conversations, setConversations] = useState<Conversation[]>(defaultState.conversations);
  const [profileImages, setProfileImages] = useState<ProfileImage[]>(defaultState.profileImages);
  const [pendingHighlightLinks, setPendingHighlightLinks] = useState<HighlightLink[]>(defaultState.pendingHighlightLinks);
  const [accounts, setAccounts] = useState<UserAccount[]>(defaultState.accounts);
  const [currentAccount, setCurrentAccount] = useState<UserAccount | undefined>(defaultState.currentAccount);
  const [clubProfile, setClubProfile] = useState<ClubProfile>(defaultState.clubProfile);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(defaultState.playerProfile);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultState.notificationSettings);
  const [sportsRegistry, setSportsRegistry] = useState<SportTheme[]>(defaultSportThemes);
  const [pendingSportRequests, setPendingSportRequests] = useState<SportRequest[]>(defaultState.pendingSportRequests);
  const [selectedSport, setSelectedSport] = useState(defaultState.selectedSport);
  const [activeProfile, setActiveProfile] = useState<ProfileType>(defaultState.activeProfile);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [currentModerator, setCurrentModerator] = useState<ModeratorAccount | null>(null);
  const [moderators, setModerators] = useState<ModeratorAccount[]>([]);
  const [adminPasscode, setAdminPasscode] = useState(defaultAdminPasscode);
  const [bannedEmails, setBannedEmails] = useState<string[]>([]);
  const [showMemberStats, setShowMemberStats] = useState(false);
  const [showSportRequestField, setShowSportRequestField] = useState(true);
  const [signOutResetToken, setSignOutResetToken] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(sportsRegistryKey).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as SportTheme[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            const migrated = parsed.map((s) => ({
              ...s,
              enabled: s.enabled ?? true,
              positions: s.positions ?? [],
            }));
            setSportsRegistry(migrated);
          }
        } catch (_) { /* ignore */ }
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(sportsRegistryKey, JSON.stringify(sportsRegistry)).catch(() => undefined);
  }, [sportsRegistry]);

  useEffect(() => {
    AsyncStorage.getItem(adminStorageKey).then((stored) => {
      if (!stored) return;
      const parsed = JSON.parse(stored) as { adminPasscode?: string; bannedEmails?: string[]; moderators?: ModeratorAccount[]; showMemberStats?: boolean; showSportRequestField?: boolean };
      if (parsed.adminPasscode) setAdminPasscode(parsed.adminPasscode);
      if (Array.isArray(parsed.bannedEmails)) setBannedEmails(parsed.bannedEmails);
      if (Array.isArray(parsed.moderators)) setModerators(parsed.moderators);
      if (typeof parsed.showMemberStats === "boolean") setShowMemberStats(parsed.showMemberStats);
      if (typeof parsed.showSportRequestField === "boolean") setShowSportRequestField(parsed.showSportRequestField);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(adminStorageKey, JSON.stringify({ adminPasscode, bannedEmails, moderators, showMemberStats, showSportRequestField })).catch(() => undefined);
  }, [adminPasscode, bannedEmails, moderators, showMemberStats, showSportRequestField]);

  useEffect(() => {
    let cancelled = false;
    async function loadFromApi() {
      let apiOk = false;
      try {
        const [fetchedAdverts, fetchedAccounts, fetchedConversations, fetchedProfileImages, fetchedSportRequests, fetchedBannedEmails] = await Promise.all([
          api.getAdverts(),
          api.getAccounts(),
          api.getConversations(),
          api.getProfileImages(),
          api.getSportRequests(),
          api.getBannedEmails(),
        ]);
        if (cancelled) return;
        apiOk = true;
        setAdverts(fetchedAdverts.map((advert: any) => ({ ...advert, type: normalizeAdvertType(advert.type) })));
        setConversations(fetchedConversations);
        setProfileImages(fetchedProfileImages);
        setPendingSportRequests(fetchedSportRequests);
        setBannedEmails(fetchedBannedEmails);
        // Restore local-only state (currentAccount, clubProfile, playerProfile, selectedSport, activeProfile)
        // from AsyncStorage so profile pics and settings survive across reloads.
        // Also merge passwords back from local accounts — passwords are never sent to/returned from the API.
        try {
          const stored = await AsyncStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored) as typeof defaultState;
            const localAccounts: UserAccount[] = parsed.accounts ?? [];
            // Merge API accounts with local passwords so loginWithEmail still works
            const mergedAccounts = (fetchedAccounts as UserAccount[]).map((acc) => {
              const local = localAccounts.find((la) => la.id === acc.id);
              return local?.password ? { ...acc, password: local.password } : acc;
            });
            setAccounts(mergedAccounts);
            if (parsed.currentAccount) {
              // Merge with fetched account data so profileImageId etc stays current
              const fresh = mergedAccounts.find((a) => a.id === parsed.currentAccount?.id);
              setCurrentAccount(fresh ? {
                ...parsed.currentAccount,
                ...fresh,
                profileImageId: fresh.profileImageId ?? parsed.currentAccount.profileImageId,
                profileImageDeclines: fresh.profileImageDeclines ?? parsed.currentAccount.profileImageDeclines,
              } : parsed.currentAccount);
            }
            if (parsed.clubProfile) setClubProfile(parsed.clubProfile);
            if (parsed.playerProfile) setPlayerProfile(parsed.playerProfile);
            if (parsed.selectedSport) setSelectedSport(parsed.selectedSport);
            if (parsed.activeProfile) setActiveProfile(parsed.activeProfile);
            if (parsed.notificationSettings) setNotificationSettings(parsed.notificationSettings);
            if (parsed.pendingHighlightLinks?.length) setPendingHighlightLinks(parsed.pendingHighlightLinks);
          } else {
            setAccounts(fetchedAccounts);
          }
        } catch (_) {
          setAccounts(fetchedAccounts);
        }
      } catch (_e) {
        // API unreachable, will fall back to AsyncStorage below
        if (cancelled) return;
      }
      if (!apiOk) {
        try {
          const stored = await AsyncStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored) as typeof defaultState;
            setAdverts((parsed.adverts ?? defaultState.adverts).map((advert) => ({
              ...advert,
              type: normalizeAdvertType(advert.type),
            })));
            setConversations(parsed.conversations ?? defaultState.conversations);
            setProfileImages(parsed.profileImages ?? []);
            setPendingHighlightLinks(parsed.pendingHighlightLinks ?? []);
            setAccounts(parsed.accounts ?? []);
            setCurrentAccount(parsed.currentAccount);
            setClubProfile(parsed.clubProfile ?? defaultState.clubProfile);
            setPlayerProfile(parsed.playerProfile ?? defaultState.playerProfile);
            setNotificationSettings(parsed.notificationSettings ?? defaultState.notificationSettings);
            setPendingSportRequests(parsed.pendingSportRequests ?? []);
            setSelectedSport(parsed.selectedSport ?? defaultState.selectedSport);
            setActiveProfile(parsed.activeProfile ?? "player");
          }
        } catch (_) {
          // ignore
        }
      }
      if (!cancelled) setIsHydrated(true);
    }
    loadFromApi();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const snapshot = { adverts, conversations, profileImages, pendingHighlightLinks, accounts, currentAccount, clubProfile, playerProfile, notificationSettings, pendingSportRequests, selectedSport, activeProfile };
    AsyncStorage.setItem(storageKey, JSON.stringify(snapshot)).catch(() => undefined);
  }, [adverts, conversations, profileImages, pendingHighlightLinks, accounts, currentAccount, clubProfile, playerProfile, notificationSettings, pendingSportRequests, selectedSport, activeProfile, bannedEmails]);

  const requestSport = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const alreadyInRegistry = sportsRegistry.some((sport) => sport.name.toLowerCase() === trimmed.toLowerCase());
    const alreadyPending = pendingSportRequests.some((request) => request.name.toLowerCase() === trimmed.toLowerCase() && request.status === "pending");
    if (alreadyInRegistry || alreadyPending) {
      Alert.alert("Sport already exists", "This sport is already in the registry or waiting for admin approval.");
      return;
    }
    const publicId = makeId();
    const request: SportRequest = { id: publicId, name: trimmed, status: "pending", requestedAt: now() };
    setPendingSportRequests((current) => [request, ...current]);
    api.createSportRequest({ ...request, publicId }).catch(() => undefined);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const moderateSportRequest = async (requestId: string, status: "approved" | "rejected") => {
    const request = pendingSportRequests.find((item) => item.id === requestId);
    if (!request) return;
    setPendingSportRequests((current) => current.map((item) => item.id === requestId ? { ...item, status } : item));
    try { await api.updateSportRequest(requestId, { status }); } catch (_) { /* silent */ }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };

  const adminAddSport = (sport: SportTheme): boolean => {
    const exists = sportsRegistry.some((s) => s.name.toLowerCase() === sport.name.toLowerCase());
    if (exists) return false;
    setSportsRegistry((current) => [...current, { ...sport, enabled: true }]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return true;
  };

  const adminToggleSport = (sportName: string, enabled: boolean) => {
    setSportsRegistry((current) => current.map((s) => s.name === sportName ? { ...s, enabled } : s));
    if (!enabled && selectedSport === sportName) {
      setSelectedSport("All Sports");
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const adminUpdateSport = (sportName: string, patch: Partial<SportTheme>) => {
    setSportsRegistry((current) => current.map((s) => s.name === sportName ? { ...s, ...patch } : s));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const adminDeleteSport = (sportName: string) => {
    setSportsRegistry((current) => current.filter((s) => s.name !== sportName));
    if (selectedSport === sportName) {
      setSelectedSport("All Sports");
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const createAccount = (draft: DraftAccount): boolean => {
    const normalizedEmail = draft.email.toLowerCase().trim();
    if (bannedEmails.map((e) => e.toLowerCase()).includes(normalizedEmail)) {
      Alert.alert("Account blocked", "This email address has been banned by an administrator and cannot be used to create a new account.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      return false;
    }
    const publicId = makeId();
    const { socialId, ...rest } = draft;
    const account: UserAccount = {
      ...rest,
      socialId,
      profileImageDeclines: 0,
      id: publicId,
      createdAt: now(),
      approved: true,
      status: "active",
      ...(draft.role === "club" ? { clubApprovalStatus: "pending" as ClubApprovalStatus } : {}),
    };
    setAccounts((current) => [...current, account]);
    setCurrentAccount(account);
    setSelectedSport(account.defaultSport);
    if (account.role === "club") {
      setActiveProfile("club");
      setClubProfile((current) => ({
        ...current,
        name: account.clubName || current.name,
        sport: account.defaultSport,
        location: account.location || current.location,
        mapAddress: [account.clubAddress, [account.clubSuburb, account.clubPostcode].filter(Boolean).join(" ")].filter(Boolean).join(", ") || current.mapAddress,
        imageId: account.profileImageId,
        bio: account.bio || current.bio,
      }));
    } else {
      setActiveProfile("player");
      setPlayerProfile((current) => ({
        ...current,
        name: account.role === "guardian" ? account.playerName || current.name : account.fullName || account.playerName || current.name,
        sports: account.sports.join(", "),
        location: account.location || current.location,
        imageId: account.profileImageId,
        bio: account.bio || current.bio,
      }));
    }
    if (account.highlightReelUrl) {
      const url: string = account.highlightReelUrl;
      setPendingHighlightLinks((current) => [{
        id: makeId(),
        owner: account.role === "club" ? account.clubName || "Club" : account.playerName || account.fullName || "Player",
        url,
        status: "pending",
        submittedAt: now(),
      }, ...current]);
    }
    // Background sync to API
    api.createAccount({ ...account, publicId }).catch((e: unknown) => {
      const status = (e as { status?: number } | null)?.status;
      console.warn("[createAccount] API sync failed — status:", status ?? e);
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return true;
  };

  const signOut = () => {
    setCurrentAccount(undefined);
    setSignOutResetToken((current) => current + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const clearAllData = async () => {
    try {
      await api.wipeAll();
    } catch (_) {
      // Silent: DB may already be empty
    }
    await AsyncStorage.removeItem(storageKey);
    await AsyncStorage.removeItem(adminStorageKey);
    setAdverts(defaultState.adverts);
    setAccounts(defaultState.accounts);
    setConversations(defaultState.conversations);
    setProfileImages(defaultState.profileImages);
    setPendingHighlightLinks(defaultState.pendingHighlightLinks);
    setCurrentAccount(undefined);
    setClubProfile(defaultState.clubProfile);
    setPlayerProfile(defaultState.playerProfile);
    setNotificationSettings(defaultState.notificationSettings);
    setSportsRegistry(defaultSportThemes);
    await AsyncStorage.removeItem(sportsRegistryKey);
    setPendingSportRequests(defaultState.pendingSportRequests);
    setSelectedSport(defaultState.selectedSport);
    setActiveProfile(defaultState.activeProfile);
    setBannedEmails([]);
    setShowMemberStats(false);
    setShowSportRequestField(true);
    setIsAdmin(false);
    setSignOutResetToken((t) => t + 1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const toggleShowMemberStats = () => {
    setShowMemberStats((current) => !current);
  };

  const toggleShowSportRequestField = () => {
    setShowSportRequestField((current) => !current);
  };

  const loginWithEmail = (emailInput: string, passwordInput: string): boolean => {
    const normalizedEmail = emailInput.toLowerCase().trim();
    if (bannedEmails.map((e) => e.toLowerCase()).includes(normalizedEmail)) {
      Alert.alert("Account banned", "This email address has been banned by an administrator.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      return false;
    }
    const match = accounts.find(
      (acc) => acc.email.toLowerCase() === normalizedEmail && acc.password === passwordInput
    );
    if (!match) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      return false;
    }
    if (match.status === "banned") {
      Alert.alert("Account banned", "This account has been banned by an administrator.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      return false;
    }
    if (match.status === "closed") {
      Alert.alert("Account closed", "This account has been closed by an administrator.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      return false;
    }
    setCurrentAccount(match);
    setSelectedSport(match.defaultSport);
    setActiveProfile(match.role === "club" ? "club" : "player");
    if (match.role === "club") {
      setClubProfile((current) => ({
        ...current,
        name: match.clubName || current.name,
        sport: match.defaultSport,
        location: match.location || current.location,
        mapAddress: [match.clubAddress, [match.clubSuburb, match.clubPostcode].filter(Boolean).join(" ")].filter(Boolean).join(", ") || current.mapAddress,
        imageId: match.profileImageId,
      }));
    } else {
      setPlayerProfile((current) => ({
        ...current,
        name: match.role === "guardian" ? match.playerName || current.name : match.fullName || match.playerName || current.name,
        sports: match.sports.join(", "),
        location: match.location || current.location,
        imageId: match.profileImageId,
      }));
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return true;
  };

  const loginWithSocial = (authMethod: AuthMethod, socialId: string): boolean => {
    const match = accounts.find(
      (acc) => acc.authMethod === authMethod && acc.socialId === socialId
    );
    if (!match) return false;
    if (match.status === "banned") {
      Alert.alert("Account banned", "This account has been banned by an administrator.");
      return false;
    }
    if (match.status === "closed") {
      Alert.alert("Account closed", "This account has been closed by an administrator.");
      return false;
    }
    setCurrentAccount(match);
    setSelectedSport(match.defaultSport);
    setActiveProfile(match.role === "club" ? "club" : "player");
    if (match.role === "club") {
      setClubProfile((current) => ({
        ...current,
        name: match.clubName || current.name,
        sport: match.defaultSport,
        location: match.location || current.location,
        mapAddress: [match.clubAddress, [match.clubSuburb, match.clubPostcode].filter(Boolean).join(" ")].filter(Boolean).join(", ") || current.mapAddress,
        imageId: match.profileImageId,
      }));
    } else {
      setPlayerProfile((current) => ({
        ...current,
        name: match.role === "guardian" ? match.playerName || current.name : match.fullName || match.playerName || current.name,
        sports: match.sports.join(", "),
        location: match.location || current.location,
        imageId: match.profileImageId,
      }));
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return true;
  };

  const autoRestoreSession = (emailInput: string, authMethod: AuthMethod, socialId?: string): boolean => {
    const normalizedEmail = emailInput.toLowerCase().trim();
    const match = accounts.find((acc) => acc.email.toLowerCase() === normalizedEmail);
    if (!match) return false;
    if (match.status === "banned" || match.status === "closed") return false;
    setCurrentAccount(match);
    setSelectedSport(match.defaultSport);
    setActiveProfile(match.role === "club" ? "club" : "player");
    if (match.role === "club") {
      setClubProfile((current) => ({
        ...current,
        name: match.clubName || current.name,
        sport: match.defaultSport,
        location: match.location || current.location,
        mapAddress: match.clubAddress || current.mapAddress,
        imageId: match.profileImageId,
      }));
    } else {
      setPlayerProfile((current) => ({
        ...current,
        name: match.role === "guardian" ? match.playerName || current.name : match.fullName || match.playerName || current.name,
        sports: match.sports.join(", "),
        location: match.location || current.location,
        imageId: match.profileImageId,
      }));
    }
    return true;
  };

  const updateAccount = (profile: Partial<UserAccount>) => {
    setCurrentAccount((current) => {
      if (!current) return current;
      const next = { ...current, ...profile };
      if (profile.defaultSport) setSelectedSport(profile.defaultSport);
      return next;
    });
  };

  const adminLogin = (passcode: string): boolean => {
    if (passcode.trim() === adminPasscode) {
      setIsAdmin(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      return true;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    return false;
  };

  const adminSignOut = () => {
    setIsAdmin(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const changeAdminPasscode = (current: string, next: string): boolean => {
    if (current.trim() !== adminPasscode) return false;
    if (!next.trim()) return false;
    setAdminPasscode(next.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return true;
  };

  const moderatorLogin = (passcode: string): boolean => {
    const mod = moderators.find((m) => m.passcode === passcode.trim());
    if (!mod) return false;
    setIsModerator(true);
    setCurrentModerator(mod);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return true;
  };

  const moderatorSignOut = () => {
    setIsModerator(false);
    setCurrentModerator(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const addModerator = (mod: Omit<ModeratorAccount, "id">): boolean => {
    if (!mod.passcode.trim() || !mod.name.trim()) return false;
    if (mod.passcode.trim() === adminPasscode) return false;
    if (moderators.some((m) => m.passcode === mod.passcode.trim())) return false;
    const newMod: ModeratorAccount = { ...mod, passcode: mod.passcode.trim(), name: mod.name.trim(), id: makeId() };
    setModerators((current) => [...current, newMod]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return true;
  };

  const deleteModerator = (modId: string) => {
    setModerators((current) => current.filter((m) => m.id !== modId));
    if (currentModerator?.id === modId) {
      setIsModerator(false);
      setCurrentModerator(null);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };

  const adminUpdateAccount = async (accountId: string, patch: Partial<UserAccount>) => {
    setAccounts((current) => current.map((acc) => acc.id === accountId ? { ...acc, ...patch } : acc));
    setCurrentAccount((current) => (current && current.id === accountId ? { ...current, ...patch } : current));
    try { await api.updateAccount(accountId, patch); } catch (_) { /* silent */ }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const adminSetAccountStatus = async (accountId: string, status: AccountStatus, reason?: string) => {
    const target = accounts.find((acc) => acc.id === accountId);
    const isClub = target?.role === "club";
    const needsRejection = isClub && target?.clubApprovalStatus !== "approved" && (status === "closed" || status === "banned");
    setAccounts((current) => current.map((acc) => {
      if (acc.id !== accountId) return acc;
      const patch: Partial<UserAccount> = { status, statusChangedAt: now(), statusReason: reason };
      if (needsRejection) patch.clubApprovalStatus = "rejected";
      return { ...acc, ...patch };
    }));
    setCurrentAccount((current) => (current && current.id === accountId && needsRejection ? { ...current, clubApprovalStatus: "rejected" } : current));
    if (target) {
      const email = target.email.toLowerCase().trim();
      if (status === "banned") {
        setBannedEmails((current) => current.map((e) => e.toLowerCase()).includes(email) ? current : [...current, target.email.trim()]);
        try { await api.banEmail(target.email.trim()); } catch (_) { /* silent */ }
      } else {
        setBannedEmails((current) => current.filter((e) => e.toLowerCase() !== email));
        try { await api.unbanEmail(target.email.trim()); } catch (_) { /* silent */ }
      }
      if (currentAccount?.id === accountId && status !== "active") {
        setCurrentAccount(undefined);
        setSignOutResetToken((c) => c + 1);
      }
    }
    try { await api.updateAccount(accountId, { status, statusChangedAt: now(), statusReason: reason, ...(needsRejection ? { clubApprovalStatus: "rejected" } : {}) }); } catch (_) { /* silent */ }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };

  const adminUnbanEmail = async (email: string) => {
    const normalized = email.toLowerCase().trim();
    setBannedEmails((current) => current.filter((e) => e.toLowerCase().trim() !== normalized));
    setAccounts((current) => current.map((acc) => acc.email.toLowerCase().trim() === normalized && acc.status === "banned" ? { ...acc, status: "active", statusChangedAt: now(), statusReason: "Unbanned by admin" } : acc));
    try { await api.unbanEmail(email.trim()); } catch (_) { /* silent */ }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const adminSetAdvertStatus = async (advertId: string, status: "active" | "closed", reason?: string, deleteChats?: boolean) => {
    setAdverts((current) => current.map((a) => a.id === advertId ? { ...a, status, closedAt: status === "closed" ? now() : undefined, closedReason: status === "closed" ? reason : undefined } : a));
    if (deleteChats) {
      setConversations((current) => current.filter((c) => c.advertId !== advertId));
    }
    try {
      if (deleteChats) {
        await api.deleteAdvert(advertId);
      } else {
        await api.updateAdvert(advertId, { status, ...(status === "closed" ? { closedAt: now(), closedReason: reason } : { closedAt: undefined, closedReason: undefined }) });
      }
    } catch (_) { /* silent */ }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };

  const adminApproveClub = async (accountId: string) => {
    setAccounts((current) => current.map((acc) => acc.id === accountId ? { ...acc, clubApprovalStatus: "approved" as ClubApprovalStatus } : acc));
    setCurrentAccount((current) => (current && current.id === accountId ? { ...current, clubApprovalStatus: "approved" as ClubApprovalStatus } : current));
    try { await api.updateAccount(accountId, { clubApprovalStatus: "approved" }); } catch (_) { /* silent */ }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const adminRejectClub = async (accountId: string) => {
    setAccounts((current) => current.map((acc) => acc.id === accountId ? { ...acc, clubApprovalStatus: "rejected" as ClubApprovalStatus } : acc));
    setCurrentAccount((current) => (current && current.id === accountId ? { ...current, clubApprovalStatus: "rejected" as ClubApprovalStatus } : current));
    try { await api.updateAccount(accountId, { clubApprovalStatus: "rejected" }); } catch (_) { /* silent */ }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
  };

  const resetClubApprovalAfterEdit = () => {
    if (!currentAccount || currentAccount.role !== "club") return;
    const clubAccountId = currentAccount.id;
    setCurrentAccount((c) => c ? { ...c, clubApprovalStatus: "pending" as ClubApprovalStatus } : c);
    setAccounts((current) => current.map((a) => a.id === clubAccountId ? { ...a, clubApprovalStatus: "pending" as ClubApprovalStatus } : a));
    const clubAdvertIds = adverts
      .filter((a) => a.ownerAccountId === clubAccountId && a.status === "active")
      .map((a) => a.id);
    if (clubAdvertIds.length > 0) {
      const closedAt = now();
      setAdverts((current) => current.map((a) => clubAdvertIds.includes(a.id) ? { ...a, status: "closed", closedAt, closedReason: "Club profile under re-approval" } : a));
      setConversations((current) => current.map((c) => clubAdvertIds.includes(c.advertId ?? "") && (c.status === "pending" || c.status === "connected") ? { ...c, status: "denied" } : c));
      clubAdvertIds.forEach((id) => { api.updateAdvert(id, { status: "closed" }).catch(() => undefined); });
    }
    api.updateAccount(clubAccountId, { clubApprovalStatus: "pending" }).catch(() => undefined);
  };

  const adminSendMessage = async (conversationId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const message: Message = { id: makeId(), sender: "them", body: trimmed, createdAt: now(), isAdmin: true };
    setConversations((current) => current.map((conv) => conv.id === conversationId ? { ...conv, hasUnread: true, messages: [message, ...conv.messages] } : conv));
    try { await api.createMessage(conversationId, { senderAccountId: "admin", sender: "them", body: trimmed, isAdmin: true }); } catch (_) { /* silent */ }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };

  const adminDeleteConversation = async (conversationId: string) => {
    setConversations((current) => current.filter((c) => c.id !== conversationId));
    try { await api.deleteConversation(conversationId); } catch (_) { /* silent */ }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
  };

  const createAdvert = async (draft: DraftAdvert & { postedBy?: string; affiliatedClubId?: string }) => {
    const owner = draft.postedBy ?? (activeProfile === "club" ? clubProfile.name : playerProfile.name);
    const body = {
      ...draft,
      ownerAccountId: currentAccount?.id,
      postedBy: owner,
      postedByType: activeProfile,
      distanceKm: Math.max(1, Math.floor(Math.random() * 32)),
      createdAt: now(),
      status: "active",
      publicId: makeId(),
    };
    try {
      const created = await api.createAdvert(body);
      setAdverts((current) => [created, ...current]);
    } catch (_) {
      // Fallback: keep local
      const advert: Advert = { ...body, id: body.publicId, status: body.status as "active" | "closed" };
      setAdverts((current) => [advert, ...current]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const updateAdvert = async (id: string, patch: Partial<DraftAdvert>) => {
    setAdverts((current) => current.map((a) => a.id === id ? { ...a, ...patch } : a));
    try { await api.updateAdvert(id, patch); } catch (_) { /* silent */ }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const deleteAdvert = async (id: string) => {
    setAdverts((current) => current.filter((a) => a.id !== id));
    try { await api.deleteAdvert(id); } catch (_) { /* silent */ }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  useEffect(() => {
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const check = () => {
      const cutoff = new Date(Date.now() - SEVEN_DAYS).toISOString();
      setAdverts((current) => current.filter((a) => a.createdAt > cutoff));
    };
    check();
    const interval = setInterval(check, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const pendingConnectionIds = useRef<Set<string>>(new Set());

  const connectOnAdvert = async (advert: Advert) => {
    if (pendingConnectionIds.current.has(advert.id)) return "";
    const existing = conversations.find((c) => c.advertId === advert.id && c.initiatorAccountId === currentAccount?.id);
    if (existing) return existing.id;
    pendingConnectionIds.current.add(advert.id);
    const isClubAdvert = advert.postedByType === "club";
    const hasAffiliatedClub = !!advert.affiliatedClubId;
    const convId = makeId();
    const participants = hasAffiliatedClub && advert.ownerAccountId && advert.affiliatedClubId
      ? [advert.ownerAccountId, advert.affiliatedClubId]
      : undefined;
    const conversation: Conversation = {
      id: convId,
      advertId: advert.id,
      advertTitle: advert.title,
      ownerAccountId: advert.ownerAccountId,
      initiatorAccountId: currentAccount?.id,
      clubName: isClubAdvert ? advert.postedBy : clubProfile.name,
      playerName: isClubAdvert ? playerProfile.name : advert.postedBy,
      sport: advert.sport,
      status: "pending",
      advertLocation: advert.location,
      advertPostedByType: advert.postedByType,
      hasUnread: false,
      messages: [],
      requesterLocation: currentAccount?.location,
      requesterType: currentAccount?.role,
      affiliatedClubParticipants: participants,
    };
    try {
      const created = await api.createConversation({ ...conversation, publicId: convId });
      setConversations((current) => [created, ...current]);
      // also create the system message
      const inactiveMsg: Message = {
        id: makeId(),
        sender: "them",
        isSystem: true,
        body: `This chat is currently inactive until your request to connect for "${advert.title}" is accepted by the author.`,
        createdAt: now(),
      };
      await api.createMessage(convId, { sender: "them", isSystem: true, body: inactiveMsg.body });
      setConversations((current) => current.map((c) => c.id === convId ? { ...c, messages: [inactiveMsg, ...c.messages] } : c));
    } catch (_) {
      setConversations((current) => [conversation, ...current]);
    } finally {
      pendingConnectionIds.current.delete(advert.id);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    return convId;
  };

  const acceptConnection = (conversationId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    const relatedAdvert = adverts.find((a) => a.id === conv.advertId);
    const title = conv.advertTitle ?? relatedAdvert?.title ?? "this advert";
    const activeMsg: Message = {
      id: makeId(),
      sender: "them",
      senderAccountId: conv.ownerAccountId,
      isSystem: true,
      body: `This chat is now active to discuss "${title}" between ${conv.clubName} & ${conv.playerName}. Please do not share any sensitive information such as credit card, home address etc. All chats are closely monitored and will be closed immediately at any signs or evidence of misuse or abuse from either party.`,
      createdAt: now(),
    };
    setConversations((current) =>
      current.map((c) => c.id === conversationId ? { ...c, status: "connected", hasUnread: true, messages: [activeMsg] } : c)
    );
    api.updateConversation(conversationId, { status: "connected" }).catch(() => undefined);
    api.createMessage(conversationId, { sender: "them", isSystem: true, body: activeMsg.body }).catch(() => undefined);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const denyConnection = (conversationId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    const ownerAccount = accounts.find((a) => a.id === conv.ownerAccountId);
    const ownerRole = ownerAccount?.role;
    const ownerTypeLabel = ownerRole === "club" ? "a Club" : ownerRole === "coach" ? "a Coach" : "a Player";
    const denyMsg: Message = {
      id: makeId(),
      sender: "them",
      isAdmin: true,
      body: `Sorry. Connection wasn't agreed by ${ownerTypeLabel}. Keep looking.`,
      createdAt: now(),
    };
    setConversations((current) =>
      current.map((c) => c.id === conversationId ? { ...c, status: "denied", hasUnread: false, messages: [denyMsg] } : c)
    );
    api.updateConversation(conversationId, { status: "denied" }).catch(() => undefined);
    api.createMessage(conversationId, { sender: "them", isAdmin: true, body: denyMsg.body }).catch(() => undefined);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };
  const sendMessage = async (conversationId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const message: Message = { id: makeId(), sender: "me", senderAccountId: currentAccount?.id, body: trimmed, createdAt: now() };
    setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, hasUnread: true, messages: [message, ...conversation.messages] } : conversation));
    try { await api.createMessage(conversationId, { senderAccountId: currentAccount?.id, sender: "me", body: trimmed }); } catch (_) { /* silent */ }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const broadcastMessage = async (advertId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const targets = conversations.filter((c) => c.advertId === advertId && c.status === "connected");
    const senderId = currentAccount?.id;
    const timestamp = now();
    setConversations((current) =>
      current.map((c) => {
        if (c.advertId !== advertId || c.status !== "connected") return c;
        const msg: Message = { id: makeId(), sender: "me", senderAccountId: senderId, body: trimmed, createdAt: timestamp };
        return { ...c, hasUnread: true, messages: [msg, ...c.messages] };
      })
    );
    for (const target of targets) {
      try { await api.createMessage(target.id, { senderAccountId: senderId, sender: "me", body: trimmed }); } catch (_) { /* silent */ }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const markConversationRead = (conversationId: string) => {
    setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, hasUnread: false } : conversation));
  };

  const toggleNotifications = async () => {
    if (!notificationSettings.enabled) {
      let next: NotificationSettings = { ...notificationSettings, enabled: true };
      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && "geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition((position) => {
            setNotificationSettings((current) => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude, locationLabel: "Current browser location" }));
          });
        }
      } else {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === "granted") {
          const location = await Location.getCurrentPositionAsync({});
          next = { ...next, latitude: location.coords.latitude, longitude: location.coords.longitude, locationLabel: "Current device location" };
        } else {
          Alert.alert("Location not enabled", "Alerts will use your profile location until location access is allowed.");
        }
      }
      setNotificationSettings(next);
      return;
    }
    setNotificationSettings((current) => ({ ...current, enabled: false }));
  };

  const setNotificationRadius = (radiusKm: number) => {
    setNotificationSettings((current) => ({ ...current, radiusKm }));
  };

  const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
  const MIN_DIMENSION = 200;

  const validateImageAsset = (asset: ImagePicker.ImagePickerAsset): string | null => {
    if ((asset.width ?? 0) < MIN_DIMENSION || (asset.height ?? 0) < MIN_DIMENSION) {
      return `Image too small. Minimum size is ${MIN_DIMENSION} x ${MIN_DIMENSION} px.`;
    }
    if ((asset.fileSize ?? 0) > MAX_FILE_SIZE_BYTES) {
      return `File too large. Maximum file size is 2 MB.`;
    }
    return null;
  };

  const pickProfileImage = async (owner: "club" | "player") => {
    const declines = currentAccount?.profileImageDeclines ?? 0;
    if (declines >= 3) {
      Alert.alert("Upload blocked", "You have exceeded the maximum number of profile picture upload attempts. Contact admin for assistance.");
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to submit a profile image for admin review.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    const validationError = validateImageAsset(asset);
    if (validationError) {
      Alert.alert("Image not accepted", validationError);
      return;
    }
    const displayName = currentAccount?.role === "club"
      ? (currentAccount.clubName || "Club")
      : currentAccount?.role === "guardian"
        ? (currentAccount.playerName || currentAccount.parentGuardianName || "Player")
        : (currentAccount?.fullName || currentAccount?.playerName || "Player");
    // If replacing an existing pending image, clear the old one first
    const previousImageId = owner === "club" ? clubProfile.imageId : playerProfile.imageId;
    if (previousImageId) {
      await clearProfileImage(previousImageId);
    }
    const image: ProfileImage = { id: makeId(), owner: displayName, uri: asset.uri, status: "pending", submittedAt: now() };
    setProfileImages((current) => [image, ...current]);
    if (owner === "club") setClubProfile((current) => ({ ...current, imageId: image.id }));
    if (owner === "player") setPlayerProfile((current) => ({ ...current, imageId: image.id }));
    updateAccount({ profileImageId: image.id });
    if (currentAccount) {
      api.updateAccount(currentAccount.id, { profileImageId: image.id }).catch(() => undefined);
    }
    api.createProfileImage({ ...image, publicId: image.id }).catch(() => undefined);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const pickAccountImage = async (owner: string, previousImageId?: string) => {
    const declines = currentAccount?.profileImageDeclines ?? 0;
    if (declines >= 3) {
      Alert.alert("Upload blocked", "You have exceeded the maximum number of profile picture upload attempts. Contact admin for assistance.");
      return undefined;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to submit a profile image for admin review.");
      return undefined;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]?.uri) return undefined;
    const asset = result.assets[0];
    const validationError = validateImageAsset(asset);
    if (validationError) {
      Alert.alert("Image not accepted", validationError);
      return undefined;
    }
    // If replacing a previous unapproved image, clear it first
    if (previousImageId) {
      await clearProfileImage(previousImageId);
    }
    const displayName = currentAccount?.role === "club"
      ? (currentAccount.clubName || "Club")
      : currentAccount?.role === "guardian"
        ? (currentAccount.playerName || currentAccount.parentGuardianName || "Player")
        : (currentAccount?.fullName || currentAccount?.playerName || "Player");
    const image: ProfileImage = { id: makeId(), owner: displayName, uri: asset.uri, status: "pending", submittedAt: now() };
    setProfileImages((current) => [image, ...current]);
    if (currentAccount) {
      api.updateAccount(currentAccount.id, { profileImageId: image.id }).catch(() => undefined);
    }
    api.createProfileImage({ ...image, publicId: image.id }).catch(() => undefined);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return image.id;
  };

  const moderateImage = async (imageId: string, status: ImageStatus) => {
    if (status === "approved") {
      // Mark image as approved
      setProfileImages((current) => current.map((image) => image.id === imageId ? { ...image, status } : image));
      try { await api.updateProfileImage(imageId, { status }); } catch (_) { /* silent */ }
      // Link approved image to the account/profile that owns it
      const targetAccount = accounts.find((a) => a.profileImageId === imageId) ??
        (currentAccount?.profileImageId === imageId ? currentAccount : undefined);
      if (targetAccount) {
        if (targetAccount.role === "club") {
          setClubProfile((current) => ({ ...current, imageId }));
        } else {
          setPlayerProfile((current) => ({ ...current, imageId }));
        }
        if (targetAccount.id === currentAccount?.id) {
          setCurrentAccount((current) => current ? { ...current, profileImageId: imageId } : current);
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      return;
    }

    // Rejected: completely remove the image
    const targetAccount = accounts.find((a) => a.profileImageId === imageId) ??
      (currentAccount?.profileImageId === imageId ? currentAccount : undefined);

    if (targetAccount) {
      const nextDeclines = (targetAccount.profileImageDeclines ?? 0) + 1;
      // Update account state
      setAccounts((current) => current.map((acc) => acc.id === targetAccount.id ? { ...acc, profileImageId: undefined, profileImageDeclines: nextDeclines } : acc));
      if (targetAccount.id === currentAccount?.id) {
        setCurrentAccount((current) => current ? { ...current, profileImageId: undefined, profileImageDeclines: nextDeclines } : current);
      }
      // Clear profile references
      if (targetAccount.role === "club") {
        setClubProfile((current) => ({ ...current, imageId: undefined }));
      } else {
        setPlayerProfile((current) => ({ ...current, imageId: undefined }));
      }
      // Sync account update to API
      try { await api.updateAccount(targetAccount.id, { profileImageId: null, profileImageDeclines: String(nextDeclines) }); } catch (_) { /* silent */ }
    }

    // Remove image from local state
    setProfileImages((current) => current.filter((img) => img.id !== imageId));
    // Delete from API
    try { await api.deleteProfileImage(imageId); } catch (_) { /* silent */ }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const clearProfileImage = async (imageId: string) => {
    // Remove from local state
    setProfileImages((current) => current.filter((img) => img.id !== imageId));
    // Clear all account references
    const targetAccount = accounts.find((a) => a.profileImageId === imageId) ??
      (currentAccount?.profileImageId === imageId ? currentAccount : undefined);
    if (targetAccount) {
      setAccounts((current) => current.map((acc) => acc.id === targetAccount.id ? { ...acc, profileImageId: undefined } : acc));
      if (targetAccount.id === currentAccount?.id) {
        setCurrentAccount((current) => current ? { ...current, profileImageId: undefined } : current);
      }
      if (targetAccount.role === "club") {
        setClubProfile((current) => ({ ...current, imageId: undefined }));
      } else {
        setPlayerProfile((current) => ({ ...current, imageId: undefined }));
      }
      // Sync to API
      api.updateAccount(targetAccount.id, { profileImageId: null }).catch(() => undefined);
    }
    // Delete from API
    api.deleteProfileImage(imageId).catch(() => undefined);
  };

  const moderateHighlightLink = (linkId: string, status: ImageStatus) => {
    setPendingHighlightLinks((current) => current.map((link) => link.id === linkId ? { ...link, status } : link));
    setCurrentAccount((account) => account?.highlightReelUrl && pendingHighlightLinks.some((link) => link.id === linkId && link.url === account.highlightReelUrl) ? { ...account, highlightReelStatus: status } : account);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };

  const getImageUri = (imageId?: string, includePending = false) => {
    const image = profileImages.find((item) => item.id === imageId);
    if (!image) return undefined;
    if (image.status === "approved" || includePending) return image.uri;
    return undefined;
  };

  const getImageStatus = (imageId?: string) => {
    const image = profileImages.find((item) => item.id === imageId);
    return image?.status;
  };

  const requestCoachAffiliation = (coachAccountId: string, teamName?: string, ageGroup?: string) => {
    if (!currentAccount || currentAccount.role !== "club") return;
    const coach = accounts.find((a) => a.id === coachAccountId);
    if (!coach || coach.role !== "coach") return;
    const existing = currentAccount.coachAffiliates?.find((a) => a.coachAccountId === coachAccountId);
    if (existing && existing.status === "blocked") {
      Alert.alert("Cannot request", "This coach has permanently blocked affiliation requests from your club. Contact admin for assistance.");
      return;
    }
    if (existing && existing.status === "rejected" && existing.rejectedAt) {
      const rejectedDate = new Date(existing.rejectedAt);
      const cooldownDays = 7;
      const earliest = new Date(rejectedDate.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
      if (Date.now() < earliest.getTime()) {
        Alert.alert("Cooldown period", `You can re-request this coach after ${earliest.toLocaleDateString()}.`);
        return;
      }
    }
    const affiliate: CoachAffiliate = {
      coachAccountId,
      teamName,
      ageGroup,
      status: "pending",
      rejectionCount: existing?.rejectionCount ?? 0,
      requestedAt: now(),
    };
    setAccounts((current) => current.map((acc) => {
      if (acc.id !== currentAccount.id) return acc;
      const prev = acc.coachAffiliates ?? [];
      const filtered = prev.filter((a) => a.coachAccountId !== coachAccountId);
      return { ...acc, coachAffiliates: [...filtered, affiliate] };
    }));
    if (currentAccount) {
      setCurrentAccount((c) => {
        if (!c) return c;
        const prev = c.coachAffiliates ?? [];
        const filtered = prev.filter((a) => a.coachAccountId !== coachAccountId);
        return { ...c, coachAffiliates: [...filtered, affiliate] };
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const respondToAffiliationRequest = (clubAccountId: string, accept: boolean) => {
    const club = accounts.find((a) => a.id === clubAccountId);
    if (!club || club.role !== "club") return;
    const affiliate = club.coachAffiliates?.find((a) => a.coachAccountId === currentAccount?.id);
    if (!affiliate || affiliate.status !== "pending") return;

    if (accept) {
      const nextAffiliate: CoachAffiliate = { ...affiliate, status: "active" };
      setAccounts((current) => current.map((acc) => {
        if (acc.id === clubAccountId) {
          const prev = acc.coachAffiliates ?? [];
          return { ...acc, coachAffiliates: prev.map((a) => a.coachAccountId === currentAccount?.id ? nextAffiliate : a) };
        }
        if (acc.id === currentAccount?.id) {
          return { ...acc, affiliatedClubId: clubAccountId, affiliatedClubName: club.clubName || "Club" };
        }
        return acc;
      }));
      setCurrentAccount((c) => c ? { ...c, affiliatedClubId: clubAccountId, affiliatedClubName: club.clubName || "Club" } : c);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } else {
      const nextCount = affiliate.rejectionCount + 1;
      const nextStatus: CoachAffiliateStatus = nextCount >= 3 ? "blocked" : "rejected";
      const nextAffiliate: CoachAffiliate = { ...affiliate, status: nextStatus, rejectionCount: nextCount, rejectedAt: now() };
      setAccounts((current) => current.map((acc) => {
        if (acc.id !== clubAccountId) return acc;
        const prev = acc.coachAffiliates ?? [];
        return { ...acc, coachAffiliates: prev.map((a) => a.coachAccountId === currentAccount?.id ? nextAffiliate : a) };
      }));
      if (currentAccount?.id) {
        setCurrentAccount((c) => {
          if (!c) return c;
          return { ...c, affiliatedClubId: undefined, affiliatedClubName: undefined };
        });
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    }
  };

  const removeCoachAffiliate = (coachAccountId: string) => {
    if (!currentAccount || currentAccount.role !== "club") return;
    const affiliate = currentAccount.coachAffiliates?.find((a) => a.coachAccountId === coachAccountId);
    if (!affiliate) return;
    // Close adverts from this coach
    const nowStr = now();
    setAdverts((current) => current.map((a) => {
      if (a.ownerAccountId === coachAccountId && a.affiliatedClubId === currentAccount.id) {
        return { ...a, status: "closed", closedAt: nowStr, closedReason: "Coach removed from club affiliates" };
      }
      return a;
    }));
    // Close connected chats
    setConversations((current) => current.map((c) => {
      if (c.affiliatedClubParticipants?.includes(coachAccountId) && (c.status === "pending" || c.status === "connected")) {
        return { ...c, status: "denied" };
      }
      return c;
    }));
    // Remove from club account
    setAccounts((current) => current.map((acc) => {
      if (acc.id !== currentAccount.id) return acc;
      const prev = acc.coachAffiliates ?? [];
      return { ...acc, coachAffiliates: prev.filter((a) => a.coachAccountId !== coachAccountId) };
    }));
    setCurrentAccount((c) => {
      if (!c) return c;
      const prev = c.coachAffiliates ?? [];
      return { ...c, coachAffiliates: prev.filter((a) => a.coachAccountId !== coachAccountId) };
    });
    // Clear coach's affiliation
    setAccounts((current) => current.map((acc) => {
      if (acc.id !== coachAccountId) return acc;
      return { ...acc, affiliatedClubId: undefined, affiliatedClubName: undefined };
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };

  const updateCoachAffiliateDetails = (coachAccountId: string, teamName?: string, ageGroup?: string) => {
    if (!currentAccount || currentAccount.role !== "club") return;
    setAccounts((current) => current.map((acc) => {
      if (acc.id !== currentAccount.id) return acc;
      const prev = acc.coachAffiliates ?? [];
      return { ...acc, coachAffiliates: prev.map((a) => a.coachAccountId === coachAccountId ? { ...a, teamName, ageGroup } : a) };
    }));
    setCurrentAccount((c) => {
      if (!c) return c;
      const prev = c.coachAffiliates ?? [];
      return { ...c, coachAffiliates: prev.map((a) => a.coachAccountId === coachAccountId ? { ...a, teamName, ageGroup } : a) };
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const unblockCoachAffiliate = (clubAccountId: string, coachAccountId: string) => {
    setAccounts((current) => current.map((acc) => {
      if (acc.id !== clubAccountId) return acc;
      const prev = acc.coachAffiliates ?? [];
      return { ...acc, coachAffiliates: prev.filter((a) => a.coachAccountId !== coachAccountId) };
    }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const value = useMemo<SportsConnectState>(() => {
    const myConversations = isAdmin || isModerator
      ? conversations
      : currentAccount
      ? conversations.filter((c) =>
          !c.initiatorAccountId ||
          c.initiatorAccountId === currentAccount.id ||
          c.ownerAccountId === currentAccount.id ||
          c.affiliatedClubParticipants?.includes(currentAccount.id)
        )
      : conversations;
    const approvedSports = sportsRegistry.filter((s) => s.enabled);
    return {
    adverts,
    conversations: myConversations,
    profileImages,
    pendingHighlightLinks,
    currentAccount,
    clubProfile,
    playerProfile,
    notificationSettings,
    sportsRegistry,
    approvedSports,
    pendingSportRequests,
    selectedSport,
    activeProfile,
    isAdmin,
    isModerator,
    currentModerator,
    moderators,
    moderatorLogin,
    moderatorSignOut,
    addModerator,
    deleteModerator,
    isHydrated,
    showMemberStats,
    toggleShowMemberStats,
    showSportRequestField,
    toggleShowSportRequestField,
    setSelectedSport,
    setActiveProfile,
    requestSport,
    moderateSportRequest,
    adminAddSport,
    adminToggleSport,
    adminUpdateSport,
    adminDeleteSport,
    accounts,
    bannedEmails,
    loginWithEmail,
    loginWithSocial,
    autoRestoreSession,
    createAccount,
    signOut,
    signOutResetToken,
    clearAllData,
    adminLogin,
    adminSignOut,
    changeAdminPasscode,
    adminUpdateAccount,
    adminSetAccountStatus,
    adminUnbanEmail,
    adminSetAdvertStatus,
    adminSendMessage,
    adminDeleteConversation,
    adminApproveClub,
    adminRejectClub,
    resetClubApprovalAfterEdit,
    createAdvert,
    updateAdvert,
    deleteAdvert,
    connectOnAdvert,
    acceptConnection,
    denyConnection,
    sendMessage,
    broadcastMessage,
    markConversationRead,
    toggleNotifications,
    setNotificationRadius,
    updateClubProfile: setClubProfile,
    updatePlayerProfile: setPlayerProfile,
    updateAccount,
    pickProfileImage,
    pickAccountImage,
    clearProfileImage,
    moderateImage,
    moderateHighlightLink,
    getImageUri,
    getImageStatus,
    requestCoachAffiliation,
    respondToAffiliationRequest,
    removeCoachAffiliate,
    updateCoachAffiliateDetails,
    unblockCoachAffiliate,
    };
  }, [adverts, conversations, profileImages, pendingHighlightLinks, accounts, bannedEmails, currentAccount, clubProfile, playerProfile, notificationSettings, sportsRegistry, pendingSportRequests, selectedSport, activeProfile, isAdmin, isModerator, currentModerator, moderators, adminPasscode, showMemberStats, showSportRequestField]);

  return <SportsConnectContext.Provider value={value}>{children}</SportsConnectContext.Provider>;
}

export function useSportsConnect() {
  const context = useContext(SportsConnectContext);
  if (!context) throw new Error("useSportsConnect must be used inside SportsConnectProvider");
  return context;
}

export function useOptionalSportsConnect() {
  return useContext(SportsConnectContext);
}
