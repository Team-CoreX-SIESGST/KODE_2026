import React from "react";
import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text, TextInput } from "react-native";
import { FONT_FAMILY } from "./src/theme/typography";
import "./src/i18n";

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [Text.defaultProps.style, { fontFamily: FONT_FAMILY }];

TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [TextInput.defaultProps.style, { fontFamily: FONT_FAMILY }];

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
