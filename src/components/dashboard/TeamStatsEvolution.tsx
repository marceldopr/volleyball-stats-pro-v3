import { useState } from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'
import { TeamEvolutionData } from '@/services/teamStatsService'

interface TeamStatsEvolutionProps {
    data: TeamEvolutionData[]
}

type MetricType = 'points' | 'errors' | 'ratio'

export function TeamStatsEvolution({ data }: TeamStatsEvolutionProps) {
    const [metric, setMetric] = useState<MetricType>('points')

    if (!data || data.length < 2) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                    Todavía no hay suficientes partidos para mostrar esta evolución.
                </p>
            </div>
        )
    }

    // Transform data for chart
    const chartData = data.map(d => ({
        name: new Date(d.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        fullDate: new Date(d.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
        opponent: d.opponent,
        result: d.result,
        points: parseFloat(d.stats.pointsPerSet.toFixed(1)),
        errors: parseFloat(d.stats.errorsPerSet.toFixed(1)),
        ratio: parseFloat(d.stats.pointsErrorRatio.toFixed(2))
    }))

    const getMetricLabel = (m: MetricType) => {
        switch (m) {
            case 'points': return 'Puntos por Set'
            case 'errors': return 'Errores por Set'
            case 'ratio': return 'Ratio Puntos/Error'
        }
    }

    const getMetricColor = (m: MetricType) => {
        switch (m) {
            case 'points': return '#10b981' // emerald-500
            case 'errors': return '#ef4444' // red-500
            case 'ratio': return '#3b82f6' // blue-500
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Evolución del Equipo</h3>

                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    {(['points', 'errors', 'ratio'] as MetricType[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMetric(m)}
                            className={`
                                px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                                ${metric === m
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }
                            `}
                        >
                            {m === 'points' && 'Puntos'}
                            {m === 'errors' && 'Errores'}
                            {m === 'ratio' && 'Ratio'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            domain={metric === 'ratio' ? [0, 'auto'] : [0, 'auto']}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                borderColor: '#374151',
                                borderRadius: '0.5rem',
                                color: '#f3f4f6'
                            }}
                            itemStyle={{ color: '#f3f4f6' }}
                            labelStyle={{ color: '#9ca3af', marginBottom: '0.25rem' }}
                            formatter={(value: number) => [value, getMetricLabel(metric)]}
                            labelFormatter={(label, payload) => {
                                if (payload && payload.length > 0) {
                                    const data = payload[0].payload
                                    return `${data.fullDate} vs ${data.opponent} (${data.result})`
                                }
                                return label
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey={metric}
                            stroke={getMetricColor(metric)}
                            strokeWidth={3}
                            dot={{ r: 4, fill: getMetricColor(metric), strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
