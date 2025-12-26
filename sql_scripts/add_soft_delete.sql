-- ============================================
-- Phase 3B: Soft Delete Migration
-- ============================================
-- Adds deleted_at column to club_players and teams for soft delete functionality

-- Add deleted_at to club_players
ALTER TABLE club_players ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to teams  
ALTER TABLE teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create partial indexes for efficient filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_players_not_deleted ON club_players(club_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teams_not_deleted ON teams(club_id, season_id) WHERE deleted_at IS NULL;

-- Verify
SELECT 'Soft delete columns added successfully' as status;
