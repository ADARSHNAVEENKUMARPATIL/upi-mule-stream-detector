import logging
import os
import re
import sys
from typing import Any, Dict, List, Optional
import clickhouse_connect
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

app = FastAPI(
    title="Real-Time UPI Mule Alert API",
    description="FastAPI service for querying real-time mule account fraud alerts and live raw transactions from ClickHouse",
    version="2.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ClickHouse Configuration
CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "localhost")
CLICKHOUSE_PORT = int(os.getenv("CLICKHOUSE_PORT", "8123"))
CLICKHOUSE_USER = os.getenv("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "")
CLICKHOUSE_DB = os.getenv("CLICKHOUSE_DB", "default")


def get_client():
    return clickhouse_connect.get_client(
        host=CLICKHOUSE_HOST,
        port=CLICKHOUSE_PORT,
        username=CLICKHOUSE_USER,
        password=CLICKHOUSE_PASSWORD,
        database=CLICKHOUSE_DB
    )


@app.get("/health")
def health_check():
    """Health check endpoint to verify ClickHouse database connectivity."""
    try:
        client = get_client()
        row = client.command("SELECT 1")
        return {"status": "ok", "clickhouse_connected": bool(row == 1)}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}


@app.get("/stats")
def get_stream_stats():
    """
    Returns aggregate real-time transaction count and total processed volume from ClickHouse.
    """
    try:
        client = get_client()
        result = client.query("SELECT count(), coalesce(sum(amount), 0) FROM raw_transactions")
        row = result.result_rows[0]
        return {
            "total_count": int(row[0]),
            "total_volume": float(row[1])
        }
    except Exception as e:
        logging.error(f"Error querying stream stats: {e}")
        return {"total_count": 0, "total_volume": 0.0}


@app.get("/transactions", response_model=List[Dict[str, Any]])
def get_recent_transactions(limit: int = Query(30, ge=1, le=100)):
    """
    Returns the most recent raw UPI transactions for the Left Panel Live Feed.
    """
    safe_limit = int(limit)
    query = f"""
    SELECT
        transaction_id,
        formatDateTime(timestamp, '%Y-%m-%dT%H:%i:%SZ') AS timestamp,
        sender_name,
        sender_vpa,
        receiver_name,
        receiver_vpa,
        amount,
        status,
        bank_code,
        location
    FROM raw_transactions
    ORDER BY timestamp DESC
    LIMIT {safe_limit}
    """
    try:
        client = get_client()
        result = client.query(query)
        transactions: List[Dict[str, Any]] = []

        for row in result.result_rows:
            transactions.append({
                "transaction_id": row[0],
                "timestamp": row[1],
                "sender_name": row[2],
                "sender_vpa": row[3],
                "receiver_name": row[4],
                "receiver_vpa": row[5],
                "amount": float(row[6]),
                "status": row[7],
                "bank_code": row[8],
                "location": row[9]
            })

        return transactions
    except Exception as e:
        logging.error(f"Error querying ClickHouse raw transactions: {e}")
        return []


@app.get("/alerts", response_model=List[Dict[str, Any]])
def get_alerts(limit: int = Query(50, ge=1, le=200)):
    """
    Returns the most recent fraud alerts for the Right Panel Mule Alerts Feed.
    """
    safe_limit = int(limit)
    query = f"""
    SELECT
        toString(alert_id) AS alert_id,
        alert_type,
        account_id,
        amount,
        formatDateTime(detected_at, '%Y-%m-%dT%H:%i:%SZ') AS detected_at,
        txn_ids
    FROM fraud_alerts
    ORDER BY detected_at DESC
    LIMIT {safe_limit}
    """
    try:
        client = get_client()
        result = client.query(query)
        alerts: List[Dict[str, Any]] = []

        for row in result.result_rows:
            alerts.append({
                "alert_id": row[0],
                "alert_type": row[1],
                "account_id": row[2],
                "amount": float(row[3]),
                "detected_at": row[4],
                "txn_ids": list(row[5]) if row[5] is not None else []
            })

        return alerts
    except Exception as e:
        logging.error(f"Error querying ClickHouse alerts: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"ClickHouse query error: {str(e)}"
        )


