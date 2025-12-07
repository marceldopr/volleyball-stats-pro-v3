import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { PlayerEvaluationDB } from '@/services/playerEvaluationService'
import { AlertCircle, Loader2 } from 'lucide-react'

interface PlayerEvaluationProgressChartProps {
    evaluations: PlayerEvaluationDB[]
    loading?: boolean
}

const PHASE_LABELS: Record<PlayerEvaluationDB['phase'], string> = {
    start: 'Inicio',
    mid: 'Mitad',
    end: 'Final'
}

const SKILL_COLORS = {
    service: '#f97316',      // orange
    reception: '#3b82f6',    // blue
    attack: '#ef4444',       // red
    block: '#8b5cf6',        // purple
    defense: '#10b981',      // green
    errorImpact: '#f59e0b'   // amber
}

export function PlayerEvaluationProgressChart({ evaluations, loading }: PlayerEvaluationProgressChartProps) {
    if (loading) {
        return (
            <div className="flex justify-center items-center h-72">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    if (evaluations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-72 text-gray-500 dark:text-gray-400">
                <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm text-center">
                    Esta jugadora no tiene valoraciones registradas<br />para este equipo y temporada.
                </p>
            </div>
        )
    }

    // Transform data for Recharts
    const phaseOrder: Record<string, number> = { start: 1, mid: 2, end: 3 }
    const chartData = evaluations
        .sort((a, b) => phaseOrder[a.phase] - phaseOrder[b.phase])
        .map(evaluation => ({
            phase: PHASE_LABELS[evaluation.phase],
            Saque: evaluation.service_rating ?? null,
            Recepción: evaluation.reception_rating ?? null,
            Ataque: evaluation.attack_rating ?? null,
            Bloqueo: evaluation.block_rating ?? null,
            Defensa: evaluation.defense_rating ?? null,
            'Impacto Errores': evaluation.error_impact_rating ?? null
        }))

    return (
        <div className="w-full h-72 min-h-72">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis
                        dataKey="phase"
                        tick={{ fontSize: 12 }}
                        className="text-gray-600 dark:text-gray-400"
                    />
                    <YAxis
                        domain={[0, 3]}
                        ticks={[0, 1, 2, 3]}
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                        className="text-gray-600 dark:text-gray-400"
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line
                        type="monotone"
                        dataKey="Saque"
                        stroke={SKILL_COLORS.service}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                    />
                    <Line
                        type="monotone"
                        dataKey="Recepción"
                        stroke={SKILL_COLORS.reception}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                    />
                    <Line
                        type="monotone"
                        dataKey="Ataque"
                        stroke={SKILL_COLORS.attack}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                    />
                    <Line
                        type="monotone"
                        dataKey="Bloqueo"
                        stroke={SKILL_COLORS.block}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                    />
                    <Line
                        type="monotone"
                        dataKey="Defensa"
                        stroke={SKILL_COLORS.defense}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                    />
                    <Line
                        type="monotone"
                        dataKey="Impacto Errores"
                        stroke={SKILL_COLORS.errorImpact}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
