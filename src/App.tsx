import { useReducer, useState, useEffect, useRef } from 'react'
import {
  gameReducer,
  createInitialGameState,
  getAITurnPlan,
} from './engine'
import type { Card as CardType } from './engine/types'
import { resolveSingleLaneCombat } from './engine/combat'
import type { AIDifficulty } from './engine/ai'
import { HeroTopArena } from './components/board/HeroTopArena'
import { HeroBottomArena } from './components/board/HeroBottomArena'
import { GameBoard } from './components/board/GameBoard'
import { Hand } from './components/cards/Hand'
import { CombatLogDrawer } from './components/ui/CombatLogDrawer'
import { GameOverModal } from './components/ui/GameOverModal'
import { SuperBlockModal } from './components/ui/SuperBlockModal'
import { MulliganModal } from './components/ui/MulliganModal'
import { ComicIntro } from './components/modals/ComicIntro'
import { CardDetailModal } from './components/modals/CardDetailModal'
import { SoundSettingsModal } from './components/modals/SoundSettingsModal'
import { DailyChallengesModal } from './components/challenges/DailyChallengesModal'
import { CampaignVictoryCinematicModal } from './components/campaign/CampaignVictoryCinematicModal'
import { HeroEmotesBar, type EmoteType } from './components/hero/HeroEmotesBar'
import { PhaseBanner } from './components/ui/PhaseBanner'
import { MainMenu } from './components/screens/MainMenu'
import { HeroSelect } from './components/screens/HeroSelect'
import { DeckBuilder } from './components/screens/DeckBuilder'
import { CampaignMap } from './components/campaign/CampaignMap'
import { getCardById } from './data/cards'
import {
  buildMissionLanes,
  calculateMissionStars,
  loadCampaignProgress,
  saveCampaignProgress,
  loadZombieCampaignProgress,
  saveZombieCampaignProgress,
} from './data/campaign'
import {
  calculateMatchTickets,
  addEventTickets,
  type MatchTicketResult,
} from './data/eventTickets'
import {
  getDailyChallengesBadgeCount,
  updateDailyChallengesOnMatchOver,
  type PuzzlePartyConfig,
  type EventShowcaseConfig,
} from './data/challenges'
import { advanceHeroQuestProgress } from './data/heroQuests'
import type { CampaignMission, Minion as MinionType } from './engine/types'
import type { Projectile, FloatingTextItem, ShockwaveItem } from './components/board/CombatVFXLayer'
import { type CombatPopupItem, getComicActionWord } from './components/board/CombatActionPopups'
import { soundManager } from './audio/SoundManager'
import './App.css'

