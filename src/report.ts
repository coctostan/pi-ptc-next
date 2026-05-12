export type PtcReportScalar = string | number | boolean | null;
export type PtcReportJsonValue = PtcReportScalar | PtcReportJsonValue[] | { [key: string]: PtcReportJsonValue };

export interface PtcReportTable {
  title?: string;
  columns: string[];
  rows: Array<Record<string, PtcReportScalar>>;
}

export interface PtcReportSample {
  label?: string;
  value: PtcReportJsonValue;
}

export interface PtcReport {
  kind: "ptc_report";
  version: 1;
  title: string;
  metrics: Record<string, PtcReportScalar>;
  tables: PtcReportTable[];
  samples: PtcReportSample[];
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): value is PtcReportScalar {
  return value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
}

function isJsonValue(value: unknown): value is PtcReportJsonValue {
  if (isScalar(value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (isRecord(value)) {
    return Object.values(value).every(isJsonValue);
  }
  return false;
}

function isMetricMap(value: unknown): value is Record<string, PtcReportScalar> {
  return isRecord(value) && Object.values(value).every(isScalar);
}

function isReportTable(value: unknown): value is PtcReportTable {
  return (
    isRecord(value) &&
    (value.title === undefined || typeof value.title === "string") &&
    Array.isArray(value.columns) &&
    value.columns.every((column) => typeof column === "string") &&
    Array.isArray(value.rows) &&
    value.rows.every((row) => isRecord(row) && Object.values(row).every(isScalar))
  );
}

function isReportSample(value: unknown): value is PtcReportSample {
  return isRecord(value) && (value.label === undefined || typeof value.label === "string") && isJsonValue(value.value);
}

export function isPtcReport(value: unknown): value is PtcReport {
  return (
    isRecord(value) &&
    value.kind === "ptc_report" &&
    value.version === 1 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    isMetricMap(value.metrics) &&
    Array.isArray(value.tables) &&
    value.tables.every(isReportTable) &&
    Array.isArray(value.samples) &&
    value.samples.every(isReportSample) &&
    Array.isArray(value.warnings) &&
    value.warnings.every((warning) => typeof warning === "string")
  );
}

function formatScalar(value: PtcReportScalar): string {
  if (value === null) {
    return "null";
  }
  return String(value);
}

function formatJsonValue(value: PtcReportJsonValue): string {
  if (isScalar(value)) {
    return formatScalar(value);
  }
  return JSON.stringify(value);
}

function formatRow(row: Record<string, PtcReportScalar>, columns: string[]): string {
  const visibleColumns = columns.length > 0 ? columns : Object.keys(row);
  return visibleColumns.map((column) => `${column}=${formatScalar(row[column] ?? null)}`).join(", ");
}

export function renderPtcReportLines(report: PtcReport, expanded: boolean): string[] {
  const lines: string[] = [];
  const tableRowLimit = expanded ? Number.POSITIVE_INFINITY : 2;
  const sampleLimit = expanded ? Number.POSITIVE_INFINITY : 1;
  const warningLimit = expanded ? Number.POSITIVE_INFINITY : 1;

  lines.push(report.title);

  const metricEntries = Object.entries(report.metrics);
  if (metricEntries.length > 0) {
    lines.push("Metrics");
    for (const [key, value] of metricEntries) {
      lines.push(`- ${key}: ${formatScalar(value)}`);
    }
  }

  for (const table of report.tables) {
    lines.push(table.title ? `Table: ${table.title}` : "Table");
    const rows = table.rows.slice(0, tableRowLimit);
    for (const row of rows) {
      lines.push(`- ${formatRow(row, table.columns)}`);
    }
    if (!expanded && table.rows.length > rows.length) {
      lines.push(`- … ${table.rows.length - rows.length} more row${table.rows.length - rows.length === 1 ? "" : "s"}`);
    }
  }

  const samples = report.samples.slice(0, sampleLimit);
  if (samples.length > 0) {
    lines.push("Samples");
    for (const sample of samples) {
      const prefix = sample.label ? `${sample.label}: ` : "";
      lines.push(`- ${prefix}${formatJsonValue(sample.value)}`);
    }
    if (!expanded && report.samples.length > samples.length) {
      lines.push(`- … ${report.samples.length - samples.length} more sample${report.samples.length - samples.length === 1 ? "" : "s"}`);
    }
  }

  const warnings = report.warnings.slice(0, warningLimit);
  if (warnings.length > 0) {
    lines.push("Warnings");
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
    if (!expanded && report.warnings.length > warnings.length) {
      lines.push(`- … ${report.warnings.length - warnings.length} more warning${report.warnings.length - warnings.length === 1 ? "" : "s"}`);
    }
  }

  return lines;
}
