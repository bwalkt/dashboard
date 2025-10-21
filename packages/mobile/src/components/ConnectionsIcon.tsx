import type React from 'react'
import Svg, { Circle, Line } from 'react-native-svg'

interface ConnectionsIconProps {
  size?: number
  color?: string
}

const ConnectionsIcon: React.FC<ConnectionsIconProps> = ({ size = 24, color = '#ffffff' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Central hub circle */}
      <Circle cx="12" cy="12" r="3" fill="none" stroke={color} strokeWidth="2" />

      {/* Connection lines */}
      <Line x1="12" y1="1" x2="12" y2="9" stroke={color} strokeWidth="2" />
      <Line x1="12" y1="15" x2="12" y2="23" stroke={color} strokeWidth="2" />
      <Line x1="4.22" y1="4.22" x2="10.05" y2="10.05" stroke={color} strokeWidth="2" />
      <Line x1="13.95" y1="13.95" x2="19.78" y2="19.78" stroke={color} strokeWidth="2" />
      <Line x1="1" y1="12" x2="9" y2="12" stroke={color} strokeWidth="2" />
      <Line x1="15" y1="12" x2="23" y2="12" stroke={color} strokeWidth="2" />

      {/* Endpoint circles */}
      <Circle cx="12" cy="2" r="2" fill={color} />
      <Circle cx="12" cy="22" r="2" fill={color} />
      <Circle cx="22" cy="12" r="2" fill={color} />
      <Circle cx="2" cy="12" r="2" fill={color} />
      <Circle cx="4.22" cy="4.22" r="2" fill={color} />
      <Circle cx="19.78" cy="19.78" r="2" fill={color} />
    </Svg>
  )
}

export default ConnectionsIcon
