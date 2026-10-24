import React from 'react'

export interface Projectile {
  id: string
  laneIndex: number
  sourceSide: 'plants' | 'zombies'
  targetType: 'minion' | 'hero'
  type?: 'pea' | 'beam' | 'zombie_blast' | 'strikethrough'
}

export interface FloatingTextItem {
  id: string
  laneIndex: number
  target: 'zombieHero' | 'plantHero' | 'zombieMinion' | 'plantMinion'
  text: string
  type: 'damage' | 'heal' | 'block' | 'frenzy' | 'deadly' | 'bullseye' | 'strikethrough'
}

export interface CombatVFXLayerProps {
  projectiles: Projectile[]
  floatingTexts: FloatingTextItem[]
}

export const CombatVFXLayer: React.FC<CombatVFXLayerProps> = ({
  projectiles,
  floatingTexts,
}) => {
  return (
    <div className="pvz-combat-vfx-layer" aria-hidden="true">
      {/* 1. Animated Projectiles in Flight */}
      {projectiles.map((proj) => {
        const isPlant = proj.sourceSide === 'plants'
        const isToHero = proj.targetType === 'hero'

        return (
          <div
            key={proj.id}
            className={`combat-projectile lane-proj-${proj.laneIndex} ${
              isPlant ? 'plant-projectile' : 'zombie-projectile'
            } ${isToHero ? 'targeting-hero' : 'targeting-minion'}`}
            style={{
              left: `calc(${proj.laneIndex * 20}% + 10%)`,
            }}
          >
            {isPlant ? (
              <div className="pea-projectile-ball">
                <div className="pea-inner-core" />
                <div className="pea-trail-glow" />
              </div>
            ) : (
              <div className="zombie-energy-blast">
                <div className="zombie-blast-core" />
                <div className="zombie-blast-sparks" />
              </div>
            )}
          </div>
        )
      })}

      {/* 2. Floating Combat Numbers & Trait Badges */}
      {floatingTexts.map((item) => {
        const isHeroTarget = item.target === 'plantHero' || item.target === 'zombieHero'
        const isZombieHero = item.target === 'zombieHero'
        const isPlantHero = item.target === 'plantHero'
        const isZombieMinion = item.target === 'zombieMinion'

        let topPosition = '50%'
        let leftPosition = `calc(${item.laneIndex * 20}% + 10%)`

        if (isZombieHero) {
          topPosition = '8%'
          leftPosition = '12%'
        } else if (isPlantHero) {
          topPosition = '88%'
          leftPosition = '88%'
        } else if (isZombieMinion) {
          topPosition = '28%'
        } else {
          topPosition = '72%'
        }

        return (
          <div
            key={item.id}
            className={`combat-floating-indicator text-type-${item.type} ${
              isHeroTarget ? 'floating-on-hero' : 'floating-on-minion'
            }`}
            style={{
              top: topPosition,
              left: leftPosition,
            }}
          >
            <span className="indicator-text">{item.text}</span>
          </div>
        )
      })}
    </div>
  )
}

export default CombatVFXLayer
