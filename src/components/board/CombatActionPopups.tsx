import React from 'react'

export type ComicActionWord =
  | 'POW!'
  | 'BAM!'
  | 'CRUNCH!'
  | 'ZAP!'
  | 'BLOCKED!'
  | 'DEADLY!'
  | 'STRIKE!'
  | 'BULLSEYE!'

export interface CombatPopupItem {
  id: string
  laneIndex: number
  target: 'zombieHero' | 'plantHero' | 'zombieMinion' | 'plantMinion'
  word: ComicActionWord | string
  damage?: number
  targetSide: 'plants' | 'zombies'
  isBlocked?: boolean
  isDeadly?: boolean
  rotation?: number // in degrees (-12 to +12)
}

export interface CombatActionPopupsProps {
  popups: CombatPopupItem[]
}

/**
 * Determine the comic action word based on combat attributes
 */
export function getComicActionWord(options: {
  damage?: number
  isBlocked?: boolean
  isDeadly?: boolean
  traits?: string[]
}): ComicActionWord {
  const { damage = 0, isBlocked = false, isDeadly = false, traits = [] } = options

  if (isBlocked) return 'BLOCKED!'
  if (isDeadly) return 'DEADLY!'
  if (traits.some((t) => t.toLowerCase().includes('bullseye'))) return 'BULLSEYE!'
  if (traits.some((t) => t.toLowerCase().includes('strike'))) return 'STRIKE!'

  if (damage >= 5) return 'CRUNCH!'
  if (damage >= 3) return 'BAM!'
  if (damage === 2) return Math.random() > 0.5 ? 'POW!' : 'ZAP!'
  return 'POW!'
}

export const CombatActionPopups: React.FC<CombatActionPopupsProps> = ({ popups }) => {
  if (popups.length === 0) return null

  return (
    <div className="pvz-comic-popups-layer" aria-hidden="true">
      {popups.map((popup) => {
        const isZombieTarget = popup.targetSide === 'zombies'
        const isHeroTarget = popup.target === 'plantHero' || popup.target === 'zombieHero'
        const isZombieHero = popup.target === 'zombieHero'
        const isPlantHero = popup.target === 'plantHero'
        const isZombieMinion = popup.target === 'zombieMinion'

        let topPos = '50%'
        let leftPos = `calc(${popup.laneIndex * 20}% + 10%)`

        if (isZombieHero) {
          topPos = '10%'
          leftPos = `calc(${popup.laneIndex * 20}% + 10%)`
        } else if (isPlantHero) {
          topPos = '86%'
          leftPos = `calc(${popup.laneIndex * 20}% + 10%)`
        } else if (isZombieMinion) {
          topPos = '30%'
        } else {
          topPos = '70%'
        }

        const rotationDeg = popup.rotation ?? ((popup.laneIndex * 5 + 3) % 17 - 8)
        const wordKey = popup.word.toUpperCase().replace('!', '')

        return (
          <div
            key={popup.id}
            className={`comic-action-popup-item popup-word-${wordKey.toLowerCase()} ${
              isZombieTarget ? 'target-is-zombie' : 'target-is-plant'
            } ${isHeroTarget ? 'popup-on-hero' : 'popup-on-minion'}`}
            style={{
              top: topPos,
              left: leftPos,
              transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`,
            }}
          >
            {/* Comic Starburst Splat Background */}
            <div className="comic-starburst-bg">
              <div className="starburst-ray ray-1" />
              <div className="starburst-ray ray-2" />
              <div className="starburst-ray ray-3" />
            </div>

            {/* Action Text & Damage Banner */}
            <div className="comic-popup-content">
              <span className="comic-action-word">{popup.word}</span>
              {popup.damage !== undefined && popup.damage > 0 && !popup.isBlocked && (
                <span className="comic-damage-number">-{popup.damage}</span>
              )}
            </div>

            {/* Trait or Shield Sparkle icon */}
            {popup.isBlocked && <span className="comic-accent-icon">🛡️</span>}
            {popup.isDeadly && <span className="comic-accent-icon">☠️</span>}
            {popup.word === 'ZAP!' && <span className="comic-accent-icon">⚡</span>}
          </div>
        )
      })}
    </div>
  )
}

export default CombatActionPopups
