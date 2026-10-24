import React from 'react'
import type { Card as CardType, Side } from '../../engine/types'
import { SuperpowerModal } from '../modals/SuperpowerModal'

export interface SuperBlockModalProps {
  side: Side
  superpower: CardType
  onPlaySuperpower: () => void
  onSaveSuperpower: () => void
}

/**
 * SuperBlockModal - delegates to SuperpowerModal with radiant sunburst and dual-choice action buttons
 */
export const SuperBlockModal: React.FC<SuperBlockModalProps> = (props) => {
  return <SuperpowerModal {...props} />
}

export default SuperBlockModal
export { SuperpowerModal }
