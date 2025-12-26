-- ============================================
-- Phase 3A: Deletion Audit Log
-- ============================================
-- This table records all destructive actions for compliance and recovery

CREATE TABLE IF NOT EXISTS deletion_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who and when
    user_id UUID NOT NULL REFERENCES auth.users(id),
    user_email TEXT,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- What was deleted
    action_type TEXT NOT NULL,          -- 'DELETE' | 'UNASSIGN' | 'REMOVE'
    entity_type TEXT NOT NULL,          -- 'player' | 'team' | 'category' | etc.
    entity_id UUID NOT NULL,
    entity_name TEXT,
    
    -- Context
    club_id UUID REFERENCES clubs(id),
    season_id UUID REFERENCES seasons(id),
    
    -- Snapshot for recovery
    entity_snapshot JSONB,
    
    -- Metadata (optional)
    ip_address INET,
    user_agent TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON deletion_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_club_id ON deletion_audit_log(club_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity_type ON deletion_audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON deletion_audit_log(performed_at DESC);

-- RLS
ALTER TABLE deletion_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Club admins can view audit log
CREATE POLICY "Club admins can view audit log"
    ON deletion_audit_log FOR SELECT
    USING (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('dt', 'admin')
        )
    );

-- Policy: Authenticated users can insert their own audit entries
CREATE POLICY "Authenticated users can insert audit log"
    ON deletion_audit_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Verify creation
SELECT 'deletion_audit_log table created successfully' as status;
