const name = process.env.APP_NAME;
const projectName = process.env.APPWRITE_PROJECT_NAME;
const domainSuffix = process.env.DOMAIN_SUFFIX;
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || "2000");

if (!name || !projectName || !domainSuffix) {
  throw new Error("APP_NAME, APPWRITE_PROJECT_NAME, and DOMAIN_SUFFIX must be exported before starting Expo");
}
const bundlePrefix = domainSuffix.split(".").reverse().join(".");
const domainPrefix = `${projectName}-${name}`;
const androidName = name.replace(/[^A-Za-z0-9_]/g, "_").replace(/^[^A-Za-z_]+/, "app");

module.exports = {
  expo: {
    name,
    slug: name,
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    android: {
      package: `${bundlePrefix}.${androidName}`,
    },
    extra: {
      functionUrl: `https://${domainPrefix}.functions.${domainSuffix}`,
      pollIntervalMs,
    },
  },
};
