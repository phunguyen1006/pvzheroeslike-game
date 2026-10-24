import React from 'react'
import type { Card as CardType, Side } from '../../engine/types'
import { MulliganScreen } from '../modals/MulliganScreen'

export interface MulliganModalProps {
  cards: CardType[]
  superpower?: CardType
  side: Side
  onConfirmMulligan: (selectedIndices: number[]) => void
}

/**
 * MulliganModal - delegates to MulliganScreen with 3D card flip & comic styling
 */
export const MulliganModal: React.FC<MulliganModalProps> = (props) => {
  return <MulliganScreen {...props} />
}

export default MulliganModal
export { MulliganScreen }
