/**
 * Audit Service - Phase 3A
 * 
 * Records all destructive actions (DELETE, UNASSIGN, REMOVE) for:
 * - Compliance and auditing
 * - Debugging and troubleshooting  
 * - Future data recovery (Phase 3B)
 */

import { supabase } from '@/lib/supabaseClient'

export type ActionType = 'DELETE' | 'UNASSIGN' | 'REMOVE'

export type EntityType =
    | 'player'
    | 'team'
    | 'category'
    | 'identifier'
    | 'player_team'
    | 'coach_team'
    | 'secondary_assignment'

export interface AuditLogEntry {
    actionType: ActionType
    entityType: EntityType
    entityId: string
    entityName?: string
    clubId?: string
    seasonId?: string
    entitySnapshot?: Record<string, unknown>
}

export interface AuditLogRecord {
    id: string
    user_id: string
    user_email: string | null
    performed_at: string
    action_type: ActionType
    entity_type: EntityType
    entity_id: string
    entity_name: string | null
    club_id: string | null
    season_id: string | null
    entity_snapshot: Record<string, unknown> | null
}

export const auditService = {
    /**
     * Log a destructive action BEFORE executing it
     * This function never throws - errors are logged but don't block the operation
     */
    logDeletion: async (entry: AuditLogEntry): Promise<void> => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                console.warn('[AuditService] No authenticated user, skipping audit log')
                return
            }

            const { error } = await supabase
                .from('deletion_audit_log')
                .insert({
                    user_id: user.id,
                    user_email: user.email,
                    action_type: entry.actionType,
                    entity_type: entry.entityType,
                    entity_id: entry.entityId,
                    entity_name: entry.entityName || null,
                    club_id: entry.clubId || null,
                    season_id: entry.seasonId || null,
                    entity_snapshot: entry.entitySnapshot || null
                })

            if (error) {
                console.error('[AuditService] Failed to log deletion:', error)
            }
        } catch (err) {
            // Never throw - audit should not block operations
            console.error('[AuditService] Unexpected error:', err)
        }
    },

    /**
     * Get audit log entries for a club (admin view)
     */
    getAuditLog: async (clubId: string, limit = 50): Promise<AuditLogRecord[]> => {
        const { data, error } = await supabase
            .from('deletion_audit_log')
            .select('*')
            .eq('club_id', clubId)
            .order('performed_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('[AuditService] Error fetching audit log:', error)
            throw error
        }

        return data || []
    },

    /**
     * Get audit log entries by entity type
     */
    getAuditLogByType: async (
        clubId: string,
        entityType: EntityType,
        limit = 20
    ): Promise<AuditLogRecord[]> => {
        const { data, error } = await supabase
            .from('deletion_audit_log')
            .select('*')
            .eq('club_id', clubId)
            .eq('entity_type', entityType)
            .order('performed_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('[AuditService] Error fetching audit log by type:', error)
            throw error
        }

        return data || []
    }
}
