import { useState, useRef } from 'react'
import { Upload, AlertTriangle, X, FileSpreadsheet, ArrowRight, Save, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { playerImportService, ImportRow, ImportSummary } from '@/services/playerImportService'
import { PlayerDB, playerService } from '@/services/playerService'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

interface PlayerImportWizardProps {
    onClose: () => void
    onComplete: () => void
    existingPlayers: PlayerDB[]
}

type Step = 'upload' | 'mapping' | 'preview' | 'result'

export function PlayerImportWizard({ onClose, onComplete, existingPlayers }: PlayerImportWizardProps) {
    const { profile } = useAuthStore()
    const [step, setStep] = useState<Step>('upload')
    // const [file, setFile] = useState<File | null>(null) // Unused for now
    const [headers, setHeaders] = useState<string[]>([])
    const [rawRows, setRawRows] = useState<any[]>([])
    const [mapping, setMapping] = useState<Record<string, string>>({})
    const [processedRows, setProcessedRows] = useState<ImportRow[]>([])
    const [summary, setSummary] = useState<ImportSummary | null>(null)
    const [sensitiveWarning, setSensitiveWarning] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const availableFields = playerImportService.getFieldOptions()

    // --- STEP 1: UPLOAD ---
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0])
        }
    }

    const processFile = async (f: File) => {
        try {
            // setFile(f)
            setIsProcessing(true)
            const result = await playerImportService.parseFile(f)
            setHeaders(result.headers)
            setRawRows(result.rows)
            setSensitiveWarning(result.sensitiveDetected)

            // Auto-detect mapping
            const autoMapping = playerImportService.detectMapping(result.headers)
            setMapping(autoMapping)

            setStep('mapping')
        } catch (error) {
            toast.error('Error al leer el archivo. Asegúrate que es un Excel o CSV válido.')
            console.error(error)
            // setFile(null)
        } finally {
            setIsProcessing(false)
        }
    }

    // --- STEP 2: MAPPING ---
    const updateMapping = (header: string, field: string) => {
        setMapping(prev => {
            const next = { ...prev }
            if (field === '') delete next[header]
            else next[header] = field
            return next
        })
    }

    const validateMapping = () => {
        // Check if required fields are mapped
        const mappedFields = Object.values(mapping)
        const missing = availableFields
            .filter(f => f.required)
            .filter(f => !mappedFields.includes(f.key))

        if (missing.length > 0) {
            toast.error(`Faltan campos obligatorios: ${missing.map(m => m.label).join(', ')}`)
            return
        }

        // Process rows
        const rows = playerImportService.processRows(rawRows, mapping, existingPlayers)
        setProcessedRows(rows)

        // Calculate summary
        const sum = {
            total: rows.length,
            valid: rows.filter(r => r.status === 'valid').length,
            errors: rows.filter(r => r.status === 'error').length,
            warnings: rows.filter(r => r.status === 'warning').length,
            toCreate: rows.filter(r => r.action === 'create').length,
            toUpdate: rows.filter(r => r.action === 'update').length,
            toSkip: rows.filter(r => r.action === 'skip').length
        }
        setSummary(sum)
        setStep('preview')
    }

    // --- STEP 4: EXECUTE ---
    const executeImport = async () => {
        if (!profile?.club_id) return
        setIsProcessing(true)
        let successCount = 0

        try {
            const rowsToImport = processedRows.filter(r => r.action === 'create' && r.status !== 'error')

            // Batch create (sequential for MVP to avoid complexity, or Promise.all chunks)
            // Using sequential for safer feedback
            for (const row of rowsToImport) {
                try {
                    await playerService.createPlayer({
                        club_id: profile.club_id,
                        first_name: row.mappedData.first_name!,
                        last_name: row.mappedData.last_name!,
                        birth_date: row.mappedData.birth_date!,
                        gender: 'female', // Default or need mapping? MVP assumes female or check gender mapping?
                        // If we map gender, use it. If not, default to 'female' or ask user?
                        // MVP: Let's default 'female' BUT if mapping has it...
                        // We didn't allow gender in ALLOWED_FIELDS. Let's assume all 'female' for now or add it later.
                        // User request: "Nom, Cognoms, Data naixement (obligatori) ... Camps sensibles no"
                        // Ok, defaulting to female as current code does in manual creation, user can edit later.
                        is_active: true,
                        main_position: (row.mappedData.main_position || 'OH') as any,
                        secondary_position: null,
                        dominant_hand: 'right', // Default
                        notes: 'Importado vía Excel',
                        ...row.mappedData // Overspread optional fields (phone, email...)
                    } as any)
                    successCount++
                } catch (err) {
                    console.error('Failed row', row, err)
                }
            }

            toast.success(`Importación completada. ${successCount} jugadoras creadas.`)
            onComplete()
        } catch (error) {
            toast.error('Error durante la importación')
            console.error(error)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileSpreadsheet className="text-green-600" />
                            Importar Jugadoras
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Paso {step === 'upload' ? 1 : step === 'mapping' ? 2 : step === 'preview' ? 3 : 4} de 3
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" icon={X} onClick={onClose}>
                        {''}
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* STEP 1: UPLOAD */}
                    {step === 'upload' && (
                        <div className="h-full flex flex-col items-center justify-center p-6">
                            <div className="w-full max-w-lg border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 p-10 flex flex-col items-center justify-center mb-8">
                                <Upload className="w-16 h-16 text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    Sube tu archivo Excel o CSV
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center max-w-sm">
                                    Asegúrate de incluir al menos: Nombre, Apellidos y Fecha de Nacimiento.
                                </p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".xlsx, .xls, .csv"
                                    className="hidden"
                                />
                                <Button
                                    variant="primary"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Procesando...' : 'Seleccionar archivo'}
                                </Button>
                            </div>

                            <div className="text-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={Download}
                                    onClick={() => playerImportService.downloadTemplate()}
                                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                                >
                                    Descargar plantilla Excel
                                </Button>
                                <p className="text-xs text-gray-400 mt-2">
                                    Omple la plantilla amb les dades bàsiques. Nom, cognoms i data de naixement són obligatoris.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: MAPPING */}
                    {step === 'mapping' && (
                        <div className="space-y-6">
                            {sensitiveWarning && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Datos sensibles detectados</h4>
                                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                            Hemos detectado columnas que podrían contener DNI, IBAN o datos bancarios.
                                            Por seguridad, estos datos <strong>no se importarán</strong> en esta versión.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                                Asocia las columnas de tu archivo con los campos de la base de datos.
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {headers.map((header, idx) => {
                                    const mappedField = mapping[header]
                                    const isMapped = !!mappedField
                                    // Highlight required mappings
                                    const isRequiredMapped = availableFields.find(f => f.key === mappedField)?.required

                                    return (
                                        <div key={idx} className={cn(
                                            "border rounded-lg p-3 transition-colors",
                                            isMapped
                                                ? isRequiredMapped
                                                    ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800"
                                                    : "border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800"
                                                : "border-gray-200 dark:border-gray-700"
                                        )}>
                                            <div className="text-xs text-gray-500 mb-1 font-mono truncate" title={header}>
                                                {header}
                                            </div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 truncate">
                                                Ej: {rawRows[0] ? rawRows[0][header] : '-'}
                                            </div>
                                            <select
                                                className="w-full text-sm border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600"
                                                value={mappedField || ''}
                                                onChange={(e) => updateMapping(header, e.target.value)}
                                            >
                                                <option value="">Ignorar columna</option>
                                                {availableFields.map(field => (
                                                    <option key={field.key} value={field.key}>
                                                        {field.label} {field.required ? '*' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PREVIEW */}
                    {step === 'preview' && (
                        <div className="h-full flex flex-col">
                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold">{summary?.total}</div>
                                    <div className="text-xs text-gray-500 uppercase">Filas Totales</div>
                                </div>
                                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">{summary?.toCreate}</div>
                                    <div className="text-xs text-green-600 uppercase">Nuevas</div>
                                </div>
                                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{summary?.toSkip}</div>
                                    <div className="text-xs text-yellow-600 uppercase">Duplicados (Saltar)</div>
                                </div>
                                <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">{summary?.errors}</div>
                                    <div className="text-xs text-red-600 uppercase">Errores</div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="flex-1 overflow-auto border rounded-lg border-gray-200 dark:border-gray-700">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">F. Nacimiento</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Info</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {processedRows.slice(0, 50).map((row, idx) => (
                                            <tr key={idx} className={row.status === 'error' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    {row.status === 'valid' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Válido</span>}
                                                    {row.status === 'warning' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Duplicado</span>}
                                                    {row.status === 'error' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Error</span>}
                                                </td>
                                                <td className="px-4 py-2">
                                                    {row.mappedData.first_name} {row.mappedData.last_name}
                                                </td>
                                                <td className="px-4 py-2">
                                                    {row.mappedData.birth_date || <span className="text-red-500 text-xs">Inválida</span>}
                                                </td>
                                                <td className="px-4 py-2 text-gray-500">
                                                    {row.errors.length > 0 ? (
                                                        <span className="text-red-500 text-xs">{row.errors.join(', ')}</span>
                                                    ) : (
                                                        <span>{row.mappedData.main_position}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {processedRows.length > 50 && (
                                    <div className="p-2 text-center text-xs text-gray-500 border-t">
                                        Mostrando primeras 50 filas de {processedRows.length}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between">
                    <Button variant="ghost" onClick={step === 'upload' ? onClose : () => setStep(step === 'preview' ? 'mapping' : 'upload')}>
                        Atrás
                    </Button>

                    {step === 'mapping' && (
                        <Button variant="primary" icon={ArrowRight} onClick={validateMapping}>
                            Revisar Datos
                        </Button>
                    )}

                    {step === 'preview' && (
                        <Button
                            variant="primary"
                            icon={Save}
                            onClick={executeImport}
                            disabled={summary?.toCreate === 0 || isProcessing}
                        >
                            {isProcessing ? 'Importando...' : `Importar ${summary?.toCreate} jugadoras`}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
