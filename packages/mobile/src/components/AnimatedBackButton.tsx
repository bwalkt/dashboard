import { colors } from '@pzero/shared/theme'
import type React from 'react'
import { useRef } from 'react'
import { Animated, TouchableOpacity, type ViewStyle } from 'react-native'
import { Text } from 'react-native-ui-lib'

interface AnimatedBackButtonProps {
  onPress: () => void
  style?: ViewStyle
}

const AnimatedBackButton: React.FC<AnimatedBackButtonProps> = ({ onPress, style }) => {
  const backButtonScale = useRef(new Animated.Value(1)).current
  const backButtonOpacity = useRef(new Animated.Value(1)).current

  const animateBackButtonPress = () => {
    // Quick press down animation
    Animated.parallel([
      Animated.spring(backButtonScale, {
        toValue: 0.92,
        tension: 300,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(backButtonOpacity, {
        toValue: 0.7,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start()

    // Execute navigation after a brief delay for visual feedback
    setTimeout(() => {
      // Spring back animation
      Animated.parallel([
        Animated.spring(backButtonScale, {
          toValue: 1,
          tension: 300,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(backButtonOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start()

      onPress()
    }, 80)
  }

  return (
    <TouchableOpacity onPress={animateBackButtonPress} activeOpacity={1}>
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: backButtonScale }],
            opacity: backButtonOpacity,
          },
        ]}
      >
        <Text text60 color={colors.textLightColor}>
          ←
        </Text>
      </Animated.View>
    </TouchableOpacity>
  )
}

export default AnimatedBackButton
