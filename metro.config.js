// Sentry: Debug ID для бандлів і source maps. https://docs.sentry.io/platforms/react-native/guides/expo/sourcemaps/
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
