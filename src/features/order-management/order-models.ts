export type OrderStatus =
  | "RESERVED"
  | "LOCKED"
  | "WAITING_DRAW"
  | "SETTLING"
  | "AWARD_PENDING_BUDGET"
  | "SETTLED"
  | "CANCELLING"
  | "CANCELLED"
  | "CORRECTING"
  | "CORRECTED"
  | "EXCEPTION_PENDING";

export interface AreaSelection {
  key: string;
  chosen: readonly number[];
  dan: readonly number[];
  tuo: readonly number[];
}

export interface Selection {
  schemaId: string;
  schemaVersion: string;
  mode: string;
  areas: readonly AreaSelection[];
}

export interface AdminOrder {
  id: string;
  type: "ORDINARY" | "AI_POOL";
  projectId: string | null;
  projectName: string | null;
  lotteryId: string;
  playId: string;
  issueCode: string;
  selection: Selection | null;
  status: OrderStatus;
  purchasePoints: string;
  dueAwardPoints: string | null;
  netPostedAwardPoints: string;
  refundPoints: string;
  settlementVersion: string | null;
  createdAt: string;
  detailUrl: string;
}

export interface AdminOrderPage {
  items: readonly AdminOrder[];
  nextCursor: string | null;
  hasMore: boolean;
  snapshotId: string | null;
}

