interface StackedTextDisplayProps {
    title: string
    startText?: string
    midText?: string
    endText?: string
}

/**
 * Stacked text display showing 3 phases vertically
 */
export function StackedTextDisplay({
    title,
    startText,
    midText,
    endText
}: StackedTextDisplayProps) {
    const renderText = (text: string | undefined, phase: string) => {
        return (
            <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 py-3">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        {phase}
                    </span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                    {text || (
                        <span className="text-gray-400 dark:text-gray-600 italic">
                            No evaluado
                        </span>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                {title}
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-0">
                {renderText(startText, 'Inicio')}
                {renderText(midText, 'Mitad')}
                {renderText(endText, 'Final')}
            </div>
        </div>
    )
}
