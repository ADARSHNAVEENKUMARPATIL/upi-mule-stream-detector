package com.mule.detector;

import com.mule.detector.deserializer.TransactionDeserializationSchema;
import com.mule.detector.function.PassThroughDetector;
import com.mule.detector.model.Alert;
import com.mule.detector.model.Transaction;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.FlatMapFunction;
import org.apache.flink.api.java.utils.ParameterTool;
import org.apache.flink.connector.jdbc.JdbcConnectionOptions;
import org.apache.flink.connector.jdbc.JdbcExecutionOptions;
import org.apache.flink.connector.jdbc.JdbcSink;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.sink.SinkFunction;
import org.apache.flink.util.Collector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Timestamp;
import java.time.Duration;
import java.util.Objects;
import java.util.UUID;

public class MuleDetectorJob {
    private static final Logger LOG = LoggerFactory.getLogger(MuleDetectorJob.class);

    public static void main(String[] args) throws Exception {
        LOG.info("Initializing Real-Time UPI & Mule Account Stream Detector Pipeline...");

        final ParameterTool params = ParameterTool.fromArgs(args);
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // Checkpointing every 10 seconds for state fault tolerance
        env.enableCheckpointing(10000);

        // Parameters with defaults for containerized network
        String kafkaBrokers = params.get("kafka-brokers",
                System.getenv().getOrDefault("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092"));
        String kafkaTopic = params.get("kafka-topic",
                System.getenv().getOrDefault("KAFKA_TOPIC", "upi.transactions.raw"));
        String clickhouseUrl = params.get("clickhouse-url",
                System.getenv().getOrDefault("CLICKHOUSE_JDBC_URL", "jdbc:clickhouse://clickhouse:8123/default"));
        String clickhouseUser = params.get("clickhouse-user",
                System.getenv().getOrDefault("CLICKHOUSE_USER", "default"));
        String clickhousePassword = params.get("clickhouse-password",
                System.getenv().getOrDefault("CLICKHOUSE_PASSWORD", ""));

        LOG.info("Kafka Brokers: {}", kafkaBrokers);
        LOG.info("Kafka Topic: {}", kafkaTopic);
        LOG.info("ClickHouse URL: {}", clickhouseUrl);

        // 1. Kafka Source for real-time UPI transaction stream
        KafkaSource<Transaction> kafkaSource = KafkaSource.<Transaction>builder()
                .setBootstrapServers(kafkaBrokers)
                .setTopics(kafkaTopic)
                .setGroupId("flink-mule-detector-group")
                .setStartingOffsets(OffsetsInitializer.latest())
                .setValueOnlyDeserializer(new TransactionDeserializationSchema())
                .build();

        // 2. Assign Watermarks with bounded out-of-orderness of 3 seconds
        WatermarkStrategy<Transaction> watermarkStrategy = WatermarkStrategy
                .<Transaction>forBoundedOutOfOrderness(Duration.ofSeconds(3))
                .withTimestampAssigner((txn, recordTimestamp) -> txn != null ? txn.getTimestampMillis() : recordTimestamp);

        DataStream<Transaction> rawTransactions = env.fromSource(
                kafkaSource,
                watermarkStrategy,
                "Kafka UPI Transactions Source"
        ).filter(Objects::nonNull).name("Filter Null Transactions");

        // 3. SINK 1: Write EVERY real transaction to ClickHouse `raw_transactions` table
        SinkFunction<Transaction> rawTransactionSink = JdbcSink.sink(
                "INSERT INTO raw_transactions (transaction_id, timestamp, sender_name, sender_vpa, receiver_name, receiver_vpa, amount, status, bank_code, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (ps, txn) -> {
                    ps.setString(1, txn.getTransactionId() != null ? txn.getTransactionId() : "");
                    ps.setTimestamp(2, new Timestamp(txn.getTimestampMillis()));
                    ps.setString(3, txn.getSenderName() != null ? txn.getSenderName() : "");
                    ps.setString(4, txn.getSenderVpa() != null ? txn.getSenderVpa() : "");
                    ps.setString(5, txn.getReceiverName() != null ? txn.getReceiverName() : "");
                    ps.setString(6, txn.getReceiverVpa() != null ? txn.getReceiverVpa() : "");
                    ps.setDouble(7, txn.getAmount() != null ? txn.getAmount() : 0.0);
                    ps.setString(8, txn.getStatus() != null ? txn.getStatus() : "SUCCESS");
                    ps.setString(9, txn.getBankCode() != null ? txn.getBankCode() : "AXIS");
                    ps.setString(10, txn.getLocation() != null ? txn.getLocation() : "");
                },
                JdbcExecutionOptions.builder()
                        .withBatchSize(20)
                        .withBatchIntervalMs(100)
                        .withMaxRetries(3)
                        .build(),
                new JdbcConnectionOptions.JdbcConnectionOptionsBuilder()
                        .withUrl(clickhouseUrl)
                        .withDriverName("com.clickhouse.jdbc.ClickHouseDriver")
                        .withUsername(clickhouseUser)
                        .withPassword(clickhousePassword)
                        .build()
        );

