import { Image } from 'react-native';

const LOGO = require('../../assets/img.png');

type BrandLogoProps = {
  size: number;
  /** Outer radius; defaults to ~22% of size to match rounded-square app icon. */
  borderRadius?: number;
};

export function BrandLogo({ size, borderRadius }: BrandLogoProps) {
  const r = borderRadius ?? Math.max(6, Math.round(size * 0.22));
  return (
    <Image
      source={LOGO}
      accessibilityLabel="Wasla"
      accessibilityRole="image"
      style={{ width: size, height: size, borderRadius: r }}
      resizeMode="contain"
    />
  );
}
