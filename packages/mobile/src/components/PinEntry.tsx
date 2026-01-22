import type React from 'react'
import { useState } from 'react'
import { Alert, StyleSheet, TouchableOpacity } from 'react-native'
import { Text, View } from 'react-native-ui-lib'
import { borderRadius, colors, fontSize, fontWeight, spacing, surfaces, text } from '../theme'

const PIN_LENGTH = 6

interface PinEntryProps {
  onPinEntered: (pin: string) => Promise<boolean>
  onCancel?: () => void
  title?: string
  subtitle?: string
}

const PinEntry: React.FC<PinEntryProps> = ({
  onPinEntered,
  onCancel,
  title = 'Enter PIN',
  subtitle = 'Enter your 6-digit PIN to continue',
}) => {
  const [pin, setPin] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const handleNumberPress = async (num: string) => {
    if (isVerifying) return

    setPin(prev => {
      if (prev.length >= PIN_LENGTH) return prev

      const newPin = prev + num

      if (newPin.length === PIN_LENGTH) {
        // Trigger verification asynchronously
        setIsVerifying(true)
        onPinEntered(newPin)
          .then(isValid => {
            if (!isValid) {
              setPin('')
              Alert.alert('Invalid PIN', 'The PIN you entered is incorrect. Please try again.')
            }
          })
          .catch(error => {
            console.error('PIN verification error:', error)
            setPin('')
            Alert.alert('Error', 'Something went wrong verifying your PIN. Please try again.')
          })
          .finally(() => {
            setIsVerifying(false)
          })
      }

      return newPin
    })
  }

  const handleBackspace = () => {
    if (isVerifying) return
    setPin(prev => prev.slice(0, -1))
  }

  const renderPinDots = () => {
    return (
      <View style={styles.pinDotsContainer}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <View key={index} style={[styles.pinDot, index < pin.length && styles.pinDotFilled]} />
        ))}
      </View>
    )
  }

  const renderNumberButton = (num: string) => (
    <TouchableOpacity
      key={num}
      style={styles.numberButton}
      onPress={() => handleNumberPress(num)}
      disabled={isVerifying}
    >
      <Text style={styles.numberButtonText}>{num}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {renderPinDots()}

      <View style={styles.keypadContainer}>
        <View style={styles.keypadRow}>
          {renderNumberButton('1')}
          {renderNumberButton('2')}
          {renderNumberButton('3')}
        </View>
        <View style={styles.keypadRow}>
          {renderNumberButton('4')}
          {renderNumberButton('5')}
          {renderNumberButton('6')}
        </View>
        <View style={styles.keypadRow}>
          {renderNumberButton('7')}
          {renderNumberButton('8')}
          {renderNumberButton('9')}
        </View>
        <View style={styles.keypadRow}>
          {onCancel && (
            <TouchableOpacity style={styles.numberButton} onPress={onCancel} disabled={isVerifying}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          {renderNumberButton('0')}
          <TouchableOpacity style={styles.numberButton} onPress={handleBackspace} disabled={isVerifying}>
            <Text style={styles.backspaceButtonText}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl + 4,
    fontWeight: fontWeight.bold,
    color: text.primary,
    marginBottom: spacing.sm + 2,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: text.secondary,
    marginBottom: 40,
    textAlign: 'center',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: surfaces.secondary,
    marginHorizontal: spacing.sm,
  },
  pinDotFilled: {
    backgroundColor: colors.primaryColor,
  },
  keypadContainer: {
    width: '100%',
    maxWidth: 300,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  numberButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: surfaces.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  numberButtonText: {
    fontSize: fontSize.xxl + 4,
    color: text.primary,
    fontWeight: fontWeight.normal,
  },
  backspaceButtonText: {
    fontSize: fontSize.xxl + 4,
    color: text.primary,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    color: text.secondary,
  },
})

export default PinEntry
