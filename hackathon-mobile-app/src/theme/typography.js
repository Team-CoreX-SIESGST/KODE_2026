import { Platform } from "react-native";

export const FONT_FAMILY = Platform.select({
  ios: "Avenir Next",
  android: "sans-serif-medium",
  default: "System",
});

export const fontStyles = {
  display: {
    fontFamily: FONT_FAMILY,
    fontWeight: Platform.OS === "android" ? "700" : "800",
    letterSpacing: 0.3,
  },
  heading: {
    fontFamily: FONT_FAMILY,
    fontWeight: Platform.OS === "android" ? "600" : "700",
    letterSpacing: 0.15,
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontWeight: "400",
  },
  medium: {
    fontFamily: FONT_FAMILY,
    fontWeight: "500",
  },
  semibold: {
    fontFamily: FONT_FAMILY,
    fontWeight: "600",
  },
  bold: {
    fontFamily: FONT_FAMILY,
    fontWeight: "700",
  },
};

