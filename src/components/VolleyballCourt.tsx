import { MatchPlayer, StartingLineup } from '../stores/matchStore'
import { LineupGrid, LineupPlayer } from './LineupGrid'

interface VolleyballCourtProps {
  startingLineup: StartingLineup
  onPositionClick: (positionId: string) => void
  getPlayerById: (playerId: string) => MatchPlayer | undefined
}

export function VolleyballCourt({
  startingLineup,
  onPositionClick,
  getPlayerById
}: VolleyballCourtProps) {
  // Convert StartingLineup to LineupPlayer array
  // Map positions: position1 -> index 0, position2 -> index 1, etc.
  const players: (LineupPlayer | null)[] = [
    startingLineup.position1,
    startingLineup.position2,
    startingLineup.position3,
    startingLineup.position4,
    startingLineup.position5,
    startingLineup.position6
  ].map((playerId, idx) => {
    if (!playerId) return null

    const player = getPlayerById(playerId)
    if (!player) return null

    return {
      id: player.playerId,
      number: player.number,
      name: player.name,
      position: player.position,
      isLibero: player.position === 'L',
      courtPosition: idx + 1
    }
  })

  // Handle player click - convert court position back to position ID
  const handlePlayerClick = (_playerId: string, position: number) => {
    const positionId = `position${position}`
    onPositionClick(positionId)
  }

  return (
    <LineupGrid
      players={players}
      onPlayerClick={handlePlayerClick}
      showCourtLines={true}
      size="small"
    />
  )
}
