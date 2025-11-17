import NetInfo from '@react-native-community/netinfo'

/**
 * Get the device's local IP address
 * This is useful for allowing other devices on the same network to connect
 * to the HTTP/WebSocket server running on this device
 */
export async function getLocalIPAddress(): Promise<string | null> {
  try {
    const netInfo = await NetInfo.fetch()

    // Check if we have network connectivity
    if (!netInfo.isConnected) {
      console.log('Device is not connected to any network')
      return null
    }

    // Get IP address based on connection type
    if (netInfo.type === 'wifi' && netInfo.details) {
      const details = netInfo.details as any
      // iOS provides ipAddress in details
      if (details.ipAddress) {
        return details.ipAddress
      }
      // Android provides ipAddress in details
      if (details.ipAddress) {
        return details.ipAddress
      }
    }

    if (netInfo.type === 'cellular' && netInfo.details) {
      const details = netInfo.details as any
      if (details.ipAddress) {
        return details.ipAddress
      }
    }

    // If we couldn't get IP from NetInfo, try alternative method
    // Note: This might not work on all platforms
    console.warn('Could not retrieve IP address from NetInfo')
    return null
  } catch (error) {
    console.error('Error getting local IP address:', error)
    return null
  }
}

/**
 * Get network information including connection type and IP
 */
export async function getNetworkInfo() {
  const netInfo = await NetInfo.fetch()
  const ipAddress = await getLocalIPAddress()

  return {
    type: netInfo.type,
    isConnected: netInfo.isConnected,
    isInternetReachable: netInfo.isInternetReachable,
    ipAddress,
    details: netInfo.details,
  }
}

/**
 * Subscribe to network state changes
 */
export function subscribeToNetworkChanges(
  callback: (state: { isConnected: boolean; type: string; ipAddress: string | null }) => void,
) {
  return NetInfo.addEventListener(async state => {
    const ipAddress = await getLocalIPAddress()
    callback({
      isConnected: state.isConnected || false,
      type: state.type,
      ipAddress,
    })
  })
}
