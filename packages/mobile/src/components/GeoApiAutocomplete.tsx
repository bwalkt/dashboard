import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native'
import { envs } from '../constants/envs'
import { borderRadius, colors, fontSize, fontWeight, spacing, surfaces, text } from '../theme'

interface GeoapifyFeature {
  type: string
  properties: {
    datasource?: {
      sourcename?: string
      attribution?: string
      license?: string
      url?: string
    }
    housenumber?: string
    street?: string
    suburb?: string
    district?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
    country_code?: string
    formatted?: string
    address_line1?: string
    address_line2?: string
    category?: string
    result_type?: string
    place_id?: string
    osm_id?: string
    osm_type?: string
    osm_key?: string
    osm_value?: string
    name?: string
  }
  geometry: {
    type: string
    coordinates: [number, number]
  }
  bbox?: [number, number, number, number]
}

interface GeoapifyAutocompleteResponse {
  type: string
  features: GeoapifyFeature[]
  query?: {
    text?: string
    parsed?: {
      city?: string
      expected_type?: string
    }
  }
}

interface GeoApiAutocompleteProps {
  placeholder?: string
  onPress: (data: GeoapifyFeature, details: GeoapifyFeature | null) => void
  query?: {
    language?: string
    type?: 'amenity' | 'building' | 'street' | 'locality' | 'city' | 'county' | 'state' | 'country'
    limit?: number
    bias?: {
      lat: number
      lon: number
      radius?: number
      zoom?: number
    }
    filter?: {
      countrycodes?: string[]
      circle?: {
        lon: number
        lat: number
        radius: number
      }
      rect?: {
        min_lon: number
        min_lat: number
        max_lon: number
        max_lat: number
      }
    }
  }
  styles?: {
    container?: ViewStyle
    textInputContainer?: ViewStyle
    textInput?: TextStyle
    listView?: ViewStyle
    row?: ViewStyle
    loader?: ViewStyle
    description?: TextStyle
    mainText?: TextStyle
    secondaryText?: TextStyle
    separator?: ViewStyle
    poweredContainer?: ViewStyle
    powered?: ViewStyle
  }
  fetchDetails?: boolean
  minLength?: number
  debounce?: number
  currentLocation?: boolean
  currentLocationLabel?: string
  renderLeftButton?: () => React.ReactNode
  renderRightButton?: () => React.ReactNode
  renderRow?: (data: GeoapifyFeature) => React.ReactNode
  enablePoweredByContainer?: boolean
  textInputProps?: any
  predefinedPlaces?: GeoapifyFeature[]
  predefinedPlacesAlwaysVisible?: boolean
  listEmptyComponent?: React.ReactNode
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never'
  keepResultsAfterBlur?: boolean
  autoFocus?: boolean
  numberOfLines?: number
  suppressDefaultStyles?: boolean
}

