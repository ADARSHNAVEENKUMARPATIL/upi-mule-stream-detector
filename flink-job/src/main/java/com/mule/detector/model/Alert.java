package com.mule.detector.model;

import java.io.Serializable;
import java.sql.Timestamp;
import java.util.List;

public class Alert implements Serializable {
    private static final long serialVersionUID = 1L;

    private String alertId;
    private String alertType;
    private String accountId;
    private Double amount;
    private Timestamp detectedAt;
    private List<String> txnIds;

    public Alert() {
    }

    public Alert(String alertId, String alertType, String accountId, Double amount, Timestamp detectedAt, List<String> txnIds) {
        this.alertId = alertId;
        this.alertType = alertType;
        this.accountId = accountId;
        this.amount = amount;
        this.detectedAt = detectedAt;
        this.txnIds = txnIds;
    }

    public String getAlertId() {
        return alertId;
    }

    public void setAlertId(String alertId) {
        this.alertId = alertId;
    }

    public String getAlertType() {
        return alertType;
    }

    public void setAlertType(String alertType) {
        this.alertType = alertType;
    }

    public String getAccountId() {
        return accountId;
    }

    public void setAccountId(String accountId) {
        this.accountId = accountId;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public Timestamp getDetectedAt() {
        return detectedAt;
    }

    public void setDetectedAt(Timestamp detectedAt) {
        this.detectedAt = detectedAt;
    }

    public List<String> getTxnIds() {
        return txnIds;
    }

    public void setTxnIds(List<String> txnIds) {
        this.txnIds = txnIds;
    }

    @Override
    public String toString() {
        return "Alert{" +
                "alertId='" + alertId + '\'' +
                ", alertType='" + alertType + '\'' +
                ", accountId='" + accountId + '\'' +
                ", amount=" + amount +
                ", detectedAt=" + detectedAt +
                ", txnIds=" + txnIds +
                '}';
    }
}
