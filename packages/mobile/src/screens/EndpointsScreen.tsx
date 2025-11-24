import { type Endpoint, endpointSchema, endpointStatuses } from '@pzero/shared/pzero'
import { colors } from '@pzero/shared/theme'
import type { NavigationProp } from '@react-navigation/native'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type React from 'react'
import { useEffect, useState } from 'react'
import { Alert, FlatList, StyleSheet, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text, TextField, View } from 'react-native-ui-lib'
import BottomTabs, { type TabItem } from '../components/BottomTabs'
import Button from '../components/Button'
import CloudEndpointsIcon from '../components/CloudEndpointsIcon'
import Header from '../components/Header'
import { labels } from '../constants/labels'
import { stores } from '../stores'

const ajv = new Ajv()
addFormats(ajv)

const validate = ajv.compile(endpointSchema)

type DrawerParamList = {
  Home: undefined
  ConnectDevice: undefined
  Endpoints: undefined
  Settings: undefined
}

interface EndpointsScreenProps {
  navigation?: NavigationProp<DrawerParamList>
  onFAQPress?: () => void
}

interface FormData {
  name: string
  baseURI: string
  description: string
}

interface FormErrors {
  name?: string
  baseURI?: string
}

const EndpointsScreen: React.FC<EndpointsScreenProps> = ({ navigation, onFAQPress }) => {
  const safeAreaInsets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState<'add' | 'endpoints'>('add')
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [formData, setFormData] = useState<FormData>({
    name: '',
    baseURI: '',
    description: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const { EndpointsStore } = stores

  useEffect(() => {
    loadEndpoints()
  }, [])

  const loadEndpoints = () => {
    try {
      const allEndpoints = EndpointsStore.getAllEndpoints()
      setEndpoints(allEndpoints)
    } catch (error) {
      console.error('Error loading endpoints:', error)
    }
  }

  const getFieldErrors = (field: string): string[] => {
    if (!validate.errors) return []
    return validate.errors
      .filter(
        error =>
          error.instancePath === `/${field}` || (error.instancePath === '' && error.params?.missingProperty === field),
      )
      .map(error => {
        switch (error.keyword) {
          case 'required':
            return labels.fieldRequired(field)
          case 'minLength':
            return labels.fieldCannotBeEmpty(field)
          case 'format':
            if (error.params?.format === 'uri') {
              return labels.invalidURLFormat
            }
            return labels.invalidFieldFormat(field)
          default:
            return labels.invalidField(field)
        }
      })
  }

  const validateForm = (): boolean => {
    const isValid = validate(formData)
    const newErrors: FormErrors = {}

    if (!isValid) {
      for (const field of Object.keys(formData)) {
        const fieldErrors = getFieldErrors(field)
        if (fieldErrors.length > 0 && !newErrors[field as keyof FormErrors]) {
          newErrors[field as keyof FormErrors] = fieldErrors[0]
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return false
    }

    setErrors({})
    return true
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      const newEndpoint: Endpoint = {
        name: formData.name,
        baseURI: formData.baseURI,
        dateAdded: Date.now(),
        dateUpdated: Date.now(),
        status: endpointStatuses.unverified,
        ...(formData.description && { description: formData.description }),
      }

      EndpointsStore.addEndpoint(newEndpoint)
      loadEndpoints()

      // Reset form
      setFormData({
        name: '',
        baseURI: '',
        description: '',
      })

      Alert.alert(labels.success, labels.endpointAddedSuccess)
      setActiveTab('endpoints')
    } catch (error) {
      console.error('Error saving endpoint:', error)
      Alert.alert(labels.error, error instanceof Error ? error.message : labels.endpointSaveFailed)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEndpoint = (endpointId: string, endpointName: string) => {
    Alert.alert(labels.deleteEndpointTitle, labels.deleteEndpointConfirmation(endpointName), [
      {
        text: labels.cancel,
        style: 'cancel',
      },
      {
        text: labels.delete,
        style: 'destructive',
        onPress: () => {
          try {
            EndpointsStore.removeEndpoint(endpointId)
            loadEndpoints()
            Alert.alert(labels.success, labels.endpointDeletedSuccess)
          } catch (error) {
            console.error('Error deleting endpoint:', error)
            Alert.alert(labels.error, labels.endpointDeleteFailed)
          }
        },
      },
    ])
  }

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case endpointStatuses.active:
        return colors.statusActive
      case endpointStatuses.verified:
        return colors.statusVerified
      case endpointStatuses.revoked:
        return colors.statusRevoked
      case endpointStatuses.pending:
        return colors.statusPending
      default:
        return colors.statusDefault
    }
  }

  const renderEndpointItem = ({ item }: { item: Endpoint }) => (
    <View style={styles.endpointItem}>
      <View style={styles.endpointHeader}>
        <Text text60 color={colors.textLightColor} marginB-5>
          {item.name}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text text90 color={colors.white}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text text80 color={colors.textDarkColor} marginB-3>
        {labels.urlLabel(item.baseURI)}
      </Text>

      {item.description && (
        <Text text80 color={colors.textDarkColor} marginB-3>
          {labels.descriptionLabel(item.description)}
        </Text>
      )}

      <Text text80 color={colors.textDarkColor} marginB-10>
        {labels.addedLabel(formatDate(item.dateAdded))}
      </Text>

      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteEndpoint(item.id, item.name)}>
        <Text style={styles.deleteButtonText}>{labels.delete}</Text>
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
      id: 'endpoints',
      label: labels.endpointsTab,
      icon: <CloudEndpointsIcon size={24} color={activeTab === 'endpoints' ? '#007AFF' : '#666'} />,
    },
  ]

  const renderAddTab = () => (
    <View style={styles.content}>
      <View marginB-20>
        <Text text70 color={colors.textLightColor} marginB-10>
          {labels.endpointNameRequired}
        </Text>
        <TextField
          placeholder={labels.endpointNamePlaceholder}
          value={formData.name}
          onChangeText={value => updateField('name', value)}
          style={styles.input}
          placeholderTextColor={colors.textDarkColor}
          color={colors.textLightColor}
          validationMessage={errors.name}
          validationMessageStyle={styles.errorText}
          enableErrors={!!errors.name}
        />
      </View>

      <View marginB-20>
        <Text text70 color={colors.textLightColor} marginB-10>
          {labels.baseURLRequired}
        </Text>
        <TextField
          placeholder={labels.baseURLPlaceholder}
          value={formData.baseURI}
          onChangeText={value => updateField('baseURI', value)}
          style={styles.input}
          placeholderTextColor={colors.textDarkColor}
          color={colors.textLightColor}
          keyboardType="url"
          autoCapitalize="none"
          validationMessage={errors.baseURI}
          validationMessageStyle={styles.errorText}
          enableErrors={!!errors.baseURI}
        />
      </View>

      <View marginB-30>
        <Text text70 color={colors.textLightColor} marginB-10>
          {labels.description}
        </Text>
        <TextField
          placeholder={labels.descriptionPlaceholder}
          value={formData.description}
          onChangeText={value => updateField('description', value)}
          style={styles.input}
          placeholderTextColor={colors.textDarkColor}
          color={colors.textLightColor}
          multiline
          numberOfLines={3}
        />
      </View>

      <Button
        label={labels.addEndpoint}
        onPress={handleSave}
        disabled={isLoading}
        loading={isLoading}
        variant="primary"
        size="large"
        style={styles.saveButton}
      />
    </View>
  )

  const renderEndpointsTab = () => (
    <View style={styles.content}>
      {endpoints.length === 0 ? (
        <View style={styles.emptyState}>
          <CloudEndpointsIcon size={64} color={colors.textDarkColor} />
          <Text text60 color={colors.textDarkColor} center marginB-10 marginT-20>
            {labels.noEndpointsYet}
          </Text>
          <Text text80 color={colors.textDarkColor} center>
            {labels.createFirstEndpoint}
          </Text>
        </View>
      ) : (
        <FlatList
          data={endpoints}
          renderItem={renderEndpointItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <Header title={labels.endpointsTitle} navigation={navigation as any} onFAQPress={onFAQPress} />

      {activeTab === 'add' ? renderAddTab() : renderEndpointsTab()}

      <BottomTabs tabs={tabs} activeTab={activeTab} onTabPress={tabId => setActiveTab(tabId as 'add' | 'endpoints')} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundColor,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  input: {
    backgroundColor: colors.cardBackgroundColor,
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    color: colors.errorColor,
    fontSize: 14,
    marginTop: 5,
  },
  saveButton: {
    marginTop: 20,
  },
  endpointItem: {
    backgroundColor: colors.cardBackgroundColor,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  endpointHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deleteButton: {
    backgroundColor: colors.errorColor,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
})

export default EndpointsScreen
