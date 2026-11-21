-- ============================================================================
-- Migration: 002_credit_limit_and_product_min_stock.sql
-- Description: Backward-compatible columns for customer credit limit enforcement
--              and per-product custom low-stock alert threshold.
-- ============================================================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(18, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS enforce_credit_limit BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC(18, 4) DEFAULT NULL;
