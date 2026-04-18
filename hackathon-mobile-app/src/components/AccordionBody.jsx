import React from "react";
import { View } from "react-native";

export default function AccordionBody({ open, style, children }) {
  if (!open) {
    return null;
  }

  return <View style={style}>{children}</View>;
}
