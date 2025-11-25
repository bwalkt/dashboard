import type React from 'react'
import Svg, { Path } from 'react-native-svg'
import { text } from '../theme'

interface TrashIconProps {
  size?: number
  color?: string
}

const TrashIcon: React.FC<TrashIconProps> = ({ size = 20, color = text.primary }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export default TrashIcon
