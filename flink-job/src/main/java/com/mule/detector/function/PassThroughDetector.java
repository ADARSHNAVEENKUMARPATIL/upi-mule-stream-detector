package com.mule.detector.function;

import com.mule.detector.model.Alert;
import com.mule.detector.model.Transaction;
import org.apache.flink.api.common.state.ListState;
import org.apache.flink.api.common.state.ListStateDescriptor;
import org.apache.flink.api.common.state.StateTtlConfig;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.common.time.Time;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class PassThroughDetector extends KeyedProcessFunction<String, Transaction, Alert> {
    private static final long serialVersionUID = 1L;
    private static final Logger LOG = LoggerFactory.getLogger(PassThroughDetector.class);

    // 15 seconds threshold in milliseconds
    private static final long PASS_THROUGH_THRESHOLD_MS = 15000L;

    private transient ValueState<Long> firstIncomingTimestampState;
    private transient ValueState<Long> lastActivityTimestampState;
    private transient ListState<String> hopTxnIdsState;
    private transient ValueState<Double> cumulativeAmountState;

    @Override
    public void open(Configuration parameters) throws Exception {
        StateTtlConfig ttlConfig = StateTtlConfig.newBuilder(Time.hours(1))
                .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
                .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
                .build();

        ValueStateDescriptor<Long> firstTsDescriptor = new ValueStateDescriptor<>("firstIncomingTimestamp", Long.class);
        firstTsDescriptor.enableTimeToLive(ttlConfig);
        firstIncomingTimestampState = getRuntimeContext().getState(firstTsDescriptor);

        ValueStateDescriptor<Long> lastTsDescriptor = new ValueStateDescriptor<>("lastActivityTimestamp", Long.class);
        lastTsDescriptor.enableTimeToLive(ttlConfig);
        lastActivityTimestampState = getRuntimeContext().getState(lastTsDescriptor);

        ListStateDescriptor<String> txnListDescriptor = new ListStateDescriptor<>("hopTxnIds", String.class);
        txnListDescriptor.enableTimeToLive(ttlConfig);
        hopTxnIdsState = getRuntimeContext().getListState(txnListDescriptor);

        ValueStateDescriptor<Double> amtDescriptor = new ValueStateDescriptor<>("cumulativeAmount", Double.class);
        amtDescriptor.enableTimeToLive(ttlConfig);
        cumulativeAmountState = getRuntimeContext().getState(amtDescriptor);
    }

    @Override
    public void processElement(Transaction value, Context ctx, Collector<Alert> out) throws Exception {
        if (value == null) {
            return;
        }

        String accountId = ctx.getCurrentKey();
        String direction = value.getDirection();
        long currentTxnTime = value.getTimestampMillis();

        if ("INCOMING".equalsIgnoreCase(direction)) {
            Long firstTime = firstIncomingTimestampState.value();
            if (firstTime == null || (currentTxnTime - firstTime > PASS_THROUGH_THRESHOLD_MS)) {
                // Start a fresh window if previous timed out
                firstIncomingTimestampState.update(currentTxnTime);
                hopTxnIdsState.clear();
                cumulativeAmountState.update(value.getAmount() != null ? value.getAmount() : 0.0);
            } else {
                Double prevAmt = cumulativeAmountState.value();
                cumulativeAmountState.update((prevAmt != null ? prevAmt : 0.0) + (value.getAmount() != null ? value.getAmount() : 0.0));
            }

            if (value.getTransactionId() != null && !value.getTransactionId().trim().isEmpty()) {
                hopTxnIdsState.add(value.getTransactionId().trim());
            }
            lastActivityTimestampState.update(currentTxnTime);
            LOG.debug("Account {} recorded INCOMING txn {} of amount {} at {}",
                    accountId, value.getTransactionId(), value.getAmount(), currentTxnTime);

        } else if ("OUTGOING".equalsIgnoreCase(direction)) {
            Long firstIncomingTime = firstIncomingTimestampState.value();

            if (firstIncomingTime != null) {
                long timeDiff = currentTxnTime - firstIncomingTime;

                // Rule: If outgoing occurs within 15 seconds of incoming
                if (timeDiff >= 0 && timeDiff <= PASS_THROUGH_THRESHOLD_MS) {
                    if (value.getTransactionId() != null && !value.getTransactionId().trim().isEmpty()) {
                        hopTxnIdsState.add(value.getTransactionId().trim());
                    }

                    // Extract all accumulated transaction IDs in chronological order without duplicates
                    Set<String> uniqueIds = new LinkedHashSet<>();
                    Iterable<String> currentIds = hopTxnIdsState.get();
                    if (currentIds != null) {
                        for (String tid : currentIds) {
                            if (tid != null && !tid.trim().isEmpty()) {
                                uniqueIds.add(tid.trim());
                            }
                        }
                    }

                    List<String> allTxnIds = new ArrayList<>(uniqueIds);
                    Double totalAmt = cumulativeAmountState.value();
                    if (totalAmt == null || totalAmt <= 0) {
                        totalAmt = value.getAmount() != null ? value.getAmount() : 0.0;
                    }

                    Alert alert = new Alert(
                            UUID.randomUUID().toString(),
                            "SUSPICIOUS_PASS_THROUGH",
                            accountId,
                            totalAmt,
                            new Timestamp(System.currentTimeMillis()),
                            allTxnIds
                    );

                    LOG.warn("🚨 [FRAUD DETECTED] Mule Pass-Through on account {}: {} hops captured within {}ms. Alert: {}",
                            accountId, allTxnIds.size(), timeDiff, alert);

                    out.collect(alert);

                    // Update last activity; do not clear immediately so further chaining hops can append
                    lastActivityTimestampState.update(currentTxnTime);

                    // Register timer to clean up window state
                    ctx.timerService().registerProcessingTimeTimer(System.currentTimeMillis() + PASS_THROUGH_THRESHOLD_MS);
                }
            }
        }
    }

    @Override
    public void onTimer(long timestamp, OnTimerContext ctx, Collector<Alert> out) throws Exception {
        Long lastActive = lastActivityTimestampState.value();
        if (lastActive != null && (System.currentTimeMillis() - lastActive >= PASS_THROUGH_THRESHOLD_MS)) {
            firstIncomingTimestampState.clear();
            lastActivityTimestampState.clear();
            hopTxnIdsState.clear();
            cumulativeAmountState.clear();
        }
    }
}
