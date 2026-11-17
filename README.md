# Real-Time UPI & Mule Account Stream Detector

An enterprise-grade, distributed stream processing pipeline designed to detect **money mule networks**, rapid pass-through layering, and fraudulent transactions across UPI (Unified Payments Interface) payment streams in real time.

---

## Architecture Overview

```mermaid
flowchart LR
    CSV["Real UPI Dataset (250k rows)"] --> Sim["Python Simulator (5 txns/sec)"]
    Sim -->|"Kafka Topic: upi.transactions.raw"| Kafka["Apache Kafka 3.7 (KRaft Mode)"]
    Kafka --> Flink["Apache Flink 1.18 Engine\n(Stateful KeyedProcessFunction)"]
    Flink -->|"Audit Log"| CHRaw["ClickHouse: raw_transactions"]
    Flink -->|"Flagged <= 15s Mules"| CHAlerts["ClickHouse: fraud_alerts"]
    CHRaw & CHAlerts --> API["FastAPI Backend Service (:8000)"]
    API --> UI["React 18 + Vite + Tailwind Dashboard (:5173)"]
```

---

## Key Features

1. **Sub-Second Detection Engine:** Apache Flink stateful stream processing tracks account inflow and outflow velocities via `ValueState` with a 15-second pass-through window threshold.
2. **Dual ClickHouse Storage:**
   - `raw_transactions` (`MergeTree`): Audits 100% of processed transactions with sender, receiver, bank, and location metadata.
   - `fraud_alerts` (`ReplacingMergeTree`): Stores flagged mule accounts with dynamic multi-hop transaction ID arrays.
3. **High-Speed Realistic Simulator:** Streams authentic UPI transactions at 5 txns/sec (`time.sleep(0.2)`) and periodically injects synthetic 3-hop laundering chains ($A \to B \to C \to D$) using realistic 10-digit VPAs.
4. **Interactive Enterprise Dashboard:**
   - 2-second glowing radar animation on initial load.
   - Split-screen interface: **70% Live Stream** table vs. **30% Fraud Alerts** feed.
   - **Hop Chain Modal:** Click any alert to inspect the reconstructed sequential hops with timestamps and amounts.
   - Light & Dark mode support with `localStorage` persistence.

---

## Tech Stack

| Component | Technology | Version | Description |
| :--- | :--- | :--- | :--- |
| **Broker** | Apache Kafka (KRaft) | `3.7.0` | High-throughput distributed message broker |
| **Stream Engine** | Apache Flink | `1.18.0` | Stateful stream processing (Java 11) |
| **Database** | ClickHouse Server | `24.3` | High-speed columnar OLAP storage |
| **Backend API** | FastAPI / Uvicorn | `Python 3.10` | REST API for alerts and live transactions |
| **Frontend** | React 18, Vite, Tailwind CSS | `5.x` | Enterprise dark/light dashboard |
| **Orchestration** | Docker Compose | `2.x` | Multi-container unified deployment |

---

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- PowerShell (Windows) or Bash.

### Launch the Pipeline
Run the automated startup script:

```powershell
.\start.ps1
```

The script will automatically:
1. Verify the Docker daemon.
2. Compile the Flink streaming job Fat JAR using a containerized Maven image.
3. Launch all 7 core containers via Docker Compose.
4. Health-check ClickHouse and Flink TaskManager slots.
5. Submit the streaming detection job to Flink.

---

## Service Endpoints

| Service | URL | Notes |
| :--- | :--- | :--- |
| **React Dashboard** | [http://localhost:5173](http://localhost:5173) | Main visual monitoring dashboard |
| **FastAPI Backend** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger API documentation |
| **Alerts Endpoint** | [http://localhost:8000/alerts](http://localhost:8000/alerts) | JSON feed of detected mule alerts |
| **Live Transactions** | [http://localhost:8000/transactions](http://localhost:8000/transactions) | Feed of raw incoming transactions |
| **Flink Dashboard** | [http://localhost:8081](http://localhost:8081) | Flink JobManager web console |
| **ClickHouse HTTP** | [http://localhost:8123](http://localhost:8123) | ClickHouse database query interface |

---

## Project Structure

```
├── docker-compose.yml          # 7-container Docker orchestration
├── start.ps1                   # One-click automated launch script
├── push.md                     # GitHub push guide
├── .gitignore                  # Git exclusions for node_modules, target, etc.
│
├── producer/                   # Python transaction ingestion simulator
│   ├── simulator.py            # Kafka producer (5 txns/sec + mule injections)
│   ├── Merged_corrected_final.csv # Real UPI transaction dataset
│   ├── requirements.txt
│   └── Dockerfile
│
├── flink-job/                  # Flink Java 11 stream processing engine
│   ├── pom.xml                 # Maven dependencies and Shade packaging
│   └── src/main/java/com/mule/detector/
│       ├── MuleDetectorJob.java             # Flink stream pipeline & sinks
│       ├── function/PassThroughDetector.java # 15-second pass-through detection
│       ├── deserializer/TransactionDeserializationSchema.java
│       └── model/
│           ├── Transaction.java
│           └── Alert.java
│
├── clickhouse/                 # Columnar OLAP schema
│   └── schema.sql              # DDL for raw_transactions & fraud_alerts
│
├── alert-api/                  # Python FastAPI service
│   ├── main.py                 # Endpoints (/transactions, /alerts, /alerts/{id})
│   ├── requirements.txt
│   └── Dockerfile
│
└── frontend/                   # React 18 + Vite + Tailwind CSS dashboard
    ├── src/
    │   ├── App.jsx             # Split-screen UI, radar loader & hop chain modal
    │   ├── index.css           # Glassmorphism & custom scrollbars
    │   └── main.jsx
    ├── tailwind.config.js
    └── Dockerfile
```
