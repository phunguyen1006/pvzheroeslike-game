import React, { useState } from 'react'
import { PLANT_HEROES, ZOMBIE_HEROES } from '../../data/cards'
import type { HeroData } from '../../data/cards'
import type { AIDifficulty } from '../../engine/ai'
import { soundManager } from '../../audio/SoundManager'
import { ASSET_MANIFEST } from '../../data/assetsManifest'

export interface HeroSelectProps {
  onSelectHeroes: (plantHeroId: string, zombieHeroId: string, difficulty?: AIDifficulty) => void
  onBack: () => void
}

const CLASS_ICON_MAP: Record<string, string> = {
  Guardian: ASSET_MANIFEST.traits.Plant_Class_Guardian,
  Kabloom: ASSET_MANIFEST.traits.Plant_Class_Kabloom,
  'Mega-Grow': ASSET_MANIFEST.traits.Plant_Class_MegaGrow,
  Smarty: ASSET_MANIFEST.traits.Plant_Class_Smarty,
  Solar: ASSET_MANIFEST.traits.Plant_Class_Solar,
  Beastly: ASSET_MANIFEST.traits.Zombie_Class_Beastly,
  Brainy: ASSET_MANIFEST.traits.Zombie_Class_Brainy,
  Crazy: ASSET_MANIFEST.traits.Zombie_Class_Crazy,
  Hearty: ASSET_MANIFEST.traits.Zombie_Class_Hearty,
  Sneaky: ASSET_MANIFEST.traits.Zombie_Class_Sneaky,
}

export const HeroSelect: React.FC<HeroSelectProps> = ({ onSelectHeroes, onBack }) => {
  const [selectedPlantHero, setSelectedPlantHero] = useState<HeroData>(PLANT_HEROES[5]) // Green Shadow default
  const [selectedZombieHero, setSelectedZombieHero] = useState<HeroData>(ZOMBIE_HEROES[8]) // Super Brainz default
  const [difficulty, setDifficulty] = useState<AIDifficulty>('normal')

  const handlePickPlant = (hero: HeroData) => {
    setSelectedPlantHero(hero)
    soundManager.playCardDrop()
  }

  const handlePickZombie = (hero: HeroData) => {
    setSelectedZombieHero(hero)
    soundManager.playCardDrop()
  }

  const handleStart = () => {
    soundManager.playPhaseChange()
    onSelectHeroes(selectedPlantHero.id, selectedZombieHero.id, difficulty)
  }

  return (
    <div className="hero-select-container">
      <div className="hero-select-header">
        <button className="back-btn" onClick={onBack}>
          ⬅ QUAY LẠI
        </button>
        <h1 className="select-title">CHỌN ANH HÙNG XUẤT TRẬN</h1>
      </div>

      {/* AI Difficulty Selector */}
      <div className="ai-difficulty-bar">
        <span className="diff-label">Độ khó AI Zombie:</span>
        <div className="diff-button-group">
          {(['easy', 'normal', 'expert'] as AIDifficulty[]).map((level) => (
            <button
              key={level}
              className={`diff-btn ${difficulty === level ? 'active-diff' : ''}`}
              onClick={() => {
                setDifficulty(level)
                soundManager.playCardDrop()
              }}
            >
              {level === 'easy' ? '🌱 Dễ (Tập sự)' : level === 'normal' ? '⚔️ Vừa (Tiêu chuẩn)' : '🔥 Khó (Chiến thuật)'}
            </button>
          ))}
        </div>
      </div>

      <div className="hero-select-columns">
        {/* Plant Heroes Column */}
        <div className="hero-faction-column plant-faction-column">
          <h2 className="faction-heading">🌱 ANH HÙNG PLANTS (BẠN)</h2>
          <div className="hero-card-grid">
            {PLANT_HEROES.map((hero) => (
              <div
                key={hero.id}
                className={`hero-pick-card ${selectedPlantHero.id === hero.id ? 'active-hero-pick' : ''}`}
                onClick={() => handlePickPlant(hero)}
              >
                <div className="hero-pick-avatar-frame">
                  <img src={hero.avatar} alt={hero.name} className="hero-pick-img" />
                </div>
                <span className="hero-pick-name">{hero.name}</span>
                <div className="hero-pick-class-badges">
                  {hero.classes.map((cls) => {
                    const icon = CLASS_ICON_MAP[cls]
                    return (
                      <span key={cls} className="hero-class-pill-tag" title={cls}>
                        {icon && <img src={icon} alt={cls} className="hero-class-badge-img" />}
                        <span className="class-pill-text">{cls}</span>
                      </span>
                    )
                  })}
                </div>
                <div className="hero-pick-sp-badge" title={hero.superPowerDescription}>
                  <span className="sp-star-icon">⭐</span>
                  <span className="hero-pick-sp">{hero.superPower}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zombie Heroes Column */}
        <div className="hero-faction-column zombie-faction-column">
          <h2 className="faction-heading">🧟 ANH HÙNG ZOMBIES (AI)</h2>
          <div className="hero-card-grid">
            {ZOMBIE_HEROES.map((hero) => (
              <div
                key={hero.id}
                className={`hero-pick-card ${selectedZombieHero.id === hero.id ? 'active-hero-pick' : ''}`}
                onClick={() => handlePickZombie(hero)}
              >
                <div className="hero-pick-avatar-frame">
                  <img src={hero.avatar} alt={hero.name} className="hero-pick-img" />
                </div>
                <span className="hero-pick-name">{hero.name}</span>
                <div className="hero-pick-class-badges">
                  {hero.classes.map((cls) => {
                    const icon = CLASS_ICON_MAP[cls]
                    return (
                      <span key={cls} className="hero-class-pill-tag" title={cls}>
                        {icon && <img src={icon} alt={cls} className="hero-class-badge-img" />}
                        <span className="class-pill-text">{cls}</span>
                      </span>
                    )
                  })}
                </div>
                <div className="hero-pick-sp-badge" title={hero.superPowerDescription}>
                  <span className="sp-star-icon">⭐</span>
                  <span className="hero-pick-sp">{hero.superPower}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hero-select-footer">
        <button className="start-match-btn" onClick={handleStart}>
          ⚔️ BẮT ĐẦU ĐỐI ĐẦU ({selectedPlantHero.name} VS {selectedZombieHero.name})
        </button>
      </div>
    </div>
  )
}

export default HeroSelect
