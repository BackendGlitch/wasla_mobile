import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLogo } from '../../src/components/BrandLogo';

export default function AuthWelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: Math.max(insets.top, 20) + 48, paddingBottom: Math.max(insets.bottom, 20) + 28 }]}>
      <StatusBar style="light" />
      <View style={s.glow} pointerEvents="none" />

      <View style={s.hero}>
        <View style={s.logoBox}>
          <BrandLogo size={80} borderRadius={22} />
        </View>
        <View style={s.divider} />
        <Text style={s.title}>WASLA</Text>
        <Text style={s.subtitle}>Shared rides across Tunisia</Text>
      </View>

      <View style={{ flex: 1, minHeight: 40 }} />

      <View style={s.buttons}>
        <Pressable onPress={() => router.push('/(auth)/sign-up')} style={({ pressed }) => [s.btn, s.primary, pressed && { opacity: 0.85 }]}>
          <MaterialCommunityIcons name="account-plus" size={20} color="#0A0F19" />
          <Text style={s.btnTextPrimary}>Create account</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/(auth)/sign-in')} style={({ pressed }) => [s.btn, s.outline, pressed && { opacity: 0.7 }]}>
          <MaterialCommunityIcons name="login" size={20} color="#F0F4FF" />
          <Text style={s.btnTextOutline}>Sign in</Text>
        </Pressable>
      </View>

      <Text style={s.legal}>
        By continuing you agree to{' '}
        <Text style={s.link} onPress={() => router.push('/(auth)/terms')}>Terms</Text>
        {' '}and{' '}
        <Text style={s.link} onPress={() => router.push('/(auth)/privacy')}>Privacy</Text>
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060B14', paddingHorizontal: 24 },
  glow: { position: 'absolute', top: -120, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(212,168,83,0.04)' },
  hero: { alignItems: 'center', marginTop: 32 },
  logoBox: { width: 120, height: 120, borderRadius: 30, backgroundColor: '#0D1525', borderWidth: 1, borderColor: 'rgba(212,168,83,0.12)', alignItems: 'center', justifyContent: 'center' },
  divider: { width: 32, height: 3, borderRadius: 2, backgroundColor: '#D4A853', marginTop: 24 },
  title: { color: '#F0F4FF', fontSize: 26, fontWeight: '800', letterSpacing: 2, marginTop: 16 },
  subtitle: { color: '#8899B4', fontSize: 13, marginTop: 6 },
  buttons: { gap: 12, width: '100%', alignSelf: 'center', marginBottom: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 8 },
  primary: { backgroundColor: '#D4A853' },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  btnTextPrimary: { color: '#0A0F19', fontSize: 15, fontWeight: '700' },
  btnTextOutline: { color: '#F0F4FF', fontSize: 15, fontWeight: '700' },
  legal: { color: '#556580', fontSize: 11, textAlign: 'center', paddingTop: 8 },
  link: { color: '#D4A853', fontWeight: '600' },
});
