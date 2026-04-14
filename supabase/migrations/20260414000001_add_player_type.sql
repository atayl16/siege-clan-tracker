-- Add player_type column to store ironman account type
-- This is separate from 'build' which stores character build (main, pure, f2p, etc.)

ALTER TABLE members ADD COLUMN IF NOT EXISTS player_type TEXT DEFAULT 'regular';

-- Add comment explaining the difference
COMMENT ON COLUMN members.player_type IS 'Account type from WOM: regular, ironman, hardcore, ultimate, group_ironman, hardcore_group_ironman, unranked_group_ironman';
COMMENT ON COLUMN members.build IS 'Character build type: main, f2p, def1, lvl3, 1def, 10hp, etc.';

-- Create index for filtering by player_type
CREATE INDEX IF NOT EXISTS idx_members_player_type ON members(player_type);
