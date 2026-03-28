import { Redirect } from 'expo-router';

/** Legacy route: phone sign-in lives on the unified sign-in screen. */
export default function PhoneRedirect() {
  return <Redirect href="/(auth)/sign-in" />;
}
