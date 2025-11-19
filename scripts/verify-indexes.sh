#!/bin/bash
# Script to verify all performance indexes are created and being used

set -e

echo "=========================================="
echo "Database Performance Index Verification"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable not set"
    exit 1
fi

echo "1. Checking index counts per table..."
echo "--------------------------------------"
psql "$DATABASE_URL" -c "
SELECT tablename, COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN (
        'chat_sessions', 'support_queries', 'page_visits',
        'credit_transactions', 'device_sessions', 'referrals',
        'shoot_reports', 'shoot_progress'
    )
GROUP BY tablename
ORDER BY tablename;
"

echo ""
echo "2. Listing all performance indexes..."
echo "--------------------------------------"
psql "$DATABASE_URL" -c "
SELECT
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN (
        'chat_sessions', 'support_queries', 'page_visits',
        'credit_transactions', 'device_sessions', 'referrals',
        'shoot_reports', 'shoot_progress'
    )
    AND indexname NOT LIKE '%_pkey'
    AND indexname NOT LIKE '%_unique'
ORDER BY tablename, indexname;
"

echo ""
echo "3. Checking for unused indexes (never scanned)..."
echo "--------------------------------------"
psql "$DATABASE_URL" -c "
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND relname IN (
        'chat_sessions', 'support_queries', 'page_visits',
        'credit_transactions', 'device_sessions', 'referrals',
        'shoot_reports', 'shoot_progress'
    )
    AND idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'
    AND indexrelname NOT LIKE '%_unique'
ORDER BY pg_relation_size(indexrelid) DESC;
"

echo ""
echo "4. Index usage statistics (most used first)..."
echo "--------------------------------------"
psql "$DATABASE_URL" -c "
SELECT
    relname as tablename,
    indexrelname as indexname,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND relname IN (
        'chat_sessions', 'support_queries', 'page_visits',
        'credit_transactions', 'device_sessions', 'referrals',
        'shoot_reports', 'shoot_progress'
    )
    AND indexrelname NOT LIKE '%_pkey'
    AND indexrelname NOT LIKE '%_unique'
ORDER BY idx_scan DESC
LIMIT 20;
"

echo ""
echo "5. Checking for tables with high sequential scans..."
echo "--------------------------------------"
psql "$DATABASE_URL" -c "
SELECT
    schemaname,
    relname as tablename,
    seq_scan as sequential_scans,
    seq_tup_read as rows_read_sequentially,
    idx_scan as index_scans,
    CASE
        WHEN seq_scan + idx_scan > 0
        THEN ROUND((100.0 * idx_scan / (seq_scan + idx_scan))::numeric, 2)
        ELSE 100.0
    END as index_usage_percentage
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND relname IN (
        'chat_sessions', 'support_queries', 'page_visits',
        'credit_transactions', 'device_sessions', 'referrals',
        'shoot_reports', 'shoot_progress'
    )
ORDER BY seq_tup_read DESC;
"

echo ""
echo "6. Total storage used by indexes..."
echo "--------------------------------------"
psql "$DATABASE_URL" -c "
SELECT
    SUM(pg_relation_size(indexrelid))::bigint as total_bytes,
    pg_size_pretty(SUM(pg_relation_size(indexrelid))::bigint) as total_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND relname IN (
        'chat_sessions', 'support_queries', 'page_visits',
        'credit_transactions', 'device_sessions', 'referrals',
        'shoot_reports', 'shoot_progress'
    );
"

echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "Expected results:"
echo "  - chat_sessions: 7 indexes"
echo "  - support_queries: 6 indexes"
echo "  - page_visits: 5 indexes"
echo "  - credit_transactions: 6 indexes"
echo "  - device_sessions: 5 indexes"
echo "  - referrals: 4 indexes"
echo "  - shoot_reports: 5 indexes"
echo "  - shoot_progress: 6 indexes"
echo ""
echo "Index usage percentage should be > 90% for active tables"
echo "Unused indexes (times_used = 0) may be dropped if they remain unused after production testing"
