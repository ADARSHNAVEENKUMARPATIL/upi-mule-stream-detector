import json
import logging
import os
import random
import sys
import time
import uuid
from datetime import datetime, timezone, timedelta
import pandas as pd
from confluent_kafka import Producer
from confluent_kafka.admin import AdminClient, NewTopic

# Configuration Limits & Parameters
MAX_ROWS = 5000
PACING_INTERVAL_SEC = 0.2  # 5 transactions per second (high-throughput live stream)
KAFKA_BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "upi.transactions.raw")
CSV_FILENAME = os.getenv("CSV_FILENAME", "Merged_corrected_final.csv")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

# Realistic Indian profile pools for synthetic mule chains (NO FAKE PLACEHOLDERS)
FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
    "Krishna", "Ishaan", "Diya", "Saanvi", "Ananya", "Aadhya", "Pari", "Khushi",
    "Navya", "Rhea", "Pooja", "Rohan", "Vikram", "Neha", "Rahul", "Priya",
    "Karan", "Kavita", "Siddharth", "Meera", "Gaurav", "Simran", "Tanvi", "Amit"
]

LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Gupta", "Reddy", "Mehta", "Iyer", "Nair",
    "Bose", "Joshi", "Deshmukh", "Chawla", "Bhatia", "Malhotra", "Kulkarni",
    "Banerjee", "Chatterjee", "Mishra", "Soman", "Pandey", "Saxena", "Kapoor"
]

LOCATIONS = [
    "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Pune", "Kolkata", "Jaipur", "Ahmedabad", "Chennai"
]


def generate_realistic_vpa() -> str:
    """Generates a realistic 10-digit mobile VPA like 9845021431@okaxis."""
    prefix = random.choice(["9", "8", "7", "6"])
    digits = "".join([str(random.randint(0, 9)) for _ in range(9)])
    return f"{prefix}{digits}@okaxis"


def generate_realistic_name() -> str:
    """Generates a realistic full name from Indian name pools."""
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def ensure_kafka_topic(broker: str, topic_name: str):
    """Verifies topic existence or creates it via Kafka AdminClient."""
    logging.info(f"Connecting to Kafka broker at {broker} to verify topic '{topic_name}'...")
    max_retries = 30
    for attempt in range(1, max_retries + 1):
        try:
            admin_client = AdminClient({'bootstrap.servers': broker})
            metadata = admin_client.list_topics(timeout=5)
            if topic_name in metadata.topics:
                logging.info(f"Topic '{topic_name}' is verified and ready.")
                return
            new_topics = [NewTopic(topic_name, num_partitions=1, replication_factor=1)]
            futures = admin_client.create_topics(new_topics)
            for topic, future in futures.items():
                try:
                    future.result()
                    logging.info(f"Successfully created topic '{topic_name}'.")
                except Exception as e:
                    logging.info(f"Topic '{topic_name}' status: {e}")
            return
        except Exception as err:
            logging.warning(f"Waiting for Kafka broker at {broker} (attempt {attempt}/{max_retries}): {err}")
            time.sleep(2)
    logging.error(f"Could not connect to Kafka at {broker} after {max_retries} attempts.")


def delivery_report(err, msg):
    """Callback for delivery reports from librdkafka."""
    if err is not None:
        logging.error(f"Message delivery failed: {err}")


def create_producer(broker: str) -> Producer:
    conf = {
        'bootstrap.servers': broker,
        'client.id': 'upi-transaction-simulator',
        'acks': '1',
        'queue.buffering.max.messages': 100000
    }
    return Producer(conf)


def inject_mule_chain(producer: Producer, topic: str, chain_index: int, current_base_time: datetime):
    """
    Injects a synthetic 3-hop Mule Chain using REALISTIC 10-DIGIT VPAs and NAMES:
      Hop 1: Account A -> Account B (₹50,000.00)
      Hop 2: Account B -> Account C (₹47,500.00, 2s delay, -5% layering fee)
      Hop 3: Account C -> Account D (₹45,125.00, 2s delay, -5% layering fee)
    Each hop occurs within 2 to 5 seconds to trigger the 15-second pass-through detection.
    """
    logging.warning(f"🚨 [MULE INJECTION #{chain_index}] Pausing stream to inject 3-hop Mule Chain with realistic VPAs...")

    user_a_vpa, user_a_name = generate_realistic_vpa(), generate_realistic_name()
    user_b_vpa, user_b_name = generate_realistic_vpa(), generate_realistic_name()
    user_c_vpa, user_c_name = generate_realistic_vpa(), generate_realistic_name()
    user_d_vpa, user_d_name = generate_realistic_vpa(), generate_realistic_name()

    initial_amount = 50000.0
    hop1_amount = initial_amount
    hop2_amount = round(hop1_amount * 0.95, 2)
    hop3_amount = round(hop2_amount * 0.95, 2)

    chain_hops = [
        (user_a_vpa, user_a_name, user_b_vpa, user_b_name, hop1_amount, 0),
        (user_b_vpa, user_b_name, user_c_vpa, user_c_name, hop2_amount, 2),  # 2 seconds delay
        (user_c_vpa, user_c_name, user_d_vpa, user_d_name, hop3_amount, 2)   # 2 seconds delay
    ]

    simulated_clock = current_base_time

    for hop_idx, (s_vpa, s_name, r_vpa, r_name, amount, delay_sec) in enumerate(chain_hops, start=1):
        if delay_sec > 0:
            time.sleep(delay_sec)
            simulated_clock += timedelta(seconds=delay_sec)

        mule_txn_id = str(uuid.uuid4())
        ts_str = simulated_clock.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'

        payload = {
            "txn_id": mule_txn_id,
            "transaction_id": mule_txn_id,
            "timestamp": ts_str,
            "sender_name": s_name,
            "sender_vpa": s_vpa,
            "receiver_name": r_name,
            "receiver_vpa": r_vpa,
            "amount": amount,
            "status": "SUCCESS",
            "bank_code": "AXIS",
            "location": random.choice(LOCATIONS)
        }

        producer.produce(
            topic=topic,
            key=s_vpa,
            value=json.dumps(payload).encode('utf-8'),
            on_delivery=delivery_report
        )
        producer.poll(0)
        logging.warning(
            f"  -> Hop {hop_idx}/3: {s_name} ({s_vpa}) -> {r_name} ({r_vpa}) | Amount: ₹{amount:.2f} | Txn: {mule_txn_id}"
        )

    producer.flush()
    logging.info(f"✅ [MULE INJECTION #{chain_index}] Chain complete. Resuming stream at 5 txns/sec.\n")


