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
  ageGroup: string;
  preferredAge?: number;
  positions: string[];
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

const seedAdverts: Advert[] = [
  { id: "seed-1", type: "players-wanted", title: "Ages 7 11 Football Players Wanted in NSW", sport: "Football (Soccer)", location: "Parramatta, NSW", distanceKm: 6, postedBy: "Westside United", postedByType: "club", level: "Junior", availability: "Tue/Thu", description: "Community club seeking committed junior players for the upcoming season.", needs: "Goalkeeper, defender, striker", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Goalkeeper (GK)", "Centre Back (CB)"] },
  { id: "seed-2", type: "player-looking", title: "Senior Midfielder Seeking Club in VIC", sport: "Football (Soccer)", location: "Geelong, VIC", distanceKm: 12, postedBy: "Ava M", postedByType: "player", level: "Senior", availability: "Mon/Wed", description: "Reliable midfielder looking for a competitive local club.", needs: "Midfielder", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Central Midfielder (CM)"] },
  { id: "seed-3", type: "players-wanted", title: "Youth Football Team Trials in QLD", sport: "Football (Soccer)", location: "Ipswich, QLD", distanceKm: 8, postedBy: "River City FC", postedByType: "club", level: "Intermediate", availability: "Sat", description: "Trials for youth squad spots ahead of winter comp.", needs: "All positions", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Goalkeeper (GK)", "Winger (LW/RW)"] },
  { id: "seed-4", type: "player-looking", title: "Junior Keeper Ready to Join Club", sport: "Football (Soccer)", location: "Blacktown, NSW", distanceKm: 5, postedBy: "Noah P", postedByType: "player", level: "Junior", availability: "Weekends", description: "Young keeper with strong hand skills and great attitude.", needs: "Goalkeeper", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Goalkeeper (GK)"] },
  { id: "seed-5", type: "coach-looking", title: "Coach Looking for Football Club in WA", sport: "Football (Soccer)", location: "Joondalup, WA", distanceKm: 15, postedBy: "Coach Sam", postedByType: "player", level: "Senior", availability: "Evenings", description: "Experienced coach available for junior or senior club roles.", needs: "Coaching role", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Coach"] },
  { id: "seed-6", type: "players-wanted", title: "Mini Football Players Wanted in SA", sport: "Football (Soccer)", location: "Adelaide, SA", distanceKm: 7, postedBy: "Southside Juniors", postedByType: "club", level: "Tiny Tots / Minis", availability: "Sat", description: "Friendly introduction program for first-time players.", needs: "Fun, safe beginners", createdAt: now(), ageGroup: "Tiny Tots / Minis (Ages 3–6)", positions: ["General Player"] },
  { id: "seed-7", type: "player-looking", title: "Attacking Mid Seeks Club in TAS", sport: "Football (Soccer)", location: "Hobart, TAS", distanceKm: 11, postedBy: "Liam T", postedByType: "player", level: "Senior Youth", availability: "Tue/Thu", description: "Creative attacker looking for a competitive team.", needs: "Attacking midfielder", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Attacking Midfielder (CAM)"] },
  { id: "seed-8", type: "players-wanted", title: "Football Players Wanted for Club Trials", sport: "Football (Soccer)", location: "Canberra, ACT", distanceKm: 9, postedBy: "Capital FC", postedByType: "club", level: "Senior Youth", availability: "Mon/Wed", description: "Open trials for senior youth and reserve teams.", needs: "Striker and defenders", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Striker (ST)", "Centre Back (CB)"] },
  { id: "seed-9", type: "player-looking", title: "Winger Wanting Local Football Club", sport: "Football (Soccer)", location: "Penrith, NSW", distanceKm: 18, postedBy: "Mia R", postedByType: "player", level: "Intermediate", availability: "Sat/Sun", description: "Fast wide player ready for a new challenge.", needs: "Winger", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Winger (LW/RW)"] },
  { id: "seed-10", type: "players-wanted", title: "Football Club Seeking Senior Players", sport: "Football (Soccer)", location: "Ballarat, VIC", distanceKm: 20, postedBy: "Ballarat Rovers", postedByType: "club", level: "Senior", availability: "Tue/Thu", description: "Senior men’s and women’s teams need fresh talent.", needs: "Multiple positions", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Full Back (LB/RB)", "Centre Midfielder (CM)"] },
  { id: "seed-11", type: "player-looking", title: "Defender Seeking Football Club in QLD", sport: "Football (Soccer)", location: "Cairns, QLD", distanceKm: 14, postedBy: "Ethan J", postedByType: "player", level: "Senior", availability: "Evenings", description: "Versatile defender looking to join a local side.", needs: "Centre back", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Centre Back (CB)"] },
  { id: "seed-12", type: "players-wanted", title: "Junior Football Team Needs Wingers", sport: "Football (Soccer)", location: "Wollongong, NSW", distanceKm: 10, postedBy: "Shoreline FC", postedByType: "club", level: "Junior", availability: "Mon/Thu", description: "Junior squads looking for wide players with good energy.", needs: "Wingers", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Winger (LW/RW)"] },
  { id: "seed-13", type: "player-looking", title: "Goalkeeper Seeking Football Club", sport: "Football (Soccer)", location: "Mackay, QLD", distanceKm: 9, postedBy: "Olivia S", postedByType: "player", level: "Intermediate", availability: "Tue/Fri", description: "Confident shot-stopper available for training and matches.", needs: "Goalkeeper", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Goalkeeper (GK)"] },
  { id: "seed-14", type: "players-wanted", title: "Football Club Seeking Full Backs", sport: "Football (Soccer)", location: "Bendigo, VIC", distanceKm: 16, postedBy: "Bendigo United", postedByType: "club", level: "Senior", availability: "Wed/Sat", description: "Recruiting disciplined full backs for winter season.", needs: "Full backs", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Full Back (LB/RB)"] },
  { id: "seed-15", type: "coach-looking", title: "Football Coach Seeking Junior Club", sport: "Football (Soccer)", location: "Townsville, QLD", distanceKm: 13, postedBy: "Coach Priya", postedByType: "player", level: "Senior", availability: "After 5pm", description: "Positive junior development coach seeking a local role.", needs: "Junior coaching", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Coach"] },
  { id: "seed-16", type: "players-wanted", title: "Football Trials for Intermediate Youth", sport: "Football (Soccer)", location: "Newcastle, NSW", distanceKm: 17, postedBy: "Harbour FC", postedByType: "club", level: "Intermediate", availability: "Tue/Sat", description: "Open trials for youth players across all positions.", needs: "Midfielders and forwards", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Central Midfielder (CM)", "Centre Forward (CF)"] },
  { id: "seed-17", type: "player-looking", title: "Striker Wants Football Club in NT", sport: "Football (Soccer)", location: "Darwin, NT", distanceKm: 7, postedBy: "Harper K", postedByType: "player", level: "Senior Youth", availability: "Mon/Wed/Sat", description: "Clinical finisher seeking a club with strong team culture.", needs: "Striker", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Striker (ST)"] },
  { id: "seed-18", type: "players-wanted", title: "Senior Football Team Looking for Keepers", sport: "Football (Soccer)", location: "Albury, NSW", distanceKm: 22, postedBy: "Northside Athletic", postedByType: "club", level: "Senior", availability: "Mon/Thu", description: "Senior squad needs a reliable goalkeeper for the season.", needs: "Goalkeeper", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Goalkeeper (GK)"] },
  { id: "seed-19", type: "player-looking", title: "Box to Box Midfielder Seeking Club", sport: "Football (Soccer)", location: "Rockhampton, QLD", distanceKm: 19, postedBy: "Jordan L", postedByType: "player", level: "Senior", availability: "Evenings and weekends", description: "High work-rate midfielder ready to join a competitive team.", needs: "Box-to-box midfielder", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Box-to-Box Midfielder"] },
  { id: "seed-20", type: "players-wanted", title: "Football Club Seeking Centre Mids", sport: "Football (Soccer)", location: "Toowoomba, QLD", distanceKm: 13, postedBy: "Toowoomba Rovers", postedByType: "club", level: "Intermediate", availability: "Wed/Sun", description: "Midfield reinforcements wanted for youth and reserve teams.", needs: "Centre midfielders", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Central Midfielder (CM)"] },
  { id: "seed-21", type: "player-looking", title: "False Nine Ready for Football Club", sport: "Football (Soccer)", location: "Orange, NSW", distanceKm: 10, postedBy: "Zoe M", postedByType: "player", level: "Senior Youth", availability: "Tue/Thu", description: "Mobile forward looking for a technical club side.", needs: "False 9", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["False 9"] },
  { id: "seed-22", type: "players-wanted", title: "Football Club Needs Wide Midfielders", sport: "Football (Soccer)", location: "Lismore, NSW", distanceKm: 8, postedBy: "Lismore Lions", postedByType: "club", level: "Junior", availability: "Sat", description: "Junior sides need runners on the wings and in wide midfield.", needs: "Wide midfielders", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Wide Midfielder (LM/RM)"] },
  { id: "seed-23", type: "player-looking", title: "Centre Forward Looking for Club", sport: "Football (Soccer)", location: "Mildura, VIC", distanceKm: 14, postedBy: "Noah G", postedByType: "player", level: "Senior", availability: "Mon/Wed", description: "Strong target man ready for senior football.", needs: "Centre forward", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Centre Forward (CF)"] },
  { id: "seed-24", type: "players-wanted", title: "Football Club Recruiting Wingers", sport: "Football (Soccer)", location: "Dubbo, NSW", distanceKm: 18, postedBy: "Dubbo United", postedByType: "club", level: "Senior Youth", availability: "Tue/Thu", description: "Fast wide players wanted for our youth squad.", needs: "Wingers", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Winger (LW/RW)"] },
  { id: "seed-25", type: "player-looking", title: "Defensive Midfielder Seeking Club", sport: "Football (Soccer)", location: "Tamworth, NSW", distanceKm: 12, postedBy: "Ella P", postedByType: "player", level: "Intermediate", availability: "Evenings", description: "Strong tackler and distributor looking for a new team.", needs: "Defensive midfielder", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Defensive Midfielder (CDM)"] },
  { id: "seed-26", type: "players-wanted", title: "Football Club Trialing Full Backs", sport: "Football (Soccer)", location: "Sunshine Coast, QLD", distanceKm: 15, postedBy: "Suncoast FC", postedByType: "club", level: "Senior", availability: "Sat", description: "Trials open for reliable full backs and wing backs.", needs: "Full backs", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Full Back (LB/RB)", "Wing Back (LWB/RWB)"] },
  { id: "seed-27", type: "player-looking", title: "Winger Seeking Football Opportunity", sport: "Football (Soccer)", location: "Bunbury, WA", distanceKm: 9, postedBy: "Mason T", postedByType: "player", level: "Senior Youth", availability: "Tue/Sat", description: "Quick winger looking for a positive club environment.", needs: "Wing forward", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Winger (LW/RW)"] },
  { id: "seed-28", type: "players-wanted", title: "Football Team Needs Centre Backs", sport: "Football (Soccer)", location: "Coffs Harbour, NSW", distanceKm: 11, postedBy: "Coastal FC", postedByType: "club", level: "Intermediate", availability: "Mon/Thu", description: "Youth team needs strong defenders with good communication.", needs: "Centre backs", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Centre Back (CB)"] },
  { id: "seed-29", type: "player-looking", title: "Goalkeeper Ready for Football Trials", sport: "Football (Soccer)", location: "Maitland, NSW", distanceKm: 6, postedBy: "Grace D", postedByType: "player", level: "Junior", availability: "Weekends", description: "Young keeper looking for match practice and development.", needs: "Keeper", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Goalkeeper (GK)"] },
  { id: "seed-30", type: "players-wanted", title: "Football Club Seeking New Strikers", sport: "Football (Soccer)", location: "Hills District, NSW", distanceKm: 14, postedBy: "Hillside FC", postedByType: "club", level: "Senior", availability: "Wed/Fri", description: "Experienced finishing players wanted for senior team.", needs: "Strikers", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Striker (ST)", "Second Striker (SS)"] },
  { id: "seed-31", type: "player-looking", title: "Senior Youth Centre Midfielder", sport: "Football (Soccer)", location: "Moruya, NSW", distanceKm: 10, postedBy: "Jacob H", postedByType: "player", level: "Senior Youth", availability: "Mon/Thu", description: "Creative passer seeking a competitive football club.", needs: "Centre midfielder", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Central Midfielder (CM)"] },
  { id: "seed-32", type: "players-wanted", title: "Football Players Needed for Weekend Comp", sport: "Football (Soccer)", location: "Nowra, NSW", distanceKm: 13, postedBy: "South Coast FC", postedByType: "club", level: "Senior Youth", availability: "Sat/Sun", description: "Need committed players for weekend fixtures.", needs: "All positions", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["General Player"] },
  { id: "seed-33", type: "player-looking", title: "Full Back Seeking Football Club", sport: "Football (Soccer)", location: "Traralgon, VIC", distanceKm: 16, postedBy: "Sophie C", postedByType: "player", level: "Senior", availability: "Evenings", description: "Reliable defender ready to join a local club.", needs: "Full back", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Full Back (LB/RB)"] },
  { id: "seed-34", type: "players-wanted", title: "Football Club Trialing Goalkeepers", sport: "Football (Soccer)", location: "Port Macquarie, NSW", distanceKm: 7, postedBy: "Port FC", postedByType: "club", level: "Junior", availability: "Mon/Wed", description: "Junior keeper spots open for upcoming season.", needs: "Goalkeepers", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Goalkeeper (GK)"] },
  { id: "seed-35", type: "player-looking", title: "Attacking Midfield Football Prospect", sport: "Football (Soccer)", location: "Wagga Wagga, NSW", distanceKm: 21, postedBy: "Chloe B", postedByType: "player", level: "Intermediate", availability: "Tue/Thu", description: "Attacking midfielder keen to join a club with strong development.", needs: "CAM", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Attacking Midfielder (CAM)"] },
  { id: "seed-36", type: "players-wanted", title: "Football Club Wanting New Wing Backs", sport: "Football (Soccer)", location: "Launceston, TAS", distanceKm: 18, postedBy: "North Launceston FC", postedByType: "club", level: "Senior", availability: "Tue/Thu", description: "Athletic wing backs needed for senior squad.", needs: "Wing backs", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Wing Back (LWB/RWB)"] },
  { id: "seed-37", type: "player-looking", title: "Second Striker Seeking Club", sport: "Football (Soccer)", location: "Mount Gambier, SA", distanceKm: 8, postedBy: "Eli W", postedByType: "player", level: "Senior Youth", availability: "Wed/Sat", description: "Mobile forward seeking attacking opportunities.", needs: "Second striker", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Second Striker (SS)"] },
  { id: "seed-38", type: "players-wanted", title: "Football Trials for Box to Box Midfielders", sport: "Football (Soccer)", location: "Frankston, VIC", distanceKm: 9, postedBy: "Frankston City", postedByType: "club", level: "Intermediate", availability: "Mon/Sat", description: "Trials open for energetic central midfielders.", needs: "Midfielders", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Box-to-Box Midfielder"] },
  { id: "seed-39", type: "player-looking", title: "Young Defender Seeking Football Club", sport: "Football (Soccer)", location: "Bundaberg, QLD", distanceKm: 14, postedBy: "Aiden F", postedByType: "player", level: "Junior", availability: "After school", description: "Hard-working defender ready for a club environment.", needs: "Defender", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Centre Back (CB)"] },
  { id: "seed-40", type: "players-wanted", title: "Football Club Searching for Utilities", sport: "Football (Soccer)", location: "Moe, VIC", distanceKm: 19, postedBy: "Moe United", postedByType: "club", level: "Senior Youth", availability: "Thu/Sat", description: "All-round players wanted across midfield and attack.", needs: "Utility players", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Utility"] },
  { id: "seed-41", type: "player-looking", title: "Football Centre Back Seeking Club", sport: "Football (Soccer)", location: "Geraldton, WA", distanceKm: 17, postedBy: "Mia K", postedByType: "player", level: "Senior", availability: "Evenings", description: "Strong centre back looking for competitive local football.", needs: "Centre back", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Centre Back (CB)"] },
  { id: "seed-42", type: "players-wanted", title: "Football Club Trials For Young Forwards", sport: "Football (Soccer)", location: "Bathurst, NSW", distanceKm: 10, postedBy: "Bathurst Rovers", postedByType: "club", level: "Junior", availability: "Sat", description: "Looking for fast, enthusiastic young forwards.", needs: "Forwards", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Centre Forward (CF)"] },
  { id: "seed-43", type: "player-looking", title: "Wide Midfielder Seeking Football Club", sport: "Football (Soccer)", location: "Tamworth, NSW", distanceKm: 8, postedBy: "Ryan D", postedByType: "player", level: "Intermediate", availability: "Tue/Thu", description: "Wide player wanting to join a progressive club.", needs: "Wide midfielder", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Wide Midfielder (LM/RM)"] },
  { id: "seed-44", type: "players-wanted", title: "Football Club Seeking Second Strikers", sport: "Football (Soccer)", location: "Port Augusta, SA", distanceKm: 12, postedBy: "Augusta FC", postedByType: "club", level: "Senior", availability: "Wed/Fri", description: "Senior squad looking for flexible attackers.", needs: "Second strikers", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Second Striker (SS)"] },
  { id: "seed-45", type: "player-looking", title: "Senior Youth Winger Seeking Club", sport: "Football (Soccer)", location: "Armidale, NSW", distanceKm: 15, postedBy: "Lily N", postedByType: "player", level: "Senior Youth", availability: "Mon/Sat", description: "Fast winger ready to add width and pace.", needs: "Winger", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Winger (LW/RW)"] },
  { id: "seed-46", type: "players-wanted", title: "Football Club Wanting False Nines", sport: "Football (Soccer)", location: "Mudgee, NSW", distanceKm: 10, postedBy: "Mudgee United", postedByType: "club", level: "Intermediate", availability: "Tue/Thu", description: "Technical forwards wanted for a possession style.", needs: "False nine", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["False 9"] },
  { id: "seed-47", type: "player-looking", title: "Football Utility Player Seeking Club", sport: "Football (Soccer)", location: "Warrnambool, VIC", distanceKm: 13, postedBy: "Tom S", postedByType: "player", level: "Senior", availability: "Any time", description: "Versatile player happy anywhere across the pitch.", needs: "Utility", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Utility"] },
  { id: "seed-48", type: "players-wanted", title: "Football Club Seeking Box to Box Mids", sport: "Football (Soccer)", location: "Yass, NSW", distanceKm: 6, postedBy: "Yass FC", postedByType: "club", level: "Senior", availability: "Mon/Wed", description: "Energetic midfielders wanted for senior team.", needs: "Box to box midfielders", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Box-to-Box Midfielder"] },
  { id: "seed-49", type: "player-looking", title: "Junior Football Forward Seeking Club", sport: "Football (Soccer)", location: "Forster, NSW", distanceKm: 9, postedBy: "Jake R", postedByType: "player", level: "Junior", availability: "Weekends", description: "Young forward eager to join training and matches.", needs: "Forward", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Centre Forward (CF)"] },
  { id: "seed-50", type: "players-wanted", title: "Football Club Trialing Full Squad", sport: "Football (Soccer)", location: "Sorell, TAS", distanceKm: 11, postedBy: "Sorell Rovers", postedByType: "club", level: "Senior Youth", availability: "Sat", description: "Open squad trials for the new season.", needs: "All positions", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["General Player"] },
];

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
  { id: "seed-1", type: "players-wanted", title: "Ages 7 11 Football Players Wanted in NSW", sport: "Football (Soccer)", location: "Parramatta, NSW", distanceKm: 6, postedBy: "Westside United", postedByType: "club", level: "Junior", availability: "Tue/Thu", description: "Community club seeking committed junior players for the upcoming season.", needs: "Goalkeeper, defender, striker", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Goalkeeper (GK)", "Centre Back (CB)"] },
  { id: "seed-2", type: "player-looking", title: "Senior Midfielder Seeking Club in VIC", sport: "Football (Soccer)", location: "Geelong, VIC", distanceKm: 12, postedBy: "Ava M", postedByType: "player", level: "Senior", availability: "Mon/Wed", description: "Reliable midfielder looking for a competitive local club.", needs: "Midfielder", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Central Midfielder (CM)"] },
  { id: "seed-3", type: "players-wanted", title: "Youth Football Team Trials in QLD", sport: "Football (Soccer)", location: "Ipswich, QLD", distanceKm: 8, postedBy: "River City FC", postedByType: "club", level: "Intermediate", availability: "Sat", description: "Trials for youth squad spots ahead of winter comp.", needs: "All positions", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Goalkeeper (GK)", "Winger (LW/RW)"] },
  { id: "seed-4", type: "player-looking", title: "Junior Keeper Ready to Join Club", sport: "Football (Soccer)", location: "Blacktown, NSW", distanceKm: 5, postedBy: "Noah P", postedByType: "player", level: "Junior", availability: "Weekends", description: "Young keeper with strong hand skills and great attitude.", needs: "Goalkeeper", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Goalkeeper (GK)"] },
  { id: "seed-5", type: "coach-looking", title: "Coach Looking for Football Club in WA", sport: "Football (Soccer)", location: "Joondalup, WA", distanceKm: 15, postedBy: "Coach Sam", postedByType: "player", level: "Senior", availability: "Evenings", description: "Experienced coach available for junior or senior club roles.", needs: "Coaching role", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Coach"] },
  { id: "seed-6", type: "players-wanted", title: "Mini Football Players Wanted in SA", sport: "Football (Soccer)", location: "Adelaide, SA", distanceKm: 7, postedBy: "Southside Juniors", postedByType: "club", level: "Tiny Tots / Minis", availability: "Sat", description: "Friendly introduction program for first-time players.", needs: "Fun, safe beginners", createdAt: now(), ageGroup: "Tiny Tots / Minis (Ages 3–6)", positions: ["General Player"] },
  { id: "seed-7", type: "player-looking", title: "Attacking Mid Seeks Club in TAS", sport: "Football (Soccer)", location: "Hobart, TAS", distanceKm: 11, postedBy: "Liam T", postedByType: "player", level: "Senior Youth", availability: "Tue/Thu", description: "Creative attacker looking for a competitive team.", needs: "Attacking midfielder", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Attacking Midfielder (CAM)"] },
  { id: "seed-8", type: "players-wanted", title: "Football Youth Trials in ACT", sport: "Football (Soccer)", location: "Canberra, ACT", distanceKm: 9, postedBy: "Capital FC", postedByType: "club", level: "Senior Youth", availability: "Mon/Wed", description: "Open trials for senior youth and reserve teams.", needs: "Striker and defenders", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Striker (ST)", "Centre Back (CB)"] },
  { id: "seed-9", type: "player-looking", title: "Winger Wanting Local Football Club", sport: "Football (Soccer)", location: "Penrith, NSW", distanceKm: 18, postedBy: "Mia R", postedByType: "player", level: "Intermediate", availability: "Sat/Sun", description: "Fast wide player ready for a new challenge.", needs: "Winger", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Winger (LW/RW)"] },
  { id: "seed-10", type: "players-wanted", title: "Football Club Seeking Senior Players", sport: "Football (Soccer)", location: "Ballarat, VIC", distanceKm: 20, postedBy: "Ballarat Rovers", postedByType: "club", level: "Senior", availability: "Tue/Thu", description: "Senior men’s and women’s teams need fresh talent.", needs: "Multiple positions", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Full Back (LB/RB)", "Centre Midfielder (CM)"] },
  { id: "seed-11", type: "player-looking", title: "Defender Seeking Football Club in QLD", sport: "Football (Soccer)", location: "Cairns, QLD", distanceKm: 14, postedBy: "Ethan J", postedByType: "player", level: "Senior", availability: "Evenings", description: "Versatile defender looking to join a local side.", needs: "Centre back", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Centre Back (CB)"] },
  { id: "seed-12", type: "players-wanted", title: "Junior Football Team Needs Wingers", sport: "Football (Soccer)", location: "Wollongong, NSW", distanceKm: 10, postedBy: "Shoreline FC", postedByType: "club", level: "Junior", availability: "Mon/Thu", description: "Junior sides need runners on the wings and in wide midfield.", needs: "Wingers", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Winger (LW/RW)"] },
  { id: "seed-13", type: "player-looking", title: "Goalkeeper Seeking Football Club", sport: "Football (Soccer)", location: "Mackay, QLD", distanceKm: 9, postedBy: "Olivia S", postedByType: "player", level: "Intermediate", availability: "Tue/Fri", description: "Confident shot-stopper available for training and matches.", needs: "Goalkeeper", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Goalkeeper (GK)"] },
  { id: "seed-14", type: "players-wanted", title: "Football Club Seeking Full Backs", sport: "Football (Soccer)", location: "Bendigo, VIC", distanceKm: 16, postedBy: "Bendigo United", postedByType: "club", level: "Senior", availability: "Wed/Sat", description: "Recruiting disciplined full backs for winter season.", needs: "Full backs", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Full Back (LB/RB)"] },
  { id: "seed-15", type: "coach-looking", title: "Football Coach Seeking Junior Club", sport: "Football (Soccer)", location: "Townsville, QLD", distanceKm: 13, postedBy: "Coach Priya", postedByType: "player", level: "Senior", availability: "After 5pm", description: "Positive junior development coach seeking a local role.", needs: "Junior coaching", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Coach"] },
  { id: "seed-16", type: "players-wanted", title: "Football Trials for Intermediate Youth", sport: "Football (Soccer)", location: "Newcastle, NSW", distanceKm: 17, postedBy: "Harbour FC", postedByType: "club", level: "Intermediate", availability: "Tue/Sat", description: "Open trials for youth players across all positions.", needs: "Midfielders and forwards", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Central Midfielder (CM)", "Centre Forward (CF)"] },
  { id: "seed-17", type: "player-looking", title: "Striker Wants Football Club in NT", sport: "Football (Soccer)", location: "Darwin, NT", distanceKm: 7, postedBy: "Harper K", postedByType: "player", level: "Senior Youth", availability: "Mon/Wed/Sat", description: "Clinical finisher seeking a club with strong team culture.", needs: "Striker", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Striker (ST)"] },
  { id: "seed-18", type: "players-wanted", title: "Senior Football Team Looking for Keepers", sport: "Football (Soccer)", location: "Albury, NSW", distanceKm: 22, postedBy: "Northside Athletic", postedByType: "club", level: "Senior", availability: "Mon/Thu", description: "Senior squad needs a reliable goalkeeper for the season.", needs: "Goalkeeper", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Goalkeeper (GK)"] },
  { id: "seed-19", type: "player-looking", title: "Box to Box Midfielder Seeking Club", sport: "Football (Soccer)", location: "Rockhampton, QLD", distanceKm: 19, postedBy: "Jordan L", postedByType: "player", level: "Senior", availability: "Evenings and weekends", description: "High work-rate midfielder ready to join a competitive team.", needs: "Box-to-box midfielder", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Box-to-Box Midfielder"] },
  { id: "seed-20", type: "players-wanted", title: "Football Club Seeking Centre Mids", sport: "Football (Soccer)", location: "Toowoomba, QLD", distanceKm: 13, postedBy: "Toowoomba Rovers", postedByType: "club", level: "Intermediate", availability: "Wed/Sun", description: "Midfield reinforcements wanted for youth and reserve teams.", needs: "Centre midfielders", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Central Midfielder (CM)"] },
  { id: "seed-21", type: "player-looking", title: "False Nine Ready for Football Club", sport: "Football (Soccer)", location: "Orange, NSW", distanceKm: 10, postedBy: "Zoe M", postedByType: "player", level: "Senior Youth", availability: "Tue/Thu", description: "Mobile forward looking for a technical club side.", needs: "False 9", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["False 9"] },
  { id: "seed-22", type: "players-wanted", title: "Junior Football Team Needs Wide Midfielders", sport: "Football (Soccer)", location: "Lismore, NSW", distanceKm: 8, postedBy: "Lismore Lions", postedByType: "club", level: "Junior", availability: "Sat", description: "Junior squads looking for wide players with good energy.", needs: "Wide midfielders", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Wide Midfielder (LM/RM)"] },
  { id: "seed-23", type: "player-looking", title: "Centre Forward Looking for Club", sport: "Football (Soccer)", location: "Mildura, VIC", distanceKm: 14, postedBy: "Noah G", postedByType: "player", level: "Senior", availability: "Mon/Wed", description: "Strong target man ready for senior football.", needs: "Centre forward", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Centre Forward (CF)"] },
  { id: "seed-24", type: "players-wanted", title: "Football Club Recruiting Wingers", sport: "Football (Soccer)", location: "Dubbo, NSW", distanceKm: 18, postedBy: "Dubbo United", postedByType: "club", level: "Senior Youth", availability: "Tue/Thu", description: "Fast wide players wanted for our youth squad.", needs: "Wingers", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Winger (LW/RW)"] },
  { id: "seed-25", type: "player-looking", title: "Defensive Midfielder Seeking Club", sport: "Football (Soccer)", location: "Tamworth, NSW", distanceKm: 12, postedBy: "Ella P", postedByType: "player", level: "Intermediate", availability: "Evenings", description: "Strong tackler and distributor looking for a new team.", needs: "Defensive midfielder", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Defensive Midfielder (CDM)"] },
  { id: "seed-26", type: "players-wanted", title: "Football Club Trialing Full Backs", sport: "Football (Soccer)", location: "Sunshine Coast, QLD", distanceKm: 15, postedBy: "Suncoast FC", postedByType: "club", level: "Senior", availability: "Sat", description: "Trials open for reliable full backs and wing backs.", needs: "Full backs", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Full Back (LB/RB)", "Wing Back (LWB/RWB)"] },
  { id: "seed-27", type: "player-looking", title: "Winger Seeking Football Opportunity", sport: "Football (Soccer)", location: "Bunbury, WA", distanceKm: 9, postedBy: "Mason T", postedByType: "player", level: "Senior Youth", availability: "Tue/Sat", description: "Quick winger looking for a positive club environment.", needs: "Wing forward", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Winger (LW/RW)"] },
  { id: "seed-28", type: "players-wanted", title: "Football Team Needs Centre Backs", sport: "Football (Soccer)", location: "Coffs Harbour, NSW", distanceKm: 11, postedBy: "Coastal FC", postedByType: "club", level: "Intermediate", availability: "Mon/Thu", description: "Youth team needs strong defenders with good communication.", needs: "Centre backs", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Centre Back (CB)"] },
  { id: "seed-29", type: "player-looking", title: "Goalkeeper Ready for Football Trials", sport: "Football (Soccer)", location: "Maitland, NSW", distanceKm: 6, postedBy: "Grace D", postedByType: "player", level: "Junior", availability: "Weekends", description: "Young keeper looking for match practice and development.", needs: "Keeper", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Goalkeeper (GK)"] },
  { id: "seed-30", type: "players-wanted", title: "Football Club Seeking New Strikers", sport: "Football (Soccer)", location: "Hills District, NSW", distanceKm: 14, postedBy: "Hillside FC", postedByType: "club", level: "Senior", availability: "Wed/Fri", description: "Experienced finishing players wanted for senior team.", needs: "Strikers", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Striker (ST)", "Second Striker (SS)"] },
  { id: "seed-31", type: "player-looking", title: "Senior Youth Centre Midfielder", sport: "Football (Soccer)", location: "Moruya, NSW", distanceKm: 10, postedBy: "Jacob H", postedByType: "player", level: "Senior Youth", availability: "Mon/Thu", description: "Creative passer seeking a competitive football club.", needs: "Centre midfielder", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Central Midfielder (CM)"] },
  { id: "seed-32", type: "players-wanted", title: "Football Players Needed for Weekend Comp", sport: "Football (Soccer)", location: "Nowra, NSW", distanceKm: 13, postedBy: "South Coast FC", postedByType: "club", level: "Senior Youth", availability: "Sat/Sun", description: "Need committed players for weekend fixtures.", needs: "All positions", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["General Player"] },
  { id: "seed-33", type: "player-looking", title: "Full Back Seeking Football Club", sport: "Football (Soccer)", location: "Traralgon, VIC", distanceKm: 16, postedBy: "Sophie C", postedByType: "player", level: "Senior", availability: "Evenings", description: "Reliable defender ready to join a local club.", needs: "Full back", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Full Back (LB/RB)"] },
  { id: "seed-34", type: "players-wanted", title: "Football Club Trialing Goalkeepers", sport: "Football (Soccer)", location: "Port Macquarie, NSW", distanceKm: 7, postedBy: "Port FC", postedByType: "club", level: "Junior", availability: "Mon/Wed", description: "Junior keeper spots open for upcoming season.", needs: "Goalkeepers", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Goalkeeper (GK)"] },
  { id: "seed-35", type: "player-looking", title: "Attacking Midfield Football Prospect", sport: "Football (Soccer)", location: "Wagga Wagga, NSW", distanceKm: 21, postedBy: "Chloe B", postedByType: "player", level: "Intermediate", availability: "Tue/Thu", description: "Attacking midfielder keen to join a club with strong development.", needs: "CAM", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Attacking Midfielder (CAM)"] },
  { id: "seed-36", type: "players-wanted", title: "Football Club Wanting New Wing Backs", sport: "Football (Soccer)", location: "Launceston, TAS", distanceKm: 18, postedBy: "North Launceston FC", postedByType: "club", level: "Senior", availability: "Tue/Thu", description: "Athletic wing backs needed for senior squad.", needs: "Wing backs", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Wing Back (LWB/RWB)"] },
  { id: "seed-37", type: "player-looking", title: "Second Striker Seeking Club", sport: "Football (Soccer)", location: "Mount Gambier, SA", distanceKm: 8, postedBy: "Eli W", postedByType: "player", level: "Senior Youth", availability: "Wed/Sat", description: "Mobile forward seeking attacking opportunities.", needs: "Second striker", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Second Striker (SS)"] },
  { id: "seed-38", type: "players-wanted", title: "Football Trials for Box to Box Midfielders", sport: "Football (Soccer)", location: "Frankston, VIC", distanceKm: 9, postedBy: "Frankston City", postedByType: "club", level: "Intermediate", availability: "Mon/Sat", description: "Trials open for energetic central midfielders.", needs: "Midfielders", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Box-to-Box Midfielder"] },
  { id: "seed-39", type: "player-looking", title: "Young Defender Seeking Football Club", sport: "Football (Soccer)", location: "Bundaberg, QLD", distanceKm: 14, postedBy: "Aiden F", postedByType: "player", level: "Junior", availability: "After school", description: "Hard-working defender ready for a club environment.", needs: "Defender", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Centre Back (CB)"] },
  { id: "seed-40", type: "players-wanted", title: "Football Club Searching for Utilities", sport: "Football (Soccer)", location: "Moe, VIC", distanceKm: 19, postedBy: "Moe United", postedByType: "club", level: "Senior Youth", availability: "Thu/Sat", description: "All-round players wanted across midfield and attack.", needs: "Utility players", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Utility"] },
  { id: "seed-41", type: "player-looking", title: "Football Centre Back Seeking Club", sport: "Football (Soccer)", location: "Geraldton, WA", distanceKm: 17, postedBy: "Mia K", postedByType: "player", level: "Senior", availability: "Evenings", description: "Strong centre back looking for competitive local football.", needs: "Centre back", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Centre Back (CB)"] },
  { id: "seed-42", type: "players-wanted", title: "Football Club Trials For Young Forwards", sport: "Football (Soccer)", location: "Bathurst, NSW", distanceKm: 10, postedBy: "Bathurst Rovers", postedByType: "club", level: "Junior", availability: "Sat", description: "Looking for fast, enthusiastic young forwards.", needs: "Forwards", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Centre Forward (CF)"] },
  { id: "seed-43", type: "player-looking", title: "Wide Midfielder Seeking Football Club", sport: "Football (Soccer)", location: "Tamworth, NSW", distanceKm: 8, postedBy: "Ryan D", postedByType: "player", level: "Intermediate", availability: "Tue/Thu", description: "Wide player wanting to join a progressive club.", needs: "Wide midfielder", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["Wide Midfielder (LM/RM)"] },
  { id: "seed-44", type: "players-wanted", title: "Football Club Seeking Second Strikers", sport: "Football (Soccer)", location: "Port Augusta, SA", distanceKm: 12, postedBy: "Augusta FC", postedByType: "club", level: "Senior", availability: "Wed/Fri", description: "Senior squad looking for flexible attackers.", needs: "Second strikers", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Second Striker (SS)"] },
  { id: "seed-45", type: "player-looking", title: "Senior Youth Winger Seeking Club", sport: "Football (Soccer)", location: "Armidale, NSW", distanceKm: 15, postedBy: "Lily N", postedByType: "player", level: "Senior Youth", availability: "Mon/Sat", description: "Fast winger ready to add width and pace.", needs: "Winger", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["Winger (LW/RW)"] },
  { id: "seed-46", type: "players-wanted", title: "Football Club Wanting False Nines", sport: "Football (Soccer)", location: "Mudgee, NSW", distanceKm: 10, postedBy: "Mudgee United", postedByType: "club", level: "Intermediate", availability: "Tue/Thu", description: "Technical forwards wanted for a possession style.", needs: "False nine", createdAt: now(), ageGroup: "Intermediate / Youth (Ages 12–15)", positions: ["False 9"] },
  { id: "seed-47", type: "player-looking", title: "Football Utility Player Seeking Club", sport: "Football (Soccer)", location: "Warrnambool, VIC", distanceKm: 13, postedBy: "Tom S", postedByType: "player", level: "Senior", availability: "Any time", description: "Versatile player happy anywhere across the pitch.", needs: "Utility", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Utility"] },
  { id: "seed-48", type: "players-wanted", title: "Football Club Seeking Box to Box Mids", sport: "Football (Soccer)", location: "Yass, NSW", distanceKm: 6, postedBy: "Yass FC", postedByType: "club", level: "Senior", availability: "Mon/Wed", description: "Energetic midfielders wanted for senior team.", needs: "Box to box midfielders", createdAt: now(), ageGroup: "Senior (Ages 21+)", positions: ["Box-to-Box Midfielder"] },
  { id: "seed-49", type: "player-looking", title: "Junior Football Forward Seeking Club", sport: "Football (Soccer)", location: "Forster, NSW", distanceKm: 9, postedBy: "Jake R", postedByType: "player", level: "Junior", availability: "Weekends", description: "Young forward eager to join training and matches.", needs: "Forward", createdAt: now(), ageGroup: "Junior (Ages 7–11)", positions: ["Centre Forward (CF)"] },
  { id: "seed-50", type: "players-wanted", title: "Football Club Trialing Full Squad", sport: "Football (Soccer)", location: "Sorell, TAS", distanceKm: 11, postedBy: "Sorell Rovers", postedByType: "club", level: "Senior Youth", availability: "Sat", description: "Open squad trials for the new season.", needs: "All positions", createdAt: now(), ageGroup: "Senior Youth (Ages 16–20)", positions: ["General Player"] },
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
      setAdverts(parsed.adverts ?? defaultState.adverts);
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
