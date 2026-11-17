CREATE DATABASE IF NOT EXISTS default;

-- 1. Raw Transactions Table: Stores every transaction flowing through the pipeline
CREATE TABLE IF NOT EXISTS default.raw_transactions (
    transaction_id String,
    timestamp DateTime64(3, 'UTC'),
    sender_name String,
    sender_vpa String,
    receiver_name String,
    receiver_vpa String,
    amount Float64,
    status String,
    bank_code String,
    location String,
    INDEX idx_txn_id transaction_id TYPE bloom_filter() GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (sender_vpa, timestamp);

-- 2. Fraud Alerts Table: Stores flagged mule accounts with full dynamic hop chains
CREATE TABLE IF NOT EXISTS default.fraud_alerts (
    alert_id UUID,
    alert_type String,
    account_id String,
    amount Float64,
    detected_at DateTime64(3, 'UTC'),
    txn_ids Array(String)
) ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMMDD(detected_at)
ORDER BY (account_id, detected_at);
