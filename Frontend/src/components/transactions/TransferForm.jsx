import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  Search,
  Clock,
  Star,
  Trash2,
  X,
  User,
  ChevronRight,
  Loader2,
  BookmarkPlus,
  Send,
} from "lucide-react";
import { useAccounts } from "../../context/AccountContext";
import { useActivity } from "../../context/ActivityContext";
import { useToast } from "../../context/ToastContext";
import { createTransaction } from "../../api/transactions.api";
import {
  lookupAccount,
  searchRecipients,
  getRecentRecipients,
  getSavedRecipients,
  saveRecipient,
  deleteSavedRecipient,
} from "../../api/accounts.api";
import { generateIdempotencyKey } from "../../utils/generateIdempotencyKey";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatAccountId } from "../../utils/formatAccountId";
import TransferSummary from "./TransferSummary";
import ProcessingModal from "./ProcessingModal";
import Modal from "../common/Modal";

export default function TransferForm() {
  const { activeAccounts, balances, fetchAccounts } = useAccounts();
  const { logTransaction, updateTransaction } = useActivity();
  const { showError, showSuccess } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Selected account state
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState("");

  // Recipient selector mode: 'SEARCH' | 'RECENT' | 'SAVED' | 'MANUAL'
  const [recipientMode, setRecipientMode] = useState("SEARCH");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Recent recipients state
  const [recentRecipients, setRecentRecipients] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Saved recipients state
  const [savedRecipients, setSavedRecipients] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [isSavingBeneficiary, setIsSavingBeneficiary] = useState(false);
  const [saveNickname, setSaveNickname] = useState("");
  const [showSaveBox, setShowSaveBox] = useState(false);

  // Recipient resolution state
  const [resolvedRecipient, setResolvedRecipient] = useState(null);
  const [verifyingRecipient, setVerifyingRecipient] = useState(false);
  const [recipientLookupError, setRecipientLookupError] = useState("");

  // Review confirmation step state
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Processing Modal State
  const [modalState, setModalState] = useState({
    isOpen: false,
    status: "PROCESSING", // 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'PENDING_RESULT'
    data: null,
  });

  // Pre-fill sender account if passed via navigation state
  useEffect(() => {
    if (location.state?.selectedFromAccount) {
      setFromAccount(location.state.selectedFromAccount);
    } else if (activeAccounts.length > 0 && !fromAccount) {
      setFromAccount(activeAccounts[0]._id);
    }
  }, [location.state, activeAccounts, fromAccount]);

  const selectedAccountObj = activeAccounts.find((a) => a._id === fromAccount);
  const selectedFromBalance = fromAccount ? balances[fromAccount] || 0 : 0;

  // Idempotency key state
  const [currentIdempotencyKey, setCurrentIdempotencyKey] = useState(() =>
    generateIdempotencyKey(),
  );

  // Fetch recent and saved recipients
  const loadRecentRecipients = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const data = await getRecentRecipients();
      setRecentRecipients(data.recentRecipients || []);
    } catch (err) {
      console.warn("Failed to fetch recent recipients:", err);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  const loadSavedRecipients = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const data = await getSavedRecipients();
      setSavedRecipients(data.savedRecipients || []);
    } catch (err) {
      console.warn("Failed to fetch saved recipients:", err);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    loadRecentRecipients();
    loadSavedRecipients();
  }, [loadRecentRecipients, loadSavedRecipients]);

  // Debounced search for recipients
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setRecipientLookupError("");

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await searchRecipients(val.trim());
        setSearchResults(data.recipients || []);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Select a recipient from Search, Recent, or Saved
  const handleSelectRecipient = (recipient) => {
    const accountIdentifier = recipient.accountId || recipient.accountNumber;
    setToAccount(accountIdentifier);
    setResolvedRecipient({
      accountId: recipient.accountId || recipient._id,
      accountNumber: recipient.accountNumber,
      maskedAccountNumber:
        recipient.maskedAccountNumber ||
        `•••• ${String(recipient.accountNumber).slice(-4)}`,
      recipientName: recipient.recipientName,
      nickname: recipient.nickname || "",
      status: recipient.status || "ACTIVE",
      currency: recipient.currency || "INR",
    });
    setRecipientLookupError("");
    setValidationError("");
    setCurrentIdempotencyKey(generateIdempotencyKey());
    setShowSaveBox(false);
    setSaveNickname(recipient.nickname || "");
  };

  // Clear selected recipient
  const handleClearRecipient = () => {
    setToAccount("");
    setResolvedRecipient(null);
    setRecipientLookupError("");
    setShowSaveBox(false);
    setSaveNickname("");
    setCurrentIdempotencyKey(generateIdempotencyKey());
  };

  // Verify recipient manually on demand or blur
  const handleVerifyRecipient = async () => {
    const trimmed = toAccount.trim();
    if (!trimmed) {
      setRecipientLookupError("Please enter a recipient account number or ID");
      return;
    }

    setVerifyingRecipient(true);
    setRecipientLookupError("");
    try {
      const data = await lookupAccount(trimmed);
      if (data?.recipient) {
        if (data.recipient.isSelf) {
          setRecipientLookupError("Cannot transfer funds to your own account");
          setResolvedRecipient(null);
        } else if (data.recipient.status !== "ACTIVE") {
          setRecipientLookupError(
            `Recipient account is ${data.recipient.status.toLowerCase()} and cannot accept transfers`,
          );
          setResolvedRecipient(null);
        } else {
          setResolvedRecipient(data.recipient);
        }
      }
    } catch (err) {
      setResolvedRecipient(null);
      setRecipientLookupError(
        err.response?.data?.message || "Recipient account not found",
      );
    } finally {
      setVerifyingRecipient(false);
    }
  };

  // Save the currently verified recipient as a beneficiary
  const handleSaveBeneficiary = async () => {
    const identifier =
      resolvedRecipient?.accountId || resolvedRecipient?.accountNumber;
    if (!identifier) return;
    setIsSavingBeneficiary(true);
    try {
      const res = await saveRecipient({
        identifier,
        nickname: saveNickname.trim() || undefined,
      });
      showSuccess(res.message || "Beneficiary saved successfully!");
      setShowSaveBox(false);
      await loadSavedRecipients();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to save beneficiary");
    } finally {
      setIsSavingBeneficiary(false);
    }
  };

  // Remove a saved beneficiary
  const handleDeleteBeneficiary = async (e, recipientId) => {
    e.stopPropagation();
    try {
      await deleteSavedRecipient(recipientId);
      showSuccess("Beneficiary removed");
      await loadSavedRecipients();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to remove beneficiary");
    }
  };

  const isAlreadySaved = Boolean(
    resolvedRecipient &&
    savedRecipients.some(
      (r) => String(r.accountId) === String(resolvedRecipient.accountId),
    ),
  );

  const handleAccountChange = (val) => {
    setFromAccount(val);
    setCurrentIdempotencyKey(generateIdempotencyKey());
    setValidationError("");
  };

  const handleToAccountChange = (e) => {
    const val = e.target.value;
    setToAccount(val);
    setResolvedRecipient(null);
    setRecipientLookupError("");
    setCurrentIdempotencyKey(generateIdempotencyKey());
    setValidationError("");
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(val)) {
      setAmount(val);
      setCurrentIdempotencyKey(generateIdempotencyKey());
      setValidationError("");
    }
  };

  const handleSetPresetAmount = (preset) => {
    if (preset === "MAX") {
      setAmount(selectedFromBalance.toString());
    } else {
      setAmount(preset.toString());
    }
    setCurrentIdempotencyKey(generateIdempotencyKey());
    setValidationError("");
  };

  // Step 1: Open Review Confirmation Modal
  const handleOpenReview = (e) => {
    e.preventDefault();
    setValidationError("");

    const numericAmount = parseFloat(amount);

    if (!fromAccount) {
      setValidationError("Please select a sender account.");
      return;
    }
    if (!toAccount.trim()) {
      setValidationError("Please enter or select a destination recipient.");
      return;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setValidationError(
        "Transfer amount must be a positive number greater than ₹0.",
      );
      return;
    }
    if (numericAmount > selectedFromBalance) {
      setValidationError(
        `Insufficient balance. Available: ${formatCurrency(selectedFromBalance)}, Requested: ${formatCurrency(numericAmount)}`,
      );
      return;
    }

    setIsReviewOpen(true);
  };

  // Step 2: Confirmed Submission to Backend
  const handleConfirmAndSubmit = async () => {
    setIsReviewOpen(false);
    const numericAmount = parseFloat(amount);
    const activeKey = currentIdempotencyKey || generateIdempotencyKey();

    // Log preliminary session transaction
    logTransaction({
      fromAccount,
      toAccount: toAccount.trim(),
      amount: numericAmount,
      idempotencyKey: activeKey,
      status: "PENDING",
      description: description.trim() || "Funds Transfer",
      createdAt: new Date().toISOString(),
    });

    // Open Processing Modal
    setModalState({
      isOpen: true,
      status: "PROCESSING",
      data: {
        fromAccount,
        toAccount: toAccount.trim(),
        recipientName: resolvedRecipient?.recipientName,
        amount: numericAmount,
        idempotencyKey: activeKey,
      },
    });

    try {
      const response = await createTransaction({
        fromAccount,
        toAccount: toAccount.trim(),
        amount: numericAmount,
        idempotencyKey: activeKey,
        description: description.trim() || undefined,
      });

      const txResult = response.transaction || {};
      const txId = txResult._id || response._id;
      const txStatus = txResult.status || "COMPLETED";

      updateTransaction(activeKey, {
        status: txStatus,
        transactionId: txId,
        id: txId,
        reference: txResult.reference,
      });

      if (txStatus === "COMPLETED") {
        setModalState({
          isOpen: true,
          status: "SUCCESS",
          data: {
            fromAccount,
            toAccount: toAccount.trim(),
            recipientName: resolvedRecipient?.recipientName,
            amount: numericAmount,
            transactionId: txId,
            reference: txResult.reference,
            message: response.message,
          },
        });
        showSuccess(
          `Successfully transferred ${formatCurrency(numericAmount)}!`,
        );
        await fetchAccounts();
        await loadRecentRecipients(); // Refresh recent recipients
        setAmount("");
        setToAccount("");
        setDescription("");
        setResolvedRecipient(null);
        setCurrentIdempotencyKey(generateIdempotencyKey());
      } else if (txStatus === "PENDING") {
        setModalState({
          isOpen: true,
          status: "PENDING_RESULT",
          data: {
            fromAccount,
            toAccount: toAccount.trim(),
            amount: numericAmount,
            transactionId: txId,
            reference: txResult.reference,
            message:
              response.message ||
              "Transaction is processing in the double-entry ledger.",
          },
        });
        await fetchAccounts();
        await loadRecentRecipients();
      } else {
        setModalState({
          isOpen: true,
          status: "ERROR",
          data: {
            fromAccount,
            toAccount: toAccount.trim(),
            amount: numericAmount,
            error: response.message || `Transaction status: ${txStatus}`,
          },
        });
        await fetchAccounts();
      }
    } catch (err) {
      console.error("Transfer failed:", err);
      let serverMessage =
        err.response?.data?.message ||
        "Transaction processing failed, please retry.";

      if (err.response?.status === 409) {
        serverMessage =
          "This transfer could not be completed because account balance or state changed concurrently. Please review your balance and try again.";
      }

      updateTransaction(activeKey, {
        status: "FAILED",
        error: serverMessage,
      });

      setModalState({
        isOpen: true,
        status: "ERROR",
        data: {
          fromAccount,
          toAccount: toAccount.trim(),
          amount: numericAmount,
          error: serverMessage,
        },
      });

      await fetchAccounts();
    }
  };

  return (
    <>
      <div className="transfer-container">
        {/* Transfer Form Card */}
        <div className="transfer-card">
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Send Money</h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
              Execute instant peer-to-peer transfers settled atomically on our
              double-entry ledger.
            </p>
          </div>

          {validationError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "var(--accent-red-bg)",
                color: "var(--accent-red)",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                border: "1px solid var(--accent-red-border)",
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{validationError}</span>
            </div>
          )}

          <form
            onSubmit={handleOpenReview}
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* 1. From Account Dropdown */}
            <div className="form-group">
              <label className="form-label" htmlFor="fromAccount">
                <span>From Account</span>
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--accent-green)",
                    fontWeight: 600,
                  }}
                >
                  Available: {formatCurrency(selectedFromBalance)}
                </span>
              </label>
              <select
                id="fromAccount"
                className="form-select"
                value={fromAccount}
                onChange={(e) => handleAccountChange(e.target.value)}
                disabled={activeAccounts.length === 0}
              >
                {activeAccounts.length === 0 ? (
                  <option value="">No ACTIVE accounts available</option>
                ) : (
                  activeAccounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.accountNumber
                        ? `A/C ${acc.accountNumber}`
                        : formatAccountId(acc._id)}{" "}
                      ({acc.currency || "INR"}) — Available:{" "}
                      {formatCurrency(balances[acc._id] || 0)}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 2. Recipient Selector Section */}
            <div className="form-group">
              <label className="form-label">
                <span>Recipient</span>
                {resolvedRecipient ? (
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--accent-green-light)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <CheckCircle2 size={13} /> {resolvedRecipient.recipientName}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Search, select, or enter account
                  </span>
                )}
              </label>

              {/* Mode Tabs */}
              <div className="recipient-mode-tabs">
                <button
                  type="button"
                  className={`recipient-mode-tab ${recipientMode === "SEARCH" ? "active" : ""}`}
                  onClick={() => setRecipientMode("SEARCH")}
                  id="tab-recipient-search"
                >
                  <Search size={13} />
                  <span>Search Directory</span>
                </button>

                <button
                  type="button"
                  className={`recipient-mode-tab ${recipientMode === "RECENT" ? "active" : ""}`}
                  onClick={() => setRecipientMode("RECENT")}
                  id="tab-recipient-recent"
                >
                  <Clock size={13} />
                  <span>Recent</span>
                  {recentRecipients.length > 0 && (
                    <span className="recipient-badge-pill">
                      {recentRecipients.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className={`recipient-mode-tab ${recipientMode === "SAVED" ? "active" : ""}`}
                  onClick={() => setRecipientMode("SAVED")}
                  id="tab-recipient-saved"
                >
                  <Star size={13} />
                  <span>Saved</span>
                  {savedRecipients.length > 0 && (
                    <span className="recipient-badge-pill">
                      {savedRecipients.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className={`recipient-mode-tab ${recipientMode === "MANUAL" ? "active" : ""}`}
                  onClick={() => setRecipientMode("MANUAL")}
                  id="tab-recipient-manual"
                >
                  <Send size={13} />
                  <span>Manual Entry</span>
                </button>
              </div>

              {/* TAB 1: SEARCH DIRECTORY */}
              {recipientMode === "SEARCH" && (
                <div style={{ position: "relative" }}>
                  <div className="form-input-container">
                    <span className="form-input-prefix">
                      {isSearching ? (
                        <Loader2
                          size={15}
                          style={{ animation: "spin 1s linear infinite" }}
                        />
                      ) : (
                        <Search size={15} />
                      )}
                    </span>
                    <input
                      id="recipient-search-input"
                      type="text"
                      className="form-input has-prefix"
                      placeholder="Search by name, email, or account number..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="form-input-action"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {searchQuery.trim().length >= 2 && (
                    <div className="recipient-search-results">
                      {isSearching ? (
                        <div
                          style={{
                            padding: "16px",
                            textAlign: "center",
                            fontSize: "0.82rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Searching banking directory...
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((rec) => (
                          <div
                            key={rec.accountId}
                            className="recipient-search-item"
                            onClick={() => handleSelectRecipient(rec)}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              <div className="recipient-avatar">
                                {rec.recipientName.charAt(0)}
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: "0.86rem",
                                    fontWeight: 600,
                                    color: "var(--text-primary)",
                                  }}
                                >
                                  {rec.recipientName}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.74rem",
                                    color: "var(--text-secondary)",
                                    fontFamily: "var(--font-mono)",
                                  }}
                                >
                                  A/C {rec.maskedAccountNumber}
                                  {rec.maskedEmail && (
                                    <span
                                      style={{
                                        fontFamily: "var(--font-sans, inherit)",
                                        marginLeft: "8px",
                                        opacity: 0.8,
                                      }}
                                    >
                                      · {rec.maskedEmail}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  padding: "2px 8px",
                                  borderRadius: "var(--radius-full)",
                                  background: "rgba(16, 185, 129, 0.15)",
                                  color: "var(--accent-green-light)",
                                  fontWeight: 700,
                                }}
                              >
                                ACTIVE
                              </span>
                              <ChevronRight
                                size={14}
                                color="var(--text-tertiary)"
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div
                          style={{
                            padding: "16px",
                            textAlign: "center",
                            fontSize: "0.82rem",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          No active accounts found matching "{searchQuery}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: RECENT RECIPIENTS */}
              {recipientMode === "RECENT" && (
                <div>
                  {loadingRecent ? (
                    <div
                      style={{
                        padding: "16px",
                        textAlign: "center",
                        color: "var(--text-secondary)",
                        fontSize: "0.82rem",
                      }}
                    >
                      <Loader2
                        size={16}
                        style={{
                          animation: "spin 1s linear infinite",
                          display: "inline",
                          marginRight: "6px",
                        }}
                      />
                      Loading recent recipients...
                    </div>
                  ) : recentRecipients.length > 0 ? (
                    <div className="recipient-grid">
                      {recentRecipients.map((rec) => {
                        const isSelected =
                          String(resolvedRecipient?.accountId) ===
                          String(rec.accountId);
                        return (
                          <div
                            key={rec.accountId}
                            className={`recipient-chip-card ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelectRecipient(rec)}
                          >
                            <div className="recipient-avatar">
                              {rec.recipientName.charAt(0)}
                            </div>
                            <div style={{ overflow: "hidden", flex: 1 }}>
                              <div
                                style={{
                                  fontSize: "0.82rem",
                                  fontWeight: 600,
                                  color: "var(--text-primary)",
                                  whiteSpace: "nowrap",
                                  textOverflow: "ellipsis",
                                  overflow: "hidden",
                                }}
                              >
                                {rec.recipientName}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--text-secondary)",
                                  fontFamily: "var(--font-mono)",
                                }}
                              >
                                {rec.maskedAccountNumber}
                              </div>
                              {rec.lastAmount && (
                                <div
                                  style={{
                                    fontSize: "0.7rem",
                                    color: "var(--accent-green-light)",
                                    marginTop: "2px",
                                  }}
                                >
                                  Last: {formatCurrency(rec.lastAmount)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "20px",
                        background: "var(--bg-glass)",
                        border: "1px dashed var(--border-glass)",
                        borderRadius: "var(--radius-lg)",
                        textAlign: "center",
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <Clock
                        size={20}
                        color="var(--text-tertiary)"
                        style={{ margin: "0 auto 6px" }}
                      />
                      <p>No recent transfer recipients yet.</p>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        Complete your first transfer to populate recent
                        beneficiaries.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SAVED RECIPIENTS */}
              {recipientMode === "SAVED" && (
                <div>
                  {loadingSaved ? (
                    <div
                      style={{
                        padding: "16px",
                        textAlign: "center",
                        color: "var(--text-secondary)",
                        fontSize: "0.82rem",
                      }}
                    >
                      <Loader2
                        size={16}
                        style={{
                          animation: "spin 1s linear infinite",
                          display: "inline",
                          marginRight: "6px",
                        }}
                      />
                      Loading saved beneficiaries...
                    </div>
                  ) : savedRecipients.length > 0 ? (
                    <div className="recipient-grid">
                      {savedRecipients.map((rec) => {
                        const isSelected =
                          String(resolvedRecipient?.accountId) ===
                          String(rec.accountId);
                        return (
                          <div
                            key={rec._id}
                            className={`recipient-chip-card ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelectRecipient(rec)}
                          >
                            <div
                              className="recipient-avatar"
                              style={{
                                background:
                                  "linear-gradient(135deg, var(--accent-amber), var(--accent-pink))",
                              }}
                            >
                              <Star size={14} color="#FFFFFF" />
                            </div>
                            <div style={{ overflow: "hidden", flex: 1 }}>
                              <div
                                style={{
                                  fontSize: "0.82rem",
                                  fontWeight: 600,
                                  color: "var(--text-primary)",
                                  whiteSpace: "nowrap",
                                  textOverflow: "ellipsis",
                                  overflow: "hidden",
                                }}
                              >
                                {rec.nickname || rec.recipientName}
                              </div>
                              {rec.nickname && (
                                <div
                                  style={{
                                    fontSize: "0.7rem",
                                    color: "var(--text-tertiary)",
                                  }}
                                >
                                  {rec.recipientName}
                                </div>
                              )}
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--text-secondary)",
                                  fontFamily: "var(--font-mono)",
                                }}
                              >
                                {rec.maskedAccountNumber}
                              </div>
                            </div>
                            <button
                              type="button"
                              title="Remove beneficiary"
                              onClick={(e) =>
                                handleDeleteBeneficiary(e, rec._id)
                              }
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--text-tertiary)",
                                cursor: "pointer",
                                padding: "4px",
                                borderRadius: "var(--radius-sm)",
                                transition: "color var(--ease-fast)",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.color =
                                  "var(--accent-red)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.color =
                                  "var(--text-tertiary)")
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "20px",
                        background: "var(--bg-glass)",
                        border: "1px dashed var(--border-glass)",
                        borderRadius: "var(--radius-lg)",
                        textAlign: "center",
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <Star
                        size={20}
                        color="var(--text-tertiary)"
                        style={{ margin: "0 auto 6px" }}
                      />
                      <p>No saved beneficiaries yet.</p>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        Save verified recipients to execute future transfers in
                        1 click.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: MANUAL ACCOUNT ENTRY (Original feature preserved) */}
              {recipientMode === "MANUAL" && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <div className="form-input-container" style={{ flex: 1 }}>
                    <input
                      id="toAccount"
                      name="toAccount"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 101234567890 or 67a18..."
                      value={toAccount}
                      onChange={handleToAccountChange}
                      onBlur={() => {
                        if (
                          toAccount.trim() &&
                          !resolvedRecipient &&
                          !verifyingRecipient
                        ) {
                          handleVerifyRecipient();
                        }
                      }}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleVerifyRecipient}
                    disabled={!toAccount.trim() || verifyingRecipient}
                    style={{ minWidth: "90px" }}
                    id="verify-recipient-btn"
                  >
                    {verifyingRecipient ? "Checking..." : "Verify"}
                  </button>
                </div>
              )}

              {/* VERIFIED RECIPIENT CARD BANNER */}
              {resolvedRecipient && (
                <div className="verified-recipient-card">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "var(--radius-full)",
                          background: "rgba(16, 185, 129, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--accent-green-light)",
                        }}
                      >
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: "0.88rem",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {resolvedRecipient.recipientName}
                          {resolvedRecipient.nickname && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--accent-amber)",
                                marginLeft: "6px",
                              }}
                            >
                              ({resolvedRecipient.nickname})
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          Account:{" "}
                          {resolvedRecipient.maskedAccountNumber ||
                            "Account ending unavailable"}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {!isAlreadySaved && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{
                            fontSize: "0.75rem",
                            padding: "4px 8px",
                            color: "var(--accent-amber)",
                          }}
                          onClick={() => setShowSaveBox(!showSaveBox)}
                          title="Save as beneficiary"
                        >
                          <Star size={13} />
                          <span>Save</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                        onClick={handleClearRecipient}
                        title="Change recipient"
                      >
                        <X size={13} />
                        <span>Change</span>
                      </button>
                    </div>
                  </div>

                  {/* Save Beneficiary Box */}
                  {showSaveBox && !isAlreadySaved && (
                    <div className="save-recipient-box">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nickname (e.g. Office, Landlord)"
                        value={saveNickname}
                        onChange={(e) => setSaveNickname(e.target.value)}
                        style={{ height: "32px", fontSize: "0.78rem" }}
                        maxLength={50}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleSaveBeneficiary}
                        disabled={isSavingBeneficiary}
                        style={{
                          height: "32px",
                          padding: "0 12px",
                          fontSize: "0.78rem",
                        }}
                      >
                        {isSavingBeneficiary ? "Saving..." : "Confirm Save"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Recipient Lookup Error */}
              {recipientLookupError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "var(--accent-red-bg)",
                    border: "1px solid var(--accent-red-border)",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.8rem",
                    color: "var(--accent-red)",
                    marginTop: "6px",
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{recipientLookupError}</span>
                </div>
              )}
            </div>

            {/* 3. Amount Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="amount">
                <span>Amount (₹ INR)</span>
                {amount && (
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {formatCurrency(amount)}
                  </span>
                )}
              </label>
              <div className="form-input-container">
                <span
                  className="form-input-prefix"
                  style={{ fontWeight: 700, fontSize: "1rem" }}
                >
                  ₹
                </span>
                <input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  className="form-input has-prefix"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  required
                />
              </div>

              {/* Amount Quick Presets */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  flexWrap: "wrap",
                  marginTop: "6px",
                }}
              >
                {[500, 1000, 2000, 5000].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                    onClick={() => handleSetPresetAmount(preset)}
                  >
                    +₹{preset.toLocaleString("en-IN")}
                  </button>
                ))}
                {selectedFromBalance > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{
                      fontSize: "0.78rem",
                      padding: "4px 10px",
                      marginLeft: "auto",
                    }}
                    onClick={() => handleSetPresetAmount("MAX")}
                  >
                    Max Balance
                  </button>
                )}
              </div>
            </div>

            {/* 4. Description / Note (Optional) */}
            <div className="form-group">
              <label className="form-label" htmlFor="description">
                <span>Transfer Note / Description (Optional)</span>
              </label>
              <input
                id="description"
                type="text"
                className="form-input"
                placeholder="e.g. Rent, Freelance Payment, Personal Loan"
                value={description}
                maxLength={100}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              style={{ marginTop: "10px" }}
              disabled={
                activeAccounts.length === 0 ||
                !amount ||
                parseFloat(amount) <= 0 ||
                !toAccount.trim()
              }
              id="transfer-review-btn"
            >
              <ArrowRight size={18} />
              <span>Review Transfer</span>
            </button>
          </form>
        </div>

        {/* Transfer Summary Preview */}
        <TransferSummary
          fromAccountId={selectedAccountObj?.accountNumber || fromAccount}
          toAccountId={resolvedRecipient?.accountNumber || toAccount}
          recipientName={resolvedRecipient?.recipientName}
          amount={amount}
          fromAccountBalance={selectedFromBalance}
        />
      </div>

      {/* STEP 2: REVIEW & CONFIRMATION MODAL */}
      <Modal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        title="Review & Confirm Transfer"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              background: "var(--bg-glass)",
              border: "1px solid var(--border-glass)",
              borderRadius: "var(--radius-lg)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div className="summary-row">
              <span className="summary-label">Transfer Amount</span>
              <span
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                }}
              >
                {formatCurrency(parseFloat(amount) || 0)}
              </span>
            </div>

            <div className="summary-row">
              <span className="summary-label">From Account</span>
              <span className="summary-val">
                {selectedAccountObj?.accountNumber
                  ? `A/C ${selectedAccountObj.accountNumber}`
                  : formatAccountId(fromAccount)}
              </span>
            </div>

            <div className="summary-row">
              <span className="summary-label">Recipient</span>
              <span className="summary-val">
                {resolvedRecipient?.recipientName
                  ? `${resolvedRecipient.recipientName} (${resolvedRecipient.maskedAccountNumber})`
                  : toAccount}
              </span>
            </div>

            <div className="summary-row">
              <span className="summary-label">Transfer Fee</span>
              <span
                className="summary-val"
                style={{ color: "var(--accent-green-light)" }}
              >
                ₹0.00 (Free)
              </span>
            </div>

            {description && (
              <div className="summary-row">
                <span className="summary-label">Note</span>
                <span className="summary-val">{description}</span>
              </div>
            )}

            <div
              className="summary-row"
              style={{
                paddingTop: "10px",
                borderTop: "1px solid var(--border-glass)",
              }}
            >
              <span className="summary-label" style={{ fontWeight: 700 }}>
                Total Debit
              </span>
              <span
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "var(--accent-red)",
                }}
              >
                {formatCurrency(parseFloat(amount) || 0)}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
            }}
          >
            <ShieldCheck
              size={16}
              color="var(--accent-green-light)"
              style={{ flexShrink: 0 }}
            />
            <span>
              Protected by cryptographic idempotency key against duplicate
              debits.
            </span>
          </div>

          <div
            style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsReviewOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmAndSubmit}
              id="confirm-transfer-btn"
            >
              <ArrowRightLeft size={16} />
              <span>Confirm & Send Funds</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* STEP 3: PROCESSING / RESULT MODAL */}
      <ProcessingModal
        isOpen={modalState.isOpen}
        status={modalState.status}
        data={modalState.data}
        onClose={() =>
          setModalState({ isOpen: false, status: "PROCESSING", data: null })
        }
        onViewActivity={() => {
          setModalState({ isOpen: false, status: "PROCESSING", data: null });
          navigate("/activity");
        }}
      />
    </>
  );
}