export function App() {
  const [currentScreen, setCurrentScreen] = useState<'menu' | 'hero_select' | 'deck_builder' | 'campaign' | 'battle'>('menu')
  const [activeCampaignMission, setActiveCampaignMission] = useState<CampaignMission | null>(null)
  const [campaignStarsWon, setCampaignStarsWon] = useState<number | undefined>(undefined)
  const [matchTicketsEarned, setMatchTicketsEarned] = useState<MatchTicketResult | undefined>(undefined)
  const [isDailyChallengesOpen, setIsDailyChallengesOpen] = useState(false)
  const [dailyBadgeCount, setDailyBadgeCount] = useState<number>(() => {
    try {
      return getDailyChallengesBadgeCount().totalUncompleted
    } catch {
      return 0
    }
  })
  const [showCinematicVictory, setShowCinematicVictory] = useState(false)
  const [inspectModalData, setInspectModalData] = useState<{
    card?: CardType
    minion?: MinionType
    cardId?: string
  } | null>(null)
  const [selectedHeroes, setSelectedHeroes] = useState<{ plant: string; zombie: string }>({
    plant: 'hero_green_shadow',
    zombie: 'hero_super_brainz',
  })
  const [showComicIntro, setShowComicIntro] = useState(false)
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('normal')
  const [customPlantDeck, setCustomPlantDeck] = useState<CardType[] | undefined>(undefined)
  const [customZombieDeck, setCustomZombieDeck] = useState<CardType[] | undefined>(undefined)

  const [gameState, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialGameState(selectedHeroes.plant, selectedHeroes.zombie)
  )

  const [selectedCard, setSelectedCard] = useState<CardType | null>(null)
  const [selectedLaneIndex, setSelectedLaneIndex] = useState<number | undefined>(undefined)
  const [activeCombatLaneIndex, setActiveCombatLaneIndex] = useState<number | undefined>(undefined)
  const [isCombatResolving, setIsCombatResolving] = useState(false)

  // Stable references for async combat loop and super-block resumption
  const gameStateRef = useRef(gameState)
  gameStateRef.current = gameState
  const nextLaneToExecuteRef = useRef<number | null>(null)
  const executeLaneRef = useRef<((idx: number) => void) | null>(null)

  // Combat Visual & Sound FX States
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([])
  const [shockwaves, setShockwaves] = useState<ShockwaveItem[]>([])
  const [combatPopups, setCombatPopups] = useState<CombatPopupItem[]>([])
  const [turnRopeTime, setTurnRopeTime] = useState<number>(15)
  const [isScreenShaking, setIsScreenShaking] = useState(false)
  const [plantHeroHurt, setPlantHeroHurt] = useState(false)
  const [zombieHeroHurt, setZombieHeroHurt] = useState(false)
  const [plantUsingSuperpower, setPlantUsingSuperpower] = useState(false)
  const [zombieUsingSuperpower, setZombieUsingSuperpower] = useState(false)
  const [combatAnimation, setCombatAnimation] = useState<{
    attacking?: { laneIndex: number; side: 'plants' | 'zombies' } | null
    hit?: { laneIndex: number; side: 'plants' | 'zombies' } | null
    dying?: { laneIndex: number; side: 'plants' | 'zombies' } | null
  }>({})
  const [isMuted, setIsMuted] = useState(soundManager.getMuted())
  const [isCombatLogOpen, setIsCombatLogOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [playerEmote, setPlayerEmote] = useState<{ text: string; emoji?: string } | null>(null)
  const [opponentEmote, setOpponentEmote] = useState<{ text: string; emoji?: string } | null>(null)

  const handleTriggerPlayerEmote = (type: EmoteType, speech: string, emoji: string) => {
    setPlayerEmote({ text: speech, emoji })

    // AI opponent reactive retort
    const opponentReplies: Record<EmoteType, { text: string; emoji: string; replyType: EmoteType }> = {
      hello: { text: 'Chuẩn bị tinh thần đi!', emoji: '👋', replyType: 'hello' },
      taunt: { text: 'Chưa biết mèo nào cắn mỉu nào đâu!', emoji: '😏', replyType: 'taunt' },
      oops: { text: 'Haha! Đúng lúc sơ hở rồi!', emoji: '😈', replyType: 'taunt' },
      victory: { text: 'Còn quá sớm để ăn mừng!', emoji: '🛡️', replyType: 'oops' },
    }

    setTimeout(() => {
      const reply = opponentReplies[type]
      if (reply) {
        setOpponentEmote({ text: reply.text, emoji: reply.emoji })
        soundManager.playEmote(reply.replyType)
      }
    }, 1400)
  }

  const isPlayerPlantTurn = gameState.phase === 'PLANT_PLAY'

  const toggleSound = () => {
    const nextMute = !isMuted
    setIsMuted(nextMute)
    soundManager.setMuted(nextMute)
    if (!nextMute) soundManager.playCardDrop()
  }

  // Start match when heroes & difficulty are picked
  const handleStartWithHeroes = (plantId: string, zombieId: string, diff: AIDifficulty = 'normal') => {
    setActiveCampaignMission(null)
    setCampaignStarsWon(undefined)
    setMatchTicketsEarned(undefined)
    setSelectedHeroes({ plant: plantId, zombie: zombieId })
    setAiDifficulty(diff)
    dispatch({
      type: 'START_MATCH',
      plantHeroId: plantId,
      zombieHeroId: zombieId,
      plantDeck: customPlantDeck,
      zombieDeck: customZombieDeck,
    })
    setShowComicIntro(true)
    setCurrentScreen('battle')
  }

  // Start PvE Campaign Mission with custom rules, initial lanes & energy bonuses
  const handleStartCampaignMission = (mission: CampaignMission, customDeck?: CardType[]) => {
    setActiveCampaignMission(mission)
    setCampaignStarsWon(undefined)
    setMatchTicketsEarned(undefined)

    const isZombieFaction = mission.faction === 'zombies'
    const pId = isZombieFaction
      ? mission.bossHeroId
      : (mission.playerHeroId || 'hero_green_shadow')
    const zId = isZombieFaction
      ? (mission.playerHeroId || 'hero_super_brainz')
      : mission.bossHeroId

    setSelectedHeroes({ plant: pId, zombie: zId })

    const diff: AIDifficulty =
      mission.difficulty === 'boss' || mission.difficulty === 'hard'
        ? 'expert'
        : mission.difficulty === 'normal'
          ? 'normal'
          : 'easy'
    setAiDifficulty(diff)

    const effectivePlantDeck = isZombieFaction
      ? customPlantDeck
      : (customDeck && customDeck.length > 0 ? customDeck : customPlantDeck)
    const effectiveZombieDeck = isZombieFaction
      ? (customDeck && customDeck.length > 0 ? customDeck : customZombieDeck)
      : customZombieDeck

    const missionLanes = buildMissionLanes(mission)
    dispatch({
      type: 'START_MATCH',
      plantHeroId: pId,
      zombieHeroId: zId,
      plantDeck: effectivePlantDeck,
      zombieDeck: effectiveZombieDeck,
      initialLanes: missionLanes,
      startingSunBonus: mission.rule.startingSunBonus || 0,
      startingBrainsBonus: mission.rule.startingBrainsBonus || 0,
    })
    setShowComicIntro(true)
    setCurrentScreen('battle')
  }

  // Calculate campaign stars and persist progress + event tickets upon match conclusion
  useEffect(() => {
    if (gameState.winner) {
      // 1. Weekly Event Tickets Calculation & Award
      const isZombiePlayer = activeCampaignMission?.faction === 'zombies'
      const playerSide = isZombiePlayer ? 'zombies' : 'plants'
      const playerHeroId = isZombiePlayer ? selectedHeroes.zombie : selectedHeroes.plant
      const ticketResult = calculateMatchTickets(
        gameState.winner,
        playerSide,
        playerHeroId
      )
      if (ticketResult.total > 0) {
        addEventTickets(ticketResult.total)
      }
      setMatchTicketsEarned(ticketResult)

      // 2. Campaign Mission Stars & Progress
      if (activeCampaignMission) {
        const playerHp = isZombiePlayer
          ? gameState.zombieHero.hp
          : gameState.plantHero.hp
        const stars = calculateMissionStars(
          activeCampaignMission,
          gameState.winner,
          playerHp,
          gameState.turn
        )
        setCampaignStarsWon(stars)

        if (stars > 0) {
          if (isZombiePlayer) {
            const zProgress = loadZombieCampaignProgress()
            const prevRecord = zProgress.completedMissions[activeCampaignMission.id]
            const prevStars = prevRecord?.stars || 0
            zProgress.completedMissions[activeCampaignMission.id] = {
              stars: Math.max(stars, prevStars),
              completedAt: new Date().toISOString(),
            }

            if (activeCampaignMission.rewards.unlocksNext) {
              zProgress.unlockedMissionNumber = Math.max(
                zProgress.unlockedMissionNumber,
                activeCampaignMission.missionNumber + 1
              )
            }
            saveZombieCampaignProgress(zProgress)
          } else {
            const progress = loadCampaignProgress()
            const prevRecord = progress.completedMissions[activeCampaignMission.id]
            const prevStars = prevRecord?.stars || 0
            progress.completedMissions[activeCampaignMission.id] = {
              stars: Math.max(stars, prevStars),
              completedAt: new Date().toISOString(),
            }

            if (activeCampaignMission.rewards.unlocksNext) {
              progress.unlockedMissionNumber = Math.max(
                progress.unlockedMissionNumber,
                activeCampaignMission.missionNumber + 1
              )
            }
            saveCampaignProgress(progress)
          }
        }

        // 3. Campaign Victory Cinematic Trigger on Final Chapter Bosses
        const isChapterClimaxBoss =
          activeCampaignMission.difficulty === 'boss' &&
          (activeCampaignMission.missionNumber === 10 || activeCampaignMission.missionNumber === 15)
        if (isChapterClimaxBoss && gameState.winner === playerSide) {
          setShowCinematicVictory(true)
        }
      }

      // 4. Update Daily Challenges Progress on Match Conclusion
      const enemyHeroHp = playerSide === 'plants' ? gameState.zombieHero.hp : gameState.plantHero.hp
      const damageDealtToEnemy = Math.max(0, 20 - enemyHeroHp)
      updateDailyChallengesOnMatchOver({
        winner: gameState.winner,
        playerSide,
        damageDealtToEnemyHero: damageDealtToEnemy,
        tricksPlayed: 1,
        minionsPlayed: 2,
      })

      // 5. Update Hero Quest Progress on Match Conclusion
      if (gameState.winner === playerSide) {
        advanceHeroQuestProgress(playerHeroId, 'win_matches', 1)
      }

      // 6. Refresh Daily Challenges Badge Notification Count
      try {
        setDailyBadgeCount(getDailyChallengesBadgeCount().totalUncompleted)
      } catch {
        // ignore storage errors
      }
    }
  }, [
    gameState.winner,
    activeCampaignMission,
    gameState.plantHero.hp,
    gameState.zombieHero.hp,
    gameState.turn,
    selectedHeroes.plant,
    selectedHeroes.zombie,
  ])

  // Handle saving custom deck from DeckBuilder
  const handleSaveDeck = (side: 'plants' | 'zombies', deck: CardType[]) => {
    if (side === 'plants') {
      setCustomPlantDeck(deck)
    } else {
      setCustomZombieDeck(deck)
    }
    dispatch({
      type: 'START_MATCH',
      plantHeroId: selectedHeroes.plant,
      zombieHeroId: selectedHeroes.zombie,
      plantDeck: side === 'plants' ? deck : customPlantDeck,
      zombieDeck: side === 'zombies' ? deck : customZombieDeck,
    })
    setShowComicIntro(true)
    setCurrentScreen('battle')
  }

  // AI Automatic Behavior for Zombie side (or Plant side if playing Zombies)
  useEffect(() => {
    if (currentScreen !== 'battle' || gameState.winner || gameState.phase === 'MULLIGAN') return

    const isAITurn =
      (gameState.phase === 'ZOMBIE_PLAY' || gameState.phase === 'ZOMBIE_TRICKS')

    if (!isAITurn) return

    const timeoutIds: ReturnType<typeof setTimeout>[] = []
    const plan = getAITurnPlan(gameState, 'zombies', aiDifficulty)

    if (plan.length === 0) {
      // Pass turn after thoughtful delay
      const thinkTime = aiDifficulty === 'expert' ? 950 : aiDifficulty === 'easy' ? 550 : 750
      const tid = setTimeout(() => {
        dispatch({ type: 'NEXT_PHASE' })
      }, thinkTime)
      timeoutIds.push(tid)
    } else {
      // Execute each planned action with authentic mobile pacing
      const stepDelay = aiDifficulty === 'expert' ? 800 : 650
      plan.forEach((step, idx) => {
        const tid = setTimeout(() => {
          if (step.action === 'PLAY_MINION' && step.card && step.laneIndex !== undefined) {
            dispatch({
              type: 'PLAY_CARD',
              side: 'zombies',
              cardId: step.card.id,
              laneIndex: step.laneIndex,
            })
            soundManager.playCardDrop()
          } else if (step.action === 'PLAY_TRICK' && step.card) {
            dispatch({
              type: 'PLAY_CARD',
              side: 'zombies',
              cardId: step.card.id,
              laneIndex: step.laneIndex ?? 0,
              targetHero: step.targetHero,
            })
            soundManager.playAttackHit()
          }
        }, (idx + 1) * stepDelay)
        timeoutIds.push(tid)
      })

      // Once all planned cards have been dropped, pass turn cleanly
      const endTid = setTimeout(() => {
        dispatch({ type: 'NEXT_PHASE' })
      }, (plan.length + 1) * stepDelay + 250)
      timeoutIds.push(endTid)
    }

    return () => {
      timeoutIds.forEach(clearTimeout)
    }
  }, [currentScreen, gameState.phase, gameState.turn, gameState.winner, aiDifficulty])

  // AI Super-Block Auto Resolution for Zombie side
  useEffect(() => {
    if (gameState.pendingSuperBlock && gameState.pendingSuperBlock.side === 'zombies') {
      soundManager.playSuperBlock()
      setZombieUsingSuperpower(true)
      const sp = gameState.pendingSuperBlock.superpower
      const timer = setTimeout(() => {
        dispatch({
          type: 'PLAY_SUPERPOWER',
          side: 'zombies',
          superpowerId: sp.id,
        })
        soundManager.playAttackHit()
        setTimeout(() => setZombieUsingSuperpower(false), 1500)

        // Resume combat loop if paused waiting for Zombie Super-Block
        if (nextLaneToExecuteRef.current !== null) {
          const nextLane = nextLaneToExecuteRef.current
          nextLaneToExecuteRef.current = null
          setTimeout(() => executeLaneRef.current?.(nextLane), 600)
        }
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [gameState.pendingSuperBlock])

  // Sound cue on game end
  useEffect(() => {
    if (gameState.winner) {
      if (gameState.winner === 'plants') {
        soundManager.playVictory()
      } else {
        soundManager.playDefeat()
      }
    }
  }, [gameState.winner])

  const handleSelectCard = (card: CardType) => {
    const isUnselecting = card.id === selectedCard?.id
    setSelectedCard(isUnselecting ? null : card)
    if (isUnselecting) {
      soundManager.playCardSelect()
    } else {
      soundManager.playCardPickup()
    }
  }

  const handleSelectLane = (laneIndex: number) => {
    setSelectedLaneIndex(laneIndex)

    if (selectedCard && isPlayerPlantTurn) {
      if (selectedCard.type === 'superpower') {
        setPlantUsingSuperpower(true)
        setTimeout(() => setPlantUsingSuperpower(false), 1500)
      }
      dispatch({
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: selectedCard.id,
        laneIndex,
      })
      if (selectedCard.type === 'trick' || selectedCard.type === 'superpower') {
        soundManager.playAttackHit()
      } else {
        soundManager.playCardPlace()
      }
      setSelectedCard(null)
    }
  }

  const handleDropCardToLane = (laneIndex: number, cardId: string) => {
    const card = gameState.plantHand.find((c) => c.id === cardId)
    if (card && isPlayerPlantTurn && card.cost <= gameState.plantHero.sun) {
      if (card.type === 'superpower') {
        setPlantUsingSuperpower(true)
        setTimeout(() => setPlantUsingSuperpower(false), 1500)
      }
      dispatch({
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: card.id,
        laneIndex,
      })
      if (card.type === 'trick' || card.type === 'superpower') {
        soundManager.playAttackHit()
      } else {
        soundManager.playCardPlace()
      }
      setSelectedCard(null)
      setSelectedLaneIndex(undefined)
    }
  }

  const handleNextPhase = () => {
    soundManager.playPhaseChange()
    dispatch({ type: 'NEXT_PHASE' })
  }

  // Turn Rope Countdown Timer (15-second fuse for player turn)
  useEffect(() => {
    if (!isPlayerPlantTurn || isCombatResolving || showComicIntro || Boolean(gameState.winner)) {
      setTurnRopeTime(15)
      return
    }

    setTurnRopeTime(15)
    const ropeInterval = setInterval(() => {
      setTurnRopeTime((prev) => {
        if (prev <= 1) {
          clearInterval(ropeInterval)
          handleNextPhase()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(ropeInterval)
  }, [gameState.phase, gameState.turn, isCombatResolving, showComicIntro, gameState.winner])

  // ========================================================
  // SEQUENTIAL 5-LANE COMBAT SWEEP WITH PROJECTILES & VFX
  // ========================================================
  const handleStartCombat = () => {
    if (isCombatResolving) return
    setIsCombatResolving(true)
    soundManager.playFightHorn()

    const executeLane = (idx: number) => {
      if (idx >= 5) {
        // Combat complete across all 5 lanes
        setActiveCombatLaneIndex(undefined)
        setCombatAnimation({})
        setIsCombatResolving(false)
        nextLaneToExecuteRef.current = null
        setTimeout(() => {
          if (!gameStateRef.current.pendingSuperBlock && !gameStateRef.current.winner) {
            dispatch({ type: 'NEXT_PHASE' })
          }
        }, 500)
        return
      }

      // Check if match already has a winner before resolving lane
      if (gameStateRef.current.winner) {
        setActiveCombatLaneIndex(undefined)
        setCombatAnimation({})
        setIsCombatResolving(false)
        nextLaneToExecuteRef.current = null
        return
      }

      setActiveCombatLaneIndex(idx)

      // Calculate single lane combat results from the latest state
      const { events, hasSuperBlock, winner } = resolveSingleLaneCombat(gameStateRef.current, idx)

      if (events.length === 0) {
        // Empty lane or no attacks; step lane for any environment triggers and proceed
        dispatch({ type: 'STEP_COMBAT_LANE', laneIndex: idx })
        setTimeout(() => executeLane(idx + 1), 320)
        return
      }

      // Fire visual combat sequence for lane events
      events.forEach((ev, evIdx) => {
        const delay = evIdx * 400
        setTimeout(() => {
          const isPlant = ev.attackerSide === 'plants'

          // 1. Minion attack lunge animation forward
          if (ev.attackerSide) {
            setCombatAnimation((prev) => ({
              ...prev,
              attacking: { laneIndex: idx, side: ev.attackerSide },
            }))
          }

          // Fire attack projectile
          if (isPlant) {
            soundManager.playPeaShoot()
          } else {
            soundManager.playAttackHit()
          }

          const projId = `proj-${idx}-${Date.now()}-${evIdx}`
          setProjectiles((prev) => [
            ...prev,
            {
              id: projId,
              laneIndex: idx,
              sourceSide: ev.attackerSide,
              targetType: ev.target,
            },
          ])

          // Projectile arrives at target (after 350ms)
          setTimeout(() => {
            setProjectiles((prev) => prev.filter((p) => p.id !== projId))

            // Reset minion attack lunge
            setCombatAnimation((prev) => ({
              ...prev,
              attacking: null,
            }))

            // Minion damage reaction (shake + red flash) & lethal death scatter
            if (ev.target === 'minion' && ev.damageDealt > 0) {
              setCombatAnimation((prev) => ({
                ...prev,
                hit: { laneIndex: idx, side: ev.targetSide },
                dying: ev.isLethal ? { laneIndex: idx, side: ev.targetSide } : prev.dying,
              }))
              setTimeout(() => {
                setCombatAnimation((prev) => ({ ...prev, hit: null }))
              }, 450)
              if (ev.isLethal) {
                setTimeout(() => {
                  setCombatAnimation((prev) => ({ ...prev, dying: null }))
                }, 750)
              }
            }

            // 2. Target impact & Floating Number
            const floatId = `float-${idx}-${Date.now()}-${evIdx}`
            let targetType: 'zombieHero' | 'plantHero' | 'zombieMinion' | 'plantMinion'
            if (ev.target === 'hero') {
              targetType = ev.targetSide === 'plants' ? 'plantHero' : 'zombieHero'
            } else {
              targetType = ev.targetSide === 'plants' ? 'plantMinion' : 'zombieMinion'
            }

            const floatText = ev.isBlocked
              ? '🛡️ BLOCKED!'
              : ev.damageDealt > 0
              ? `-${ev.damageDealt}`
              : ''

            if (floatText) {
              setFloatingTexts((prev) => [
                ...prev,
                {
                  id: floatId,
                  laneIndex: idx,
                  target: targetType,
                  text: floatText,
                  type: ev.isBlocked ? 'block' : 'damage',
                },
              ])
              setTimeout(() => {
                setFloatingTexts((prev) => prev.filter((f) => f.id !== floatId))
              }, 850)
            }

            // 2b. Kinetic Shockwave VFX & Impact Ripple
            const swId = `sw-${idx}-${Date.now()}-${evIdx}`
            const shockwaveType = ev.isBlocked
              ? 'block'
              : ev.target === 'hero'
              ? 'hero_damage'
              : 'impact'

            setShockwaves((prev) => [
              ...prev,
              {
                id: swId,
                laneIndex: idx,
                target: targetType,
                type: shockwaveType,
                intensity: ev.damageDealt,
              },
            ])
            setTimeout(() => {
              setShockwaves((prev) => prev.filter((s) => s.id !== swId))
            }, 750)

            // 2c. Comic Action Word & Damage Popup (POW/BAM/CRUNCH/ZAP/BLOCKED/DEADLY/STRIKE)
            if (ev.isBlocked || ev.damageDealt > 0) {
              const attackerTraits = (ev.traitsTriggered || []) as string[]
              const isDeadly = Boolean(attackerTraits.includes('deadly'))
              const comicWord = getComicActionWord({
                damage: ev.damageDealt,
                isBlocked: ev.isBlocked,
                isDeadly,
                traits: attackerTraits,
              })
              const popupId = `popup-${idx}-${Date.now()}-${evIdx}`
              setCombatPopups((prev) => [
                ...prev,
                {
                  id: popupId,
                  laneIndex: idx,
                  target: targetType,
                  word: comicWord,
                  damage: ev.damageDealt,
                  targetSide: ev.targetSide,
                  isBlocked: ev.isBlocked,
                  isDeadly,
                  rotation: (Math.random() * 16) - 8,
                },
              ])
              setTimeout(() => {
                setCombatPopups((prev) => prev.filter((p) => p.id !== popupId))
              }, 1200)

              soundManager.playComicImpact(comicWord)
            }

            // 3. Audio & Hero / Minion Hit Feedback
            if (ev.isBlocked) {
              soundManager.playShieldBlock()
            } else if (ev.target === 'hero' && ev.damageDealt > 0) {
              soundManager.playHeroDamage()
              soundManager.playShockwaveImpact()
              if (ev.targetSide === 'plants') {
                setPlantHeroHurt(true)
                setTimeout(() => setPlantHeroHurt(false), 450)
              } else {
                setZombieHeroHurt(true)
                setTimeout(() => setZombieHeroHurt(false), 450)
              }

              if (ev.damageDealt >= 2) {
                setIsScreenShaking(true)
                setTimeout(() => setIsScreenShaking(false), 360)
              }
            } else if (ev.damageDealt > 0) {
              soundManager.playAttackHit()
              soundManager.playShockwaveImpact()
            }
          }, 350)
        }, delay)
      })

      // At impact of attacks, dispatch STEP_COMBAT_LANE to synchronously update the board state!
      const impactTime = Math.max(380, (events.length - 1) * 400 + 360)
      setTimeout(() => {
        dispatch({ type: 'STEP_COMBAT_LANE', laneIndex: idx })

        // Check if lethal blow ended the game
        if (winner) {
          setActiveCombatLaneIndex(undefined)
          setIsCombatResolving(false)
          nextLaneToExecuteRef.current = null
          return
        }

        // Check Super-Block interruption
        if (hasSuperBlock) {
          nextLaneToExecuteRef.current = idx + 1
          soundManager.playSuperBlock()
          // Combat pauses! Plant player sees SuperBlockModal, or Zombie AI auto-resolves.
          return
        }

        // Continue to next lane
        setTimeout(() => executeLane(idx + 1), 350)
      }, impactTime)
    }

    executeLaneRef.current = executeLane
    executeLane(0)
  }

  const handleRematch = () => {
    setIsCombatResolving(false)
    setActiveCombatLaneIndex(undefined)
    setCombatAnimation({})
    nextLaneToExecuteRef.current = null
    setShowComicIntro(false)
    setCampaignStarsWon(undefined)
    setMatchTicketsEarned(undefined)

    if (activeCampaignMission) {
      dispatch({
        type: 'START_MATCH',
        plantHeroId: selectedHeroes.plant,
        zombieHeroId: selectedHeroes.zombie,
        plantDeck: customPlantDeck,
        zombieDeck: customZombieDeck,
        initialLanes: buildMissionLanes(activeCampaignMission),
        startingSunBonus: activeCampaignMission.rule.startingSunBonus || 0,
        startingBrainsBonus: activeCampaignMission.rule.startingBrainsBonus || 0,
      })
    } else {
      dispatch({
        type: 'START_MATCH',
        plantHeroId: selectedHeroes.plant,
        zombieHeroId: selectedHeroes.zombie,
        plantDeck: customPlantDeck,
        zombieDeck: customZombieDeck,
      })
    }
    setSelectedCard(null)
    setSelectedLaneIndex(undefined)
  }

  // Super-Block Actions with Combat Resumption
  const handlePlaySuperpower = () => {
    if (gameState.pendingSuperBlock) {
      const sp = gameState.pendingSuperBlock.superpower
      setPlantUsingSuperpower(true)
      dispatch({
        type: 'PLAY_SUPERPOWER',
        side: gameState.pendingSuperBlock.side,
        superpowerId: sp.id,
      })
      soundManager.playSuperBlock()
      setTimeout(() => setPlantUsingSuperpower(false), 1500)

      // Resume combat loop if paused waiting for Super-Block
      if (nextLaneToExecuteRef.current !== null) {
        const nextLane = nextLaneToExecuteRef.current
        nextLaneToExecuteRef.current = null
        setTimeout(() => executeLaneRef.current?.(nextLane), 600)
      }
    }
  }

  const handleSaveSuperpower = () => {
    if (gameState.pendingSuperBlock) {
      dispatch({
        type: 'SAVE_SUPERPOWER',
        side: gameState.pendingSuperBlock.side,
      })
      soundManager.playCardDrop()

      // Resume combat loop if paused waiting for Super-Block
      if (nextLaneToExecuteRef.current !== null) {
        const nextLane = nextLaneToExecuteRef.current
        nextLaneToExecuteRef.current = null
        setTimeout(() => executeLaneRef.current?.(nextLane), 600)
      }
    }
  }

  // Mulligan Confirm
  const handleConfirmMulligan = (selectedIndices: number[]) => {
    if (selectedIndices.length > 0) {
      dispatch({
        type: 'MULLIGAN_SWAP',
        side: 'plants',
        cardIndices: selectedIndices,
      })
    }
    dispatch({ type: 'FINISH_MULLIGAN', side: 'plants' })
    soundManager.playCardDrop()
  }

  const handleStartPuzzle = (puzzle: PuzzlePartyConfig) => {
    setIsDailyChallengesOpen(false)
    setActiveCampaignMission(null)
    setCampaignStarsWon(undefined)
    setShowCinematicVictory(false)

    const pHeroId = puzzle.playerSide === 'plants' ? puzzle.playerHeroId : puzzle.opponentHeroId
    const zHeroId = puzzle.playerSide === 'zombies' ? puzzle.playerHeroId : puzzle.opponentHeroId
    setSelectedHeroes({ plant: pHeroId, zombie: zHeroId })

    dispatch({
      type: 'START_MATCH',
      plantHeroId: pHeroId,
      zombieHeroId: zHeroId,
      startingSunBonus: puzzle.playerSide === 'plants' ? Math.max(0, puzzle.playerStartingMana - 1) : 0,
      startingBrainsBonus: puzzle.playerSide === 'zombies' ? Math.max(0, puzzle.playerStartingMana - 1) : 0,
    })
    setShowComicIntro(true)
    setCurrentScreen('battle')
  }

  const handleStartShowcase = (showcase: EventShowcaseConfig) => {
    setIsDailyChallengesOpen(false)
    setActiveCampaignMission(null)
    setCampaignStarsWon(undefined)
    setShowCinematicVictory(false)

    setSelectedHeroes({ plant: showcase.playerHeroId, zombie: showcase.opponentHeroId })
    dispatch({
      type: 'START_MATCH',
      plantHeroId: showcase.playerHeroId,
      zombieHeroId: showcase.opponentHeroId,
    })
    setShowComicIntro(true)
    setCurrentScreen('battle')
  }

  if (currentScreen === 'menu') {
    return (
      <>
        <MainMenu
          onStartGame={() => {
            setActiveCampaignMission(null)
            setCampaignStarsWon(undefined)
            setShowComicIntro(true)
            setCurrentScreen('battle')
          }}
          onOpenHeroSelect={() => setCurrentScreen('hero_select')}
          onOpenDeckBuilder={() => setCurrentScreen('deck_builder')}
          onOpenCampaign={() => setCurrentScreen('campaign')}
          onOpenDailyChallenges={() => setIsDailyChallengesOpen(true)}
          dailyBadgeCount={dailyBadgeCount}
        />
        <DailyChallengesModal
          isOpen={isDailyChallengesOpen}
          onClose={() => {
            setIsDailyChallengesOpen(false)
            try {
              setDailyBadgeCount(getDailyChallengesBadgeCount().totalUncompleted)
            } catch {
              // ignore
            }
          }}
          onStartPuzzle={handleStartPuzzle}
          onStartShowcase={handleStartShowcase}
        />
      </>
    )
  }

  if (currentScreen === 'campaign') {
    return (
      <CampaignMap
        onStartMission={handleStartCampaignMission}
        onBack={() => setCurrentScreen('menu')}
      />
    )
  }

  if (currentScreen === 'hero_select') {
    return (
      <HeroSelect
        onSelectHeroes={handleStartWithHeroes}
        onBack={() => setCurrentScreen('menu')}
      />
    )
  }

  if (currentScreen === 'deck_builder') {
    return (
      <DeckBuilder
        onSaveDeck={handleSaveDeck}
        onBack={() => setCurrentScreen('menu')}
      />
    )
  }

  const startingSuperpower = gameState.plantHand.find((c) => c.type === 'superpower')

  return (
    <div className={`pvz-game-application ${isScreenShaking ? 'is-screen-shaking' : ''}`}>
      {/* Centered Vertical Battle Arena Stage */}
      <div className="pvz-arena-stage">
        {/* Dynamic Comic Phase Transition Banner & Top Phase Flow */}
        <PhaseBanner
          phase={gameState.phase}
          turn={gameState.turn}
          isCombatResolving={isCombatResolving}
          onNextPhase={handleNextPhase}
          onStartCombat={handleStartCombat}
        />

        <main className="pvz-vertical-stadium">
          {/* 1. Top Zone: Opponent Arena (Super Brainz / Zombie Hero) */}
          <HeroTopArena
            hero={gameState.zombieHero}
            side="zombies"
            opponentHandCount={gameState.zombieHand.length}
            phase={gameState.phase}
            isHurt={zombieHeroHurt}
            isUsingSuperpower={zombieUsingSuperpower}
            isTargetable={Boolean(selectedCard && selectedCard.type === 'trick' && isPlayerPlantTurn)}
            onHeroClick={() => {
              if (selectedCard && selectedCard.type === 'trick' && isPlayerPlantTurn) {
                dispatch({
                  type: 'PLAY_CARD',
                  side: 'plants',
                  cardId: selectedCard.id,
                  laneIndex: 0,
                  targetHero: true,
                })
                soundManager.playAttackHit()
                setSelectedCard(null)
              }
            }}
            onOpenCombatLog={() => setIsCombatLogOpen(true)}
            unreadLogCount={gameState.combatLog.length}
            isMuted={isMuted}
            onToggleMute={toggleSound}
            onOpenSettings={() => setIsSettingsOpen(true)}
            activeEmote={opponentEmote}
            onDismissEmote={() => setOpponentEmote(null)}
            onReturnHome={() => setCurrentScreen('menu')}
          />

          {/* 2. Middle Zone: 5-Lane Battlefield Surface */}
          <div className="pvz-board-arena-container">
            <GameBoard
              lanes={gameState.lanes}
              selectedLaneIndex={selectedLaneIndex}
              selectedCard={selectedCard}
              selectedCardSide={selectedCard?.side}
              activeCombatLaneIndex={activeCombatLaneIndex}
              combatAnimation={combatAnimation}
              projectiles={projectiles}
              floatingTexts={floatingTexts}
              shockwaves={shockwaves}
              combatPopups={combatPopups}
              turnRope={{
                timeLeft: turnRopeTime,
                maxTime: 15,
                isActive: isPlayerPlantTurn && turnRopeTime > 0 && !isCombatResolving,
                onTimeout: handleNextPhase,
              }}
              onSelectLane={handleSelectLane}
              onDropCardToLane={handleDropCardToLane}
              onInspectMinion={(minion) => setInspectModalData({ minion })}
              onInspectEnvironment={(cardId) => setInspectModalData({ cardId })}
            />
          </div>

          {/* 3. Bottom Zone: Player Hero Arena (Green Shadow / Plant Hero) */}
          <HeroBottomArena
            hero={gameState.plantHero}
            side="plants"
            phase={gameState.phase}
            isHurt={plantHeroHurt}
            isUsingSuperpower={plantUsingSuperpower}
            activeEmote={playerEmote}
            onDismissEmote={() => setPlayerEmote(null)}
            onSuperBlockClick={() => {
              if (gameState.plantHero.blockMeter >= 8) {
                soundManager.playSuperBlock()
              } else {
                soundManager.playClick()
              }
            }}
          />

          {/* 4. Player Hand Shelf with Iconic Circular Action Button & Emotes */}
          <footer className="pvz-player-hand-shelf">
            {/* Card Selection Status Cue & Hero Emotes Bar */}
            <div className="hand-prompt-strip">
              <span className="prompt-content">
                {selectedCard
                  ? `⭐ ${selectedCard.name} (${selectedCard.cost} ☀️) — Chạm vào làn đất để xuất trận!`
                  : isPlayerPlantTurn
                  ? '🌱 Lượt của bạn: Chọn lá bài hoặc kéo thả lên bàn đấu.'
                  : gameState.phase === 'FIGHT'
                  ? '⚔️ Nhấn Nút GIAO TRANH để bắt đầu đọ sức!'
                  : '⏳ Đang chờ lượt đối thủ...'}
              </span>
              <HeroEmotesBar
                heroSide="plants"
                onTriggerEmote={handleTriggerPlayerEmote}
                disabled={isCombatResolving}
              />
            </div>

            {/* Hand Cards Arc and Circular Action Button */}
            <div className="hand-and-action-cluster">
              <div className="hand-cards-dock">
                <Hand
                  cards={gameState.plantHand}
                  currentResource={gameState.plantHero.sun}
                  selectedCardId={selectedCard?.id}
                  isPlayerTurn={isPlayerPlantTurn}
                  onSelectCard={handleSelectCard}
                  onDragStartCard={(card) => {
                    setSelectedCard(card)
                    soundManager.playCardPickup()
                  }}
                  side="plants"
                  onInspectCard={(card) => setInspectModalData({ card })}
                />
              </div>

              {/* Authentic PvZ Heroes 4-Phase Circular Turn Dial (Action Button) */}
              <div className="arena-phase-dial-container" title={`Giai đoạn: ${gameState.phase} (Lượt ${gameState.turn})`}>
                {/* Turn Number Header Pill */}
                <div className="phase-dial-turn-pill">
                  <span className="turn-pill-text">LƯỢT {gameState.turn}</span>
                </div>

                {/* Circular Outer Bezel with 4 Phase Quadrants */}
                <div className={`phase-dial-bezel phase-active-${gameState.phase.toLowerCase()}`}>
                  {/* Rotating Dial Indicator Pointer */}
                  <div
                    className="phase-dial-pointer"
                    style={{
                      transform: `rotate(${
                        gameState.phase === 'ZOMBIE_PLAY'
                          ? -45
                          : gameState.phase === 'PLANT_PLAY'
                          ? 45
                          : gameState.phase === 'ZOMBIE_TRICKS'
                          ? 135
                          : 225
                      }deg)`,
                    }}
                  >
                    <div className="dial-pointer-head" />
                  </div>

                  {/* 4 Phase Quadrant Icons around the Bezel */}
                  <div className={`dial-quadrant quad-zombie-play ${gameState.phase === 'ZOMBIE_PLAY' ? 'quad-active' : ''}`} title="1. Zombie ra quân">
                    <span className="quad-icon">🧟</span>
                  </div>
                  <div className={`dial-quadrant quad-plant-play ${gameState.phase === 'PLANT_PLAY' ? 'quad-active' : ''}`} title="2. Plant ra quân & phép">
                    <span className="quad-icon">🌱</span>
                  </div>
                  <div className={`dial-quadrant quad-zombie-tricks ${gameState.phase === 'ZOMBIE_TRICKS' ? 'quad-active' : ''}`} title="3. Zombie tung Tricks">
                    <span className="quad-icon">🎩</span>
                  </div>
                  <div className={`dial-quadrant quad-fight ${gameState.phase === 'FIGHT' ? 'quad-active' : ''}`} title="4. Giao tranh cả 5 làn">
                    <span className="quad-icon">⚔️</span>
                  </div>

                  {/* Central Action Button (FIGHT! / GO! / WAITING) */}
                  <div className="phase-dial-core-slot">
                    {gameState.phase === 'FIGHT' ? (
                      <button
                        className={`arena-turn-action-btn fight-active-btn ${
                          isCombatResolving ? 'is-resolving-active' : ''
                        }`}
                        onClick={handleStartCombat}
                        disabled={isCombatResolving}
                        title="Bắt đầu giao tranh cả 5 làn!"
                      >
                        <span className="action-btn-icon">⚔️</span>
                        <span className="action-btn-label">
                          {isCombatResolving ? 'ĐANG ĐÁNH' : 'FIGHT!'}
                        </span>
                      </button>
                    ) : isPlayerPlantTurn ? (
                      <button
                        className="arena-turn-action-btn go-active-btn"
                        onClick={handleNextPhase}
                        title="Xong lượt ra quân Plant, chuyển sang Zombie Tricks!"
                      >
                        <span className="action-btn-icon">⏩</span>
                        <span className="action-btn-label">GO!</span>
                      </button>
                    ) : (
                      <div
                        className="arena-turn-waiting-bubble"
                        title={
                          gameState.phase === 'ZOMBIE_PLAY'
                            ? 'Zombie đang tính toán ra quân...'
                            : 'Zombie đang tung chiêu Tricks...'
                        }
                      >
                        <span className="waiting-spinner-ring" />
                        <span className="waiting-pill-label">
                          {gameState.phase === 'ZOMBIE_PLAY' ? 'ZOMBIE' : 'TRICKS'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </main>

        {/* Slide-Out Battle Feed Drawer (Opened via 💬 button at top left) */}
        <CombatLogDrawer
          isOpen={isCombatLogOpen}
          onClose={() => setIsCombatLogOpen(false)}
          logs={gameState.combatLog}
        />
      </div>

      {/* Pre-Battle Comic Storyline Intro */}
      {showComicIntro && (
        <ComicIntro
          plantHeroName={gameState.plantHero.name}
          zombieHeroName={gameState.zombieHero.name}
          plantHeroAvatar={gameState.plantHero.avatar}
          zombieHeroAvatar={gameState.zombieHero.avatar}
          comicDialogue={activeCampaignMission?.comicDialogue}
          issueTitle={
            activeCampaignMission?.comicDialogue?.issueTitle ||
            (activeCampaignMission ? activeCampaignMission.title : undefined)
          }
          issueTagline={
            activeCampaignMission?.comicDialogue?.issueTagline ||
            activeCampaignMission?.subtitle
          }
          plantQuote={activeCampaignMission?.comicDialogue?.plantHeroQuote}
          zombieQuote={activeCampaignMission?.comicDialogue?.zombieHeroQuote}
          issueNumber={activeCampaignMission?.missionNumber}
          onStartBattle={() => setShowComicIntro(false)}
          onSkip={() => setShowComicIntro(false)}
        />
      )}

      {/* Mulligan Opening Hand Modal */}
      {!showComicIntro && gameState.phase === 'MULLIGAN' && (
        <MulliganModal
          cards={gameState.plantHand}
          superpower={startingSuperpower}
          side="plants"
          onConfirmMulligan={handleConfirmMulligan}
        />
      )}

      {/* Super-Block Trigger Modal (Player Plants) */}
      {gameState.pendingSuperBlock && gameState.pendingSuperBlock.side === 'plants' && (
        <SuperBlockModal
          side={gameState.pendingSuperBlock.side}
          superpower={gameState.pendingSuperBlock.superpower}
          onPlaySuperpower={handlePlaySuperpower}
          onSaveSuperpower={handleSaveSuperpower}
        />
      )}

      {/* Victory / Defeat Modal (Suppressed during Final Boss Cinematic) */}
      {!showCinematicVictory && gameState.winner && (
        <GameOverModal
          winner={gameState.winner}
          plantHeroName={gameState.plantHero.name}
          zombieHeroName={gameState.zombieHero.name}
          plantHeroAvatar={gameState.plantHero.avatar}
          zombieHeroAvatar={gameState.zombieHero.avatar}
          turnCount={gameState.turn}
          starsWon={campaignStarsWon}
          eventTicketsEarned={matchTicketsEarned}
          onRematch={handleRematch}
          onCampaignMap={
            activeCampaignMission
              ? () => {
                  setActiveCampaignMission(null)
                  setCampaignStarsWon(undefined)
                  setCurrentScreen('campaign')
                  handleRematch()
                }
              : undefined
          }
          onMainMenu={() => {
            setActiveCampaignMission(null)
            setCampaignStarsWon(undefined)
            setCurrentScreen('menu')
            handleRematch()
          }}
          onHeroSelect={() => {
            setActiveCampaignMission(null)
            setCampaignStarsWon(undefined)
            setCurrentScreen('hero_select')
            handleRematch()
          }}
        />
      )}

      {/* Campaign Victory Cinematic Modal (Chapter 2 Boss Citron / Rustbolt) */}
      {showCinematicVictory && activeCampaignMission && (
        <CampaignVictoryCinematicModal
          isOpen={showCinematicVictory}
          mission={activeCampaignMission}
          starsWon={campaignStarsWon || 3}
          turnCount={gameState.turn}
          playerHeroAvatar={
            activeCampaignMission.faction === 'zombies'
              ? gameState.zombieHero.avatar
              : gameState.plantHero.avatar
          }
          playerHeroName={
            activeCampaignMission.faction === 'zombies'
              ? gameState.zombieHero.name
              : gameState.plantHero.name
          }
          bossHeroAvatar={
            activeCampaignMission.faction === 'zombies'
              ? gameState.plantHero.avatar
              : gameState.zombieHero.avatar
          }
          bossHeroName={
            activeCampaignMission.faction === 'zombies'
              ? gameState.plantHero.name
              : gameState.zombieHero.name
          }
          onContinue={() => {
            setShowCinematicVictory(false)
            setActiveCampaignMission(null)
            setCampaignStarsWon(undefined)
            setCurrentScreen('campaign')
            handleRematch()
          }}
        />
      )}

      {/* Daily Challenges Modal */}
      <DailyChallengesModal
        isOpen={isDailyChallengesOpen}
        onClose={() => {
          setIsDailyChallengesOpen(false)
          try {
            setDailyBadgeCount(getDailyChallengesBadgeCount().totalUncompleted)
          } catch {
            // ignore
          }
        }}
        onStartPuzzle={handleStartPuzzle}
        onStartShowcase={handleStartShowcase}
      />

      {/* Card & Minion Lore Detail Inspection Modal */}
      {inspectModalData && (
        <CardDetailModal
          card={inspectModalData.card || (inspectModalData.cardId ? getCardById(inspectModalData.cardId) : null)}
          minion={inspectModalData.minion}
          onClose={() => setInspectModalData(null)}
        />
      )}

      {/* Sound Settings Modal */}
      <SoundSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false)
          setIsMuted(soundManager.getMuted())
        }}
      />
    </div>
  )
}

export default App