def run_simulator():
    ensure_kafka_topic(KAFKA_BROKER, KAFKA_TOPIC)

    candidate_paths = [
        CSV_FILENAME,
        "/app/Merged_corrected_final.csv",
        os.path.join(os.path.dirname(__file__), "Merged_corrected_final.csv"),
        os.path.join(os.path.dirname(__file__), "..", "producer", "Merged_corrected_final.csv"),
        "Merged_corrected_final.csv"
    ]
    csv_path = None
    for p in candidate_paths:
        if os.path.exists(p):
            csv_path = p
            break

    if not csv_path:
        logging.error(f"Cannot find CSV file at any of: {candidate_paths}")
        sys.exit(1)

    logging.info(f"Loading real UPI transactions from '{csv_path}'...")
    df = pd.read_csv(csv_path)

    required_columns = [
        'transaction_id', 'timestamp', 'sender_name', 'sender_vpa',
        'receiver_name', 'receiver_vpa', 'amount', 'status', 'bank_code', 'location'
    ]
    missing = [c for c in required_columns if c not in df.columns]
    if missing:
        logging.error(f"Missing required columns in CSV: {missing}")
        sys.exit(1)

    # Filter out FAILED rows and keep only SUCCESS
    df_success = df[df['status'].astype(str).str.strip().str.upper() == 'SUCCESS'].copy()
    total_success = len(df_success)
    logging.info(f"Found {total_success} successful transactions in real dataset.")

    # Limit to MAX_ROWS (5000)
    df_stream = df_success.head(MAX_ROWS)
    logging.info(f"Streaming first {len(df_stream)} transactions at 5 txns/sec (interval: {PACING_INTERVAL_SEC}s)...")

    producer = create_producer(KAFKA_BROKER)
    logging.info(f"Connected to Kafka broker at {KAFKA_BROKER}. Pacing interval: {PACING_INTERVAL_SEC}s...")

    streamed_count = 0
    mule_chain_count = 0

    for idx, row in df_stream.iterrows():
        streamed_count += 1
        current_time = datetime.now(timezone.utc)
        iso_timestamp = current_time.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'

        payload = {
            "txn_id": str(row['transaction_id']),
            "transaction_id": str(row['transaction_id']),
            "timestamp": iso_timestamp,
            "sender_name": str(row['sender_name']),
            "sender_vpa": str(row['sender_vpa']),
            "receiver_name": str(row['receiver_name']),
            "receiver_vpa": str(row['receiver_vpa']),
            "amount": float(row['amount']),
            "status": "SUCCESS",
            "bank_code": str(row['bank_code']),
            "location": str(row['location'])
        }

        producer.produce(
            topic=KAFKA_TOPIC,
            key=str(row['sender_vpa']),
            value=json.dumps(payload).encode('utf-8'),
            on_delivery=delivery_report
        )
        producer.poll(0)

        if streamed_count % 10 == 0:
            logging.info(
                f"[{streamed_count}/{len(df_stream)}] Live Stream: {row['sender_name']} -> {row['receiver_name']} | ₹{float(row['amount']):.2f}"
            )

        # Trigger mule chain at transaction 15 and then every 75 transactions
        if streamed_count == 15 or (streamed_count > 15 and streamed_count % 75 == 0):
            mule_chain_count += 1
            inject_mule_chain(producer, KAFKA_TOPIC, mule_chain_count, current_time)

        time.sleep(PACING_INTERVAL_SEC)

    producer.flush()
    logging.info(f"🏁 Completed streaming {streamed_count} real transactions and {mule_chain_count} mule chains.")


if __name__ == "__main__":
    run_simulator()