@app.get("/alerts/{alert_id}", response_model=Dict[str, Any])
def get_alert_hop_chain(alert_id: str):
    """
    Returns detailed metadata and the exact sequential Hop Chain for a clicked mule alert.
    Queries ClickHouse for the alert, retrieves associated transaction hops, and traces
    connected forward/backward transfers (<= 15s) to guarantee full 3, 4, 5+ hop chains.
    """
    # Sanitize alert_id to avoid injection
    clean_alert_id = re.sub(r"[^a-zA-Z0-9_-]", "", alert_id)
    if not clean_alert_id:
        raise HTTPException(status_code=400, detail="Invalid alert_id format")

    try:
        client = get_client()

        # 1. Fetch the alert details
        alert_query = f"""
        SELECT
            toString(alert_id) AS alert_id,
            alert_type,
            account_id,
            amount,
            formatDateTime(detected_at, '%Y-%m-%dT%H:%i:%SZ') AS detected_at,
            txn_ids
        FROM fraud_alerts
        WHERE toString(alert_id) = '{clean_alert_id}'
        LIMIT 1
        """
        alert_res = client.query(alert_query)
        if not alert_res.result_rows:
            raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")

        alert_row = alert_res.result_rows[0]
        raw_txn_ids = list(alert_row[5]) if alert_row[5] is not None else []

        chain_txs: List[Dict[str, Any]] = []
        visited_ids = set()

        # 2. Query initial transactions from raw_transactions
        if raw_txn_ids:
            sanitized_tids = [f"'{re.sub(r'[^a-zA-Z0-9_-]', '', tid)}'" for tid in raw_txn_ids if tid]
            if sanitized_tids:
                in_clause = ", ".join(sanitized_tids)
                tx_query = f"""
                SELECT
                    transaction_id,
                    formatDateTime(timestamp, '%Y-%m-%dT%H:%i:%SZ') AS timestamp_str,
                    sender_name,
                    sender_vpa,
                    receiver_name,
                    receiver_vpa,
                    amount,
                    status,
                    bank_code,
                    location,
                    toUnixTimestamp64Milli(timestamp) AS ts_ms
                FROM raw_transactions
                WHERE transaction_id IN ({in_clause})
                ORDER BY timestamp ASC
                """
                tx_res = client.query(tx_query)
                for tr in tx_res.result_rows:
                    chain_txs.append({
                        "transaction_id": tr[0],
                        "timestamp": tr[1],
                        "sender_name": tr[2],
                        "sender_vpa": tr[3],
                        "receiver_name": tr[4],
                        "receiver_vpa": tr[5],
                        "amount": float(tr[6]),
                        "status": tr[7],
                        "bank_code": tr[8],
                        "location": tr[9],
                        "ts_ms": tr[10]
                    })
                    visited_ids.add(tr[0])

        # 3. Bidirectional graph traversal: expand forward and backward up to 5 hops
        # Reconstructs any 3, 4, 5+ hop chains passing through this mule account
        if chain_txs:
            # Expand forward from the latest transaction in the chain
            for _ in range(5):
                last_tx = chain_txs[-1]
                last_recv = re.sub(r"[^a-zA-Z0-9@._-]", "", str(last_tx["receiver_vpa"]))
                last_ts = last_tx["ts_ms"]
                fwd_query = f"""
                SELECT
                    transaction_id,
                    formatDateTime(timestamp, '%Y-%m-%dT%H:%i:%SZ') AS timestamp_str,
                    sender_name,
                    sender_vpa,
                    receiver_name,
                    receiver_vpa,
                    amount,
                    status,
                    bank_code,
                    location,
                    toUnixTimestamp64Milli(timestamp) AS ts_ms
                FROM raw_transactions
                WHERE sender_vpa = '{last_recv}'
                  AND toUnixTimestamp64Milli(timestamp) >= {last_ts}
                  AND toUnixTimestamp64Milli(timestamp) <= {last_ts + 15000}
                ORDER BY timestamp ASC
                LIMIT 1
                """
                fwd_res = client.query(fwd_query)
                if not fwd_res.result_rows:
                    break
                row = fwd_res.result_rows[0]
                if row[0] in visited_ids:
                    break
                visited_ids.add(row[0])
                chain_txs.append({
                    "transaction_id": row[0],
                    "timestamp": row[1],
                    "sender_name": row[2],
                    "sender_vpa": row[3],
                    "receiver_name": row[4],
                    "receiver_vpa": row[5],
                    "amount": float(row[6]),
                    "status": row[7],
                    "bank_code": row[8],
                    "location": row[9],
                    "ts_ms": row[10]
                })

            # Expand backward from the earliest transaction in the chain
            for _ in range(5):
                first_tx = chain_txs[0]
                first_sender = re.sub(r"[^a-zA-Z0-9@._-]", "", str(first_tx["sender_vpa"]))
                first_ts = first_tx["ts_ms"]
                bwd_query = f"""
                SELECT
                    transaction_id,
                    formatDateTime(timestamp, '%Y-%m-%dT%H:%i:%SZ') AS timestamp_str,
                    sender_name,
                    sender_vpa,
                    receiver_name,
                    receiver_vpa,
                    amount,
                    status,
                    bank_code,
                    location,
                    toUnixTimestamp64Milli(timestamp) AS ts_ms
                FROM raw_transactions
                WHERE receiver_vpa = '{first_sender}'
                  AND toUnixTimestamp64Milli(timestamp) <= {first_ts}
                  AND toUnixTimestamp64Milli(timestamp) >= {first_ts - 15000}
                ORDER BY timestamp DESC
                LIMIT 1
                """
                bwd_res = client.query(bwd_query)
                if not bwd_res.result_rows:
                    break
                row = bwd_res.result_rows[0]
                if row[0] in visited_ids:
                    break
                visited_ids.add(row[0])
                chain_txs.insert(0, {
                    "transaction_id": row[0],
                    "timestamp": row[1],
                    "sender_name": row[2],
                    "sender_vpa": row[3],
                    "receiver_name": row[4],
                    "receiver_vpa": row[5],
                    "amount": float(row[6]),
                    "status": row[7],
                    "bank_code": row[8],
                    "location": row[9],
                    "ts_ms": row[10]
                })

        # Format hops with 1-based sequential index
        hops: List[Dict[str, Any]] = []
        for idx, tr in enumerate(chain_txs, start=1):
            hops.append({
                "hop_index": idx,
                "transaction_id": tr["transaction_id"],
                "timestamp": tr["timestamp"],
                "sender_name": tr["sender_name"],
                "sender_vpa": tr["sender_vpa"],
                "receiver_name": tr["receiver_name"],
                "receiver_vpa": tr["receiver_vpa"],
                "amount": tr["amount"],
                "status": tr["status"],
                "bank_code": tr["bank_code"],
                "location": tr["location"]
            })

        return {
            "alert_id": alert_row[0],
            "alert_type": alert_row[1],
            "account_id": alert_row[2],
            "amount": float(alert_row[3]),
            "detected_at": alert_row[4],
            "txn_ids": [h["transaction_id"] for h in hops],
            "total_hops": len(hops),
            "hops": hops
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error querying hop chain for alert {alert_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Database error while querying alert hop chain: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
