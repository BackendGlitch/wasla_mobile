/* eslint-env node */
/**
 * Merges with `app.json`. Set EXPO_PUBLIC_ALLOW_INSECURE_HTTP=true for dev HTTP backends (ATS).
 */
module.exports = ({ config }) => {
  const allowInsecureHttp = process.env.EXPO_PUBLIC_ALLOW_INSECURE_HTTP === 'true';

  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...(config.ios?.infoPlist ?? {}),
        ...(allowInsecureHttp
          ? { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } }
          : {}),
      },
    },
  };
};
