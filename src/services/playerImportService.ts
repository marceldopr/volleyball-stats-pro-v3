import { read, utils, writeFile } from 'xlsx'
import { PlayerDB } from './playerService'

export interface ImportColumn {
    header: string
    sample: string
    mappedTo: string | null
    isDirty: boolean
}

export interface ImportRow {
    index: number
    data: Record<string, any>
    mappedData: Partial<PlayerDB>
    status: 'valid' | 'error' | 'warning'
    errors: string[]
    action: 'create' | 'update' | 'skip'
    originalRow: any
}

export interface ImportSummary {
    total: number
    valid: number
    errors: number
    warnings: number
    toCreate: number
    toUpdate: number
    toSkip: number
}

// Allowed fields for MVP (Only those present in PlayerDB)
const ALLOWED_FIELDS = [
    { key: 'first_name', label: 'Nombre', required: true },
    { key: 'last_name', label: 'Apellidos', required: true },
    { key: 'birth_date', label: 'Fecha Nacimiento', required: true },
    // { key: 'email', label: 'Email', required: false }, // Not in DB
    // { key: 'phone', label: 'Teléfono', required: false }, // Not in DB
    { key: 'height_cm', label: 'Altura (cm)', required: false },
    { key: 'weight_kg', label: 'Peso (kg)', required: false },
    { key: 'main_position', label: 'Posición', required: false },
    { key: 'notes', label: 'Notas', required: false },
]

const SENSITIVE_KEYWORDS = ['dni', 'nif', 'iban', 'banc', 'cuenta', 'seguridad social', 'pasaporte']