const GeoApiAutocomplete: React.FC<GeoApiAutocompleteProps> = ({
  placeholder = 'Search location',
  onPress,
  query = {},
  styles: customStyles = {},
  fetchDetails = false,
  minLength = 2,
  debounce = 300,
  currentLocation = false,
  currentLocationLabel = 'Current location',
  renderLeftButton,
  renderRightButton,
  renderRow,
  enablePoweredByContainer = true,
  textInputProps = {},
  predefinedPlaces = [],
  predefinedPlacesAlwaysVisible = false,
  listEmptyComponent,
  keyboardShouldPersistTaps = 'handled',
  keepResultsAfterBlur = false,
  autoFocus = false,
  numberOfLines = 1,
  suppressDefaultStyles = false,
}) => {
  const [text, setText] = useState('')
  const [predictions, setPredictions] = useState<GeoapifyFeature[]>(
    predefinedPlacesAlwaysVisible ? predefinedPlaces : [],
  )
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const isMounted = useRef(true)
  const textRef = useRef('')

  useEffect(() => {
    return () => {
      isMounted.current = false
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (predefinedPlacesAlwaysVisible) {
      setPredictions(predefinedPlaces)
    }
  }, [predefinedPlacesAlwaysVisible, predefinedPlaces])

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (input.length < minLength) {
        setPredictions(predefinedPlacesAlwaysVisible ? predefinedPlaces : [])
        return
      }

      if (!envs.GEOAPIFY_API_KEY) {
        console.error('GEOAPIFY_API_KEY is not set in environment variables')
        setPredictions(predefinedPlaces)
        return
      }

      setLoading(true)

      const params = new URLSearchParams({
        text: input,
        apiKey: envs.GEOAPIFY_API_KEY,
        format: 'json',
      })

      if (query.language) {
        params.append('lang', query.language)
      }
      if (query.type) {
        params.append('type', query.type)
      }
      if (query.limit) {
        params.append('limit', query.limit.toString())
      }
      if (query.bias) {
        params.append('bias', `proximity:${query.bias.lon},${query.bias.lat}`)
      }
      if (query.filter?.countrycodes) {
        params.append('filter', `countrycode:${query.filter.countrycodes.join(',')}`)
      } else if (query.filter?.circle) {
        params.append(
          'filter',
          `circle:${query.filter.circle.lon},${query.filter.circle.lat},${query.filter.circle.radius}`,
        )
      } else if (query.filter?.rect) {
        const { min_lon, min_lat, max_lon, max_lat } = query.filter.rect
        params.append('filter', `rect:${min_lon},${min_lat},${max_lon},${max_lat}`)
      }

      try {
        const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`)
        const data: GeoapifyAutocompleteResponse = await response.json()

        if (isMounted.current && input === textRef.current && data.features) {
          const allPredictions = [...predefinedPlaces, ...data.features]
          setPredictions(allPredictions)
        }
      } catch (error) {
        console.error('Error fetching predictions:', error)
        if (isMounted.current) {
          setPredictions(predefinedPlaces)
        }
      } finally {
        if (isMounted.current) {
          setLoading(false)
        }
      }
    },
    [query, minLength, predefinedPlaces, predefinedPlacesAlwaysVisible],
  )

  const fetchPlaceDetails = useCallback(
    async (placeId: string): Promise<GeoapifyFeature | null> => {
      if (!fetchDetails || !envs.GEOAPIFY_API_KEY) {
        return null
      }

      const params = new URLSearchParams({
        id: placeId,
        apiKey: envs.GEOAPIFY_API_KEY,
      })

      try {
        const response = await fetch(`https://api.geoapify.com/v2/place-details?${params}`)
        const data = await response.json()
        return data.features?.[0] || null
      } catch (error) {
        console.error('Error fetching place details:', error)
        return null
      }
    },
    [fetchDetails],
  )

  const handleTextChange = useCallback(
    (input: string) => {
      setText(input)
      textRef.current = input
      setShowResults(true)

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }

      debounceTimer.current = setTimeout(() => {
        fetchPredictions(input)
      }, debounce)
    },
    [fetchPredictions, debounce],
  )

  const handlePredictionPress = useCallback(
    async (prediction: GeoapifyFeature) => {
      const displayText =
        prediction.properties.formatted ||
        prediction.properties.name ||
        `${prediction.properties.address_line1}, ${prediction.properties.address_line2}`
      setText(displayText)
      setShowResults(false)
      setPredictions([])
      Keyboard.dismiss()

      const details = prediction.properties.place_id ? await fetchPlaceDetails(prediction.properties.place_id) : null

      onPress(prediction, details || prediction)
    },
    [fetchPlaceDetails, onPress],
  )

  const renderPredictionRow = useCallback(
    (item: GeoapifyFeature) => {
      if (renderRow) {
        return renderRow(item)
      }

      const mainText =
        item.properties.name ||
        item.properties.address_line1 ||
        item.properties.street ||
        item.properties.formatted?.split(',')[0]

      const secondaryText =
        item.properties.address_line2 ||
        (item.properties.formatted && item.properties.formatted.split(',').slice(1).join(',').trim()) ||
        `${item.properties.city || ''} ${item.properties.state || ''} ${item.properties.country || ''}`.trim()

      return (
        <TouchableOpacity style={[styles.row, customStyles.row]} onPress={() => handlePredictionPress(item)}>
          <View>
            {mainText && (
              <Text style={[styles.mainText, customStyles.mainText]} numberOfLines={1}>
                {mainText}
              </Text>
            )}
            {secondaryText && (
              <Text style={[styles.secondaryText, customStyles.secondaryText]} numberOfLines={1}>
                {secondaryText}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )
    },
    [renderRow, customStyles, handlePredictionPress],
  )

  const shouldShowPredictions = showResults && (predictions.length > 0 || predefinedPlacesAlwaysVisible)

  const defaultStyles = suppressDefaultStyles ? {} : styles

  return (
    <View style={[defaultStyles.container, customStyles.container]}>
      <View style={[defaultStyles.textInputContainer, customStyles.textInputContainer]}>
        {renderLeftButton && renderLeftButton()}
        <TextInput
          style={[defaultStyles.textInput, customStyles.textInput]}
          placeholder={placeholder}
          value={text}
          onChangeText={handleTextChange}
          onFocus={() => setShowResults(true)}
          onBlur={() => !keepResultsAfterBlur && setShowResults(false)}
          autoFocus={autoFocus}
          numberOfLines={numberOfLines}
          {...textInputProps}
        />
        {loading && <ActivityIndicator style={[defaultStyles.loader, customStyles.loader]} size="small" />}
        {renderRightButton && renderRightButton()}
      </View>

      {shouldShowPredictions && (
        <FlatList
          data={predictions}
          keyExtractor={(item, index) => item.properties.place_id || `${index}`}
          renderItem={({ item }) => renderPredictionRow(item)}
          style={[defaultStyles.listView, customStyles.listView]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          ItemSeparatorComponent={() => <View style={[defaultStyles.separator, customStyles.separator]} />}
          ListEmptyComponent={listEmptyComponent}
        />
      )}

      {enablePoweredByContainer && shouldShowPredictions && (
        <View style={[defaultStyles.poweredContainer, customStyles.poweredContainer]}>
          <Text style={[defaultStyles.powered, customStyles.powered]}>Powered by Geoapify</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  textInputContainer: {
    flexDirection: 'row',
    backgroundColor: surfaces.secondary,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 40,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.sm + 2,
    backgroundColor: surfaces.input,
    borderRadius: borderRadius.sm + 1,
    color: text.primary,
  },
  listView: {
    backgroundColor: surfaces.secondary,
    marginHorizontal: spacing.sm + 2,
    elevation: 3,
    shadowColor: colors.backgroundColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    maxHeight: 200,
  },
  row: {
    padding: spacing.md + 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainText: {
    fontSize: fontSize.md - 1,
    color: text.primary,
    fontWeight: fontWeight.medium,
  },
  secondaryText: {
    fontSize: fontSize.sm - 1,
    color: text.secondary,
    marginTop: 2,
  },
  description: {
    fontSize: fontSize.sm,
    color: text.primary,
  },
  loader: {
    marginLeft: spacing.sm + 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderColor,
  },
  poweredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xs + 1,
    marginHorizontal: spacing.sm + 2,
    marginTop: 2,
    backgroundColor: surfaces.secondary,
    borderBottomLeftRadius: borderRadius.sm + 1,
    borderBottomRightRadius: borderRadius.sm + 1,
  },
  powered: {
    fontSize: fontSize.xs - 1,
    color: text.muted,
  },
})

export default GeoApiAutocomplete
export type { GeoapifyFeature, GeoApiAutocompleteProps }