        rawTransactions.addSink(rawTransactionSink).name("ClickHouse Raw Transactions Sink");

        // 4. FlatMap transactions into dual account perspectives (INCOMING for receiver, OUTGOING for sender)
        DataStream<Transaction> accountEvents = rawTransactions.flatMap(new FlatMapFunction<Transaction, Transaction>() {
            private static final long serialVersionUID = 1L;

            @Override
            public void flatMap(Transaction txn, Collector<Transaction> out) {
                if (txn == null) {
                    return;
                }

                // Inflow event for Receiver
                if (txn.getReceiverVpa() != null && !txn.getReceiverVpa().trim().isEmpty()) {
                    Transaction inTxn = txn.copy();
                    inTxn.setAccountId(txn.getReceiverVpa().trim());
                    inTxn.setDirection("INCOMING");
                    out.collect(inTxn);
                }

                // Outflow event for Sender
                if (txn.getSenderVpa() != null && !txn.getSenderVpa().trim().isEmpty()) {
                    Transaction outTxn = txn.copy();
                    outTxn.setAccountId(txn.getSenderVpa().trim());
                    outTxn.setDirection("OUTGOING");
                    out.collect(outTxn);
                }
            }
        }).name("Account Perspective Mapper");

        // 5. Core Detection: KeyedProcessFunction for sub-15-second pass-through detection
        DataStream<Alert> alerts = accountEvents
                .keyBy(Transaction::getAccountId)
                .process(new PassThroughDetector())
                .name("Pass-Through Mule Detector");

        // 6. SINK 2: Write flagged alerts immediately to ClickHouse `fraud_alerts` table
        SinkFunction<Alert> alertSink = JdbcSink.sink(
                "INSERT INTO fraud_alerts (alert_id, alert_type, account_id, amount, detected_at, txn_ids) VALUES (?, ?, ?, ?, ?, ?)",
                (ps, alert) -> {
                    UUID uuid;
                    try {
                        uuid = UUID.fromString(alert.getAlertId());
                    } catch (Exception e) {
                        uuid = UUID.randomUUID();
                    }
                    ps.setObject(1, uuid);
                    ps.setString(2, alert.getAlertType());
                    ps.setString(3, alert.getAccountId());
                    ps.setDouble(4, alert.getAmount());
                    ps.setTimestamp(5, alert.getDetectedAt());
                    String[] ids = alert.getTxnIds() != null ? alert.getTxnIds().toArray(new String[0]) : new String[0];
                    ps.setArray(6, ps.getConnection().createArrayOf("String", ids));
                },
                JdbcExecutionOptions.builder()
                        .withBatchSize(1)
                        .withBatchIntervalMs(100)
                        .withMaxRetries(3)
                        .build(),
                new JdbcConnectionOptions.JdbcConnectionOptionsBuilder()
                        .withUrl(clickhouseUrl)
                        .withDriverName("com.clickhouse.jdbc.ClickHouseDriver")
                        .withUsername(clickhouseUser)
                        .withPassword(clickhousePassword)
                        .build()
        );

        alerts.addSink(alertSink).name("ClickHouse Fraud Alerts Sink");

        env.execute("Real-Time UPI Mule Stream Detector");
    }
}
