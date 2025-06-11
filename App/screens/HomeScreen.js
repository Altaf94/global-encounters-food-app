import React, {useContext, useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  Modal,
  BackHandler,
} from 'react-native';
import {AuthContext} from '../context/AuthContext';
import QRCodeScanner from 'react-native-qrcode-scanner';
import {RNCamera} from 'react-native-camera';
import axios from 'axios';
import {getBaseUrl} from '../config/env';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import LinearGradient from 'react-native-linear-gradient';
import VolunteerPage from './VolunteerPage';

const getTodayDate = () => {
  const today = new Date();
  // Convert to UTC+5:00 timezone (Pakistan time)
  const utcDate = new Date(today.getTime() + 5 * 60 * 60 * 1000);
  return `${utcDate.getUTCFullYear()}-${String(
    utcDate.getUTCMonth() + 1,
  ).padStart(2, '0')}-${String(utcDate.getUTCDate()).padStart(2, '0')}`;
};

const getYesterdayDate = () => {
  const today = new Date();
  // Convert to UTC+5:00 timezone (Pakistan time) and subtract 24 hours
  const utcDate = new Date(
    today.getTime() + 5 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000,
  );
  return `${utcDate.getUTCFullYear()}-${String(
    utcDate.getUTCMonth() + 1,
  ).padStart(2, '0')}-${String(utcDate.getUTCDate()).padStart(2, '0')}`;
};

