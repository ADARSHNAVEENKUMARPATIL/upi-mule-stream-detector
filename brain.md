# Project Context & System State: Real-Time UPI & Mule Account Stream Detector

## 1. What We Are Building
A real-time fraud detection pipeline for UPI transactions that analyzes the velocity and multi-hop flow of funds to uncover "money mule" networks (where funds rapidly hop across multiple accounts within seconds).

## 2. The Pipeline Architecture
1. **Producer (Python):** Streams real UPI transactions at a controlled pace of **1 transaction every 1.5 seconds** (`time.sleep(1.5)`). Injects realistic 3-hop Mule Chains ($A \to B \to C \to D$ within 2–5 seconds with a 5% layering drop) using realistic 10-digit mobile VPAs (e.g. `9845021431@okaxis`).
2. **Ingestion (Kafka):** High-throughput message broker running in KRaft mode on topic `upi.transactions.raw`.
3. **Processing (Apache Flink 1.18 - Java):** Stateful stream processing using `ValueState` and `KeyedProcessFunction` to detect when an account dispatches received money within a 15-second pass-through window.
4. **Storage (ClickHouse 24.3):**
   - `raw_transactions` table: Audits every processed transaction.
   - `fraud_alerts` table: Stores flagged mule accounts and chained transaction IDs.
5. **API (FastAPI):**
   - `GET /health`: ClickHouse connectivity check.
   - `GET /transactions`: Feeds the live raw transaction feed.
   - `GET /alerts`: Returns recent mule account fraud alerts.
   - `GET /alerts/{alert_id}`: Reconstructs and returns the chronological Hop Chain sequence.
6. **Dashboard (React 18 + Vite + Tailwind CSS):**
   - 2-second glowing radar splash animation on initial load.
   - **Split Screen Layout:**
     - Left Panel: Live processing feed showing incoming transactions one by one (Sender, Receiver, Amount, Location).
     - Right Panel: Detected mule accounts with interactive inspection.
   - **Hop Chain Modal:** Clicking an alert reconstructs the full chronological chain of transactions ($A \to B \to C \to \text{Flagged Mule}$).

## 3. Strict Rules & System State
1. **NO FAKE PLACEHOLDERS:** All accounts use realistic 10-digit Indian phone VPAs (`[10-digit-phone]@okaxis`).
2. **SPEED LIMIT:** Exactly 1 transaction processed every 1.5 seconds (`time.sleep(1.5)`).
3. **DUAL STORAGE:** Both `raw_transactions` and `fraud_alerts` are populated.
4. **NO STREAMLIT:** Built entirely with React 18 + Vite + Tailwind CSS.
5. **NO WEBSOCKET TIMEOUTS:** Zero long-hanging blocking terminal commands.
