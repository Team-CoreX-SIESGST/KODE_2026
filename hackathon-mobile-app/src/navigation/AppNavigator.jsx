import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import ChatScreen from "../screens/ChatScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SplashScreen from "../screens/SplashScreen";
import RoleSelectionScreen from "../screens/RoleSelectionScreen";
import AuthChoiceScreen from "../screens/AuthChoiceScreen";
import AuthFormScreen from "../screens/AuthFormScreen";
import PatientDashboardMock from "../screens/PatientDashboardMock.jsx";
import ConsultantDashboardMock from "../screens/ConsultantDashboardMock";
import DoctorProfilePage from "../screens/DoctorProfilePage";
import PatientProfilePage from "../screens/PatientProfilePage";
import AbhaSevakProfile from "../screens/AbhaSevakProfile";
import PatientConsultScreen from "../screens/PatientConsultScreen";
import MedicineAvailabilityScreen from "../screens/MedicineAvailabilityScreen";
import MedicineRecordsScreen from "../screens/MedicineRecordsScreen";
import HealthRecordsScreen from "../screens/HealthRecordsScreen";
import DoctorAppointmentsScreen from "../screens/DoctorAppointmentsScreen";
import CallScreen from "../screens/CallScreen";
import DoctorNotificationsScreen from "../screens/DoctorNotificationsScreen";
import DoctorPastPatientsScreen from "../screens/DoctorPastPatientsScreen";
import VideoCallScreen from "../screens/VideoCallScreen";
import VapiCallScreen from "../screens/VapiCallScreen";
import IncomingCallListener from "../components/IncomingCallListener";

const Stack = createNativeStackNavigator();
const navigationRef = React.createRef();

export default function AppNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <IncomingCallListener navigationRef={navigationRef} />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          animation: "fade_from_bottom",
          contentStyle: { backgroundColor: "#F9F5EC" },
        }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RoleSelection"
          component={RoleSelectionScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AuthChoice"
          component={AuthChoiceScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AuthForm"
          component={AuthFormScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen
          name="PatientDashboardMock"
          component={PatientDashboardMock}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PatientProfile"
          component={PatientProfilePage}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ConsultantDashboardMock"
          component={ConsultantDashboardMock}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DoctorProfile"
          component={DoctorProfilePage}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AbhaSevakProfile"
          component={AbhaSevakProfile}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PatientConsult"
          component={PatientConsultScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MedicineAvailability"
          component={MedicineAvailabilityScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MedicineRecords"
          component={MedicineRecordsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HealthRecords"
          component={HealthRecordsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DoctorAppointments"
          component={DoctorAppointmentsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CallScreen"
          component={CallScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VapiCall"
          component={VapiCallScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DoctorNotifications"
          component={DoctorNotificationsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DoctorPastPatients"
          component={DoctorPastPatientsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VideoCall"
          component={VideoCallScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
