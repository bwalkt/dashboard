export const labels = {
  // App General
  appName: 'P-Zero',
  menuIcon: '\u2630',

  // Common Actions
  cancel: 'Cancel',
  done: 'Done',
  back: 'Back',
  ok: 'OK',
  save: 'Save',
  delete: 'Delete',
  remove: 'Remove',
  continue: 'Continue',

  // Common Status
  success: 'Success',
  error: 'Error',
  loading: 'Loading...',

  // Home Screen
  welcomeTitle: 'Welcome to P-Zero',
  welcomeSubtitle: 'Built with react-native-ui-lib',
  getStartedButton: 'Get Started',

  // Settings Screen
  settingsTitle: 'Settings',
  nickname: 'Nickname',
  nicknameRequired: 'Nickname *',
  nicknamePlaceholder: 'Enter your nickname',
  email: 'Email',
  emailRequired: 'Email *',
  emailPlaceholder: 'Enter your email',
  phoneNumber: 'Phone Number',
  phoneNumberRequired: 'Phone Number *',
  phoneNumberPlaceholder: 'Enter your phone number',
  deviceClassification: 'Device Classification',
  deviceClassificationRequired: 'Device Classification *',
  classificationPlaceholder: 'Select classification type',
  setPrimaryDevice: 'Set as Primary Device',
  primaryDeviceDescription: 'Primary devices can manage and connect other devices',
  saveSettings: 'Save Settings',
  resetSettings: 'Reset Settings',
  settingsSavedSuccess: 'Settings saved successfully!',
  settingsSaveFailed: 'Failed to save settings. Please try again.',
  selectClassificationTitle: 'Select Device Classification',
  confirmDeviceStatusChange: 'Confirm Device Status Change',

  // Settings Validation Messages
  fieldRequired: (field: string) => `${field} is required`,
  fieldCannotBeEmpty: (field: string) => `${field} cannot be empty`,
  invalidEmailFormat: 'Please enter a valid email address',
  invalidPhoneFormat: 'Please enter a valid phone number',
  invalidFieldFormat: (field: string) => `Invalid ${field} format`,
  invalidField: (field: string) => `Invalid ${field}`,
  selectValidField: (field: string) => `Please select a valid ${field}`,
  pleaseSelectClassification: 'Please select a device classification',
  saveOperationFailed: (key: string) => `Failed to save ${key}`,

  // Settings -
  deviceStatusChangeWarning: (count: number) =>
    `You have ${count} connected device${count !== 1 ? 's' : ''}. Changing from primary to secondary device will disconnect all connected devices and reset your connections. This action cannot be undone.\n\nDo you want to continue?`,

  // Connect Device Screen
  connectDeviceTitle: 'Connect Device',
  deviceStatus: 'Device Status',
  deviceType: 'Device Type',
  deviceTypePrimary: 'Primary Device',
  deviceTypeSecondary: 'Secondary Device',
  deviceTypeLabel: (isPrimary: boolean) => `Device Type: ${isPrimary ? 'Primary Device' : 'Secondary Device'}`,
  deviceName: 'Device Name',
  deviceNameLabel: (name: string) => `Device Name: ${name}`,
  primaryDeviceInstruction:
    'As a primary device, you can scan QR codes from secondary devices to connect them to your network.',
  secondaryDeviceInstruction:
    'As a secondary device, you need to scan a QR code from a primary device to establish connection.',
  scanSecondaryDevice: 'Scan Secondary Device',
  scanPrimaryDevice: 'Scan Primary Device',
  showMyQRCode: 'Show My QR Code',
  myDeviceQRCode: 'My Device QR Code',
  unableToGenerateQR: 'Unable to generate QR code',
  qrCodeInstructionText: 'Show this QR code to other devices to connect them to your network.',
  scanInstructionPrimary: 'Point your camera at the QR code displayed on the secondary device you want to connect.',
  scanInstructionSecondary: 'Point your camera at the QR code displayed on the primary device you want to connect to.',
  cameraScannerSimulator: 'Camera Scanner (Not available in simulator)',
  manualQRInputInstruction: 'For testing, you can manually enter QR code data below:',
  qrInputPlaceholder: 'Paste QR code JSON data here',
  generateSample: 'Generate Sample',
  processQRData: 'Process QR Data',
  cameraImplementationNeeded: 'Camera implementation needed for real device scanning',

  // Connect Device - Tabs
  addTab: '+ Add',
  connectionsTab: 'Connections',
  connectedDevices: 'Connected Devices',
  noConnectedDevices: 'No connected devices',
  useAddTabInstruction: 'Use the Add tab to connect new devices',

  // Connect Device - Device Info
  deviceLabel: (deviceName: string) => `Device: ${deviceName}`,
  phoneLabel: (phoneNumber: string) => `Phone: ${phoneNumber}`,
  typeLabel: (type: string) => `Type: ${type}`,
  addedLabel: (date: string) => `Added: ${date}`,
  notProvided: 'Not provided',
  unknownDevice: 'Unknown Device',
  unknown: 'Unknown',

  // Connect Device - Remove Device
  removeDeviceTitle: 'Remove Device',
  removeDeviceConfirmation: (deviceName: string) =>
    `Are you sure you want to remove "${deviceName}" from connected devices? This action cannot be undone.`,
  deviceRemovedSuccess: 'Device removed successfully.',
  deviceRemoveFailed: 'Failed to remove device. Please try again.',

  // Connect Device - QR Code Scanning
  invalidQRFormat: 'Invalid QR code format. Please scan a valid device QR code.',
  cannotConnectPrimaryDevice: 'Cannot connect to another primary device. Only secondary devices can be connected.',
  deviceConnectedSuccess: (nickname: string) => `Device "${nickname}" has been connected successfully.`,
  connectDeviceFailed: 'Failed to connect device. Please try again.',
  scanPrimaryDeviceQR: 'Please scan a QR code from a primary device.',
  connectedToPrimarySuccess: (nickname: string) => `Connected to primary device "${nickname}" successfully.`,
  connectToPrimaryFailed: 'Failed to connect to primary device. Please try again.',
  permissionRequired: 'Permission Required',
  cameraPermissionRequired: 'Camera access is required to scan QR codes.',
  enterQRCodeData: 'Please enter QR code data',
  invalidQRJSONFormat: 'Invalid QR code format. Please enter valid JSON data.',

  // Endpoints Screen
  endpointsTitle: 'Endpoints',
  endpointsTab: 'Endpoints',
  endpointName: 'Name',
  endpointNameRequired: 'Name *',
  endpointNamePlaceholder: 'Enter endpoint name',
  baseURL: 'Base URL',
  baseURLRequired: 'Base URL *',
  baseURLPlaceholder: 'https://api.example.com',
  description: 'Description',
  descriptionPlaceholder: 'Optional description',
  addEndpoint: 'Add Endpoint',
  noEndpointsYet: 'No endpoints yet',
  createFirstEndpoint: 'Use the Add tab to create your first endpoint',
  urlLabel: (baseURI: string) => `URL: ${baseURI}`,
  descriptionLabel: (description: string) => `Description: ${description}`,

  // Endpoints - Delete
  deleteEndpointTitle: 'Delete Endpoint',
  deleteEndpointConfirmation: (endpointName: string) =>
    `Are you sure you want to delete "${endpointName}"? This action cannot be undone.`,
  endpointDeletedSuccess: 'Endpoint deleted successfully.',
  endpointDeleteFailed: 'Failed to delete endpoint. Please try again.',
  endpointAddedSuccess: 'Endpoint added successfully!',
  endpointSaveFailed: 'Failed to save endpoint. Please try again.',

  // Endpoints - Validation
  invalidURLFormat: 'Please enter a valid URL',

  // Biometric
  biometricPrompt: 'Authenticate to access the app',
  cancelButtonText: 'Cancel',
  biometricFallbackPrompt: 'Use device passcode',
}

export const messages = labels
