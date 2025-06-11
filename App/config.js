import AsyncStorage from '@react-native-async-storage/async-storage';
import {Alert} from 'react-native';
import env, {ENV_TYPE} from './config/env';

// API Configuration
export const getApiConfig = () => ({
  BASE_URL: env.API_URL,
  ENDPOINTS: env.ENDPOINTS,
});

// Get full URL for an endpoint
export const getEndpointUrl = endpoint => {
  return `${env.API_URL}${endpoint}`;
};

// Debug logging (only in development)
export const debugLog = (...args) => {
  if (env.DEBUG) {
    console.log('[DEBUG]', ...args);
  }
};

// Error handling
export const handleApiError = error => {
  debugLog('API Error:', error);

  if (env.ENV_TYPE === 'dev') {
    Alert.alert(
      'API Error',
      `Error: ${error.message || 'Unknown error occurred'}\nURL: ${
        error.config?.url || 'Unknown URL'
      }`,
      [{text: 'OK'}],
    );
  } else {
    // In production, show a more user-friendly message
    Alert.alert('Error', 'Something went wrong. Please try again later.', [
      {text: 'OK'},
    ]);
  }
};

// Export environment variables for convenience
export const API_URL = env.API_URL;
export const BASE_URL = env.BASE_URL;
export const ENDPOINTS = env.ENDPOINTS;
export const isDevelopment = ENV_TYPE === 'dev';
export const isProduction = ENV_TYPE === 'prod';

// Add this function to check current environment
export const logEnvironmentStatus = () => {
  console.log('=== Environment Status ===');
  console.log('Current Environment:', ENV_TYPE);
  console.log('Is Development:', isDevelopment);
  console.log('Is Production:', isProduction);
  console.log('API Base URL:', env.API_URL);
  console.log('Login Endpoint:', env.ENDPOINTS.LOGIN);
  console.log('Full Login URL:', getEndpointUrl(env.ENDPOINTS.LOGIN));
  console.log('Debug Mode:', env.DEBUG);
  console.log('=======================');
};
