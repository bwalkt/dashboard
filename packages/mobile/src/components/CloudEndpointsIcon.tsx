import type React from 'react'
import Svg, { Polygon } from 'react-native-svg'

interface CloudEndpointsIconProps {
  size?: number
  color?: string
}

const CloudEndpointsIcon: React.FC<CloudEndpointsIconProps> = ({ size = 24, color = '#4285f4' }) => {
  const secondaryColor = color === '#4285f4' ? '#aecbfa' : `${color}80` // Add opacity for secondary color

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Main center diamond */}
      <Polygon points="15 10 9 10 8 12 9 14 15 14 16 12 15 10" fill={color} />
      <Polygon points="16 12 15 10 9.51 10 9 10 8 12 16 12" fill={secondaryColor} />

      {/* Right endpoint */}
      <Polygon points="18 6 15 6 18.97 12 20.47 9.75 18 6" fill={color} />
      <Polygon points="21.95 12 20.47 9.75 18.97 12 18.97 12 15 18 18 18 21.95 12" fill={secondaryColor} />

      {/* Left endpoint */}
      <Polygon points="5.95 18 8.95 18 4.98 12 3.48 14.25 5.95 18" fill={color} />
      <Polygon points="2 12 3.48 14.25 4.98 12 4.98 12 8.95 6 5.95 6 2 12" fill={secondaryColor} />
    </Svg>
  )
}

export default CloudEndpointsIcon