export const playerImportService = {
    /**
     * Parse file and return raw data + detected columns
     */
    parseFile: async (file: File): Promise<{ headers: string[], rows: any[], sensitiveDetected: boolean }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const data = e.target?.result
                    const workbook = read(data, { type: 'binary', cellDates: true })
                    const firstSheetName = workbook.SheetNames[0]
                    const worksheet = workbook.Sheets[firstSheetName]

                    // Get headers and rows
                    const jsonData = utils.sheet_to_json(worksheet, { header: 1 })
                    if (jsonData.length === 0) throw new Error('El archivo está vacío')

                    const headers = (jsonData[0] as string[]).map(h => h?.toString().trim()).filter(h => h)
                    const rows = utils.sheet_to_json(worksheet, { header: headers, defval: '' })

                    // Detect sensitive columns
                    const sensitiveDetected = headers.some(h =>
                        SENSITIVE_KEYWORDS.some(k => h.toLowerCase().includes(k))
                    )

                    resolve({ headers, rows, sensitiveDetected })
                } catch (error) {
                    reject(error)
                }
            }
            reader.onerror = (error) => reject(error)
            reader.readAsBinaryString(file)
        })
    },

    /**
     * Auto-detect column mapping based on headers
     */
    detectMapping: (headers: string[]): Record<string, string> => {
        const mapping: Record<string, string> = {}
        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

        headers.forEach(header => {
            const h = normalize(header)

            // Name
            if (['nom', 'nombre', 'name', 'first name', 'nom del jugador/a'].some(k => h.includes(k)) && !h.includes('cognom') && !h.includes('apelli')) {
                mapping[header] = 'first_name'
            }
            // Last Name
            else if (['cognom', 'apellido', 'last name', 'sirname'].some(k => h.includes(k))) {
                mapping[header] = 'last_name'
            }
            // Date of birth
            else if (['data', 'fecha', 'nacimiento', 'birth', 'naixement'].some(k => h.includes(k))) {
                mapping[header] = 'birth_date'
            }
            // Position
            else if (['posicio', 'posicion', 'rol'].some(k => h.includes(k))) {
                mapping[header] = 'main_position'
            }
            // Height
            else if (['altura', 'height', 'cm'].some(k => h.includes(k))) {
                mapping[header] = 'height_cm'
            }
            // Weight
            else if (['peso', 'pes', 'weight', 'kg'].some(k => h.includes(k))) {
                mapping[header] = 'weight_kg'
            }
            // Notes
            else if (['notas', 'notes', 'observa'].some(k => h.includes(k))) {
                mapping[header] = 'notes'
            }
        })
        return mapping
    },

    /**
     * Validate and process rows based on mapping
     */
    processRows: (
        rawRows: any[],
        mapping: Record<string, string>,
        existingPlayers: PlayerDB[]
    ): ImportRow[] => {
        return rawRows.map((row, index) => {
            const mappedData: Partial<PlayerDB> = {}
            const errors: string[] = []
            let status: 'valid' | 'error' | 'warning' = 'valid'
            let action: 'create' | 'update' | 'skip' = 'create'

            // Apply mapping
            Object.entries(mapping).forEach(([header, field]) => {
                let value = row[header]
                if (value !== undefined && value !== '') {
                    // Normalize specific fields
                    if (field === 'birth_date') {
                        value = playerImportService.parseDate(value)
                        if (!value) errors.push('Fecha de nacimiento inválida')
                    }
                    if (field === 'height_cm' || field === 'weight_kg') {
                        value = parseInt(value) || null
                    }
                    if (field === 'main_position') {
                        value = playerImportService.normalizePosition(value)
                    }

                    // Strict safe assignment
                    (mappedData as any)[field] = value
                }
            })

            // Check required fields
            // Check required fields
            const requiredFields = ALLOWED_FIELDS.filter(f => f.required)
            for (const f of requiredFields) {
                const key = f.key as keyof PlayerDB
                if (!mappedData[key]) {
                    errors.push(`Falta ${f.label}`)
                    status = 'error'
                }
            }

            // Deduplication Check
            if (status !== 'error') {
                const existing = existingPlayers.find(p => {
                    const md: any = mappedData
                    // Match by Name + DOB ONLY
                    if (md.first_name && md.last_name && md.birth_date) {
                        const nameMatch =
                            p.first_name.toLowerCase().trim() === md.first_name.toLowerCase().trim() &&
                            p.last_name.toLowerCase().trim() === md.last_name.toLowerCase().trim()

                        const dobMatch = p.birth_date === md.birth_date
                        return nameMatch && dobMatch
                    }
                    return false
                })

                if (existing) {
                    status = 'warning'
                    action = 'skip'
                    errors.push('Posible duplicado detectado')
                }
            }

            return {
                index,
                data: row,
                mappedData,
                status,
                errors,
                action,
                originalRow: row
            }
        })
    },

    /**
     * Helper to parse dates strictly
     */
    parseDate: (value: any): string | null => {
        if (!value) return null

        // If it's a JS Date object (from xlsx cellDates: true)
        if (value instanceof Date) {
            return value.toISOString().split('T')[0]
        }

        // Try YYYY-MM-DD
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value
        }

        // Try DD/MM/YYYY or DD-MM-YYYY
        if (typeof value === 'string') {
            const parts = value.split(/[-/]/)
            if (parts.length === 3) {
                // assume d-m-y
                const d = parseInt(parts[0])
                const m = parseInt(parts[1]) - 1
                const y = parseInt(parts[2])
                const date = new Date(y, m, d)
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0]
                }
            }
        }

        return null
    },

    normalizePosition: (val: string): string => {
        if (!val) return 'OH' // Default? Or null?
        const v = val.toLowerCase()
        if (v.includes('coloc') || v.includes('setter')) return 'S'
        if (v.includes('recep') || v.includes('punt') || v.includes('out')) return 'OH'
        if (v.includes('cent') || v.includes('midd')) return 'MB'
        if (v.includes('opues') || v.includes('opp')) return 'OPP'
        if (v.includes('lib') || v.includes('líb')) return 'L'
        return 'OH'
    },

    getFieldOptions: () => ALLOWED_FIELDS,

    /**
     * Generate and download Excel template
     */
    downloadTemplate: () => {
        const headers = [
            'Nom del jugador/a',
            'Cognoms del jugador/a',
            'Data de naixement del jugador/a',
            'e-mail jugador/a',
            'Telèfon de contacte jugador/a'
        ]

        const descriptionRow = [
            'Obligatori',
            'Obligatori',
            'Obligatori (DD/MM/YYYY)',
            'Opcional',
            'Opcional'
        ]

        const exampleRow1 = [
            'Maria',
            'Garcia López',
            '15/03/2008',
            'maria.garcia@example.com',
            '600123456'
        ]

        const exampleRow2 = [
            'Laia',
            'Martínez Soler',
            '22/11/2009',
            '',
            ''
        ]

        const aoa = [headers, descriptionRow, exampleRow1, exampleRow2]

        const wb = utils.book_new()
        const ws = utils.aoa_to_sheet(aoa)

        // Auto-width columns approx
        ws['!cols'] = [
            { wch: 20 }, // Nom
            { wch: 25 }, // Cognoms
            { wch: 25 }, // Data
            { wch: 25 }, // Email
            { wch: 20 }  // Telèfon
        ]

        utils.book_append_sheet(wb, ws, 'Jugadores')
        writeFile(wb, 'plantilla_import_jugadores.xlsx')
    }
}
