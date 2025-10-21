import { PermissionsAndroid, Platform } from 'react-native'
import Geolocation from 'react-native-geolocation-service'

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    // iOS permissions are handled automatically by react-native-geolocation-service
    return true
  }

  try {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
      title: 'Location Permission',
      message: 'This app needs access to your location to provide location-based services.',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
    })
    return granted === PermissionsAndroid.RESULTS.GRANTED
  } catch (err) {
    console.warn(err)
    return false
  }
}
export const getLocation = async (): Promise<Geolocation.GeoPosition | null> => {
  const hasPermission = await requestLocationPermission()
  if (!hasPermission) return null

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        console.log(position)
        resolve(position)
        // You can access latitude with position.coords.latitude
        // and longitude with position.coords.longitude
      },
      error => {
        // See error.code and error.message for error details
        console.log(error.code, error.message)
        reject(null)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )
  })
}
