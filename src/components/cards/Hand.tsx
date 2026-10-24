import React, { useState, useEffect, useRef } from 'react'
import { Card } from './Card'
import type { Card as CardType } from '../../engine/types'

export interface HandProps {
  cards: CardType[]
  currentResource: number
  selectedCardId?: string
  isPlayerTurn: boolean
  onSelectCard: (card: CardType) => void
  onDragStartCard?: (card: CardType) => void
  onDragEndCard?: () => void
  side?: 'plants' | 'zombies'
  onInspectCard?: (card: CardType) => void
}

export const Hand: React.FC<HandProps> = ({
  cards,
  currentResource,
  selectedCardId,
  isPlayerTurn,
  onSelectCard,
  onDragStartCard,
  onDragEndCard,
  side = 'plants',
  onInspectCard,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [newlyDrawnKeys, setNewlyDrawnKeys] = useState<Set<string>>(new Set())
  const prevCardsRef = useRef<CardType[]>(cards)
  const isInitialMount = useRef(true)

  // Animated Card Draw Effect: Detect new cards drawn and trigger slide-in + 1.5s gold glow
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      prevCardsRef.current = cards
      return
    }

    const prevCards = prevCardsRef.current
    if (cards.length > prevCards.length) {
      const addedKeys = new Set<string>()
      // Check cards appended or inserted
      for (let i = prevCards.length; i < cards.length; i++) {
        addedKeys.add(`${cards[i].id}-${i}`)
      }
      cards.forEach((c, idx) => {
        if (!prevCards.some((pc) => pc === c)) {
          addedKeys.add(`${c.id}-${idx}`)
        }
      })

      if (addedKeys.size > 0) {
        setNewlyDrawnKeys(addedKeys)
        const timer = setTimeout(() => {
          setNewlyDrawnKeys(new Set())
        }, 1500)
        prevCardsRef.current = cards
        return () => clearTimeout(timer)
      }
    }
    prevCardsRef.current = cards
  }, [cards])

  const totalCards = cards.length
  const centerIndex = (totalCards - 1) / 2

  return (
    <div className={`pvz-hand-dock ${side}-hand-dock`}>
      <div className="hand-cards-arc-container">
        {cards.map((card, index) => {
          const isPlayable = isPlayerTurn && card.cost <= currentResource
          const isSelected = card.id === selectedCardId
          const isHovered = hoveredIndex === index

          // Calculate fan angle and vertical curve offset
          const offsetFromCenter = index - centerIndex
          // Dynamic rotation: adjust step based on hand count
          const maxAngle = Math.min(24, totalCards * 4)
          const angleStep = totalCards > 1 ? (maxAngle * 2) / (totalCards - 1) : 0
          const baseRotation = offsetFromCenter * (angleStep || 4)

          // Parabolic curve (edges dip downward)
          const curveY = Math.abs(offsetFromCenter) * (totalCards > 5 ? 5 : 4)

          // Horizontal overlap adjustment so cards fit naturally without crowding action button
          const overlapOffset = offsetFromCenter * (totalCards > 6 ? -30 : totalCards > 4 ? -22 : -14)

          // On hover or selection, straighten up and elevate significantly for crystal clear inspection
          const finalRotation = isHovered || isSelected ? 0 : baseRotation
          const finalTranslateY = isSelected ? -36 : isHovered ? -48 : curveY
          const finalScale = isHovered ? 1.32 : isSelected ? 1.12 : 1.0
          const finalZIndex = isHovered ? 300 : isSelected ? 200 : index + 10

          const isNewlyDrawn = newlyDrawnKeys.has(`${card.id}-${index}`)

          return (
            <div
              key={`${card.id}-${index}`}
              className={`fan-card-slot ${isSelected ? 'slot-selected' : ''} ${
                isPlayable ? 'slot-playable' : ''
              } ${isNewlyDrawn ? 'card-slot-newly-drawn' : ''}`}
              style={{
                transform: `translateX(${overlapOffset}px) translateY(${finalTranslateY}px) rotate(${finalRotation}deg) scale(${finalScale})`,
                zIndex: finalZIndex,
                transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), z-index 0.1s ease',
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              draggable={isPlayable}
              onDragStart={(e) => {
                if (isPlayable) {
                  e.dataTransfer.setData('text/plain', card.id)
                  e.dataTransfer.effectAllowed = 'move'
                  onDragStartCard?.(card)
                }
              }}
              onDragEnd={() => {
                onDragEndCard?.()
              }}
            >
              {isNewlyDrawn && <div className="new-card-gold-glow" aria-hidden="true" />}
              <Card
                card={card}
                isSelected={isSelected}
                isPlayable={isPlayable}
                onClick={() => onSelectCard(card)}
                onInspect={onInspectCard}
                size="sm"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Hand
