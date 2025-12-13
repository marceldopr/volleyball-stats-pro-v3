import { SetFlowData } from '@/lib/volleyball/gameFlow'

interface SetGameFlowChartProps {
    data: SetFlowData
    ourSide: 'home' | 'away'
    height?: number
}

/**
 * SVG-based game flow chart component
 * Shows score differential evolution throughout a set
 */
export function SetGameFlowChart({
    data,
    ourSide,
    height = 80
}: SetGameFlowChartProps) {
    const { diffSeries, maxAbsDiff, finalScoreHome, finalScoreAway, setNumber } = data

    if (diffSeries.length === 0) return null

    const viewBoxWidth = diffSeries.length
    const viewBoxHeight = maxAbsDiff * 2
    const centerY = maxAbsDiff

    // Determine our score vs opponent score
    const ourScore = ourSide === 'home' ? finalScoreHome : finalScoreAway
    const oppScore = ourSide === 'home' ? finalScoreAway : finalScoreHome

    // Create fill path for positive area (above center = we lead)
    const positivePath = diffSeries.map((diff, i) => {
        const adjustedDiff = ourSide === 'home' ? diff : -diff
        const y = Math.min(centerY - adjustedDiff, centerY)
        return `${i},${y}`
    })
    const positivePathStr = `M0,${centerY} ${positivePath.map((p, i) => `L${i},${p.split(',')[1]}`).join(' ')} L${diffSeries.length - 1},${centerY} Z`

    // Create fill path for negative area (below center = opponent leads)
    const negativePath = diffSeries.map((diff, i) => {
        const adjustedDiff = ourSide === 'home' ? diff : -diff
        const y = Math.max(centerY - adjustedDiff, centerY)
        return `${i},${y}`
    })
    const negativePathStr = `M0,${centerY} ${negativePath.map((p, i) => `L${i},${p.split(',')[1]}`).join(' ')} L${diffSeries.length - 1},${centerY} Z`

    // Create main line path
    const linePath = `M0,${centerY - (ourSide === 'home' ? diffSeries[0] : -diffSeries[0])} ` +
        diffSeries.slice(1).map((diff, i) => {
            const adjustedDiff = ourSide === 'home' ? diff : -diff
            return `L${i + 1},${centerY - adjustedDiff}`
        }).join(' ')

    return (
        <div className="bg-zinc-800/40 rounded-lg p-4 border border-zinc-700/50">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-zinc-300">Set {setNumber}</h4>
                <div className="flex items-center gap-2 text-sm font-mono">
                    <span className={ourScore > oppScore ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                        {ourScore}
                    </span>
                    <span className="text-zinc-600">-</span>
                    <span className={oppScore > ourScore ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                        {oppScore}
                    </span>
                </div>
            </div>

            <svg
                width="100%"
                height={height}
                viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                preserveAspectRatio="none"
                className="overflow-visible"
            >
                {/* Positive fill (we lead) */}
                <path
                    d={positivePathStr}
                    fill="rgba(16, 185, 129, 0.3)"
                    stroke="none"
                />

                {/* Negative fill (opponent leads) */}
                <path
                    d={negativePathStr}
                    fill="rgba(239, 68, 68, 0.3)"
                    stroke="none"
                />

                {/* Center line (0 differential) */}
                <line
                    x1="0"
                    y1={centerY}
                    x2={viewBoxWidth}
                    y2={centerY}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                />

                {/* Main line showing differential */}
                <path
                    d={linePath}
                    fill="none"
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth="1"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>

            {/* Legend */}
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
                <span>Inicio</span>
                <div className="flex gap-4">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-500/50 rounded-sm"></span>
                        Ventaja
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-rose-500/50 rounded-sm"></span>
                        Desventaja
                    </span>
                </div>
                <span>Final</span>
            </div>
        </div>
    )
}
