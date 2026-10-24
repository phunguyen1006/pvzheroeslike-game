import React from 'react'
import { GameOverModal as ModernGameOverModal, type GameOverModalProps } from '../modals/GameOverModal'

export type { GameOverModalProps }

/**
 * GameOverModal - delegates to ModernGameOverModal with celebratory confetti & match statistics
 */
export const GameOverModal: React.FC<GameOverModalProps> = (props) => {
  return <ModernGameOverModal {...props} />
}

export default GameOverModal
export { ModernGameOverModal }