const CustomAlert = ({
  visible,
  title,
  message,
  onPress,
  onClose,
  buttonText,
  secondaryButtonText,
  onSecondaryPress,
}) => {
  if (!visible) return null;
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.alertOverlay}>
        <View style={styles.alertContainer}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>{title}</Text>
            <Text style={styles.alertMessage}>{message}</Text>
            <View style={styles.alertButtonContainer}>
              {secondaryButtonText && (
                <TouchableOpacity
                  style={[styles.alertButton, styles.alertSecondaryButton]}
                  onPress={onSecondaryPress}>
                  <Text style={styles.alertSecondaryButtonText}>
                    {secondaryButtonText}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.alertButton, styles.alertPrimaryButton]}
                onPress={onPress}>
                <Text style={styles.alertPrimaryButtonText}>
                  {buttonText || 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const {width, height} = Dimensions.get('window');
const isTablet = width >= 768;

export const HomeScreen = ({navigation}) => {
  const {logout, userToken} = useContext(AuthContext);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isUpdatingMeal, setIsUpdatingMeal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [scanFrameColor, setScanFrameColor] = useState('#FFFFFF');
  const [scannerRef, setScannerRef] = useState(null);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    onSuccess: null,
    buttonText: 'OK',
    secondaryButtonText: null,
    onSecondaryPress: null,
  });

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (showScanner) {
          setShowScanner(false);
          return true;
        }
        return false;
      },
    );

    return () => backHandler.remove();
  }, [showScanner]);

  const handleMealAvail = async (userData, isLunchTime) => {
    try {
      setIsUpdatingMeal(true);
      const baseUrl = getBaseUrl();
      const formattedDate = getTodayDate();
      const currentDate = new Date();
      const currentTime = currentDate.toISOString().split('T')[1].split('.')[0];

      const lunchTakenOn = isLunchTime
        ? `${formattedDate}T${currentTime}`
        : userData.lunch_takenon || null;

      const dinnerTakenOn = !isLunchTime
        ? `${formattedDate}T${currentTime}`
        : userData.dinner_takenon || null;

      const requestData = {
        registration_id: parseInt(userData.registration_id),
        date: formattedDate,
        lunch: isLunchTime ? 1 : userData.lunch,
        dinner: isLunchTime ? userData.dinner : 1,
        lunch_takenon: lunchTakenOn,
        dinner_takenon: dinnerTakenOn,
      };

      console.log('=== MEAL AVAIL API CALL DETAILS ===');
      console.log('Registration ID:', userData.registration_id);
      console.log('Date:', formattedDate);
      console.log('Meal Type:', isLunchTime ? 'Lunch' : 'Dinner');
      console.log('Request Data:', requestData);
      console.log('Using URL:', `${baseUrl}/api/v1/user/update`);

      const updateResponse = await axios.post(
        `${baseUrl}/api/v1/user/update`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
        },
      );

      if (updateResponse.data) {
        setScannedData(updateResponse.data);
        showAlert(
          '🎉 Success!',
          `\n${
            isLunchTime ? 'Lunch' : 'Dinner'
          } has been successfully availed.\n\nThank you for using our service!`,
          () => {
            setShowScanner(false);
            setScanFrameColor('#FFFFFF');
          },
          'OK',
          null,
          null,
        );
      }
    } catch (error) {
      console.error('Error updating meal status:', error);
      setScanFrameColor('#FF5252');
      showAlert(
        '❌ Error',
        '\nFailed to update meal status.\n\nPlease try again later.',
        () => {
          setScanFrameColor('#FFFFFF');
        },
        'OK',
        null,
        null,
      );
    } finally {
      setIsUpdatingMeal(false);
    }
  };

  const handleContinue = async () => {
    if (selectedOption === 'scan') {
      setShowScanner(true);
    } else if (selectedOption === 'menu') {
      navigation.navigate('VolunteerPage');
    }
  };

  const handleSessionExpired = () => {
    Alert.alert(
      'Session Expired',
      'Your session has expired. Please login again.',
      [
        {
          text: 'OK',
          onPress: async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{name: 'Login'}],
            });
          },
        },
      ],
    );
  };

  const fetchUserData = async registrationId => {
    try {
      setIsSearching(true);
      setScanFrameColor('#4CAF50');
      const baseUrl = getBaseUrl();
      const cleanRegistrationId = registrationId.trim();

      if (!cleanRegistrationId) {
        throw new Error('Please enter registration ID');
      }

      if (!/^\d+$/.test(cleanRegistrationId)) {
        throw new Error('Registration ID must contain only numbers');
      }

      const todayFormatted = getTodayDate();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayFormatted = yesterday.toISOString().split('T')[0];

      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${userToken}`,
      };

      // Try today's data first
      let apiUrl = `${baseUrl}/api/v1/user/search?registrationid=${cleanRegistrationId}&date=${todayFormatted}`;
      console.log('API URL (Today):', apiUrl);

      let response = await axios.get(apiUrl, {
        headers,
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        },
      });

      // If today's data is not found, try yesterday's data
      if (
        response.status === 404 ||
        response.data.detail === 'Audit log not found'
      ) {
        console.log("Today's data not found, trying yesterday's data...");
        apiUrl = `${baseUrl}/api/v1/user/search?registrationid=${cleanRegistrationId}&date=${yesterdayFormatted}`;
        console.log('API URL (Yesterday):', apiUrl);

        response = await axios.get(apiUrl, {
          headers,
          validateStatus: function (status) {
            return status >= 200 && status < 500;
          },
        });

        if (
          response.status === 404 ||
          response.data.detail === 'Audit log not found'
        ) {
          setScanFrameColor('#FF5252');
          Alert.alert(
            '⏳ No Record Found',
            `No meal record found for Registration ID ${cleanRegistrationId} for today or yesterday.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setScanFrameColor('#FFFFFF');
                  if (showScanner) {
                    setShowScanner(false);
                  }
                },
              },
            ],
          );
          return;
        }

        // Show yesterday's data with a note
        const userData = response.data;
        Alert.alert(
          "📅 Yesterday's Record Found",
          `Name: ${userData.name}\nEntitlement Type: ${userData.entitlement_type}\nRegistration ID: ${userData.registration_id}\n\nNote: Today's record is not yet available in the database.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setScanFrameColor('#FFFFFF');
                if (showScanner) {
                  setShowScanner(false);
                }
              },
            },
          ],
        );
        return;
      }

      // Handle today's data
      if (response.data && response.data.registration_id) {
        const userData = response.data;
        const currentHour = new Date().getHours();
        const isLunchTime = currentHour >= 11 && currentHour < 16;
        const isDinnerTime = currentHour >= 16 && currentHour < 22;
        const mealStatus = isLunchTime
          ? userData.lunch === 0
            ? 'Available'
            : 'Already Availed'
          : isDinnerTime
          ? userData.dinner === 0
            ? 'Available'
            : 'Already Availed'
          : 'Not Available';

        let nextMealMessage = '';
        if (currentHour < 11) {
          nextMealMessage = 'Lunch will be available at 11 AM.';
        } else if (currentHour >= 22) {
          nextMealMessage =
            'Meals are not available at this time. Lunch will be available tomorrow at 11 AM.';
        } else if (currentHour >= 16) {
          if (userData.lunch === 1) {
            nextMealMessage =
              'You have already availed lunch. Dinner will be available until 10 PM.';
          } else {
            nextMealMessage = 'Dinner will be available until 10 PM.';
          }
        } else {
          if (userData.lunch === 1) {
            nextMealMessage =
              'You have already availed lunch. You can avail dinner after 4 PM.';
          } else {
            nextMealMessage = 'Lunch will be available until 4 PM.';
          }
        }

        if (mealStatus === 'Already Availed') {
          Alert.alert(
            '🍽️ Meal Status',
            `Name: ${userData.name}\nEntitlement Type: ${userData.entitlement_type}\nRegistration ID: ${userData.registration_id}\n\n${nextMealMessage}`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setScanFrameColor('#FFFFFF');
                  if (showScanner) {
                    setShowScanner(false);
                  }
                },
              },
            ],
          );
        } else if (mealStatus === 'Not Available') {
          Alert.alert(
            '🍽️ Meal Status',
            `Name: ${userData.name}\nEntitlement Type: ${userData.entitlement_type}\nRegistration ID: ${userData.registration_id}\n\n${nextMealMessage}`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setScanFrameColor('#FFFFFF');
                  if (showScanner) {
                    setShowScanner(false);
                  }
                },
              },
            ],
          );
        } else {
          // If meal is available, directly call handleMealAvail
          console.log('Meal is available, proceeding with meal avail...');
          await handleMealAvail(userData, isLunchTime);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setScanFrameColor('#FF5252');
      if (error.response?.status === 401) {
        handleSessionExpired();
      } else {
        Alert.alert(
          'Error',
          error.message || 'Failed to fetch user data. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => {
                setScanFrameColor('#FFFFFF');
                if (showScanner) {
                  setShowScanner(false);
                }
              },
            },
          ],
        );
      }
    } finally {
      setIsSearching(false);
    }
  };

  const onBarCodeRead = async ({data}) => {
    if (isScanning || isSearching || isUpdatingMeal) return; // Prevent multiple scans
    try {
      setIsScanning(true);
      setScanFrameColor('#4CAF50');

      // Pause the scanner
      if (scannerRef) {
        scannerRef.pausePreview();
      }

      console.log('QR Code Data:', data);
      let registrationId = data;

      if (data.startsWith('{') || data.startsWith('[')) {
        try {
          const parsedData = JSON.parse(data);
          registrationId =
            parsedData.registrationid ||
            parsedData.registrationId ||
            parsedData.id;
        } catch (error) {
          console.log('Not a valid JSON, using raw data');
        }
      }

      console.log('Final Registration ID:', registrationId);

      if (!registrationId) {
        throw new Error('Invalid QR code data');
      }

      registrationId = String(registrationId).replace(/[^0-9]/g, '');
      console.log('Sending registration ID to API:', registrationId);

      // Fetch user data
      await fetchUserData(registrationId);
    } catch (error) {
      console.error('QR Code Error:', error);
      setScanFrameColor('#FF5252');
      showAlert(
        '⚠️ Error',
        '\nInvalid QR code format.\n\nPlease try again with a valid QR code.',
        () => {
          setScanFrameColor('#FFFFFF');
          if (scannerRef) {
            scannerRef.resumePreview();
          }
        },
        'OK',
        null,
        null,
      );
    } finally {
      setIsScanning(false);
      // Reactivate the scanner after a short delay
      setTimeout(() => {
        if (scannerRef) {
          scannerRef.resumePreview();
        }
      }, 1000);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    } catch (error) {
      console.log('Logout navigation error:', error);
    }
  };

  const showAlert = (
    title,
    message,
    onSuccess,
    buttonText,
    secondaryButtonText,
    onSecondaryPress,
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      onSuccess,
      buttonText,
      secondaryButtonText,
      onSecondaryPress,
    });
  };

  const handleAlertClose = () => {
    if (alertConfig.onSuccess) {
      alertConfig.onSuccess();
    }
    setAlertConfig({
      visible: false,
      title: '',
      message: '',
      onSuccess: null,
      buttonText: 'OK',
      secondaryButtonText: null,
      onSecondaryPress: null,
    });
  };

  if (showScanner) {
    return (
      <View style={styles.scannerContainer}>
        <RNCamera
          ref={ref => setScannerRef(ref)}
          style={styles.scanner}
          type={RNCamera.Constants.Type.back}
          onBarCodeRead={onBarCodeRead}
          captureAudio={false}
          androidCameraPermissionOptions={{
            title: 'Permission to use camera',
            message: 'We need your permission to use your camera',
            buttonPositive: 'Allow',
            buttonNegative: 'Cancel',
          }}
          iosCameraPermissionOptions={{
            title: 'Permission to use camera',
            message: 'We need your permission to use your camera',
            buttonPositive: 'Allow',
            buttonNegative: 'Cancel',
          }}>
          <View style={styles.scanFrameContainer}>
            <View style={[styles.scanFrame, {borderColor: scanFrameColor}]}>
              {(isScanning || isSearching || isUpdatingMeal) && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.loadingText}>
                    {isScanning
                      ? 'Scanning...'
                      : isSearching
                      ? 'Searching...'
                      : 'Updating...'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </RNCamera>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.mainContainer}>
        <View style={styles.content}>
          <Image
            source={require('../Asset/Splash1.png')}
            style={[styles.logo, isTablet && styles.logoTablet]}
            resizeMode="contain"
          />
          <Text style={[styles.title, isTablet && styles.titleTablet]}>
            Global Encounters
          </Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
            F&B Management
          </Text>
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                selectedOption === 'scan' && styles.selectedOption,
                isTablet && styles.optionButtonTablet,
                (isScanning || isUpdatingMeal || isSearching) &&
                  styles.disabledButton,
              ]}
              onPress={() => {
                setSelectedOption('scan');
                setShowScanner(true);
              }}
              disabled={isScanning || isUpdatingMeal || isSearching}>
              {isScanning || isSearching || isUpdatingMeal ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text
                  style={[
                    styles.optionText,
                    selectedOption === 'scan' && styles.selectedOptionText,
                    isTablet && styles.optionTextTablet,
                  ]}>
                  Scan-Camera Open
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionButton,
                selectedOption === 'menu' && styles.selectedOption,
                isTablet && styles.optionButtonTablet,
                (isScanning || isUpdatingMeal || isSearching) &&
                  styles.disabledButton,
              ]}
              onPress={() => {
                setSelectedOption('menu');
                navigation.navigate('VolunteerPage', {
                  initialData: null,
                  registrationId: null,
                  fromHome: true,
                });
              }}
              disabled={isScanning || isUpdatingMeal || isSearching}>
              {isSearching ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text
                  style={[
                    styles.optionText,
                    selectedOption === 'menu' && styles.selectedOptionText,
                    isTablet && styles.optionTextTablet,
                  ]}>
                  Find Participant
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hp('6%') : hp('3%'),
    right: wp('5%'),
    zIndex: 1,
  },
  logoutButton: {
    backgroundColor: '#1565C0',
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('4%'),
    borderRadius: wp('2%'),
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: wp('3.5%'),
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderRadius: 18,
    padding: wp('6%'),
  },
  contentTablet: {
    maxWidth: 500,
    padding: 40,
    borderRadius: 28,
  },
  title: {
    fontSize: wp('8.5%'),
    fontWeight: '800',
    color: '#1565C0',
    textAlign: 'center',
    marginBottom: hp('0.8%'),
    letterSpacing: wp('0.3%'),
    fontFamily: 'Poppins-Bold',
  },
  titleTablet: {
    fontSize: 38,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: wp('4.5%'),
    color: '#666666',
    textAlign: 'center',
    letterSpacing: wp('0.2%'),
    fontWeight: '600',
    marginBottom: hp('4%'),
    fontFamily: 'Poppins-Medium',
  },
  subtitleTablet: {
    fontSize: 22,
    marginBottom: 32,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('2%'),
    gap: wp('3%'),
  },
  optionButton: {
    flex: 1,
    height: hp('8%'),
    paddingHorizontal: wp('3%'),
    borderRadius: wp('2%'),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1565C0',
    minWidth: isTablet ? wp('30%') : wp('40%'),
    maxWidth: isTablet ? wp('45%') : wp('50%'),
  },
  optionButtonTablet: {
    height: hp('10%'),
    paddingHorizontal: wp('4%'),
    borderRadius: wp('3%'),
  },
  optionText: {
    color: '#1565C0',
    fontSize: wp('3.8%'),
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
    width: '100%',
  },
  optionTextTablet: {
    fontSize: wp('3.5%'),
    lineHeight: hp('3%'),
  },
  selectedOption: {
    backgroundColor: '#1565C0',
  },
  selectedOptionText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  scannerContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  scanner: {
    flex: 1,
  },
  scanFrameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: wp('80%'),
    maxWidth: isTablet ? 500 : 400,
    borderRadius: wp('4%'),
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  alertContent: {
    padding: wp('5%'),
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: isTablet ? wp('5%') : wp('4.5%'),
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: hp('1.5%'),
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  alertMessage: {
    fontSize: isTablet ? wp('4%') : wp('3.5%'),
    color: '#000000',
    marginBottom: hp('2.5%'),
    textAlign: 'center',
    lineHeight: hp('3%'),
    fontFamily: 'Poppins-Regular',
  },
  alertButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp('2.5%'),
    width: '100%',
  },
  alertButton: {
    flex: 1,
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('4%'),
    borderRadius: wp('2%'),
    alignItems: 'center',
    minWidth: wp('30%'),
  },
  alertPrimaryButton: {
    backgroundColor: '#1565C0',
  },
  alertSecondaryButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  alertPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: isTablet ? wp('4%') : wp('3.5%'),
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
  },
  alertSecondaryButtonText: {
    color: '#000000',
    fontSize: isTablet ? wp('4%') : wp('3.5%'),
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
  },
  continueButton: {
    backgroundColor: '#1565C0',
    borderRadius: wp('3%'),
    padding: wp('4%'),
    alignItems: 'center',
    width: '80%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  continueButtonTablet: {
    borderRadius: 16,
    padding: 18,
    width: '70%',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: wp('4.5%'),
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.5,
  },
  continueButtonTextTablet: {
    fontSize: 20,
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
    width: 200,
    height: 200,
    marginBottom: 32,
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default HomeScreen;
