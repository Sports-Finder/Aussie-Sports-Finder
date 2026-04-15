import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Platform } from "react-native";

import { SportTheme, createCustomSportTheme, defaultSportThemes } from "@/constants/sports";

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
  clubContactEmail?: string;
  clubContactMobile?: string;
  createdAt: string;
  approved: boolean;
};

export type Advert = {
  id: string;
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
  seasonFees?: number;
  feesNegotiable?: boolean;
  feesFree?: boolean;
  trialRequired?: boolean;
};

export type Conversation = {
  id: string;
  advertId: string;
  clubName: string;
  playerName: string;
  status: "connected";
  messages: Message[];
};

export type Message = {
  id: string;
  sender: "me" | "them";
  body: string;
  createdAt: string;
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
type DraftAccount = Omit<UserAccount, "id" | "createdAt" | "approved">;
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
  approvedSports: SportTheme[];
  pendingSportRequests: SportRequest[];
  selectedSport: string;
  activeProfile: ProfileType;
  isAdmin: boolean;
  setSelectedSport: (sport: string) => void;
  setActiveProfile: (profile: ProfileType) => void;
  requestSport: (name: string) => void;
  moderateSportRequest: (requestId: string, status: "approved" | "rejected") => void;
  createAccount: (draft: DraftAccount) => void;
  signOut: () => void;
  signOutResetToken: number;
  adminLogin: (passcode: string) => boolean;
  adminSignOut: () => void;
  changeAdminPasscode: (current: string, next: string) => boolean;
  createAdvert: (draft: DraftAdvert) => void;
  updateAdvert: (id: string, patch: Partial<DraftAdvert>) => void;
  deleteAdvert: (id: string) => void;
  connectOnAdvert: (advert: Advert) => string;
  sendMessage: (conversationId: string, body: string) => void;
  toggleNotifications: () => Promise<void>;
  setNotificationRadius: (radiusKm: number) => void;
  updateClubProfile: (profile: ClubProfile) => void;
  updatePlayerProfile: (profile: PlayerProfile) => void;
  updateAccount: (profile: Partial<UserAccount>) => void;
  pickProfileImage: (owner: "club" | "player") => Promise<void>;
  pickAccountImage: (owner: string) => Promise<string | undefined>;
  moderateImage: (imageId: string, status: ImageStatus) => void;
  moderateHighlightLink: (linkId: string, status: ImageStatus) => void;
  getImageUri: (imageId?: string, includePending?: boolean) => string | undefined;
};

const storageKey = "sports-connect-state-v5-account-onboarding";
const adminStorageKey = "sports-connect-admin-v1";
const defaultAdminPasscode = "AUSSCF-2025";

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

const seedConversation: Conversation = {
  id: "conv-1",
  advertId: "ad-1",
  clubName: "Yarra United SC",
  playerName: "You",
  status: "connected",
  messages: [
    { id: "m1", sender: "them", body: "Thanks for connecting. Are you free to come down to training this Thursday?", createdAt: now() },
    { id: "m2", sender: "me", body: "Yes, I can make Thursday. Please send the arrival time and kit colour.", createdAt: now() },
  ],
};

