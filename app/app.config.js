const name = process.env.APP_NAME;
const domainSuffix = process.env.DOMAIN_SUFFIX;
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || "2000");

if (!name || !domainSuffix) {
  throw new Error("APP_NAME and DOMAIN_SUFFIX must be exported before starting Expo");
}
const bundlePrefix = domainSuffix.split(".").reverse().join(".");

module.exports = {
  expo: {
    name,
    slug: name,
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
      bundleIdentifier: `${bundlePrefix}.${name}`,
    },
    android: {
      package: `${bundlePrefix}.${name}`,
    },
    extra: {
      functionUrl: `https://${name}.functions.${domainSuffix}`,
      pollIntervalMs,
    },
  },
};
