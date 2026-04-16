import { AccountRole } from "@/context/SportsConnectContext";
import { ImageSource } from "expo-image";

const avatars = {
  club: require("@/assets/images/avatars/club.png"),
  player_male: require("@/assets/images/avatars/player_male.png"),
  player_female: require("@/assets/images/avatars/player_female.png"),
  coach_male: require("@/assets/images/avatars/coach_male.png"),
  coach_female: require("@/assets/images/avatars/coach_female.png"),
  guardian_male: require("@/assets/images/avatars/guardian_male.png"),
  guardian_female: require("@/assets/images/avatars/guardian_female.png"),
  fallback: require("@/assets/images/icon.png"),
} as const;

export function getDefaultAvatar(role: AccountRole, gender?: string): ImageSource {
  if (role === "club") return avatars.club;
  const g = (gender ?? "").toLowerCase();
  const isMale = g === "male";
  const isFemale = g === "female";
  if (role === "player") return isMale ? avatars.player_male : isFemale ? avatars.player_female : avatars.fallback;
  if (role === "coach") return isMale ? avatars.coach_male : isFemale ? avatars.coach_female : avatars.fallback;
  if (role === "guardian") return isMale ? avatars.guardian_male : isFemale ? avatars.guardian_female : avatars.fallback;
  return avatars.fallback;
}
