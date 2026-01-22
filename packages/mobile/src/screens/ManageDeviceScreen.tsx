// @ts-nocheck
import { labels } from '@pzero/shared/constants'
import type { NavigationProp } from '@react-navigation/native'
import type React from 'react'
import { useEffect, useState } from 'react'
import { Alert, Dimensions, PermissionsAndroid, StyleSheet, TouchableOpacity } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SwipeListView } from 'react-native-swipe-list-view'
import { Text, TextField, View } from 'react-native-ui-lib'
import BottomTabs, { type TabItem } from '../components/BottomTabs'
import Button from '../components/Button'
import DrawerOverlay from '../components/DrawerOverlay'
import Header from '../components/Header'
import InstructionText from '../components/InstructionText'
import ScreenHeader from '../components/ScreenHeader'
import { envs } from '../constants/envs'
import { ConnectionsIcon, TrashIcon } from '../icons'
import { stores } from '../stores'
import { borderRadius, buttons, colors, fontSize, fontWeight, spacing, surfaces, text } from '../theme'
import { isAndroid } from '../utils/validate'

type DrawerParamList = {
  Home: undefined
  ConnectDevice: undefined
  Endpoints: undefined
  Settings: undefined
}

interface DeviceInfo {
  deviceId: string
  deviceName: string
  nickname: string
  isPrimaryDevice: boolean
  systemName: string
  systemVersion: string
  brand: string
  model: string
  appVersion: string
  dateAdded: number
  phoneNumber?: string
  classificationType?: string
}

interface QRCodeEvent {
  data: string
}

interface ConnectDeviceScreenProps {
  navigation?: NavigationProp<DrawerParamList>
  onFAQPress?: () => void
}

