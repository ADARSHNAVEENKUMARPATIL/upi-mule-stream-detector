package com.mule.detector.function;

import com.mule.detector.model.Alert;
import com.mule.detector.model.Transaction;
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
import java.util.List;
import java.util.UUID;

public class PassThroughDetector extends KeyedProcessFunction<String, Transaction, Alert> {
    private static final long serialVersionUID = 1L;
    private static final Logger LOG = LoggerFactory.getLogger(PassThroughDetector.class);

    // 15 seconds threshold in milliseconds
    private static final long PASS_THROUGH_THRESHOLD_MS = 15000L;

    private transient ValueState<Long> lastIncomingTimestampState;
    private transient ValueState<String> lastIncomingTxnIdState;
    private transient ValueState<Double> lastIncomingAmountState;

    @Override
    public void open(Configuration parameters) throws Exception {
        StateTtlConfig ttlConfig = StateTtlConfig.newBuilder(Time.hours(1))
                .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
                .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
                .build();

        ValueStateDescriptor<Long> tsDescriptor = new ValueStateDescriptor<>("lastIncomingTimestamp", Long.class);
        tsDescriptor.enableTimeToLive(ttlConfig);
        lastIncomingTimestampState = getRuntimeContext().getState(tsDescriptor);

        ValueStateDescriptor<String> txnDescriptor = new ValueStateDescriptor<>("lastIncomingTxnId", String.class);
        txnDescriptor.enableTimeToLive(ttlConfig);
        lastIncomingTxnIdState = getRuntimeContext().getState(txnDescriptor);

        ValueStateDescriptor<Double> amtDescriptor = new ValueStateDescriptor<>("lastIncomingAmount", Double.class);
        amtDescriptor.enableTimeToLive(ttlConfig);
        lastIncomingAmountState = getRuntimeContext().getState(amtDescriptor);
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
            lastIncomingTimestampState.update(currentTxnTime);
            lastIncomingTxnIdState.update(value.getTransactionId());
            lastIncomingAmountState.update(value.getAmount());
            LOG.debug("Account {} received INCOMING txn {} of amount {} at {}",
                    accountId, value.getTransactionId(), value.getAmount(), currentTxnTime);

        } else if ("OUTGOING".equalsIgnoreCase(direction)) {
            Long lastIncomingTime = lastIncomingTimestampState.value();

            if (lastIncomingTime != null) {
                long timeDiff = currentTxnTime - lastIncomingTime;

                // Rule: If outgoing occurs within 15 seconds of incoming
                if (timeDiff >= 0 && timeDiff <= PASS_THROUGH_THRESHOLD_MS) {
                    String priorTxnId = lastIncomingTxnIdState.value();
                    List<String> txnIds = new ArrayList<>();
                    if (priorTxnId != null) {
                        txnIds.add(priorTxnId);
                    }
                    if (value.getTransactionId() != null) {
                        txnIds.add(value.getTransactionId());
                    }

                    Alert alert = new Alert(
                            UUID.randomUUID().toString(),
                            "SUSPICIOUS_PASS_THROUGH",
                            accountId,
                            value.getAmount(),
                            new Timestamp(System.currentTimeMillis()),
                            txnIds
                    );

                    LOG.warn("🚨 [FRAUD DETECTED] Mule Pass-Through on account {}: Inflow then Outflow in {}ms. Alert: {}",
                            accountId, timeDiff, alert);

                    out.collect(alert);

                    // Reset state after firing to avoid duplicate alerts on the same inflow
                    lastIncomingTimestampState.clear();
                    lastIncomingTxnIdState.clear();
                    lastIncomingAmountState.clear();
                }
            }
        }
    }
}
