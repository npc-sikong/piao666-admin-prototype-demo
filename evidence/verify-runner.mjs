// scripts/verify.ts
import fs from "node:fs";
import assert from "node:assert/strict";

// shared/api-client/http.ts
var ApiError = class extends Error {
  problem;
  retryAfterSeconds;
  submissionOutcome;
  constructor(problem, retryAfterSeconds, submissionOutcome) {
    super(problem.title);
    this.name = "ApiError";
    this.problem = problem;
    this.retryAfterSeconds = retryAfterSeconds;
    this.submissionOutcome = submissionOutcome;
  }
};

// src/demo/templates.json
var templates_default = {
  "ai-management": {
    SettlementMode: "MANUAL",
    ProjectStatus: "ENABLED",
    PoolStatus: "OPEN",
    Page: {
      items: [],
      nextCursor: null,
      hasMore: false,
      snapshotId: null
    },
    AiSettings: {
      effectiveDate: "2026-10-03",
      timeZone: "Asia/Shanghai",
      cutoffOffsetMinutes: 0,
      endDate: null,
      settlementMode: "MANUAL",
      initialOfficialPoints: "0.00",
      userIncrementRatioBps: 0,
      defaultTargetNetReturnPercent: 0,
      maxOfficialContributionPoints: "0.00",
      rewardBudgetLimitPoints: "0.00"
    },
    AiProject: {
      drawSchedule: null,
      id: "",
      code: "",
      name: "",
      lotteryId: "",
      playId: "",
      status: "ENABLED",
      activeConfigVersion: null,
      latestPoolIssueId: null,
      version: "1"
    },
    AiProjectConfig: {
      projectId: "",
      version: "1",
      settings: {
        effectiveDate: "2026-10-03",
        timeZone: "Asia/Shanghai",
        cutoffOffsetMinutes: 0,
        endDate: null,
        settlementMode: "MANUAL",
        initialOfficialPoints: "0.00",
        userIncrementRatioBps: 0,
        defaultTargetNetReturnPercent: 0,
        maxOfficialContributionPoints: "0.00",
        rewardBudgetLimitPoints: "0.00"
      },
      authorId: "",
      createdAt: "2026-10-03T02:00:00+08:00"
    },
    AiPool: {
      id: "",
      projectId: "",
      lotteryId: "",
      playId: "",
      issueCode: "2026261",
      settlementMode: "MANUAL",
      ruleSetCode: "",
      status: "OPEN",
      cutoffAt: "2026-10-03T02:00:00+08:00",
      generatedAt: "0.00",
      groupCount: 0,
      configVersion: "1",
      initialOfficialPoints: "0.00",
      userIncrementRatioBps: 0,
      defaultTargetNetReturnPercent: 0,
      maxOfficialContributionPoints: "0.00",
      rewardBudgetLimitPoints: "0.00",
      actualUserShare: "0.00",
      userPurchasePoints: "0.00",
      platformPoints: "0.00",
      rawTotalPoints: "0.00",
      alignmentPoints: "0.00",
      totalPurchasePoints: "0.00",
      participantCount: 0,
      totalWinningPoints: null,
      userWinningPoints: null,
      numbersDisclosed: false,
      disclosureVersion: null,
      version: "1"
    },
    SelectionArea: {
      key: "",
      chosen: [],
      dan: [],
      tuo: []
    },
    Selection: {
      schemaId: "",
      schemaVersion: "1",
      mode: "SINGLE",
      areas: []
    },
    FixedCombination: {
      id: "",
      sequenceNo: 0,
      selection: {
        schemaId: "",
        schemaVersion: "1",
        mode: "SINGLE",
        areas: []
      },
      selectionHash: "1",
      numberCodes: [],
      groupHash: "1",
      baseBetCount: "",
      baseCostPoints: "0.00",
      generatedAt: "0.00"
    },
    PreviewCombination: {
      sequenceNo: 0,
      selection: {
        schemaId: "",
        schemaVersion: "1",
        mode: "SINGLE",
        areas: []
      },
      selectionHash: "1",
      numberCodes: [],
      groupHash: "1",
      baseBetCount: "",
      baseCostPoints: "0.00"
    },
    AiCombinationPreview: {
      projectId: "",
      issueId: "",
      issueCode: "2026261",
      configVersion: "1",
      ruleVersion: "1",
      algorithmVersion: "1",
      inputVersionSetHash: "1",
      generatedAt: "0.00",
      combinations: []
    },
    AiPoolAdmin: {
      pool: {
        id: "",
        projectId: "",
        lotteryId: "",
        playId: "",
        issueCode: "2026261",
        settlementMode: "MANUAL",
        ruleSetCode: "",
        status: "OPEN",
        cutoffAt: "2026-10-03T02:00:00+08:00",
        generatedAt: "0.00",
        groupCount: 0,
        configVersion: "1",
        initialOfficialPoints: "0.00",
        userIncrementRatioBps: 0,
        defaultTargetNetReturnPercent: 0,
        maxOfficialContributionPoints: "0.00",
        rewardBudgetLimitPoints: "0.00",
        actualUserShare: "0.00",
        userPurchasePoints: "0.00",
        platformPoints: "0.00",
        rawTotalPoints: "0.00",
        alignmentPoints: "0.00",
        totalPurchasePoints: "0.00",
        participantCount: 0,
        totalWinningPoints: null,
        userWinningPoints: null,
        numbersDisclosed: false,
        disclosureVersion: null,
        version: "1"
      },
      configVersion: "1",
      combinations: [],
      inputVersionSetHash: "1",
      allowedActions: []
    },
    Subscription: {
      id: "",
      poolIssueId: "",
      points: "0.00",
      quotaDate: "2026-10-03",
      status: "RESERVED",
      ledgerTransactionId: "",
      lockedAt: null,
      createdAt: "2026-10-03T02:00:00+08:00"
    },
    AllocationItem: {
      combinationId: "",
      sequenceNo: 0,
      allocatedPoints: "0.00",
      multiplier: "",
      allocationRatio: "0.00",
      awardCodes: [],
      winningPoints: "0.00"
    },
    Allocation: {
      id: "",
      poolIssueId: "",
      version: "1",
      inputVersionSetHash: "1",
      drawVersion: "1",
      ruleVersion: "1",
      simulationPolicyVersion: "1",
      ruleSetCode: "",
      algorithmVersion: "1",
      status: "SOLVED",
      items: [],
      totalPurchasePoints: "0.00",
      totalWinningPoints: null,
      userWinningPoints: null,
      platformWinningPoints: null,
      requestedTargetNetReturnPercent: 0,
      actualNetReturnRate: null,
      differencePercentagePoints: null,
      withinTolerance: false,
      rewardRequiredPoints: null,
      targetRoundingAdjustmentPoints: "0.00",
      winningNumberCode: "",
      winningGroupSequenceNo: 0,
      initialOfficialPoints: "0.00",
      userPurchasePoints: "0.00",
      incrementTotalPoints: "0.00",
      platformIncrementBasePoints: "0.00",
      rawTotalPoints: "0.00",
      alignmentPoints: "0.00",
      officialContributionPoints: "0.00",
      maxOfficialContributionPoints: "0.00",
      officialContributionWithinLimit: false,
      rewardBudgetLimitPoints: "0.00",
      rewardBudgetWithinLimit: false,
      groupingInputHash: "1",
      subscriptionInputHash: "1",
      drawInputHash: "1",
      ruleInputHash: "1",
      previewInputHash: "1",
      confirmationStatus: "NOT_CONFIRMABLE"
    },
    DisclosureReceipt: {
      id: "",
      poolIssueId: "",
      version: "1",
      status: "PUBLISHED",
      label: "",
      reason: "",
      publishedAt: "2026-10-03T02:00:00+08:00"
    },
    PayoutPreparation: {
      preparationId: "0.00",
      poolIssueId: "",
      allocationVersion: "1",
      disclosureVersion: "1",
      expectedInputVersionSetHash: "1",
      dueTotalPoints: "0.00",
      dueUserPoints: "0.00",
      eligible: false,
      blockingCodes: [],
      expiresAt: "2026-10-03T02:00:00+08:00"
    },
    PayoutBatch: {
      id: "",
      poolIssueId: "",
      status: "PENDING",
      expectedPoints: "0.00",
      postedPoints: "0.00",
      pendingPoints: "0.00",
      differencePoints: "0.00",
      inputVersionSetHash: "1",
      completedItemCount: 0,
      totalItemCount: 0,
      updatedAt: "2026-10-03T02:00:00+08:00"
    },
    PayoutItem: {
      id: "",
      maskedBeneficiary: "",
      duePoints: "0.00",
      postedPoints: "0.00",
      status: "PENDING",
      transactionId: null
    },
    BudgetAccount: {
      id: "",
      type: "DISTRIBUTION_BUDGET",
      availablePoints: "0.00",
      reservedPoints: "0.00",
      version: "1"
    },
    TaskAccepted: {
      taskId: "",
      status: "PENDING",
      statusUrl: "",
      pollAfterSeconds: 0
    },
    TaskStatus: {
      id: "",
      taskType: "",
      status: "PENDING",
      progress: 0,
      resultUrl: null,
      resultCode: null,
      failureCode: null,
      updatedAt: "2026-10-03T02:00:00+08:00"
    },
    CommandReceipt: {
      commandId: "",
      operationId: "0.00",
      resourceId: "",
      status: "ACCEPTED",
      createdAt: "2026-10-03T02:00:00+08:00"
    },
    CommandResult: {
      operationId: "0.00",
      resourceId: null,
      taskId: null,
      status: "PROCESSING",
      httpStatus: 0,
      resultUrl: null,
      failureCode: null
    },
    NameRef: {
      id: "",
      code: "",
      name: ""
    },
    ReportFilter: {
      from: "",
      to: "",
      asOf: null,
      projectId: "",
      lotteryId: "",
      issueCode: "2026261",
      status: "",
      groupBy: "POOL_ISSUE"
    },
    ReportRow: {
      dimensions: {},
      metrics: {}
    },
    ReportResult: {
      reportType: "AI_POOLS",
      metricDictionaryVersion: "1",
      snapshotId: "",
      filters: {
        from: "",
        to: "",
        asOf: null,
        projectId: "",
        lotteryId: "",
        issueCode: "2026261",
        status: "",
        groupBy: "POOL_ISSUE"
      },
      asOf: "2026-10-03T02:00:00+08:00",
      projectionVersion: "1",
      sourceWatermark: "1",
      items: [],
      totals: {},
      totalScope: "FULL_FILTER",
      nextCursor: null,
      hasMore: false,
      complete: false
    },
    ExportStatus: {
      id: "",
      status: "",
      rowCount: "",
      downloadUrl: null,
      expiresAt: null
    },
    ActionAuthorization: {
      actionToken: "",
      expiresAt: "2026-10-03T02:00:00+08:00"
    },
    SettlementExecution: {
      poolIssueId: "",
      settlementMode: "MANUAL",
      modeChangeAllowed: false,
      currentAllocationId: null,
      currentAllocationVersion: null,
      targetNetReturnPercent: 0,
      totalReturnPoints: null,
      postedReturnPoints: "0.00",
      targetRoundingAdjustmentPoints: null,
      payoutBatchId: null,
      automaticTaskId: null,
      automaticTaskStatus: null,
      failureCode: null
    }
  },
  "employee-security": {
    MfaEnrollment: {
      enrollmentId: "",
      provisioningUri: "",
      expiresAt: "2026-10-03T02:00:00+08:00"
    },
    Employee: {
      id: "",
      account: "",
      name: "",
      status: "ENABLED",
      roleIds: [],
      scopeStationIds: [],
      version: "1"
    },
    Role: {
      id: "",
      name: "",
      permissions: []
    },
    AuditView: {
      id: "",
      actorId: "",
      operationId: "0.00",
      resourceId: "",
      reason: "",
      beforeVersion: null,
      afterVersion: null,
      resultCode: "",
      createdAt: "2026-10-03T02:00:00+08:00",
      traceId: ""
    },
    CursorPage: {
      items: [],
      nextCursor: null,
      hasMore: false,
      snapshotId: null
    }
  },
  "ledger-management": {
    ReportFilter: {
      from: "",
      to: "",
      asOf: null,
      status: null,
      groupBy: null
    },
    ReportRow: {
      dimensions: {},
      metrics: {}
    },
    LedgerReport: {
      reportType: "LEDGER_RECONCILIATION",
      metricDictionaryVersion: "1",
      snapshotId: "",
      filters: {
        from: "",
        to: "",
        asOf: null,
        status: null,
        groupBy: null
      },
      asOf: "2026-10-03T02:00:00+08:00",
      projectionVersion: "1",
      sourceWatermark: "1",
      items: [],
      totals: {},
      totalScope: "FULL_FILTER",
      nextCursor: null,
      hasMore: false,
      complete: false
    },
    BudgetAccount: {
      id: "",
      type: "DISTRIBUTION_BUDGET",
      availablePoints: "0.00",
      reservedPoints: "0.00",
      version: "1"
    },
    BudgetAccountPage: {
      items: [],
      nextCursor: null,
      hasMore: false,
      snapshotId: null
    },
    LedgerAssetType: "POINTS",
    LedgerEntryDirection: "CREDIT",
    AdminLedgerEntry: {
      id: "",
      entryNo: 0,
      accountId: "",
      ownerType: "",
      ownerId: "",
      ownerAccount: null,
      ownerName: null,
      assetType: "POINTS",
      bucket: "",
      direction: "CREDIT",
      changePoints: "0.00",
      balanceBefore: "0.00",
      balanceAfter: "0.00"
    },
    AdminLedgerTransaction: {
      id: "",
      sequence: "",
      businessNumber: "",
      assetType: "POINTS",
      sourceType: "",
      sourceId: "",
      type: "",
      status: "",
      economicPoints: "0.00",
      reversedPoints: "0.00",
      referenceTransactionId: null,
      stationId: null,
      stationCode: null,
      stationName: null,
      stationMasterId: null,
      stationMasterCode: null,
      stationMasterName: null,
      memberId: null,
      issueCode: null,
      operatorRealm: "",
      operatorId: "",
      reason: "",
      createdAt: "2026-10-03T02:00:00+08:00",
      entries: []
    },
    AdminLedgerTransactionPage: {
      items: [],
      nextCursor: null,
      hasMore: false,
      snapshotId: null
    },
    TaskAccepted: {
      taskId: "",
      status: "",
      statusUrl: "",
      pollAfterSeconds: 0
    },
    TaskStatus: {
      id: "",
      taskType: "",
      status: "",
      progress: 0,
      resultUrl: null,
      resultCode: null,
      failureCode: null,
      updatedAt: "2026-10-03T02:00:00+08:00"
    },
    ExportStatus: {
      id: "",
      status: "PENDING",
      rowCount: "",
      downloadUrl: null,
      expiresAt: null
    },
    Reconciliation: {
      id: "",
      status: "PENDING",
      expectedPoints: null,
      actualPoints: null,
      differencePoints: null,
      asOf: null
    },
    CommandReceipt: {
      commandId: "",
      operationId: "0.00",
      resourceId: "",
      status: "ACCEPTED",
      createdAt: "2026-10-03T02:00:00+08:00"
    }
  },
  "member-management": {
    StatusToggle: "ENABLED",
    QualificationStatus: "READY",
    EligibilityStatus: "READY",
    NameRef: {
      id: "",
      code: "",
      name: ""
    },
    MemberScope: {
      station: {
        id: "",
        code: "",
        name: ""
      },
      stationMaster: {
        id: "",
        code: "",
        name: ""
      },
      referrerMember: null,
      version: "1"
    },
    MemberWallet: {
      availablePoints: "0.00",
      reservedPoints: "0.00",
      asOf: "2026-10-03T02:00:00+08:00",
      ledgerWatermark: "1"
    },
    MemberQuota: {
      businessDate: "2026-10-03",
      timeZone: "",
      vipBaseLimit: "0.00",
      referralExtraLimit: "0.00",
      totalLimit: "0.00",
      usedPoints: "0.00",
      remainingPoints: "0.00",
      eligibilityStatus: "READY",
      qualificationVersion: "1",
      vipConfigVersion: "1",
      referralConfigVersion: "1",
      asOf: "2026-10-03T02:00:00+08:00"
    },
    MemberAdmin: {
      id: "",
      account: "",
      displayName: "",
      status: "ENABLED",
      scope: {
        station: {
          id: "",
          code: "",
          name: ""
        },
        stationMaster: {
          id: "",
          code: "",
          name: ""
        },
        referrerMember: null,
        version: "1"
      },
      qualifiedRechargePoints: "0.00",
      stationDeductedPoints: "0.00",
      wallet: {
        availablePoints: "0.00",
        reservedPoints: "0.00",
        asOf: "2026-10-03T02:00:00+08:00",
        ledgerWatermark: "1"
      },
      vipName: "",
      referralName: "",
      quota: {
        businessDate: "2026-10-03",
        timeZone: "",
        vipBaseLimit: "0.00",
        referralExtraLimit: "0.00",
        totalLimit: "0.00",
        usedPoints: "0.00",
        remainingPoints: "0.00",
        eligibilityStatus: "READY",
        qualificationVersion: "1",
        vipConfigVersion: "1",
        referralConfigVersion: "1",
        asOf: "2026-10-03T02:00:00+08:00"
      },
      totalBetPoints: "0.00",
      netProfitPoints: "0.00",
      directMemberCount: 0,
      directMemberAvailableTotal: "",
      version: "1"
    },
    CursorPage: {
      items: [],
      nextCursor: null,
      hasMore: false,
      snapshotId: null
    },
    MemberAdminPage: {
      items: [],
      nextCursor: null,
      hasMore: false,
      snapshotId: null
    },
    LedgerView: {
      id: "",
      transactionId: "",
      type: "",
      bucket: "AVAILABLE",
      changePoints: "0.00",
      balanceBefore: "0.00",
      balanceAfter: "0.00",
      sourceType: "",
      sourceId: "",
      remark: "",
      createdAt: "2026-10-03T02:00:00+08:00"
    },
    LedgerViewPage: {
      items: [],
      nextCursor: null,
      hasMore: false,
      snapshotId: null
    },
    MemberOrder: {
      id: "",
      type: "ORDINARY",
      projectId: null,
      projectName: null,
      lotteryId: "",
      playId: "",
      issueCode: "2026261",
      status: "",
      purchasePoints: "0.00",
      dueAwardPoints: null,
      netPostedAwardPoints: "0.00",
      refundPoints: "0.00",
      settlementVersion: null,
      createdAt: "2026-10-03T02:00:00+08:00",
      detailUrl: ""
    },
    MemberOrderPage: {
      items: [],
      nextCursor: null,
      hasMore: false,
      snapshotId: null
    },
    VipLevel: {
      id: "",
      levelNo: 0,
      name: "",
      requiredRechargePoints: "0.00",
      aiPoolBaseDailyLimit: "0.00"
    },
    VipConfig: {
      version: "1",
      levels: [],
      createdAt: null,
      qualificationStatus: "READY"
    },
    VipConfigPage: {
      items: [],
      nextCursor: null,
      hasMore: false,
      snapshotId: null
    },
    ReferralLevel: {
      id: "",
      levelNo: 0,
      name: "",
      requiredDirectValidMembers: 0,
      validRechargePoints: "0.00",
      fixedRewardPoints: "0.00",
      directAiShareRate: "0.00",
      aiExtraDailyLimit: "0.00",
      status: "ENABLED"
    },
    ReferralConfig: {
      version: "1",
      levels: [],
      fixedRewardPolicyVersion: null,
      aiSharePolicyVersion: null,
      qualificationStatus: "READY"
    },
    ReferralConfigPage: {
      items: [],
      nextCursor: null,
      hasMore: false,
      snapshotId: null
    },
    CommandReceipt: {
      commandId: "",
      operationId: "0.00",
      resourceId: "",
      status: "ACCEPTED",
      createdAt: "2026-10-03T02:00:00+08:00"
    },
    CommandResult: {
      operationId: "0.00",
      resourceId: null,
      taskId: null,
      status: "PROCESSING",
      httpStatus: 0,
      resultUrl: null,
      failureCode: null
    },
    TaskAccepted: {
      taskId: "",
      status: "PENDING",
      statusUrl: "",
      pollAfterSeconds: 0
    },
    TaskStatusSummary: {
      id: "",
      taskType: "",
      status: "PENDING",
      progress: 0,
      resultUrl: null,
      resultCode: null,
      failureCode: null,
      updatedAt: "2026-10-03T02:00:00+08:00"
    },
    MemberReportType: "MEMBER_OVERVIEW",
    ReportFilter: {
      from: "",
      to: "",
      asOf: "2026-10-03T02:00:00+08:00",
      stationId: "",
      stationMasterId: "",
      memberId: "",
      vipLevelId: "",
      referralLevelId: "",
      groupBy: ""
    },
    ReportRow: {
      dimensions: {},
      metrics: {}
    },
    ReportResult: {
      reportType: "MEMBER_OVERVIEW",
      metricDictionaryVersion: "1",
      snapshotId: "",
      filters: {
        from: "",
        to: "",
        asOf: "2026-10-03T02:00:00+08:00",
        stationId: "",
        stationMasterId: "",
        memberId: "",
        vipLevelId: "",
        referralLevelId: "",
        groupBy: ""
      },
      asOf: "2026-10-03T02:00:00+08:00",
      projectionVersion: "1",
      sourceWatermark: "1",
      items: [],
      totals: {},
      totalScope: "FULL_FILTER",
      nextCursor: null,
      hasMore: false,
      complete: false
    },
    ExportStatus: {
      id: "",
      status: "PENDING",
      rowCount: "",
      downloadUrl: null,
      expiresAt: null
    },
    ActionAuthorization: {
      actionToken: "",
      expiresAt: "2026-10-03T02:00:00+08:00"
    }
  },
  operations: {
    AdminLottery: {
      id: "",
      code: "SSQ",
      name: "",
      latestIssueCode: null,
      plays: []
    },
    AdminPlay: {
      id: "",
      code: "",
      name: "",
      ruleVersion: null,
      readiness: "READY"
    },
    PlayReadiness: "READY",
    AdminCatalog: {
      version: "1",
      approvalStatus: "APPROVED",
      lotteries: []
    },
    AdminIssue: {
      id: "",
      lotteryId: "",
      issueCode: "2026261",
      status: "SCHEDULED",
      openAt: null,
      cutoffAt: null,
      drawAt: null,
      drawDate: "2026-10-03",
      officialIssueCode: "2026261",
      version: "1"
    },
    AdminIssuePage: {
      items: [],
      nextCursor: null,
      hasMore: false
    },
    DataHealthItem: {
      lotteryId: "",
      latestConfirmedIssue: null,
      drawVersion: null,
      omissionGeneration: null,
      gapCount: 0,
      trailingGap: false,
      drawVersionSetHash: null,
      qualificationLag: 0,
      pendingTaskCount: 0,
      projectionLag: 0,
      acknowledgedGapCount: 0,
      status: "READY"
    },
    OmissionGap: {
      beforeIssueCode: "2026261",
      afterIssueCode: "2026261",
      acknowledged: false,
      acknowledgementId: null,
      reason: null,
      acknowledgedBy: null,
      acknowledgedAt: null
    },
    OmissionGapPage: {
      lotteryId: "",
      gapCount: 0,
      acknowledgedGapCount: 0,
      items: []
    },
    DataHealthPage: {
      items: [],
      nextCursor: null,
      hasMore: false
    },
    SourceHealthItem: {
      id: "",
      name: "",
      lotteryIds: [],
      status: "APPROVED",
      lastSuccessAt: null,
      failureCode: null
    },
    SourceHealthPage: {
      items: [],
      nextCursor: null,
      hasMore: false
    },
    ReportType: "MEMBER_OVERVIEW",
    ReportRow: {
      dimensions: {},
      metrics: {}
    },
    ReportResult: {
      reportType: "MEMBER_OVERVIEW",
      metricDictionaryVersion: "1",
      snapshotId: "",
      asOf: "2026-10-03T02:00:00+08:00",
      projectionVersion: "1",
      sourceWatermark: "1",
      items: [],
      totals: {},
      totalScope: "",
      nextCursor: null,
      hasMore: false,
      complete: false
    },
    RuleDetail: {
      playId: "",
      officialRuleVersion: "1",
      simulationRuleVersion: null,
      readiness: "READY",
      ruleText: "",
      baseCostPoints: "0.00",
      sourceEvidenceIds: []
    },
    RuleDraft: {
      id: "",
      playId: "",
      version: "1",
      recordVersion: "1",
      status: "DRAFT",
      authorId: "",
      artifactHash: "1",
      effectiveFromIssue: ""
    },
    RuleDraftPage: {
      items: [],
      nextCursor: null,
      hasMore: false
    },
    PolicyCode: "SIMULATION_AWARD",
    PolicyView: {
      id: "",
      code: "SIMULATION_AWARD",
      version: "1",
      recordVersion: "1",
      status: "UNCONFIRMED",
      artifactId: "",
      artifactHash: "1",
      decisionIds: [],
      authorId: "",
      createdAt: "2026-10-03T02:00:00+08:00"
    },
    PolicyViewPage: {
      items: [],
      nextCursor: null,
      hasMore: false
    },
    DrawArea: {
      key: "",
      chosen: []
    },
    DrawCandidate: {
      id: "",
      lotteryId: "",
      issueCode: "2026261",
      areas: [],
      source: "MANUAL",
      status: "PENDING_REVIEW",
      evidenceIds: [],
      authorId: "",
      replacesDrawVersion: null,
      version: "1",
      createdAt: "2026-10-03T02:00:00+08:00"
    },
    DrawCandidatePage: {
      items: [],
      nextCursor: null,
      hasMore: false
    },
    DrawVersion: {
      lotteryId: "",
      lotteryCode: "SSQ",
      issueCode: "2026261",
      version: "1",
      status: "PENDING",
      source: "SYSTEM",
      areas: [],
      confirmedAt: null,
      correctionNote: null,
      prizeReferenceStatus: "PENDING"
    },
    DrawVersionPage: {
      items: [],
      nextCursor: null,
      hasMore: false
    },
    TaskAccepted: {
      taskId: "",
      status: "",
      statusUrl: "",
      pollAfterSeconds: 0
    },
    TaskStatusSummary: {
      id: "",
      taskType: "",
      status: "",
      progress: 0,
      resultUrl: null,
      resultCode: null,
      failureCode: null,
      updatedAt: "2026-10-03T02:00:00+08:00"
    },
    EvidenceUpload: {
      id: "",
      status: "",
      sha256: "",
      purpose: ""
    },
    ActionAuthorization: {
      actionToken: "",
      expiresAt: "2026-10-03T02:00:00+08:00"
    }
  },
  "order-management": {
    OrderStatus: "RESERVED",
    AreaSelection: {
      key: "",
      chosen: [],
      dan: [],
      tuo: []
    },
    Selection: {
      schemaId: "",
      schemaVersion: "1",
      mode: "",
      areas: []
    },
    AdminOrder: {
      id: "",
      type: "ORDINARY",
      projectId: null,
      projectName: null,
      lotteryId: "",
      playId: "",
      issueCode: "2026261",
      selection: null,
      status: "RESERVED",
      purchasePoints: "0.00",
      dueAwardPoints: null,
      netPostedAwardPoints: "0.00",
      refundPoints: "0.00",
      settlementVersion: null,
      createdAt: "2026-10-03T02:00:00+08:00",
      detailUrl: ""
    },
    AdminOrderPage: {
      items: [],
      nextCursor: null,
      hasMore: false,
      snapshotId: null
    },
    OrdinarySettlement: {
      settlementVersion: "1",
      drawVersionId: "1",
      calculationReference: "",
      awardCodes: null,
      dueAwardPoints: "0.00",
      economicDeltaPoints: "0.00",
      actionType: "",
      actionStatus: "",
      requestedPoints: "0.00",
      postedPoints: "0.00",
      platformBornePoints: "0.00",
      ledgerTransactionId: null,
      createdAt: "2026-10-03T02:00:00+08:00",
      completedAt: null
    },
    OrdinaryRefund: {
      refundPoints: "0.00",
      recoveredAwardPoints: "0.00",
      platformBornePoints: "0.00",
      refundTransactionId: "",
      recoveryTransactionId: null,
      reason: "",
      refundedAt: "2026-10-03T02:00:00+08:00"
    },
    AdminOrderDetail: {
      order: {
        id: "",
        type: "ORDINARY",
        projectId: null,
        projectName: null,
        lotteryId: "",
        playId: "",
        issueCode: "2026261",
        selection: null,
        status: "RESERVED",
        purchasePoints: "0.00",
        dueAwardPoints: null,
        netPostedAwardPoints: "0.00",
        refundPoints: "0.00",
        settlementVersion: null,
        createdAt: "2026-10-03T02:00:00+08:00",
        detailUrl: ""
      },
      selection: {
        schemaId: "",
        schemaVersion: "1",
        mode: "",
        areas: []
      },
      recommendationId: null,
      betCount: "",
      multiple: 0,
      ruleVersion: "1",
      simulationRuleVersion: "1",
      ledgerTransactionId: "",
      lockTransactionId: null,
      lockedAt: null,
      settlements: [],
      refund: null
    },
    TaskAccepted: {
      taskId: "",
      status: "",
      statusUrl: "",
      pollAfterSeconds: 0
    }
  },
  robots: {
    StrategyCode: "BALANCED",
    RecommendationFeature: "STRUCTURE",
    GenerationMode: "PER_ISSUE",
    StatusToggle: "ENABLED",
    WeightItem: {
      feature: "STRUCTURE",
      basisPoints: 0
    },
    StrategyCommon: {
      shortWindow: 0,
      mediumWindow: 0,
      longWindow: 0,
      maxGroupsPerPlay: 0,
      candidateMultiplier: 0,
      minRecommendationScore: 0,
      maxPointsPerIssue: "0.00",
      explorationRate: "0.00",
      minDiversityRate: "0.00",
      maxRerunsPerIssue: 0,
      weights: []
    },
    StrategyConfig: {
      code: "BALANCED",
      common: {
        shortWindow: 0,
        mediumWindow: 0,
        longWindow: 0,
        maxGroupsPerPlay: 0,
        candidateMultiplier: 0,
        minRecommendationScore: 0,
        maxPointsPerIssue: "0.00",
        explorationRate: "0.00",
        minDiversityRate: "0.00",
        maxRerunsPerIssue: 0,
        weights: []
      }
    },
    HistoryPerformance: {
      settledGroups: "",
      hitGroups: "",
      hitRate: null,
      asOf: "2026-10-03T02:00:00+08:00"
    },
    RobotPublic: {
      id: "",
      name: "",
      strategyCode: "BALANCED",
      strategyLabel: "0.00",
      strategyDescription: "0.00",
      lotteryIds: [],
      performance: {
        settledGroups: "",
        hitGroups: "",
        hitRate: null,
        asOf: "2026-10-03T02:00:00+08:00"
      },
      currentGroups: "",
      recommendationScore: null,
      scoreLabel: "\u63A8\u8350\u8BC4\u5206"
    },
    RobotAdmin: {
      robot: {
        id: "",
        name: "",
        strategyCode: "BALANCED",
        strategyLabel: "0.00",
        strategyDescription: "0.00",
        lotteryIds: [],
        performance: {
          settledGroups: "",
          hitGroups: "",
          hitRate: null,
          asOf: "2026-10-03T02:00:00+08:00"
        },
        currentGroups: "",
        recommendationScore: null,
        scoreLabel: "\u63A8\u8350\u8BC4\u5206"
      },
      status: "ENABLED",
      strategy: {
        code: "BALANCED",
        common: {
          shortWindow: 0,
          mediumWindow: 0,
          longWindow: 0,
          maxGroupsPerPlay: 0,
          candidateMultiplier: 0,
          minRecommendationScore: 0,
          maxPointsPerIssue: "0.00",
          explorationRate: "0.00",
          minDiversityRate: "0.00",
          maxRerunsPerIssue: 0,
          weights: []
        }
      },
      strategyVersion: "0.00",
      generationMode: "PER_ISSUE",
      generationTime: null,
      currentLotteryCount: "",
      currentPlayCount: "",
      currentBetCount: "",
      currentPricePoints: "0.00",
      latestExecutionAt: null,
      version: "1"
    },
    StrategyDefinition: {
      code: "BALANCED",
      label: "",
      description: "",
      schemaRef: "",
      defaultConfig: {
        code: "BALANCED",
        common: {
          shortWindow: 0,
          mediumWindow: 0,
          longWindow: 0,
          maxGroupsPerPlay: 0,
          candidateMultiplier: 0,
          minRecommendationScore: 0,
          maxPointsPerIssue: "0.00",
          explorationRate: "0.00",
          minDiversityRate: "0.00",
          maxRerunsPerIssue: 0,
          weights: []
        }
      }
    },
    AreaSelection: {
      key: "",
      chosen: [],
      dan: [],
      tuo: []
    },
    Selection: {
      schemaId: "",
      schemaVersion: "1",
      mode: "SINGLE",
      areas: []
    },
    RecommendationScoreComponent: {
      feature: "STRUCTURE",
      score: 0,
      weightBasisPoints: 0
    },
    Recommendation: {
      id: "",
      executionId: "",
      robotId: "",
      lotteryId: "",
      playId: "",
      issueCode: "2026261",
      selection: {
        schemaId: "",
        schemaVersion: "1",
        mode: "SINGLE",
        areas: []
      },
      recommendationScore: 0,
      betCount: "",
      pricePoints: "0.00",
      strategyVersion: "0.00",
      generationVersion: "0.00",
      algorithmVersion: "1",
      ruleVersion: "1",
      scoreBreakdown: [],
      explanations: [],
      cutoffAt: "2026-10-03T02:00:00+08:00",
      outcome: {
        status: "PENDING",
        drawVersion: null,
        verifiedAt: null
      },
      generatedAt: "0.00",
      status: "PREVIEW"
    },
    CursorPage: {
      items: [],
      nextCursor: null,
      hasMore: false,
      snapshotId: null
    },
    TaskAccepted: {
      taskId: "",
      status: "PENDING",
      statusUrl: "",
      pollAfterSeconds: 0
    },
    TaskStatusSummary: {
      id: "",
      taskType: "",
      status: "PENDING",
      progress: 0,
      resultUrl: null,
      resultCode: null,
      failureCode: null,
      updatedAt: "2026-10-03T02:00:00+08:00"
    }
  },
  "station-management": {
    ToggleStatus: "ENABLED",
    NameRef: {
      id: "",
      code: "",
      name: ""
    },
    CursorPage: {
      items: [],
      nextCursor: null,
      hasMore: false,
      snapshotId: null
    },
    Station: {
      id: "",
      code: "",
      name: "",
      regionLabel: "",
      status: "ENABLED",
      remark: "",
      stationMasterCount: 0,
      memberCount: 0,
      version: "1"
    },
    StationLimits: {
      singleGrantLimit: "0.00",
      singleDeductLimit: "0.00",
      dailyOperationLimit: "0.00"
    },
    StationMaster: {
      id: "",
      code: "",
      userId: "",
      name: "",
      account: "",
      station: {
        id: "",
        code: "",
        name: ""
      },
      status: "ENABLED",
      limits: {
        singleGrantLimit: "0.00",
        singleDeductLimit: "0.00",
        dailyOperationLimit: "0.00"
      },
      remark: "",
      disposablePoints: "0.00",
      operationCredentialConfigured: false,
      memberCount: 0,
      grantedMemberPoints: "0.00",
      deductedMemberPoints: "0.00",
      identityVersion: "1",
      version: "1"
    },
    LedgerView: {
      id: "",
      transactionId: "",
      type: "",
      bucket: "AVAILABLE",
      changePoints: "0.00",
      balanceBefore: "0.00",
      balanceAfter: "0.00",
      sourceType: "",
      sourceId: "",
      remark: "",
      createdAt: "2026-10-03T02:00:00+08:00"
    },
    BudgetAccount: {
      id: "",
      type: "DISTRIBUTION_BUDGET",
      availablePoints: "0.00",
      reservedPoints: "0.00",
      version: "1"
    },
    PointChangeReceipt: {
      transactionId: "",
      operationType: "STATION_VIP_CREDIT",
      points: "0.00",
      memberId: null,
      stationMasterId: "",
      stationMasterBalanceBefore: "0.00",
      stationMasterBalanceAfter: "0.00",
      memberBalanceBefore: null,
      memberBalanceAfter: null,
      createdAt: "2026-10-03T02:00:00+08:00"
    },
    TaskAccepted: {
      taskId: "",
      status: "PENDING",
      statusUrl: "",
      pollAfterSeconds: 0
    },
    CommandResult: {
      operationId: "0.00",
      resourceId: null,
      taskId: null,
      status: "PROCESSING",
      httpStatus: 0,
      resultUrl: null,
      failureCode: null
    },
    ReportFilter: {
      from: "",
      to: "",
      asOf: null,
      stationId: "",
      stationMasterId: "",
      memberId: "",
      vipLevelId: "",
      referralLevelId: "",
      projectId: "",
      lotteryId: "",
      issueCode: "2026261",
      status: "",
      affiliationMode: "CURRENT_COHORT",
      groupBy: "DAY"
    },
    ReportRow: {
      dimensions: {},
      metrics: {}
    },
    StationMasterReport: {
      reportType: "STATION_MASTERS",
      metricDictionaryVersion: "1",
      snapshotId: "",
      filters: {
        from: "",
        to: "",
        asOf: null,
        stationId: "",
        stationMasterId: "",
        memberId: "",
        vipLevelId: "",
        referralLevelId: "",
        projectId: "",
        lotteryId: "",
        issueCode: "2026261",
        status: "",
        affiliationMode: "CURRENT_COHORT",
        groupBy: "DAY"
      },
      asOf: "2026-10-03T02:00:00+08:00",
      projectionVersion: "1",
      sourceWatermark: "1",
      items: [],
      totals: {},
      totalScope: "FULL_FILTER",
      nextCursor: null,
      hasMore: false,
      complete: false
    },
    ExportStatus: {
      id: "",
      status: "PENDING",
      rowCount: "",
      downloadUrl: null,
      expiresAt: null
    }
  }
};

// src/demo/catalog.json
var catalog_default = {
  version: "FORMAL-20260919-V1",
  approvalStatus: "APPROVED",
  lotteries: [
    {
      id: "10000000-0000-0000-0000-000000000001",
      code: "SSQ",
      name: "\u53CC\u8272\u7403",
      latestIssueCode: "2026261",
      plays: [
        {
          id: "20000000-0000-0000-0000-000000000001",
          code: "SSQ_BASIC",
          name: "\u53CC\u8272\u7403\u57FA\u672C\u73A9\u6CD5",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        }
      ]
    },
    {
      id: "10000000-0000-0000-0000-000000000002",
      code: "DLT",
      name: "\u5927\u4E50\u900F",
      latestIssueCode: "2026261",
      plays: [
        {
          id: "20000000-0000-0000-0000-000000000002",
          code: "DLT_BASIC",
          name: "\u5927\u4E50\u900F\u57FA\u672C\u73A9\u6CD5",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        }
      ]
    },
    {
      id: "10000000-0000-0000-0000-000000000003",
      code: "FC3D",
      name: "\u798F\u5F693D",
      latestIssueCode: "2026261",
      plays: [
        {
          id: "20000000-0000-0000-0000-000000000003",
          code: "FC3D_STRAIGHT",
          name: "\u798F\u5F693D\u5355\u9009",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        },
        {
          id: "20000000-0000-0000-0000-000000000004",
          code: "FC3D_GROUP3",
          name: "\u798F\u5F693D\u7EC4\u90093",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        },
        {
          id: "20000000-0000-0000-0000-000000000005",
          code: "FC3D_GROUP6",
          name: "\u798F\u5F693D\u7EC4\u90096",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        },
        {
          id: "20000000-0000-0000-0000-000000000006",
          code: "FC3D_TONGXUAN",
          name: "\u798F\u5F693D\u901A\u9009",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        }
      ]
    },
    {
      id: "10000000-0000-0000-0000-000000000004",
      code: "PL3",
      name: "\u6392\u5217\u4E09",
      latestIssueCode: "2026261",
      plays: [
        {
          id: "20000000-0000-0000-0000-000000000007",
          code: "PL3_STRAIGHT",
          name: "\u6392\u5217\u4E09\u76F4\u9009",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        },
        {
          id: "20000000-0000-0000-0000-000000000008",
          code: "PL3_GROUP3",
          name: "\u6392\u5217\u4E09\u7EC4\u90093",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        },
        {
          id: "20000000-0000-0000-0000-000000000009",
          code: "PL3_GROUP6",
          name: "\u6392\u5217\u4E09\u7EC4\u90096",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        }
      ]
    },
    {
      id: "10000000-0000-0000-0000-000000000005",
      code: "PL5",
      name: "\u6392\u5217\u4E94",
      latestIssueCode: "2026261",
      plays: [
        {
          id: "20000000-0000-0000-0000-000000000010",
          code: "PL5_STRAIGHT",
          name: "\u6392\u5217\u4E94\u76F4\u9009",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        }
      ]
    },
    {
      id: "10000000-0000-0000-0000-000000000006",
      code: "QLC",
      name: "\u4E03\u4E50\u5F69",
      latestIssueCode: "2026261",
      plays: [
        {
          id: "20000000-0000-0000-0000-000000000011",
          code: "QLC_BASIC",
          name: "\u4E03\u4E50\u5F69\u57FA\u672C\u73A9\u6CD5",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        }
      ]
    },
    {
      id: "10000000-0000-0000-0000-000000000007",
      code: "KL8",
      name: "\u5FEB\u4E508",
      latestIssueCode: "2026261",
      plays: [
        {
          id: "20000000-0000-0000-0000-000000000013",
          code: "KL8_PICK_01",
          name: "\u5FEB\u4E508\u90091",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        },
        {
          id: "20000000-0000-0000-0000-000000000014",
          code: "KL8_PICK_02",
          name: "\u5FEB\u4E508\u90092",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        },
        {
          id: "20000000-0000-0000-0000-000000000015",
          code: "KL8_PICK_03",
          name: "\u5FEB\u4E508\u90093",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        },
        {
          id: "20000000-0000-0000-0000-000000000016",
          code: "KL8_PICK_04",
          name: "\u5FEB\u4E508\u90094",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        },
        {
          id: "20000000-0000-0000-0000-000000000017",
          code: "KL8_PICK_05",
          name: "\u5FEB\u4E508\u90095",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        },
        {
          id: "20000000-0000-0000-0000-000000000018",
          code: "KL8_PICK_06",
          name: "\u5FEB\u4E508\u90096",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        },
        {
          id: "20000000-0000-0000-0000-000000000019",
          code: "KL8_PICK_07",
          name: "\u5FEB\u4E508\u90097",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        },
        {
          id: "20000000-0000-0000-0000-000000000020",
          code: "KL8_PICK_08",
          name: "\u5FEB\u4E508\u90098",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        },
        {
          id: "20000000-0000-0000-0000-000000000021",
          code: "KL8_PICK_09",
          name: "\u5FEB\u4E508\u90099",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        },
        {
          id: "20000000-0000-0000-0000-000000000022",
          code: "KL8_PICK_10",
          name: "\u5FEB\u4E508\u900910",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        }
      ]
    },
    {
      id: "10000000-0000-0000-0000-000000000008",
      code: "QXC",
      name: "7\u661F\u5F69",
      latestIssueCode: "2026261",
      plays: [
        {
          id: "20000000-0000-0000-0000-000000000012",
          code: "QXC_BASIC",
          name: "7\u661F\u5F69\u57FA\u672C\u73A9\u6CD5",
          ruleVersion: "FORMAL-20260919-V1",
          readiness: "READY"
        }
      ]
    }
  ]
};

// src/demo/meta.json
var meta_default = {
  permissions: [
    "action:authorize",
    "ai-disclosure:publish",
    "ai-payout:execute",
    "ai-payout:prepare",
    "ai-payout:retry",
    "ai-payout:view",
    "ai-pool:calculate",
    "ai-pool:close",
    "ai-pool:subscriptions:view",
    "ai-pool:view",
    "ai-project:configure",
    "ai-project:create",
    "ai-project:status",
    "ai-project:view",
    "audit:view",
    "budget:approve",
    "budget:view",
    "budget:write",
    "business-decision:approve",
    "business-decision:view",
    "business-decision:write",
    "command:read:self",
    "draw:candidate:create",
    "draw:confirm",
    "draw:fetch",
    "draw:review:view",
    "employee:create",
    "employee:permission:write",
    "employee:recover",
    "employee:status",
    "employee:view",
    "evidence:write",
    "ledger:reconcile",
    "ledger:reverse",
    "ledger:view",
    "lottery:data:view",
    "member:ledger:view",
    "member:membership:migrate",
    "member:orders:view",
    "member:status",
    "member:view",
    "omission:rebuild",
    "order:settlement:retry",
    "order:view",
    "policy:approve",
    "policy:view",
    "policy:write",
    "qualification:rebuild",
    "referral:config:view",
    "referral:config:write",
    "report:export",
    "report:view",
    "robot:create",
    "robot:delete",
    "robot:generate",
    "robot:status",
    "robot:update",
    "robot:view",
    "rule:approve",
    "rule:view",
    "rule:write",
    "station-master:create",
    "station-master:migrate",
    "station-master:password:reset",
    "station-master:points:adjust",
    "station-master:points:view",
    "station-master:status",
    "station-master:update",
    "station-master:view",
    "station:create",
    "station:update",
    "station:view",
    "task:view",
    "vip:config:view",
    "vip:config:write"
  ],
  avatars: [
    {
      id: "fd067211-131c-a0ac-d696-d8244b3e9f1b",
      name: "\u4E03\u4E50\u5F69\u964D\u6743\u8FC7\u6EE4\u5927\u5E08"
    },
    {
      id: "fa4b4657-a786-b552-69ee-1cbd913180f7",
      name: "\u4E03\u4E50\u5F69\u5747\u8861\u5927\u5E08"
    },
    {
      id: "f95e981c-57aa-c7e7-27c4-cb674e18455d",
      name: "\u5927\u4E50\u900F\u8D8B\u52BF\u5927\u5E08"
    },
    {
      id: "f9448353-1ac0-5160-cdd4-0eb866c6e668",
      name: "\u798F\u5F693D\u964D\u6743\u8FC7\u6EE4\u5927\u5E08"
    },
    {
      id: "f01da2d9-cec8-1a62-14ab-4bc5fa0677b5",
      name: "\u6392\u5217\u4E09\u51B7\u70ED\u6DF7\u5408\u5927\u5E08"
    },
    {
      id: "eeee31fb-bf3f-ebd6-7104-80f7aeb3fc31",
      name: "\u53CC\u8272\u7403\u51B7\u70ED\u6DF7\u5408\u5927\u5E08"
    },
    {
      id: "ed756d4a-258e-96b5-5aa2-6f9eb600dc3f",
      name: "\u53CC\u8272\u7403\u5747\u8861\u5927\u5E08"
    },
    {
      id: "e8a3b690-34c2-29d8-c14b-2806df1c33af",
      name: "\u6392\u5217\u4E09\u8D8B\u52BF\u5927\u5E08"
    },
    {
      id: "e2f0fc54-72e7-93b8-de5c-725a3c37e8c0",
      name: "\u6392\u5217\u4E09\u591A\u6A21\u578B\u7EC4\u5408\u5927\u5E08"
    },
    {
      id: "dbdc1527-3217-c3be-a5c1-047ff31c39e6",
      name: "\u6392\u5217\u4E09\u964D\u6743\u8FC7\u6EE4\u5927\u5E08"
    },
    {
      id: "cdf42bf9-8bf2-6dc3-34b7-ffa35dc0fe11",
      name: "\u798F\u5F693D\u63A2\u7D22\u5927\u5E08"
    },
    {
      id: "c9e4ad3d-e696-c0cd-d5f0-fcfd82813bda",
      name: "\u5FEB\u4E508\u63A2\u7D22\u5927\u5E08"
    },
    {
      id: "c9892f8d-63e1-3005-dc2b-f013b92d0acc",
      name: "\u5FEB\u4E508\u591A\u6A21\u578B\u7EC4\u5408\u5927\u5E08"
    },
    {
      id: "c511a4ce-229a-f1aa-d0c8-7f8259393642",
      name: "\u6392\u5217\u4E94\u63A2\u7D22\u5927\u5E08"
    },
    {
      id: "bdd2b658-38b9-62f5-2bdc-f8ad9b76e165",
      name: "\u4E03\u4E50\u5F69\u8D8B\u52BF\u5927\u5E08"
    },
    {
      id: "bc7ca6ca-8f8c-4047-7517-ad95e194db31",
      name: "\u798F\u5F693D\u5747\u8861\u5927\u5E08"
    },
    {
      id: "b6474b49-7960-6884-1d17-06621c8b1e56",
      name: "\u798F\u5F693D\u591A\u6A21\u578B\u7EC4\u5408\u5927\u5E08"
    },
    {
      id: "b5625fea-11bc-6631-73fe-def5e14f06bb",
      name: "\u53CC\u8272\u7403\u591A\u6A21\u578B\u7EC4\u5408\u5927\u5E08"
    },
    {
      id: "b14257f6-c019-bdc8-c07b-85851c5814ad",
      name: "7\u661F\u5F69\u5747\u8861\u5927\u5E08"
    },
    {
      id: "ad5f30b7-2e39-8f16-f0cf-15488d5a2539",
      name: "\u4E03\u4E50\u5F69\u51B7\u70ED\u6DF7\u5408\u5927\u5E08"
    },
    {
      id: "a3a5e8cf-dbf8-874b-f748-672d09714412",
      name: "\u6392\u5217\u4E94\u964D\u6743\u8FC7\u6EE4\u5927\u5E08"
    },
    {
      id: "a26042f9-2cd8-ccb8-cadf-a6dda6c87097",
      name: "\u5927\u4E50\u900F\u964D\u6743\u8FC7\u6EE4\u5927\u5E08"
    },
    {
      id: "9d572651-fa4c-0190-96c8-86f31e900241",
      name: "7\u661F\u5F69\u63A2\u7D22\u5927\u5E08"
    },
    {
      id: "9cfc03ab-89ca-1529-3aa1-71f1ccab9485",
      name: "\u5FEB\u4E508\u5747\u8861\u5927\u5E08"
    },
    {
      id: "8ed5aa16-1024-6e35-3b49-c983a9304f7e",
      name: "\u798F\u5F693D\u8D8B\u52BF\u5927\u5E08"
    },
    {
      id: "88f17a06-f30d-bb19-2972-c8666599cbcd",
      name: "7\u661F\u5F69\u8D8B\u52BF\u5927\u5E08"
    },
    {
      id: "87055581-50bc-3ded-79cc-eaa4890a3f18",
      name: "\u4E03\u4E50\u5F69\u63A2\u7D22\u5927\u5E08"
    },
    {
      id: "823fd625-9f18-446b-4f5f-c500b2629f0c",
      name: "\u5927\u4E50\u900F\u51B7\u70ED\u6DF7\u5408\u5927\u5E08"
    },
    {
      id: "7d0b2c1d-7028-c205-7d34-7e8055831b39",
      name: "\u6392\u5217\u4E94\u8D8B\u52BF\u5927\u5E08"
    },
    {
      id: "79ffea34-dc26-2a9c-a113-0e5ecaf3ae89",
      name: "\u6392\u5217\u4E09\u63A2\u7D22\u5927\u5E08"
    },
    {
      id: "708c1e0f-3397-dd1e-31ad-fd9b2d2c7f64",
      name: "\u798F\u5F693D\u51B7\u70ED\u6DF7\u5408\u5927\u5E08"
    },
    {
      id: "6371e0aa-25f9-3fb5-50b7-8d451efd82c0",
      name: "\u53CC\u8272\u7403\u964D\u6743\u8FC7\u6EE4\u5927\u5E08"
    },
    {
      id: "6271ae6c-c884-47c2-e863-c2dfd7dda63f",
      name: "\u5927\u4E50\u900F\u63A2\u7D22\u5927\u5E08"
    },
    {
      id: "5f7e314d-131d-b833-f2e4-5d7b6420edd9",
      name: "\u5FEB\u4E508\u51B7\u70ED\u6DF7\u5408\u5927\u5E08"
    },
    {
      id: "57a01e1d-7f64-6c07-bda7-44d5a85fc8eb",
      name: "7\u661F\u5F69\u964D\u6743\u8FC7\u6EE4\u5927\u5E08"
    },
    {
      id: "4c527068-b623-ff7d-fab4-f957df962cfc",
      name: "\u6392\u5217\u4E94\u51B7\u70ED\u6DF7\u5408\u5927\u5E08"
    },
    {
      id: "4a84bef1-fbaa-a495-9be3-c5234595fc6d",
      name: "\u53CC\u8272\u7403\u63A2\u7D22\u5927\u5E08"
    },
    {
      id: "481d2c9a-b380-bc04-bbc5-ec562c2f3f5f",
      name: "\u5FEB\u4E508\u964D\u6743\u8FC7\u6EE4\u5927\u5E08"
    },
    {
      id: "4624013b-0d33-fcb5-cb32-3122d3589180",
      name: "\u5FEB\u4E508\u8D8B\u52BF\u5927\u5E08"
    },
    {
      id: "3e61954a-8062-2810-0364-3e50bb0c3449",
      name: "\u5927\u4E50\u900F\u5747\u8861\u5927\u5E08"
    },
    {
      id: "3aa0cfb9-6306-359d-7155-dc05f0f004a9",
      name: "\u6392\u5217\u4E09\u5747\u8861\u5927\u5E08"
    },
    {
      id: "2932cc95-c26a-3cbf-ac4d-a73aa0e439b2",
      name: "7\u661F\u5F69\u591A\u6A21\u578B\u7EC4\u5408\u5927\u5E08"
    },
    {
      id: "272a7a94-14cd-4d9d-c47a-e656da58b40d",
      name: "\u4E03\u4E50\u5F69\u591A\u6A21\u578B\u7EC4\u5408\u5927\u5E08"
    },
    {
      id: "1d31c769-5a34-0bd1-892d-6f4f7b58bd17",
      name: "\u53CC\u8272\u7403\u8D8B\u52BF\u5927\u5E08"
    },
    {
      id: "1596c943-3d45-c285-3670-c226e77aa78c",
      name: "\u5927\u4E50\u900F\u591A\u6A21\u578B\u7EC4\u5408\u5927\u5E08"
    },
    {
      id: "146dd3bd-6be8-633e-421c-b3844d7e2410",
      name: "\u6392\u5217\u4E94\u5747\u8861\u5927\u5E08"
    },
    {
      id: "11e4d4a2-13b3-a48d-5a63-7bad72fa0eab",
      name: "7\u661F\u5F69\u51B7\u70ED\u6DF7\u5408\u5927\u5E08"
    },
    {
      id: "0fc4415d-fcf5-8074-5683-2436a0a4edb4",
      name: "\u6392\u5217\u4E94\u591A\u6A21\u578B\u7EC4\u5408\u5927\u5E08"
    }
  ],
  metrics: [
    "actualNetReturnRate",
    "actualUserShare",
    "aiShareBasisPoints",
    "aiSharePendingPoints",
    "aiSharePolicyVersion",
    "aiSharePostedPoints",
    "availablePoints",
    "combinationCount",
    "date",
    "deductCount",
    "deductMemberCount",
    "differencePoints",
    "directAvailablePoints",
    "directMemberCount",
    "endingBalancePoints",
    "expectedPoints",
    "fixedRewardCount",
    "fixedRewardDuePoints",
    "fixedRewardPolicyVersion",
    "fixedRewardPostedCount",
    "fixedRewardPostedPoints",
    "interceptCount",
    "issueCount",
    "lockedAiShareRate",
    "memberCount",
    "memberDeductedPoints",
    "memberGrantedPoints",
    "memberShare",
    "mismatchAccountCount",
    "netEffectivePurchasePoints",
    "netGrantedPoints",
    "netProfitPoints",
    "newMemberCount",
    "openingBalancePoints",
    "outsideToleranceCount",
    "participantCount",
    "participationPersonTimes",
    "periodDeductedPoints",
    "periodGrantedPoints",
    "platformPoints",
    "platformWinningPoints",
    "postedPoints",
    "postedUserWinningPoints",
    "qualifiedRechargePoints",
    "quotaOccupiedPoints",
    "quotaReleasedPoints",
    "quotaRemainingPoints",
    "quotaUsageRate",
    "quotaUsedPoints",
    "rebuildingMemberCount",
    "rechargeCount",
    "rechargeMemberCount",
    "referralExtraLimit",
    "referralLevel",
    "requestedTargetNetReturnRate",
    "requiredRechargePoints",
    "reservedPoints",
    "reversalNetPoints",
    "rewardRequiredPoints",
    "settledStakePoints",
    "station",
    "stationMaster",
    "targetRoundingAdjustmentPoints",
    "totalPurchasePoints",
    "totalQuotaLimit",
    "totalWinningPoints",
    "upgradeCount",
    "upgradeMemberCount",
    "userPurchasePoints",
    "userWinningPoints",
    "validMemberCount",
    "validRate",
    "vipBaseLimit",
    "vipBaseLimitPerMember",
    "vipLevel"
  ],
  routes: [
    {
      path: "/account-recovery",
      component: "AccountRecoveryPage",
      import: "@/features/employee-security/account-recovery-page",
      props: []
    },
    {
      path: "/ai-pools/[poolIssueId]/allocation",
      component: "AiAllocationPage",
      import: "@/features/ai-management/ai-allocation-page",
      props: [
        [
          "poolIssueId",
          "poolIssueId"
        ]
      ]
    },
    {
      path: "/ai-pools/[poolIssueId]",
      component: "AiPoolDetailPage",
      import: "@/features/ai-management/ai-pool-detail-page",
      props: [
        [
          "poolIssueId",
          "poolIssueId"
        ]
      ]
    },
    {
      path: "/ai-pools/[poolIssueId]/payout",
      component: "AiPayoutPage",
      import: "@/features/ai-management/ai-payout-page",
      props: [
        [
          "poolIssueId",
          "poolIssueId"
        ]
      ]
    },
    {
      path: "/ai-pools",
      component: "AiProjectsPage",
      import: "@/features/ai-management/ai-projects-page",
      props: []
    },
    {
      path: "/ai-pools/reports",
      component: "AiReportPage",
      import: "@/features/ai-management/ai-report-page",
      props: []
    },
    {
      path: "/employees",
      component: "EmployeesPage",
      import: "@/features/employee-security/employees-page",
      props: []
    },
    {
      path: "/ledger",
      component: "LedgerPage",
      import: "@/features/ledger-management/ledger-page",
      props: []
    },
    {
      path: "/login",
      component: "AdminLoginPage",
      import: "@/features/employee-security/login-page",
      props: []
    },
    {
      path: "/lottery/catalog",
      component: "CatalogPage",
      import: "@/features/operations/catalog-page",
      props: []
    },
    {
      path: "/lottery/draws",
      component: "DrawReviewPage",
      import: "@/features/operations/draw-review-page",
      props: []
    },
    {
      path: "/lottery/issues",
      component: "IssuesPage",
      import: "@/features/operations/issues-page",
      props: []
    },
    {
      path: "/lottery/omissions",
      component: "OmissionHealthPage",
      import: "@/features/operations/omission-health-page",
      props: []
    },
    {
      path: "/masters/[robotId]/executions",
      component: "RobotExecutionsPage",
      import: "@/features/robots/robot-executions-page",
      props: [
        [
          "robotId",
          "robotId"
        ]
      ]
    },
    {
      path: "/masters/[robotId]",
      component: "RobotDetailPage",
      import: "@/features/robots/robot-detail-page",
      props: [
        [
          "robotId",
          "robotId"
        ]
      ]
    },
    {
      path: "/masters",
      component: "RobotListPage",
      import: "@/features/robots/robot-list-page",
      props: []
    },
    {
      path: "/members/[memberId]",
      component: "MemberDetailPage",
      import: "@/features/member-management/member-detail-page",
      props: [
        [
          "memberId",
          "memberId"
        ]
      ]
    },
    {
      path: "/version-changes",
      component: "VersionChangesPage",
      import: "@/features/change-notes/change-notes",
      props: []
    },
    {
      path: "/members",
      component: "MembersPage",
      import: "@/features/member-management/members-page",
      props: []
    },
    {
      path: "/members/referrals",
      component: "ReferralConfigurationPage",
      import: "@/features/member-management/configuration-pages",
      props: []
    },
    {
      path: "/members/reports",
      component: "MemberReportsPage",
      import: "@/features/member-management/member-reports-page",
      props: []
    },
    {
      path: "/members/vip",
      component: "VipConfigurationPage",
      import: "@/features/member-management/configuration-pages",
      props: []
    },
    {
      path: "/orders/[orderId]",
      component: "OrderDetailPage",
      import: "@/features/order-management/order-detail-page",
      props: [
        [
          "orderId",
          "orderId"
        ]
      ]
    },
    {
      path: "/orders",
      component: "OrdersPage",
      import: "@/features/order-management/orders-page",
      props: []
    },
    {
      path: "/",
      component: "OverviewPage",
      import: "@/features/operations/overview-page",
      props: []
    },
    {
      path: "/stations",
      component: "StationManagementPage",
      import: "@/features/station-management/station-management-page",
      props: []
    }
  ]
};

// src/demo/config-defaults.json
var config_defaults_default = {
  selection: {
    vipLevels: [
      {
        id: "VIP_0",
        levelNo: 0,
        name: "VIP0",
        requiredRechargePoints: "0.00",
        aiPoolBaseDailyLimit: "10.00"
      },
      {
        id: "VIP_1",
        levelNo: 1,
        name: "VIP1",
        requiredRechargePoints: "100.00",
        aiPoolBaseDailyLimit: "20.00"
      },
      {
        id: "VIP_2",
        levelNo: 2,
        name: "VIP2",
        requiredRechargePoints: "500.00",
        aiPoolBaseDailyLimit: "50.00"
      },
      {
        id: "VIP_3",
        levelNo: 3,
        name: "VIP3",
        requiredRechargePoints: "1000.00",
        aiPoolBaseDailyLimit: "100.00"
      },
      {
        id: "VIP_4",
        levelNo: 4,
        name: "VIP4",
        requiredRechargePoints: "3000.00",
        aiPoolBaseDailyLimit: "200.00"
      },
      {
        id: "VIP_5",
        levelNo: 5,
        name: "VIP5",
        requiredRechargePoints: "5000.00",
        aiPoolBaseDailyLimit: "500.00"
      },
      {
        id: "VIP_6",
        levelNo: 6,
        name: "VIP6",
        requiredRechargePoints: "10000.00",
        aiPoolBaseDailyLimit: "1000.00"
      },
      {
        id: "VIP_7",
        levelNo: 7,
        name: "VIP7",
        requiredRechargePoints: "20000.00",
        aiPoolBaseDailyLimit: "2000.00"
      },
      {
        id: "VIP_8",
        levelNo: 8,
        name: "VIP8",
        requiredRechargePoints: "50000.00",
        aiPoolBaseDailyLimit: "5000.00"
      },
      {
        id: "VIP_9",
        levelNo: 9,
        name: "VIP9",
        requiredRechargePoints: "100000.00",
        aiPoolBaseDailyLimit: "10000.00"
      },
      {
        id: "VIP_10",
        levelNo: 10,
        name: "VIP10",
        requiredRechargePoints: "200000.00",
        aiPoolBaseDailyLimit: "20000.00"
      },
      {
        id: "VIP_11",
        levelNo: 11,
        name: "VIP11",
        requiredRechargePoints: "500000.00",
        aiPoolBaseDailyLimit: "50000.00"
      }
    ],
    referralLevels: [
      {
        id: "REFERRAL_0",
        levelNo: 0,
        name: "\u63A8\u5E7F0",
        requiredDirectValidMembers: 0,
        validRechargePoints: "500.00",
        fixedRewardPoints: "0.00",
        directAiShareRate: "0",
        aiExtraDailyLimit: "0.00",
        status: "ENABLED"
      },
      {
        id: "REFERRAL_1",
        levelNo: 1,
        name: "\u63A8\u5E7F1",
        requiredDirectValidMembers: 3,
        validRechargePoints: "500.00",
        fixedRewardPoints: "5.00",
        directAiShareRate: "0.01",
        aiExtraDailyLimit: "10.00",
        status: "ENABLED"
      },
      {
        id: "REFERRAL_2",
        levelNo: 2,
        name: "\u63A8\u5E7F2",
        requiredDirectValidMembers: 6,
        validRechargePoints: "500.00",
        fixedRewardPoints: "10.00",
        directAiShareRate: "0.02",
        aiExtraDailyLimit: "20.00",
        status: "ENABLED"
      },
      {
        id: "REFERRAL_3",
        levelNo: 3,
        name: "\u63A8\u5E7F3",
        requiredDirectValidMembers: 10,
        validRechargePoints: "500.00",
        fixedRewardPoints: "20.00",
        directAiShareRate: "0.03",
        aiExtraDailyLimit: "50.00",
        status: "ENABLED"
      },
      {
        id: "REFERRAL_4",
        levelNo: 4,
        name: "\u63A8\u5E7F4",
        requiredDirectValidMembers: 20,
        validRechargePoints: "500.00",
        fixedRewardPoints: "50.00",
        directAiShareRate: "0.04",
        aiExtraDailyLimit: "100.00",
        status: "ENABLED"
      },
      {
        id: "REFERRAL_5",
        levelNo: 5,
        name: "\u63A8\u5E7F5",
        requiredDirectValidMembers: 50,
        validRechargePoints: "500.00",
        fixedRewardPoints: "100.00",
        directAiShareRate: "0.05",
        aiExtraDailyLimit: "200.00",
        status: "ENABLED"
      },
      {
        id: "REFERRAL_6",
        levelNo: 6,
        name: "\u63A8\u5E7F6",
        requiredDirectValidMembers: 100,
        validRechargePoints: "500.00",
        fixedRewardPoints: "200.00",
        directAiShareRate: "0.06",
        aiExtraDailyLimit: "500.00",
        status: "ENABLED"
      },
      {
        id: "REFERRAL_7",
        levelNo: 7,
        name: "\u63A8\u5E7F7",
        requiredDirectValidMembers: 200,
        validRechargePoints: "500.00",
        fixedRewardPoints: "500.00",
        directAiShareRate: "0.07",
        aiExtraDailyLimit: "1000.00",
        status: "ENABLED"
      },
      {
        id: "REFERRAL_8",
        levelNo: 8,
        name: "\u63A8\u5E7F8",
        requiredDirectValidMembers: 500,
        validRechargePoints: "500.00",
        fixedRewardPoints: "1000.00",
        directAiShareRate: "0.08",
        aiExtraDailyLimit: "2000.00",
        status: "ENABLED"
      },
      {
        id: "REFERRAL_9",
        levelNo: 9,
        name: "\u63A8\u5E7F9",
        requiredDirectValidMembers: 1e3,
        validRechargePoints: "500.00",
        fixedRewardPoints: "2000.00",
        directAiShareRate: "0.1",
        aiExtraDailyLimit: "5000.00",
        status: "ENABLED"
      },
      {
        id: "REFERRAL_10",
        levelNo: 10,
        name: "\u63A8\u5E7F10",
        requiredDirectValidMembers: 2e3,
        validRechargePoints: "500.00",
        fixedRewardPoints: "5000.00",
        directAiShareRate: "0.12",
        aiExtraDailyLimit: "10000.00",
        status: "ENABLED"
      },
      {
        id: "REFERRAL_11",
        levelNo: 11,
        name: "\u63A8\u5E7F11",
        requiredDirectValidMembers: 5e3,
        validRechargePoints: "500.00",
        fixedRewardPoints: "10000.00",
        directAiShareRate: "0.15",
        aiExtraDailyLimit: "20000.00",
        status: "ENABLED"
      }
    ],
    baseVipId: "VIP_0",
    baseReferralId: "REFERRAL_0",
    editableWholeTables: true,
    allowAddDeleteRows: true,
    preserveBaseLevelAndHistory: true
  }
};

// src/demo/seed.ts
var STAMP = "2026-10-03T02:00:00+08:00";
var EMPLOYEE = "demo-employee-001";
var AUTHOR = "demo-employee-002";
var make = (group, type, props = {}) => {
  const row = { ...structuredClone(templates_default[group][type]), ...props };
  if (type === "DrawCandidate" || type === "DrawVersion") {
    row.areas = props.numbers?.areas || row.areas;
    row.numbers = { areas: row.areas };
  }
  return row;
};
var ref = (row) => ({ id: row.id, code: row.code || row.account, name: row.name || row.displayName });
var points = (n) => n.toFixed(2);
var uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;
var page = (items) => ({ items, nextCursor: null, hasMore: false, snapshotId: "demo-snapshot-1" });
function areasFor(code) {
  const area = (key, chosen) => ({ key, chosen, dan: [], tuo: [] });
  if (code === "SSQ") return [area("RED", [3, 8, 12, 18, 25, 31]), area("BLUE", [9])];
  if (code === "DLT") return [area("FRONT", [5, 12, 18, 26, 32]), area("BACK", [3, 9])];
  if (code === "QLC") return [area("BASIC", [2, 5, 9, 13, 17, 23, 29]), area("SPECIAL", [11])];
  if (code === "KL8") return [area("MAIN", Array.from({ length: 20 }, (_, i) => i * 4 + 1))];
  return Array.from({ length: code === "PL5" ? 5 : code === "QXC" ? 7 : 3 }, (_, i) => area(code === "QXC" && i === 6 ? "LAST" : `P${i + 1}`, [(i * 3 + 2) % 10]));
}
function selectionFor(code) {
  return { schemaId: `${code}_STANDARD`, schemaVersion: "1", mode: ["FC3D", "PL3", "PL5", "QXC"].includes(code) ? "POSITIONAL" : "SINGLE", areas: areasFor(code) };
}
function combinationsFor(poolId) {
  return Array.from({ length: 50 }, (_, i) => make("ai-management", "FixedCombination", {
    id: `${poolId}-group-${i + 1}`,
    sequenceNo: i + 1,
    selection: selectionFor("FC3D"),
    selectionHash: `selection-${i + 1}`,
    numberCodes: Array.from({ length: 20 }, (_2, j) => String(i * 20 + j).padStart(3, "0")),
    groupHash: `group-${i + 1}`,
    baseBetCount: "20",
    baseCostPoints: "40.00",
    generatedAt: STAMP
  }));
}
function allocationFor(pool2, version = "1", target = 10) {
  const total = Number(pool2.totalPurchasePoints) * (1 + target / 100);
  return make("ai-management", "Allocation", {
    id: `allocation-${pool2.id}-${version}`,
    poolIssueId: pool2.id,
    version,
    status: "SOLVED",
    confirmationStatus: "PENDING_CONFIRMATION",
    ruleSetCode: "FC3D_50X20_POST_DRAW_V3",
    algorithmVersion: "FC3D-V3",
    inputVersionSetHash: `inputs-${pool2.id}`,
    drawVersion: "1",
    ruleVersion: "FORMAL-20260919-V1",
    simulationPolicyVersion: "1",
    items: combinationsFor(pool2.id).map((g, i) => make("ai-management", "AllocationItem", { combinationId: g.id, sequenceNo: i + 1, allocatedPoints: points(Number(pool2.totalPurchasePoints) / 50), multiplier: "1", allocationRatio: "0.02", awardCodes: i === 12 ? ["STRAIGHT"] : [], winningPoints: i === 12 ? points(total) : "0.00" })),
    totalPurchasePoints: pool2.totalPurchasePoints,
    totalWinningPoints: points(total),
    userWinningPoints: points(Number(pool2.userPurchasePoints) * (1 + target / 100)),
    platformWinningPoints: points(Number(pool2.platformPoints) * (1 + target / 100)),
    requestedTargetNetReturnPercent: target,
    actualNetReturnRate: String(target / 100),
    differencePercentagePoints: "0.00",
    withinTolerance: true,
    rewardRequiredPoints: points(total),
    winningNumberCode: "258",
    winningGroupSequenceNo: 13,
    initialOfficialPoints: pool2.initialOfficialPoints,
    userPurchasePoints: pool2.userPurchasePoints,
    incrementTotalPoints: "600.00",
    platformIncrementBasePoints: "500.00",
    rawTotalPoints: pool2.totalPurchasePoints,
    officialContributionPoints: pool2.platformPoints,
    maxOfficialContributionPoints: pool2.maxOfficialContributionPoints,
    officialContributionWithinLimit: true,
    rewardBudgetLimitPoints: pool2.rewardBudgetLimitPoints,
    rewardBudgetWithinLimit: true
  });
}
function createSeed() {
  const lotteries = structuredClone(catalog_default.lotteries);
  const stations = Array.from({ length: 3 }, (_, i) => make("station-management", "Station", { id: `demo-station-${i + 1}`, code: `ST00${i + 1}`, name: ["\u534E\u4E1C\u8FD0\u8425\u7AD9", "\u534E\u5357\u8FD0\u8425\u7AD9", "\u897F\u5357\u8FD0\u8425\u7AD9"][i], regionLabel: ["\u4E0A\u6D77", "\u5E7F\u5DDE", "\u6210\u90FD"][i], status: "ENABLED", remark: "\u6F14\u793A\u7AD9\u70B9", stationMasterCount: 2, memberCount: 4, version: "1" }));
  const stationMasters = Array.from({ length: 6 }, (_, i) => make("station-management", "StationMaster", { id: `demo-station-master-${i + 1}`, code: `SM00${i + 1}`, userId: `demo-station-user-${i + 1}`, name: `\u6F14\u793A\u7AD9\u957F${i + 1}`, account: `station_demo_${i + 1}`, station: ref(stations[i % 3]), status: "ENABLED", limits: { singleGrantLimit: "10000.00", singleDeductLimit: "5000.00", dailyOperationLimit: "50000.00" }, remark: "\u6F14\u793A\u7AD9\u957F", disposablePoints: points(5e4 + i * 1e3), operationCredentialConfigured: true, memberCount: 2, grantedMemberPoints: "12000.00", deductedMemberPoints: "200.00", identityVersion: "1", version: "1" }));
  const members = Array.from({ length: 12 }, (_, i) => make("member-management", "MemberAdmin", {
    id: `demo-member-${i + 1}`,
    account: `member_demo_${String(i + 1).padStart(2, "0")}`,
    displayName: `\u6F14\u793A\u4F1A\u5458${String(i + 1).padStart(2, "0")}`,
    status: i === 11 ? "DISABLED" : "ENABLED",
    scope: { station: ref(stations[i % 3]), stationMaster: ref(stationMasters[i % 6]), referrerMember: i > 0 ? { id: "demo-member-1", code: "member_demo_01", name: "\u6F14\u793A\u4F1A\u545801" } : null, version: "1" },
    qualifiedRechargePoints: points(2e3 + i * 1e3),
    stationDeductedPoints: "100.00",
    wallet: { availablePoints: points(1800 + i * 810), reservedPoints: "200.00", asOf: STAMP, ledgerWatermark: "demo-ledger-1" },
    vipName: `VIP${i % 6}`,
    referralName: config_defaults_default.selection.referralLevels[i % 4].name,
    quota: { businessDate: "2026-10-03", timeZone: "Asia/Shanghai", vipBaseLimit: "1000.00", referralExtraLimit: "200.00", totalLimit: "1200.00", usedPoints: "100.00", remainingPoints: "1100.00", eligibilityStatus: "READY", qualificationVersion: "1", vipConfigVersion: "1", referralConfigVersion: "1", asOf: STAMP },
    totalBetPoints: points(500 + i * 100),
    netProfitPoints: points(50 + i * 20),
    aiDividendPoints: points(100 + i * 10),
    totalReferralPoints: points(i === 0 ? 550 : 50),
    inviteCode: `DEMO${String(i + 1).padStart(6, "0")}`,
    directMemberCount: i === 0 ? 11 : 0,
    directMemberAvailableTotal: i === 0 ? "73260.00" : "0.00",
    version: "1"
  }));
  const strategyNames = ["\u5747\u8861", "\u8D8B\u52BF", "\u51B7\u70ED\u6DF7\u5408", "\u964D\u6743\u8FC7\u6EE4", "\u591A\u6A21\u578B\u7EC4\u5408", "\u63A2\u7D22"];
  const strategyCodes2 = ["BALANCED", "TREND_FOLLOWING", "HOT_COLD_MIX", "ELIMINATION", "ENSEMBLE", "EXPLORATION"];
  const strategies = strategyCodes2.map((code, i) => make("robots", "StrategyDefinition", { code, label: `${strategyNames[i]}\u7B56\u7565`, description: `\u57FA\u4E8E\u5386\u53F2\u5F00\u5956\u7684${strategyNames[i]}\u7EDF\u8BA1\u7B56\u7565`, schemaRef: `${code}-V1`, defaultConfig: { code, common: { shortWindow: 10, mediumWindow: 30, longWindow: 100, maxGroupsPerPlay: 5, candidateMultiplier: 4, minRecommendationScore: 60, maxPointsPerIssue: "200.00", explorationRate: "0.10", minDiversityRate: "0.30", maxRerunsPerIssue: 3, weights: [{ feature: "STRUCTURE", basisPoints: 5e3 }, { feature: "OMISSION", basisPoints: 5e3 }] }, maxTrendNumbers: 3, trendThreshold: 60, hotBasisPoints: 3e3, warmBasisPoints: 3e3, normalBasisPoints: 2e3, coldBasisPoints: 2e3, hardEliminationEnabled: false, maxEliminationRate: "0.20", agreementWeightBasisPoints: 5e3 } }));
  const robots = meta_default.avatars.map((avatar, i) => {
    const lottery = lotteries.find((l2) => avatar.name.startsWith(l2.name)) || lotteries[i % 8];
    const index = strategyNames.findIndex((s) => avatar.name.includes(s));
    const strategy = strategies[Math.max(index, 0)];
    return make("robots", "RobotAdmin", { robot: make("robots", "RobotPublic", { ...avatar, strategyCode: strategy.code, strategyLabel: strategy.label, strategyDescription: strategy.description, lotteryIds: [lottery.id], performance: { settledGroups: "180", hitGroups: "56", hitRate: "0.3111", asOf: STAMP }, currentGroups: "5", recommendationScore: 82.5, scoreLabel: "\u63A8\u8350\u8BC4\u5206" }), status: "ENABLED", strategy: structuredClone(strategy.defaultConfig), strategyVersion: "1", generationMode: "PER_ISSUE", generationTime: "18:00", currentLotteryCount: "1", currentPlayCount: String(lottery.plays.length), currentBetCount: "5", currentPricePoints: "10.00", latestExecutionAt: STAMP, version: "1" });
  });
  const issues = lotteries.flatMap((l2) => Array.from({ length: 12 }, (_, i) => make("operations", "AdminIssue", { id: `issue-${l2.code}-${261 - i}`, lotteryId: l2.id, issueCode: `2026${261 - i}`, officialIssueCode: `2026${261 - i}`, status: i === 0 ? "OPEN" : "DRAWN", openAt: `2026-10-${String(3 - Math.min(i, 2)).padStart(2, "0")}T00:00:00+08:00`, cutoffAt: "2026-10-03T20:00:00+08:00", drawAt: "2026-10-03T21:15:00+08:00", drawDate: "2026-10-03", version: "1" })));
  const health = lotteries.map((l2, i) => make("operations", "DataHealthItem", { lotteryId: l2.id, latestConfirmedIssue: "2026260", drawVersion: "1", omissionGeneration: "demo-generation-1", drawVersionSetHash: "demo-draw-hash", gapCount: i === 5 ? 1 : 0, acknowledgedGapCount: 0, projectionLag: 0, pendingTaskCount: 0, status: i === 5 ? "DEGRADED" : "READY" }));
  const candidates = issues.filter((i) => i.issueCode === "2026261").map((issue) => make("operations", "DrawCandidate", { id: `candidate-${issue.lotteryId}`, lotteryId: issue.lotteryId, issueCode: issue.issueCode, areas: areasFor(lotteries.find((l2) => l2.id === issue.lotteryId).code), source: "MANUAL", status: "PENDING_REVIEW", evidenceIds: ["demo-evidence-draw"], authorId: AUTHOR, version: "1", createdAt: STAMP }));
  const drawVersions = issues.filter((i) => i.status === "DRAWN").map((issue) => make("operations", "DrawVersion", { lotteryId: issue.lotteryId, lotteryCode: lotteries.find((l2) => l2.id === issue.lotteryId).code, issueCode: issue.issueCode, version: "1", status: "CONFIRMED", source: "SYSTEM", areas: areasFor(lotteries.find((l2) => l2.id === issue.lotteryId).code), confirmedAt: STAMP, prizeReferenceStatus: "FINAL" }));
  const rules = lotteries.flatMap((l2) => l2.plays.map((p) => make("operations", "RuleDraft", { id: `rule-${p.id}`, playId: p.id, version: "FORMAL-20260919-V1", recordVersion: "1", status: "APPROVED", authorId: AUTHOR, artifactHash: "demo-rule-artifact", effectiveFromIssue: "2026245" })));
  rules.push(make("operations", "RuleDraft", { id: "demo-rule-pending", playId: lotteries[0].plays[0].id, version: "DEMO-DRAFT-2", recordVersion: "2", status: "PENDING_REVIEW", authorId: AUTHOR, artifactHash: "demo-rule-draft", effectiveFromIssue: "2026270" }));
  const policies = ["SIMULATION_AWARD", "REFERRAL_FIXED", "REFERRAL_AI_SHARE"].map((code, i) => make("operations", "PolicyView", { id: `policy-${i + 1}`, code, version: "1", recordVersion: "1", status: "APPROVED", artifactId: `demo-policy-artifact-${i + 1}`, artifactHash: "demo-policy-hash", decisionIds: [`D0${i === 0 ? 2 : i === 1 ? 6 : 7}`], authorId: AUTHOR, createdAt: STAMP }));
  const fc3d = lotteries.find((l2) => l2.code === "FC3D");
  const settings = { effectiveDate: "2026-10-01", timeZone: "Asia/Shanghai", cutoffOffsetMinutes: 5, endDate: null, settlementMode: "MANUAL", initialOfficialPoints: "2000.00", userIncrementRatioBps: 1e3, defaultTargetNetReturnPercent: 10, maxOfficialContributionPoints: "100000.00", rewardBudgetLimitPoints: "1000000.00" };
  const projects = [make("ai-management", "AiProject", { id: "demo-project-1", code: "FC3D-AI-001", name: "\u798F\u5F693D AI \u5408\u4E70", lotteryId: fc3d.id, playId: fc3d.plays[0].id, status: "ENABLED", activeConfigVersion: "1", latestPoolIssueId: "demo-pool-1", version: "1", drawSchedule: { issueCode: "2026261", drawAt: "2026-10-03T21:15:00+08:00" } })];
  const configs = [make("ai-management", "AiProjectConfig", { projectId: projects[0].id, version: "1", settings, authorId: AUTHOR, createdAt: STAMP })];
  const pools = ["OPEN", "ALLOCATION_PENDING", "DISCLOSED", "SETTLED", "EXCEPTION_PENDING"].map((status, i) => make("ai-management", "AiPool", { id: `demo-pool-${i + 1}`, projectId: projects[0].id, lotteryId: fc3d.id, playId: fc3d.plays[0].id, issueCode: `2026${261 - i}`, ruleSetCode: "FC3D_50X20_POST_DRAW_V3", status, cutoffAt: "2026-10-03T21:10:00+08:00", generatedAt: STAMP, groupCount: 50, configVersion: "1", ...settings, actualUserShare: "0.3333", userPurchasePoints: "1000.00", platformPoints: "2000.00", rawTotalPoints: "3000.00", alignmentPoints: "0.00", totalPurchasePoints: "3000.00", participantCount: 10, totalWinningPoints: i > 1 ? "3300.00" : null, userWinningPoints: i > 1 ? "1100.00" : null, numbersDisclosed: i > 1, disclosureVersion: i > 1 ? "1" : null, version: "1" }));
  const allocations = pools.filter((_, i) => i > 0).map((p, i) => ({ ...allocationFor(p), confirmationStatus: i > 0 ? "CONFIRMED" : "PENDING_CONFIRMATION" }));
  const orders = members.flatMap((member2, i) => [0, 1].map((k) => {
    const l2 = lotteries[(i + k) % 8];
    const id = `demo-order-${i * 2 + k + 1}`;
    return make("order-management", "AdminOrder", { id, type: "ORDINARY", lotteryId: l2.id, playId: l2.plays[0].id, issueCode: "2026260", selection: selectionFor(l2.code), status: i === 0 && k === 0 ? "AWARD_PENDING_BUDGET" : k === 0 ? "SETTLED" : "WAITING_DRAW", purchasePoints: "20.00", dueAwardPoints: k === 0 ? "50.00" : null, netPostedAwardPoints: i === 0 ? "0.00" : k === 0 ? "50.00" : "0.00", refundPoints: "0.00", settlementVersion: k === 0 ? "1" : null, createdAt: STAMP, detailUrl: `/orders/${id}`, memberId: member2.id, stationId: member2.scope.station.id, stationMasterId: member2.scope.stationMaster.id });
  }));
  const ledgers = members.map((member2, i) => make("ledger-management", "AdminLedgerTransaction", {
    id: `demo-transaction-${i + 1}`,
    sequence: String(1001 + i),
    businessNumber: `PT2026100300${i + 1}`,
    assetType: "POINTS",
    sourceType: "STATION_ADJUSTMENT",
    sourceId: member2.id,
    type: "STATION_VIP_CREDIT",
    status: "POSTED",
    economicPoints: "1000.00",
    reversedPoints: "0.00",
    stationId: member2.scope.station.id,
    stationCode: member2.scope.station.code,
    stationName: member2.scope.station.name,
    stationMasterId: member2.scope.stationMaster.id,
    stationMasterCode: member2.scope.stationMaster.code,
    stationMasterName: member2.scope.stationMaster.name,
    memberId: member2.id,
    operatorRealm: "ADMIN",
    operatorId: AUTHOR,
    reason: "\u6F14\u793A\u79EF\u5206\u62E8\u4ED8",
    createdAt: STAMP,
    entries: ["DEBIT", "CREDIT"].map((direction, j) => make("ledger-management", "AdminLedgerEntry", { id: `entry-${i}-${j}`, entryNo: j + 1, accountId: `demo-account-${i}-${j}`, ownerType: j ? "MEMBER" : "STATION_MASTER", ownerId: j ? member2.id : member2.scope.stationMaster.id, ownerAccount: j ? member2.account : "station_demo", ownerName: j ? member2.displayName : member2.scope.stationMaster.name, bucket: j ? "AVAILABLE" : "DISPOSABLE", direction, changePoints: j ? "1000.00" : "-1000.00", balanceBefore: j ? "800.00" : "51000.00", balanceAfter: j ? "1800.00" : "50000.00" }))
  }));
  return {
    schemaVersion: 2,
    auth: true,
    identity: { employeeId: EMPLOYEE, account: "demo_admin \xB7 \u6F14\u793A", permissions: meta_default.permissions, scopeStationIds: [], expiresAt: "2099-01-01T00:00:00Z", mfaVerifiedAt: STAMP, mfaEnrolled: true },
    catalog: { ...catalog_default, lotteries },
    stations,
    stationMasters,
    members,
    strategies,
    robots,
    issues,
    health,
    candidates,
    drawVersions,
    rules,
    policies,
    projects,
    configs,
    pools,
    allocations,
    orders,
    ledgers,
    sources: [make("operations", "SourceHealthItem", { id: "demo-source-1", name: "\u5B98\u65B9\u5F00\u5956\u6765\u6E90\uFF08\u6F14\u793A\uFF09", lotteryIds: lotteries.map((l2) => l2.id), status: "APPROVED", lastSuccessAt: STAMP })],
    gaps: [{ lotteryId: lotteries[5].id, beforeIssueCode: "2026257", afterIssueCode: "2026259", acknowledged: false, acknowledgementId: null, reason: null, acknowledgedBy: null, acknowledgedAt: null }],
    vip: make("member-management", "VipConfig", { version: "1", qualificationStatus: "READY", createdAt: STAMP, levels: structuredClone(config_defaults_default.selection.vipLevels) }),
    vipHistory: [],
    referral: make("member-management", "ReferralConfig", { version: "1", qualificationStatus: "READY", fixedRewardPolicyVersion: "1", aiSharePolicyVersion: "1", levels: structuredClone(config_defaults_default.selection.referralLevels) }),
    referralHistory: [],
    budgets: ["DISTRIBUTION_BUDGET", "ORDINARY_AWARD_BUDGET", "AI_BUDGET", "REFERRAL_BUDGET"].map((type, i) => make("ledger-management", "BudgetAccount", { id: `demo-budget-${i + 1}`, type, availablePoints: "999999999.00", reservedPoints: "0.00", version: "1" })),
    budgetBatches: [{ id: "demo-budget-batch-1", category: "DISTRIBUTION_BUDGET", kind: "TOPUP", points: "50000.00", sourceReference: "DEMO-20261003", reason: "\u6F14\u793A\u8FFD\u52A0\u9884\u7B97", authorId: AUTHOR, status: "PENDING_REVIEW", reviewedBy: null, reviewReason: null, transactionId: null, createdAt: STAMP }],
    employees: [{ id: EMPLOYEE, account: "demo_admin", name: "\u6F14\u793A\u7BA1\u7406\u5458", status: "ENABLED", roleIds: ["demo-role-admin"], scopeStationIds: [], version: "1" }, { id: AUTHOR, account: "demo_operator", name: "\u6F14\u793A\u8FD0\u8425\u5458", status: "ENABLED", roleIds: ["demo-role-operator"], scopeStationIds: [], version: "1" }],
    roles: [{ id: "demo-role-admin", name: "\u5168\u5C40\u7BA1\u7406\u5458", permissions: meta_default.permissions }, { id: "demo-role-operator", name: "\u8FD0\u8425\u4E13\u5458", permissions: meta_default.permissions.filter((p) => !p.includes("approve")) }],
    audits: [make("employee-security", "AuditView", { id: "demo-audit-1", actorId: AUTHOR, operationId: "createStation", resourceId: stations[0].id, reason: "\u521D\u59CB\u5316\u6F14\u793A\u7AD9\u70B9", beforeVersion: null, afterVersion: "1", resultCode: "COMPLETED", createdAt: STAMP, traceId: "demo-trace-1" })],
    decisions: ["\u6700\u7EC8\u73A9\u6CD5\u76EE\u5F55", "\u6B63\u5F0F\u79EF\u5206\u8FD4\u5956", "\u52A8\u6001\u8D44\u91D1\u603B\u989D", "\u76EE\u6807\u6536\u76CA\u7387", "\u8BA1\u7B97\u5F02\u5E38\u5904\u7F6E", "\u56FA\u5B9A\u5956\u52B1\u89E6\u53D1", "AI \u5206\u7EA2\u57FA\u6570", "\u9ED8\u8BA4\u7B49\u7EA7\u521D\u503C"].map((topic, i) => ({ decisionId: `D0${i + 1}`, topic, status: "APPROVED", selectedOption: "\u6F14\u793A\u9009\u62E9", policyVersion: "1" })),
    proposals: [{ id: "demo-proposal-1", decisionId: "D08", baseRecordVersion: 1, selectedOption: "\u6F14\u793A\u9ED8\u8BA4\u7B49\u7EA7", applicableScope: "\u5168\u5C40", policyVersion: "DEMO-2", artifactId: "demo-artifact", artifactHash: "demo-hash", authorId: AUTHOR, reason: "\u6F14\u793A\u4E1A\u52A1\u9009\u62E9\u590D\u6838", status: "PENDING_REVIEW", reviewedBy: null, reviewReason: null, reviewedAt: null, createdAt: STAMP }],
    tasks: {},
    commands: {},
    exports: {},
    uploads: {},
    payouts: [make("ai-management", "PayoutBatch", { id: "demo-payout-settled", poolIssueId: "demo-pool-4", status: "COMPLETED", expectedPoints: "1100.00", postedPoints: "1100.00", pendingPoints: "0.00", differencePoints: "0.00", inputVersionSetHash: "inputs-demo-pool-4", completedItemCount: 10, totalItemCount: 10, updatedAt: STAMP })],
    reconciliations: {},
    recommendations: {},
    executions: {},
    preparations: {}
  };
}

// src/demo/member-metrics.ts
var cents = (value) => Math.round(Number(value) * 100);
var points2 = (value) => (value / 100).toFixed(2);
function refreshMemberMetrics(members, ledgers = []) {
  for (const [index, member2] of members.entries()) {
    member2.aiDividendPoints ??= points2(ledgers.filter((tx) => tx.memberId === member2.id && tx.type === "AI_AWARD").reduce((sum, tx) => sum + cents(tx.economicPoints) - cents(tx.reversedPoints || "0.00"), 0));
    member2.totalReferralPoints ??= "0.00";
    member2.inviteCode ??= `DEMO${String(index + 1).padStart(6, "0")}`;
    member2.wallet.availablePoints = points2(
      cents(member2.qualifiedRechargePoints) + cents(member2.totalReferralPoints) + cents(member2.netProfitPoints) + cents(member2.aiDividendPoints) - cents(member2.stationDeductedPoints)
    );
    member2.quota.remainingPoints = points2(cents(member2.quota.totalLimit) - cents(member2.quota.usedPoints));
  }
  const children = /* @__PURE__ */ new Map();
  for (const member2 of members) {
    const parentId = member2.scope.referrerMember?.id;
    if (parentId && parentId !== member2.id) {
      const direct = children.get(parentId) ?? [];
      direct.push(member2);
      children.set(parentId, direct);
    }
  }
  for (const member2 of members) {
    const direct = children.get(member2.id) ?? [];
    const descendants = [];
    const queue = [...direct];
    const visited = /* @__PURE__ */ new Set([member2.id]);
    for (let index = 0; index < queue.length; index++) {
      const child = queue[index];
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      descendants.push(child);
      queue.push(...children.get(child.id) ?? []);
    }
    member2.directMemberCount = direct.length;
    member2.directMemberAvailableTotal = points2(direct.reduce((sum, child) => sum + cents(child.wallet.availablePoints), 0));
    member2.descendantMemberCount = descendants.length;
    member2.descendantMemberAvailableTotal = points2(descendants.reduce((sum, child) => sum + cents(child.wallet.availablePoints), 0));
  }
}

// src/demo/state.ts
var STORAGE_KEY = "piao666-admin-prototype-v1";
function initial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.schemaVersion === 2) return parsed;
    }
  } catch {
  }
  return createSeed();
}
var state = initial();
refreshMemberMetrics(state.members, state.ledgers);
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}
function fail(code, message, status = 400) {
  throw new ApiError({ type: "about:blank", title: message, code, status, requestId: "demo", traceId: "demo", retryable: false }, null, "REJECTED");
}
function find(rows, id) {
  const row = rows.find((x) => (x.id || x.robot?.id) === id);
  return row || fail("NOT_FOUND", "\u6F14\u793A\u8BB0\u5F55\u4E0D\u5B58\u5728", 404);
}
function update(row, props) {
  Object.assign(row, props, { version: String(Number(row.version || 0) + 1) });
  return row;
}
function filtered(rows, q = {}) {
  return rows.filter((row) => {
    const item = row.robot ? { ...row, ...row.robot } : row;
    if (q.vipLevelId && item.vipName !== state.vip.levels.find((l2) => l2.id === q.vipLevelId)?.name) return false;
    if (q.referralLevelId && item.referralName !== state.referral.levels.find((l2) => l2.id === q.referralLevelId)?.name) return false;
    if (q.drawFrom && item.drawDate < q.drawFrom) return false;
    if (q.drawTo && item.drawDate > q.drawTo) return false;
    for (const key of ["status", "lotteryId", "projectId", "memberId", "stationId", "stationMasterId", "issueCode", "strategyCode", "type", "sourceType", "actorId", "operationId", "resourceId"]) {
      if (!q[key]) continue;
      const actual = item[key] ?? (key === "stationId" ? item.station?.id || item.scope?.station?.id : key === "stationMasterId" ? item.scope?.stationMaster?.id : null);
      if (key === "lotteryId" && item.lotteryIds) {
        if (!item.lotteryIds.includes(q[key])) return false;
      } else if (actual !== q[key]) return false;
    }
    const keyword = q.keyword || q.account || q.search || q.businessNumber || q.stationMaster;
    if (keyword && !JSON.stringify(item).toLowerCase().includes(String(keyword).toLowerCase())) return false;
    if (q.assetType && item.assetType !== q.assetType) return false;
    if (q.direction && !item.entries?.some((e) => e.direction === q.direction && (!q.account || JSON.stringify(e).includes(q.account)))) return false;
    const date = item.createdAt;
    if (date) {
      const time = new Date(date).getTime();
      const start = q.from ? new Date(q.from.length === 10 ? q.from + "T00:00:00+08:00" : q.from).getTime() : -Infinity;
      const end = q.to ? new Date(q.to.length === 10 ? q.to + "T23:59:59+08:00" : q.to).getTime() : Infinity;
      if (time < start || time > end) return false;
    }
    return true;
  });
}
function paged(rows, q = {}) {
  const items = filtered(rows, q);
  const start = Number(q.cursor || 0), limit = Number(q.limit || 50);
  return { ...page(items.slice(start, start + limit)), totalCount: items.length, hasMore: start + limit < items.length, nextCursor: start + limit < items.length ? String(start + limit) : null };
}
function receipt(operationId, resourceId) {
  return { commandId: uid("command"), operationId, resourceId, status: "COMPLETED", createdAt: STAMP };
}
function task(taskType, resultUrl = null) {
  const id = uid("task");
  const status = { id, taskType, status: "SUCCEEDED", progress: 1, resultUrl, resultCode: "COMPLETED", failureCode: null, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  state.tasks[id] = status;
  return { taskId: id, status: "PENDING", statusUrl: resultUrl || `/api/admin/v1/tasks/${id}`, pollAfterSeconds: 1 };
}
function audit(path, body) {
  state.audits.unshift(make("employee-security", "AuditView", { id: uid("audit"), actorId: state.identity.employeeId, operationId: path.split("/").filter(Boolean).slice(-1)[0], resourceId: body.resourceId || path.split("/").slice(-2, -1)[0] || "demo", reason: body.reason || "\u6F14\u793A\u64CD\u4F5C", beforeVersion: "1", afterVersion: "2", resultCode: "COMPLETED", createdAt: (/* @__PURE__ */ new Date()).toISOString(), traceId: uid("trace") }));
}
function localLedger(master2, amount, reason, member2) {
  const before = Number(master2.disposablePoints);
  master2.disposablePoints = points(before + amount);
  const id = uid("demo-transaction");
  const tx = make("ledger-management", "AdminLedgerTransaction", {
    id,
    sequence: String(1e3 + state.ledgers.length),
    businessNumber: `DEMO${state.ledgers.length + 1}`,
    type: amount >= 0 ? "ADMIN_GRANT" : "ADMIN_DEDUCT",
    sourceType: "ADMIN_ADJUSTMENT",
    sourceId: master2.id,
    status: "POSTED",
    economicPoints: points(Math.abs(amount)),
    reversedPoints: "0.00",
    stationId: master2.station.id,
    stationCode: master2.station.code,
    stationName: master2.station.name,
    stationMasterId: master2.id,
    stationMasterCode: master2.code,
    stationMasterName: master2.name,
    memberId: member2?.id || null,
    operatorRealm: "ADMIN",
    operatorId: EMPLOYEE,
    reason,
    createdAt: STAMP,
    entries: [make("ledger-management", "AdminLedgerEntry", { id: uid("entry"), entryNo: 1, accountId: master2.id, ownerType: "STATION_MASTER", ownerId: master2.id, ownerAccount: master2.account, ownerName: master2.name, bucket: "DISPOSABLE", direction: amount >= 0 ? "CREDIT" : "DEBIT", changePoints: points(amount), balanceBefore: points(before), balanceAfter: master2.disposablePoints }), make("ledger-management", "AdminLedgerEntry", { id: uid("entry"), entryNo: 2, accountId: "demo-budget-1", ownerType: "PLATFORM", ownerId: "demo-platform", bucket: "AVAILABLE", direction: amount >= 0 ? "DEBIT" : "CREDIT", changePoints: points(-amount), balanceBefore: state.budgets[0].availablePoints, balanceAfter: points(Number(state.budgets[0].availablePoints) - amount) })]
  });
  state.ledgers.unshift(tx);
  state.budgets[0].availablePoints = points(Number(state.budgets[0].availablePoints) - amount);
  return make("station-management", "PointChangeReceipt", { transactionId: id, operationType: tx.type, points: points(Math.abs(amount)), stationMasterId: master2.id, stationMasterBalanceBefore: points(before), stationMasterBalanceAfter: master2.disposablePoints, createdAt: STAMP });
}
function ledgerViews(q = {}) {
  return filtered(state.ledgers, q).map((tx) => {
    const entry = tx.entries.find((e) => q.memberId ? e.ownerId === q.memberId : e.ownerType === "STATION_MASTER") || tx.entries[0];
    return make("member-management", "LedgerView", { id: entry.id, transactionId: tx.id, type: tx.type, bucket: entry.bucket, changePoints: entry.changePoints, balanceBefore: entry.balanceBefore, balanceAfter: entry.balanceAfter, sourceType: tx.sourceType, sourceId: tx.sourceId, remark: tx.reason, createdAt: tx.createdAt });
  });
}
function creditDemoMember(memberId, amount, context) {
  const member2 = find(state.members, memberId), budget = find(state.budgets, context.budgetId), id = uid("demo-transaction");
  const before = Number(member2.wallet.availablePoints), budgetBefore = Number(budget.availablePoints);
  const metric = context.type === "AI_AWARD" ? "aiDividendPoints" : "netProfitPoints";
  member2[metric] = points(Number(member2[metric]) + amount);
  member2.wallet.availablePoints = points(before + amount);
  budget.availablePoints = points(budgetBefore - amount);
  state.ledgers.unshift(make("ledger-management", "AdminLedgerTransaction", {
    id,
    sequence: String(1001 + state.ledgers.length),
    businessNumber: `DEMO${state.ledgers.length + 1}`,
    assetType: "POINTS",
    status: "POSTED",
    type: context.type,
    sourceType: context.sourceType,
    sourceId: context.sourceId,
    issueCode: context.issueCode,
    economicPoints: points(amount),
    reversedPoints: "0.00",
    stationId: member2.scope.station.id,
    stationCode: member2.scope.station.code,
    stationName: member2.scope.station.name,
    stationMasterId: member2.scope.stationMaster.id,
    stationMasterCode: member2.scope.stationMaster.code,
    stationMasterName: member2.scope.stationMaster.name,
    memberId,
    operatorRealm: "ADMIN",
    operatorId: state.identity.employeeId,
    reason: context.reason || "\u672C\u5730\u6F14\u793A\u53D1\u653E",
    createdAt: STAMP,
    entries: [
      make("ledger-management", "AdminLedgerEntry", { id: uid("entry"), entryNo: 1, accountId: budget.id, ownerType: "PLATFORM", ownerId: "demo-platform", ownerName: "\u5E73\u53F0\u6F14\u793A\u9884\u7B97", bucket: "AVAILABLE", direction: "DEBIT", changePoints: points(-amount), balanceBefore: points(budgetBefore), balanceAfter: budget.availablePoints }),
      make("ledger-management", "AdminLedgerEntry", { id: uid("entry"), entryNo: 2, accountId: member2.id, ownerType: "MEMBER", ownerId: member2.id, ownerAccount: member2.account, ownerName: member2.displayName, bucket: "AVAILABLE", direction: "CREDIT", changePoints: points(amount), balanceBefore: points(before), balanceAfter: member2.wallet.availablePoints })
    ]
  }));
  return id;
}

// src/demo/lottery.ts
function lotteryAction(path, method, b, q) {
  if (path === "/catalog") return structuredClone(state.catalog);
  let m = path.match(/^\/lotteries\/([^/]+)\/issues(?:\/([^/]+)\/([^/]+))?$/);
  if (m) {
    const [, lotteryId, issueCode, action] = m;
    if (!action) return paged(state.issues, { ...q, lotteryId });
    const lottery = find(state.catalog.lotteries, lotteryId);
    if (action === "draw-fetches") {
      if (!state.candidates.some((c) => c.lotteryId === lotteryId && c.issueCode === issueCode)) state.candidates.push(make("operations", "DrawCandidate", { id: uid("candidate"), lotteryId, issueCode, areas: areasFor(lottery.code), source: "SYSTEM", status: "PENDING_REVIEW", evidenceIds: ["demo-evidence"], authorId: "demo-source", version: "1", createdAt: STAMP }));
      return task("DRAW_FETCH");
    }
    if (action === "draw-candidates") {
      if (method === "GET") return paged(state.candidates, { ...q, lotteryId, issueCode });
      const row = make("operations", "DrawCandidate", { ...b, id: uid("candidate"), lotteryId, issueCode, status: "PENDING_REVIEW", source: "MANUAL", authorId: state.identity.employeeId, version: "1", createdAt: STAMP });
      state.candidates.unshift(row);
      return row;
    }
    if (action === "draw-versions") return paged(state.drawVersions, { ...q, lotteryId, issueCode });
  }
  m = path.match(/^\/plays\/([^/]+)\/rules$/);
  if (m) {
    const play = state.catalog.lotteries.flatMap((l2) => l2.plays).find((p) => p.id === m[1]) || fail("NOT_FOUND", "\u73A9\u6CD5\u4E0D\u5B58\u5728", 404);
    return make("operations", "RuleDetail", { playId: play.id, officialRuleVersion: play.ruleVersion, simulationRuleVersion: "1", readiness: "READY", ruleText: `${play.name}\u89C4\u5219\u8BF4\u660E
\u6309\u539F\u7248\u73A9\u6CD5\u8303\u56F4\u9009\u62E9\u53F7\u7801\uFF0C\u6BCF\u6CE8\u6D88\u8017 2.00 \u79EF\u5206\u3002
\u672C\u9875\u9762\u4E3A\u6D4F\u89C8\u5668\u5185\u6F14\u793A\uFF0C\u5956\u7EA7\u4E0E\u79EF\u5206\u7528\u4E8E\u5C55\u793A\u64CD\u4F5C\u6D41\u7A0B\u3002`, baseCostPoints: "2.00", sourceEvidenceIds: ["demo-evidence-rule"] });
  }
  if (path === "/data-health") return page(state.health);
  if (path === "/lottery-sources") return page(state.sources);
  if (path === "/omission-gaps") {
    const rows = state.gaps.filter((g) => g.lotteryId === q.lotteryId);
    return { lotteryId: q.lotteryId, gapCount: rows.length, acknowledgedGapCount: rows.filter((g) => g.acknowledged).length, items: rows };
  }
  if (path === "/omission-rebuilds") {
    for (const row of state.health.filter((r2) => !b.lotteryId || r2.lotteryId === b.lotteryId)) {
      update(row, { projectionLag: 0, pendingTaskCount: 0, omissionGeneration: uid("demo-generation"), status: row.gapCount > row.acknowledgedGapCount ? "DEGRADED" : "READY" });
    }
    return task("OMISSION_REBUILD");
  }
  if (path === "/omission-gap-acknowledgements") {
    const row = state.gaps.find((g) => g.lotteryId === b.lotteryId && g.beforeIssueCode === b.beforeIssueCode && g.afterIssueCode === b.afterIssueCode) || fail("NOT_FOUND", "\u7F3A\u53E3\u4E0D\u5B58\u5728", 404);
    Object.assign(row, { acknowledged: true, acknowledgementId: uid("ack"), reason: b.reason, acknowledgedBy: state.identity.employeeId, acknowledgedAt: STAMP });
    syncGap(row.lotteryId);
    return row;
  }
  m = path.match(/^\/omission-gap-acknowledgements\/([^/]+)$/);
  if (m && method === "DELETE") {
    const row = state.gaps.find((g) => g.acknowledgementId === m[1]);
    if (row) {
      Object.assign(row, { acknowledged: false, acknowledgementId: null, reason: null, acknowledgedBy: null, acknowledgedAt: null });
      syncGap(row.lotteryId);
    }
    return null;
  }
  m = path.match(/^\/(play-rule-versions|simulation-policy-versions)(?:\/([^/]+)\/(reviews|artifact))?$/);
  if (m) {
    const rules = m[1] === "play-rule-versions";
    const rows = rules ? state.rules : state.policies;
    if (m[3] === "artifact") return state.uploads[find(rows, m[2]).artifactId]?.artifact || awardArtifact();
    if (m[3] === "reviews") {
      const row2 = find(rows, m[2]);
      if (row2.authorId === state.identity.employeeId) fail("FORBIDDEN", "\u539F\u7248\u8981\u6C42\u53E6\u4E00\u540D\u5458\u5DE5\u590D\u6838", 403);
      return update(row2, { status: b.decision === "APPROVE" ? "APPROVED" : "REJECTED", recordVersion: String(Number(row2.recordVersion) + 1) });
    }
    if (method === "GET") return page(rows.filter((r2) => !q.playId || r2.playId === q.playId));
    const row = make("operations", rules ? "RuleDraft" : "PolicyView", { ...b, artifactHash: b.ruleArtifactHash || b.artifactHash || "demo-hash", id: uid(rules ? "rule" : "policy"), version: String(rows.length + 1), recordVersion: "1", status: "PENDING_REVIEW", authorId: state.identity.employeeId, createdAt: STAMP });
    rows.unshift(row);
    return row;
  }
  m = path.match(/^\/draw-candidates\/([^/]+)\/reviews$/);
  if (m) {
    const row = find(state.candidates, m[1]);
    if (row.authorId === state.identity.employeeId) fail("FORBIDDEN", "\u539F\u7248\u8981\u6C42\u53E6\u4E00\u540D\u5458\u5DE5\u590D\u6838", 403);
    update(row, { status: b.decision === "APPROVE" ? "APPROVED" : "REJECTED" });
    if (row.status === "APPROVED") {
      state.drawVersions.unshift(make("operations", "DrawVersion", { lotteryId: row.lotteryId, lotteryCode: find(state.catalog.lotteries, row.lotteryId).code, issueCode: row.issueCode, version: row.version, status: "CONFIRMED", source: "MANUAL_REVIEWED", areas: row.areas, confirmedAt: STAMP, prizeReferenceStatus: "FINAL" }));
      const issue = state.issues.find((i) => i.lotteryId === row.lotteryId && i.issueCode === row.issueCode);
      if (issue) issue.status = "DRAWN";
    }
    return task("DRAW_REVIEW");
  }
  m = path.match(/^\/business-decision-proposals(?:\/([^/]+)\/(reviews|artifact))?$/);
  if (m) {
    if (m[2] === "artifact") return state.uploads[find(state.proposals, m[1]).artifactId]?.artifact || { decisionId: "D08", policyVersion: "DEMO-2", applicableScope: "\u5168\u5C40", selection: { option: "\u6F14\u793A\u9ED8\u8BA4\u7B49\u7EA7" } };
    if (m[2] === "reviews") {
      const row2 = find(state.proposals, m[1]);
      if (row2.authorId === state.identity.employeeId) fail("FORBIDDEN", "\u539F\u7248\u8981\u6C42\u53E6\u4E00\u540D\u5458\u5DE5\u590D\u6838", 403);
      update(row2, { status: b.decision === "APPROVE" ? "APPROVED" : "REJECTED", reviewedBy: state.identity.employeeId, reviewReason: b.reason, reviewedAt: STAMP });
      if (row2.status === "APPROVED") Object.assign(state.decisions.find((d) => d.decisionId === row2.decisionId), { status: "APPROVED", selectedOption: row2.selectedOption, policyVersion: row2.policyVersion });
      return row2;
    }
    if (method === "GET") return { decisions: state.decisions, proposals: state.proposals };
    const row = { ...b, id: uid("proposal"), baseRecordVersion: 1, status: "PENDING_REVIEW", authorId: state.identity.employeeId, reviewedBy: null, reviewReason: null, reviewedAt: null, createdAt: STAMP };
    state.proposals.unshift(row);
    return row;
  }
}
function syncGap(lotteryId) {
  const h = state.health.find((r2) => r2.lotteryId === lotteryId);
  h.acknowledgedGapCount = state.gaps.filter((g) => g.lotteryId === lotteryId && g.acknowledged).length;
  h.status = h.gapCount > h.acknowledgedGapCount ? "DEGRADED" : "READY";
}
function awardArtifact() {
  return { decisionId: "D02", policyVersion: "DEMO-AWARD-1", applicableScope: "\u6F14\u793A\u539F\u578B", selection: { awardRows: state.catalog.lotteries.flatMap((l2) => l2.plays.map((p) => ({ playCode: p.code, playRuleVersion: 1, awardCode: "DEMO_FIXED", rank: 1, points: "100.00", outcomes: [{ matched: 3 }] }))) } };
}

// src/demo/business.ts
function businessAction(path, method, b, q) {
  let m = path.match(/^\/(stations|station-masters|members|employees)(?:\/([^/]+)(?:\/(.+))?)?$/);
  if (m) {
    const [, kind, id, action] = m;
    const key = kind === "station-masters" ? "stationMasters" : kind;
    const rows = state[key];
    if (!id) {
      if (method === "GET") return paged(rows, q);
      const newId = uid(`demo-${kind}`);
      let row2;
      if (kind === "stations") row2 = make("station-management", "Station", { ...b, id: newId, code: b.code || `ST${String(rows.length + 1).padStart(3, "0")}`, status: "ENABLED", stationMasterCount: 0, memberCount: 0, version: "1" });
      else if (kind === "station-masters") {
        row2 = make("station-management", "StationMaster", { ...b, id: newId, code: `SM${String(rows.length + 1).padStart(3, "0")}`, userId: uid("demo-user"), station: ref(find(state.stations, b.stationId)), status: "ENABLED", disposablePoints: "0.00", memberCount: 0, operationCredentialConfigured: true, identityVersion: "1", version: "1" });
        delete row2.initialPassword;
        delete row2.operationPassword;
        delete row2.password;
        if (Number(b.initialDisposablePoints || b.initialPoints || b.initialGrantPoints || 0) > 0) localLedger(row2, Number(b.initialDisposablePoints || b.initialPoints || b.initialGrantPoints), b.reason);
        find(state.stations, b.stationId).stationMasterCount++;
      } else if (kind === "employees") row2 = { id: newId, account: b.account, name: b.name, status: "ENABLED", roleIds: b.roleIds, scopeStationIds: b.scopeStationIds, version: "1" };
      else return fail("DEMO_UNSUPPORTED", "\u539F\u7248\u6CA1\u6709\u65B0\u589E\u4F1A\u5458\u5165\u53E3");
      rows.unshift(row2);
      return row2;
    }
    const row = find(rows, id);
    if (!action) {
      if (method === "GET") return row;
      const patch = { ...b };
      delete patch.password;
      delete patch.newPassword;
      delete patch.initialPassword;
      if (b.stationId) patch.station = ref(find(state.stations, b.stationId));
      return update(row, patch);
    }
    if (action === "status") {
      update(row, { status: b.status });
      return row;
    }
    if (action === "permissions") return update(row, { roleIds: b.roleIds, scopeStationIds: b.scopeStationIds });
    if (action === "recovery" || action === "password") {
      update(row, { identityVersion: String(Number(row.identityVersion || 0) + 1) });
      return action === "recovery" ? row : null;
    }
    if (action === "membership-migrations") {
      row.scope = { ...row.scope, referrerMember: b.referrerMemberId ? ref(find(state.members, b.referrerMemberId)) : null, station: ref(find(state.stations, b.targetStationId || b.stationId)), stationMaster: ref(find(state.stationMasters, b.targetStationMasterId || b.stationMasterId)), version: String(Number(row.scope.version) + 1) };
      update(row, {});
      return receipt("migrateMemberMembership", id);
    }
    if (action === "migrations") {
      const station = find(state.stations, b.targetStationId);
      row.station = ref(station);
      if (b.moveOwnedMembers) for (const member2 of state.members.filter((x) => x.scope.stationMaster.id === id)) member2.scope.station = ref(station);
      return task("STATION_MASTER_MIGRATION");
    }
    if (action === "points/adjustments") {
      const amount = Number(b.points) * (b.type === "ADMIN_DEDUCT" ? -1 : 1);
      if (Number(row.disposablePoints) + amount < 0) fail("INSUFFICIENT_POINTS", "\u6F14\u793A\u989D\u5EA6\u4E0D\u8DB3");
      return localLedger(row, amount, b.reason);
    }
    if (action === "point-ledgers") return paged(ledgerViews({ memberId: id }), q);
    if (action === "orders") return paged(state.orders, { ...q, memberId: id });
  }
  if (path === "/roles") return page(state.roles);
  if (path === "/audit-events") return paged(state.audits, q);
  if (path === "/station-master-point-ledgers") return paged(ledgerViews(q), { cursor: q.cursor, limit: q.limit });
  m = path.match(/^\/(vip|referral)-level-configurations(?:\/(current))?$/);
  if (m) {
    const key = m[1], history = state[key + "History"];
    if (!m[2]) return page([state[key], ...history]);
    if (method === "GET") return state[key];
    history.unshift(structuredClone(state[key]));
    update(state[key], { levels: b.levels, ...key === "referral" ? { fixedRewardPolicyVersion: b.fixedRewardPolicyVersion, aiSharePolicyVersion: b.aiSharePolicyVersion } : {}, qualificationStatus: "READY", createdAt: STAMP });
    return state[key];
  }
  if (path === "/qualification-rebuilds") {
    state.vip.qualificationStatus = "READY";
    state.referral.qualificationStatus = "READY";
    return task("QUALIFICATION_REBUILD");
  }
  m = path.match(/^\/ordinary-orders(?:\/([^/]+)(?:\/(settlement-retries))?)?$/);
  if (m) {
    if (!m[1]) return paged(state.orders, q);
    const order = find(state.orders, m[1]);
    if (m[2]) {
      const remaining = Number(order.dueAwardPoints || 0) - Number(order.netPostedAwardPoints);
      if (remaining > 0) order.awardTransactionId = creditDemoMember(order.memberId, remaining, { budgetId: "demo-budget-2", type: "ORDINARY_AWARD", sourceType: "ORDINARY_ORDER", sourceId: order.id, issueCode: order.issueCode, reason: b.reason });
      order.status = "SETTLED";
      order.netPostedAwardPoints = order.dueAwardPoints || "0.00";
      return task("ORDINARY_SETTLEMENT");
    }
    return make("order-management", "AdminOrderDetail", { order, selection: order.selection || selectionFor("SSQ"), recommendationId: null, betCount: "10", multiple: 1, ruleVersion: "FORMAL-20260919-V1", simulationRuleVersion: "1", ledgerTransactionId: state.ledgers[0].id, lockTransactionId: state.ledgers[0].id, lockedAt: STAMP, settlements: order.dueAwardPoints ? [make("order-management", "OrdinarySettlement", { settlementVersion: "1", drawVersionId: "demo-draw-version-1", calculationReference: "DEMO-ORDINARY", awardCodes: ["DEMO_FIXED"], dueAwardPoints: order.dueAwardPoints, economicDeltaPoints: order.dueAwardPoints, actionType: "AWARD", actionStatus: order.status === "SETTLED" ? "COMPLETED" : "PENDING", requestedPoints: order.dueAwardPoints, postedPoints: order.netPostedAwardPoints, platformBornePoints: "0.00", ledgerTransactionId: order.status === "SETTLED" ? order.awardTransactionId || "demo-transaction-1" : null, createdAt: STAMP, completedAt: order.status === "SETTLED" ? STAMP : null })] : [], refund: null });
  }
  if (path === "/budget-accounts") return paged(state.budgets, q);
  if (path === "/ledger-transactions") return paged(state.ledgers, q);
  if (path === "/ledger-reversals") {
    const tx = find(state.ledgers, b.originalTransactionId || b.transactionId || b.referenceTransactionId);
    const amount = Number(b.points);
    if (amount > Number(tx.economicPoints) - Number(tx.reversedPoints)) fail("INVALID_VALUE", "\u51B2\u6B63\u79EF\u5206\u8D85\u8FC7\u5269\u4F59\u53EF\u51B2\u6B63\u989D");
    tx.reversedPoints = points(Number(tx.reversedPoints) + amount);
    const reversal = { ...structuredClone(tx), id: uid("demo-reversal"), type: "REVERSAL", economicPoints: points(amount), reversedPoints: "0.00", referenceTransactionId: tx.id, reason: b.reason, createdAt: STAMP, entries: tx.entries.map((e) => ({ ...e, id: uid("entry"), direction: e.direction === "CREDIT" ? "DEBIT" : "CREDIT", changePoints: points(-Number(e.changePoints)), balanceBefore: e.balanceAfter, balanceAfter: e.balanceBefore })) };
    state.ledgers.unshift(reversal);
    return receipt("createLedgerReversal", reversal.id);
  }
  if (path === "/reconciliations") {
    const id = uid("reconciliation");
    state.reconciliations[id] = { id, status: "MATCHED", expectedPoints: "1000.00", actualPoints: "1000.00", differencePoints: "0.00", asOf: STAMP };
    return task("LEDGER_RECONCILIATION", `/api/admin/v1/reconciliations/${id}`);
  }
  m = path.match(/^\/reconciliations\/([^/]+)$/);
  if (m) return state.reconciliations[m[1]] || fail("NOT_FOUND", "\u5BF9\u8D26\u4EFB\u52A1\u4E0D\u5B58\u5728", 404);
  if (path === "/platform-budget-flows") return { from: q.from || "2026-10-01", to: q.to || "2026-10-03", asOf: STAMP, rows: state.budgets.map((budget) => ({ category: budget.type, inflowPoints: budget.availablePoints, outflowPoints: "0.00", netFlowPoints: budget.availablePoints })) };
  m = path.match(/^\/platform-budget-batches(?:\/([^/]+)\/reviews)?$/);
  if (m) {
    if (m[1]) {
      const row2 = find(state.budgetBatches, m[1]);
      if (row2.authorId === state.identity.employeeId) fail("FORBIDDEN", "\u539F\u7248\u8981\u6C42\u53E6\u4E00\u540D\u5458\u5DE5\u590D\u6838", 403);
      row2.status = b.decision === "APPROVE" ? "APPROVED" : "REJECTED";
      row2.reviewedBy = state.identity.employeeId;
      row2.reviewReason = b.reason;
      if (row2.status === "APPROVED") {
        const budget = state.budgets.find((x) => x.type === row2.category);
        budget.availablePoints = points(Number(budget.availablePoints) + Number(row2.points));
        row2.transactionId = uid("demo-budget-transaction");
      }
      return row2;
    }
    if (method === "GET") return page(state.budgetBatches);
    const row = { ...b, id: uid("budget-batch"), authorId: state.identity.employeeId, status: "PENDING_REVIEW", reviewedBy: null, reviewReason: null, transactionId: null, createdAt: STAMP };
    state.budgetBatches.unshift(row);
    return row;
  }
  if (path === "/robot-strategies") return page(state.strategies);
  m = path.match(/^\/robot-masters(?:\/([^/]+)(?:\/(.+))?)?$/);
  if (m) {
    const [, id, action] = m;
    if (!id) {
      if (method === "GET") return paged(state.robots, q);
      const strategy = state.strategies.find((s) => s.code === b.strategy.code);
      const row2 = make("robots", "RobotAdmin", { robot: make("robots", "RobotPublic", { id: uid("demo-robot"), name: b.name, strategyCode: b.strategy.code, strategyLabel: strategy?.label || b.strategy.code, strategyDescription: strategy?.description || "", lotteryIds: b.allowedLotteryIds, performance: { settledGroups: "0", hitGroups: "0", hitRate: null, asOf: STAMP }, currentGroups: "0", scoreLabel: "\u63A8\u8350\u8BC4\u5206" }), status: b.status || "ENABLED", strategy: b.strategy, strategyVersion: "1", generationMode: b.generationMode, generationTime: b.generationTime || null, version: "1" });
      state.robots.unshift(row2);
      return row2;
    }
    const row = find(state.robots, id);
    if (!action) {
      if (method === "GET") return row;
      if (method === "DELETE") {
        state.robots = state.robots.filter((r2) => r2.robot.id !== id);
        return null;
      }
      update(row, { strategy: b.strategy, generationMode: b.generationMode, generationTime: b.generationTime || null });
      Object.assign(row.robot, { name: b.name, lotteryIds: b.allowedLotteryIds, strategyCode: b.strategy.code });
      return row;
    }
    if (action === "status") return update(row, { status: b.status });
    if (action === "executions") return page(state.executions[id] || [make("robots", "TaskStatusSummary", { id: `execution-${id}`, taskType: "ROBOT_GENERATION", status: "SUCCEEDED", progress: 1, resultCode: "COMPLETED", updatedAt: STAMP })]);
    if (action === "recommendations") return page(state.recommendations[id] || recommendations(row));
    if (["previews", "generations", "preview-jobs", "generation-jobs"].includes(action)) {
      const accepted = task(action.includes("preview") ? "ROBOT_PREVIEW" : "ROBOT_GENERATION");
      const result = state.tasks[accepted.taskId];
      (state.executions[id] ||= []).unshift(result);
      state.recommendations[id] = recommendations(row).map((r2) => ({ ...r2, executionId: accepted.taskId, status: action.includes("preview") ? "PREVIEW" : "PUBLISHED" }));
      row.latestExecutionAt = STAMP;
      row.robot.currentGroups = "5";
      return accepted;
    }
  }
}
function recommendations(robot) {
  const l2 = find(state.catalog.lotteries, robot.robot.lotteryIds[0]);
  return Array.from({ length: 5 }, (_, i) => make("robots", "Recommendation", { id: `recommendation-${robot.robot.id}-${i + 1}`, executionId: `execution-${robot.robot.id}`, robotId: robot.robot.id, lotteryId: l2.id, playId: l2.plays[0].id, issueCode: "2026261", selection: selectionFor(l2.code), recommendationScore: 80 + i, betCount: "1", pricePoints: "2.00", strategyVersion: robot.strategyVersion, generationVersion: "1", algorithmVersion: "1", ruleVersion: "FORMAL-20260919-V1", scoreBreakdown: [{ feature: "STRUCTURE", score: 82, weightBasisPoints: 1e4 }], explanations: ["\u6F14\u793A\u5386\u53F2\u7A97\u53E3\u8BA1\u7B97\u7ED3\u679C"], cutoffAt: "2026-10-03T20:00:00+08:00", outcome: { status: "PENDING", drawVersion: null, verifiedAt: null }, generatedAt: STAMP, status: "PUBLISHED" }));
}

// src/demo/ai.ts
function currentAllocation(id) {
  return state.allocations.filter((a) => a.poolIssueId === id && a.status !== "SUPERSEDED").at(-1) || null;
}
function actions(pool2) {
  if (pool2.status === "SETTLED") return [];
  const result = ["CALCULATE_ALLOCATION", "RECALCULATE_ALLOCATION"];
  if (pool2.status === "OPEN") result.push("CLOSE_FUNDING");
  const a = currentAllocation(pool2.id);
  if (a?.confirmationStatus === "PENDING_CONFIRMATION") result.push("CONFIRM_ALLOCATION");
  if (a?.confirmationStatus === "CONFIRMED") result.push("PUBLISH_DISCLOSURE");
  if (pool2.disclosureVersion && a?.confirmationStatus === "CONFIRMED") result.push("PREPARE_PAYOUT");
  return result;
}
function execution(pool2) {
  const a = currentAllocation(pool2.id), batch = state.payouts.find((p) => p.poolIssueId === pool2.id);
  return make("ai-management", "SettlementExecution", { poolIssueId: pool2.id, settlementMode: pool2.settlementMode, modeChangeAllowed: !batch, currentAllocationId: a?.id || null, currentAllocationVersion: a?.version || null, targetNetReturnPercent: a?.requestedTargetNetReturnPercent ?? pool2.defaultTargetNetReturnPercent, totalReturnPoints: a?.totalWinningPoints || null, postedReturnPoints: batch?.postedPoints || "0.00", targetRoundingAdjustmentPoints: a?.targetRoundingAdjustmentPoints || null, payoutBatchId: batch?.id || null, automaticTaskId: null, automaticTaskStatus: pool2.settlementMode === "AUTO" ? pool2.status === "EXCEPTION_PENDING" ? "FAILED" : batch ? "SUCCEEDED" : "PENDING" : null, failureCode: pool2.status === "EXCEPTION_PENDING" ? "DEMO_RETRY_REQUIRED" : null });
}
function newAllocation(pool2, target) {
  const all = state.allocations.filter((a) => a.poolIssueId === pool2.id);
  for (const a of all) a.status = "SUPERSEDED";
  const row = allocationFor(pool2, String(all.length + 1), target);
  state.allocations.push(row);
  pool2.status = "ALLOCATION_PENDING";
  update(pool2, {});
  return row;
}
function payout(pool2) {
  const existing = state.payouts.find((x) => x.poolIssueId === pool2.id);
  if (existing) return existing;
  const a = currentAllocation(pool2.id) || newAllocation(pool2, pool2.defaultTargetNetReturnPercent), batchId = uid("demo-payout");
  const recipients = state.members.slice(0, pool2.participantCount), cents2 = Math.round(Number(a.userWinningPoints) * 100), base = Math.floor(cents2 / Math.max(recipients.length, 1));
  const items = recipients.map((member2, i) => {
    const amount = (base + (i < cents2 % Math.max(recipients.length, 1) ? 1 : 0)) / 100;
    const transactionId = creditDemoMember(member2.id, amount, { budgetId: "demo-budget-3", type: "AI_AWARD", sourceType: "AI_POOL", sourceId: pool2.id, issueCode: pool2.issueCode });
    return make("ai-management", "PayoutItem", { id: `${batchId}-${i + 1}`, maskedBeneficiary: member2.displayName, duePoints: points(amount), postedPoints: points(amount), status: "POSTED", transactionId });
  });
  const batch = make("ai-management", "PayoutBatch", { id: batchId, poolIssueId: pool2.id, status: "COMPLETED", expectedPoints: a.userWinningPoints, postedPoints: a.userWinningPoints, pendingPoints: "0.00", differencePoints: "0.00", inputVersionSetHash: a.inputVersionSetHash, completedItemCount: items.length, totalItemCount: items.length, updatedAt: STAMP, items });
  state.payouts.push(batch);
  update(pool2, { status: "SETTLED", totalWinningPoints: a.totalWinningPoints, userWinningPoints: a.userWinningPoints });
  return batch;
}
function aiAction(path, method, b, q) {
  let m = path.match(/^\/ai-projects(?:\/([^/]+)(?:\/(.+))?)?$/);
  if (m) {
    const [, id, action] = m;
    if (!id) {
      if (method === "GET") return paged(state.projects, q);
      const projectId = uid("demo-project"), poolId = uid("demo-pool");
      const row = make("ai-management", "AiProject", { id: projectId, name: b.name, code: `FC3D-AI-${state.projects.length + 1}`, lotteryId: b.lotteryId, playId: b.playId, status: "ENABLED", activeConfigVersion: "1", latestPoolIssueId: poolId, version: "1", drawSchedule: { issueCode: "2026261", drawAt: "2026-10-03T21:15:00+08:00" } });
      state.projects.unshift(row);
      const config = make("ai-management", "AiProjectConfig", { projectId, version: "1", settings: b.settings, authorId: state.identity.employeeId, createdAt: STAMP });
      state.configs.push(config);
      state.pools.push({ ...structuredClone(state.pools[0]), id: poolId, projectId, status: "OPEN", ...b.settings, lotteryId: b.lotteryId, playId: b.playId, participantCount: 0, userPurchasePoints: "0.00", platformPoints: b.settings.initialOfficialPoints, totalPurchasePoints: b.settings.initialOfficialPoints });
      return config;
    }
    const project = find(state.projects, id);
    if (!action) return project;
    if (action === "configuration") {
      const config = state.configs.find((c) => c.projectId === id);
      if (method !== "GET") {
        update(config, { settings: b.settings });
        project.activeConfigVersion = config.version;
      }
      return config;
    }
    if (action === "status") return update(project, { status: b.status });
    if (action === "issues") return paged(state.pools, { ...q, projectId: id });
    if (action === "combination-preview") {
      const pool2 = find(state.pools, project.latestPoolIssueId);
      return make("ai-management", "AiCombinationPreview", { projectId: id, issueId: `issue-FC3D-${pool2.issueCode}`, issueCode: pool2.issueCode, configVersion: project.activeConfigVersion, ruleVersion: "1", algorithmVersion: "FC3D-V3", inputVersionSetHash: `inputs-${pool2.id}`, generatedAt: STAMP, combinations: combinationsFor(pool2.id) });
    }
  }
  m = path.match(/^\/ai-pools\/([^/]+)(?:\/(.+))?$/);
  if (m) {
    const [, id, action] = m;
    const pool2 = find(state.pools, id);
    if (!action) return make("ai-management", "AiPoolAdmin", { pool: pool2, configVersion: pool2.configVersion, combinations: combinationsFor(id), inputVersionSetHash: `inputs-${id}`, allowedActions: actions(pool2) });
    if (action === "settlement-execution") return execution(pool2);
    if (action === "settlement-mode") {
      if (state.payouts.some((p) => p.poolIssueId === id)) fail("CONFLICT", "\u5DF2\u6709\u53D1\u653E\u6279\u6B21\uFF0C\u4E0D\u80FD\u66F4\u6539\u65B9\u5F0F", 409);
      return update(pool2, { settlementMode: b.settlementMode });
    }
    if (action === "funding-closure") {
      update(pool2, { status: "ALLOCATION_PENDING" });
      return receipt("closeAiPoolFunding", id);
    }
    if (action === "subscriptions") return page(Array.from({ length: pool2.participantCount }, (_, i) => make("ai-management", "Subscription", { id: `subscription-${id}-${i + 1}`, poolIssueId: id, points: points(Number(pool2.userPurchasePoints) / Math.max(pool2.participantCount, 1)), quotaDate: "2026-10-03", status: pool2.status === "OPEN" ? "RESERVED" : pool2.status === "SETTLED" ? "SETTLED" : "LOCKED", ledgerTransactionId: `demo-transaction-${i + 1}`, lockedAt: pool2.status === "OPEN" ? null : STAMP, createdAt: STAMP })));
    if (action === "allocations") return page(state.allocations.filter((a) => a.poolIssueId === id).slice().reverse());
    if (action === "allocation-jobs") {
      const a = newAllocation(pool2, b.targetNetReturnPercent ?? pool2.defaultTargetNetReturnPercent);
      return task("AI_ALLOCATION", `/api/admin/v1/allocations/${a.id}`);
    }
    if (action === "allocation-previews") return newAllocation(pool2, b.targetNetReturnPercent);
    if (action === "disclosures") {
      const a = currentAllocation(id);
      if (a?.confirmationStatus !== "CONFIRMED") fail("CONFLICT", "\u8BF7\u5148\u786E\u8BA4\u672C\u671F\u989D\u5EA6", 409);
      update(pool2, { status: "DISCLOSED", numbersDisclosed: true, disclosureVersion: a.version, totalWinningPoints: a.totalWinningPoints, userWinningPoints: a.userWinningPoints });
      return make("ai-management", "DisclosureReceipt", { id: uid("disclosure"), poolIssueId: id, version: a.version, status: "PUBLISHED", label: "\u7ED3\u7B97\u516C\u793A", reason: b.reason, publishedAt: STAMP });
    }
    if (action === "payout-preparations") {
      const a = currentAllocation(id);
      const preparation = make("ai-management", "PayoutPreparation", { preparationId: uid("preparation"), poolIssueId: id, allocationVersion: a?.version || "1", disclosureVersion: pool2.disclosureVersion || "1", expectedInputVersionSetHash: a?.inputVersionSetHash || `inputs-${id}`, dueTotalPoints: a?.totalWinningPoints || "0.00", dueUserPoints: a?.userWinningPoints || "0.00", eligible: !!a && !!pool2.disclosureVersion, blockingCodes: pool2.disclosureVersion ? [] : ["DISCLOSURE_REQUIRED"], expiresAt: "2099-01-01T00:00:00Z" });
      state.preparations[preparation.preparationId] = preparation;
      return preparation;
    }
    if (action === "payouts") {
      if (b.confirmText !== "\u786E\u8BA4\u53D1\u653E") fail("INVALID_VALUE", "\u8BF7\u8F93\u5165\u786E\u8BA4\u53D1\u653E");
      const batch = payout(pool2);
      return task("AI_PAYOUT", `/api/admin/v1/payout-batches/${batch.id}`);
    }
    if (action === "quick-settlement" || action === "automatic-settlement/retry") {
      const a = newAllocation(pool2, b.targetNetReturnPercent ?? pool2.defaultTargetNetReturnPercent);
      a.confirmationStatus = "CONFIRMED";
      pool2.disclosureVersion = a.version;
      pool2.numbersDisclosed = true;
      payout(pool2);
      return execution(pool2);
    }
  }
  m = path.match(/^\/allocations\/([^/]+)(?:\/(confirmations))?$/);
  if (m) {
    const allocation = find(state.allocations, m[1]);
    if (m[2]) allocation.confirmationStatus = "CONFIRMED";
    return allocation;
  }
  m = path.match(/^\/payout-batches\/([^/]+)(?:\/(items|retries))?$/);
  if (m) {
    const batch = find(state.payouts, m[1]);
    if (m[2] === "items") return page(batch.items || Array.from({ length: batch.totalItemCount }, (_, i) => make("ai-management", "PayoutItem", { id: `${batch.id}-${i + 1}`, maskedBeneficiary: `\u6F14\u793A\u4F1A\u5458${i + 1}`, duePoints: points(Number(batch.expectedPoints) / Math.max(batch.totalItemCount, 1)), postedPoints: points(Number(batch.postedPoints) / Math.max(batch.totalItemCount, 1)), status: "POSTED", transactionId: `demo-payout-ledger-${i + 1}` })));
    if (m[2] === "retries") {
      batch.status = "COMPLETED";
      batch.postedPoints = batch.expectedPoints;
      batch.pendingPoints = "0.00";
      batch.differencePoints = "0.00";
      return task("AI_PAYOUT_RETRY", `/api/admin/v1/payout-batches/${batch.id}`);
    }
    return batch;
  }
}

// src/demo/export-file.ts
var encoder = new TextEncoder();
var xml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
function column(index) {
  let result = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result;
  return result;
}
function crc32(bytes) {
  let crc = 4294967295;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
  }
  return (crc ^ 4294967295) >>> 0;
}
function zip(files) {
  const chunks = [], central = [];
  let offset = 0;
  for (const [filename, value] of Object.entries(files)) {
    const name = encoder.encode(filename), data = encoder.encode(value), crc = crc32(data), header = new Uint8Array(30 + name.length), view = new DataView(header.buffer);
    view.setUint32(0, 67324752, true);
    view.setUint16(4, 20, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, name.length, true);
    header.set(name, 30);
    chunks.push(header, data);
    const entry = new Uint8Array(46 + name.length), e = new DataView(entry.buffer);
    e.setUint32(0, 33639248, true);
    e.setUint16(4, 20, true);
    e.setUint16(6, 20, true);
    e.setUint32(16, crc, true);
    e.setUint32(20, data.length, true);
    e.setUint32(24, data.length, true);
    e.setUint16(28, name.length, true);
    e.setUint32(42, offset, true);
    entry.set(name, 46);
    central.push(entry);
    offset += header.length + data.length;
  }
  const centralSize = central.reduce((sum, c) => sum + c.length, 0), end = new Uint8Array(22), endView = new DataView(end.buffer);
  endView.setUint32(0, 101010256, true);
  endView.setUint16(8, central.length, true);
  endView.setUint16(10, central.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  const output = new Uint8Array(offset + centralSize + 22);
  let position = 0;
  for (const chunk of [...chunks, ...central, end]) {
    output.set(chunk, position);
    position += chunk.length;
  }
  return output;
}
function reportFile(rows, format) {
  if (format !== "XLSX") {
    const csv = "\uFEFF" + rows.map((row) => row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(",")).join("\r\n");
    return new Blob([csv], { type: "text/csv;charset=utf-8" });
  }
  const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${rows.map((row, r2) => `<row r="${r2 + 1}">${row.map((value, c) => `<c r="${column(c)}${r2 + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const files = {
    "[Content_Types].xml": '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels": '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": `<?xml version="1.0"?><workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="\u8FD0\u8425\u62A5\u8868" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": sheet
  };
  return new Blob([zip(files).buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// src/demo/reports.ts
function report(type, q = {}) {
  const members = filtered(state.members, q), masters = filtered(state.stationMasters, q), pools = filtered(state.pools, q);
  const blank = () => Object.fromEntries(meta_default.metrics.map((k) => [k, /count$/i.test(k) ? "0" : /Rate|Share$/.test(k) ? "0.00" : "0.00"]));
  let items = [];
  if (type === "AI_POOLS") items = pools.map((p) => ({ dimensions: { poolIssueId: p.id, project: ref(state.projects.find((x) => x.id === p.projectId)), lottery: ref(state.catalog.lotteries.find((l2) => l2.id === p.lotteryId)), play: { id: p.playId, code: "FC3D_STRAIGHT", name: "\u798F\u5F693D\u76F4\u9009" }, projectId: p.projectId, issueCode: p.issueCode, status: p.status, settlementStatus: p.status, settlementMode: p.settlementMode, disclosureStatus: p.numbersDisclosed ? "PUBLISHED" : "PENDING", drawVersion: p.status === "OPEN" ? null : "1", drawNumbers: p.status === "OPEN" ? null : "2 5 8", winningNumberCode: p.status === "OPEN" ? null : "258", exceptionReason: p.status === "EXCEPTION_PENDING" ? "\u6F14\u793A\u5F85\u5904\u7406\u5F02\u5E38" : null }, metrics: { ...blank(), issueCount: "1", participantCount: String(p.participantCount), participationPersonTimes: String(p.participantCount), combinationCount: "50", totalPurchasePoints: p.totalPurchasePoints, netEffectivePurchasePoints: p.totalPurchasePoints, userPurchasePoints: p.userPurchasePoints, platformPoints: p.platformPoints, actualUserShare: p.actualUserShare, totalWinningPoints: p.totalWinningPoints || "0.00", userWinningPoints: p.userWinningPoints || "0.00", postedUserWinningPoints: p.status === "SETTLED" ? p.userWinningPoints : "0.00", platformWinningPoints: p.totalWinningPoints ? points(Number(p.totalWinningPoints) - Number(p.userWinningPoints)) : "0.00", rewardRequiredPoints: p.totalWinningPoints || "0.00", targetRoundingAdjustmentPoints: "0.00", actualNetReturnRate: p.totalWinningPoints ? "0.10" : "0.00", requestedTargetNetReturnRate: String((state.allocations.filter((a) => a.poolIssueId === p.id && a.status !== "SUPERSEDED").at(-1)?.requestedTargetNetReturnPercent ?? p.defaultTargetNetReturnPercent) / 100), differencePercentagePoints: p.status === "OPEN" ? null : "0.00", winningNotReadyCount: p.status === "EXCEPTION_PENDING" ? "1" : "0" } }));
  else if (type === "STATION_MASTERS") items = masters.map((m) => ({ dimensions: { date: "2026-10-03", station: m.station, stationMaster: ref(m) }, metrics: { ...blank(), openingBalancePoints: points(Number(m.disposablePoints) - 1e3), periodGrantedPoints: "1000.00", periodDeductedPoints: "0.00", memberGrantedPoints: m.grantedMemberPoints, memberDeductedPoints: m.deductedMemberPoints, endingBalancePoints: m.disposablePoints } }));
  else if (type === "LEDGER_RECONCILIATION") {
    const balance = points(state.budgets.reduce((s, b) => s + Number(b.availablePoints), 0) + state.members.reduce((s, m) => s + Number(m.wallet.availablePoints) + Number(m.wallet.reservedPoints), 0) + state.stationMasters.reduce((s, m) => s + Number(m.disposablePoints), 0));
    items = [{ dimensions: { date: "2026-10-03", settlementStatus: "MATCHED", exceptionReason: null }, metrics: { expectedPoints: balance, postedPoints: balance, differencePoints: "0.00", mismatchAccountCount: "0" } }];
  } else items = members.map((m) => ({ dimensions: { date: "2026-10-03", station: m.scope.station, stationMaster: m.scope.stationMaster, member: ref(m), vipLevel: { id: m.vipName, name: m.vipName, code: m.vipName }, referralLevel: { id: m.referralName, name: m.referralName, code: m.referralName }, fixedRewardPolicyVersion: state.referral.fixedRewardPolicyVersion, aiSharePolicyVersion: state.referral.aiSharePolicyVersion }, metrics: { ...blank(), memberCount: "1", newMemberCount: "1", periodGrantedPoints: m.qualifiedRechargePoints, periodDeductedPoints: m.stationDeductedPoints, netGrantedPoints: points(Number(m.qualifiedRechargePoints) - Number(m.stationDeductedPoints)), availablePoints: m.wallet.availablePoints, reservedPoints: m.wallet.reservedPoints, settledStakePoints: m.totalBetPoints, totalWinningPoints: points(Number(m.totalBetPoints) + Number(m.netProfitPoints)), netProfitPoints: m.netProfitPoints, directMemberCount: String(m.directMemberCount), directAvailablePoints: m.directMemberAvailableTotal, rechargeMemberCount: "1", rechargeCount: "1", deductMemberCount: "1", deductCount: "1", qualifiedRechargePoints: m.qualifiedRechargePoints, vipBaseLimit: m.quota.vipBaseLimit, vipBaseLimitPerMember: m.quota.vipBaseLimit, referralExtraLimit: m.quota.referralExtraLimit, totalQuotaLimit: m.quota.totalLimit, quotaUsedPoints: m.quota.usedPoints, quotaRemainingPoints: m.quota.remainingPoints, quotaUsageRate: points(Number(m.quota.usedPoints) / Number(m.quota.totalLimit)), memberShare: points(1 / Math.max(members.length, 1)), validMemberCount: String(m.directMemberCount), validRate: "1.00", eligibilityStatus: "READY" } }));
  if (q.from && new Date(q.from.length === 10 ? q.from + "T00:00:00+08:00" : q.from).getTime() > new Date(STAMP).getTime() || q.to && new Date(q.to.length === 10 ? q.to + "T23:59:59+08:00" : q.to).getTime() < (/* @__PURE__ */ new Date("2026-10-01T00:00:00+08:00")).getTime()) items = [];
  const totals = {};
  for (const row of items) for (const [key, value] of Object.entries(row.metrics)) {
    if (!Number.isFinite(Number(value))) continue;
    totals[key] = points(Number(totals[key] || 0) + Number(value));
  }
  for (const key of Object.keys(totals)) {
    if (/Count$/.test(key)) totals[key] = String(Number(totals[key]));
    if (/Rate|Share$/.test(key)) totals[key] = items.length ? points(Number(totals[key]) / items.length) : "0.00";
  }
  return { ...page(items), reportType: type, metricDictionaryVersion: "DEMO-1", filters: { from: q.from || "2026-09-27", to: q.to || "2026-10-03", ...q }, asOf: STAMP, projectionVersion: "1", sourceWatermark: "demo-ledger-1", totals, totalScope: "FULL_FILTER", complete: true };
}
function exportReport(body) {
  const id = uid("export"), data = report(body.reportType, body.filters || {});
  const keys = [...new Set(data.items.flatMap((r2) => [...Object.keys(r2.dimensions), ...Object.keys(r2.metrics)]))];
  const cell = (value) => typeof value === "object" && value !== null ? value.name || JSON.stringify(value) : String(value ?? "");
  const rows = [keys, ...data.items.map((r2) => keys.map((key) => cell(r2.dimensions[key] ?? r2.metrics[key])))];
  state.exports[id] = { id, status: "COMPLETED", rowCount: String(data.items.length), downloadUrl: null, expiresAt: "2099-01-01T00:00:00Z", rows, format: body.format || "CSV" };
  return task("REPORT_EXPORT", `/api/admin/v1/report-exports/${id}`);
}
function getExport(id) {
  const item = state.exports[id];
  if (!item) throw new Error("\u6F14\u793A\u5BFC\u51FA\u4E0D\u5B58\u5728");
  return { ...item, downloadUrl: URL.createObjectURL(reportFile(item.rows, item.format)) + `#\u8FD0\u8425\u62A5\u8868.${item.format.toLowerCase()}` };
}

// src/demo/client.ts
function createDemoClient(realm) {
  return { realm, resetSecurityContext() {
  }, onSessionLost() {
    return () => {
    };
  }, async request(url, options = {}) {
    const path = url.replace(/^\/api\/(?:admin\/)?v1/, "").split("?")[0];
    const method = options.method || "GET", body = options.body || {}, query = options.query || {};
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    refreshMemberMetrics(state.members, state.ledgers);
    let data;
    const cacheKey = options.idempotencyKey;
    if (method !== "GET" && cacheKey && state.commands[cacheKey]) data = state.commands[cacheKey].data;
    else {
      if (path === "/auth/me") {
        if (!state.auth) fail("UNAUTHENTICATED", "\u6F14\u793A\u4F1A\u8BDD\u5DF2\u9000\u51FA", 401);
        data = state.identity;
      } else if (path === "/auth/login") {
        if (!body.account?.trim() || !body.password) fail("INVALID_VALUE", "\u8BF7\u8F93\u5165\u6F14\u793A\u8D26\u53F7\u548C\u5BC6\u7801");
        state.auth = true;
        state.identity.employeeId = body.account === "demo_operator" ? "demo-employee-002" : "demo-employee-001";
        state.identity.account = `${body.account} \xB7 \u6F14\u793A`;
        data = null;
      } else if (path === "/auth/logout") {
        state.auth = false;
        data = null;
      } else if (path === "/me/password") {
        data = null;
      } else if (path === "/auth/mfa/enrollments") {
        data = { enrollmentId: uid("demo-enrollment"), provisioningUri: "\u6F14\u793A\u7ED1\u5B9A\uFF1A\u586B\u5199\u4EFB\u610F\u516D\u4F4D\u6570\u5B57\u5B8C\u6210\u672C\u5730\u4EA4\u4E92", expiresAt: "2099-01-01T00:00:00Z" };
      } else if (path === "/auth/mfa/enrollments/confirm") {
        state.identity.mfaEnrolled = true;
        data = null;
      } else if (path === "/action-authorizations") {
        if (!/^\d{6}$/.test(String(body.proofCode || ""))) fail("MFA_CODE_INVALID", "\u6F14\u793A\u52A8\u4F5C\u9A8C\u8BC1\u7801\u8BF7\u8F93\u5165\u516D\u4F4D\u6570\u5B57");
        data = { actionToken: "demo-local-action", expiresAt: "2099-01-01T00:00:00Z" };
      } else if (path.startsWith("/tasks/")) data = state.tasks[path.split("/").at(-1)] || fail("NOT_FOUND", "\u6F14\u793A\u4EFB\u52A1\u4E0D\u5B58\u5728", 404);
      else if (path.startsWith("/command-results/")) {
        const item = state.commands[path.split("/").at(-1)];
        data = item ? { operationId: query.operationId || item.operationId, resourceId: item.data?.resourceId || item.data?.id || null, taskId: item.data?.taskId || null, status: "SUCCEEDED", httpStatus: 200, resultUrl: item.data?.statusUrl || null, failureCode: null } : fail("NOT_FOUND", "\u6F14\u793A\u547D\u4EE4\u4E0D\u5B58\u5728", 404);
      } else if (path.startsWith("/reports/")) data = report(path.split("/").at(-1), query);
      else if (path === "/report-exports") data = exportReport(body);
      else if (path.startsWith("/report-exports/")) data = getExport(path.split("/").at(-1));
      else {
        for (const handler of [lotteryAction, businessAction, aiAction]) {
          data = handler(path, method, body, query);
          if (data !== void 0) break;
        }
        if (data === void 0) fail("DEMO_NOT_IMPLEMENTED", `\u672A\u6620\u5C04\u7684\u6F14\u793A\u64CD\u4F5C\uFF1A${method} ${path}`, 404);
      }
      if (method !== "GET") {
        refreshMemberMetrics(state.members, state.ledgers);
        if (!path.startsWith("/auth/") && path !== "/action-authorizations" && path !== "/me/password") audit(path, body);
        if (cacheKey) state.commands[cacheKey] = { operationId: path.split("/").at(-1), data: structuredClone(data) };
        persist();
      }
    }
    return { data: structuredClone(data), meta: { requestId: "demo-local", traceId: "demo-local", serverTime: STAMP }, status: data?.taskId ? 202 : 200, etag: `"${data?.version || data?.pool?.version || "1"}"`, location: null, retryAfterSeconds: null };
  } };
}
async function storeEvidenceFile(file, purpose) {
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())), (v) => v.toString(16).padStart(2, "0")).join("");
  const id = uid("demo-evidence");
  let artifact = null;
  if (file.type.includes("json") || file.name.endsWith(".json")) {
    try {
      artifact = JSON.parse(await file.text());
    } catch {
      fail("INVALID_VALUE", "\u8BF7\u9009\u62E9\u6709\u6548 JSON \u6587\u4EF6");
    }
  }
  state.uploads[id] = { id, status: "COMMITTED", sha256: hash, purpose, fileName: file.name, artifact };
  persist();
  return { id, status: "COMMITTED", sha256: hash, purpose };
}

// src/lib/api.ts
var adminApi = createDemoClient("admin");
var publicApi = createDemoClient("portal");

// src/features/operations/operations-models.ts
var lotteryCodes = /* @__PURE__ */ new Set([
  "SSQ",
  "DLT",
  "FC3D",
  "PL3",
  "PL5",
  "QLC",
  "KL8",
  "QXC"
]);
var reportTypes = [
  "MEMBER_OVERVIEW",
  "MEMBER_POINTS",
  "VIP_LEVELS",
  "REFERRAL_LEVELS",
  "AI_QUOTA",
  "AI_POOLS",
  "STATION_MASTERS",
  "LEDGER_RECONCILIATION"
];
function readAdminCatalog(value) {
  const root = record(value, "CATALOG_RESPONSE_MISMATCH");
  const approvalStatus = oneOf(
    text(root.approvalStatus, "CATALOG_STATUS_MISMATCH"),
    ["APPROVED", "D01_PENDING"],
    "CATALOG_STATUS_MISMATCH"
  );
  return {
    version: text(root.version, "CATALOG_VERSION_MISMATCH"),
    approvalStatus,
    lotteries: array(root.lotteries, "CATALOG_LOTTERIES_MISMATCH").map((value2) => {
      const lottery = record(value2, "CATALOG_LOTTERY_MISMATCH");
      const code = text(lottery.code, "CATALOG_CODE_MISMATCH");
      if (!lotteryCodes.has(code)) {
        throw new TypeError("CATALOG_CODE_MISMATCH");
      }
      return {
        id: text(lottery.id, "CATALOG_ID_MISMATCH"),
        code,
        name: text(lottery.name, "CATALOG_NAME_MISMATCH"),
        latestIssueCode: nullableText(lottery.latestIssueCode, "CATALOG_ISSUE_MISMATCH"),
        plays: array(lottery.plays, "CATALOG_PLAYS_MISMATCH").map(readAdminPlay)
      };
    })
  };
}
function readIssuePage(value) {
  const root = record(value, "ISSUE_PAGE_MISMATCH");
  return page2(root, "ISSUE_PAGE_MISMATCH", (value2) => {
    const item = record(value2, "ISSUE_MISMATCH");
    return {
      id: text(item.id, "ISSUE_ID_MISMATCH"),
      lotteryId: text(item.lotteryId, "ISSUE_LOTTERY_MISMATCH"),
      issueCode: text(item.issueCode, "ISSUE_CODE_MISMATCH"),
      status: oneOf(text(item.status, "ISSUE_STATUS_MISMATCH"), [
        "SCHEDULED",
        "OPEN",
        "CLOSED",
        "CANCELLED",
        "DRAWN"
      ], "ISSUE_STATUS_MISMATCH"),
      openAt: nullableText(item.openAt, "ISSUE_OPEN_AT_MISMATCH"),
      cutoffAt: nullableText(item.cutoffAt, "ISSUE_CUTOFF_AT_MISMATCH"),
      drawAt: nullableText(item.drawAt, "ISSUE_DRAW_AT_MISMATCH"),
      drawDate: text(item.drawDate, "ISSUE_DRAW_DATE_MISMATCH"),
      officialIssueCode: text(item.officialIssueCode, "ISSUE_OFFICIAL_CODE_MISMATCH"),
      version: text(item.version, "ISSUE_VERSION_MISMATCH")
    };
  });
}
function readDataHealthPage(value) {
  const root = record(value, "DATA_HEALTH_PAGE_MISMATCH");
  return page2(root, "DATA_HEALTH_PAGE_MISMATCH", (value2) => {
    const item = record(value2, "DATA_HEALTH_MISMATCH");
    return {
      lotteryId: text(item.lotteryId, "DATA_HEALTH_LOTTERY_MISMATCH"),
      latestConfirmedIssue: nullableText(item.latestConfirmedIssue, "DATA_HEALTH_ISSUE_MISMATCH"),
      drawVersion: nullableText(item.drawVersion, "DATA_HEALTH_DRAW_VERSION_MISMATCH"),
      omissionGeneration: nullableText(item.omissionGeneration, "DATA_HEALTH_GENERATION_MISMATCH"),
      gapCount: integer(item.gapCount, "DATA_HEALTH_GAP_MISMATCH"),
      trailingGap: bool(item.trailingGap, "DATA_HEALTH_TRAILING_GAP_MISMATCH"),
      drawVersionSetHash: nullableText(item.drawVersionSetHash, "DATA_HEALTH_HASH_MISMATCH"),
      qualificationLag: integer(item.qualificationLag, "DATA_HEALTH_QUALIFICATION_MISMATCH"),
      pendingTaskCount: integer(item.pendingTaskCount, "DATA_HEALTH_TASK_MISMATCH"),
      projectionLag: integer(item.projectionLag, "DATA_HEALTH_PROJECTION_LAG_MISMATCH"),
      acknowledgedGapCount: integer(
        item.acknowledgedGapCount,
        "DATA_HEALTH_ACKNOWLEDGED_GAP_MISMATCH"
      ),
      status: oneOf(text(item.status, "DATA_HEALTH_STATUS_MISMATCH"), [
        "READY",
        "DEGRADED",
        "UNAVAILABLE"
      ], "DATA_HEALTH_STATUS_MISMATCH")
    };
  });
}
function readOmissionGapPage(value) {
  const root = record(value, "OMISSION_GAP_PAGE_MISMATCH");
  const items = root.items;
  if (!Array.isArray(items)) {
    throw new Error("OMISSION_GAP_PAGE_MISMATCH");
  }
  return {
    lotteryId: text(root.lotteryId, "OMISSION_GAP_LOTTERY_MISMATCH"),
    gapCount: integer(root.gapCount, "OMISSION_GAP_COUNT_MISMATCH"),
    acknowledgedGapCount: integer(
      root.acknowledgedGapCount,
      "OMISSION_GAP_ACKNOWLEDGED_MISMATCH"
    ),
    items: items.map((entry) => {
      const item = record(entry, "OMISSION_GAP_MISMATCH");
      return {
        beforeIssueCode: text(item.beforeIssueCode, "OMISSION_GAP_BEFORE_MISMATCH"),
        afterIssueCode: text(item.afterIssueCode, "OMISSION_GAP_AFTER_MISMATCH"),
        acknowledged: bool(item.acknowledged, "OMISSION_GAP_ACKNOWLEDGED_MISMATCH"),
        acknowledgementId: nullableText(item.acknowledgementId, "OMISSION_GAP_ID_MISMATCH"),
        reason: nullableText(item.reason, "OMISSION_GAP_REASON_MISMATCH"),
        acknowledgedBy: nullableText(item.acknowledgedBy, "OMISSION_GAP_ACTOR_MISMATCH"),
        acknowledgedAt: nullableText(item.acknowledgedAt, "OMISSION_GAP_TIME_MISMATCH")
      };
    })
  };
}
function readSourceHealthPage(value) {
  const root = record(value, "SOURCE_PAGE_MISMATCH");
  return page2(root, "SOURCE_PAGE_MISMATCH", (value2) => {
    const item = record(value2, "SOURCE_MISMATCH");
    return {
      id: text(item.id, "SOURCE_ID_MISMATCH"),
      name: text(item.name, "SOURCE_NAME_MISMATCH"),
      lotteryIds: stringArray(item.lotteryIds, "SOURCE_LOTTERIES_MISMATCH"),
      status: oneOf(text(item.status, "SOURCE_STATUS_MISMATCH"), [
        "APPROVED",
        "UNAPPROVED",
        "FAILED",
        "CONFLICT"
      ], "SOURCE_STATUS_MISMATCH"),
      lastSuccessAt: nullableText(item.lastSuccessAt, "SOURCE_LAST_SUCCESS_MISMATCH"),
      failureCode: nullableText(item.failureCode, "SOURCE_FAILURE_MISMATCH")
    };
  });
}
function readReportResult(value) {
  const root = record(value, "REPORT_RESPONSE_MISMATCH");
  const type = oneOf(
    text(root.reportType, "REPORT_TYPE_MISMATCH"),
    reportTypes,
    "REPORT_TYPE_MISMATCH"
  );
  return {
    reportType: type,
    metricDictionaryVersion: text(root.metricDictionaryVersion, "REPORT_DICTIONARY_MISMATCH"),
    snapshotId: text(root.snapshotId, "REPORT_SNAPSHOT_MISMATCH"),
    asOf: text(root.asOf, "REPORT_AS_OF_MISMATCH"),
    projectionVersion: text(root.projectionVersion, "REPORT_PROJECTION_MISMATCH"),
    sourceWatermark: text(root.sourceWatermark, "REPORT_WATERMARK_MISMATCH"),
    items: array(root.items, "REPORT_ITEMS_MISMATCH").map((value2) => {
      const item = record(value2, "REPORT_ROW_MISMATCH");
      return {
        dimensions: objectMap(item.dimensions, "REPORT_DIMENSIONS_MISMATCH"),
        metrics: objectMap(item.metrics, "REPORT_METRICS_MISMATCH")
      };
    }),
    totals: objectMap(root.totals, "REPORT_TOTALS_MISMATCH"),
    totalScope: text(root.totalScope, "REPORT_TOTAL_SCOPE_MISMATCH"),
    nextCursor: nullableText(root.nextCursor, "REPORT_CURSOR_MISMATCH"),
    hasMore: bool(root.hasMore, "REPORT_HAS_MORE_MISMATCH"),
    complete: bool(root.complete, "REPORT_COMPLETE_MISMATCH")
  };
}
function readRuleDetail(value) {
  const root = record(value, "RULE_RESPONSE_MISMATCH");
  return {
    playId: text(root.playId, "RULE_PLAY_MISMATCH"),
    officialRuleVersion: text(root.officialRuleVersion, "RULE_OFFICIAL_VERSION_MISMATCH"),
    simulationRuleVersion: nullableText(root.simulationRuleVersion, "RULE_SIMULATION_VERSION_MISMATCH"),
    readiness: oneOf(text(root.readiness, "RULE_READINESS_MISMATCH"), [
      "READY",
      "UNCONFIRMED",
      "DATA_UNAVAILABLE"
    ], "RULE_READINESS_MISMATCH"),
    ruleText: text(root.ruleText, "RULE_TEXT_MISMATCH"),
    baseCostPoints: text(root.baseCostPoints, "RULE_COST_MISMATCH"),
    sourceEvidenceIds: stringArray(root.sourceEvidenceIds, "RULE_EVIDENCE_MISMATCH")
  };
}
function readRuleDraftPage(value) {
  const root = record(value, "RULE_DRAFT_PAGE_MISMATCH");
  return page2(root, "RULE_DRAFT_PAGE_MISMATCH", readRuleDraft);
}
function readRuleDraft(value) {
  const item = record(value, "RULE_DRAFT_MISMATCH");
  return {
    id: text(item.id, "RULE_DRAFT_ID_MISMATCH"),
    playId: text(item.playId, "RULE_DRAFT_PLAY_MISMATCH"),
    version: text(item.version, "RULE_DRAFT_VERSION_MISMATCH"),
    recordVersion: text(item.recordVersion, "RULE_DRAFT_RECORD_VERSION_MISMATCH"),
    status: oneOf(text(item.status, "RULE_DRAFT_STATUS_MISMATCH"), [
      "DRAFT",
      "PENDING_REVIEW",
      "APPROVED",
      "REJECTED"
    ], "RULE_DRAFT_STATUS_MISMATCH"),
    authorId: text(item.authorId, "RULE_DRAFT_AUTHOR_MISMATCH"),
    artifactHash: text(item.artifactHash, "RULE_DRAFT_HASH_MISMATCH"),
    effectiveFromIssue: text(item.effectiveFromIssue, "RULE_DRAFT_ISSUE_MISMATCH")
  };
}
function readPolicyViewPage(value) {
  const root = record(value, "POLICY_PAGE_MISMATCH");
  return page2(root, "POLICY_PAGE_MISMATCH", readPolicyView);
}
function readPolicyView(value) {
  const item = record(value, "POLICY_MISMATCH");
  return {
    id: text(item.id, "POLICY_ID_MISMATCH"),
    code: oneOf(text(item.code, "POLICY_CODE_MISMATCH"), [
      "SIMULATION_AWARD",
      "REFERRAL_FIXED",
      "REFERRAL_AI_SHARE"
    ], "POLICY_CODE_MISMATCH"),
    version: text(item.version, "POLICY_VERSION_MISMATCH"),
    recordVersion: text(item.recordVersion, "POLICY_RECORD_VERSION_MISMATCH"),
    status: oneOf(text(item.status, "POLICY_STATUS_MISMATCH"), [
      "UNCONFIRMED",
      "PENDING_REVIEW",
      "APPROVED",
      "REJECTED",
      "SUPERSEDED"
    ], "POLICY_STATUS_MISMATCH"),
    artifactId: text(item.artifactId, "POLICY_ARTIFACT_MISMATCH"),
    artifactHash: text(item.artifactHash, "POLICY_HASH_MISMATCH"),
    decisionIds: stringArray(item.decisionIds, "POLICY_DECISIONS_MISMATCH"),
    authorId: text(item.authorId, "POLICY_AUTHOR_MISMATCH"),
    createdAt: text(item.createdAt, "POLICY_CREATED_AT_MISMATCH")
  };
}
function readDrawCandidatePage(value) {
  const root = record(value, "CANDIDATE_PAGE_MISMATCH");
  return page2(root, "CANDIDATE_PAGE_MISMATCH", readDrawCandidate);
}
function readDrawCandidate(value) {
  const item = record(value, "CANDIDATE_MISMATCH");
  return {
    id: text(item.id, "CANDIDATE_ID_MISMATCH"),
    lotteryId: text(item.lotteryId, "CANDIDATE_LOTTERY_MISMATCH"),
    issueCode: text(item.issueCode, "CANDIDATE_ISSUE_MISMATCH"),
    areas: readAreas(item.numbers),
    source: oneOf(text(item.source, "CANDIDATE_SOURCE_MISMATCH"), [
      "MANUAL",
      "SYSTEM"
    ], "CANDIDATE_SOURCE_MISMATCH"),
    status: oneOf(text(item.status, "CANDIDATE_STATUS_MISMATCH"), [
      "PENDING_REVIEW",
      "APPROVED",
      "REJECTED",
      "CONFLICT"
    ], "CANDIDATE_STATUS_MISMATCH"),
    evidenceIds: stringArray(item.evidenceIds, "CANDIDATE_EVIDENCE_MISMATCH"),
    authorId: text(item.authorId, "CANDIDATE_AUTHOR_MISMATCH"),
    replacesDrawVersion: nullableText(item.replacesDrawVersion, "CANDIDATE_REPLACES_MISMATCH"),
    version: text(item.version, "CANDIDATE_VERSION_MISMATCH"),
    createdAt: text(item.createdAt, "CANDIDATE_CREATED_AT_MISMATCH")
  };
}
function readDrawVersionPage(value) {
  const root = record(value, "DRAW_VERSION_PAGE_MISMATCH");
  return page2(root, "DRAW_VERSION_PAGE_MISMATCH", readDrawVersion);
}
function readDrawVersion(value) {
  const item = record(value, "DRAW_VERSION_MISMATCH");
  const lotteryCode = text(item.lotteryCode, "DRAW_VERSION_LOTTERY_CODE_MISMATCH");
  if (!lotteryCodes.has(lotteryCode)) {
    throw new TypeError("DRAW_VERSION_LOTTERY_CODE_MISMATCH");
  }
  return {
    lotteryId: text(item.lotteryId, "DRAW_VERSION_LOTTERY_MISMATCH"),
    lotteryCode,
    issueCode: text(item.issueCode, "DRAW_VERSION_ISSUE_MISMATCH"),
    version: text(item.version, "DRAW_VERSION_NUMBER_MISMATCH"),
    status: oneOf(text(item.status, "DRAW_VERSION_STATUS_MISMATCH"), [
      "PENDING",
      "CONFIRMED",
      "CORRECTED",
      "CONFLICT"
    ], "DRAW_VERSION_STATUS_MISMATCH"),
    source: oneOf(text(item.source, "DRAW_VERSION_SOURCE_MISMATCH"), [
      "SYSTEM",
      "MANUAL_REVIEWED"
    ], "DRAW_VERSION_SOURCE_MISMATCH"),
    areas: readAreas(item.numbers),
    confirmedAt: nullableText(item.confirmedAt, "DRAW_VERSION_CONFIRMED_AT_MISMATCH"),
    correctionNote: nullableText(item.correctionNote, "DRAW_VERSION_NOTE_MISMATCH"),
    prizeReferenceStatus: oneOf(text(item.prizeReferenceStatus, "DRAW_VERSION_PRIZE_MISMATCH"), [
      "PENDING",
      "FINAL",
      "UNAVAILABLE",
      "SUPERSEDED"
    ], "DRAW_VERSION_PRIZE_MISMATCH")
  };
}
function readTaskAccepted(value) {
  const root = record(value, "TASK_ACCEPTED_MISMATCH");
  return {
    taskId: text(root.taskId, "TASK_ID_MISMATCH"),
    status: text(root.status, "TASK_STATUS_MISMATCH"),
    statusUrl: text(root.statusUrl, "TASK_URL_MISMATCH"),
    pollAfterSeconds: integer(root.pollAfterSeconds, "TASK_POLL_MISMATCH")
  };
}
function readActionAuthorization(value) {
  const root = record(value, "ACTION_AUTHORIZATION_MISMATCH");
  return {
    actionToken: text(root.actionToken, "ACTION_TOKEN_MISMATCH"),
    expiresAt: text(root.expiresAt, "ACTION_EXPIRY_MISMATCH")
  };
}
function readAdminPlay(value) {
  const play = record(value, "CATALOG_PLAY_MISMATCH");
  return {
    id: text(play.id, "CATALOG_PLAY_ID_MISMATCH"),
    code: text(play.code, "CATALOG_PLAY_CODE_MISMATCH"),
    name: text(play.name, "CATALOG_PLAY_NAME_MISMATCH"),
    ruleVersion: nullableText(play.ruleVersion, "CATALOG_PLAY_VERSION_MISMATCH"),
    readiness: oneOf(text(play.readiness, "CATALOG_PLAY_READINESS_MISMATCH"), [
      "READY",
      "CATALOG_UNCONFIRMED",
      "RULE_UNCONFIRMED",
      "DATA_UNAVAILABLE"
    ], "CATALOG_PLAY_READINESS_MISMATCH")
  };
}
function readAreas(value) {
  const numbers = record(value, "DRAW_NUMBERS_MISMATCH");
  return array(numbers.areas, "DRAW_AREAS_MISMATCH").map((value2) => {
    const area = record(value2, "DRAW_AREA_MISMATCH");
    return {
      key: text(area.key, "DRAW_AREA_KEY_MISMATCH"),
      chosen: array(area.chosen, "DRAW_AREA_VALUES_MISMATCH").map((value3) => integer(value3, "DRAW_AREA_VALUE_MISMATCH"))
    };
  });
}
function page2(root, code, reader) {
  return {
    items: array(root.items, code).map(reader),
    nextCursor: nullableText(root.nextCursor, code),
    hasMore: bool(root.hasMore, code)
  };
}
function record(value, code) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value;
}
function objectMap(value, code) {
  return { ...record(value, code) };
}
function array(value, code) {
  if (!Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value;
}
function text(value, code) {
  if (typeof value !== "string") {
    throw new TypeError(code);
  }
  return value;
}
function nullableText(value, code) {
  return value === null ? null : text(value, code);
}
function integer(value, code) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new TypeError(code);
  }
  return value;
}
function bool(value, code) {
  if (typeof value !== "boolean") {
    throw new TypeError(code);
  }
  return value;
}
function stringArray(value, code) {
  return array(value, code).map((item) => text(item, code));
}
function oneOf(value, allowed, code) {
  if (!allowed.includes(value)) {
    throw new TypeError(code);
  }
  return value;
}

// src/features/operations/operations-api.ts
async function getAdminCatalog() {
  const response = await publicApi.request("/api/v1/catalog");
  return readAdminCatalog(response.data);
}
async function listIssues(lotteryId, query = {}) {
  const response = await publicApi.request(
    `/api/v1/lotteries/${encodeURIComponent(lotteryId)}/issues`,
    {
      query: {
        limit: query.limit ?? 50,
        cursor: query.cursor,
        issueCode: query.issueCode,
        drawFrom: query.drawFrom,
        drawTo: query.drawTo
      }
    }
  );
  return readIssuePage(response.data);
}
async function getRuleDetail(playId, issueCode) {
  const response = await publicApi.request(
    `/api/v1/plays/${encodeURIComponent(playId)}/rules`,
    { query: { issueCode } }
  );
  return readRuleDetail(response.data);
}
async function getDataHealth() {
  const response = await adminApi.request("/api/admin/v1/data-health", {
    query: { limit: 100 }
  });
  return readDataHealthPage(response.data);
}
async function listDataSources() {
  const response = await adminApi.request("/api/admin/v1/lottery-sources", {
    query: { limit: 100 }
  });
  return readSourceHealthPage(response.data);
}
async function getAdminReport(reportType, query) {
  const response = await adminApi.request(
    `/api/admin/v1/reports/${encodeURIComponent(reportType)}`,
    {
      query: {
        from: query.from,
        to: query.to,
        stationId: query.stationId,
        lotteryId: query.lotteryId,
        status: query.status,
        limit: 100
      }
    }
  );
  return readReportResult(response.data);
}
async function listRuleDrafts(playId) {
  const response = await adminApi.request("/api/admin/v1/play-rule-versions", {
    query: { playId, limit: 100 }
  });
  return readRuleDraftPage(response.data);
}
async function listPolicies() {
  const response = await adminApi.request(
    "/api/admin/v1/simulation-policy-versions",
    { query: { limit: 100 } }
  );
  return readPolicyViewPage(response.data);
}
async function createRuleDraft(input) {
  const response = await adminApi.request("/api/admin/v1/play-rule-versions", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      playId: input.playId,
      effectiveFromIssue: input.effectiveFromIssue,
      ruleArtifactId: input.artifact.id,
      ruleArtifactHash: input.artifact.sha256,
      evidenceIds: [input.artifact.id],
      reason: input.reason
    }
  });
  return readRuleDraft(response.data);
}
async function createPolicyVersion(input) {
  const response = await adminApi.request(
    "/api/admin/v1/simulation-policy-versions",
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        code: input.code,
        artifactId: input.artifact.id,
        artifactHash: input.artifact.sha256,
        decisionIds: policyDecisionIds(input.code),
        reason: input.reason
      }
    }
  );
  return readPolicyView(response.data);
}
async function listDrawCandidates(lotteryId, issueCode) {
  const response = await adminApi.request(
    `/api/admin/v1/lotteries/${encodeURIComponent(lotteryId)}/issues/${encodeURIComponent(issueCode)}/draw-candidates`,
    { query: { limit: 100 } }
  );
  return readDrawCandidatePage(response.data);
}
async function listDrawVersions(lotteryId, issueCode) {
  const response = await adminApi.request(
    `/api/admin/v1/lotteries/${encodeURIComponent(lotteryId)}/issues/${encodeURIComponent(issueCode)}/draw-versions`,
    { query: { limit: 100 } }
  );
  return readDrawVersionPage(response.data);
}
async function reviewDrawCandidate(input) {
  const expectedHash = await canonicalDigest([
    "DRAW_CONFIRM",
    input.candidate.id,
    input.candidate.version,
    input.decision,
    input.reason
  ]);
  const action = await authorizeAction({
    purpose: "DRAW_CONFIRM",
    resourceId: input.candidate.id,
    expectedHash,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode
  });
  await adminApi.request(
    `/api/admin/v1/draw-candidates/${encodeURIComponent(input.candidate.id)}/reviews`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      ifMatch: `"${input.candidate.version}"`,
      actionToken: action.actionToken,
      body: { decision: input.decision, reason: input.reason }
    }
  );
}
async function reviewRuleDraft(input) {
  const expectedHash = await canonicalDigest([
    "PLAY_RULE_APPROVE",
    input.rule.id,
    input.rule.version,
    input.rule.recordVersion,
    input.decision,
    input.reason
  ]);
  const action = await authorizeAction({
    purpose: "PLAY_RULE_APPROVE",
    resourceId: input.rule.id,
    expectedHash,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode
  });
  const response = await adminApi.request(
    `/api/admin/v1/play-rule-versions/${encodeURIComponent(input.rule.id)}/reviews`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      actionToken: action.actionToken,
      body: { decision: input.decision, reason: input.reason }
    }
  );
  return readRuleDraft(response.data);
}
async function rebuildOmissions(input) {
  const response = await adminApi.request("/api/admin/v1/omission-rebuilds", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      lotteryId: input.lotteryId,
      fromIssueCode: input.fromIssueCode,
      expectedDrawVersionSetHash: input.expectedDrawVersionSetHash,
      reason: input.reason
    }
  });
  return readTaskAccepted(response.data);
}
async function listOmissionGaps(lotteryId) {
  const response = await adminApi.request("/api/admin/v1/omission-gaps", {
    query: { lotteryId }
  });
  return readOmissionGapPage(response.data);
}
async function uploadEvidence(file, purpose, keys) {
  return storeEvidenceFile(file, purpose);
}
async function authorizeAction(input) {
  const response = await adminApi.request("/api/admin/v1/action-authorizations", {
    method: "POST",
    body: {
      purpose: input.purpose,
      targetType: "EXISTING_RESOURCE",
      resourceId: input.resourceId,
      expectedInputVersionSetHash: input.expectedHash,
      expectedAmount: input.expectedAmount ?? null,
      finalIdempotencyKey: input.finalIdempotencyKey,
      proofCode: input.proofCode
    }
  });
  return readActionAuthorization(response.data);
}
function policyDecisionIds(code) {
  switch (code) {
    case "SIMULATION_AWARD":
      return ["D02"];
    case "REFERRAL_FIXED":
      return ["D06"];
    case "REFERRAL_AI_SHARE":
      return ["D07"];
  }
}
async function canonicalDigest(fields) {
  const encoder2 = new TextEncoder();
  const chunks = [];
  let length = 0;
  for (const field of fields) {
    const value = encoder2.encode(field);
    const prefix = encoder2.encode(`${value.length}:`);
    const suffix = encoder2.encode(";");
    chunks.push(prefix, value, suffix);
    length += prefix.length + value.length + suffix.length;
  }
  const canonical = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    canonical.set(chunk, offset);
    offset += chunk.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", canonical);
  return hex(new Uint8Array(digest));
}
function hex(value) {
  return [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// src/features/robots/robot-models.ts
var strategyCodes = [
  "BALANCED",
  "TREND_FOLLOWING",
  "HOT_COLD_MIX",
  "ELIMINATION",
  "ENSEMBLE",
  "EXPLORATION"
];
var features = [
  "STRUCTURE",
  "TREND",
  "HOT_COLD",
  "OMISSION",
  "FREQUENCY",
  "RETENTION",
  "DIVERSITY",
  "EXPLORATION",
  "AGREEMENT"
];
function readRobotAdmin(value) {
  const root = record2(value, "ROBOT_ADMIN_MISMATCH");
  return {
    robot: readRobotPublic(root.robot),
    status: oneOf2(root.status, ["ENABLED", "DISABLED"], "ROBOT_STATUS_MISMATCH"),
    strategy: readStrategyConfig(root.strategy),
    strategyVersion: text2(root.strategyVersion, "ROBOT_STRATEGY_VERSION_MISMATCH"),
    generationMode: oneOf2(
      root.generationMode,
      ["PER_ISSUE", "DAILY", "MANUAL"],
      "ROBOT_GENERATION_MODE_MISMATCH"
    ),
    generationTime: nullableText2(root.generationTime, "ROBOT_GENERATION_TIME_MISMATCH"),
    currentLotteryCount: text2(root.currentLotteryCount, "ROBOT_LOTTERY_COUNT_MISMATCH"),
    currentPlayCount: text2(root.currentPlayCount, "ROBOT_PLAY_COUNT_MISMATCH"),
    currentBetCount: text2(root.currentBetCount, "ROBOT_BET_COUNT_MISMATCH"),
    currentPricePoints: text2(root.currentPricePoints, "ROBOT_PRICE_MISMATCH"),
    latestExecutionAt: nullableText2(root.latestExecutionAt, "ROBOT_EXECUTION_TIME_MISMATCH"),
    version: text2(root.version, "ROBOT_VERSION_MISMATCH")
  };
}
function readRobotAdminPage(value) {
  return readPage(value, readRobotAdmin, "ROBOT_ADMIN");
}
function readStrategyDefinitionPage(value) {
  return readPage(value, (item) => {
    const root = record2(item, "STRATEGY_DEFINITION_MISMATCH");
    return {
      code: oneOf2(root.code, strategyCodes, "STRATEGY_CODE_MISMATCH"),
      label: text2(root.label, "STRATEGY_LABEL_MISMATCH"),
      description: text2(root.description, "STRATEGY_DESCRIPTION_MISMATCH"),
      schemaRef: text2(root.schemaRef, "STRATEGY_SCHEMA_MISMATCH"),
      defaultConfig: readStrategyConfig(root.defaultConfig)
    };
  }, "STRATEGY_DEFINITION");
}
function readRecommendationPage(value) {
  return readPage(value, readRecommendation, "RECOMMENDATION");
}
function readTaskStatusPage(value) {
  return readPage(value, readTaskStatus2, "ROBOT_EXECUTION");
}
function readTaskAccepted2(value) {
  const root = record2(value, "TASK_ACCEPTED_MISMATCH");
  return {
    taskId: text2(root.taskId, "TASK_ID_MISMATCH"),
    status: oneOf2(
      root.status,
      ["PENDING", "RUNNING", "RETRY_WAIT"],
      "TASK_ACCEPTED_STATUS_MISMATCH"
    ),
    statusUrl: text2(root.statusUrl, "TASK_URL_MISMATCH"),
    pollAfterSeconds: integer2(root.pollAfterSeconds, "TASK_POLL_MISMATCH")
  };
}
function readTaskStatus2(value) {
  const root = record2(value, "TASK_STATUS_MISMATCH");
  return {
    id: text2(root.id, "TASK_STATUS_ID_MISMATCH"),
    taskType: text2(root.taskType, "TASK_TYPE_MISMATCH"),
    status: oneOf2(
      root.status,
      ["PENDING", "RUNNING", "RETRY_WAIT", "SUCCEEDED", "FAILED", "CANCELLED"],
      "TASK_STATUS_VALUE_MISMATCH"
    ),
    progress: number(root.progress, "TASK_PROGRESS_MISMATCH"),
    resultUrl: nullableText2(root.resultUrl, "TASK_RESULT_URL_MISMATCH"),
    resultCode: nullableText2(root.resultCode, "TASK_RESULT_CODE_MISMATCH"),
    failureCode: nullableText2(root.failureCode, "TASK_FAILURE_CODE_MISMATCH"),
    updatedAt: text2(root.updatedAt, "TASK_UPDATED_AT_MISMATCH")
  };
}
function readRobotPublic(value) {
  const root = record2(value, "ROBOT_PUBLIC_MISMATCH");
  const performance = record2(root.performance, "ROBOT_PERFORMANCE_MISMATCH");
  const scoreLabel = text2(root.scoreLabel, "ROBOT_SCORE_LABEL_MISMATCH");
  if (scoreLabel !== "\u63A8\u8350\u8BC4\u5206") throw new TypeError("ROBOT_SCORE_LABEL_MISMATCH");
  return {
    id: text2(root.id, "ROBOT_ID_MISMATCH"),
    name: text2(root.name, "ROBOT_NAME_MISMATCH"),
    strategyCode: oneOf2(root.strategyCode, strategyCodes, "ROBOT_STRATEGY_MISMATCH"),
    strategyLabel: text2(root.strategyLabel, "ROBOT_STRATEGY_LABEL_MISMATCH"),
    strategyDescription: text2(root.strategyDescription, "ROBOT_DESCRIPTION_MISMATCH"),
    lotteryIds: stringArray2(root.lotteryIds, "ROBOT_LOTTERIES_MISMATCH"),
    performance: {
      settledGroups: text2(performance.settledGroups, "ROBOT_SETTLED_MISMATCH"),
      hitGroups: text2(performance.hitGroups, "ROBOT_HIT_MISMATCH"),
      hitRate: nullableText2(performance.hitRate, "ROBOT_HIT_RATE_MISMATCH"),
      asOf: text2(performance.asOf, "ROBOT_PERFORMANCE_TIME_MISMATCH")
    },
    currentGroups: text2(root.currentGroups, "ROBOT_GROUPS_MISMATCH"),
    recommendationScore: nullableNumber(root.recommendationScore, "ROBOT_SCORE_MISMATCH"),
    scoreLabel
  };
}
function readStrategyConfig(value) {
  const root = record2(value, "STRATEGY_CONFIG_MISMATCH");
  const code = oneOf2(root.code, strategyCodes, "STRATEGY_CODE_MISMATCH");
  const common = readStrategyCommon(root.common);
  switch (code) {
    case "BALANCED":
      return { code, common };
    case "TREND_FOLLOWING":
      return {
        code,
        common,
        maxTrendNumbers: integer2(root.maxTrendNumbers, "STRATEGY_TREND_COUNT_MISMATCH"),
        trendThreshold: number(root.trendThreshold, "STRATEGY_TREND_THRESHOLD_MISMATCH")
      };
    case "HOT_COLD_MIX":
      return {
        code,
        common,
        hotBasisPoints: integer2(root.hotBasisPoints, "STRATEGY_HOT_WEIGHT_MISMATCH"),
        warmBasisPoints: integer2(root.warmBasisPoints, "STRATEGY_WARM_WEIGHT_MISMATCH"),
        normalBasisPoints: integer2(root.normalBasisPoints, "STRATEGY_NORMAL_WEIGHT_MISMATCH"),
        coldBasisPoints: integer2(root.coldBasisPoints, "STRATEGY_COLD_WEIGHT_MISMATCH")
      };
    case "ELIMINATION": {
      const enabled = bool2(root.hardEliminationEnabled, "STRATEGY_ELIMINATION_MODE_MISMATCH");
      if (enabled) throw new TypeError("STRATEGY_ELIMINATION_MODE_MISMATCH");
      return {
        code,
        common,
        hardEliminationEnabled: false,
        maxEliminationRate: text2(root.maxEliminationRate, "STRATEGY_ELIMINATION_RATE_MISMATCH")
      };
    }
    case "ENSEMBLE":
      return {
        code,
        common,
        agreementWeightBasisPoints: integer2(
          root.agreementWeightBasisPoints,
          "STRATEGY_AGREEMENT_WEIGHT_MISMATCH"
        )
      };
    case "EXPLORATION":
      return { code, common };
  }
}
function readStrategyCommon(value) {
  const root = record2(value, "STRATEGY_COMMON_MISMATCH");
  return {
    shortWindow: integer2(root.shortWindow, "STRATEGY_SHORT_WINDOW_MISMATCH"),
    mediumWindow: integer2(root.mediumWindow, "STRATEGY_MEDIUM_WINDOW_MISMATCH"),
    longWindow: integer2(root.longWindow, "STRATEGY_LONG_WINDOW_MISMATCH"),
    maxGroupsPerPlay: integer2(root.maxGroupsPerPlay, "STRATEGY_GROUP_LIMIT_MISMATCH"),
    candidateMultiplier: integer2(root.candidateMultiplier, "STRATEGY_CANDIDATE_RATE_MISMATCH"),
    minRecommendationScore: number(root.minRecommendationScore, "STRATEGY_MIN_SCORE_MISMATCH"),
    maxPointsPerIssue: text2(root.maxPointsPerIssue, "STRATEGY_BUDGET_MISMATCH"),
    explorationRate: text2(root.explorationRate, "STRATEGY_EXPLORATION_RATE_MISMATCH"),
    minDiversityRate: text2(root.minDiversityRate, "STRATEGY_DIVERSITY_RATE_MISMATCH"),
    maxRerunsPerIssue: integer2(root.maxRerunsPerIssue, "STRATEGY_RERUN_LIMIT_MISMATCH"),
    weights: array2(root.weights, "STRATEGY_WEIGHTS_MISMATCH").map((item) => {
      const weight = record2(item, "STRATEGY_WEIGHT_MISMATCH");
      return {
        feature: oneOf2(weight.feature, features, "STRATEGY_FEATURE_MISMATCH"),
        basisPoints: integer2(weight.basisPoints, "STRATEGY_WEIGHT_VALUE_MISMATCH")
      };
    })
  };
}
function readRecommendation(value) {
  const root = record2(value, "RECOMMENDATION_MISMATCH");
  const selection = record2(root.selection, "RECOMMENDATION_SELECTION_MISMATCH");
  const outcome = record2(root.outcome, "RECOMMENDATION_OUTCOME_MISMATCH");
  return {
    id: text2(root.id, "RECOMMENDATION_ID_MISMATCH"),
    executionId: text2(root.executionId, "RECOMMENDATION_EXECUTION_MISMATCH"),
    robotId: text2(root.robotId, "RECOMMENDATION_ROBOT_MISMATCH"),
    lotteryId: text2(root.lotteryId, "RECOMMENDATION_LOTTERY_MISMATCH"),
    playId: text2(root.playId, "RECOMMENDATION_PLAY_MISMATCH"),
    issueCode: text2(root.issueCode, "RECOMMENDATION_ISSUE_MISMATCH"),
    selection: {
      schemaId: text2(selection.schemaId, "RECOMMENDATION_SCHEMA_MISMATCH"),
      schemaVersion: text2(selection.schemaVersion, "RECOMMENDATION_SCHEMA_VERSION_MISMATCH"),
      mode: oneOf2(
        selection.mode,
        ["SINGLE", "MULTIPLE", "DANTUO", "POSITIONAL", "GROUP"],
        "RECOMMENDATION_MODE_MISMATCH"
      ),
      areas: array2(selection.areas, "RECOMMENDATION_AREAS_MISMATCH").map((item) => {
        const area = record2(item, "RECOMMENDATION_AREA_MISMATCH");
        return {
          key: text2(area.key, "RECOMMENDATION_AREA_KEY_MISMATCH"),
          chosen: optionalNumberArray(area.chosen, "RECOMMENDATION_CHOSEN_MISMATCH"),
          dan: optionalNumberArray(area.dan, "RECOMMENDATION_DAN_MISMATCH"),
          tuo: optionalNumberArray(area.tuo, "RECOMMENDATION_TUO_MISMATCH")
        };
      })
    },
    recommendationScore: number(root.recommendationScore, "RECOMMENDATION_SCORE_MISMATCH"),
    betCount: text2(root.betCount, "RECOMMENDATION_BETS_MISMATCH"),
    pricePoints: text2(root.pricePoints, "RECOMMENDATION_PRICE_MISMATCH"),
    strategyVersion: text2(root.strategyVersion, "RECOMMENDATION_STRATEGY_VERSION_MISMATCH"),
    generationVersion: text2(root.generationVersion, "RECOMMENDATION_GENERATION_VERSION_MISMATCH"),
    algorithmVersion: text2(root.algorithmVersion, "RECOMMENDATION_ALGORITHM_MISMATCH"),
    ruleVersion: text2(root.ruleVersion, "RECOMMENDATION_RULE_VERSION_MISMATCH"),
    scoreBreakdown: array2(root.scoreBreakdown, "RECOMMENDATION_SCORES_MISMATCH").map((item) => {
      const component = record2(item, "RECOMMENDATION_SCORE_COMPONENT_MISMATCH");
      return {
        feature: oneOf2(component.feature, features, "RECOMMENDATION_FEATURE_MISMATCH"),
        score: number(component.score, "RECOMMENDATION_FEATURE_SCORE_MISMATCH"),
        weightBasisPoints: integer2(component.weightBasisPoints, "RECOMMENDATION_WEIGHT_MISMATCH")
      };
    }),
    explanations: stringArray2(root.explanations, "RECOMMENDATION_EXPLANATIONS_MISMATCH"),
    cutoffAt: text2(root.cutoffAt, "RECOMMENDATION_CUTOFF_MISMATCH"),
    outcome: {
      status: oneOf2(
        outcome.status,
        ["PENDING", "HIT", "MISS"],
        "RECOMMENDATION_OUTCOME_STATUS_MISMATCH"
      ),
      drawVersion: nullableText2(outcome.drawVersion, "RECOMMENDATION_DRAW_VERSION_MISMATCH"),
      verifiedAt: nullableText2(outcome.verifiedAt, "RECOMMENDATION_VERIFIED_TIME_MISMATCH")
    },
    generatedAt: text2(root.generatedAt, "RECOMMENDATION_GENERATED_TIME_MISMATCH"),
    status: oneOf2(
      root.status,
      ["PREVIEW", "PUBLISHED", "SUPERSEDED", "CLOSED"],
      "RECOMMENDATION_STATUS_MISMATCH"
    )
  };
}
function readPage(value, reader, prefix) {
  const root = record2(value, `${prefix}_PAGE_MISMATCH`);
  return {
    items: array2(root.items, `${prefix}_ITEMS_MISMATCH`).map(reader),
    nextCursor: nullableText2(root.nextCursor, `${prefix}_CURSOR_MISMATCH`),
    hasMore: bool2(root.hasMore, `${prefix}_MORE_MISMATCH`),
    snapshotId: nullableText2(root.snapshotId, `${prefix}_SNAPSHOT_MISMATCH`)
  };
}
function record2(value, code) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(code);
  return value;
}
function array2(value, code) {
  if (!Array.isArray(value)) throw new TypeError(code);
  return value;
}
function text2(value, code) {
  if (typeof value !== "string") throw new TypeError(code);
  return value;
}
function nullableText2(value, code) {
  return value === null ? null : text2(value, code);
}
function stringArray2(value, code) {
  return array2(value, code).map((item) => text2(item, code));
}
function optionalNumberArray(value, code) {
  if (value === null || value === void 0) return [];
  return array2(value, code).map((item) => integer2(item, code));
}
function number(value, code) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(code);
  return value;
}
function nullableNumber(value, code) {
  return value === null ? null : number(value, code);
}
function integer2(value, code) {
  const parsed = number(value, code);
  if (!Number.isInteger(parsed)) throw new TypeError(code);
  return parsed;
}
function bool2(value, code) {
  if (typeof value !== "boolean") throw new TypeError(code);
  return value;
}
function oneOf2(value, allowed, code) {
  const parsed = text2(value, code);
  if (!allowed.includes(parsed)) throw new TypeError(code);
  return parsed;
}

// src/features/robots/robots-api.ts
async function listRobotStrategies() {
  const response = await adminApi.request("/api/admin/v1/robot-strategies", {
    query: { limit: 20 }
  });
  return readStrategyDefinitionPage(response.data);
}
async function listAdminRobots(query = {}) {
  const response = await adminApi.request("/api/admin/v1/robot-masters", {
    query: {
      status: query.status,
      lotteryId: query.lotteryId,
      keyword: query.keyword,
      cursor: query.cursor,
      limit: query.limit ?? 20
    }
  });
  return readRobotAdminPage(response.data);
}
async function createRobot(input, idempotencyKey) {
  const response = await adminApi.request("/api/admin/v1/robot-masters", {
    method: "POST",
    idempotencyKey,
    body: input
  });
  return readRobotAdmin(response.data);
}
async function getAdminRobot(robotId) {
  const response = await adminApi.request(
    `/api/admin/v1/robot-masters/${encodeURIComponent(robotId)}`
  );
  return readRobotAdmin(response.data);
}
async function deleteRobot(robot, idempotencyKey) {
  await adminApi.request(
    `/api/admin/v1/robot-masters/${encodeURIComponent(robot.robot.id)}`,
    {
      method: "DELETE",
      idempotencyKey,
      ifMatch: `"${robot.version}"`
    }
  );
}
async function previewRobot(input) {
  return generate("previews", input);
}
async function listRobotExecutions(robotId, cursor) {
  const response = await adminApi.request(
    `/api/admin/v1/robot-masters/${encodeURIComponent(robotId)}/executions`,
    { query: { cursor, limit: 20 } }
  );
  return readTaskStatusPage(response.data);
}
async function listAdminRecommendations(robotId, input = {}) {
  const response = await adminApi.request(
    `/api/admin/v1/robot-masters/${encodeURIComponent(robotId)}/recommendations`,
    {
      query: {
        executionId: input.executionId,
        cursor: input.cursor,
        limit: 50
      }
    }
  );
  return readRecommendationPage(response.data);
}
async function generate(kind, input) {
  const response = await adminApi.request(
    `/api/admin/v1/robot-masters/${encodeURIComponent(input.robotId)}/${kind}`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        lotteryId: input.lotteryId,
        issueCode: input.issueCode,
        reason: input.reason
      }
    }
  );
  return readTaskAccepted2(response.data);
}

// src/features/member-management/member-models.ts
function readMemberAdminPage(value) {
  const root = record3(value, "MEMBER_PAGE_MISMATCH");
  return { ...readPage2(value, readMemberAdmin, "MEMBER_PAGE_MISMATCH"), totalCount: integer3(root.totalCount, "MEMBER_TOTAL_MISMATCH") };
}
function readMemberAdmin(value) {
  const root = record3(value, "MEMBER_MISMATCH");
  return {
    id: text3(root.id, "MEMBER_ID_MISMATCH"),
    account: text3(root.account, "MEMBER_ACCOUNT_MISMATCH"),
    displayName: text3(root.displayName, "MEMBER_NAME_MISMATCH"),
    status: oneOf3(text3(root.status, "MEMBER_STATUS_MISMATCH"), ["ENABLED", "DISABLED"], "MEMBER_STATUS_MISMATCH"),
    scope: readScope(root.scope),
    qualifiedRechargePoints: text3(root.qualifiedRechargePoints, "MEMBER_RECHARGE_MISMATCH"),
    stationDeductedPoints: text3(root.stationDeductedPoints, "MEMBER_DEDUCT_MISMATCH"),
    wallet: readWallet(root.wallet),
    vipName: text3(root.vipName, "MEMBER_VIP_MISMATCH"),
    referralName: text3(root.referralName, "MEMBER_REFERRAL_MISMATCH"),
    quota: readQuota(root.quota),
    totalBetPoints: text3(root.totalBetPoints, "MEMBER_BET_MISMATCH"),
    netProfitPoints: text3(root.netProfitPoints, "MEMBER_PROFIT_MISMATCH"),
    aiDividendPoints: text3(root.aiDividendPoints, "MEMBER_AI_DIVIDEND_MISMATCH"),
    totalReferralPoints: text3(root.totalReferralPoints, "MEMBER_REFERRAL_POINTS_MISMATCH"),
    directMemberCount: integer3(root.directMemberCount, "MEMBER_DIRECT_COUNT_MISMATCH"),
    directMemberAvailableTotal: text3(root.directMemberAvailableTotal, "MEMBER_DIRECT_POINTS_MISMATCH"),
    descendantMemberCount: integer3(root.descendantMemberCount, "MEMBER_DESCENDANT_COUNT_MISMATCH"),
    descendantMemberAvailableTotal: text3(root.descendantMemberAvailableTotal, "MEMBER_DESCENDANT_POINTS_MISMATCH"),
    inviteCode: text3(root.inviteCode, "MEMBER_INVITE_CODE_MISMATCH"),
    version: text3(root.version, "MEMBER_VERSION_MISMATCH")
  };
}
function readLedgerPage(value) {
  return readPage2(value, (item) => {
    const root = record3(item, "LEDGER_MISMATCH");
    return {
      id: text3(root.id, "LEDGER_ID_MISMATCH"),
      transactionId: text3(root.transactionId, "LEDGER_TRANSACTION_MISMATCH"),
      type: text3(root.type, "LEDGER_TYPE_MISMATCH"),
      bucket: oneOf3(text3(root.bucket, "LEDGER_BUCKET_MISMATCH"), ["AVAILABLE", "RESERVED", "DISPOSABLE"], "LEDGER_BUCKET_MISMATCH"),
      changePoints: text3(root.changePoints, "LEDGER_CHANGE_MISMATCH"),
      balanceBefore: text3(root.balanceBefore, "LEDGER_BEFORE_MISMATCH"),
      balanceAfter: text3(root.balanceAfter, "LEDGER_AFTER_MISMATCH"),
      sourceType: text3(root.sourceType, "LEDGER_SOURCE_MISMATCH"),
      sourceId: text3(root.sourceId, "LEDGER_SOURCE_ID_MISMATCH"),
      remark: text3(root.remark, "LEDGER_REMARK_MISMATCH"),
      createdAt: text3(root.createdAt, "LEDGER_TIME_MISMATCH")
    };
  }, "LEDGER_PAGE_MISMATCH");
}
function readOrderPage(value) {
  return readPage2(value, (item) => {
    const root = record3(item, "ORDER_MISMATCH");
    return {
      id: text3(root.id, "ORDER_ID_MISMATCH"),
      type: oneOf3(text3(root.type, "ORDER_TYPE_MISMATCH"), ["ORDINARY", "AI_POOL"], "ORDER_TYPE_MISMATCH"),
      projectId: nullableText3(root.projectId, "ORDER_PROJECT_MISMATCH"),
      projectName: nullableText3(root.projectName, "ORDER_PROJECT_NAME_MISMATCH"),
      lotteryId: text3(root.lotteryId, "ORDER_LOTTERY_MISMATCH"),
      playId: text3(root.playId, "ORDER_PLAY_MISMATCH"),
      issueCode: text3(root.issueCode, "ORDER_ISSUE_MISMATCH"),
      status: text3(root.status, "ORDER_STATUS_MISMATCH"),
      purchasePoints: text3(root.purchasePoints, "ORDER_PURCHASE_MISMATCH"),
      dueAwardPoints: nullableText3(root.dueAwardPoints, "ORDER_DUE_MISMATCH"),
      netPostedAwardPoints: text3(root.netPostedAwardPoints, "ORDER_POSTED_MISMATCH"),
      refundPoints: text3(root.refundPoints, "ORDER_REFUND_MISMATCH"),
      settlementVersion: nullableText3(root.settlementVersion, "ORDER_SETTLEMENT_MISMATCH"),
      createdAt: text3(root.createdAt, "ORDER_TIME_MISMATCH"),
      detailUrl: text3(root.detailUrl, "ORDER_URL_MISMATCH")
    };
  }, "ORDER_PAGE_MISMATCH");
}
function readVipConfig(value) {
  const root = record3(value, "VIP_CONFIG_MISMATCH");
  return {
    version: text3(root.version, "VIP_VERSION_MISMATCH"),
    levels: array3(root.levels, "VIP_LEVELS_MISMATCH").map(readVipLevel),
    createdAt: nullableText3(root.createdAt, "VIP_CREATED_MISMATCH"),
    qualificationStatus: qualificationStatus(root.qualificationStatus)
  };
}
function readVipConfigPage(value) {
  return readPage2(value, readVipConfig, "VIP_HISTORY_MISMATCH");
}
function readReferralConfig(value) {
  const root = record3(value, "REFERRAL_CONFIG_MISMATCH");
  return {
    version: text3(root.version, "REFERRAL_VERSION_MISMATCH"),
    levels: array3(root.levels, "REFERRAL_LEVELS_MISMATCH").map(readReferralLevel),
    fixedRewardPolicyVersion: nullableText3(root.fixedRewardPolicyVersion, "REFERRAL_FIXED_POLICY_MISMATCH"),
    aiSharePolicyVersion: nullableText3(root.aiSharePolicyVersion, "REFERRAL_SHARE_POLICY_MISMATCH"),
    qualificationStatus: qualificationStatus(root.qualificationStatus)
  };
}
function readReferralConfigPage(value) {
  return readPage2(value, readReferralConfig, "REFERRAL_HISTORY_MISMATCH");
}
function readCommandReceipt(value) {
  const root = record3(value, "COMMAND_RECEIPT_MISMATCH");
  return {
    commandId: text3(root.commandId, "COMMAND_ID_MISMATCH"),
    operationId: text3(root.operationId, "COMMAND_OPERATION_MISMATCH"),
    resourceId: text3(root.resourceId, "COMMAND_RESOURCE_MISMATCH"),
    status: oneOf3(text3(root.status, "COMMAND_STATUS_MISMATCH"), ["ACCEPTED", "COMPLETED"], "COMMAND_STATUS_MISMATCH"),
    createdAt: text3(root.createdAt, "COMMAND_TIME_MISMATCH")
  };
}
function readTaskAccepted3(value) {
  const root = record3(value, "TASK_ACCEPTED_MISMATCH");
  return {
    taskId: text3(root.taskId, "TASK_ID_MISMATCH"),
    status: oneOf3(text3(root.status, "TASK_STATUS_MISMATCH"), ["PENDING", "RUNNING", "RETRY_WAIT"], "TASK_STATUS_MISMATCH"),
    statusUrl: text3(root.statusUrl, "TASK_URL_MISMATCH"),
    pollAfterSeconds: integer3(root.pollAfterSeconds, "TASK_POLL_MISMATCH")
  };
}
function readReportResult2(value) {
  const root = record3(value, "REPORT_MISMATCH");
  const reportType = oneOf3(text3(root.reportType, "REPORT_TYPE_MISMATCH"), ["MEMBER_OVERVIEW", "MEMBER_POINTS", "VIP_LEVELS", "REFERRAL_LEVELS", "AI_QUOTA"], "REPORT_TYPE_MISMATCH");
  return {
    reportType,
    metricDictionaryVersion: text3(root.metricDictionaryVersion, "REPORT_DICTIONARY_MISMATCH"),
    snapshotId: text3(root.snapshotId, "REPORT_SNAPSHOT_MISMATCH"),
    filters: readReportFilter(root.filters),
    asOf: text3(root.asOf, "REPORT_AS_OF_MISMATCH"),
    projectionVersion: text3(root.projectionVersion, "REPORT_PROJECTION_MISMATCH"),
    sourceWatermark: text3(root.sourceWatermark, "REPORT_WATERMARK_MISMATCH"),
    items: array3(root.items, "REPORT_ROWS_MISMATCH").map((item) => {
      const row = record3(item, "REPORT_ROW_MISMATCH");
      return {
        dimensions: record3(row.dimensions, "REPORT_DIMENSIONS_MISMATCH"),
        metrics: record3(row.metrics, "REPORT_METRICS_MISMATCH")
      };
    }),
    totals: record3(root.totals, "REPORT_TOTALS_MISMATCH"),
    totalScope: oneOf3(text3(root.totalScope, "REPORT_TOTAL_SCOPE_MISMATCH"), ["FULL_FILTER"], "REPORT_TOTAL_SCOPE_MISMATCH"),
    nextCursor: nullableText3(root.nextCursor, "REPORT_CURSOR_MISMATCH"),
    hasMore: bool3(root.hasMore, "REPORT_MORE_MISMATCH"),
    complete: bool3(root.complete, "REPORT_COMPLETE_MISMATCH")
  };
}
function readActionAuthorization2(value) {
  const root = record3(value, "ACTION_AUTHORIZATION_MISMATCH");
  return {
    actionToken: text3(root.actionToken, "ACTION_TOKEN_MISMATCH"),
    expiresAt: text3(root.expiresAt, "ACTION_EXPIRES_MISMATCH")
  };
}
function readVipLevel(value) {
  const root = record3(value, "VIP_LEVEL_MISMATCH");
  return {
    id: text3(root.id, "VIP_LEVEL_ID_MISMATCH"),
    levelNo: integer3(root.levelNo, "VIP_LEVEL_NO_MISMATCH"),
    name: text3(root.name, "VIP_LEVEL_NAME_MISMATCH"),
    requiredRechargePoints: text3(root.requiredRechargePoints, "VIP_LEVEL_THRESHOLD_MISMATCH"),
    aiPoolBaseDailyLimit: text3(root.aiPoolBaseDailyLimit, "VIP_LEVEL_LIMIT_MISMATCH")
  };
}
function readReferralLevel(value) {
  const root = record3(value, "REFERRAL_LEVEL_MISMATCH");
  return {
    id: text3(root.id, "REFERRAL_LEVEL_ID_MISMATCH"),
    levelNo: integer3(root.levelNo, "REFERRAL_LEVEL_NO_MISMATCH"),
    name: text3(root.name, "REFERRAL_LEVEL_NAME_MISMATCH"),
    requiredDirectValidMembers: integer3(root.requiredDirectValidMembers, "REFERRAL_LEVEL_COUNT_MISMATCH"),
    validRechargePoints: text3(root.validRechargePoints, "REFERRAL_LEVEL_RECHARGE_MISMATCH"),
    fixedRewardPoints: text3(root.fixedRewardPoints, "REFERRAL_LEVEL_REWARD_MISMATCH"),
    directAiShareRate: text3(root.directAiShareRate, "REFERRAL_LEVEL_RATE_MISMATCH"),
    aiExtraDailyLimit: text3(root.aiExtraDailyLimit, "REFERRAL_LEVEL_LIMIT_MISMATCH"),
    status: oneOf3(text3(root.status, "REFERRAL_LEVEL_STATUS_MISMATCH"), ["ENABLED", "DISABLED"], "REFERRAL_LEVEL_STATUS_MISMATCH")
  };
}
function readScope(value) {
  const root = record3(value, "MEMBER_SCOPE_MISMATCH");
  return {
    station: readNameRef(root.station, "MEMBER_STATION_MISMATCH"),
    stationMaster: readNameRef(root.stationMaster, "MEMBER_MASTER_MISMATCH"),
    referrerMember: root.referrerMember === null ? null : readNameRef(root.referrerMember, "MEMBER_REFERRER_MISMATCH"),
    version: text3(root.version, "MEMBER_SCOPE_VERSION_MISMATCH")
  };
}
function readNameRef(value, code) {
  const root = record3(value, code);
  return {
    id: text3(root.id, code),
    code: text3(root.code, code),
    name: text3(root.name, code)
  };
}
function readWallet(value) {
  const root = record3(value, "MEMBER_WALLET_MISMATCH");
  return {
    availablePoints: text3(root.availablePoints, "MEMBER_AVAILABLE_MISMATCH"),
    reservedPoints: text3(root.reservedPoints, "MEMBER_RESERVED_MISMATCH"),
    asOf: text3(root.asOf, "MEMBER_WALLET_TIME_MISMATCH"),
    ledgerWatermark: text3(root.ledgerWatermark, "MEMBER_LEDGER_WATERMARK_MISMATCH")
  };
}
function readQuota(value) {
  const root = record3(value, "MEMBER_QUOTA_MISMATCH");
  return {
    businessDate: text3(root.businessDate, "MEMBER_QUOTA_DATE_MISMATCH"),
    timeZone: text3(root.timeZone, "MEMBER_QUOTA_ZONE_MISMATCH"),
    vipBaseLimit: text3(root.vipBaseLimit, "MEMBER_VIP_LIMIT_MISMATCH"),
    referralExtraLimit: text3(root.referralExtraLimit, "MEMBER_REFERRAL_LIMIT_MISMATCH"),
    totalLimit: text3(root.totalLimit, "MEMBER_TOTAL_LIMIT_MISMATCH"),
    usedPoints: text3(root.usedPoints, "MEMBER_USED_LIMIT_MISMATCH"),
    remainingPoints: text3(root.remainingPoints, "MEMBER_REMAINING_LIMIT_MISMATCH"),
    eligibilityStatus: oneOf3(text3(root.eligibilityStatus, "MEMBER_ELIGIBILITY_MISMATCH"), ["READY", "UPDATING", "UNAVAILABLE"], "MEMBER_ELIGIBILITY_MISMATCH"),
    qualificationVersion: text3(root.qualificationVersion, "MEMBER_QUALIFICATION_VERSION_MISMATCH"),
    vipConfigVersion: text3(root.vipConfigVersion, "MEMBER_VIP_VERSION_MISMATCH"),
    referralConfigVersion: text3(root.referralConfigVersion, "MEMBER_REFERRAL_VERSION_MISMATCH"),
    asOf: text3(root.asOf, "MEMBER_QUOTA_TIME_MISMATCH")
  };
}
function readReportFilter(value) {
  const root = record3(value, "REPORT_FILTER_MISMATCH");
  const result = {
    from: text3(root.from, "REPORT_FROM_MISMATCH"),
    to: text3(root.to, "REPORT_TO_MISMATCH")
  };
  if (typeof root.asOf === "string") result.asOf = root.asOf;
  if (typeof root.stationId === "string") result.stationId = root.stationId;
  if (typeof root.stationMasterId === "string") result.stationMasterId = root.stationMasterId;
  if (typeof root.memberId === "string") result.memberId = root.memberId;
  if (typeof root.vipLevelId === "string") result.vipLevelId = root.vipLevelId;
  if (typeof root.referralLevelId === "string") result.referralLevelId = root.referralLevelId;
  if (typeof root.groupBy === "string") result.groupBy = root.groupBy;
  return result;
}
function qualificationStatus(value) {
  return oneOf3(text3(value, "QUALIFICATION_STATUS_MISMATCH"), ["READY", "REBUILDING", "UNCONFIGURED"], "QUALIFICATION_STATUS_MISMATCH");
}
function readPage2(value, reader, code) {
  const root = record3(value, code);
  return {
    items: array3(root.items, code).map(reader),
    nextCursor: nullableText3(root.nextCursor, code),
    hasMore: bool3(root.hasMore, code),
    snapshotId: nullableText3(root.snapshotId, code)
  };
}
function record3(value, code) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value;
}
function array3(value, code) {
  if (!Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value;
}
function text3(value, code) {
  if (typeof value !== "string") {
    throw new TypeError(code);
  }
  return value;
}
function nullableText3(value, code) {
  return value === null ? null : text3(value, code);
}
function integer3(value, code) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new TypeError(code);
  }
  return value;
}
function bool3(value, code) {
  if (typeof value !== "boolean") {
    throw new TypeError(code);
  }
  return value;
}
function oneOf3(value, values, code) {
  if (!values.includes(value)) {
    throw new TypeError(code);
  }
  return value;
}

// src/features/member-management/member-api.ts
async function listAdminMembers(query) {
  const response = await adminApi.request("/api/admin/v1/members", {
    query: {
      stationId: clean(query.stationId),
      stationMasterId: clean(query.stationMasterId),
      vipLevelId: clean(query.vipLevelId),
      referralLevelId: clean(query.referralLevelId),
      keyword: clean(query.keyword),
      cursor: query.cursor,
      limit: query.limit ?? 20
    }
  });
  return readMemberAdminPage(response.data);
}
async function getAdminMember(memberId) {
  const response = await adminApi.request(
    `/api/admin/v1/members/${encodeURIComponent(memberId)}`
  );
  return { data: readMemberAdmin(response.data), etag: requireEtag(response.etag) };
}
async function setMemberStatus(input) {
  const response = await adminApi.request(
    `/api/admin/v1/members/${encodeURIComponent(input.memberId)}/status`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      ifMatch: input.etag,
      body: { status: input.status, reason: input.reason }
    }
  );
  return { data: readMemberAdmin(response.data), etag: requireEtag(response.etag) };
}
async function migrateMembership(input) {
  const hash = await canonicalDigest2([
    "MEMBERSHIP_MIGRATE",
    input.member.id,
    input.member.version,
    input.stationId,
    input.stationMasterId,
    input.referrerMemberId,
    input.reason
  ]);
  const authorizationResponse = await adminApi.request(
    "/api/admin/v1/action-authorizations",
    {
      method: "POST",
      body: {
        purpose: "MEMBERSHIP_MIGRATE",
        targetType: "EXISTING_RESOURCE",
        resourceId: input.member.id,
        expectedInputVersionSetHash: hash,
        expectedAmount: null,
        finalIdempotencyKey: input.idempotencyKey,
        proofCode: input.proofCode
      }
    }
  );
  const authorization = readActionAuthorization2(authorizationResponse.data);
  const response = await adminApi.request(
    `/api/admin/v1/members/${encodeURIComponent(input.member.id)}/membership-migrations`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      ifMatch: input.etag,
      actionToken: authorization.actionToken,
      body: {
        stationId: input.stationId,
        stationMasterId: input.stationMasterId,
        referrerMemberId: input.referrerMemberId,
        reason: input.reason
      }
    }
  );
  return readCommandReceipt(response.data);
}
async function listAdminMemberLedgers(memberId, cursor) {
  const response = await adminApi.request(
    `/api/admin/v1/members/${encodeURIComponent(memberId)}/point-ledgers`,
    { query: { cursor, limit: 30 } }
  );
  return readLedgerPage(response.data);
}
async function listAdminMemberOrders(memberId, cursor) {
  const response = await adminApi.request(
    `/api/admin/v1/members/${encodeURIComponent(memberId)}/orders`,
    { query: { cursor, limit: 30 } }
  );
  return readOrderPage(response.data);
}
async function getVipConfig() {
  const response = await adminApi.request(
    "/api/admin/v1/vip-level-configurations/current"
  );
  return { data: readVipConfig(response.data), etag: requireEtag(response.etag) };
}
async function saveVipConfig(input) {
  const response = await adminApi.request(
    "/api/admin/v1/vip-level-configurations/current",
    {
      method: "PUT",
      idempotencyKey: input.idempotencyKey,
      ifMatch: input.etag,
      body: { levels: input.levels, reason: input.reason }
    }
  );
  return { data: readVipConfig(response.data), etag: requireEtag(response.etag) };
}
async function listVipConfigHistory() {
  const response = await adminApi.request(
    "/api/admin/v1/vip-level-configurations",
    { query: { limit: 20 } }
  );
  return readVipConfigPage(response.data);
}
async function getReferralConfig() {
  const response = await adminApi.request(
    "/api/admin/v1/referral-level-configurations/current"
  );
  return { data: readReferralConfig(response.data), etag: requireEtag(response.etag) };
}
async function saveReferralConfig(input) {
  const response = await adminApi.request(
    "/api/admin/v1/referral-level-configurations/current",
    {
      method: "PUT",
      idempotencyKey: input.idempotencyKey,
      ifMatch: input.etag,
      body: {
        levels: input.levels,
        fixedRewardPolicyVersion: input.fixedRewardPolicyVersion,
        aiSharePolicyVersion: input.aiSharePolicyVersion,
        reason: input.reason
      }
    }
  );
  return { data: readReferralConfig(response.data), etag: requireEtag(response.etag) };
}
async function listReferralConfigHistory() {
  const response = await adminApi.request(
    "/api/admin/v1/referral-level-configurations",
    { query: { limit: 20 } }
  );
  return readReferralConfigPage(response.data);
}
async function rebuildQualifications(input) {
  const response = await adminApi.request(
    "/api/admin/v1/qualification-rebuilds",
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: { reason: input.reason }
    }
  );
  return readTaskAccepted3(response.data);
}
async function getMemberReport(reportType, query) {
  const response = await adminApi.request(
    `/api/admin/v1/reports/${encodeURIComponent(reportType)}`,
    {
      query: {
        from: query.from,
        to: query.to,
        asOf: query.asOf,
        snapshotId: query.snapshotId,
        stationId: query.stationId,
        stationMasterId: query.stationMasterId,
        memberId: query.memberId,
        vipLevelId: query.vipLevelId,
        referralLevelId: query.referralLevelId,
        groupBy: query.groupBy,
        cursor: query.cursor,
        limit: query.limit ?? 40
      }
    }
  );
  return readReportResult2(response.data);
}
function requireEtag(value) {
  if (value === null || value.length === 0) {
    throw new TypeError("ETAG_REQUIRED");
  }
  return value;
}
function clean(value) {
  const normalized = value?.trim();
  return normalized === "" ? void 0 : normalized;
}
async function canonicalDigest2(fields) {
  const encoder2 = new TextEncoder();
  const chunks = [];
  let length = 0;
  for (const field of fields) {
    const value = encoder2.encode(field === null ? "<null>" : field);
    const prefix = encoder2.encode(`${value.length}:`);
    const suffix = encoder2.encode(";");
    chunks.push(prefix, value, suffix);
    length += prefix.length + value.length + suffix.length;
  }
  const canonical = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    canonical.set(chunk, offset);
    offset += chunk.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", canonical);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// src/features/station-management/station-management-models.ts
function readStationPage(value) {
  return readPage3(value, readStation, "STATION_PAGE_MISMATCH");
}
function readStation(value) {
  const item = record4(value, "STATION_MISMATCH");
  return {
    id: text4(item.id, "STATION_ID_MISMATCH"),
    code: text4(item.code, "STATION_CODE_MISMATCH"),
    name: text4(item.name, "STATION_NAME_MISMATCH"),
    regionLabel: text4(item.regionLabel, "STATION_REGION_MISMATCH"),
    status: toggle(item.status, "STATION_STATUS_MISMATCH"),
    remark: text4(item.remark, "STATION_REMARK_MISMATCH"),
    stationMasterCount: integer4(item.stationMasterCount, "STATION_MASTER_COUNT_MISMATCH"),
    memberCount: integer4(item.memberCount, "STATION_MEMBER_COUNT_MISMATCH"),
    version: text4(item.version, "STATION_VERSION_MISMATCH")
  };
}
function readStationMasterPage(value) {
  return readPage3(value, readStationMaster, "STATION_MASTER_PAGE_MISMATCH");
}
function readStationMaster(value) {
  const item = record4(value, "STATION_MASTER_MISMATCH");
  const limits = record4(item.limits, "STATION_LIMITS_MISMATCH");
  return {
    id: text4(item.id, "STATION_MASTER_ID_MISMATCH"),
    code: text4(item.code, "STATION_MASTER_CODE_MISMATCH"),
    userId: text4(item.userId, "STATION_MASTER_USER_MISMATCH"),
    name: text4(item.name, "STATION_MASTER_NAME_MISMATCH"),
    account: text4(item.account, "STATION_MASTER_ACCOUNT_MISMATCH"),
    station: readNameRef2(item.station),
    status: toggle(item.status, "STATION_MASTER_STATUS_MISMATCH"),
    limits: {
      singleGrantLimit: points3(limits.singleGrantLimit, "STATION_GRANT_LIMIT_MISMATCH"),
      singleDeductLimit: points3(limits.singleDeductLimit, "STATION_DEDUCT_LIMIT_MISMATCH"),
      dailyOperationLimit: points3(limits.dailyOperationLimit, "STATION_DAILY_LIMIT_MISMATCH")
    },
    remark: text4(item.remark, "STATION_MASTER_REMARK_MISMATCH"),
    disposablePoints: points3(item.disposablePoints, "STATION_MASTER_POINTS_MISMATCH"),
    operationCredentialConfigured: bool4(item.operationCredentialConfigured, "STATION_CREDENTIAL_MISMATCH"),
    memberCount: integer4(item.memberCount, "STATION_MASTER_MEMBER_COUNT_MISMATCH"),
    grantedMemberPoints: points3(item.grantedMemberPoints, "STATION_GRANTED_POINTS_MISMATCH"),
    deductedMemberPoints: points3(item.deductedMemberPoints, "STATION_DEDUCTED_POINTS_MISMATCH"),
    identityVersion: text4(item.identityVersion, "STATION_MASTER_IDENTITY_VERSION_MISMATCH"),
    version: text4(item.version, "STATION_MASTER_VERSION_MISMATCH")
  };
}
function readLedgerPage2(value) {
  return readPage3(value, (entry) => {
    const item = record4(entry, "LEDGER_ITEM_MISMATCH");
    return {
      id: text4(item.id, "LEDGER_ID_MISMATCH"),
      transactionId: text4(item.transactionId, "LEDGER_TRANSACTION_MISMATCH"),
      type: text4(item.type, "LEDGER_TYPE_MISMATCH"),
      bucket: oneOf4(text4(item.bucket, "LEDGER_BUCKET_MISMATCH"), ["AVAILABLE", "RESERVED", "DISPOSABLE"], "LEDGER_BUCKET_MISMATCH"),
      changePoints: signedPoints(item.changePoints, "LEDGER_CHANGE_MISMATCH"),
      balanceBefore: points3(item.balanceBefore, "LEDGER_BEFORE_MISMATCH"),
      balanceAfter: points3(item.balanceAfter, "LEDGER_AFTER_MISMATCH"),
      sourceType: text4(item.sourceType, "LEDGER_SOURCE_TYPE_MISMATCH"),
      sourceId: text4(item.sourceId, "LEDGER_SOURCE_ID_MISMATCH"),
      remark: text4(item.remark, "LEDGER_REMARK_MISMATCH"),
      createdAt: text4(item.createdAt, "LEDGER_CREATED_MISMATCH")
    };
  }, "LEDGER_PAGE_MISMATCH");
}
function readPointChangeReceipt(value) {
  const item = record4(value, "POINT_RECEIPT_MISMATCH");
  return {
    transactionId: text4(item.transactionId, "POINT_RECEIPT_TRANSACTION_MISMATCH"),
    operationType: oneOf4(text4(item.operationType, "POINT_RECEIPT_TYPE_MISMATCH"), [
      "STATION_VIP_CREDIT",
      "STATION_DEBIT",
      "ADMIN_GRANT",
      "ADMIN_DEDUCT"
    ], "POINT_RECEIPT_TYPE_MISMATCH"),
    points: points3(item.points, "POINT_RECEIPT_POINTS_MISMATCH"),
    memberId: nullableText4(item.memberId, "POINT_RECEIPT_MEMBER_MISMATCH"),
    stationMasterId: text4(item.stationMasterId, "POINT_RECEIPT_MASTER_MISMATCH"),
    stationMasterBalanceBefore: points3(item.stationMasterBalanceBefore, "POINT_RECEIPT_BEFORE_MISMATCH"),
    stationMasterBalanceAfter: points3(item.stationMasterBalanceAfter, "POINT_RECEIPT_AFTER_MISMATCH"),
    memberBalanceBefore: nullablePoints(item.memberBalanceBefore, "POINT_RECEIPT_MEMBER_BEFORE_MISMATCH"),
    memberBalanceAfter: nullablePoints(item.memberBalanceAfter, "POINT_RECEIPT_MEMBER_AFTER_MISMATCH"),
    createdAt: text4(item.createdAt, "POINT_RECEIPT_CREATED_MISMATCH")
  };
}
function readTaskAccepted4(value) {
  const item = record4(value, "TASK_ACCEPTED_MISMATCH");
  return {
    taskId: text4(item.taskId, "TASK_ID_MISMATCH"),
    status: oneOf4(text4(item.status, "TASK_STATUS_MISMATCH"), ["PENDING", "RUNNING", "RETRY_WAIT"], "TASK_STATUS_MISMATCH"),
    statusUrl: text4(item.statusUrl, "TASK_URL_MISMATCH"),
    pollAfterSeconds: integer4(item.pollAfterSeconds, "TASK_POLL_MISMATCH")
  };
}
function readStationMasterReport(value) {
  const root = record4(value, "REPORT_MISMATCH");
  if (text4(root.reportType, "REPORT_TYPE_MISMATCH") !== "STATION_MASTERS") {
    throw new TypeError("REPORT_TYPE_MISMATCH");
  }
  const filter = record4(root.filters, "REPORT_FILTER_MISMATCH");
  return {
    reportType: "STATION_MASTERS",
    metricDictionaryVersion: text4(root.metricDictionaryVersion, "REPORT_DICTIONARY_MISMATCH"),
    snapshotId: text4(root.snapshotId, "REPORT_SNAPSHOT_MISMATCH"),
    filters: readReportFilter2(filter),
    asOf: text4(root.asOf, "REPORT_AS_OF_MISMATCH"),
    projectionVersion: text4(root.projectionVersion, "REPORT_PROJECTION_MISMATCH"),
    sourceWatermark: text4(root.sourceWatermark, "REPORT_WATERMARK_MISMATCH"),
    items: array4(root.items, "REPORT_ITEMS_MISMATCH").map((entry) => {
      const row = record4(entry, "REPORT_ROW_MISMATCH");
      return {
        dimensions: objectMap2(row.dimensions, "REPORT_DIMENSIONS_MISMATCH"),
        metrics: objectMap2(row.metrics, "REPORT_METRICS_MISMATCH")
      };
    }),
    totals: objectMap2(root.totals, "REPORT_TOTALS_MISMATCH"),
    totalScope: oneOf4(text4(root.totalScope, "REPORT_TOTAL_SCOPE_MISMATCH"), ["FULL_FILTER"], "REPORT_TOTAL_SCOPE_MISMATCH"),
    nextCursor: nullableText4(root.nextCursor, "REPORT_CURSOR_MISMATCH"),
    hasMore: bool4(root.hasMore, "REPORT_HAS_MORE_MISMATCH"),
    complete: bool4(root.complete, "REPORT_COMPLETE_MISMATCH")
  };
}
function readNameRef2(value) {
  const item = record4(value, "NAME_REF_MISMATCH");
  return {
    id: text4(item.id, "NAME_REF_ID_MISMATCH"),
    code: text4(item.code, "NAME_REF_CODE_MISMATCH"),
    name: text4(item.name, "NAME_REF_NAME_MISMATCH")
  };
}
function readReportFilter2(value) {
  const asOf = optionalNullableTextValue(value.asOf, "REPORT_FILTER_ASOF_MISMATCH");
  const stationId = optionalTextValue(value.stationId, "REPORT_FILTER_STATIONID_MISMATCH");
  const stationMasterId = optionalTextValue(value.stationMasterId, "REPORT_FILTER_STATIONMASTERID_MISMATCH");
  const memberId = optionalTextValue(value.memberId, "REPORT_FILTER_MEMBERID_MISMATCH");
  const vipLevelId = optionalTextValue(value.vipLevelId, "REPORT_FILTER_VIPLEVELID_MISMATCH");
  const referralLevelId = optionalTextValue(value.referralLevelId, "REPORT_FILTER_REFERRALLEVELID_MISMATCH");
  const projectId = optionalTextValue(value.projectId, "REPORT_FILTER_PROJECTID_MISMATCH");
  const lotteryId = optionalTextValue(value.lotteryId, "REPORT_FILTER_LOTTERYID_MISMATCH");
  const issueCode = optionalTextValue(value.issueCode, "REPORT_FILTER_ISSUECODE_MISMATCH");
  const status = optionalTextValue(value.status, "REPORT_FILTER_STATUS_MISMATCH");
  const affiliationMode = value.affiliationMode === void 0 || value.affiliationMode === null ? void 0 : oneOf4(text4(value.affiliationMode, "REPORT_FILTER_AFFILIATION_MISMATCH"), ["CURRENT_COHORT", "EVENT_AFFILIATION"], "REPORT_FILTER_AFFILIATION_MISMATCH");
  const groupBy = value.groupBy === void 0 || value.groupBy === null ? void 0 : oneOf4(text4(value.groupBy, "REPORT_FILTER_GROUP_MISMATCH"), ["DAY", "STATION_MASTER"], "REPORT_FILTER_GROUP_MISMATCH");
  return {
    from: text4(value.from, "REPORT_FILTER_FROM_MISMATCH"),
    to: text4(value.to, "REPORT_FILTER_TO_MISMATCH"),
    ...asOf === void 0 ? {} : { asOf },
    ...stationId === void 0 ? {} : { stationId },
    ...stationMasterId === void 0 ? {} : { stationMasterId },
    ...memberId === void 0 ? {} : { memberId },
    ...vipLevelId === void 0 ? {} : { vipLevelId },
    ...referralLevelId === void 0 ? {} : { referralLevelId },
    ...projectId === void 0 ? {} : { projectId },
    ...lotteryId === void 0 ? {} : { lotteryId },
    ...issueCode === void 0 ? {} : { issueCode },
    ...status === void 0 ? {} : { status },
    ...affiliationMode === void 0 ? {} : { affiliationMode },
    ...groupBy === void 0 ? {} : { groupBy }
  };
}
function optionalTextValue(value, code) {
  return value === void 0 || value === null ? void 0 : text4(value, code);
}
function optionalNullableTextValue(value, code) {
  return value === void 0 ? void 0 : nullableText4(value, code);
}
function readPage3(value, readItem, code) {
  const root = record4(value, code);
  return {
    items: array4(root.items, code).map(readItem),
    nextCursor: nullableText4(root.nextCursor, code),
    hasMore: bool4(root.hasMore, code),
    snapshotId: nullableText4(root.snapshotId, code)
  };
}
function toggle(value, code) {
  return oneOf4(text4(value, code), ["ENABLED", "DISABLED"], code);
}
function record4(value, code) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value;
}
function objectMap2(value, code) {
  return record4(value, code);
}
function array4(value, code) {
  if (!Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value;
}
function text4(value, code) {
  if (typeof value !== "string") {
    throw new TypeError(code);
  }
  return value;
}
function points3(value, code) {
  const result = text4(value, code);
  if (!/^(0|[1-9][0-9]{0,15})\.[0-9]{2}$/.test(result)) {
    throw new TypeError(code);
  }
  return result;
}
function signedPoints(value, code) {
  const result = text4(value, code);
  if (!/^-?(0|[1-9][0-9]{0,15})\.[0-9]{2}$/.test(result)) {
    throw new TypeError(code);
  }
  return result;
}
function nullablePoints(value, code) {
  return value === null ? null : points3(value, code);
}
function nullableText4(value, code) {
  return value === null ? null : text4(value, code);
}
function integer4(value, code) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new TypeError(code);
  }
  return value;
}
function bool4(value, code) {
  if (typeof value !== "boolean") {
    throw new TypeError(code);
  }
  return value;
}
function oneOf4(value, values, code) {
  if (!values.includes(value)) {
    throw new TypeError(code);
  }
  return value;
}

// src/features/station-management/station-management-api.ts
async function listStations(filters = {}) {
  const response = await adminApi.request("/api/admin/v1/stations", {
    query: {
      limit: 100,
      cursor: filters.cursor,
      keyword: clean2(filters.keyword),
      status: filters.status
    }
  });
  return readStationPage(response.data);
}
async function getStation(stationId) {
  const response = await adminApi.request(
    `/api/admin/v1/stations/${encodeURIComponent(stationId)}`
  );
  return { value: readStation(response.data), etag: requireEtag2(response) };
}
async function listStationMasters(filters = {}) {
  const response = await adminApi.request("/api/admin/v1/station-masters", {
    query: {
      limit: 100,
      cursor: filters.cursor,
      stationId: clean2(filters.stationId),
      keyword: clean2(filters.keyword),
      status: filters.status
    }
  });
  return readStationMasterPage(response.data);
}
async function getStationMaster(stationMasterId) {
  const response = await adminApi.request(
    `/api/admin/v1/station-masters/${encodeURIComponent(stationMasterId)}`
  );
  return { value: readStationMaster(response.data), etag: requireEtag2(response) };
}
async function createStationMaster(input, idempotencyKey) {
  const response = await adminApi.request("/api/admin/v1/station-masters", {
    method: "POST",
    idempotencyKey,
    body: input
  });
  return readStationMaster(response.data);
}
async function migrateStationMaster(input) {
  const expectedHash = await canonicalDigest3([
    "STATION_MASTER_MIGRATE",
    input.stationMaster.id,
    input.stationMaster.version,
    input.targetStationId,
    String(input.moveOwnedMembers),
    input.reason
  ]);
  const actionToken = await authorizeAction2({
    purpose: "STATION_MASTER_MIGRATE",
    targetType: "EXISTING_RESOURCE",
    resourceId: input.stationMaster.id,
    expectedHash,
    expectedAmount: null,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode
  });
  const response = await adminApi.request(
    `/api/admin/v1/station-masters/${encodeURIComponent(input.stationMaster.id)}/migrations`,
    {
      method: "POST",
      ifMatch: input.etag,
      idempotencyKey: input.idempotencyKey,
      actionToken,
      body: {
        targetStationId: input.targetStationId,
        reason: input.reason,
        moveOwnedMembers: input.moveOwnedMembers
      }
    }
  );
  return readTaskAccepted4(response.data);
}
async function adjustStationMasterPoints(input) {
  const expectedHash = await canonicalDigest3([
    "STATION_BUDGET_ADJUST",
    input.stationMaster.id,
    input.stationMaster.version,
    input.type,
    input.points,
    input.reason
  ]);
  const actionToken = await authorizeAction2({
    purpose: "STATION_BUDGET_ADJUST",
    targetType: "EXISTING_RESOURCE",
    resourceId: input.stationMaster.id,
    expectedHash,
    expectedAmount: input.points,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode
  });
  const response = await adminApi.request(
    `/api/admin/v1/station-masters/${encodeURIComponent(input.stationMaster.id)}/points/adjustments`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      actionToken,
      body: { type: input.type, points: input.points, reason: input.reason }
    }
  );
  return readPointChangeReceipt(response.data);
}
async function listAdminStationLedgers(filters = {}) {
  const response = await adminApi.request(
    "/api/admin/v1/station-master-point-ledgers",
    {
      query: {
        limit: 100,
        cursor: filters.cursor,
        stationMasterId: clean2(filters.stationMasterId),
        memberId: clean2(filters.memberId),
        from: filters.from,
        to: filters.to
      }
    }
  );
  return readLedgerPage2(response.data);
}
async function getStationMasterReport(input) {
  const response = await adminApi.request(
    "/api/admin/v1/reports/STATION_MASTERS",
    {
      query: {
        ...input.filters,
        asOf: input.filters.asOf ?? void 0,
        cursor: input.cursor,
        limit: 100
      }
    }
  );
  return readStationMasterReport(response.data);
}
function clean2(value) {
  const normalized = value?.trim();
  return normalized === void 0 || normalized === "" ? void 0 : normalized;
}
function requireEtag2(response) {
  if (response.etag === null) {
    throw new TypeError("REQUIRED_ETAG_MISSING");
  }
  return response.etag;
}
async function authorizeAction2(input) {
  const response = await adminApi.request("/api/admin/v1/action-authorizations", {
    method: "POST",
    body: {
      purpose: input.purpose,
      targetType: input.targetType,
      resourceId: input.resourceId,
      expectedInputVersionSetHash: input.expectedHash,
      expectedAmount: input.expectedAmount,
      finalIdempotencyKey: input.finalIdempotencyKey,
      proofCode: input.proofCode
    }
  });
  if (typeof response.data !== "object" || response.data === null || Array.isArray(response.data)) {
    throw new TypeError("ACTION_AUTHORIZATION_MISMATCH");
  }
  const actionToken = response.data.actionToken;
  if (typeof actionToken !== "string") {
    throw new TypeError("ACTION_AUTHORIZATION_MISMATCH");
  }
  return actionToken;
}
async function canonicalDigest3(fields) {
  const encoder2 = new TextEncoder();
  const chunks = [];
  let total = 0;
  for (const field of fields) {
    const value = encoder2.encode(field);
    const prefix = encoder2.encode(`${value.length}:`);
    const suffix = encoder2.encode(";");
    chunks.push(prefix, value, suffix);
    total += prefix.length + value.length + suffix.length;
  }
  const canonical = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    canonical.set(chunk, offset);
    offset += chunk.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", canonical);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// src/features/ai-management/ai-management-models.ts
var projectStatuses = ["ENABLED", "DISABLED"];
var poolStatuses = [
  "OPEN",
  "CUTOFF_PENDING",
  "LOCKED",
  "DRAW_PENDING",
  "ALLOCATION_PENDING",
  "DISCLOSED",
  "DISTRIBUTING",
  "SETTLED",
  "CANCELLING",
  "CANCELLED",
  "CORRECTING",
  "CORRECTED",
  "EXCEPTION_PENDING",
  "NO_PARTICIPATION"
];
function readProject(value) {
  const item = record5(value, "AI_PROJECT_MISMATCH");
  const schedule = item.drawSchedule === null ? null : record5(item.drawSchedule, "AI_DRAW_SCHEDULE_MISMATCH");
  return {
    drawSchedule: schedule === null ? null : {
      issueCode: text5(schedule.issueCode, "AI_DRAW_ISSUE_MISMATCH"),
      drawAt: text5(schedule.drawAt, "AI_DRAW_TIME_MISMATCH")
    },
    id: text5(item.id, "AI_PROJECT_ID_MISMATCH"),
    code: text5(item.code, "AI_PROJECT_CODE_MISMATCH"),
    name: text5(item.name, "AI_PROJECT_NAME_MISMATCH"),
    lotteryId: text5(item.lotteryId, "AI_PROJECT_LOTTERY_MISMATCH"),
    playId: text5(item.playId, "AI_PROJECT_PLAY_MISMATCH"),
    status: oneOf5(item.status, projectStatuses, "AI_PROJECT_STATUS_MISMATCH"),
    activeConfigVersion: nullableText5(item.activeConfigVersion, "AI_PROJECT_CONFIG_MISMATCH"),
    latestPoolIssueId: nullableText5(item.latestPoolIssueId, "AI_PROJECT_POOL_MISMATCH"),
    version: text5(item.version, "AI_PROJECT_VERSION_MISMATCH")
  };
}
function readProjectPage(value) {
  return readPage4(value, readProject, "AI_PROJECT_PAGE_MISMATCH");
}
function readSettings(value) {
  const item = record5(value, "AI_SETTINGS_MISMATCH");
  return {
    settlementMode: oneOf5(item.settlementMode, ["MANUAL", "AUTO"], "AI_MODE_MISMATCH"),
    effectiveDate: text5(item.effectiveDate, "AI_SETTINGS_DATE_MISMATCH"),
    timeZone: oneOf5(item.timeZone, ["Asia/Shanghai"], "AI_SETTINGS_ZONE_MISMATCH"),
    cutoffOffsetMinutes: integer5(item.cutoffOffsetMinutes, "AI_SETTINGS_CUTOFF_MISMATCH"),
    endDate: nullableText5(item.endDate, "AI_SETTINGS_END_MISMATCH"),
    initialOfficialPoints: text5(item.initialOfficialPoints, "AI_SETTINGS_INITIAL_MISMATCH"),
    userIncrementRatioBps: integer5(item.userIncrementRatioBps, "AI_SETTINGS_RATIO_MISMATCH"),
    defaultTargetNetReturnPercent: integer5(item.defaultTargetNetReturnPercent, "AI_SETTINGS_TARGET_MISMATCH"),
    maxOfficialContributionPoints: text5(item.maxOfficialContributionPoints, "AI_SETTINGS_MAXIMUM_MISMATCH"),
    rewardBudgetLimitPoints: text5(item.rewardBudgetLimitPoints, "AI_SETTINGS_REWARD_MISMATCH")
  };
}
function readProjectConfig(value) {
  const item = record5(value, "AI_CONFIG_MISMATCH");
  return {
    projectId: text5(item.projectId, "AI_CONFIG_PROJECT_MISMATCH"),
    version: text5(item.version, "AI_CONFIG_VERSION_MISMATCH"),
    settings: readSettings(item.settings),
    authorId: text5(item.authorId, "AI_CONFIG_AUTHOR_MISMATCH"),
    createdAt: text5(item.createdAt, "AI_CONFIG_CREATED_MISMATCH")
  };
}
function readPool(value) {
  const item = record5(value, "AI_POOL_MISMATCH");
  return {
    id: text5(item.id, "AI_POOL_ID_MISMATCH"),
    projectId: text5(item.projectId, "AI_POOL_PROJECT_MISMATCH"),
    lotteryId: text5(item.lotteryId, "AI_POOL_LOTTERY_MISMATCH"),
    playId: text5(item.playId, "AI_POOL_PLAY_MISMATCH"),
    settlementMode: oneOf5(item.settlementMode, ["MANUAL", "AUTO"], "AI_MODE_MISMATCH"),
    ruleSetCode: text5(item.ruleSetCode, "AI_POOL_RULE_MISMATCH"),
    issueCode: text5(item.issueCode, "AI_POOL_ISSUE_MISMATCH"),
    status: oneOf5(item.status, poolStatuses, "AI_POOL_STATUS_MISMATCH"),
    cutoffAt: text5(item.cutoffAt, "AI_POOL_CUTOFF_MISMATCH"),
    generatedAt: text5(item.generatedAt, "AI_POOL_GENERATED_MISMATCH"),
    groupCount: integer5(item.groupCount, "AI_POOL_COUNT_MISMATCH"),
    configVersion: text5(item.configVersion, "AI_POOL_CONFIG_MISMATCH"),
    initialOfficialPoints: text5(item.initialOfficialPoints, "AI_POOL_INITIAL_MISMATCH"),
    userIncrementRatioBps: integer5(item.userIncrementRatioBps, "AI_POOL_RATIO_MISMATCH"),
    defaultTargetNetReturnPercent: integer5(item.defaultTargetNetReturnPercent, "AI_POOL_TARGET_MISMATCH"),
    maxOfficialContributionPoints: text5(item.maxOfficialContributionPoints, "AI_POOL_MAXIMUM_MISMATCH"),
    rewardBudgetLimitPoints: text5(item.rewardBudgetLimitPoints, "AI_POOL_REWARD_MISMATCH"),
    actualUserShare: text5(item.actualUserShare, "AI_POOL_SHARE_MISMATCH"),
    userPurchasePoints: text5(item.userPurchasePoints, "AI_POOL_USER_POINTS_MISMATCH"),
    platformPoints: text5(item.platformPoints, "AI_POOL_PLATFORM_POINTS_MISMATCH"),
    rawTotalPoints: text5(item.rawTotalPoints, "AI_POOL_RAW_TOTAL_MISMATCH"),
    alignmentPoints: text5(item.alignmentPoints, "AI_POOL_ALIGNMENT_MISMATCH"),
    totalPurchasePoints: text5(item.totalPurchasePoints, "AI_POOL_TOTAL_POINTS_MISMATCH"),
    participantCount: integer5(item.participantCount, "AI_POOL_PARTICIPANTS_MISMATCH"),
    totalWinningPoints: nullableText5(item.totalWinningPoints, "AI_POOL_WINNING_MISMATCH"),
    userWinningPoints: nullableText5(item.userWinningPoints, "AI_POOL_USER_WINNING_MISMATCH"),
    numbersDisclosed: bool5(item.numbersDisclosed, "AI_POOL_DISCLOSED_MISMATCH"),
    disclosureVersion: nullableText5(item.disclosureVersion, "AI_POOL_DISCLOSURE_MISMATCH"),
    version: text5(item.version, "AI_POOL_VERSION_MISMATCH")
  };
}
function readPoolPage(value) {
  return readPage4(value, readPool, "AI_POOL_PAGE_MISMATCH");
}
function readPoolAdmin(value) {
  const item = record5(value, "AI_POOL_ADMIN_MISMATCH");
  return {
    pool: readPool(item.pool),
    configVersion: text5(item.configVersion, "AI_POOL_ADMIN_CONFIG_MISMATCH"),
    combinations: array5(item.combinations, "AI_POOL_COMBINATIONS_MISMATCH").map(readCombination),
    inputVersionSetHash: text5(item.inputVersionSetHash, "AI_POOL_INPUT_HASH_MISMATCH"),
    allowedActions: stringArray3(item.allowedActions, "AI_POOL_ACTIONS_MISMATCH")
  };
}
function readCombinationPreview(value) {
  const item = record5(value, "AI_COMBINATION_PREVIEW_MISMATCH");
  return {
    projectId: text5(item.projectId, "AI_COMBINATION_PREVIEW_PROJECT_MISMATCH"),
    issueId: text5(item.issueId, "AI_COMBINATION_PREVIEW_ISSUE_ID_MISMATCH"),
    issueCode: text5(item.issueCode, "AI_COMBINATION_PREVIEW_ISSUE_MISMATCH"),
    configVersion: text5(item.configVersion, "AI_COMBINATION_PREVIEW_CONFIG_MISMATCH"),
    ruleVersion: text5(item.ruleVersion, "AI_COMBINATION_PREVIEW_RULE_MISMATCH"),
    algorithmVersion: text5(item.algorithmVersion, "AI_COMBINATION_PREVIEW_ALGORITHM_MISMATCH"),
    inputVersionSetHash: text5(item.inputVersionSetHash, "AI_COMBINATION_PREVIEW_INPUT_MISMATCH"),
    generatedAt: text5(item.generatedAt, "AI_COMBINATION_PREVIEW_TIME_MISMATCH"),
    combinations: array5(item.combinations, "AI_COMBINATION_PREVIEW_ITEMS_MISMATCH").map(readPreviewCombination)
  };
}
function readSubscription(value) {
  const item = record5(value, "AI_SUBSCRIPTION_MISMATCH");
  return {
    id: text5(item.id, "AI_SUBSCRIPTION_ID_MISMATCH"),
    poolIssueId: text5(item.poolIssueId, "AI_SUBSCRIPTION_POOL_MISMATCH"),
    points: text5(item.points, "AI_SUBSCRIPTION_POINTS_MISMATCH"),
    quotaDate: text5(item.quotaDate, "AI_SUBSCRIPTION_DATE_MISMATCH"),
    status: oneOf5(item.status, ["RESERVED", "LOCKED", "REFUNDED", "SETTLED"], "AI_SUBSCRIPTION_STATUS_MISMATCH"),
    ledgerTransactionId: text5(item.ledgerTransactionId, "AI_SUBSCRIPTION_LEDGER_MISMATCH"),
    lockedAt: nullableText5(item.lockedAt, "AI_SUBSCRIPTION_LOCKED_MISMATCH"),
    createdAt: text5(item.createdAt, "AI_SUBSCRIPTION_CREATED_MISMATCH")
  };
}
function readSubscriptionPage(value) {
  return readPage4(value, readSubscription, "AI_SUBSCRIPTION_PAGE_MISMATCH");
}
function readAllocation(value) {
  const item = record5(value, "AI_ALLOCATION_MISMATCH");
  return {
    id: text5(item.id, "AI_ALLOCATION_ID_MISMATCH"),
    poolIssueId: text5(item.poolIssueId, "AI_ALLOCATION_POOL_MISMATCH"),
    version: text5(item.version, "AI_ALLOCATION_VERSION_MISMATCH"),
    inputVersionSetHash: text5(item.inputVersionSetHash, "AI_ALLOCATION_HASH_MISMATCH"),
    drawVersion: text5(item.drawVersion, "AI_ALLOCATION_DRAW_MISMATCH"),
    ruleVersion: text5(item.ruleVersion, "AI_ALLOCATION_RULE_MISMATCH"),
    simulationPolicyVersion: text5(item.simulationPolicyVersion, "AI_ALLOCATION_SIMULATION_POLICY_MISMATCH"),
    ruleSetCode: text5(item.ruleSetCode, "AI_ALLOCATION_RULE_SET_MISMATCH"),
    algorithmVersion: text5(item.algorithmVersion, "AI_ALLOCATION_ALGORITHM_MISMATCH"),
    status: oneOf5(item.status, ["SOLVED", "UNSATISFIABLE", "TIMEOUT", "INVALID_INPUT", "SUPERSEDED"], "AI_ALLOCATION_STATUS_MISMATCH"),
    items: array5(item.items, "AI_ALLOCATION_ITEMS_MISMATCH").map(readAllocationItem),
    totalPurchasePoints: text5(item.totalPurchasePoints, "AI_ALLOCATION_TOTAL_MISMATCH"),
    totalWinningPoints: nullableText5(item.totalWinningPoints, "AI_ALLOCATION_WINNING_MISMATCH"),
    userWinningPoints: nullableText5(item.userWinningPoints, "AI_ALLOCATION_USER_MISMATCH"),
    platformWinningPoints: nullableText5(item.platformWinningPoints, "AI_ALLOCATION_PLATFORM_MISMATCH"),
    requestedTargetNetReturnPercent: integer5(item.requestedTargetNetReturnPercent, "AI_ALLOCATION_TARGET_MISMATCH"),
    actualNetReturnRate: nullableText5(item.actualNetReturnRate, "AI_ALLOCATION_ACTUAL_RETURN_MISMATCH"),
    differencePercentagePoints: nullableText5(item.differencePercentagePoints, "AI_ALLOCATION_DIFFERENCE_MISMATCH"),
    withinTolerance: bool5(item.withinTolerance, "AI_ALLOCATION_TOLERANCE_MISMATCH"),
    targetRoundingAdjustmentPoints: text5(item.targetRoundingAdjustmentPoints, "AI_TARGET_TAIL_MISMATCH"),
    rewardRequiredPoints: nullableText5(item.rewardRequiredPoints, "AI_ALLOCATION_REWARD_MISMATCH"),
    winningNumberCode: text5(item.winningNumberCode, "AI_ALLOCATION_WINNING_CODE_MISMATCH"),
    winningGroupSequenceNo: integer5(item.winningGroupSequenceNo, "AI_ALLOCATION_WINNING_GROUP_MISMATCH"),
    initialOfficialPoints: text5(item.initialOfficialPoints, "AI_ALLOCATION_INITIAL_MISMATCH"),
    userPurchasePoints: text5(item.userPurchasePoints, "AI_ALLOCATION_PURCHASE_MISMATCH"),
    incrementTotalPoints: text5(item.incrementTotalPoints, "AI_ALLOCATION_INCREMENT_MISMATCH"),
    platformIncrementBasePoints: text5(item.platformIncrementBasePoints, "AI_ALLOCATION_PLATFORM_BASE_MISMATCH"),
    rawTotalPoints: text5(item.rawTotalPoints, "AI_ALLOCATION_RAW_MISMATCH"),
    alignmentPoints: text5(item.alignmentPoints, "AI_ALLOCATION_ALIGNMENT_MISMATCH"),
    officialContributionPoints: text5(item.officialContributionPoints, "AI_ALLOCATION_OFFICIAL_MISMATCH"),
    maxOfficialContributionPoints: text5(item.maxOfficialContributionPoints, "AI_ALLOCATION_OFFICIAL_LIMIT_MISMATCH"),
    officialContributionWithinLimit: bool5(item.officialContributionWithinLimit, "AI_ALLOCATION_OFFICIAL_CHECK_MISMATCH"),
    rewardBudgetLimitPoints: text5(item.rewardBudgetLimitPoints, "AI_ALLOCATION_REWARD_LIMIT_MISMATCH"),
    rewardBudgetWithinLimit: bool5(item.rewardBudgetWithinLimit, "AI_ALLOCATION_REWARD_CHECK_MISMATCH"),
    groupingInputHash: text5(item.groupingInputHash, "AI_ALLOCATION_GROUP_HASH_MISMATCH"),
    subscriptionInputHash: text5(item.subscriptionInputHash, "AI_ALLOCATION_SUBSCRIPTION_HASH_MISMATCH"),
    drawInputHash: text5(item.drawInputHash, "AI_ALLOCATION_DRAW_HASH_MISMATCH"),
    ruleInputHash: text5(item.ruleInputHash, "AI_ALLOCATION_RULE_HASH_MISMATCH"),
    previewInputHash: text5(item.previewInputHash, "AI_ALLOCATION_PREVIEW_HASH_MISMATCH"),
    confirmationStatus: oneOf5(item.confirmationStatus, ["NOT_CONFIRMABLE", "PENDING_CONFIRMATION", "CONFIRMED"], "AI_ALLOCATION_CONFIRMATION_MISMATCH")
  };
}
function readAllocationPage(value) {
  return readPage4(value, readAllocation, "AI_ALLOCATION_PAGE_MISMATCH");
}
function readDisclosureReceipt(value) {
  const item = record5(value, "AI_DISCLOSURE_MISMATCH");
  return {
    id: text5(item.id, "AI_DISCLOSURE_ID_MISMATCH"),
    poolIssueId: text5(item.poolIssueId, "AI_DISCLOSURE_POOL_MISMATCH"),
    version: text5(item.version, "AI_DISCLOSURE_VERSION_MISMATCH"),
    status: oneOf5(item.status, ["PUBLISHED", "SUPERSEDED"], "AI_DISCLOSURE_STATUS_MISMATCH"),
    label: text5(item.label, "AI_DISCLOSURE_LABEL_MISMATCH"),
    reason: text5(item.reason, "AI_DISCLOSURE_REASON_MISMATCH"),
    publishedAt: text5(item.publishedAt, "AI_DISCLOSURE_TIME_MISMATCH")
  };
}
function readPayoutPreparation(value) {
  const item = record5(value, "AI_PAYOUT_PREPARATION_MISMATCH");
  return {
    preparationId: text5(item.preparationId, "AI_PAYOUT_PREPARATION_ID_MISMATCH"),
    poolIssueId: text5(item.poolIssueId, "AI_PAYOUT_PREPARATION_POOL_MISMATCH"),
    allocationVersion: text5(item.allocationVersion, "AI_PAYOUT_PREPARATION_ALLOCATION_MISMATCH"),
    disclosureVersion: text5(item.disclosureVersion, "AI_PAYOUT_PREPARATION_DISCLOSURE_MISMATCH"),
    expectedInputVersionSetHash: text5(item.expectedInputVersionSetHash, "AI_PAYOUT_PREPARATION_HASH_MISMATCH"),
    dueTotalPoints: text5(item.dueTotalPoints, "AI_PAYOUT_PREPARATION_TOTAL_MISMATCH"),
    dueUserPoints: text5(item.dueUserPoints, "AI_PAYOUT_PREPARATION_USER_MISMATCH"),
    eligible: bool5(item.eligible, "AI_PAYOUT_PREPARATION_ELIGIBLE_MISMATCH"),
    blockingCodes: stringArray3(item.blockingCodes, "AI_PAYOUT_PREPARATION_BLOCKS_MISMATCH"),
    expiresAt: text5(item.expiresAt, "AI_PAYOUT_PREPARATION_EXPIRY_MISMATCH")
  };
}
function readPayoutBatch(value) {
  const item = record5(value, "AI_PAYOUT_BATCH_MISMATCH");
  return {
    id: text5(item.id, "AI_PAYOUT_BATCH_ID_MISMATCH"),
    poolIssueId: text5(item.poolIssueId, "AI_PAYOUT_BATCH_POOL_MISMATCH"),
    status: oneOf5(item.status, ["PENDING", "RUNNING", "PAUSED", "FAILED", "RECONCILING", "COMPLETED"], "AI_PAYOUT_BATCH_STATUS_MISMATCH"),
    expectedPoints: text5(item.expectedPoints, "AI_PAYOUT_BATCH_EXPECTED_MISMATCH"),
    postedPoints: text5(item.postedPoints, "AI_PAYOUT_BATCH_POSTED_MISMATCH"),
    pendingPoints: text5(item.pendingPoints, "AI_PAYOUT_BATCH_PENDING_MISMATCH"),
    differencePoints: text5(item.differencePoints, "AI_PAYOUT_BATCH_DIFFERENCE_MISMATCH"),
    inputVersionSetHash: text5(item.inputVersionSetHash, "AI_PAYOUT_BATCH_HASH_MISMATCH"),
    completedItemCount: integer5(item.completedItemCount, "AI_PAYOUT_BATCH_COMPLETED_MISMATCH"),
    totalItemCount: integer5(item.totalItemCount, "AI_PAYOUT_BATCH_ITEMS_MISMATCH"),
    updatedAt: text5(item.updatedAt, "AI_PAYOUT_BATCH_UPDATED_MISMATCH")
  };
}
function readPayoutItem(value) {
  const item = record5(value, "AI_PAYOUT_ITEM_MISMATCH");
  return {
    id: text5(item.id, "AI_PAYOUT_ITEM_ID_MISMATCH"),
    maskedBeneficiary: text5(item.maskedBeneficiary, "AI_PAYOUT_ITEM_BENEFICIARY_MISMATCH"),
    duePoints: text5(item.duePoints, "AI_PAYOUT_ITEM_DUE_MISMATCH"),
    postedPoints: text5(item.postedPoints, "AI_PAYOUT_ITEM_POSTED_MISMATCH"),
    status: oneOf5(item.status, ["PENDING", "POSTED", "FAILED"], "AI_PAYOUT_ITEM_STATUS_MISMATCH"),
    transactionId: nullableText5(item.transactionId, "AI_PAYOUT_ITEM_TRANSACTION_MISMATCH")
  };
}
function readPayoutItemPage(value) {
  return readPage4(value, readPayoutItem, "AI_PAYOUT_ITEM_PAGE_MISMATCH");
}
function readTaskAccepted5(value) {
  const item = record5(value, "TASK_ACCEPTED_MISMATCH");
  return {
    taskId: text5(item.taskId, "TASK_ID_MISMATCH"),
    status: oneOf5(item.status, ["PENDING", "RUNNING", "RETRY_WAIT"], "TASK_STATUS_MISMATCH"),
    statusUrl: text5(item.statusUrl, "TASK_URL_MISMATCH"),
    pollAfterSeconds: integer5(item.pollAfterSeconds, "TASK_POLL_MISMATCH")
  };
}
function readTaskStatus4(value) {
  const item = record5(value, "TASK_STATUS_RESPONSE_MISMATCH");
  return {
    id: text5(item.id, "TASK_STATUS_ID_MISMATCH"),
    taskType: text5(item.taskType, "TASK_TYPE_MISMATCH"),
    status: oneOf5(item.status, ["PENDING", "RUNNING", "RETRY_WAIT", "SUCCEEDED", "FAILED", "CANCELLED"], "TASK_STATUS_VALUE_MISMATCH"),
    progress: numberValue(item.progress, "TASK_PROGRESS_MISMATCH"),
    resultUrl: nullableText5(item.resultUrl, "TASK_RESULT_URL_MISMATCH"),
    resultCode: nullableText5(item.resultCode, "TASK_RESULT_CODE_MISMATCH"),
    failureCode: nullableText5(item.failureCode, "TASK_FAILURE_CODE_MISMATCH"),
    updatedAt: text5(item.updatedAt, "TASK_UPDATED_MISMATCH")
  };
}
function readCommandReceipt2(value) {
  const item = record5(value, "COMMAND_RECEIPT_MISMATCH");
  return {
    commandId: text5(item.commandId, "COMMAND_ID_MISMATCH"),
    operationId: text5(item.operationId, "COMMAND_OPERATION_MISMATCH"),
    resourceId: text5(item.resourceId, "COMMAND_RESOURCE_MISMATCH"),
    status: oneOf5(item.status, ["ACCEPTED", "COMPLETED"], "COMMAND_STATUS_MISMATCH"),
    createdAt: text5(item.createdAt, "COMMAND_CREATED_MISMATCH")
  };
}
function readReport(value) {
  const item = record5(value, "AI_REPORT_MISMATCH");
  const filter = record5(item.filters, "AI_REPORT_FILTER_MISMATCH");
  return {
    reportType: oneOf5(item.reportType, ["AI_POOLS"], "AI_REPORT_TYPE_MISMATCH"),
    metricDictionaryVersion: text5(item.metricDictionaryVersion, "AI_REPORT_DICTIONARY_MISMATCH"),
    snapshotId: text5(item.snapshotId, "AI_REPORT_SNAPSHOT_MISMATCH"),
    filters: {
      from: text5(filter.from, "AI_REPORT_FROM_MISMATCH"),
      to: text5(filter.to, "AI_REPORT_TO_MISMATCH"),
      asOf: optionalNullableText(filter.asOf, "AI_REPORT_ASOF_MISMATCH"),
      projectId: optionalNonNullText(filter.projectId, "AI_REPORT_PROJECT_MISMATCH"),
      lotteryId: optionalNonNullText(filter.lotteryId, "AI_REPORT_LOTTERY_MISMATCH"),
      issueCode: optionalNonNullText(filter.issueCode, "AI_REPORT_ISSUE_MISMATCH"),
      status: optionalNonNullText(filter.status, "AI_REPORT_STATUS_MISMATCH"),
      groupBy: filter.groupBy === void 0 ? void 0 : oneOf5(filter.groupBy, ["POOL_ISSUE"], "AI_REPORT_GROUP_MISMATCH")
    },
    asOf: text5(item.asOf, "AI_REPORT_TIME_MISMATCH"),
    projectionVersion: text5(item.projectionVersion, "AI_REPORT_PROJECTION_MISMATCH"),
    sourceWatermark: text5(item.sourceWatermark, "AI_REPORT_WATERMARK_MISMATCH"),
    items: array5(item.items, "AI_REPORT_ROWS_MISMATCH").map(readReportRow),
    totals: record5(item.totals, "AI_REPORT_TOTALS_MISMATCH"),
    totalScope: oneOf5(item.totalScope, ["FULL_FILTER"], "AI_REPORT_SCOPE_MISMATCH"),
    nextCursor: nullableText5(item.nextCursor, "AI_REPORT_CURSOR_MISMATCH"),
    hasMore: bool5(item.hasMore, "AI_REPORT_MORE_MISMATCH"),
    complete: bool5(item.complete, "AI_REPORT_COMPLETE_MISMATCH")
  };
}
function readCombination(value) {
  const item = record5(value, "AI_COMBINATION_MISMATCH");
  return {
    id: text5(item.id, "AI_COMBINATION_ID_MISMATCH"),
    sequenceNo: integer5(item.sequenceNo, "AI_COMBINATION_SEQUENCE_MISMATCH"),
    selection: readSelection(item.selection),
    selectionHash: text5(item.selectionHash, "AI_COMBINATION_HASH_MISMATCH"),
    numberCodes: stringArray3(item.numberCodes, "AI_COMBINATION_NUMBERS_MISMATCH"),
    groupHash: text5(item.groupHash, "AI_COMBINATION_GROUP_HASH_MISMATCH"),
    baseBetCount: text5(item.baseBetCount, "AI_COMBINATION_BETS_MISMATCH"),
    baseCostPoints: text5(item.baseCostPoints, "AI_COMBINATION_COST_MISMATCH"),
    generatedAt: text5(item.generatedAt, "AI_COMBINATION_TIME_MISMATCH")
  };
}
function readPreviewCombination(value) {
  const item = record5(value, "AI_PREVIEW_COMBINATION_MISMATCH");
  return {
    sequenceNo: integer5(item.sequenceNo, "AI_PREVIEW_COMBINATION_SEQUENCE_MISMATCH"),
    selection: readSelection(item.selection),
    selectionHash: text5(item.selectionHash, "AI_PREVIEW_COMBINATION_HASH_MISMATCH"),
    numberCodes: stringArray3(item.numberCodes, "AI_PREVIEW_COMBINATION_NUMBERS_MISMATCH"),
    groupHash: text5(item.groupHash, "AI_PREVIEW_COMBINATION_GROUP_HASH_MISMATCH"),
    baseBetCount: text5(item.baseBetCount, "AI_PREVIEW_COMBINATION_BETS_MISMATCH"),
    baseCostPoints: text5(item.baseCostPoints, "AI_PREVIEW_COMBINATION_COST_MISMATCH")
  };
}
function readSelection(value) {
  const item = record5(value, "AI_SELECTION_MISMATCH");
  return {
    schemaId: text5(item.schemaId, "AI_SELECTION_SCHEMA_MISMATCH"),
    schemaVersion: text5(item.schemaVersion, "AI_SELECTION_VERSION_MISMATCH"),
    mode: oneOf5(item.mode, ["SINGLE", "MULTIPLE", "DANTUO", "POSITIONAL", "GROUP"], "AI_SELECTION_MODE_MISMATCH"),
    areas: array5(item.areas, "AI_SELECTION_AREAS_MISMATCH").map((value2) => {
      const area = record5(value2, "AI_SELECTION_AREA_MISMATCH");
      return {
        key: text5(area.key, "AI_SELECTION_AREA_KEY_MISMATCH"),
        chosen: optionalNumberArray2(area.chosen, "AI_SELECTION_CHOSEN_MISMATCH"),
        dan: optionalNumberArray2(area.dan, "AI_SELECTION_DAN_MISMATCH"),
        tuo: optionalNumberArray2(area.tuo, "AI_SELECTION_TUO_MISMATCH")
      };
    })
  };
}
function readAllocationItem(value) {
  const item = record5(value, "AI_ALLOCATION_ITEM_MISMATCH");
  return {
    combinationId: text5(item.combinationId, "AI_ALLOCATION_ITEM_ID_MISMATCH"),
    sequenceNo: integer5(item.sequenceNo, "AI_ALLOCATION_ITEM_SEQUENCE_MISMATCH"),
    allocatedPoints: text5(item.allocatedPoints, "AI_ALLOCATION_ITEM_ALLOCATED_MISMATCH"),
    multiplier: text5(item.multiplier, "AI_ALLOCATION_ITEM_MULTIPLIER_MISMATCH"),
    allocationRatio: text5(item.allocationRatio, "AI_ALLOCATION_ITEM_RATIO_MISMATCH"),
    awardCodes: stringArray3(item.awardCodes, "AI_ALLOCATION_ITEM_AWARDS_MISMATCH"),
    winningPoints: text5(item.winningPoints, "AI_ALLOCATION_ITEM_WINNING_MISMATCH")
  };
}
function readReportRow(value) {
  const item = record5(value, "AI_REPORT_ROW_MISMATCH");
  return {
    dimensions: record5(item.dimensions, "AI_REPORT_DIMENSIONS_MISMATCH"),
    metrics: record5(item.metrics, "AI_REPORT_METRICS_MISMATCH")
  };
}
function readPage4(value, reader, code) {
  const item = record5(value, code);
  return {
    items: array5(item.items, code).map(reader),
    nextCursor: nullableText5(item.nextCursor, code),
    hasMore: bool5(item.hasMore, code),
    snapshotId: nullableText5(item.snapshotId, code)
  };
}
function record5(value, code) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(code);
  return value;
}
function array5(value, code) {
  if (!Array.isArray(value)) throw new TypeError(code);
  return value;
}
function text5(value, code) {
  if (typeof value !== "string") throw new TypeError(code);
  return value;
}
function nullableText5(value, code) {
  if (value === null) return null;
  return text5(value, code);
}
function optionalNonNullText(value, code) {
  if (value === void 0 || value === null) return void 0;
  return text5(value, code);
}
function optionalNullableText(value, code) {
  if (value === void 0) return void 0;
  return nullableText5(value, code);
}
function integer5(value, code) {
  if (typeof value !== "number" || !Number.isInteger(value)) throw new TypeError(code);
  return value;
}
function numberValue(value, code) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(code);
  return value;
}
function bool5(value, code) {
  if (typeof value !== "boolean") throw new TypeError(code);
  return value;
}
function oneOf5(value, values, code) {
  if (typeof value !== "string" || !values.includes(value)) throw new TypeError(code);
  return value;
}
function stringArray3(value, code) {
  return array5(value, code).map((item) => text5(item, code));
}
function optionalNumberArray2(value, code) {
  if (value === void 0) return [];
  return array5(value, code).map((item) => integer5(item, code));
}
function readSettlementExecution(value) {
  const item = record5(value, "AI_EXECUTION_MISMATCH");
  return {
    poolIssueId: text5(item.poolIssueId, "AI_EXECUTION_POOL_MISMATCH"),
    settlementMode: oneOf5(item.settlementMode, ["MANUAL", "AUTO"], "AI_MODE_MISMATCH"),
    modeChangeAllowed: bool5(item.modeChangeAllowed, "AI_EXECUTION_LOCK_MISMATCH"),
    currentAllocationId: nullableText5(item.currentAllocationId, "AI_EXECUTION_ALLOCATION_MISMATCH"),
    currentAllocationVersion: nullableText5(item.currentAllocationVersion, "AI_EXECUTION_VERSION_MISMATCH"),
    targetNetReturnPercent: integer5(item.targetNetReturnPercent, "AI_EXECUTION_TARGET_MISMATCH"),
    totalReturnPoints: nullableText5(item.totalReturnPoints, "AI_EXECUTION_RETURN_MISMATCH"),
    postedReturnPoints: text5(item.postedReturnPoints, "AI_EXECUTION_POSTED_MISMATCH"),
    targetRoundingAdjustmentPoints: nullableText5(item.targetRoundingAdjustmentPoints, "AI_EXECUTION_TAIL_MISMATCH"),
    payoutBatchId: nullableText5(item.payoutBatchId, "AI_EXECUTION_BATCH_MISMATCH"),
    automaticTaskId: nullableText5(item.automaticTaskId, "AI_EXECUTION_TASK_MISMATCH"),
    automaticTaskStatus: nullableText5(item.automaticTaskStatus, "AI_EXECUTION_STATUS_MISMATCH"),
    failureCode: nullableText5(item.failureCode, "AI_EXECUTION_FAILURE_MISMATCH")
  };
}

// src/features/ai-management/ai-management-api.ts
async function listProjects(query = {}) {
  const response = await adminApi.request("/api/admin/v1/ai-projects", {
    query: {
      lotteryId: query.lotteryId,
      status: query.status,
      keyword: query.keyword,
      cursor: query.cursor,
      limit: 50
    }
  });
  return readProjectPage(response.data);
}
async function getProject(projectId) {
  const response = await adminApi.request(
    `/api/admin/v1/ai-projects/${encodeURIComponent(projectId)}`
  );
  return readProject(response.data);
}
async function getProjectConfig(projectId) {
  const response = await adminApi.request(
    `/api/admin/v1/ai-projects/${encodeURIComponent(projectId)}/configuration`
  );
  return { config: readProjectConfig(response.data), etag: response.etag };
}
async function getCombinationPreview(projectId) {
  const response = await adminApi.request(
    `/api/admin/v1/ai-projects/${encodeURIComponent(projectId)}/combination-preview`
  );
  return readCombinationPreview(response.data);
}
async function saveProjectConfig(input) {
  const response = await adminApi.request(
    `/api/admin/v1/ai-projects/${encodeURIComponent(input.projectId)}/configuration`,
    {
      method: "PUT",
      ifMatch: input.etag,
      idempotencyKey: input.idempotencyKey,
      body: { settings: input.settings, reason: input.reason }
    }
  );
  return readProjectConfig(response.data);
}
async function listPools(projectId, cursor) {
  const response = await adminApi.request(
    `/api/admin/v1/ai-projects/${encodeURIComponent(projectId)}/issues`,
    { query: { limit: 50, cursor } }
  );
  return readPoolPage(response.data);
}
async function getPool(poolIssueId) {
  const response = await adminApi.request(
    `/api/admin/v1/ai-pools/${encodeURIComponent(poolIssueId)}`
  );
  return { value: readPoolAdmin(response.data), etag: response.etag };
}
async function closeFunding(input) {
  const response = await adminApi.request(
    `/api/admin/v1/ai-pools/${encodeURIComponent(input.poolIssueId)}/funding-closure`,
    {
      method: "POST",
      ifMatch: input.etag,
      idempotencyKey: input.idempotencyKey,
      body: { reason: input.reason }
    }
  );
  return readCommandReceipt2(response.data);
}
async function listSubscriptions(poolIssueId, cursor) {
  const response = await adminApi.request(
    `/api/admin/v1/ai-pools/${encodeURIComponent(poolIssueId)}/subscriptions`,
    { query: { limit: 100, cursor } }
  );
  return readSubscriptionPage(response.data);
}
async function calculateAllocation(input) {
  const response = await adminApi.request(
    `/api/admin/v1/ai-pools/${encodeURIComponent(input.pool.pool.id)}/allocation-jobs`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        targetNetReturnPercent: input.targetNetReturnPercent,
        expectedInputVersionSetHash: input.pool.inputVersionSetHash,
        reason: input.reason
      }
    }
  );
  return readTaskAccepted5(response.data);
}
async function listAllocations(poolIssueId) {
  const response = await adminApi.request(
    `/api/admin/v1/ai-pools/${encodeURIComponent(poolIssueId)}/allocations`,
    { query: { limit: 100 } }
  );
  return readAllocationPage(response.data);
}
async function getAllocation(allocationId) {
  const response = await adminApi.request(
    `/api/admin/v1/allocations/${encodeURIComponent(allocationId)}`
  );
  return { value: readAllocation(response.data), etag: response.etag };
}
async function recalculateAllocation(input) {
  const response = await adminApi.request(
    `/api/admin/v1/ai-pools/${encodeURIComponent(input.allocation.poolIssueId)}/allocation-previews`,
    {
      method: "POST",
      ifMatch: input.etag,
      idempotencyKey: input.idempotencyKey,
      body: {
        baseAllocationId: input.allocation.id,
        expectedInputVersionSetHash: input.allocation.inputVersionSetHash,
        targetNetReturnPercent: input.targetNetReturnPercent,
        reason: input.reason
      }
    }
  );
  return readAllocation(response.data);
}
async function confirmAllocation(input) {
  const response = await adminApi.request(
    `/api/admin/v1/allocations/${encodeURIComponent(input.allocationId)}/confirmations`,
    {
      method: "POST",
      ifMatch: input.etag,
      idempotencyKey: input.idempotencyKey,
      body: { reason: input.reason }
    }
  );
  return readAllocation(response.data);
}
async function publishDisclosure(input) {
  const response = await adminApi.request(
    `/api/admin/v1/ai-pools/${encodeURIComponent(input.poolIssueId)}/disclosures`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        allocationVersion: input.allocation.version,
        expectedInputVersionSetHash: input.allocation.inputVersionSetHash,
        reason: input.reason
      }
    }
  );
  return readDisclosureReceipt(response.data);
}
async function preparePayout(input) {
  const response = await adminApi.request(
    `/api/admin/v1/ai-pools/${encodeURIComponent(input.poolIssueId)}/payout-preparations`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        allocationVersion: input.allocationVersion,
        disclosureVersion: input.disclosureVersion,
        expectedInputVersionSetHash: input.expectedInputVersionSetHash
      }
    }
  );
  return readPayoutPreparation(response.data);
}
async function submitPayout(input) {
  const response = await adminApi.request(
    `/api/admin/v1/ai-pools/${encodeURIComponent(input.poolIssueId)}/payouts`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: { preparationId: input.preparationId, confirmText: input.confirmText }
    }
  );
  return readTaskAccepted5(response.data);
}
async function getPayout(batchId) {
  const response = await adminApi.request(
    `/api/admin/v1/payout-batches/${encodeURIComponent(batchId)}`
  );
  return readPayoutBatch(response.data);
}
async function listPayoutItems(batchId, cursor) {
  const response = await adminApi.request(
    `/api/admin/v1/payout-batches/${encodeURIComponent(batchId)}/items`,
    { query: { limit: 100, cursor } }
  );
  return readPayoutItemPage(response.data);
}
async function getTask(taskId) {
  const response = await adminApi.request(
    `/api/admin/v1/tasks/${encodeURIComponent(taskId)}`
  );
  return readTaskStatus4(response.data);
}
async function getAiReport(filters, cursor, snapshotId) {
  const response = await adminApi.request("/api/admin/v1/reports/AI_POOLS", {
    query: {
      from: filters.from,
      to: filters.to,
      asOf: filters.asOf,
      projectId: filters.projectId,
      lotteryId: filters.lotteryId,
      issueCode: filters.issueCode,
      status: filters.status,
      groupBy: filters.groupBy ?? "POOL_ISSUE",
      cursor,
      snapshotId,
      limit: 100
    }
  });
  return readReport(response.data);
}
async function getSettlementExecution(poolIssueId) {
  const response = await adminApi.request(`/api/admin/v1/ai-pools/${encodeURIComponent(poolIssueId)}/settlement-execution`);
  return readSettlementExecution(response.data);
}
async function settleNow(input) {
  const response = await adminApi.request(`/api/admin/v1/ai-pools/${encodeURIComponent(input.poolIssueId)}/quick-settlement`, {
    method: "POST",
    ifMatch: input.etag,
    idempotencyKey: input.idempotencyKey,
    body: { targetNetReturnPercent: input.targetNetReturnPercent, reason: input.reason }
  });
  return readSettlementExecution(response.data);
}

// src/features/order-management/order-models.ts
var orderStatuses = /* @__PURE__ */ new Set([
  "RESERVED",
  "LOCKED",
  "WAITING_DRAW",
  "SETTLING",
  "AWARD_PENDING_BUDGET",
  "SETTLED",
  "CANCELLING",
  "CANCELLED",
  "CORRECTING",
  "CORRECTED",
  "EXCEPTION_PENDING"
]);
function readOrderPage2(value) {
  const root = object(value, "ORDER_PAGE_MISMATCH");
  return {
    items: list(root.items, "ORDER_ITEMS_MISMATCH").map(readOrder),
    nextCursor: nullableText6(root.nextCursor, "ORDER_CURSOR_MISMATCH"),
    hasMore: boolean(root.hasMore, "ORDER_MORE_MISMATCH"),
    snapshotId: nullableText6(root.snapshotId, "ORDER_SNAPSHOT_MISMATCH")
  };
}
function readOrderDetail(value) {
  const root = object(value, "ORDER_DETAIL_MISMATCH");
  return {
    order: readOrder(root.order),
    selection: readSelection2(root.selection),
    recommendationId: nullableText6(root.recommendationId, "ORDER_RECOMMENDATION_MISMATCH"),
    betCount: text6(root.betCount, "ORDER_BET_COUNT_MISMATCH"),
    multiple: integer6(root.multiple, "ORDER_MULTIPLE_MISMATCH"),
    ruleVersion: text6(root.ruleVersion, "ORDER_RULE_VERSION_MISMATCH"),
    simulationRuleVersion: text6(root.simulationRuleVersion, "ORDER_SETTLEMENT_RULE_MISMATCH"),
    ledgerTransactionId: text6(root.ledgerTransactionId, "ORDER_LEDGER_MISMATCH"),
    lockTransactionId: nullableText6(root.lockTransactionId, "ORDER_LOCK_LEDGER_MISMATCH"),
    lockedAt: nullableText6(root.lockedAt, "ORDER_LOCKED_AT_MISMATCH"),
    settlements: list(root.settlements, "ORDER_SETTLEMENTS_MISMATCH").map(readSettlement),
    refund: root.refund === null ? null : readRefund(root.refund)
  };
}
function readTaskAccepted6(value) {
  const root = object(value, "TASK_ACCEPTED_MISMATCH");
  return {
    taskId: text6(root.taskId, "TASK_ID_MISMATCH"),
    status: text6(root.status, "TASK_STATUS_MISMATCH"),
    statusUrl: text6(root.statusUrl, "TASK_URL_MISMATCH"),
    pollAfterSeconds: integer6(root.pollAfterSeconds, "TASK_POLL_MISMATCH")
  };
}
function readOrder(value) {
  const root = object(value, "ORDER_MISMATCH");
  const status = text6(root.status, "ORDER_STATUS_MISMATCH");
  if (!orderStatuses.has(status)) {
    throw new TypeError("ORDER_STATUS_MISMATCH");
  }
  const type = text6(root.type, "ORDER_TYPE_MISMATCH");
  if (type !== "ORDINARY" && type !== "AI_POOL") {
    throw new TypeError("ORDER_TYPE_MISMATCH");
  }
  return {
    id: text6(root.id, "ORDER_ID_MISMATCH"),
    type,
    projectId: nullableText6(root.projectId, "ORDER_PROJECT_MISMATCH"),
    projectName: nullableText6(root.projectName, "ORDER_PROJECT_NAME_MISMATCH"),
    lotteryId: text6(root.lotteryId, "ORDER_LOTTERY_MISMATCH"),
    playId: text6(root.playId, "ORDER_PLAY_MISMATCH"),
    issueCode: text6(root.issueCode, "ORDER_ISSUE_MISMATCH"),
    selection: root.selection === null ? null : readSelection2(root.selection),
    status,
    purchasePoints: text6(root.purchasePoints, "ORDER_PURCHASE_POINTS_MISMATCH"),
    dueAwardPoints: nullableText6(root.dueAwardPoints, "ORDER_DUE_POINTS_MISMATCH"),
    netPostedAwardPoints: text6(root.netPostedAwardPoints, "ORDER_POSTED_POINTS_MISMATCH"),
    refundPoints: text6(root.refundPoints, "ORDER_REFUND_POINTS_MISMATCH"),
    settlementVersion: nullableText6(root.settlementVersion, "ORDER_SETTLEMENT_VERSION_MISMATCH"),
    createdAt: text6(root.createdAt, "ORDER_CREATED_AT_MISMATCH"),
    detailUrl: text6(root.detailUrl, "ORDER_DETAIL_URL_MISMATCH")
  };
}
function readSelection2(value) {
  const root = object(value, "SELECTION_MISMATCH");
  return {
    schemaId: text6(root.schemaId, "SELECTION_SCHEMA_MISMATCH"),
    schemaVersion: text6(root.schemaVersion, "SELECTION_VERSION_MISMATCH"),
    mode: text6(root.mode, "SELECTION_MODE_MISMATCH"),
    areas: list(root.areas, "SELECTION_AREAS_MISMATCH").map((areaValue) => {
      const area = object(areaValue, "SELECTION_AREA_MISMATCH");
      return {
        key: text6(area.key, "SELECTION_AREA_KEY_MISMATCH"),
        chosen: optionalNumbers(area.chosen),
        dan: optionalNumbers(area.dan),
        tuo: optionalNumbers(area.tuo)
      };
    })
  };
}
function readSettlement(value) {
  const root = object(value, "SETTLEMENT_MISMATCH");
  return {
    settlementVersion: text6(root.settlementVersion, "SETTLEMENT_VERSION_MISMATCH"),
    drawVersionId: text6(root.drawVersionId, "SETTLEMENT_DRAW_MISMATCH"),
    calculationReference: text6(root.calculationReference, "SETTLEMENT_CALCULATION_MISMATCH"),
    awardCodes: root.awardCodes === null ? null : list(root.awardCodes, "SETTLEMENT_AWARDS_MISMATCH").map((item) => text6(item, "SETTLEMENT_AWARD_MISMATCH")),
    dueAwardPoints: text6(root.dueAwardPoints, "SETTLEMENT_DUE_MISMATCH"),
    economicDeltaPoints: text6(root.economicDeltaPoints, "SETTLEMENT_DELTA_MISMATCH"),
    actionType: text6(root.actionType, "SETTLEMENT_ACTION_MISMATCH"),
    actionStatus: text6(root.actionStatus, "SETTLEMENT_STATUS_MISMATCH"),
    requestedPoints: text6(root.requestedPoints, "SETTLEMENT_REQUESTED_MISMATCH"),
    postedPoints: text6(root.postedPoints, "SETTLEMENT_POSTED_MISMATCH"),
    platformBornePoints: text6(root.platformBornePoints, "SETTLEMENT_PLATFORM_MISMATCH"),
    ledgerTransactionId: nullableText6(root.ledgerTransactionId, "SETTLEMENT_LEDGER_MISMATCH"),
    createdAt: text6(root.createdAt, "SETTLEMENT_CREATED_MISMATCH"),
    completedAt: nullableText6(root.completedAt, "SETTLEMENT_COMPLETED_MISMATCH")
  };
}
function readRefund(value) {
  const root = object(value, "REFUND_MISMATCH");
  return {
    refundPoints: text6(root.refundPoints, "REFUND_POINTS_MISMATCH"),
    recoveredAwardPoints: text6(root.recoveredAwardPoints, "REFUND_RECOVERED_MISMATCH"),
    platformBornePoints: text6(root.platformBornePoints, "REFUND_PLATFORM_MISMATCH"),
    refundTransactionId: text6(root.refundTransactionId, "REFUND_TRANSACTION_MISMATCH"),
    recoveryTransactionId: nullableText6(root.recoveryTransactionId, "REFUND_RECOVERY_MISMATCH"),
    reason: text6(root.reason, "REFUND_REASON_MISMATCH"),
    refundedAt: text6(root.refundedAt, "REFUND_TIME_MISMATCH")
  };
}
function optionalNumbers(value) {
  if (value === void 0) {
    return [];
  }
  return list(value, "SELECTION_NUMBERS_MISMATCH").map((item) => integer6(item, "SELECTION_NUMBER_MISMATCH"));
}
function object(value, code) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value;
}
function list(value, code) {
  if (!Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value;
}
function text6(value, code) {
  if (typeof value !== "string") {
    throw new TypeError(code);
  }
  return value;
}
function nullableText6(value, code) {
  return value === null ? null : text6(value, code);
}
function boolean(value, code) {
  if (typeof value !== "boolean") {
    throw new TypeError(code);
  }
  return value;
}
function integer6(value, code) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new TypeError(code);
  }
  return value;
}

// src/features/order-management/order-api.ts
async function listAdminOrders(query) {
  const response = await adminApi.request("/api/admin/v1/ordinary-orders", {
    query: { ...query, limit: 50 }
  });
  return readOrderPage2(response.data);
}
async function getAdminOrder(orderId) {
  const response = await adminApi.request(
    `/api/admin/v1/ordinary-orders/${encodeURIComponent(orderId)}`
  );
  return readOrderDetail(response.data);
}
async function retryOrdinarySettlement(input) {
  const response = await adminApi.request(
    `/api/admin/v1/ordinary-orders/${encodeURIComponent(input.orderId)}/settlement-retries`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: { reason: input.reason }
    }
  );
  return readTaskAccepted6(response.data);
}

// src/features/ledger-management/ledger-models.ts
function readLedgerReport(value) {
  const root = object2(value, "LEDGER_REPORT_MISMATCH");
  if (text7(root.reportType, "LEDGER_REPORT_TYPE_MISMATCH") !== "LEDGER_RECONCILIATION") {
    throw new TypeError("LEDGER_REPORT_TYPE_MISMATCH");
  }
  const totalScope = text7(root.totalScope, "LEDGER_REPORT_SCOPE_MISMATCH");
  if (totalScope !== "FULL_FILTER") {
    throw new TypeError("LEDGER_REPORT_SCOPE_MISMATCH");
  }
  const rawFilters = object2(root.filters, "LEDGER_REPORT_FILTERS_MISMATCH");
  const filters = {
    ...rawFilters,
    from: text7(rawFilters.from, "LEDGER_REPORT_FILTER_FROM_MISMATCH"),
    to: text7(rawFilters.to, "LEDGER_REPORT_FILTER_TO_MISMATCH")
  };
  return {
    reportType: "LEDGER_RECONCILIATION",
    metricDictionaryVersion: text7(root.metricDictionaryVersion, "LEDGER_REPORT_DICTIONARY_MISMATCH"),
    snapshotId: text7(root.snapshotId, "LEDGER_REPORT_SNAPSHOT_MISMATCH"),
    filters,
    asOf: text7(root.asOf, "LEDGER_REPORT_TIME_MISMATCH"),
    projectionVersion: text7(root.projectionVersion, "LEDGER_REPORT_PROJECTION_MISMATCH"),
    sourceWatermark: text7(root.sourceWatermark, "LEDGER_REPORT_WATERMARK_MISMATCH"),
    items: list2(root.items, "LEDGER_REPORT_ITEMS_MISMATCH").map((value2) => {
      const item = object2(value2, "LEDGER_REPORT_ROW_MISMATCH");
      return {
        dimensions: object2(item.dimensions, "LEDGER_REPORT_DIMENSIONS_MISMATCH"),
        metrics: object2(item.metrics, "LEDGER_REPORT_METRICS_MISMATCH")
      };
    }),
    totals: object2(root.totals, "LEDGER_REPORT_TOTALS_MISMATCH"),
    totalScope,
    nextCursor: nullableText7(root.nextCursor, "LEDGER_REPORT_CURSOR_MISMATCH"),
    hasMore: boolean2(root.hasMore, "LEDGER_REPORT_MORE_MISMATCH"),
    complete: boolean2(root.complete, "LEDGER_REPORT_COMPLETE_MISMATCH")
  };
}
function readBudgetPage3(value) {
  const root = object2(value, "BUDGET_PAGE_MISMATCH");
  return {
    items: list2(root.items, "BUDGET_ITEMS_MISMATCH").map((value2) => {
      const item = object2(value2, "BUDGET_MISMATCH");
      const type = text7(item.type, "BUDGET_TYPE_MISMATCH");
      if (!["DISTRIBUTION_BUDGET", "ORDINARY_AWARD_BUDGET", "AI_BUDGET", "REFERRAL_BUDGET"].includes(type)) {
        throw new TypeError("BUDGET_TYPE_MISMATCH");
      }
      return {
        id: text7(item.id, "BUDGET_ID_MISMATCH"),
        type,
        availablePoints: text7(item.availablePoints, "BUDGET_AVAILABLE_MISMATCH"),
        reservedPoints: text7(item.reservedPoints, "BUDGET_RESERVED_MISMATCH"),
        version: text7(item.version, "BUDGET_VERSION_MISMATCH")
      };
    }),
    nextCursor: nullableText7(root.nextCursor, "BUDGET_CURSOR_MISMATCH"),
    hasMore: boolean2(root.hasMore, "BUDGET_MORE_MISMATCH"),
    snapshotId: nullableText7(root.snapshotId, "BUDGET_SNAPSHOT_MISMATCH")
  };
}
function readAdminLedgerTransactionPage(value) {
  const root = object2(value, "ADMIN_LEDGER_PAGE_MISMATCH");
  return {
    items: list2(root.items, "ADMIN_LEDGER_ITEMS_MISMATCH").map(readAdminLedgerTransaction),
    nextCursor: nullableText7(root.nextCursor, "ADMIN_LEDGER_CURSOR_MISMATCH"),
    hasMore: boolean2(root.hasMore, "ADMIN_LEDGER_MORE_MISMATCH"),
    snapshotId: nullableText7(root.snapshotId, "ADMIN_LEDGER_SNAPSHOT_MISMATCH")
  };
}
function readAdminLedgerTransaction(value) {
  const item = object2(value, "ADMIN_LEDGER_TRANSACTION_MISMATCH");
  const assetType = text7(item.assetType, "ADMIN_LEDGER_ASSET_MISMATCH");
  if (assetType !== "POINTS") throw new TypeError("ADMIN_LEDGER_ASSET_MISMATCH");
  return {
    id: text7(item.id, "ADMIN_LEDGER_ID_MISMATCH"),
    sequence: text7(item.sequence, "ADMIN_LEDGER_SEQUENCE_MISMATCH"),
    businessNumber: text7(item.businessNumber, "ADMIN_LEDGER_BUSINESS_MISMATCH"),
    assetType,
    sourceType: text7(item.sourceType, "ADMIN_LEDGER_SOURCE_TYPE_MISMATCH"),
    sourceId: text7(item.sourceId, "ADMIN_LEDGER_SOURCE_ID_MISMATCH"),
    type: text7(item.type, "ADMIN_LEDGER_TYPE_MISMATCH"),
    status: text7(item.status, "ADMIN_LEDGER_STATUS_MISMATCH"),
    economicPoints: text7(item.economicPoints, "ADMIN_LEDGER_AMOUNT_MISMATCH"),
    reversedPoints: text7(item.reversedPoints, "ADMIN_LEDGER_REVERSED_MISMATCH"),
    referenceTransactionId: nullableText7(item.referenceTransactionId, "ADMIN_LEDGER_REFERENCE_MISMATCH"),
    stationId: nullableText7(item.stationId, "ADMIN_LEDGER_STATION_MISMATCH"),
    stationCode: nullableText7(item.stationCode, "ADMIN_LEDGER_STATION_CODE_MISMATCH"),
    stationName: nullableText7(item.stationName, "ADMIN_LEDGER_STATION_NAME_MISMATCH"),
    stationMasterId: nullableText7(item.stationMasterId, "ADMIN_LEDGER_MASTER_MISMATCH"),
    stationMasterCode: nullableText7(item.stationMasterCode, "ADMIN_LEDGER_MASTER_CODE_MISMATCH"),
    stationMasterName: nullableText7(item.stationMasterName, "ADMIN_LEDGER_MASTER_NAME_MISMATCH"),
    memberId: nullableText7(item.memberId, "ADMIN_LEDGER_MEMBER_MISMATCH"),
    issueCode: nullableText7(item.issueCode, "ADMIN_LEDGER_ISSUE_MISMATCH"),
    operatorRealm: text7(item.operatorRealm, "ADMIN_LEDGER_OPERATOR_REALM_MISMATCH"),
    operatorId: text7(item.operatorId, "ADMIN_LEDGER_OPERATOR_MISMATCH"),
    reason: text7(item.reason, "ADMIN_LEDGER_REASON_MISMATCH"),
    createdAt: text7(item.createdAt, "ADMIN_LEDGER_TIME_MISMATCH"),
    entries: list2(item.entries, "ADMIN_LEDGER_ENTRIES_MISMATCH").map(readAdminLedgerEntry)
  };
}
function readAdminLedgerEntry(value) {
  const item = object2(value, "ADMIN_LEDGER_ENTRY_MISMATCH");
  const assetType = text7(item.assetType, "ADMIN_LEDGER_ENTRY_ASSET_MISMATCH");
  const direction = text7(item.direction, "ADMIN_LEDGER_DIRECTION_MISMATCH");
  if (assetType !== "POINTS") throw new TypeError("ADMIN_LEDGER_ENTRY_ASSET_MISMATCH");
  if (direction !== "CREDIT" && direction !== "DEBIT") {
    throw new TypeError("ADMIN_LEDGER_DIRECTION_MISMATCH");
  }
  return {
    id: text7(item.id, "ADMIN_LEDGER_ENTRY_ID_MISMATCH"),
    entryNo: integer7(item.entryNo, "ADMIN_LEDGER_ENTRY_NO_MISMATCH"),
    accountId: text7(item.accountId, "ADMIN_LEDGER_ACCOUNT_ID_MISMATCH"),
    ownerType: text7(item.ownerType, "ADMIN_LEDGER_OWNER_TYPE_MISMATCH"),
    ownerId: text7(item.ownerId, "ADMIN_LEDGER_OWNER_ID_MISMATCH"),
    ownerAccount: nullableText7(item.ownerAccount, "ADMIN_LEDGER_OWNER_ACCOUNT_MISMATCH"),
    ownerName: nullableText7(item.ownerName, "ADMIN_LEDGER_OWNER_NAME_MISMATCH"),
    assetType,
    bucket: text7(item.bucket, "ADMIN_LEDGER_BUCKET_MISMATCH"),
    direction,
    changePoints: text7(item.changePoints, "ADMIN_LEDGER_CHANGE_MISMATCH"),
    balanceBefore: text7(item.balanceBefore, "ADMIN_LEDGER_BEFORE_MISMATCH"),
    balanceAfter: text7(item.balanceAfter, "ADMIN_LEDGER_AFTER_MISMATCH")
  };
}
function readTaskAccepted7(value) {
  const root = object2(value, "TASK_ACCEPTED_MISMATCH");
  return {
    taskId: text7(root.taskId, "TASK_ID_MISMATCH"),
    status: text7(root.status, "TASK_STATUS_MISMATCH"),
    statusUrl: text7(root.statusUrl, "TASK_URL_MISMATCH"),
    pollAfterSeconds: integer7(root.pollAfterSeconds, "TASK_POLL_MISMATCH")
  };
}
function readTaskStatus5(value) {
  const root = object2(value, "TASK_STATUS_MISMATCH");
  return {
    id: text7(root.id, "TASK_STATUS_ID_MISMATCH"),
    taskType: text7(root.taskType, "TASK_TYPE_MISMATCH"),
    status: text7(root.status, "TASK_STATE_MISMATCH"),
    progress: number2(root.progress, "TASK_PROGRESS_MISMATCH"),
    resultUrl: nullableText7(root.resultUrl, "TASK_RESULT_URL_MISMATCH"),
    resultCode: nullableText7(root.resultCode, "TASK_RESULT_CODE_MISMATCH"),
    failureCode: nullableText7(root.failureCode, "TASK_FAILURE_MISMATCH"),
    updatedAt: text7(root.updatedAt, "TASK_UPDATED_MISMATCH")
  };
}
function readReconciliation(value) {
  const root = object2(value, "RECONCILIATION_MISMATCH");
  const status = text7(root.status, "RECONCILIATION_STATUS_MISMATCH");
  if (!["PENDING", "RUNNING", "MATCHED", "MISMATCH"].includes(status)) {
    throw new TypeError("RECONCILIATION_STATUS_MISMATCH");
  }
  return {
    id: text7(root.id, "RECONCILIATION_ID_MISMATCH"),
    status,
    expectedPoints: nullableText7(root.expectedPoints, "RECONCILIATION_EXPECTED_MISMATCH"),
    actualPoints: nullableText7(root.actualPoints, "RECONCILIATION_ACTUAL_MISMATCH"),
    differencePoints: nullableText7(root.differencePoints, "RECONCILIATION_DIFFERENCE_MISMATCH"),
    asOf: nullableText7(root.asOf, "RECONCILIATION_TIME_MISMATCH")
  };
}
function readCommandReceipt3(value) {
  const root = object2(value, "COMMAND_RECEIPT_MISMATCH");
  const status = text7(root.status, "COMMAND_STATUS_MISMATCH");
  if (status !== "ACCEPTED" && status !== "COMPLETED") {
    throw new TypeError("COMMAND_STATUS_MISMATCH");
  }
  return {
    commandId: text7(root.commandId, "COMMAND_ID_MISMATCH"),
    operationId: text7(root.operationId, "COMMAND_OPERATION_MISMATCH"),
    resourceId: text7(root.resourceId, "COMMAND_RESOURCE_MISMATCH"),
    status,
    createdAt: text7(root.createdAt, "COMMAND_TIME_MISMATCH")
  };
}
function object2(value, code) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value;
}
function list2(value, code) {
  if (!Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value;
}
function text7(value, code) {
  if (typeof value !== "string") {
    throw new TypeError(code);
  }
  return value;
}
function nullableText7(value, code) {
  return value === null ? null : text7(value, code);
}
function boolean2(value, code) {
  if (typeof value !== "boolean") {
    throw new TypeError(code);
  }
  return value;
}
function integer7(value, code) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new TypeError(code);
  }
  return value;
}
function number2(value, code) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(code);
  }
  return value;
}

// src/features/ledger-management/ledger-api.ts
async function listAdminLedgerTransactions(query) {
  const response = await adminApi.request("/api/admin/v1/ledger-transactions", {
    query: { ...query, limit: 20 }
  });
  return readAdminLedgerTransactionPage(response.data);
}
async function getAdminReport2(query) {
  const response = await adminApi.request("/api/admin/v1/reports/LEDGER_RECONCILIATION", {
    query: {
      ...query,
      groupBy: "DAY",
      limit: 50
    }
  });
  return readLedgerReport(response.data);
}
async function listBudgets(cursor) {
  const response = await adminApi.request("/api/admin/v1/budget-accounts", {
    query: { cursor, limit: 100 }
  });
  return readBudgetPage3(response.data);
}
async function createReconciliation(input) {
  const response = await adminApi.request("/api/admin/v1/reconciliations", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: { reason: input.reason }
  });
  return readTaskAccepted7(response.data);
}
async function getReconciliation(reconciliationId) {
  const response = await adminApi.request(
    `/api/admin/v1/reconciliations/${encodeURIComponent(reconciliationId)}`
  );
  return readReconciliation(response.data);
}
async function getAdminTask(taskId) {
  const response = await adminApi.request(
    `/api/admin/v1/tasks/${encodeURIComponent(taskId)}`
  );
  return readTaskStatus5(response.data);
}
async function createLedgerReversal(input) {
  const expectedHash = await canonicalDigest4([
    "LEDGER_REVERSAL",
    input.originalTransactionId,
    input.points,
    sortedValues(input.evidenceIds),
    input.reason
  ]);
  const authorization = await adminApi.request("/api/admin/v1/action-authorizations", {
    method: "POST",
    body: {
      purpose: "LEDGER_REVERSAL",
      targetType: "EXISTING_RESOURCE",
      resourceId: input.originalTransactionId,
      expectedInputVersionSetHash: expectedHash,
      expectedAmount: input.points,
      finalIdempotencyKey: input.idempotencyKey,
      proofCode: input.proofCode
    }
  });
  const actionToken = readActionToken(authorization.data);
  const response = await adminApi.request("/api/admin/v1/ledger-reversals", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    actionToken,
    body: {
      originalTransactionId: input.originalTransactionId,
      points: input.points,
      reason: input.reason,
      evidenceIds: input.evidenceIds
    }
  });
  return readCommandReceipt3(response.data);
}
function readActionToken(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("ACTION_AUTHORIZATION_MISMATCH");
  }
  const token = value.actionToken;
  if (typeof token !== "string") {
    throw new TypeError("ACTION_AUTHORIZATION_MISMATCH");
  }
  return token;
}
function sortedValues(values) {
  return [...values].sort().reduce((result, value) => `${result}|${value}`, "");
}
async function canonicalDigest4(fields) {
  const encoder2 = new TextEncoder();
  const chunks = [];
  let length = 0;
  for (const field of fields) {
    const value = encoder2.encode(field);
    const prefix = encoder2.encode(`${value.length}:`);
    const suffix = encoder2.encode(";");
    chunks.push(prefix, value, suffix);
    length += prefix.length + value.length + suffix.length;
  }
  const canonical = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    canonical.set(chunk, offset);
    offset += chunk.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", canonical);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// src/features/employee-security/employee-models.ts
function readEmployeePage(value) {
  return readPage5(value, readEmployee, "EMPLOYEE_PAGE_MISMATCH");
}
function readEmployee(value) {
  const root = object3(value, "EMPLOYEE_MISMATCH");
  const status = text8(root.status, "EMPLOYEE_STATUS_MISMATCH");
  if (status !== "ENABLED" && status !== "DISABLED") {
    throw new TypeError("EMPLOYEE_STATUS_MISMATCH");
  }
  return {
    id: text8(root.id, "EMPLOYEE_ID_MISMATCH"),
    account: text8(root.account, "EMPLOYEE_ACCOUNT_MISMATCH"),
    name: text8(root.name, "EMPLOYEE_NAME_MISMATCH"),
    status,
    roleIds: strings(root.roleIds, "EMPLOYEE_ROLES_MISMATCH"),
    scopeStationIds: strings(root.scopeStationIds, "EMPLOYEE_SCOPE_MISMATCH"),
    version: text8(root.version, "EMPLOYEE_VERSION_MISMATCH")
  };
}
function readRolePage(value) {
  return readPage5(value, (item) => {
    const root = object3(item, "ROLE_MISMATCH");
    return {
      id: text8(root.id, "ROLE_ID_MISMATCH"),
      name: text8(root.name, "ROLE_NAME_MISMATCH"),
      permissions: strings(root.permissions, "ROLE_PERMISSIONS_MISMATCH")
    };
  }, "ROLE_PAGE_MISMATCH");
}
function readAuditPage(value) {
  return readPage5(value, (item) => {
    const root = object3(item, "AUDIT_MISMATCH");
    return {
      id: text8(root.id, "AUDIT_ID_MISMATCH"),
      actorId: text8(root.actorId, "AUDIT_ACTOR_MISMATCH"),
      operationId: text8(root.operationId, "AUDIT_OPERATION_MISMATCH"),
      resourceId: text8(root.resourceId, "AUDIT_RESOURCE_MISMATCH"),
      reason: text8(root.reason, "AUDIT_REASON_MISMATCH"),
      beforeVersion: nullableText8(root.beforeVersion, "AUDIT_BEFORE_MISMATCH"),
      afterVersion: nullableText8(root.afterVersion, "AUDIT_AFTER_MISMATCH"),
      resultCode: text8(root.resultCode, "AUDIT_RESULT_MISMATCH"),
      createdAt: text8(root.createdAt, "AUDIT_TIME_MISMATCH"),
      traceId: text8(root.traceId, "AUDIT_TRACE_MISMATCH")
    };
  }, "AUDIT_PAGE_MISMATCH");
}
function readPage5(value, reader, code) {
  const root = object3(value, code);
  return {
    items: list3(root.items, code).map(reader),
    nextCursor: nullableText8(root.nextCursor, code),
    hasMore: boolean3(root.hasMore, code),
    snapshotId: nullableText8(root.snapshotId, code)
  };
}
function object3(value, code) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value;
}
function list3(value, code) {
  if (!Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value;
}
function strings(value, code) {
  return list3(value, code).map((item) => text8(item, code));
}
function text8(value, code) {
  if (typeof value !== "string") {
    throw new TypeError(code);
  }
  return value;
}
function nullableText8(value, code) {
  return value === null ? null : text8(value, code);
}
function boolean3(value, code) {
  if (typeof value !== "boolean") {
    throw new TypeError(code);
  }
  return value;
}

// src/features/employee-security/employee-api.ts
async function listEmployees(cursor) {
  const response = await adminApi.request("/api/admin/v1/employees", {
    query: { cursor, limit: 50 }
  });
  return readEmployeePage(response.data);
}
async function listRoles(cursor) {
  const response = await adminApi.request("/api/admin/v1/roles", {
    query: { cursor, limit: 100 }
  });
  return readRolePage(response.data);
}
async function listAudits(query) {
  const response = await adminApi.request("/api/admin/v1/audit-events", {
    query: { ...query, limit: 50 }
  });
  return readAuditPage(response.data);
}
async function createEmployee(input) {
  const actionHash = await canonicalDigest5([
    "EMPLOYEE_CREATE",
    input.account.toLowerCase(),
    input.name,
    sortedValues2(input.roleIds),
    sortedValues2(input.scopeStationIds),
    input.reason
  ]);
  const token = await adminAuthorizeAction({
    purpose: "EMPLOYEE_CREATE",
    targetType: "CREATE_INTENT",
    resourceId: input.clientIntentId,
    expectedHash: actionHash,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode
  });
  const response = await adminApi.request("/api/admin/v1/employees", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    actionToken: token,
    body: {
      clientIntentId: input.clientIntentId,
      account: input.account,
      initialPassword: input.initialPassword,
      name: input.name,
      roleIds: input.roleIds,
      scopeStationIds: input.scopeStationIds,
      reason: input.reason
    }
  });
  return readEmployee(response.data);
}
async function updateEmployeePermissions(input) {
  const actionHash = await canonicalDigest5([
    "EMPLOYEE_PERMISSION_CHANGE",
    input.employee.id,
    input.employee.version,
    sortedValues2(input.roleIds),
    sortedValues2(input.scopeStationIds),
    input.reason
  ]);
  const token = await adminAuthorizeAction({
    purpose: "EMPLOYEE_PERMISSION_CHANGE",
    targetType: "EXISTING_RESOURCE",
    resourceId: input.employee.id,
    expectedHash: actionHash,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode
  });
  const response = await adminApi.request(
    `/api/admin/v1/employees/${encodeURIComponent(input.employee.id)}/permissions`,
    {
      method: "PUT",
      idempotencyKey: input.idempotencyKey,
      actionToken: token,
      ifMatch: `"${input.employee.version}"`,
      body: {
        roleIds: input.roleIds,
        scopeStationIds: input.scopeStationIds,
        reason: input.reason
      }
    }
  );
  return readEmployee(response.data);
}
async function recoverEmployeeAccount(input) {
  const actionHash = await canonicalDigest5([
    "EMPLOYEE_ACCOUNT_RECOVERY",
    input.employee.id,
    input.employee.version,
    input.evidenceId,
    input.reason
  ]);
  const token = await adminAuthorizeAction({
    purpose: "EMPLOYEE_ACCOUNT_RECOVERY",
    targetType: "EXISTING_RESOURCE",
    resourceId: input.employee.id,
    expectedHash: actionHash,
    finalIdempotencyKey: input.idempotencyKey,
    proofCode: input.proofCode
  });
  const response = await adminApi.request(
    `/api/admin/v1/employees/${encodeURIComponent(input.employee.id)}/recovery`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      actionToken: token,
      ifMatch: `"${input.employee.version}"`,
      body: {
        newPassword: input.newPassword,
        evidenceId: input.evidenceId,
        reason: input.reason
      }
    }
  );
  return readEmployee(response.data);
}
async function adminAuthorizeAction(input) {
  const response = await adminApi.request("/api/admin/v1/action-authorizations", {
    method: "POST",
    body: {
      purpose: input.purpose,
      targetType: input.targetType,
      resourceId: input.resourceId,
      expectedInputVersionSetHash: input.expectedHash,
      expectedAmount: null,
      finalIdempotencyKey: input.finalIdempotencyKey,
      proofCode: input.proofCode
    }
  });
  if (typeof response.data !== "object" || response.data === null || Array.isArray(response.data)) {
    throw new TypeError("ACTION_AUTHORIZATION_MISMATCH");
  }
  const token = response.data.actionToken;
  if (typeof token !== "string") {
    throw new TypeError("ACTION_AUTHORIZATION_MISMATCH");
  }
  return token;
}
function sortedValues2(values) {
  return [...values].sort().reduce((result, value) => `${result}|${value}`, "");
}
async function canonicalDigest5(fields) {
  const encoder2 = new TextEncoder();
  const chunks = [];
  let length = 0;
  for (const field of fields) {
    const value = encoder2.encode(field);
    const prefix = encoder2.encode(`${value.length}:`);
    const suffix = encoder2.encode(";");
    chunks.push(prefix, value, suffix);
    length += prefix.length + value.length + suffix.length;
  }
  const canonical = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    canonical.set(chunk, offset);
    offset += chunk.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", canonical);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// scripts/verify.ts
globalThis.fetch = (() => {
  throw new Error("Prototype attempted a network request");
});
var results = [];
async function check(name, action) {
  try {
    await action();
    results.push({ name, passed: true });
  } catch (e) {
    results.push({ name, passed: false, error: String(e) });
  }
}
var l = state.catalog.lotteries[0];
var r = state.robots[0];
var member = state.members[0];
var master = state.stationMasters[0];
var pool = state.pools[1];
await check("\u76EE\u5F55 / 8 \u5F69\u79CD / 22 \u73A9\u6CD5", async () => {
  const c = await getAdminCatalog();
  assert.equal(c.lotteries.length, 8);
  assert.equal(c.lotteries.flatMap((l2) => l2.plays).length, 22);
});
await check("\u671F\u6B21", () => listIssues(l.id));
await check("\u89C4\u5219\u8BE6\u60C5", () => getRuleDetail(l.plays[0].id));
await check("\u6570\u636E\u5065\u5EB7", () => getDataHealth());
await check("\u6570\u636E\u6765\u6E90", () => listDataSources());
await check("\u89C4\u5219\u7248\u672C", () => listRuleDrafts());
await check("\u653F\u7B56\u7248\u672C", () => listPolicies());
await check("\u5F00\u5956\u5019\u9009", () => listDrawCandidates(l.id, "2026261"));
await check("\u5F00\u5956\u7248\u672C", () => listDrawVersions(l.id, "2026260"));
await check("\u9057\u6F0F\u7F3A\u53E3", () => listOmissionGaps(state.catalog.lotteries[5].id));
await check("\u5927\u5E08\u7B56\u7565", () => listRobotStrategies());
await check("\u5927\u5E08\u5217\u8868 / 48 \u5934\u50CF", async () => {
  const page3 = await listAdminRobots({ limit: 100 });
  assert.equal(page3.items.length, 48);
});
await check("\u5927\u5E08\u8BE6\u60C5", () => getAdminRobot(r.robot.id));
await check("\u5927\u5E08\u6267\u884C", () => listRobotExecutions(r.robot.id));
await check("\u5927\u5E08\u63A8\u8350", () => listAdminRecommendations(r.robot.id));
await check("\u7AD9\u70B9", () => listStations({}));
await check("\u7AD9\u70B9\u8BE6\u60C5", () => getStation(state.stations[0].id));
await check("\u7AD9\u957F", () => listStationMasters({}));
await check("\u7AD9\u957F\u8BE6\u60C5", () => getStationMaster(master.id));
await check("\u4F1A\u5458\u5217\u8868", () => listAdminMembers({}));
await check("\u4F1A\u5458 125 \u6761 / \u4E94\u6863\u5206\u9875 / \u9996\u5C3E\u8FB9\u754C / \u7B5B\u9009", async () => {
  const original = state.members;
  try {
    state.members = Array.from({ length: 125 }, (_, i) => ({ ...structuredClone(original[i % original.length]), id: `pagination-member-${i + 1}`, account: `pagination_${i + 1}`, displayName: `\u5206\u9875\u9A8C\u6536${i + 1}` }));
    assert.equal((await listAdminMembers({})).items.length, 20);
    for (const limit of [20, 40, 60, 80, 100]) {
      const seen = [];
      let cursor;
      do {
        const result = await listAdminMembers({ limit, cursor });
        assert.equal(result.totalCount, 125);
        assert.equal(result.items.length, Math.min(limit, 125 - seen.length));
        seen.push(...result.items.map((item) => item.id));
        assert.equal(result.hasMore, seen.length < 125);
        cursor = result.nextCursor ?? void 0;
      } while (cursor);
      assert.equal(new Set(seen).size, 125);
      assert.deepEqual(seen, state.members.map((item) => item.id));
    }
    const filtered4 = await listAdminMembers({ stationId: state.stations[0].id, limit: 20 });
    assert.equal(filtered4.totalCount, 42);
    assert.equal(filtered4.items.length, 20);
    assert.equal((await listAdminMembers({ stationId: state.stations[0].id, limit: 20, cursor: "40" })).items.length, 2);
    const empty = await listAdminMembers({ keyword: "\u6CA1\u6709\u6B64\u4F1A\u5458" });
    assert.equal(empty.totalCount, 0);
    assert.equal(empty.nextCursor, null);
    assert.equal(empty.hasMore, false);
  } finally {
    state.members = original;
  }
});
await check("\u79EF\u5206\u516C\u5F0F / \u8D1F\u51C0\u6536\u76CA / \u51BB\u7ED3\u5355\u5217 / AI \u4E09\u9879\u989D\u5EA6", async () => {
  const row = { ...structuredClone(member), qualifiedRechargePoints: "1000.10", totalReferralPoints: "80.20", netProfitPoints: "-120.30", aiDividendPoints: "40.05", stationDeductedPoints: "200.10" };
  row.wallet.reservedPoints = "500.00";
  row.quota.totalLimit = "1200.00";
  row.quota.usedPoints = "123.45";
  refreshMemberMetrics([row]);
  assert.equal(row.wallet.availablePoints, "799.95");
  assert.equal(row.wallet.reservedPoints, "500.00");
  assert.equal(row.quota.remainingPoints, "1076.55");
});
await check("\u76F4\u5C5E\u4E0E\u4E09\u7EA7\u4E0B\u7EA7\u6C47\u603B / \u5F52\u5C5E\u53D8\u66F4 / \u4E0D\u53D7\u5206\u9875\u5F71\u54CD", async () => {
  const original = state.members;
  try {
    const parentIds = [null, "tree-0", "tree-0", "tree-1", "tree-3"];
    state.members = parentIds.map((parentId, i) => ({ ...structuredClone(member), id: `tree-${i}`, qualifiedRechargePoints: String((i + 1) * 100) + ".00", totalReferralPoints: "0.00", netProfitPoints: "0.00", aiDividendPoints: "0.00", stationDeductedPoints: "0.00", scope: { ...structuredClone(member.scope), referrerMember: parentId ? { id: parentId, code: parentId, name: parentId } : null } }));
    const root = (await listAdminMembers({ keyword: "tree-0", limit: 1 })).items[0];
    assert.equal(root.directMemberCount, 2);
    assert.equal(root.descendantMemberCount, 4);
    assert.equal(root.directMemberAvailableTotal, "500.00");
    assert.equal(root.descendantMemberAvailableTotal, "1400.00");
    const leaf = (await getAdminMember("tree-4")).data;
    assert.equal(leaf.descendantMemberCount, 0);
    assert.equal(leaf.descendantMemberAvailableTotal, "0.00");
    state.members[3].scope.referrerMember = null;
    const moved = (await getAdminMember("tree-0")).data;
    assert.equal(moved.descendantMemberCount, 2);
    assert.equal(moved.descendantMemberAvailableTotal, "500.00");
  } finally {
    state.members = original;
  }
});
await check("\u65E7\u672C\u5730\u6570\u636E\u8865\u9F50 / AI \u5386\u53F2\u53D1\u653E / \u9080\u8BF7\u7801\u7A33\u5B9A", async () => {
  const old = structuredClone(member);
  delete old.aiDividendPoints;
  delete old.totalReferralPoints;
  delete old.inviteCode;
  old.status = "DISABLED";
  old.displayName = "\u4FDD\u7559\u5DF2\u6709\u6F14\u793A\u4FEE\u6539";
  refreshMemberMetrics([old], [{ memberId: old.id, type: "AI_AWARD", economicPoints: "12.34", reversedPoints: "0.00" }]);
  assert.equal(old.aiDividendPoints, "12.34");
  assert.equal(old.totalReferralPoints, "0.00");
  assert.equal(old.status, "DISABLED");
  assert.equal(old.displayName, "\u4FDD\u7559\u5DF2\u6709\u6F14\u793A\u4FEE\u6539");
  const code = old.inviteCode;
  refreshMemberMetrics([old]);
  assert.equal(old.inviteCode, code);
  assert.equal(old.aiDividendPoints, "12.34");
});
await check("\u4F1A\u5458\u8BE6\u60C5", () => getAdminMember(member.id));
await check("\u4F1A\u5458\u6D41\u6C34", () => listAdminMemberLedgers(member.id));
await check("\u4F1A\u5458\u8BA2\u5355", () => listAdminMemberOrders(member.id));
await check("VIP \u914D\u7F6E", () => getVipConfig());
await check("VIP \u7248\u672C", () => listVipConfigHistory());
await check("\u63A8\u5E7F\u914D\u7F6E", () => getReferralConfig());
await check("\u63A8\u5E7F\u7248\u672C", () => listReferralConfigHistory());
await check("AI \u9879\u76EE", () => listProjects());
await check("AI \u9879\u76EE\u8BE6\u60C5", () => getProject(pool.projectId));
await check("AI \u8BBE\u7F6E", () => getProjectConfig(pool.projectId));
await check("AI 50x20 \u7EC4\u5408", async () => {
  const p = await getCombinationPreview(pool.projectId);
  assert.equal(p.combinations.length, 50);
  assert.equal(new Set(p.combinations.flatMap((c) => c.numberCodes)).size, 1e3);
});
await check("AI \u671F\u6B21", () => listPools(pool.projectId));
await check("AI \u671F\u6B21\u8BE6\u60C5", () => getPool(pool.id));
await check("AI \u8BA4\u8D2D", () => listSubscriptions(pool.id));
await check("AI \u5206\u914D\u5386\u53F2", () => listAllocations(pool.id));
await check("AI \u5206\u914D\u8BE6\u60C5", () => getAllocation(state.allocations[0].id));
await check("AI \u53D1\u653E\u8FDB\u5EA6", () => getSettlementExecution(pool.id));
await check("\u8BA2\u5355\u5217\u8868", () => listAdminOrders({}));
await check("\u8BA2\u5355\u8BE6\u60C5", () => getAdminOrder(state.orders[0].id));
await check("\u53CC\u8FB9\u79EF\u5206\u8D26\u672C", () => listAdminLedgerTransactions({}));
await check("\u9884\u7B97\u8D26\u6237", () => listBudgets());
await check("\u5458\u5DE5", () => listEmployees());
await check("\u89D2\u8272\u6743\u9650", () => listRoles());
await check("\u5BA1\u8BA1", () => listAudits({}));
for (const type of ["MEMBER_OVERVIEW", "MEMBER_POINTS", "VIP_LEVELS", "REFERRAL_LEVELS", "AI_QUOTA", "AI_POOLS", "STATION_MASTERS", "LEDGER_RECONCILIATION"]) await check(`\u62A5\u8868 ${type}`, () => getAdminReport(type, { from: "2026-09-27", to: "2026-10-03" }));
await check("\u65B0\u589E\u7AD9\u70B9 / \u66F4\u65B0 / \u505C\u7528", async () => {
  const created = (await adminApi.request("/api/admin/v1/stations", { method: "POST", body: { code: "TEST", name: "\u9A8C\u6536\u7AD9\u70B9", regionLabel: "\u676D\u5DDE", remark: "demo" } })).data;
  assert.equal((await getStation(created.id)).value.name, "\u9A8C\u6536\u7AD9\u70B9");
  await adminApi.request(`/api/admin/v1/stations/${created.id}/status`, { method: "POST", body: { status: "DISABLED", reason: "\u9A8C\u6536" } });
  assert.equal((await getStation(created.id)).value.status, "DISABLED");
});
await check("\u4F1A\u5458\u505C\u7528 / \u6062\u590D", async () => {
  const v = await getAdminMember(member.id);
  const updated = await setMemberStatus({ memberId: member.id, status: "DISABLED", reason: "\u6F14\u793A\u9A8C\u6536", etag: v.etag, idempotencyKey: "verify-member" });
  assert.equal(updated.data.status, "DISABLED");
  await setMemberStatus({ memberId: member.id, status: "ENABLED", reason: "\u6062\u590D", etag: updated.etag, idempotencyKey: "verify-member-restore" });
});
await check("\u5927\u5E08\u65B0\u589E / \u7F16\u8F91 / \u5220\u9664", async () => {
  const created = await createRobot({ name: "\u9A8C\u6536\u5927\u5E08", allowedLotteryIds: [l.id], strategy: r.strategy, generationMode: "MANUAL", generationTime: null, reason: "demo" }, "verify-robot");
  assert.equal(created.robot.lotteryIds[0], l.id);
  await deleteRobot(created, "\u9A8C\u6536\u5220\u9664", "verify-delete");
});
await check("AI \u91CD\u7B97 \u2192 \u786E\u8BA4 \u2192 \u516C\u793A \u2192 \u53D1\u653E \u2192 \u8FDB\u5EA6", async () => {
  const first = await getAllocation(state.allocations[0].id);
  const preview = await recalculateAllocation({ allocation: first.value, targetNetReturnPercent: 15, reason: "\u6F14\u793A\u9A8C\u6536", etag: first.etag, idempotencyKey: "verify-allocation" });
  const confirmed = await confirmAllocation({ allocationId: preview.id, reason: "\u6F14\u793A\u786E\u8BA4", etag: '"2"', idempotencyKey: "verify-confirm" });
  assert.equal(confirmed.confirmationStatus, "CONFIRMED");
  const disclosure = await publishDisclosure({ poolIssueId: pool.id, allocation: confirmed, reason: "\u6F14\u793A\u516C\u793A", idempotencyKey: "verify-publish" });
  const prep = await preparePayout({ poolIssueId: pool.id, allocationVersion: confirmed.version, disclosureVersion: disclosure.version, expectedInputVersionSetHash: confirmed.inputVersionSetHash, idempotencyKey: "verify-prep" });
  assert.equal(prep.eligible, true);
  const accepted = await submitPayout({ poolIssueId: pool.id, preparationId: prep.preparationId, confirmText: "\u786E\u8BA4\u53D1\u653E", idempotencyKey: "verify-payout" });
  const completed = await getTask(accepted.taskId);
  assert.equal(completed.status, "SUCCEEDED");
  assert.equal(completed.progress, 1);
  assert.ok(accepted.statusUrl.includes("/payout-batches/"));
  assert.equal((await getPayout(accepted.statusUrl.split("/").at(-1))).status, "COMPLETED");
  const execution2 = await getSettlementExecution(pool.id);
  assert.ok(execution2.payoutBatchId);
  const batch = await getPayout(execution2.payoutBatchId);
  assert.equal(batch.status, "COMPLETED");
  const items = await listPayoutItems(batch.id);
  assert.ok(items.items.every((item) => state.ledgers.some((tx) => tx.id === item.transactionId)));
  assert.equal(items.items.reduce((sum, item) => sum + Number(item.postedPoints), 0), Number(batch.postedPoints));
  assert.equal((await getPool(pool.id)).value.pool.status, "SETTLED");
});
await check("AI \u5206\u7EA2\u4E0E\u53EF\u7528\u79EF\u5206\u5230\u8D26\u8054\u52A8 / \u5217\u8868\u8BE6\u60C5\u4E00\u81F4", async () => {
  const detail = (await getAdminMember(member.id)).data;
  assert.equal(detail.aiDividendPoints, "215.00");
  assert.equal(detail.netProfitPoints, "50.00");
  assert.equal(detail.totalReferralPoints, "550.00");
  assert.equal(detail.wallet.availablePoints, "2715.00");
  const list4 = (await listAdminMembers({ limit: 20 })).items.find((item) => item.id === member.id);
  assert.equal(list4.aiDividendPoints, detail.aiDividendPoints);
  assert.equal(list4.wallet.availablePoints, detail.wallet.availablePoints);
  assert.equal(detail.directMemberAvailableTotal, points(state.members.slice(1).reduce((sum, item) => sum + Number(item.wallet.availablePoints), 0)));
});
await check("\u4E0A\u4F20\u4EC5\u5728\u672C\u5730\u89E3\u6790", async () => {
  const result = await uploadEvidence(new File(['{"demo":true}'], "demo.json", { type: "application/json" }), "DRAW_EVIDENCE", { prepare: "p", commit: "c" });
  assert.equal(result.status, "COMMITTED");
});
await check("\u5BFC\u51FA\u751F\u6210\u53CA\u8BFB\u53D6", async () => {
  const result = (await adminApi.request("/api/admin/v1/report-exports", { method: "POST", body: { reportType: "MEMBER_OVERVIEW", format: "CSV", filters: { from: "2026-09-27", to: "2026-10-03" } } })).data;
  assert.ok(result.statusUrl.includes("/report-exports/"));
  const item = (await adminApi.request(result.statusUrl)).data;
  assert.ok(item.downloadUrl.startsWith("blob:"));
});
await check("\u4E0A\u6D77\u65E5\u671F\u7B5B\u9009\u4FDD\u7559\u5F53\u5929\u8D26\u672C", async () => {
  const rows = await listAdminLedgerTransactions({ from: "2026-10-02T16:00:00Z", to: "2026-10-03T15:59:59Z" });
  assert.ok(rows.items.length >= 12);
  assert.ok(rows.items.some((t) => t.id === "demo-transaction-1"));
});
await check("\u7A7A\u7B5B\u9009 / \u91CD\u7F6E / \u5206\u9875", async () => {
  assert.equal((await listAdminMembers({ keyword: "\u4E0D\u5B58\u5728\u7684\u4F1A\u5458" })).items.length, 0);
  const first = await listAdminRobots({ limit: 20 });
  const second = await listAdminRobots({ limit: 20, cursor: first.nextCursor });
  assert.equal(second.items.length, 20);
  assert.notEqual(first.items[0].robot.id, second.items[0].robot.id);
});
await check("\u65B0\u589E\u7AD9\u957F\u53CA\u521D\u59CB\u989D\u5EA6", async () => {
  const created = await createStationMaster({ clientIntentId: "verify", name: "\u9A8C\u6536\u7AD9\u957F", account: "demo_new", initialPassword: "DemoOnly123", stationId: state.stations[0].id, status: "ENABLED", limits: master.limits, initialDisposablePoints: "1000.00", remark: "\u6F14\u793A\u9A8C\u6536" }, "verify-master");
  assert.equal(created.disposablePoints, "1000.00");
  assert.ok(created.code);
});
await check("\u7AD9\u957F\u989D\u5EA6\u8C03\u6574\u53CA\u8D26\u672C\u8054\u52A8", async () => {
  const before = Number(master.disposablePoints), count = state.ledgers.length;
  const received = await adjustStationMasterPoints({ stationMaster: master, type: "ADMIN_GRANT", points: "500.00", reason: "\u6F14\u793A\u9A8C\u6536", proofCode: "123456", idempotencyKey: "verify-grant" });
  assert.equal(Number(received.stationMasterBalanceAfter), before + 500);
  assert.equal(state.ledgers.length, count + 1);
  assert.equal((await listAdminStationLedgers({ stationMasterId: master.id })).items[0].transactionId, received.transactionId);
});
await check("\u7AD9\u957F\u8FC1\u79FB", () => migrateStationMaster({ stationMaster: master, targetStationId: state.stations[1].id, moveOwnedMembers: true, reason: "\u6F14\u793A\u9A8C\u6536", proofCode: "123456", etag: '"1"', idempotencyKey: "verify-migrate" }));
await check("\u4F1A\u5458\u7EA0\u6B63\u5F52\u5C5E", () => migrateMembership({ member, stationId: state.stations[2].id, stationMasterId: state.stationMasters[2].id, referrerMemberId: null, reason: "\u6F14\u793A\u9A8C\u6536", proofCode: "123456", etag: '"1"', idempotencyKey: "verify-membership" }));
await check("VIP \u6574\u8868\u4FDD\u5B58\u4E0E\u5386\u53F2", async () => {
  const v = await getVipConfig();
  const saved = await saveVipConfig({ levels: v.data.levels, reason: "\u9A8C\u6536", etag: v.etag, idempotencyKey: "verify-vip" });
  assert.notEqual(saved.data.version, v.data.version);
  assert.equal((await listVipConfigHistory()).items.length, 2);
});
await check("\u63A8\u5E7F\u6574\u8868\u4FDD\u5B58\u4E0E\u5386\u53F2", async () => {
  const v = await getReferralConfig();
  await saveReferralConfig({ levels: v.data.levels, fixedRewardPolicyVersion: "2", aiSharePolicyVersion: "2", reason: "\u9A8C\u6536", etag: v.etag, idempotencyKey: "verify-referral" });
  assert.equal((await getReferralConfig()).data.fixedRewardPolicyVersion, "2");
});
await check("\u8D44\u683C\u91CD\u5EFA", () => rebuildQualifications({ reason: "\u6F14\u793A\u9A8C\u6536", idempotencyKey: "verify-qualification" }));
await check("\u4F1A\u5458\u62A5\u8868\u89E3\u6790", () => getMemberReport("MEMBER_OVERVIEW", { from: "2026-09-27", to: "2026-10-03" }));
await check("AI \u62A5\u8868\u89E3\u6790", () => getAiReport({ from: "2026-09-27", to: "2026-10-03" }));
await check("\u7AD9\u957F\u62A5\u8868\u89E3\u6790", () => getStationMasterReport({ filters: { from: "2026-09-27", to: "2026-10-03" } }));
await check("\u5BF9\u8D26\u62A5\u8868\u89E3\u6790", () => getAdminReport2({ from: "2026-09-27", to: "2026-10-03" }));
await check("\u65B0\u5EFA\u5458\u5DE5\u53CA\u6743\u9650\u66F4\u65B0", async () => {
  const employee = await createEmployee({ clientIntentId: "verify-employee", name: "\u9A8C\u6536\u5458\u5DE5", account: "demo_staff", initialPassword: "DemoOnly123", roleIds: [state.roles[0].id], scopeStationIds: [], reason: "\u6F14\u793A\u9A8C\u6536", proofCode: "123456", idempotencyKey: "verify-employee" });
  assert.equal(employee.account, "demo_staff");
  const updated = await updateEmployeePermissions({ employee, roleIds: [state.roles[1].id], scopeStationIds: [state.stations[0].id], reason: "\u6F14\u793A\u9A8C\u6536", proofCode: "123456", idempotencyKey: "verify-permission" });
  assert.equal(updated.scopeStationIds.length, 1);
});
await check("\u5458\u5DE5\u6062\u590D", () => recoverEmployeeAccount({ employee: state.employees[1], newPassword: "DemoOnly123", evidenceId: "demo-evidence", reason: "\u6F14\u793A\u9A8C\u6536", proofCode: "123456", idempotencyKey: "verify-recovery" }));
await check("\u8D26\u672C\u51B2\u6B63", () => createLedgerReversal({ originalTransactionId: state.ledgers[0].id, points: "100.00", reason: "\u6F14\u793A\u9A8C\u6536", evidenceIds: ["demo-evidence"], proofCode: "123456", idempotencyKey: "verify-reversal" }));
await check("\u53D1\u8D77\u5BF9\u8D26\u5E76\u8BFB\u53D6\u7ED3\u679C", async () => {
  const accepted = await createReconciliation({ reason: "\u6F14\u793A\u9A8C\u6536", idempotencyKey: "verify-reconciliation" });
  const status = await getAdminTask(accepted.taskId);
  const id = status.resultUrl.split("/").at(-1);
  assert.equal((await getReconciliation(id)).status, "MATCHED");
});
await check("\u666E\u901A\u8BA2\u5355\u6062\u590D\u7ED3\u7B97\u53CA\u4F1A\u5458\u8D26\u672C\u8054\u52A8", async () => {
  const before = Number(member.wallet.availablePoints);
  await retryOrdinarySettlement({ orderId: state.orders[0].id, reason: "\u6F14\u793A\u9A8C\u6536", idempotencyKey: "verify-settlement" });
  assert.equal(Number(member.wallet.availablePoints), before + 50);
  assert.equal(state.ledgers[0].sourceId, state.orders[0].id);
});
await check("\u89C4\u5219\u63D0\u4EA4\u53CA\u72EC\u7ACB\u590D\u6838", async () => {
  const row = await createRuleDraft({ playId: l.plays[0].id, artifact: { id: "demo-artifact", sha256: "demo-hash", status: "COMMITTED", purpose: "RULE_ARTIFACT" }, effectiveFromIssue: "2026270", reason: "\u6F14\u793A\u9A8C\u6536", idempotencyKey: "verify-rule" });
  assert.equal(row.status, "PENDING_REVIEW");
  const existing = await listRuleDrafts();
  const pending = existing.items.find((r2) => r2.id === "demo-rule-pending");
  const reviewed = await reviewRuleDraft({ rule: pending, decision: "APPROVE", reason: "\u6F14\u793A\u9A8C\u6536", proofCode: "123456", idempotencyKey: "verify-rule-review" });
  assert.equal(reviewed.status, "APPROVED");
});
await check("\u653F\u7B56\u767B\u8BB0", () => createPolicyVersion({ code: "REFERRAL_FIXED", artifact: { id: "demo-policy", sha256: "demo-hash", status: "COMMITTED", purpose: "POLICY_ARTIFACT" }, reason: "\u6F14\u793A\u9A8C\u6536", idempotencyKey: "verify-policy" }));
await check("\u5F00\u5956\u590D\u6838", () => reviewDrawCandidate({ candidate: state.candidates[0], decision: "APPROVE", reason: "\u6F14\u793A\u9A8C\u6536", proofCode: "123456", idempotencyKey: "verify-draw" }));
await check("\u9057\u6F0F\u91CD\u5EFA", () => rebuildOmissions({ lotteryId: l.id, drawVersionSetHash: "demo-draw-hash", reason: "\u6F14\u793A\u9A8C\u6536", idempotencyKey: "verify-omission" }));
await check("\u5927\u5E08\u8BD5\u7B97\u4E0E\u6267\u884C\u66F4\u65B0", () => previewRobot({ robotId: r.robot.id, lotteryId: l.id, issueCode: "2026261", reason: "\u6F14\u793A\u9A8C\u6536", idempotencyKey: "verify-preview" }));
await check("AI \u914D\u7F6E\u4FDD\u5B58", async () => {
  const v = await getProjectConfig(pool.projectId);
  const saved = await saveProjectConfig({ projectId: pool.projectId, settings: { ...v.config.settings, defaultTargetNetReturnPercent: 20 }, reason: "\u6F14\u793A\u9A8C\u6536", etag: v.etag, idempotencyKey: "verify-ai-config" });
  assert.equal(saved.settings.defaultTargetNetReturnPercent, 20);
});
await check("AI \u622A\u6B62\u8BA4\u8D2D\u4E0E\u751F\u6210\u5206\u914D", async () => {
  const p = state.pools[0];
  await closeFunding({ poolIssueId: p.id, reason: "\u6F14\u793A\u9A8C\u6536", etag: '"1"', idempotencyKey: "verify-close" });
  const v = await getPool(p.id);
  const accepted = await calculateAllocation({ pool: v.value, reason: "\u6F14\u793A\u9A8C\u6536", targetNetReturnPercent: 10, idempotencyKey: "verify-calculate", etag: v.etag });
  assert.ok(accepted.taskId);
});
await check("AI \u4EBA\u5DE5\u4E00\u952E\u7ED3\u7B97", async () => {
  const e = await settleNow({ poolIssueId: state.pools[4].id, targetNetReturnPercent: 12, reason: "\u6F14\u793A\u9A8C\u6536", etag: '"1"', idempotencyKey: "verify-quick" });
  assert.ok(e.payoutBatchId);
});
await check("\u672A\u77E5\u6F14\u793A\u64CD\u4F5C\u660E\u786E\u62A5\u9519", async () => {
  await assert.rejects(() => adminApi.request("/api/admin/v1/undefined-feature"), /未映射/);
});
await check("\u6F14\u793A\u72B6\u6001\u4E0D\u5B58\u50A8\u5BC6\u7801", async () => {
  assert.equal(JSON.stringify(state).includes("DemoOnly123"), false);
});
fs.writeFileSync("evidence/verification.json", JSON.stringify({ passed: results.filter((r2) => r2.passed).length, total: results.length, results }, null, 2));
for (const result of results) if (!result.passed) console.log("FAIL", result.name, result.error);
console.log(`${results.filter((r2) => r2.passed).length}/${results.length} checks passed; network forbidden throughout.`);
if (results.some((r2) => !r2.passed)) process.exitCode = 1;
