package com.mule.detector.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Transaction implements Serializable {
    private static final long serialVersionUID = 1L;

    @JsonProperty("transaction_id")
    @JsonAlias({"txn_id", "transactionId"})
    private String transactionId;

    @JsonProperty("timestamp")
    private String timestamp;

    @JsonProperty("sender_name")
    @JsonAlias({"senderName"})
    private String senderName;

    @JsonProperty("sender_vpa")
    @JsonAlias({"sender_upi", "senderVpa"})
    private String senderVpa;

    @JsonProperty("receiver_name")
    @JsonAlias({"receiverName"})
    private String receiverName;

    @JsonProperty("receiver_vpa")
    @JsonAlias({"receiver_upi", "receiverVpa"})
    private String receiverVpa;

    @JsonProperty("amount")
    private Double amount;

    @JsonProperty("status")
    private String status;

    @JsonProperty("bank_code")
    @JsonAlias({"bankCode"})
    private String bankCode;

    @JsonProperty("location")
    private String location;

    // Derived fields for Keyed Stream processing
    private String accountId;
    private String direction; // "INCOMING" or "OUTGOING"

    public Transaction() {
    }

    public Transaction(String transactionId, String timestamp, String senderName, String senderVpa,
                       String receiverName, String receiverVpa, Double amount, String status,
                       String bankCode, String location) {
        this.transactionId = transactionId;
        this.timestamp = timestamp;
        this.senderName = senderName;
        this.senderVpa = senderVpa;
        this.receiverName = receiverName;
        this.receiverVpa = receiverVpa;
        this.amount = amount;
        this.status = status;
        this.bankCode = bankCode;
        this.location = location;
    }

    public Transaction copy() {
        Transaction copy = new Transaction();
        copy.setTransactionId(this.transactionId);
        copy.setTimestamp(this.timestamp);
        copy.setSenderName(this.senderName);
        copy.setSenderVpa(this.senderVpa);
        copy.setReceiverName(this.receiverName);
        copy.setReceiverVpa(this.receiverVpa);
        copy.setAmount(this.amount);
        copy.setStatus(this.status);
        copy.setBankCode(this.bankCode);
        copy.setLocation(this.location);
        copy.setAccountId(this.accountId);
        copy.setDirection(this.direction);
        return copy;
    }

    public long getTimestampMillis() {
        if (timestamp == null || timestamp.trim().isEmpty()) {
            return System.currentTimeMillis();
        }
        try {
            // Attempt standard ISO-8601 parsing (e.g. 2026-11-17T12:00:00Z)
            return Instant.parse(timestamp.trim()).toEpochMilli();
        } catch (Exception e1) {
            try {
                // Attempt standard yyyy-MM-dd HH:mm:ss format
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                LocalDateTime ldt = LocalDateTime.parse(timestamp.trim(), formatter);
                return ldt.toInstant(ZoneOffset.UTC).toEpochMilli();
            } catch (Exception e2) {
                try {
                    // Attempt epoch milliseconds number
                    return Long.parseLong(timestamp.trim());
                } catch (Exception e3) {
                    return System.currentTimeMillis();
                }
            }
        }
    }

    // Getters and Setters
    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getSenderVpa() {
        return senderVpa;
    }

    public void setSenderVpa(String senderVpa) {
        this.senderVpa = senderVpa;
    }

    public String getReceiverName() {
        return receiverName;
    }

    public void setReceiverName(String receiverName) {
        this.receiverName = receiverName;
    }

    public String getReceiverVpa() {
        return receiverVpa;
    }

    public void setReceiverVpa(String receiverVpa) {
        this.receiverVpa = receiverVpa;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getBankCode() {
        return bankCode;
    }

    public void setBankCode(String bankCode) {
        this.bankCode = bankCode;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getAccountId() {
        return accountId;
    }

    public void setAccountId(String accountId) {
        this.accountId = accountId;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    @Override
    public String toString() {
        return "Transaction{" +
                "transactionId='" + transactionId + '\'' +
                ", senderVpa='" + senderVpa + '\'' +
                ", receiverVpa='" + receiverVpa + '\'' +
                ", amount=" + amount +
                ", status='" + status + '\'' +
                ", accountId='" + accountId + '\'' +
                ", direction='" + direction + '\'' +
                '}';
    }
}
