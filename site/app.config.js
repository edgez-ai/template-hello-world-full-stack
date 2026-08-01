const name = process.env.APP_NAME;
const domainSuffix = process.env.DOMAIN_SUFFIX;
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || "2000");

if (!name || !domainSuffix) {
  throw new Error("APP_NAME and DOMAIN_SUFFIX must be exported before starting Expo");
}

module.exports = {
  expo: {
    name: `${name} web`,
    slug: `${name}-web`,
    version: "1.0.0",
    orientation: "default",
    userInterfaceStyle: "light",
    web: { bundler: "metro" },
    extra: {
      functionUrl: `https://${name}.functions.${domainSuffix}`,
      pollIntervalMs,
    },
  },
};
