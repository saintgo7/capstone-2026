import { ExpoConfig } from 'expo/config';

const APP_ENV = process.env.APP_ENV ?? 'development';
const API_URL = process.env.API_URL ?? 'http://localhost:3000';

const appName =
  APP_ENV === 'production'
    ? 'abada 쇼핑몰'
    : `abada (${APP_ENV})`;

const config: ExpoConfig = {
  name: appName,
  slug: 'abada-shop',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'abada',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'kr.abada.shop',
    buildNumber: '1',
    infoPlist: {
      NSCameraUsageDescription: '상품 리뷰 사진 업로드에 사용됩니다.',
      NSPhotoLibraryUsageDescription: '프로필 사진 및 리뷰 사진 업로드에 사용됩니다.',
      NSPhotoLibraryAddUsageDescription: '사진 저장에 사용됩니다.',
    },
    googleServicesFile: './GoogleService-Info.plist',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'kr.abada.shop',
    versionCode: 1,
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE'],
    googleServicesFile: './google-services.json',
  },
  web: {
    bundler: 'metro',
    output: 'standalone',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#000000',
        sounds: [],
        androidMode: 'default',
        androidCollapsedTitle: 'abada 쇼핑몰',
        iosDisplayInForeground: true,
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: '상품 리뷰 사진 촬영에 사용됩니다.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: API_URL,
    appEnv: APP_ENV,
    eas: {
      projectId: 'YOUR_EAS_PROJECT_ID',
    },
  },
  updates: {
    url: 'https://u.expo.dev/YOUR_EAS_PROJECT_ID',
    enabled: APP_ENV === 'production',
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 5000,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
};

export default config;
