import { useState } from 'react'
import './App.css'

type Team = 'plants' | 'zombies'

type Card = {
  name: string
  cost: number
  image: string
}

const plantHand: Card[] = [
  { name: 'Peashooter', cost: 1, image: '/assets/cards/plants/Peashooter.png' },
  { name: 'Sunflower', cost: 1, image: '/assets/cards/plants/Sunflower.png' },
  { name: 'Wall-Nut', cost: 1, image: '/assets/cards/plants/Wall-Nut.png' },
  { name: 'Snow Pea', cost: 2, image: '/assets/cards/plants/Snow Pea.png' },
  { name: 'Bonk Choy', cost: 1, image: '/assets/cards/plants/Bonk Choy.png' },
]

const lanes = ['Left Heights', 'Lane 2', 'Water Lane', 'Lane 4', 'Right Heights']

function HeroPanel({ team }: { team: Team }) {
  const plant = team === 'plants'
  const heroName = plant ? 'Green Shadow' : 'Super Brainz'
  const heroImage = plant
    ? '/assets/heroes/plants/Green Shadow.png'
    : '/assets/heroes/zombies/Super Brainz.png'

  return (
    <aside className={`hero-panel ${team}`} aria-label={`${heroName} hero status`}>
      <img className="hero-art" src={heroImage} alt={heroName} />
      <div className="hero-copy">
        <span className="team-label">{plant ? 'Plants' : 'Zombies'}</span>
        <strong>{heroName}</strong>
        <span className="class-label">{plant ? 'Smarty / Guardian' : 'Brainy / Sneaky'}</span>
      </div>
      <div className="health" aria-label="20 health">
        <span>20</span>
        <small>HP</small>
      </div>
      <div className="block-meter" aria-label="Super-Block meter: 0 of 8">
        {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
      </div>
    </aside>
  )
}

function App() {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [playedLanes, setPlayedLanes] = useState<Record<number, string>>({})
  const [status, setStatus] = useState('Choose a Plant card, then select an open lane.')

  const playToLane = (lane: number) => {
    if (!selectedCard) {
      setStatus('Select a card from your hand first.')
      return
    }

    if (playedLanes[lane]) {
      setStatus(`${lanes[lane]} already has ${playedLanes[lane]}.`)
      return
    }

    setPlayedLanes((current) => ({ ...current, [lane]: selectedCard.name }))
    setStatus(`${selectedCard.name} deployed to ${lanes[lane]}.`)
    setSelectedCard(null)
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <img className="game-logo" src="/assets/board/Game_Logo.png" alt="Plants vs. Zombies Heroes" />
        <div className="phase-tracker" aria-label="Match phases">
          <span className="active">1. Zombie Minions</span>
          <span>2. Plant Turn</span>
          <span>3. Zombie Tricks</span>
          <span>4. Combat</span>
        </div>
        <span className="preview-badge">Web Preview</span>
      </header>

      <section className="battle-layout" aria-label="PvZ Heroes five-lane battle board">
        <HeroPanel team="zombies" />

        <section className="board-wrap" aria-label="Five-lane battlefield">
          <img className="board-art" src="/assets/board/Board_Lawn_5_Lanes.png" alt="Five-lane game board" />
          <div className="lane-grid">
            {lanes.map((lane, index) => (
              <button
                className={`lane ${index === 2 ? 'water' : ''} ${playedLanes[index] ? 'occupied' : ''}`}
                key={lane}
                type="button"
                onClick={() => playToLane(index)}
                aria-label={`Deploy selected card to ${lane}`}
              >
                <span className="lane-number">{index + 1}</span>
                {playedLanes[index] && <span className="deployed-card">{playedLanes[index]}</span>}
                <span className="lane-name">{lane}</span>
              </button>
            ))}
          </div>
        </section>

        <HeroPanel team="plants" />
      </section>

      <section className="turn-console" aria-label="Plant player controls">
        <div className="resource-counter">
          <img src="/assets/traits/Resource_Brain.png" alt="" />
          <span><strong>1</strong> / 1 Sun</span>
        </div>
        <p role="status" className="match-status">{status}</p>
        <button type="button" className="end-turn" onClick={() => setStatus('Turn ended — engine integration pending.')}>End Plant Turn</button>
      </section>

      <section className="hand-section" aria-labelledby="hand-title">
        <div className="hand-heading">
          <div>
            <span className="eyebrow">Player Hand</span>
            <h1 id="hand-title">Choose a Plant</h1>
          </div>
          <span className="selection-state">{selectedCard ? `${selectedCard.name} selected` : 'No card selected'}</span>
        </div>
        <div className="card-hand">
          {plantHand.map((card) => (
            <button
              className={`card ${selectedCard?.name === card.name ? 'selected' : ''}`}
              key={card.name}
              type="button"
              onClick={() => {
                setSelectedCard(card)
                setStatus(`${card.name} selected. Choose a lane to deploy it.`)
              }}
              aria-pressed={selectedCard?.name === card.name}
            >
              <img src={card.image} alt={card.name} />
              <span className="cost">{card.cost}</span>
              <span className="card-title">{card.name}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