const defaultState = {
  adverts: seedAdverts,
  conversations: [seedConversation],
  profileImages: [] as ProfileImage[],
  pendingHighlightLinks: [] as HighlightLink[],
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
  approvedSports: defaultSportThemes,
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
  const [currentAccount, setCurrentAccount] = useState<UserAccount | undefined>(defaultState.currentAccount);
  const [clubProfile, setClubProfile] = useState<ClubProfile>(defaultState.clubProfile);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(defaultState.playerProfile);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultState.notificationSettings);
  const [approvedSports, setApprovedSports] = useState<SportTheme[]>(defaultState.approvedSports);
  const [pendingSportRequests, setPendingSportRequests] = useState<SportRequest[]>(defaultState.pendingSportRequests);
  const [selectedSport, setSelectedSport] = useState(defaultState.selectedSport);
  const [activeProfile, setActiveProfile] = useState<ProfileType>(defaultState.activeProfile);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState(defaultAdminPasscode);
  const [signOutResetToken, setSignOutResetToken] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(adminStorageKey).then((stored) => {
      if (!stored) return;
      const parsed = JSON.parse(stored) as { adminPasscode?: string };
      if (parsed.adminPasscode) setAdminPasscode(parsed.adminPasscode);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(adminStorageKey, JSON.stringify({ adminPasscode })).catch(() => undefined);
  }, [adminPasscode]);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((stored) => {
      if (!stored) return;
      const parsed = JSON.parse(stored) as typeof defaultState;
      setAdverts((parsed.adverts ?? defaultState.adverts).map((advert) => ({
        ...advert,
        type: normalizeAdvertType(advert.type),
      })));
      setConversations(parsed.conversations ?? defaultState.conversations);
      setProfileImages(parsed.profileImages ?? []);
      setPendingHighlightLinks(parsed.pendingHighlightLinks ?? []);
      setCurrentAccount(parsed.currentAccount);
      setClubProfile(parsed.clubProfile ?? defaultState.clubProfile);
      setPlayerProfile(parsed.playerProfile ?? defaultState.playerProfile);
      setNotificationSettings(parsed.notificationSettings ?? defaultState.notificationSettings);
      setApprovedSports(parsed.approvedSports ?? defaultState.approvedSports);
      setPendingSportRequests(parsed.pendingSportRequests ?? []);
      setSelectedSport(parsed.selectedSport ?? defaultState.selectedSport);
      setActiveProfile(parsed.activeProfile ?? "player");
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const snapshot = { adverts, conversations, profileImages, pendingHighlightLinks, currentAccount, clubProfile, playerProfile, notificationSettings, approvedSports, pendingSportRequests, selectedSport, activeProfile };
    AsyncStorage.setItem(storageKey, JSON.stringify(snapshot)).catch(() => undefined);
  }, [adverts, conversations, profileImages, pendingHighlightLinks, currentAccount, clubProfile, playerProfile, notificationSettings, approvedSports, pendingSportRequests, selectedSport, activeProfile]);

  const requestSport = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const alreadyApproved = approvedSports.some((sport) => sport.name.toLowerCase() === trimmed.toLowerCase());
    const alreadyPending = pendingSportRequests.some((request) => request.name.toLowerCase() === trimmed.toLowerCase() && request.status === "pending");
    if (alreadyApproved || alreadyPending) {
      Alert.alert("Sport already exists", "This sport is already available or waiting for admin approval.");
      return;
    }
    setPendingSportRequests((current) => [{ id: makeId(), name: trimmed, status: "pending", requestedAt: now() }, ...current]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const moderateSportRequest = (requestId: string, status: "approved" | "rejected") => {
    const request = pendingSportRequests.find((item) => item.id === requestId);
    if (!request) return;
    if (status === "approved") {
      setApprovedSports((current) => {
        if (current.some((sport) => sport.name.toLowerCase() === request.name.toLowerCase())) return current;
        return [...current, createCustomSportTheme(request.name)];
      });
    }
    setPendingSportRequests((current) => current.map((item) => item.id === requestId ? { ...item, status } : item));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };

  const createAccount = (draft: DraftAccount) => {
    const account: UserAccount = {
      ...draft,
      id: makeId(),
      createdAt: now(),
      approved: true,
    };
    setCurrentAccount(account);
    setSelectedSport(account.defaultSport);
    if (account.role === "club") {
      setActiveProfile("club");
      setClubProfile((current) => ({
        ...current,
        name: account.clubName || current.name,
        sport: account.defaultSport,
        location: account.location || current.location,
        mapAddress: account.clubAddress || current.mapAddress,
        imageId: account.profileImageId,
      }));
    } else {
      setActiveProfile("player");
      setPlayerProfile((current) => ({
        ...current,
        name: account.role === "guardian" ? account.playerName || current.name : account.fullName || account.playerName || current.name,
        sports: account.sports.join(", "),
        location: account.location || current.location,
        imageId: account.profileImageId,
      }));
    }
    if (account.highlightReelUrl) {
      setPendingHighlightLinks((current) => [{
        id: makeId(),
        owner: account.role === "club" ? account.clubName || "Club" : account.playerName || account.fullName || "Player",
        url: account.highlightReelUrl,
        status: "pending",
        submittedAt: now(),
      }, ...current]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const signOut = () => {
    setCurrentAccount(undefined);
    setSignOutResetToken((current) => current + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
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

  const createAdvert = (draft: DraftAdvert) => {
    const owner = activeProfile === "club" ? clubProfile.name : playerProfile.name;
    const advert: Advert = {
      ...draft,
      id: makeId(),
      postedBy: owner,
      postedByType: activeProfile,
      distanceKm: Math.max(1, Math.floor(Math.random() * 32)),
      createdAt: now(),
    };
    setAdverts((current) => [advert, ...current]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const updateAdvert = (id: string, patch: Partial<DraftAdvert>) => {
    setAdverts((current) => current.map((a) => a.id === id ? { ...a, ...patch } : a));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const deleteAdvert = (id: string) => {
    setAdverts((current) => current.filter((a) => a.id !== id));
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

  const connectOnAdvert = (advert: Advert) => {
    const existing = conversations.find((conversation) => conversation.advertId === advert.id);
    if (existing) return existing.id;
    const isClubAdvert = advert.postedByType === "club";
    const conversation: Conversation = {
      id: makeId(),
      advertId: advert.id,
      clubName: isClubAdvert ? advert.postedBy : clubProfile.name,
      playerName: isClubAdvert ? playerProfile.name : advert.postedBy,
      status: "connected",
      messages: [
        {
          id: makeId(),
          sender: "them",
          body: `Connection agreed for “${advert.title}”. Use this private chat to arrange training, trials and next steps.`,
          createdAt: now(),
        },
      ],
    };
    setConversations((current) => [conversation, ...current]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return conversation.id;
  };

  const sendMessage = (conversationId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const message: Message = { id: makeId(), sender: "me", body: trimmed, createdAt: now() };
    setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, messages: [message, ...conversation.messages] } : conversation));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
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

  const pickProfileImage = async (owner: "club" | "player") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to submit a profile image for admin review.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]?.uri) return;
    const image: ProfileImage = { id: makeId(), owner, uri: result.assets[0].uri, status: "pending", submittedAt: now() };
    setProfileImages((current) => [image, ...current]);
    if (owner === "club") setClubProfile((current) => ({ ...current, imageId: image.id }));
    if (owner === "player") setPlayerProfile((current) => ({ ...current, imageId: image.id }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const pickAccountImage = async (owner: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to submit a profile image for admin review.");
      return undefined;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]?.uri) return undefined;
    const image: ProfileImage = { id: makeId(), owner, uri: result.assets[0].uri, status: "pending", submittedAt: now() };
    setProfileImages((current) => [image, ...current]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return image.id;
  };

  const moderateImage = (imageId: string, status: ImageStatus) => {
    setProfileImages((current) => current.map((image) => image.id === imageId ? { ...image, status } : image));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
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

  const value = useMemo<SportsConnectState>(() => ({
    adverts,
    conversations,
    profileImages,
    pendingHighlightLinks,
    currentAccount,
    clubProfile,
    playerProfile,
    notificationSettings,
    approvedSports,
    pendingSportRequests,
    selectedSport,
    activeProfile,
    isAdmin,
    setSelectedSport,
    setActiveProfile,
    requestSport,
    moderateSportRequest,
    createAccount,
    signOut,
    signOutResetToken,
    adminLogin,
    adminSignOut,
    changeAdminPasscode,
    createAdvert,
    updateAdvert,
    deleteAdvert,
    connectOnAdvert,
    sendMessage,
    toggleNotifications,
    setNotificationRadius,
    updateClubProfile: setClubProfile,
    updatePlayerProfile: setPlayerProfile,
    updateAccount,
    pickProfileImage,
    pickAccountImage,
    moderateImage,
    moderateHighlightLink,
    getImageUri,
  }), [adverts, conversations, profileImages, pendingHighlightLinks, currentAccount, clubProfile, playerProfile, notificationSettings, approvedSports, pendingSportRequests, selectedSport, activeProfile, isAdmin, adminPasscode]);

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
