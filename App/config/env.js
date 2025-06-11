import {Platform} from 'react-native';
import {Alert} from 'react-native';

// Environment types
const ENV_TYPES = {
  DEV: 'dev',
  PROD: 'prod',
};

// Get local IP address for physical devices
const getLocalIP = () => {
  // You can replace this with your actual local IP address
  // For example: '192.168.1.100'
  return '192.168.1.100'; // Replace with your actual local IP
};

// Get the appropriate base URL based on platform
export const getBaseUrl = () => {
  const currentEnv = getEnvironment();
  if (currentEnv === ENV_TYPES.PROD) {
    return BASE_URLS[ENV_TYPES.PROD];
  }

  // For development environment
  if (Platform.OS === 'android') {
    // For Android emulator
    return 'http://10.0.2.2:8000';
  } else if (Platform.OS === 'ios') {
    // For iOS simulator
    return 'http://localhost:8000';
  }
  // Default fallback
  return 'http://localhost:8000';
};

// Environment detection
const getEnvironment = () => {
  // You can change this based on your needs
  // For example, you could use __DEV__ from React Native
  // or a custom environment variable
  return __DEV__ ? ENV_TYPES.DEV : ENV_TYPES.PROD;
};

// Base URLs for different environments
const BASE_URLS = {
  [ENV_TYPES.DEV]: Platform.select({
    ios:
      Platform.isPad || Platform.isTV
        ? `http://${getLocalIP()}:8000` // For iPad/Apple TV
        : 'http://localhost:8000', // For iPhone
    android: Platform.isTV
      ? `http://${getLocalIP()}:8000` // For Android TV
      : 'http://10.0.2.2:8000', // For Android phone/tablet
  }),
  [ENV_TYPES.PROD]: 'https://pythonbackend-production-0ee2.up.railway.app',
};

// API Versions
const API_VERSIONS = {
  [ENV_TYPES.DEV]: 'v1',
  [ENV_TYPES.PROD]: 'v1',
};

// API Endpoints
const API_ENDPOINTS = {
  [ENV_TYPES.DEV]: {
    LOGIN: '/api/v1/users/login',
    // Add other endpoints here
  },
  [ENV_TYPES.PROD]: {
    LOGIN: '/api/v1/users/login',
    // Add other endpoints here
  },
};

// Environment configurations
const ENV = {
  [ENV_TYPES.DEV]: {
    API_URL: 'http://localhost:8000/api/v1', // Updated to include /api/v1
    BASE_URL: BASE_URLS[ENV_TYPES.DEV],
    ENV_TYPE: ENV_TYPES.DEV,
    DEBUG: true,
    ENDPOINTS: {
      LOGIN: '/users/login', // Updated to be relative to /api/v1
      // Add other endpoints here
    },
    // Add other development-specific variables here
  },
  [ENV_TYPES.PROD]: {
    API_URL: `${BASE_URLS[ENV_TYPES.PROD]}/api/v1`, // Updated to include /api/v1
    BASE_URL: BASE_URLS[ENV_TYPES.PROD],
    ENV_TYPE: ENV_TYPES.PROD,
    DEBUG: false,
    ENDPOINTS: {
      LOGIN: '/users/login', // Updated to be relative to /api/v1
      // Add other endpoints here
    },
    // Add other production-specific variables here
  },
};

// Get current environment variables
const getEnvVars = () => {
  const currentEnv = getEnvironment();
  if (!ENV[currentEnv]) {
    throw new Error(`Environment "${currentEnv}" is not configured`);
  }

  // Log the current configuration in development
  if (currentEnv === ENV_TYPES.DEV) {
    console.log('=== Development Environment Configuration ===');
    console.log('Platform:', Platform.OS);
    console.log('Is Emulator:', Platform.isTV || Platform.isPad ? 'No' : 'Yes');
    console.log('Base URL:', BASE_URLS[currentEnv]);
    console.log('API URL:', ENV[currentEnv].API_URL);
    console.log('==========================================');
  }

  return ENV[currentEnv];
};

// Export environment variables
export const env = getEnvVars();

// Export environment type for type checking
export const ENV_TYPE = getEnvironment();

// Export the function to get environment variables
export default env;