export interface OrdinarySettlement {
  settlementVersion: string;
  drawVersionId: string;
  calculationReference: string;
  awardCodes: readonly string[] | null;
  dueAwardPoints: string;
  economicDeltaPoints: string;
  actionType: string;
  actionStatus: string;
  requestedPoints: string;
  postedPoints: string;
  platformBornePoints: string;
  ledgerTransactionId: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface OrdinaryRefund {
  refundPoints: string;
  recoveredAwardPoints: string;
  platformBornePoints: string;
  refundTransactionId: string;
  recoveryTransactionId: string | null;
  reason: string;
  refundedAt: string;
}

export interface AdminOrderDetail {
  order: AdminOrder;
  selection: Selection;
  recommendationId: string | null;
  betCount: string;
  multiple: number;
  ruleVersion: string;
  simulationRuleVersion: string;
  ledgerTransactionId: string;
  lockTransactionId: string | null;
  lockedAt: string | null;
  settlements: readonly OrdinarySettlement[];
  refund: OrdinaryRefund | null;
}

export interface TaskAccepted {
  taskId: string;
  status: string;
  statusUrl: string;
  pollAfterSeconds: number;
}

const orderStatuses = new Set<OrderStatus>([
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
  "EXCEPTION_PENDING",
]);

export function readOrderPage(value: unknown): AdminOrderPage {
  const root = object(value, "ORDER_PAGE_MISMATCH");
  return {
    items: list(root.items, "ORDER_ITEMS_MISMATCH").map(readOrder),
    nextCursor: nullableText(root.nextCursor, "ORDER_CURSOR_MISMATCH"),
    hasMore: boolean(root.hasMore, "ORDER_MORE_MISMATCH"),
    snapshotId: nullableText(root.snapshotId, "ORDER_SNAPSHOT_MISMATCH"),
  };
}

export function readOrderDetail(value: unknown): AdminOrderDetail {
  const root = object(value, "ORDER_DETAIL_MISMATCH");
  return {
    order: readOrder(root.order),
    selection: readSelection(root.selection),
    recommendationId: nullableText(root.recommendationId, "ORDER_RECOMMENDATION_MISMATCH"),
    betCount: text(root.betCount, "ORDER_BET_COUNT_MISMATCH"),
    multiple: integer(root.multiple, "ORDER_MULTIPLE_MISMATCH"),
    ruleVersion: text(root.ruleVersion, "ORDER_RULE_VERSION_MISMATCH"),
    simulationRuleVersion: text(root.simulationRuleVersion, "ORDER_SETTLEMENT_RULE_MISMATCH"),
    ledgerTransactionId: text(root.ledgerTransactionId, "ORDER_LEDGER_MISMATCH"),
    lockTransactionId: nullableText(root.lockTransactionId, "ORDER_LOCK_LEDGER_MISMATCH"),
    lockedAt: nullableText(root.lockedAt, "ORDER_LOCKED_AT_MISMATCH"),
    settlements: list(root.settlements, "ORDER_SETTLEMENTS_MISMATCH").map(readSettlement),
    refund: root.refund === null ? null : readRefund(root.refund),
  };
}

export function readTaskAccepted(value: unknown): TaskAccepted {
  const root = object(value, "TASK_ACCEPTED_MISMATCH");
  return {
    taskId: text(root.taskId, "TASK_ID_MISMATCH"),
    status: text(root.status, "TASK_STATUS_MISMATCH"),
    statusUrl: text(root.statusUrl, "TASK_URL_MISMATCH"),
    pollAfterSeconds: integer(root.pollAfterSeconds, "TASK_POLL_MISMATCH"),
  };
}

function readOrder(value: unknown): AdminOrder {
  const root = object(value, "ORDER_MISMATCH");
  const status = text(root.status, "ORDER_STATUS_MISMATCH") as OrderStatus;
  if (!orderStatuses.has(status)) {
    throw new TypeError("ORDER_STATUS_MISMATCH");
  }
  const type = text(root.type, "ORDER_TYPE_MISMATCH");
  if (type !== "ORDINARY" && type !== "AI_POOL") {
    throw new TypeError("ORDER_TYPE_MISMATCH");
  }
  return {
    id: text(root.id, "ORDER_ID_MISMATCH"),
    type,
    projectId: nullableText(root.projectId, "ORDER_PROJECT_MISMATCH"),
    projectName: nullableText(root.projectName, "ORDER_PROJECT_NAME_MISMATCH"),
    lotteryId: text(root.lotteryId, "ORDER_LOTTERY_MISMATCH"),
    playId: text(root.playId, "ORDER_PLAY_MISMATCH"),
    issueCode: text(root.issueCode, "ORDER_ISSUE_MISMATCH"),
    selection: root.selection === null ? null : readSelection(root.selection),
    status,
    purchasePoints: text(root.purchasePoints, "ORDER_PURCHASE_POINTS_MISMATCH"),
    dueAwardPoints: nullableText(root.dueAwardPoints, "ORDER_DUE_POINTS_MISMATCH"),
    netPostedAwardPoints: text(root.netPostedAwardPoints, "ORDER_POSTED_POINTS_MISMATCH"),
    refundPoints: text(root.refundPoints, "ORDER_REFUND_POINTS_MISMATCH"),
    settlementVersion: nullableText(root.settlementVersion, "ORDER_SETTLEMENT_VERSION_MISMATCH"),
    createdAt: text(root.createdAt, "ORDER_CREATED_AT_MISMATCH"),
    detailUrl: text(root.detailUrl, "ORDER_DETAIL_URL_MISMATCH"),
  };
}

function readSelection(value: unknown): Selection {
  const root = object(value, "SELECTION_MISMATCH");
  return {
    schemaId: text(root.schemaId, "SELECTION_SCHEMA_MISMATCH"),
    schemaVersion: text(root.schemaVersion, "SELECTION_VERSION_MISMATCH"),
    mode: text(root.mode, "SELECTION_MODE_MISMATCH"),
    areas: list(root.areas, "SELECTION_AREAS_MISMATCH").map((areaValue) => {
      const area = object(areaValue, "SELECTION_AREA_MISMATCH");
      return {
        key: text(area.key, "SELECTION_AREA_KEY_MISMATCH"),
        chosen: optionalNumbers(area.chosen),
        dan: optionalNumbers(area.dan),
        tuo: optionalNumbers(area.tuo),
      };
    }),
  };
}

function readSettlement(value: unknown): OrdinarySettlement {
  const root = object(value, "SETTLEMENT_MISMATCH");
  return {
    settlementVersion: text(root.settlementVersion, "SETTLEMENT_VERSION_MISMATCH"),
    drawVersionId: text(root.drawVersionId, "SETTLEMENT_DRAW_MISMATCH"),
    calculationReference: text(root.calculationReference, "SETTLEMENT_CALCULATION_MISMATCH"),
    awardCodes: root.awardCodes === null
      ? null
      : list(root.awardCodes, "SETTLEMENT_AWARDS_MISMATCH").map((item) => text(item, "SETTLEMENT_AWARD_MISMATCH")),
    dueAwardPoints: text(root.dueAwardPoints, "SETTLEMENT_DUE_MISMATCH"),
    economicDeltaPoints: text(root.economicDeltaPoints, "SETTLEMENT_DELTA_MISMATCH"),
    actionType: text(root.actionType, "SETTLEMENT_ACTION_MISMATCH"),
    actionStatus: text(root.actionStatus, "SETTLEMENT_STATUS_MISMATCH"),
    requestedPoints: text(root.requestedPoints, "SETTLEMENT_REQUESTED_MISMATCH"),
    postedPoints: text(root.postedPoints, "SETTLEMENT_POSTED_MISMATCH"),
    platformBornePoints: text(root.platformBornePoints, "SETTLEMENT_PLATFORM_MISMATCH"),
    ledgerTransactionId: nullableText(root.ledgerTransactionId, "SETTLEMENT_LEDGER_MISMATCH"),
    createdAt: text(root.createdAt, "SETTLEMENT_CREATED_MISMATCH"),
    completedAt: nullableText(root.completedAt, "SETTLEMENT_COMPLETED_MISMATCH"),
  };
}

function readRefund(value: unknown): OrdinaryRefund {
  const root = object(value, "REFUND_MISMATCH");
  return {
    refundPoints: text(root.refundPoints, "REFUND_POINTS_MISMATCH"),
    recoveredAwardPoints: text(root.recoveredAwardPoints, "REFUND_RECOVERED_MISMATCH"),
    platformBornePoints: text(root.platformBornePoints, "REFUND_PLATFORM_MISMATCH"),
    refundTransactionId: text(root.refundTransactionId, "REFUND_TRANSACTION_MISMATCH"),
    recoveryTransactionId: nullableText(root.recoveryTransactionId, "REFUND_RECOVERY_MISMATCH"),
    reason: text(root.reason, "REFUND_REASON_MISMATCH"),
    refundedAt: text(root.refundedAt, "REFUND_TIME_MISMATCH"),
  };
}

function optionalNumbers(value: unknown): readonly number[] {
  if (value === undefined) {
    return [];
  }
  return list(value, "SELECTION_NUMBERS_MISMATCH").map((item) => integer(item, "SELECTION_NUMBER_MISMATCH"));
}

function object(value: unknown, code: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value as Record<string, unknown>;
}

function list(value: unknown, code: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(code);
  }
  return value;
}

function text(value: unknown, code: string): string {
  if (typeof value !== "string") {
    throw new TypeError(code);
  }
  return value;
}

function nullableText(value: unknown, code: string): string | null {
  return value === null ? null : text(value, code);
}

function boolean(value: unknown, code: string): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(code);
  }
  return value;
}

function integer(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new TypeError(code);
  }
  return value;
}
