import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AttendanceEvolutionPoint } from '@/services/teamStatsService'
import { AlertCircle, Loader2 } from 'lucide-react'

interface TeamAttendanceChartProps {
    data: AttendanceEvolutionPoint[]
    loading?: boolean
}

export function TeamAttendanceChart({ data, loading }: TeamAttendanceChartProps) {
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No hay datos de asistencia en los últimos 30 días</p>
            </div>
        )
    }

    // Format data for Recharts
    const chartData = data.map(point => ({
        date: formatDate(point.date),
        percentage: point.attendancePercentage,
        trainings: point.trainingsCount
    }))

    return (
        <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        className="text-gray-600 dark:text-gray-400"
                    />
                    <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 12 }}
                        className="text-gray-600 dark:text-gray-400"
                        label={{ value: '%', position: 'insideLeft', style: { fontSize: 12 } }}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: '#f97316', strokeWidth: 1 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="percentage"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ fill: '#f97316', r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

// Helper function to format date (DD-MM-YYYY)
function formatDate(dateString: string): string {
    const d = new Date(dateString)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}-${month}-${year}` // DD-MM-YYYY
}

// Custom tooltip component
function CustomTooltip({ active, payload }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {payload[0].payload.date}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Asistencia: <span className="font-semibold text-primary-600 dark:text-primary-400">
                        {payload[0].value}%
                    </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {payload[0].payload.trainings} entrenamiento{payload[0].payload.trainings !== 1 ? 's' : ''}
                </p>
            </div>
        )
    }
    return null
}
