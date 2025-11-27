import { useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { PlayerReportWithDetails } from '@/services/playerReportService'

interface PlayerHistoryTableProps {
    reports: PlayerReportWithDetails[]
}

export function PlayerHistoryTable({ reports }: PlayerHistoryTableProps) {
    // Sort reports by date ascending for history view
    const sortedReports = useMemo(() => {
        return [...reports].sort((a, b) =>
            new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
        )
    }, [reports])

    const calculateTechnicalAverage = (sections: any) => {
        const tech = sections.technical
        const scores = [
            tech.serves,
            tech.reception,
            tech.attack,
            tech.block,
            tech.defense,
            tech.errorImpact
        ]
        const sum = scores.reduce((a, b) => a + b, 0)
        return (sum / scores.length)
    }

    const calculateMentalAverage = (sections: any) => {
        const att = sections.attitude
        const scores = [
            att.attendance,
            att.intensity,
            att.communication,
            att.adaptation
        ]
        const sum = scores.reduce((a, b) => a + b, 0)
        return (sum / scores.length)
    }

    const calculateOverallAverage = (sections: any) => {
        const techAvg = calculateTechnicalAverage(sections)
        const mentalAvg = calculateMentalAverage(sections)
        return (techAvg + mentalAvg) / 2
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    const getScoreColor = (score: number) => {
        if (score >= 4.5) return 'text-green-600 bg-green-50'
        if (score >= 3.5) return 'text-blue-600 bg-blue-50'
        if (score >= 2.5) return 'text-yellow-600 bg-yellow-50'
        return 'text-red-600 bg-red-50'
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Fecha
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Tec
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Tac
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Mental
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Potencial
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
                                Media Final
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Comentario
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedReports.map((report) => {
                            const tech = calculateTechnicalAverage(report.sections)
                            const mental = calculateMentalAverage(report.sections)
                            const potential = calculateOverallAverage(report.sections)

                            // Calculate horizontal average (Tec + Mental + Potential) / 3
                            // Note: Tac is missing so we exclude it from average
                            const finalAvg = (tech + mental + potential) / 3

                            return (
                                <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-sm text-gray-900 dark:text-white font-medium">
                                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                            {formatDate(report.report_date)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getScoreColor(tech)}`}>
                                            {tech.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-400">
                                        -
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getScoreColor(mental)}`}>
                                            {mental.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getScoreColor(potential)}`}>
                                            {potential.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600">
                                            {finalAvg.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 max-w-xs" title={report.final_comment || ''}>
                                            {report.final_comment || '-'}
                                        </p>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