const ManageDeviceScreen: React.FC<ConnectDeviceScreenProps> = ({ navigation, onFAQPress }) => {
  const safeAreaInsets = useSafeAreaInsets()
  const [isScanning, setIsScanning] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<'add' | 'connections'>('connections')
  const [connectedDevices, setConnectedDevices] = useState<DeviceInfo[]>([])
  const [manualQRInput, setManualQRInput] = useState('')
  const [showConnectDrawer, setShowConnectDrawer] = useState(false)

  // Access store directly - it will be initialized in useEffect
  const devicesStore = stores.DevicesStore
  const [isInitializing, setIsInitializing] = useState(true)

  // Reactive state variables for store values to trigger re-renders
  const [isPrimaryDevice, setIsPrimaryDevice] = useState(devicesStore.isPrimaryDevice)
  const [currentDevice, setCurrentDevice] = useState(devicesStore.currentDevice)

  useEffect(() => {
    const initializeDeviceStatus = async () => {
      setIsInitializing(true)
      // Initialize DevicesStore to get latest status
      await devicesStore.init()
      // Update reactive state variables
      setIsPrimaryDevice(devicesStore.isPrimaryDevice)
      setCurrentDevice(devicesStore.currentDevice)
      setIsInitializing(false)
      console.log('ManageDevices - isPrimaryDevice:', devicesStore.isPrimaryDevice)
      console.log('ManageDevices - currentDevice:', devicesStore.currentDevice?.nickname)
    }

    initializeDeviceStatus()
    initializeScreen()
    loadConnectedDevices()
  }, [])

  const loadConnectedDevices = async () => {
    try {
      const devices = await devicesStore.getConnectedDevices()
      setConnectedDevices(devices || [])
    } catch (error) {
      console.error('Error loading connected devices:', error)
    }
  }

  const initializeScreen = async () => {
    try {
      // Check camera permission
      if (isAndroid()) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED)
      } else {
        setHasPermission(true) // iOS permissions are handled automatically
      }
    } catch (error) {
      console.error('Error initializing ConnectDevice screen:', error)
    }
  }

  const onBarCodeRead = (event: QRCodeEvent) => {
    if (event.data) {
      try {
        const qrData = JSON.parse(event.data)

        if (isPrimaryDevice) {
          // Primary device scanned a secondary device's QR code
          handleSecondaryDeviceConnection(qrData)
        } else {
          // Secondary device scanned a primary device's QR code
          handlePrimaryDeviceConnection(qrData)
        }
      } catch (_error) {
        Alert.alert(labels.error, labels.invalidQRFormat)
        setIsScanning(false)
      }
    }
  }

  const handleSecondaryDeviceConnection = async (qrData: DeviceInfo) => {
    try {
      if (qrData.isPrimaryDevice) {
        Alert.alert(labels.error, labels.cannotConnectPrimaryDevice)
        setIsScanning(false)
        return
      }

      // Add the secondary device to connected devices
      await devicesStore.addConnectedDevice(qrData)
      await loadConnectedDevices() // Refresh the list
      setIsPrimaryDevice(devicesStore.isPrimaryDevice)
      setCurrentDevice(devicesStore.currentDevice)

      Alert.alert(
        labels.success,
        labels.deviceConnectedSuccess(qrData.nickname || qrData.deviceName || labels.unknownDevice),
        [
          {
            text: labels.ok,
            onPress: () => {
              setIsScanning(false)
              setActiveTab('connections') // Switch to connections tab
            },
          },
        ],
      )
    } catch (error) {
      console.error('Error connecting secondary device:', error)
      Alert.alert(labels.error, labels.connectDeviceFailed)
      setIsScanning(false)
    }
  }

  const handlePrimaryDeviceConnection = async (qrData: DeviceInfo) => {
    try {
      if (!qrData.isPrimaryDevice) {
        Alert.alert(labels.error, labels.scanPrimaryDeviceQR)
        setIsScanning(false)
        return
      }

      // Set the scanned device as the primary device
      await devicesStore.setPrimaryDevice(qrData)
      setIsPrimaryDevice(devicesStore.isPrimaryDevice)
      setCurrentDevice(devicesStore.currentDevice)

      Alert.alert(
        labels.success,
        labels.connectedToPrimarySuccess(qrData.nickname || qrData.deviceName || labels.unknownDevice),
        [
          {
            text: labels.ok,
            onPress: () => {
              setIsScanning(false)
              navigation?.goBack()
            },
          },
        ],
      )
    } catch (error) {
      console.error('Error connecting to primary device:', error)
      Alert.alert(labels.error, labels.connectToPrimaryFailed)
      setIsScanning(false)
    }
  }

  const startScanning = async () => {
    if (hasPermission === false) {
      if (isAndroid()) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(labels.permissionRequired, labels.cameraPermissionRequired)
          return
        }
        setHasPermission(true)
      }
    }
    setIsScanning(true)
  }

  const stopScanning = () => {
    setIsScanning(false)
  }

  const handleManualQRSubmit = () => {
    if (!manualQRInput.trim()) {
      Alert.alert(labels.error, labels.enterQRCodeData)
      return
    }

    try {
      const _qrData = JSON.parse(manualQRInput.trim())
      onBarCodeRead({ data: manualQRInput.trim() })
      setManualQRInput('')
    } catch (_error) {
      Alert.alert(labels.error, labels.invalidQRJSONFormat)
    }
  }

  const generateSampleQRData = () => {
    const timestamp = Date.now()
    const deviceNames = [
      'iPhone 15 Pro',
      'Samsung Galaxy S24',
      'Google Pixel 8',
      'iPhone 14',
      'OnePlus 12',
      'iPad Air',
      'MacBook Pro',
    ]
    const nicknames = [
      "Alex's Phone",
      "Sarah's Device",
      'Work Phone',
      'Personal iPad',
      'Home Computer',
      'Travel Phone',
      'Backup Device',
    ]
    const brands = ['Apple', 'Samsung', 'Google', 'OnePlus', 'Huawei', 'Xiaomi']
    const systems = ['iOS', 'Android']
    const phoneNumbers = ['+1555-0123', '+1555-0456', '+1555-0789', '+1555-0321', '+1555-0654', '+1555-0987']
    const classifications = ['corp', 'personal', 'unknown']

    const randomDeviceName = deviceNames[Math.floor(Math.random() * deviceNames.length)]
    const randomNickname = `${nicknames[Math.floor(Math.random() * nicknames.length)]} ${Math.floor(Math.random() * 1000)}`
    const randomBrand = brands[Math.floor(Math.random() * brands.length)]
    const randomSystem = systems[Math.floor(Math.random() * systems.length)]
    const randomPhone = phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)]
    const randomClassification = classifications[Math.floor(Math.random() * classifications.length)]

    const sampleDevice = {
      deviceId: `sample-${timestamp}-${Math.floor(Math.random() * 10000)}`,
      deviceName: randomDeviceName,
      nickname: randomNickname,
      isPrimaryDevice: !isPrimaryDevice, // Opposite of current device for testing
      systemName: randomSystem,
      systemVersion:
        randomSystem === 'iOS'
          ? `${15 + Math.floor(Math.random() * 3)}.${Math.floor(Math.random() * 5)}`
          : `${11 + Math.floor(Math.random() * 3)}.0`,
      brand: randomBrand,
      model: randomDeviceName,
      appVersion: '1.0.0',
      dateAdded: timestamp,
      phoneNumber: randomPhone,
      classificationType: randomClassification,
    }

    setManualQRInput(JSON.stringify(sampleDevice, null, 2))
  }

  const generateQRData = () => {
    if (!currentDevice) return null

    return {
      deviceId: currentDevice.deviceId,
      deviceName: currentDevice.deviceName,
      nickname: currentDevice.nickname,
      isPrimaryDevice: isPrimaryDevice,
      systemName: currentDevice.systemName,
      systemVersion: currentDevice.systemVersion,
      brand: currentDevice.brand,
      model: currentDevice.model,
      appVersion: currentDevice.appVersion,
      dateAdded: Date.now(),
    }
  }

  const showMyQRCode = () => {
    setShowQRCode(true)
  }

  const hideQRCode = () => {
    setShowQRCode(false)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  }

  const handleDeleteDevice = (deviceId: string, deviceName: string) => {
    Alert.alert(labels.removeDeviceTitle, labels.removeDeviceConfirmation(deviceName), [
      {
        text: labels.cancel,
        style: 'cancel',
      },
      {
        text: labels.remove,
        style: 'destructive',
        onPress: async () => {
          try {
            await devicesStore.removeConnectedDevice(deviceId)
            await loadConnectedDevices() // Refresh the list
            setIsPrimaryDevice(devicesStore.isPrimaryDevice)
            setCurrentDevice(devicesStore.currentDevice)
            Alert.alert(labels.success, labels.deviceRemovedSuccess)
          } catch (error) {
            console.error('Error removing device:', error)
            Alert.alert(labels.error, labels.deviceRemoveFailed)
          }
        },
      },
    ])
  }

  const renderConnectionItem = ({ item }: { item: DeviceInfo }) => (
    <View style={styles.connectionItem}>
      <Text text60 color={colors.textLightColor} marginB-5>
        {item.nickname || item.deviceName || labels.unknownDevice}
      </Text>
      <Text text80 color={colors.textDarkColor} marginB-3>
        {labels.deviceLabel(item.deviceName || labels.unknown)}
      </Text>
      <Text text80 color={colors.textDarkColor} marginB-3>
        {labels.phoneLabel(item.phoneNumber || labels.notProvided)}
      </Text>
      <Text text80 color={colors.textDarkColor} marginB-3>
        {labels.typeLabel(item.classificationType || labels.unknown)}
      </Text>
      <Text text80 color={colors.textDarkColor}>
        {labels.addedLabel(item.dateAdded ? formatDate(item.dateAdded) : labels.unknown)}
      </Text>
    </View>
  )

  const renderHiddenItem = ({ item }: { item: DeviceInfo }) => (
    <View style={styles.hiddenItem}>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteDevice(item.deviceId, item.nickname || item.deviceName || labels.unknownDevice)}
      >
        <TrashIcon size={20} color="white" />
        <Text style={styles.deleteButtonLabel}>{labels.remove}</Text>
      </TouchableOpacity>
    </View>
  )

  const tabs: TabItem[] = [
    {
      id: 'add',
      label: labels.addTab,
      isTextIcon: true,
    },
    {
      id: 'connections',
      label: labels.connectionsTab,
      icon: <ConnectionsIcon size={24} color={activeTab === 'connections' ? colors.primaryColor : text.muted} />,
    },
  ]

  const renderConnectionsTab = () => (
    <View style={styles.content}>
      <Text text50 color={colors.textLightColor} marginB-20 center>
        {labels.connectedDevices}
      </Text>
      {connectedDevices.length === 0 ? (
        <View style={styles.emptyState}>
          <Text text60 color={colors.textDarkColor} center marginB-10>
            {labels.noConnectedDevices}
          </Text>
          <Text text80 color={colors.textDarkColor} center marginB-20>
            {isPrimaryDevice ? labels.connectSecondaryDevicesInstruction : labels.connectToPrimaryInstruction}
          </Text>
          <Button
            label={labels.connectDevice}
            onPress={() => setShowConnectDrawer(true)}
            variant="primary"
            size="large"
          />
        </View>
      ) : (
        <SwipeListView
          data={connectedDevices.map((device, index) => ({ key: device.deviceId || index.toString(), ...device }))}
          renderItem={renderConnectionItem}
          renderHiddenItem={renderHiddenItem}
          rightOpenValue={-75}
          keyExtractor={item => item.key}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )

  const renderAddTab = () => (
    <View style={styles.content}>
      <View style={styles.infoCard}>
        <Text text60 color={colors.textLightColor} marginB-15>
          {labels.deviceStatus}
        </Text>
        <Text text70 color={colors.textDarkColor} marginB-10>
          {labels.deviceTypeLabel(isPrimaryDevice)}
        </Text>
        <Text text70 color={colors.textDarkColor} marginB-20>
          {labels.deviceNameLabel(currentDevice?.nickname || currentDevice?.deviceName || labels.unknown)}
        </Text>

        {isPrimaryDevice ? (
          <Text text70 color={colors.textDarkColor} marginB-20>
            {labels.primaryDeviceInstruction}
          </Text>
        ) : (
          <Text text70 color={colors.textDarkColor} marginB-20>
            {labels.secondaryDeviceInstruction}
          </Text>
        )}
      </View>

      {isPrimaryDevice ? (
        <>
          <Button
            label={labels.scanSecondaryDevice}
            onPress={startScanning}
            variant="primary"
            size="large"
            style={styles.scanButton}
          />
          <Button
            label={labels.showMyQRCode}
            onPress={showMyQRCode}
            variant="primary"
            size="large"
            style={styles.qrButton}
          />
        </>
      ) : (
        <>
          <Button
            label={labels.scanPrimaryDeviceQRCode}
            onPress={startScanning}
            variant="primary"
            size="large"
            style={styles.scanButton}
          />
          <Button
            label={labels.showMyQRCode}
            onPress={showMyQRCode}
            variant="primary"
            size="large"
            style={styles.qrButton}
          />
        </>
      )}

      <Button
        label={labels.back}
        onPress={() => navigation?.goBack()}
        variant="secondary"
        size="large"
        style={styles.backButton}
      />
    </View>
  )

  if (showQRCode) {
    const qrData = generateQRData()
    return (
      <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
        <ScreenHeader title={labels.myDeviceQRCode} onBack={hideQRCode} showBackButton={true} />

        <View style={styles.qrContainer}>
          {qrData ? (
            <QRCode value={JSON.stringify(qrData)} size={250} backgroundColor="white" color="black" />
          ) : (
            <Text text60 color={colors.textLightColor} center>
              {labels.unableToGenerateQR}
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <InstructionText>{labels.qrCodeInstructionText}</InstructionText>
          <Button
            label={labels.done}
            onPress={hideQRCode}
            variant="secondary"
            size="large"
            style={styles.cancelButton}
          />
        </View>
      </View>
    )
  }

  if (isScanning) {
    const scanTitle = isPrimaryDevice ? labels.scanSecondaryDevice : labels.scanPrimaryDevice
    const scanInstruction = isPrimaryDevice ? labels.scanInstructionPrimary : labels.scanInstructionSecondary

    return (
      <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
        <ScreenHeader title={scanTitle} onBack={stopScanning} showBackButton={true} />

        <View style={styles.scannerContainer}>
          <View style={styles.permissionContainer}>
            {envs.isSimulator ? (
              <>
                <Text text60 color={colors.textLightColor} center marginB-20>
                  {labels.cameraScannerSimulator}
                </Text>

                <Text text70 color={colors.textDarkColor} center marginB-20>
                  {labels.manualQRInputInstruction}
                </Text>

                <TextField
                  placeholder={labels.qrInputPlaceholder}
                  value={manualQRInput}
                  onChangeText={setManualQRInput}
                  multiline
                  numberOfLines={8}
                  style={styles.qrInput}
                  placeholderTextColor={colors.textDarkColor}
                  color={colors.textLightColor}
                />

                <View style={styles.manualInputButtons}>
                  <Button
                    label={labels.generateSample}
                    onPress={generateSampleQRData}
                    variant="secondary"
                    size="medium"
                    style={styles.sampleButton}
                  />

                  <Button
                    label={labels.processQRData}
                    onPress={handleManualQRSubmit}
                    variant="primary"
                    size="medium"
                    style={styles.submitButton}
                  />
                </View>
              </>
            ) : (
              <Text text60 color={colors.textLightColor} center>
                {labels.cameraImplementationNeeded}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <InstructionText>{scanInstruction}</InstructionText>
          <Button
            label={labels.cancel}
            onPress={stopScanning}
            variant="secondary"
            size="large"
            style={styles.cancelButton}
          />
        </View>
      </View>
    )
  }

  if (isInitializing) {
    return (
      <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
        <Header title={labels.manageDeviceTitle} navigation={navigation} onFAQPress={onFAQPress} />
        <View style={styles.loadingContainer}>
          <Text text60 color={colors.textLightColor} center>
            {labels.loading}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <Header title={labels.manageDeviceTitle} navigation={navigation} onFAQPress={onFAQPress} />

      {connectedDevices.length === 0 && !showConnectDrawer ? (
        // Empty state - no tabs
        <View style={styles.content}>
          <View style={styles.emptyStateContainer}>
            <Text text40 color={colors.textLightColor} center marginB-20>
              {labels.noDevicesConnected}
            </Text>
            <Text text70 color={colors.textDarkColor} center marginB-30>
              {isPrimaryDevice ? labels.connectSecondaryDevicesInstruction : labels.connectToPrimaryInstruction}
            </Text>
            <Button
              label={labels.connectDevice}
              onPress={() => setShowConnectDrawer(true)}
              variant="primary"
              size="large"
            />
          </View>
        </View>
      ) : (
        // Normal view with tabs
        <>
          {activeTab === 'add' ? renderAddTab() : renderConnectionsTab()}
          <BottomTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabPress={tabId => setActiveTab(tabId as 'add' | 'connections')}
          />
        </>
      )}

      {/* Connect Device Drawer */}
      <DrawerOverlay
        visible={showConnectDrawer}
        onClose={() => setShowConnectDrawer(false)}
        title={labels.connectDevice}
        width="100%"
      >
        <View style={styles.drawerContent}>
          <Text text60 color={colors.textLightColor} center marginB-30>
            {isPrimaryDevice ? labels.letSecondaryDevicesScanInstruction : labels.scanQRFromPrimaryInstruction}
          </Text>

          {isPrimaryDevice ? (
            <Button
              label={labels.showMyQRCode}
              onPress={() => {
                setShowConnectDrawer(false)
                showMyQRCode()
              }}
              variant="primary"
              size="large"
              style={styles.drawerButton}
            />
          ) : (
            <Button
              label={labels.scanPrimaryDeviceQRCode}
              onPress={() => {
                setShowConnectDrawer(false)
                startScanning()
              }}
              variant="primary"
              size="large"
              style={styles.drawerButton}
            />
          )}
        </View>
      </DrawerOverlay>
    </View>
  )
}

const { height } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.primary,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: surfaces.secondary,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  scanButton: {
    marginBottom: spacing.lg - 1,
  },
  qrButton: {
    marginBottom: spacing.lg - 1,
  },
  backButton: {
    marginTop: spacing.sm + 2,
  },
  qrContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: surfaces.secondary,
    margin: spacing.xl,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: surfaces.primary,
  },
  camera: {
    height: height * 0.6,
    width: '100%',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: surfaces.secondary,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: 0,
  },
  cancelButton: {
    backgroundColor: colors.borderColor,
  },
  connectionItem: {
    backgroundColor: surfaces.secondary,
    padding: spacing.lg - 1,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  hiddenItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: surfaces.secondary,
    marginBottom: spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  deleteButton: {
    backgroundColor: colors.errorColor,
    justifyContent: 'center',
    alignItems: 'center',
    width: 75,
    height: '100%',
    borderTopRightRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  deleteButtonLabel: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  qrInput: {
    backgroundColor: surfaces.secondary,
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: borderRadius.lg,
    padding: spacing.lg - 1,
    marginBottom: spacing.xl,
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
    fontSize: fontSize.xs,
  },
  manualInputButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm + 2,
  },
  sampleButton: {
    flex: 1,
    backgroundColor: colors.borderColor,
  },
  submitButton: {
    flex: 1,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  drawerContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xl + 20,
  },
  drawerButton: {
    marginBottom: spacing.md,
  },
})

export default ManageDeviceScreen
