export type SportTheme = {
  name: string;
  background: string;
  soft: string;
  primary: string;
  button: string;
  text: string;
};

export const defaultSportThemes: SportTheme[] = [
  { name: "Football (Soccer)", background: "#E8F4FF", soft: "#CFE8FF", primary: "#0B63CE", button: "#0B63CE", text: "#08233F" },
  { name: "Futsal (Indoor Soccer)", background: "#F0F7FF", soft: "#D7EBFF", primary: "#006A8E", button: "#006A8E", text: "#063445" },
  { name: "Aussie Rules Football", background: "#FFF0EA", soft: "#FFD7C7", primary: "#C53222", button: "#C53222", text: "#47120D" },
  { name: "Rugby League", background: "#EAF7EF", soft: "#CDEBD7", primary: "#08743C", button: "#08743C", text: "#06351D" },
  { name: "Rugby Union", background: "#EEF4E6", soft: "#D7E7BF", primary: "#4C7F1F", button: "#4C7F1F", text: "#24370F" },
  { name: "Touch Rugby", background: "#F4F0FF", soft: "#E1D7FF", primary: "#6545B8", button: "#6545B8", text: "#281D4A" },
  { name: "Cricket", background: "#FFF7DE", soft: "#FFE7A6", primary: "#B87400", button: "#B87400", text: "#3E2900" },
  { name: "Indoor Cricket", background: "#FFF3E8", soft: "#FFDCC0", primary: "#D45B16", button: "#D45B16", text: "#4A1E06" },
  { name: "Basketball", background: "#FFF0E4", soft: "#FFD3B3", primary: "#D85C13", button: "#D85C13", text: "#4B1B04" },
  { name: "Netball", background: "#FFEAF5", soft: "#FFD1EA", primary: "#C12572", button: "#C12572", text: "#4A0D29" },
  { name: "Volleyball", background: "#EAFBFA", soft: "#C9F1EF", primary: "#00877D", button: "#00877D", text: "#063B37" },
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
  };
}