import React, {useContext, useState, useEffect, useRef} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Dimensions,
  StatusBar,
  ImageBackground,
  Alert,
  ScrollView,
} from 'react-native';
import {AuthContext} from '../context/AuthContext';
import LinearGradient from 'react-native-linear-gradient';
import env, {getBaseUrl} from '../config/env';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import Clipboard from '@react-native-clipboard/clipboard';

const {width, height} = Dimensions.get('window');
const isTablet = width >= 768;

const LoginScreen = ({navigation}) => {
  const {login} = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [deviceId, setDeviceId] = useState('');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Get device ID when component mounts
    const getDeviceId = async () => {
      try {
        const id = await DeviceInfo.getUniqueId();
        setDeviceId(id);
      } catch (error) {
        console.log('Error getting device ID:', error);
      }
    };
    getDeviceId();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    console.log('Login attempt with username:', email);

    // Validate inputs
    if (!email || !password) {
      console.log('Login validation failed: Missing username or password');
      setError('Please enter both username and password');
      setIsLoading(false);
      return;
    }

    // Create request data with username instead of email
    const requestData = {
      username: email.trim(),
      password: password.trim(),
    };

    const baseUrl = getBaseUrl();
    const loginUrl = `${baseUrl}/api/v1/users/login`;

    console.log('Using login URL:', loginUrl);
    console.log('Sending login request with data:', requestData);

    try {
      const config = {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      };

      console.log('Request config:', config);

      const response = await axios.post(loginUrl, requestData, config);

      console.log('Login response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Response data:', response.data);

      if (response.status === 200 && response.data?.access_token) {
        console.log('Login successful, token received');
        try {
          await login(
            response.data.access_token,
            null, // No refresh token in the API response
            response.data.user || null,
          );
          // Login successful, navigation will be handled by the AuthContext
        } catch (loginError) {
          console.log('Error during login process:', loginError);
          setError('Error during login process. Please try again.');
        }
      } else {
        console.log('Login failed: Invalid response format');
        setError('Login failed. Please check your credentials and try again.');
      }
    } catch (error) {
      console.log('Login error:', error);
      if (error.response) {
        console.log('Error response status:', error.response.status);
        console.log('Error response headers:', error.response.headers);
        console.log('Error response data:', error.response.data);

        const data = error.response.data;
        if (data.detail === 'Username and password are required') {
          setError('Please enter both username and password');
        } else if (Array.isArray(data.detail)) {
          const errorMessages = data.detail
            .map(e => {
              console.log('Error detail:', e);
              return `${e.loc ? e.loc.join('.') + ': ' : ''}${e.msg}`;
            })
            .join(', ');
          console.log('Validation errors:', errorMessages);
          setError(errorMessages);
        } else if (typeof data.detail === 'string') {
          setError(data.detail);
        } else if (typeof data === 'object' && data.msg) {
          setError(data.msg);
        } else {
          setError(
            'Login failed. Please check your credentials and try again.',
          );
        }
      } else if (error.request) {
        console.log('Error request:', error.request);
        setError(
          `Unable to connect to the server at ${baseUrl}. Please check if the server is running and try again.`,
        );
      } else {
        console.log('Error message:', error.message);
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <LinearGradient
        colors={['#005C97', '#363795', '#43cea2', '#6dd5ed']}
        style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <StatusBar backgroundColor="#004D40" barStyle="light-content" />

          {/* Device ID Button */}
          <TouchableOpacity
            style={styles.deviceIdButton}
            onPress={() => {
              Alert.alert(
                'Device Information',
                `Device ID: ${deviceId}\n\nThis is your unique device identifier.`,
                [
                  {
                    text: 'Copy ID',
                    onPress: () => {
                      Clipboard.setString(deviceId);
                      Alert.alert('Success', 'Device ID copied to clipboard!');
                    },
                  },
                  {
                    text: 'Close',
                    style: 'cancel',
                  },
                ],
                {cancelable: true},
              );
            }}>
            <Text style={styles.deviceIdButtonText}>Device ID</Text>
          </TouchableOpacity>

          <View style={styles.centerWrapper}>
            <Animated.View
              style={[
                styles.content,
                isTablet && styles.contentTablet,
                {
                  opacity: fadeAnim,
                  transform: [{translateY: slideAnim}],
                },
              ]}>
              <Image
                source={require('../Asset/Splash.png')}
                style={[styles.logo, isTablet && styles.logoTablet]}
                resizeMode="contain"
              />
              <Text style={[styles.title, isTablet && styles.titleTablet]}>
                Global Encounters
              </Text>
              <Text
                style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
                Welcome Back
              </Text>

              <TextInput
                style={[styles.input, isTablet && styles.inputTablet]}
                placeholder="Username"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="default"
                placeholderTextColor="#666"
              />
              <TextInput
                style={[styles.input, isTablet && styles.inputTablet]}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#666"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.button, isTablet && styles.buttonTablet]}
                onPress={handleLogin}
                disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.buttonText,
                      isTablet && styles.buttonTextTablet,
                    ]}>
                    Sign In
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  centerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'stretch',
    borderRadius: 18,
    padding: wp('6%'),
  },
  contentTablet: {
    maxWidth: 600,
    padding: 40,
    borderRadius: 28,
  },
  title: {
    fontSize: wp('8.5%'),
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: hp('0.8%'),
    letterSpacing: wp('0.3%'),
    fontFamily: 'Poppins-Bold',
  },
  titleTablet: {
    fontSize: 48,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: wp('4.5%'),
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: wp('0.2%'),
    fontWeight: '600',
    marginBottom: hp('4%'),
    fontFamily: 'Poppins-Medium',
  },
  subtitleTablet: {
    fontSize: 28,
    marginBottom: 40,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    margin: wp(2),
    borderRadius: 12,
    height: 50,
    fontSize: 16,
    color: '#fff',
  },
  inputTablet: {
    height: 60,
    fontSize: 20,
    margin: wp(3),
    borderRadius: 16,
  },
  button: {
    backgroundColor: '#1565C0',
    borderRadius: wp('3%'),
    padding: wp('4%'),
    alignItems: 'center',
    width: 160,
    alignSelf: 'center',
    marginTop: hp('2%'),
  },
  buttonTablet: {
    borderRadius: 16,
    padding: 20,
    width: 200,
    marginTop: hp('3%'),
  },
  buttonText: {
    color: '#fff',
    fontSize: wp('4.5%'),
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  buttonTextTablet: {
    fontSize: 24,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: hp('2%'),
    fontWeight: '500',
    fontSize: wp('3.8%'),
    fontFamily: 'Poppins-Medium',
  },
  logo: {
    width: wp('40%'),
    height: wp('40%'),
    alignSelf: 'center',
    marginBottom: hp('3%'),
    maxWidth: 180,
    maxHeight: 180,
  },
  logoTablet: {
    width: 240,
    height: 240,
    marginBottom: 40,
  },
  deviceIdButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
  deviceIdButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LoginScreen;
