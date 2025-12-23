-- Add session type and source map columns for aggregated result tracking
-- This enables explicit session classification and question source attribution

ALTER TABLE results
ADD COLUMN session_type TEXT DEFAULT NULL,
ADD COLUMN source_map JSONB DEFAULT NULL;

-- Index for filtering/aggregating by session type in analytics
CREATE INDEX idx_results_session_type ON results(session_type) WHERE session_type IS NOT NULL;

-- Documentation comments
COMMENT ON COLUMN results.session_type IS 'Session type: standard, smart_round, srs_review, topic_study, interleaved';
COMMENT ON COLUMN results.source_map IS 'Maps question ID to source quiz ID for aggregated sessions (srs_review, topic_study, interleaved)';

