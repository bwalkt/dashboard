import { colors } from '@pzero/shared/theme'
import type React from 'react'
import type { TextStyle } from 'react-native'
import { Text } from 'react-native-ui-lib'

interface InstructionTextProps {
  children: string
  style?: TextStyle
}

const InstructionText: React.FC<InstructionTextProps> = ({ children, style }) => {
  return (
    <Text text70 color={colors.textDarkColor} center marginB-20 style={style}>
      {children}
    </Text>
  )
}

export default InstructionText
