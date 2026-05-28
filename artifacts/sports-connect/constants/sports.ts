export type SportTheme = {
  name: string;
  background: string;
  soft: string;
  primary: string;
  button: string;
  text: string;
  enabled: boolean;
  positions: string[];
};

export const defaultSportThemes: SportTheme[] = [
  {
    name: "Football (Soccer)",
    background: "#E8F4FF", soft: "#CFE8FF", primary: "#0B63CE", button: "#0B63CE", text: "#08233F",
    enabled: true,
    positions: [
      "Goalkeeper (GK)", "Centre Back (CB)", "Full Back (LB/RB)", "Wing Back (LWB/RWB)", "Sweeper",
      "Defensive Midfielder (CDM)", "Central Midfielder (CM)", "Attacking Midfielder (CAM)",
      "Wide Midfielder (LM/RM)", "Winger (LW/RW)", "Box-to-Box Midfielder",
      "Striker (ST)", "Centre Forward (CF)", "Second Striker (SS)", "False 9",
    ],
  },
  {
    name: "Futsal (Indoor Soccer)",
    background: "#F0F7FF", soft: "#D7EBFF", primary: "#006A8E", button: "#006A8E", text: "#063445",
    enabled: true,
    positions: ["Goalkeeper", "Defender (Fixo)", "Winger (Ala)", "Pivot"],
  },
  {
    name: "Aussie Rules Football",
    background: "#FFF0EA", soft: "#FFD7C7", primary: "#C53222", button: "#C53222", text: "#47120D",
    enabled: true,
    positions: [
      "Full Forward", "Forward Pocket", "Centre Half Forward", "Half Forward Flank", "Wing",
      "Centre", "Half Back Flank", "Centre Half Back", "Full Back", "Back Pocket",
      "Ruck", "Ruck Rover", "Rover", "Interchange / Bench",
    ],
  },
  {
    name: "Rugby League",
    background: "#EAF7EF", soft: "#CDEBD7", primary: "#08743C", button: "#08743C", text: "#06351D",
    enabled: true,
    positions: [
      "Fullback", "Wing", "Centre", "Five-Eighth", "Halfback",
      "Prop", "Hooker", "Second Row", "Lock Forward",
    ],
  },
  {
    name: "Rugby Union",
    background: "#EEF4E6", soft: "#D7E7BF", primary: "#4C7F1F", button: "#4C7F1F", text: "#24370F",
    enabled: true,
    positions: [
      "Fullback", "Wing", "Centre", "Fly-half", "Scrum-half",
      "Loosehead Prop", "Tighthead Prop", "Hooker", "Lock",
      "Blindside Flanker", "Openside Flanker", "Number 8",
    ],
  },
  {
    name: "Touch Rugby",
    background: "#F4F0FF", soft: "#E1D7FF", primary: "#6545B8", button: "#6545B8", text: "#281D4A",
    enabled: true,
    positions: ["Middle", "Link", "Wing"],
  },
  {
    name: "Cricket",
    background: "#FFF7DE", soft: "#FFE7A6", primary: "#B87400", button: "#B87400", text: "#3E2900",
    enabled: true,
    positions: [
      "Opening Batter", "Top Order Batter", "Middle Order Batter", "Lower Order / Tailender",
      "Wicketkeeper", "All-rounder", "Fast Bowler", "Medium Bowler", "Spin Bowler",
      "Slip", "Gully", "Point", "Cover", "Mid-off", "Mid-on", "Square Leg", "Fine Leg",
    ],
  },
  {
    name: "Indoor Cricket",
    background: "#FFF3E8", soft: "#FFDCC0", primary: "#D45B16", button: "#D45B16", text: "#4A1E06",
    enabled: true,
    positions: ["Wicketkeeper", "Bowler", "Batter", "Zone A", "Zone B", "Zone C", "Zone D"],
  },
  {
    name: "Basketball",
    background: "#FFF0E4", soft: "#FFD3B3", primary: "#D85C13", button: "#D85C13", text: "#4B1B04",
    enabled: true,
    positions: ["Point Guard (PG)", "Shooting Guard (SG)", "Small Forward (SF)", "Power Forward (PF)", "Centre (C)"],
  },
  {
    name: "Netball",
    background: "#FFEAF5", soft: "#FFD1EA", primary: "#C12572", button: "#C12572", text: "#4A0D29",
    enabled: true,
    positions: [
      "Goal Shooter (GS)", "Goal Attack (GA)", "Wing Attack (WA)", "Centre (C)",
      "Wing Defence (WD)", "Goal Defence (GD)", "Goal Keeper (GK)",
    ],
  },
  {
    name: "Volleyball",
    background: "#EAFBFA", soft: "#C9F1EF", primary: "#00877D", button: "#00877D", text: "#063B37",
    enabled: true,
    positions: [
      "Setter", "Outside Hitter (Left-side)", "Opposite Hitter (Right-side)",
      "Middle Blocker", "Libero", "Defensive Specialist",
    ],
  },
];

export const allSportsFilterName = "All Sports";

export function getSportTheme(sportName: string, approvedSports: SportTheme[]) {
  return approvedSports.find((sport) => sport.name === sportName) ?? defaultSportThemes[0];
}

export function createCustomSportTheme(name: string): SportTheme {
  return {
    name,
    background: "#F1F0E8",
    soft: "#E0DDC8",
    primary: "#41513B",
    button: "#41513B",
    text: "#20261E",
    enabled: true,
    positions: [],
  };
}
