import asyncio as _ptc_asyncio
import json as _ptc_json
import os as _ptc_os
import sys as _ptc_sys
import re as _ptc_re
import shlex as _ptc_shlex
import shutil as _ptc_shutil
import subprocess as _ptc_subprocess
import time as _ptc_time
import traceback as _ptc_traceback
from typing import Any, Callable, Coroutine, Iterable, Sequence

_current_line = 0
_PTC_HOST_WORKSPACE_ROOT = globals().get("PTC_HOST_WORKSPACE_ROOT", _ptc_os.getcwd())
_PTC_RUNTIME_WORKSPACE_ROOT = globals().get("PTC_RUNTIME_WORKSPACE_ROOT", _ptc_os.getcwd())
_PTC_USER_CODE_LINE_COUNT = globals().get("PTC_USER_CODE_LINE_COUNT", 0)
_ORIGINAL_STDOUT = _ptc_sys.stdout


def _emit_protocol(message: dict[str, Any]) -> None:
    _ORIGINAL_STDOUT.write(_ptc_json.dumps(message) + "\n")
    _ORIGINAL_STDOUT.flush()


_ptc_protocol_write = _emit_protocol


class _StdoutProxy:
    def __init__(self):
        self._buffer = ""

    def write(self, text: str) -> int:
        if not text:
            return 0

        self._buffer += text
        while "\n" in self._buffer:
            line, self._buffer = self._buffer.split("\n", 1)
            _emit_protocol({"type": "stdout", "text": f"{line}\n"})
        return len(text)

    def flush(self) -> None:
        if self._buffer:
            _emit_protocol({"type": "stdout", "text": self._buffer})
            self._buffer = ""


_stdout_proxy = _StdoutProxy()


def _trace_lines(frame, event, arg):
    global _current_line

    if event != "line":
        return _trace_lines

    if frame.f_code.co_name == "user_main":
        lineno = frame.f_lineno - frame.f_code.co_firstlineno + 1
        _current_line = lineno
        try:
            _emit_protocol({"type": "execution_progress", "line": lineno, "total_lines": _PTC_USER_CODE_LINE_COUNT})
        except Exception:
            pass

    return _trace_lines


def _host_abspath(path: str) -> str:
    if _ptc_os.path.isabs(path):
        runtime_root = _ptc_os.path.normpath(_PTC_RUNTIME_WORKSPACE_ROOT)
        normalized = _ptc_os.path.normpath(path)
        if normalized == runtime_root or normalized.startswith(f"{runtime_root}{_ptc_os.sep}"):
            relative_path = _ptc_os.path.relpath(normalized, runtime_root)
            return _ptc_os.path.normpath(_ptc_os.path.join(_PTC_HOST_WORKSPACE_ROOT, relative_path))
        return normalized

    return _ptc_os.path.normpath(_ptc_os.path.join(_PTC_HOST_WORKSPACE_ROOT, path))


def _extract_text(result: Any) -> str:
    """Extract raw text from a ReadResult dict, or return as-is if already a string."""
    if isinstance(result, str):
        return result
    if isinstance(result, dict) and "lines" in result:
        return "\n".join(line.get("raw", "") for line in result["lines"])
    return str(result)

def _relativize_path(abs_path: str) -> str:
    """Convert an absolute path to a workspace-relative path if under the host workspace root."""
    if not _ptc_os.path.isabs(abs_path):
        return abs_path
    root = _ptc_os.path.normpath(_PTC_HOST_WORKSPACE_ROOT)
    normed = _ptc_os.path.normpath(abs_path)
    if normed == root or normed.startswith(f"{root}{_ptc_os.sep}"):
        return _ptc_os.path.relpath(normed, root)
    return abs_path


def _path_format_root(relative_to: str | None = None) -> str:
    if relative_to is None:
        return _ptc_os.path.normpath(_PTC_HOST_WORKSPACE_ROOT)
    return _host_abspath(relative_to)


def _absolutize_discovered_path(path: str, base_path: str) -> str:
    if _ptc_os.path.isabs(path):
        return _host_abspath(path)
    return _ptc_os.path.normpath(_ptc_os.path.join(base_path, path))


def _format_discovered_path(path: str, *, relative: bool, relative_to: str | None = None) -> str:
    absolute_path = _host_abspath(path)
    if not relative:
        return absolute_path
    root = _path_format_root(relative_to)
    if absolute_path == root or absolute_path.startswith(f"{root}{_ptc_os.sep}"):
        return _ptc_os.path.relpath(absolute_path, root)
    return absolute_path


def _normalize_grep_result(result: Any) -> Any:
    """Normalize grep result paths to be relative to the workspace root."""
    if not isinstance(result, dict) or "records" not in result:
        return result
    for record in result.get("records", []):
        if isinstance(record, dict) and "path" in record:
            record["path"] = _relativize_path(record["path"])
    return result


def _normalize_read_result(result: Any) -> Any:
    """Normalize read result paths to be workspace-relative when under root.

    Mirrors `_normalize_grep_result`'s policy so direct `read()`, `ptc.read_text()`,
    `ptc.read_many()`, and any `read` payload surfaced through `ptc.batch_tool(...)`
    return identical `path` shapes. Out-of-workspace absolute paths are preserved.
    """
    if not isinstance(result, dict):
        return result
    if isinstance(result.get("path"), str):
        result["path"] = _relativize_path(result["path"])
    lines = result.get("lines")
    if isinstance(lines, list):
        for entry in lines:
            if isinstance(entry, dict) and isinstance(entry.get("path"), str):
                entry["path"] = _relativize_path(entry["path"])
    return result


_TOOL_ERROR_EXECUTION_KIND = "execution_error"


def _classify_tool_error_payload(value: Any) -> str | None:
    """Detect normalized tool-error payloads inside an otherwise-successful RPC value.

    Returns a bounded error summary string when `value` carries `{ok: False, error: ...}`
    semantics or `kind == "execution_error"`, and `None` otherwise. Callers use this to
    surface tool-level failures inside `ptc.batch_tool(..., on_error="collect")` without
    reclassifying transport-level successes.
    """
    if not isinstance(value, dict):
        return None
    kind = value.get("kind")
    if isinstance(kind, str) and kind == _TOOL_ERROR_EXECUTION_KIND:
        raw_error = value.get("error") or value.get("message") or _TOOL_ERROR_EXECUTION_KIND
    elif value.get("ok") is False and ("error" in value or "message" in value):
        raw_error = value.get("error") or value.get("message")
    else:
        return None
    if isinstance(raw_error, dict):
        summary = raw_error.get("message") or raw_error.get("error") or _ptc_json.dumps(raw_error, ensure_ascii=False)
    else:
        summary = raw_error if isinstance(raw_error, str) else str(raw_error)
    summary = " ".join(summary.splitlines()).strip()
    if not summary:
        summary = _TOOL_ERROR_EXECUTION_KIND
    if len(summary) > 160:
        return summary[:157] + "..."
    return summary

_SUPPORTED_HANDLE_KINDS = {"response", "file"}
_DEFAULT_FIT_OUTPUT_MAX_ITEMS = 10
_DEFAULT_FIT_OUTPUT_MAX_DEPTH = 3
_FIT_OUTPUT_KIND = "fit_output"
_REPORT_KIND = "ptc_report"
_REPORT_VERSION = 1

_NODE_TEST_RUNNER_TIMEOUT_SECONDS = 120
_NODE_TEST_RUNNER_MAX_FAILURES = 10
_NODE_TEST_RUNNER_MAX_SAMPLE_CHARS = 1000
_NODE_TEST_RUNNER_PATTERN_FORBIDDEN = ("|", ";", "&", "`", "$", "\n", "\r", "\x00")
_NODE_TEST_RUNNER_TAP_SUMMARY = _ptc_re.compile(r"^#\s*(tests|pass|fail|skipped|todo|cancelled|duration_ms)\s+([0-9.]+)\s*$")
_NODE_TEST_RUNNER_TAP_NOT_OK = _ptc_re.compile(r"^not\s+ok\s+(\d+)\s*-\s*(.+?)\s*$")
_NODE_TEST_RUNNER_STREAM_SUMMARY = _ptc_re.compile("^[\u2139\\s]*(tests|pass|fail|skipped|todo|cancelled|duration_ms)\\s+([0-9.]+)\\s*$")
_NODE_TEST_RUNNER_STREAM_FAIL = _ptc_re.compile("^[\u2716\u2717xX\u2718]\\s+(.+?)\\s*(?:\\([0-9.]+ms\\))?\\s*$")


def _push_response_handle(handles: list[SupportedHandle], seen: set[str], response_id: str) -> None:
    normalized = response_id.strip()
    if not normalized:
        return

    key = f"response:{normalized}"
    if key in seen:
        return

    seen.add(key)
    handles.append({"kind": "response", "responseId": normalized})


def _push_file_handle(handles: list[SupportedHandle], seen: set[str], file_path: str) -> None:
    normalized = file_path.strip()
    if not normalized:
        return

    key = f"file:{normalized}"
    if key in seen:
        return

    seen.add(key)
    handles.append({"kind": "file", "filePath": normalized})


def _collect_supported_handles(value: Any, handles: list[SupportedHandle], seen: set[str]) -> None:
    if isinstance(value, list):
        for entry in value:
            _collect_supported_handles(entry, handles, seen)
        return

    if not isinstance(value, dict):
        return

    response_id = value.get("responseId")
    if isinstance(response_id, str):
        _push_response_handle(handles, seen, response_id)

    file_path = value.get("filePath")
    if isinstance(file_path, str):
        _push_file_handle(handles, seen, file_path)

    for nested in value.values():
        _collect_supported_handles(nested, handles, seen)


def _normalize_handle_kind(kind: str | None) -> str | None:
    if kind is None:
        return None
    if kind not in _SUPPORTED_HANDLE_KINDS:
        supported = ", ".join(sorted(_SUPPORTED_HANDLE_KINDS))
        raise ValueError(f"Unsupported handle kind '{kind}'. Expected one of: {supported}")
    return kind


def _expect_kind(value: Any, kind: str) -> Any:
    expected_kind = kind.strip()
    if not expected_kind:
        raise ValueError("Expected kind must be a non-empty string")
    if not isinstance(value, dict):
        raise ValueError(f"Expected kind '{expected_kind}', but value has no top-level kind field (got {type(value).__name__})")
    actual_kind = value.get("kind")
    if not isinstance(actual_kind, str):
        state = "missing" if actual_kind is None else f"non-string {type(actual_kind).__name__}"
        raise ValueError(f"Expected kind '{expected_kind}', but value has {state} top-level kind")
    actual_kind = actual_kind.strip() or "<empty>"
    if actual_kind != expected_kind:
        raise ValueError(f"Expected kind '{expected_kind}', got '{actual_kind}'")
    return value


def _clone_json_value(value: Any) -> Any:
    return _ptc_json.loads(_ptc_json.dumps(value))

def _is_report_scalar(value: Any) -> bool:
    return value is None or isinstance(value, (str, bool, int, float)) and not isinstance(value, complex) and value == value and value not in (float("inf"), float("-inf"))


def _require_report_scalar(name: str, value: Any) -> Any:
    if not _is_report_scalar(value):
        raise ValueError(f"{name} must be a string, number, boolean, or None")
    return value


def _json_safe_clone_for_report(name: str, value: Any) -> Any:
    try:
        return _clone_json_value(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"{name} must be JSON-safe") from error


def _json_safe_bridge_value(value: Any) -> Any:
    if isinstance(value, set):
        normalized_items = [_json_safe_bridge_value(item) for item in value]
        return sorted(normalized_items, key=lambda item: _ptc_json.dumps(item, sort_keys=True))
    if isinstance(value, tuple):
        return [_json_safe_bridge_value(item) for item in value]
    if isinstance(value, list):
        return [_json_safe_bridge_value(item) for item in value]
    if isinstance(value, dict):
        normalized: dict[str, Any] = {}
        for key, nested in value.items():
            if not isinstance(key, str):
                key = str(key)
            normalized[key] = _json_safe_bridge_value(nested)
        return normalized
    return _json_safe_clone_for_report("value", value)


def _bridge_identity(value: Any) -> str:
    return _ptc_json.dumps(_json_safe_bridge_value(value), sort_keys=True, separators=(",", ":"))


def _normalize_tabulate_columns(headers: Sequence[str] | None, rows: Sequence[Any]) -> list[str]:
    if headers is not None:
        if not isinstance(headers, Sequence) or isinstance(headers, (str, bytes, bytearray)):
            raise ValueError("headers must be a list of strings")
        columns = []
        for index, header in enumerate(headers):
            if not isinstance(header, str) or not header.strip():
                raise ValueError(f"headers[{index}] must be a non-empty string")
            columns.append(header)
        return columns

    inferred: list[str] = []
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("headers are required when tabulate rows are not objects")
        for key in row.keys():
            if not isinstance(key, str) or not key.strip():
                raise ValueError("tabulate row keys must be non-empty strings")
            if key not in inferred:
                inferred.append(key)
    return inferred


def _normalize_tabulate_rows(rows: Sequence[Any], columns: list[str]) -> list[dict[str, Any]]:
    normalized_rows: list[dict[str, Any]] = []
    for row_index, row in enumerate(rows):
        if isinstance(row, dict):
            normalized_rows.append({column: _require_report_scalar(f"rows[{row_index}][{column!r}]", row.get(column)) for column in columns})
            continue
        if not isinstance(row, Sequence) or isinstance(row, (str, bytes, bytearray)):
            raise ValueError(f"rows[{row_index}] must be an object or sequence")
        if len(row) != len(columns):
            raise ValueError(f"rows[{row_index}] has {len(row)} values but {len(columns)} headers were provided")
        normalized_rows.append({column: _require_report_scalar(f"rows[{row_index}][{column!r}]", row[column_index]) for column_index, column in enumerate(columns)})
    return normalized_rows


def _shallow_dict_diff(before: dict[Any, Any], after: dict[Any, Any]) -> dict[str, Any]:
    before_by_key = {str(key): _json_safe_bridge_value(value) for key, value in before.items()}
    after_by_key = {str(key): _json_safe_bridge_value(value) for key, value in after.items()}
    added = {key: after_by_key[key] for key in sorted(after_by_key.keys() - before_by_key.keys())}
    removed = {key: before_by_key[key] for key in sorted(before_by_key.keys() - after_by_key.keys())}
    changed = {
        key: {"before": before_by_key[key], "after": after_by_key[key]}
        for key in sorted(before_by_key.keys() & after_by_key.keys())
        if before_by_key[key] != after_by_key[key]
    }
    return {"kind": "ptc_diff", "added": added, "removed": removed, "changed": changed}


def _shallow_sequence_diff(before: Sequence[Any], after: Sequence[Any]) -> dict[str, Any]:
    before_values = [_json_safe_bridge_value(item) for item in before]
    after_values = [_json_safe_bridge_value(item) for item in after]
    before_ids = {_bridge_identity(item): item for item in before_values}
    after_ids = {_bridge_identity(item): item for item in after_values}
    added = [after_ids[key] for key in sorted(after_ids.keys() - before_ids.keys())]
    removed = [before_ids[key] for key in sorted(before_ids.keys() - after_ids.keys())]
    changed = [
        {"index": index, "before": before_values[index], "after": after_values[index]}
        for index in range(min(len(before_values), len(after_values)))
        if before_values[index] != after_values[index]
    ]
    return {"kind": "ptc_diff", "added": added, "removed": removed, "changed": changed}


def _normalize_report_metrics(metrics: dict[str, Any] | None) -> dict[str, Any]:
    if metrics is None:
        return {}
    if not isinstance(metrics, dict):
        raise ValueError("metrics must be an object")
    normalized: dict[str, Any] = {}
    for key, value in metrics.items():
        if not isinstance(key, str) or not key.strip():
            raise ValueError("metrics keys must be non-empty strings")
        normalized[key] = _require_report_scalar(f"metrics[{key!r}]", value)
    return normalized


def _normalize_report_columns(table: dict[str, Any], rows: list[dict[str, Any]], table_index: int) -> list[str]:
    columns = table.get("columns")
    if columns is None:
        inferred: list[str] = []
        for row in rows:
            for key in row.keys():
                if key not in inferred:
                    inferred.append(key)
        return inferred
    if not isinstance(columns, Sequence) or isinstance(columns, (str, bytes, bytearray)):
        raise ValueError(f"tables[{table_index}].columns must be a list of strings")
    normalized: list[str] = []
    for column_index, column in enumerate(columns):
        if not isinstance(column, str) or not column.strip():
            raise ValueError(f"tables[{table_index}].columns[{column_index}] must be a non-empty string")
        normalized.append(column)
    return normalized


def _normalize_report_rows(rows: Any, table_index: int) -> list[dict[str, Any]]:
    if rows is None:
        return []
    if not isinstance(rows, Sequence) or isinstance(rows, (str, bytes, bytearray)):
        raise ValueError(f"tables[{table_index}].rows must be a list of objects")
    normalized_rows: list[dict[str, Any]] = []
    for row_index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f"tables[{table_index}].rows[{row_index}] must be an object")
        normalized_row: dict[str, Any] = {}
        for key, value in row.items():
            if not isinstance(key, str) or not key.strip():
                raise ValueError(f"tables[{table_index}].rows[{row_index}] keys must be non-empty strings")
            normalized_row[key] = _require_report_scalar(f"tables[{table_index}].rows[{row_index}][{key!r}]", value)
        normalized_rows.append(normalized_row)
    return normalized_rows


def _normalize_report_tables(tables: Any) -> list[dict[str, Any]]:
    if tables is None:
        return []
    if not isinstance(tables, Sequence) or isinstance(tables, (str, bytes, bytearray)):
        raise ValueError("tables must be a list of table objects")
    normalized_tables: list[dict[str, Any]] = []
    for table_index, table in enumerate(tables):
        if not isinstance(table, dict):
            raise ValueError(f"tables[{table_index}] must be an object")
        title = table.get("title")
        if title is not None and not isinstance(title, str):
            raise ValueError(f"tables[{table_index}].title must be a string")
        rows = _normalize_report_rows(table.get("rows", []), table_index)
        columns = _normalize_report_columns(table, rows, table_index)
        normalized: dict[str, Any] = {"columns": columns, "rows": rows}
        if title is not None and title.strip():
            normalized["title"] = title
        normalized_tables.append(normalized)
    return normalized_tables


def _normalize_report_samples(samples: Any) -> list[dict[str, Any]]:
    if samples is None:
        return []
    if not isinstance(samples, Sequence) or isinstance(samples, (str, bytes, bytearray)):
        raise ValueError("samples must be a list of sample objects")
    normalized_samples: list[dict[str, Any]] = []
    for sample_index, sample in enumerate(samples):
        if not isinstance(sample, dict):
            raise ValueError(f"samples[{sample_index}] must be an object")
        if "value" not in sample:
            raise ValueError(f"samples[{sample_index}].value is required")
        label = sample.get("label")
        if label is not None and not isinstance(label, str):
            raise ValueError(f"samples[{sample_index}].label must be a string")
        normalized: dict[str, Any] = {"value": _json_safe_clone_for_report(f"samples[{sample_index}].value", sample.get("value"))}
        if label is not None and label.strip():
            normalized["label"] = label
        normalized_samples.append(normalized)
    return normalized_samples


def _normalize_report_warnings(warnings: Any) -> list[str]:
    if warnings is None:
        return []
    if not isinstance(warnings, Sequence) or isinstance(warnings, (str, bytes, bytearray)):
        raise ValueError("warnings must be a list of strings")
    normalized: list[str] = []
    for warning_index, warning in enumerate(warnings):
        if not isinstance(warning, str):
            raise ValueError(f"warnings[{warning_index}] must be a string")
        normalized.append(warning)
    return normalized


def _parse_node_test_output(stdout: str, stderr: str) -> dict[str, Any]:
    """Best-effort bounded parser for ``node --test`` output.

    Reads the TAP-style ``# tests`` / ``# pass`` summary keys when present and
    falls back to the human-readable ``ℹ tests N`` stream summary that the
    default reporter emits. Failure names are gathered from TAP ``not ok``
    lines and from the human-readable failing-tests block. The function does
    not raise; callers fall back to bounded stdout/stderr samples when no
    summary line is recognized.
    """
    parsed: dict[str, Any] = {
        "total": None,
        "passed": None,
        "failed": None,
        "skipped": None,
        "todo": None,
        "cancelled": None,
        "duration_ms": None,
        "failed_names": [],
        "summary_seen": False,
    }

    failed_names: list[str] = []
    seen_failed_names: set[str] = set()
    summary_keys = {"tests", "pass", "fail", "skipped", "todo", "cancelled", "duration_ms"}
    summary_key_to_metric = {
        "tests": "total",
        "pass": "passed",
        "fail": "failed",
        "skipped": "skipped",
        "todo": "todo",
        "cancelled": "cancelled",
        "duration_ms": "duration_ms",
    }

    def _record_summary(key: str, raw_value: str) -> None:
        metric = summary_key_to_metric.get(key)
        if not metric:
            return
        if metric == "duration_ms":
            try:
                parsed["duration_ms"] = int(float(raw_value))
            except (TypeError, ValueError):
                pass
            return
        try:
            parsed[metric] = int(raw_value)
        except (TypeError, ValueError):
            try:
                parsed[metric] = int(float(raw_value))
            except (TypeError, ValueError):
                pass

    def _record_failed(name: str) -> None:
        cleaned = name.strip()
        if not cleaned or cleaned in seen_failed_names:
            return
        seen_failed_names.add(cleaned)
        failed_names.append(cleaned)

    combined_stream = "\n".join(part for part in (stdout, stderr) if part)
    for raw_line in combined_stream.splitlines():
        line = raw_line.rstrip()
        if not line:
            continue
        tap_match = _NODE_TEST_RUNNER_TAP_SUMMARY.match(line)
        if tap_match:
            parsed["summary_seen"] = True
            _record_summary(tap_match.group(1), tap_match.group(2))
            continue
        tap_not_ok = _NODE_TEST_RUNNER_TAP_NOT_OK.match(line)
        if tap_not_ok:
            _record_failed(tap_not_ok.group(2))
            continue
        stream_match = _NODE_TEST_RUNNER_STREAM_SUMMARY.match(line)
        if stream_match and stream_match.group(1) in summary_keys:
            parsed["summary_seen"] = True
            _record_summary(stream_match.group(1), stream_match.group(2))
            continue
        stream_fail = _NODE_TEST_RUNNER_STREAM_FAIL.match(line)
        if stream_fail:
            candidate = stream_fail.group(1).strip()
            if candidate and not candidate.lower().startswith("failing tests"):
                _record_failed(candidate)

    parsed["failed_names"] = failed_names
    return parsed


def _is_ptc_report(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and value.get("kind") == _REPORT_KIND
        and value.get("version") == _REPORT_VERSION
        and isinstance(value.get("title"), str)
        and isinstance(value.get("metrics"), dict)
        and isinstance(value.get("tables"), list)
        and isinstance(value.get("samples"), list)
        and isinstance(value.get("warnings"), list)
    )


def _extract_ptc_report(value: Any) -> Any | None:
    if not _is_ptc_report(value):
        return None
    return _json_safe_clone_for_report("report", value)

def _normalize_callable_tool_name(name: str) -> str:
    if not isinstance(name, str):
        raise ValueError(f"Tool name must be a non-empty string (got {type(name).__name__})")
    normalized = name.strip()
    if not normalized:
        raise ValueError("Tool name must be a non-empty string")
    return normalized


def _normalize_orchestration_calls(
    calls: Any,
    *,
    allow_empty: bool = False,
) -> list[dict[str, Any]]:
    if not isinstance(calls, Sequence) or isinstance(calls, (str, bytes, bytearray)):
        if allow_empty:
            raise ValueError("Tool calls must be a sequence of call specs")
        raise ValueError("Tool calls must be a non-empty sequence of call specs")
    if len(calls) == 0:
        if allow_empty:
            return []
        raise ValueError("Tool calls must be a non-empty sequence of call specs")
    normalized_calls: list[dict[str, Any]] = []
    for index, entry in enumerate(calls):
        if not isinstance(entry, dict):
            raise ValueError(f"Call spec at index {index} must be an object")
        tool_name = entry.get("tool")
        if not isinstance(tool_name, str) or not tool_name.strip():
            raise ValueError(f"Call spec at index {index} must include a non-empty 'tool' string")
        params = entry.get("params", {})
        if params is None:
            params = {}
        if not isinstance(params, dict):
            raise ValueError(f"Call spec at index {index} for tool '{tool_name.strip()}' must use an object for 'params'")
        normalized_calls.append({
            "tool": tool_name.strip(),
            "params": dict(params),
        })
    return normalized_calls


def _normalize_orchestration_limit(limit: Any, default_limit: int) -> int:
    if limit is None:
        return max(1, default_limit)
    if isinstance(limit, bool) or not isinstance(limit, int):
        raise ValueError(f"max_concurrency must be a positive integer (got {type(limit).__name__})")
    if limit < 1:
        raise ValueError("max_concurrency must be a positive integer")
    return limit

_BATCH_ON_ERROR_RAISE = "raise"
_BATCH_ON_ERROR_COLLECT = "collect"


def _normalize_batch_on_error(on_error: Any) -> str:
    if on_error is None:
        return _BATCH_ON_ERROR_RAISE
    if not isinstance(on_error, str):
        raise ValueError("on_error must be one of: 'raise', 'collect'")
    normalized = on_error.strip().lower()
    if normalized not in {_BATCH_ON_ERROR_RAISE, _BATCH_ON_ERROR_COLLECT}:
        raise ValueError("on_error must be one of: 'raise', 'collect'")
    return normalized


def _summarize_orchestration_error(error: Exception) -> str:
    summary = " ".join(str(error).splitlines()).strip()
    if not summary:
        summary = error.__class__.__name__
    if len(summary) > 160:
        return summary[:157] + "..."
    return summary


async def _safe_read_for_many(path: str, *, offset: int | None = None, limit: int | None = None) -> dict[str, Any]:
    """Call the module-level read() and return a uniform success/error envelope.

    Used by `ptc.read_many` to convert raw exceptions into a bounded structured
    record without leaking a Python traceback into list-of-strings output.
    """
    try:
        value = await read(path=path, offset=offset, limit=limit)
        return {"ok": True, "value": value}
    except Exception as error:  # noqa: BLE001 - any tool/transport failure is captured
        return {"ok": False, "error": _summarize_orchestration_error(error)}


def _normalize_positive_int(name: str, value: Any, default: int) -> int:
    if value is None:
        return default
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{name} must be a positive integer (got {type(value).__name__})")
    if value < 1:
        raise ValueError(f"{name} must be a positive integer")
    return value


def _measure_json_chars(value: Any) -> int:
    return len(_ptc_json.dumps(value, indent=2, ensure_ascii=False, sort_keys=True))


def _normalize_fit_output_limits(
    max_chars: Any,
    max_items: Any,
    max_depth: Any,
    session_max_output_chars: int,
) -> dict[str, int]:
    default_chars = max(1, session_max_output_chars)
    normalized_chars = _normalize_positive_int("max_chars", max_chars, default_chars)
    normalized_items = _normalize_positive_int("max_items", max_items, _DEFAULT_FIT_OUTPUT_MAX_ITEMS)
    normalized_depth = _normalize_positive_int("max_depth", max_depth, _DEFAULT_FIT_OUTPUT_MAX_DEPTH)
    return {
        "max_chars": min(normalized_chars, default_chars),
        "max_items": normalized_items,
        "max_depth": normalized_depth,
    }


def _json_safe_clone_for_fit_output(value: Any) -> Any:
    try:
        return _clone_json_value(value)
    except Exception as error:
        raise ValueError(
            "fit_output only supports JSON-safe values: "
            + _summarize_orchestration_error(error)
        ) from error


def _compact_fit_output_preview(
    value: Any,
    max_chars: int,
    max_items: int,
    max_depth: int,
) -> tuple[Any, dict[str, Any]]:
    stats = {
        "truncated": False,
        "omittedItems": 0,
        "omittedKeys": 0,
        "depthLimited": False,
    }

    if value is None or isinstance(value, (bool, int, float)):
        return value, stats

    if isinstance(value, str):
        if len(value) <= max_chars:
            return value, stats
        preview = value[: max(1, max_chars - 3)] + "..."
        stats["truncated"] = True
        return preview, stats

    if isinstance(value, list):
        if max_depth <= 0:
            stats["truncated"] = True
            stats["depthLimited"] = True
            stats["omittedItems"] = len(value)
            return f"<list len={len(value)}>", stats

        preview: list[Any] = []
        for item in value[:max_items]:
            compacted_item, child_stats = _compact_fit_output_preview(item, max_chars, max_items, max_depth - 1)
            preview.append(compacted_item)
            stats["truncated"] = stats["truncated"] or child_stats["truncated"]
            stats["omittedItems"] += child_stats["omittedItems"]
            stats["omittedKeys"] += child_stats["omittedKeys"]
            stats["depthLimited"] = stats["depthLimited"] or child_stats["depthLimited"]

        omitted_items = max(0, len(value) - len(preview))
        if omitted_items > 0:
            stats["truncated"] = True
            stats["omittedItems"] += omitted_items
        return preview, stats

    if isinstance(value, dict):
        if max_depth <= 0:
            stats["truncated"] = True
            stats["depthLimited"] = True
            stats["omittedKeys"] = len(value)
            return f"<dict keys={len(value)}>", stats

        preview: dict[str, Any] = {}
        for key in list(value.keys())[:max_items]:
            compacted_value, child_stats = _compact_fit_output_preview(value[key], max_chars, max_items, max_depth - 1)
            preview[str(key)] = compacted_value
            stats["truncated"] = stats["truncated"] or child_stats["truncated"]
            stats["omittedItems"] += child_stats["omittedItems"]
            stats["omittedKeys"] += child_stats["omittedKeys"]
            stats["depthLimited"] = stats["depthLimited"] or child_stats["depthLimited"]

        omitted_keys = max(0, len(value) - len(preview))
        if omitted_keys > 0:
            stats["truncated"] = True
            stats["omittedKeys"] += omitted_keys
        return preview, stats

    raise ValueError(
        "fit_output only supports JSON-safe strings, numbers, booleans, null, lists, and dicts"
    )


def _describe_fit_output_kind(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, int):
        return "int"
    if isinstance(value, float):
        return "float"
    if isinstance(value, str):
        return "str"
    if isinstance(value, list):
        return "list"
    if isinstance(value, dict):
        return "dict"
    return type(value).__name__


def _fit_result_to_char_budget(result: dict[str, Any], max_chars: int) -> dict[str, Any]:
    if _measure_json_chars(result) <= max_chars:
        return result

    preview_text = _ptc_json.dumps(result.get("preview"), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    result["preview"] = preview_text
    result["stats"]["previewKind"] = "text"
    result["stats"]["previewChars"] = len(preview_text)
    result["truncated"] = True

    while _measure_json_chars(result) > max_chars and len(result["preview"]) > 4:
        overflow = _measure_json_chars(result) - max_chars
        shrink_by = max(overflow + 3, 8)
        next_length = max(1, len(result["preview"]) - shrink_by)
        result["preview"] = result["preview"][:next_length] + "..."
        result["stats"]["previewChars"] = len(result["preview"])

    if _measure_json_chars(result) <= max_chars:
        return result

    minimal = {
        "kind": _FIT_OUTPUT_KIND,
        "originalKind": result.get("originalKind", "unknown"),
        "preview": "...",
        "truncated": True,
    }
    if _measure_json_chars(minimal) <= max_chars:
        return minimal
    return {"kind": _FIT_OUTPUT_KIND, "truncated": True}


class _PtcHelpers:
    def __init__(
        self,
        max_parallel_tool_calls: int,
        callable_tool_metadata: Sequence[dict[str, Any]] | None = None,
        max_output_chars: int | None = None,
    ):
        self.max_parallel_tool_calls = max(1, max_parallel_tool_calls)
        self.max_output_chars = max(1, max_output_chars if isinstance(max_output_chars, int) else 25_000)
        metadata = callable_tool_metadata if callable_tool_metadata is not None else []
        self._callable_tool_metadata = [
            entry for entry in _clone_json_value(list(metadata)) if isinstance(entry, dict)
        ]
        self._callable_tool_lookup: dict[str, dict[str, Any]] = {}
        available_names: set[str] = set()
        for entry in self._callable_tool_metadata:
            for key in ("name", "pythonName"):
                value = entry.get(key)
                if isinstance(value, str):
                    normalized = value.strip()
                    if normalized:
                        self._callable_tool_lookup[normalized] = entry
                        available_names.add(normalized)
        self._available_callable_tool_names = sorted(available_names)

    async def gather_limit(self, coroutines: Iterable[Coroutine[Any, Any, Any]], limit: int | None = None):
        semaphore = _ptc_asyncio.Semaphore(max(1, limit or self.max_parallel_tool_calls))

        async def _runner(coro: Coroutine[Any, Any, Any]):
            async with semaphore:
                return await coro

        return await _ptc_asyncio.gather(*[_runner(coro) for coro in coroutines])

    async def find_files(
        self,
        pattern: str,
        path: str = ".",
        max_files: int = 1000,
        *,
        relative: bool = True,
        relative_to: str | None = None,
    ) -> Sequence[str]:
        normalized_max_files = _normalize_positive_int("max_files", max_files, 1000)
        files = await glob(pattern=pattern, path=path)
        json_candidate: str | None = None
        if isinstance(files, str):
            json_candidate = files
        elif (
            isinstance(files, Sequence)
            and not isinstance(files, (str, bytes, bytearray))
            and len(files) == 1
            and isinstance(files[0], str)
        ):
            json_candidate = files[0]

        if isinstance(json_candidate, str):
            try:
                parsed = _ptc_json.loads(json_candidate)
                if isinstance(parsed, list):
                    files = parsed
            except Exception:
                if isinstance(files, str):
                    files = [line for line in files.splitlines() if line.strip()]
        normalized = [str(item) for item in list(files)[:normalized_max_files]]
        if relative and relative_to is None:
            return normalized
        base_path = _host_abspath(path)
        return [
            _format_discovered_path(_absolutize_discovered_path(item, base_path), relative=relative, relative_to=relative_to)
            for item in normalized
        ]

    async def find_files_abs(
        self,
        pattern: str,
        path: str = ".",
        max_files: int = 1000,
        *,
        relative: bool = False,
        relative_to: str | None = None,
    ) -> Sequence[str]:
        files = await self.find_files(pattern=pattern, path=path, max_files=max_files)
        base_path = _host_abspath(path)
        absolute_files = [_absolutize_discovered_path(item, base_path) for item in files]
        return [_format_discovered_path(item, relative=relative, relative_to=relative_to) for item in absolute_files]

    async def read_text(self, path: str, offset: int | None = None, limit: int | None = None) -> str:
        result = await read(path=path, offset=offset, limit=limit)
        return _extract_text(result)

    async def read_many(
        self,
        paths: Sequence[str],
        max_concurrency: int | None = None,
        *,
        offset: int | None = None,
        line_limit: int | None = None,
        on_error: str | None = None,
    ) -> Any:
        path_list = list(paths)
        mode = _normalize_batch_on_error(on_error)
        collected_raw = await self.gather_limit(
            [_safe_read_for_many(path, offset=offset, limit=line_limit) for path in path_list],
            limit=max_concurrency,
        )
        if mode == _BATCH_ON_ERROR_RAISE:
            output: list[str] = []
            for entry in collected_raw:
                if entry["ok"]:
                    output.append(_extract_text(entry["value"]))
                else:
                    output.append(f"[read_many error] {entry['error']}")
            return output
        # collect: typed partial envelope
        results: list[dict[str, Any]] = []
        succeeded = 0
        for index, entry in enumerate(collected_raw):
            path_val = path_list[index]
            if entry["ok"]:
                results.append({
                    "index": index,
                    "path": path_val,
                    "ok": True,
                    "value": _extract_text(entry["value"]),
                })
                succeeded += 1
            else:
                results.append({
                    "index": index,
                    "path": path_val,
                    "ok": False,
                    "error": entry["error"],
                })
        return {
            "kind": "read_many_partial",
            "mode": mode,
            "results": results,
            "stats": {
                "total": len(collected_raw),
                "succeeded": succeeded,
                "failed": len(collected_raw) - succeeded,
            },
        }


    async def batch_tool(
        self,
        calls: Sequence[dict[str, Any]],
        max_concurrency: int | None = None,
        *,
        on_error: str | None = None,
    ) -> Any:
        normalized_calls = _normalize_orchestration_calls(calls, allow_empty=True)
        mode = _normalize_batch_on_error(on_error)
        if len(normalized_calls) == 0:
            if mode == _BATCH_ON_ERROR_COLLECT:
                return {
                    "kind": "batch_partial",
                    "mode": mode,
                    "results": [],
                    "stats": {"total": 0, "succeeded": 0, "failed": 0},
                }
            return []
        concurrency = _normalize_orchestration_limit(max_concurrency, self.max_parallel_tool_calls)
        def _normalize_batch_value(tool_name: str, value: Any) -> Any:
            if tool_name == "read":
                return _normalize_read_result(value)
            if tool_name == "grep":
                return _normalize_grep_result(value)
            return value

        if mode == _BATCH_ON_ERROR_RAISE:
            raw_results = await self.gather_limit(
                [_rpc_call(entry["tool"], dict(entry["params"])) for entry in normalized_calls],
                limit=concurrency,
            )
            return [
                _normalize_batch_value(entry["tool"], value)
                for entry, value in zip(normalized_calls, raw_results)
            ]
        async def _collect_call(entry: dict[str, Any], index: int) -> dict[str, Any]:
            try:
                value = await _rpc_call(entry["tool"], dict(entry["params"]))
                normalized_value = _normalize_batch_value(entry["tool"], value)
                tool_error = _classify_tool_error_payload(normalized_value)
                if tool_error is not None:
                    return {
                        "index": index,
                        "tool": entry["tool"],
                        "ok": False,
                        "value": normalized_value,
                        "error": tool_error,
                    }
                return {
                    "index": index,
                    "tool": entry["tool"],
                    "ok": True,
                    "value": normalized_value,
                }
            except Exception as error:
                return {
                    "index": index,
                    "tool": entry["tool"],
                    "ok": False,
                    "error": _summarize_orchestration_error(error),
                }
        collected = await self.gather_limit(
            [_collect_call(entry, index) for index, entry in enumerate(normalized_calls)],
            limit=concurrency,
        )
        succeeded = sum(1 for item in collected if item.get("ok"))
        failed = len(collected) - succeeded
        return {
            "kind": "batch_partial",
            "mode": mode,
            "results": list(collected),
            "stats": {
                "total": len(collected),
                "succeeded": succeeded,
                "failed": failed,
            },
        }

    async def read_tree(
        self,
        pattern: str,
        path: str = ".",
        max_files: int = 1000,
        concurrency: int | None = None,
        offset: int | None = None,
        line_limit: int | None = None,
        *,
        relative: bool = False,
        relative_to: str | None = None,
    ) -> Sequence[dict[str, Any]]:
        files = await self.find_files_abs(pattern=pattern, path=path, max_files=max_files)
        contents = await self.read_many(files, max_concurrency=concurrency, offset=offset, line_limit=line_limit)
        return [
            {
                "path": _format_discovered_path(file_path, relative=relative, relative_to=relative_to),
                "content": content,
            }
            for file_path, content in zip(files, contents)
        ]

    def extract_handles(self, value: Any, kind: str | None = None) -> list[SupportedHandle]:
        normalized_kind = _normalize_handle_kind(kind)
        handles: list[SupportedHandle] = []
        _collect_supported_handles(value, handles, set())
        if normalized_kind is None:
            return handles
        return [handle for handle in handles if handle["kind"] == normalized_kind]

    def first_handle(self, value: Any, kind: str | None = None) -> SupportedHandle | None:
        handles = self.extract_handles(value, kind=kind)
        return handles[0] if handles else None

    def expect_kind(self, value: Any, kind: str) -> Any:
        return _expect_kind(value, kind)


    def list_callable_tools(self) -> list[dict[str, Any]]:
        return _clone_json_value(self._callable_tool_metadata)

    def get_tool_schema(self, name: str) -> dict[str, Any]:
        normalized_name = _normalize_callable_tool_name(name)
        tool_metadata = self._callable_tool_lookup.get(normalized_name)
        if tool_metadata is None:
            available = ", ".join(self._available_callable_tool_names) or "<none>"
            raise ValueError(f"Unknown callable tool '{normalized_name}'. Available: {available}")
        parameters = tool_metadata.get("parameters")
        if not isinstance(parameters, dict):
            raise ValueError(f"Callable tool '{normalized_name}' does not expose an object parameter schema")
        return _clone_json_value(parameters)

    def help(self, name: str) -> dict[str, Any]:
        normalized_name = _normalize_callable_tool_name(name)
        tool_metadata = self._callable_tool_lookup.get(normalized_name)
        if tool_metadata is None:
            available = ", ".join(self._available_callable_tool_names) or "<none>"
            raise ValueError(f"Unknown callable tool '{normalized_name}'. Available: {available}")
        return _clone_json_value(tool_metadata)


    async def first_success(self, calls: Sequence[dict[str, Any]], max_concurrency: int | None = None) -> Any:
        normalized_calls = _normalize_orchestration_calls(calls)
        _normalize_orchestration_limit(max_concurrency, self.max_parallel_tool_calls)
        failures: list[str] = []

        for entry in normalized_calls:
            try:
                return await _rpc_call(entry["tool"], dict(entry["params"]))
            except Exception as error:
                failures.append(f"{entry['tool']}: {_summarize_orchestration_error(error)}")

        raise ValueError("All candidate tool calls failed: " + "; ".join(failures))

    async def reduce_tool(
        self,
        calls: Sequence[dict[str, Any]],
        reducer: Callable[[Any, Any], Any],
        initial: Any,
        max_concurrency: int | None = None,
    ) -> Any:
        if not callable(reducer):
            raise ValueError("reducer must be callable")
        results = await self.batch_tool(calls, max_concurrency=max_concurrency)
        accumulator = initial
        for index, result in enumerate(results):
            try:
                accumulator = reducer(accumulator, result)
            except Exception as error:
                raise ValueError(
                    f"Reducer failed at index {index}: {_summarize_orchestration_error(error)}"
                ) from error
        return accumulator

    def fit_output(
        self,
        value: Any,
        max_chars: int | None = None,
        max_items: int | None = None,
        max_depth: int | None = None,
    ) -> dict[str, Any]:
        limits = _normalize_fit_output_limits(
            max_chars,
            max_items,
            max_depth,
            self.max_output_chars,
        )
        safe_value = _json_safe_clone_for_fit_output(value)
        preview, preview_stats = _compact_fit_output_preview(
            safe_value,
            limits["max_chars"],
            limits["max_items"],
            limits["max_depth"],
        )
        result = {
            "kind": _FIT_OUTPUT_KIND,
            "originalKind": _describe_fit_output_kind(safe_value),
            "preview": preview,
            "truncated": bool(preview_stats["truncated"]),
            "limits": {
                "maxChars": limits["max_chars"],
                "maxItems": limits["max_items"],
                "maxDepth": limits["max_depth"],
            },
            "stats": {
                "originalChars": _measure_json_chars(safe_value),
                "previewChars": _measure_json_chars(preview),
                "omittedItems": preview_stats["omittedItems"],
                "omittedKeys": preview_stats["omittedKeys"],
                "depthLimited": preview_stats["depthLimited"],
            },
        }
        result["truncated"] = bool(
            result["truncated"]
            or result["stats"]["originalChars"] > limits["max_chars"]
            or result["stats"]["previewChars"] > limits["max_chars"]
        )
        return _fit_result_to_char_budget(result, limits["max_chars"])

    def run_tests(self, pattern: str) -> dict[str, Any]:
        """Run Node's built-in `node --test <pattern>` from the active runtime
        workspace and return a Phase 50-compatible ``ptc.report`` describing
        pass/fail metrics, duration, command metadata, runner availability,
        warnings, and a bounded failures table.

        Failing tests, missing runner, and timeouts are represented as report
        data; only invalid helper arguments raise ``ValueError``. The helper
        uses an explicit argument list and never spawns a shell.
        """
        if not isinstance(pattern, str) or not pattern.strip():
            raise ValueError("pattern must be a non-empty string")
        if _ptc_os.path.isabs(pattern):
            raise ValueError(
                "pattern must be a non-empty string scoped to the runtime workspace; absolute paths are rejected"
            )
        normalized_pattern = pattern.replace("\\", "/")
        if ".." in normalized_pattern.split("/"):
            raise ValueError(
                "pattern must be a non-empty string with no parent-directory ('..') traversal"
            )
        for forbidden in _NODE_TEST_RUNNER_PATTERN_FORBIDDEN:
            if forbidden in pattern:
                raise ValueError(
                    "pattern must be a non-empty string without shell-control characters (|, ;, &, `, $, newline)"
                )

        command = ["node", "--test", pattern]
        # Scrub node:test reentry markers so a Node test that calls
        # ptc.run_tests(...) doesn't inherit the outer runner context and
        # trigger "node:test run() is being called recursively" warnings.
        child_env = {
            key: value
            for key, value in _ptc_os.environ.items()
            if key not in ("NODE_TEST_CONTEXT", "NODE_RUN_SCRIPT_NAME")
        }
        runner_path = _ptc_shutil.which("node", path=child_env.get("PATH"))
        runner_resolution = "path" if runner_path else "missing_on_path"
        warnings_list: list[str] = []
        runner_available = runner_path is not None
        exit_code: int | None = None
        stdout = ""
        stderr = ""
        timed_out = False
        start = _ptc_time.monotonic()
        if runner_available:
            try:
                completed = _ptc_subprocess.run(
                    command,
                    cwd=_PTC_RUNTIME_WORKSPACE_ROOT,
                    text=True,
                    capture_output=True,
                    shell=False,
                    check=False,
                    env=child_env,
                    timeout=_NODE_TEST_RUNNER_TIMEOUT_SECONDS,
                )
            except FileNotFoundError:
                runner_available = False
                runner_path = None
                runner_resolution = "missing_on_path"
                warnings_list.append(
                    "Node was not found in the active runtime PATH; Python-only or Docker runtimes may report runner_available=false unless configured with Node."
                )
            except _ptc_subprocess.TimeoutExpired as timeout_error:
                timed_out = True
                stdout = timeout_error.stdout if isinstance(timeout_error.stdout, str) else ""
                stderr = timeout_error.stderr if isinstance(timeout_error.stderr, str) else ""
                warnings_list.append(
                    f"node --test exceeded the {_NODE_TEST_RUNNER_TIMEOUT_SECONDS}s timeout and was terminated; metrics may be partial."
                )
            else:
                stdout = completed.stdout or ""
                stderr = completed.stderr or ""
                exit_code = completed.returncode
        else:
            warnings_list.append(
                "Node was not found in the active runtime PATH; Python-only or Docker runtimes may report runner_available=false unless configured with Node."
            )
        duration_ms = max(0, int((_ptc_time.monotonic() - start) * 1000))

        metrics: dict[str, Any] = {
            "runner": "node --test",
            "runner_available": runner_available,
            "runner_path": runner_path,
            "runner_resolution": runner_resolution,
            "pattern": pattern,
            "cwd": ".",
            "command": _ptc_shlex.join(command),
            "exit_code": exit_code,
            "total": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "todo": 0,
            "cancelled": 0,
            "duration_ms": duration_ms,
            "timed_out": timed_out,
        }

        tables: list[dict[str, Any]] = []
        samples: list[dict[str, Any]] = []

        if runner_available:
            parsed = _parse_node_test_output(stdout, stderr)
            for key in ("total", "passed", "failed", "skipped", "todo", "cancelled"):
                if parsed.get(key) is not None:
                    metrics[key] = int(parsed[key])
            if parsed.get("duration_ms") is not None:
                metrics["duration_ms"] = parsed["duration_ms"]

            failed_names = parsed.get("failed_names") or []
            if failed_names:
                rows = [
                    {"index": idx + 1, "name": name}
                    for idx, name in enumerate(failed_names[:_NODE_TEST_RUNNER_MAX_FAILURES])
                ]
                tables.append(
                    {
                        "title": "Failing tests",
                        "columns": ["index", "name"],
                        "rows": rows,
                    }
                )
                if len(failed_names) > _NODE_TEST_RUNNER_MAX_FAILURES:
                    warnings_list.append(
                        f"truncated failures table to first {_NODE_TEST_RUNNER_MAX_FAILURES} of {len(failed_names)} reported failed tests."
                    )

            parser_incomplete = parsed.get("summary_seen") is False
            if exit_code not in (0, None) and metrics["failed"] == 0:
                parser_incomplete = True
                metrics["failed"] = max(metrics["failed"], 1)
            if parser_incomplete:
                stdout_sample = stdout[-_NODE_TEST_RUNNER_MAX_SAMPLE_CHARS:] if stdout else ""
                stderr_sample = stderr[-_NODE_TEST_RUNNER_MAX_SAMPLE_CHARS:] if stderr else ""
                samples.append(
                    {
                        "label": "node --test output (parse fallback)",
                        "value": {
                            "stdout_tail": stdout_sample,
                            "stderr_tail": stderr_sample,
                        },
                    }
                )
                warnings_list.append(
                    "could not parse summary counts from node --test output; falling back to bounded stdout/stderr samples."
                )

        title_state = (
            "runner unavailable"
            if not runner_available
            else ("timed out" if timed_out else ("failed" if metrics["failed"] > 0 else "passed"))
        )
        title = f"node --test {pattern} ({title_state})"

        return {
            "kind": _REPORT_KIND,
            "version": _REPORT_VERSION,
            "title": title,
            "metrics": _normalize_report_metrics(metrics),
            "tables": _normalize_report_tables(tables),
            "samples": _normalize_report_samples(samples),
            "warnings": _normalize_report_warnings(warnings_list),
        }

    def report(
        self,
        title: str,
        metrics: dict[str, Any] | None = None,
        tables: Sequence[dict[str, Any]] | None = None,
        samples: Sequence[dict[str, Any]] | None = None,
        warnings: Sequence[str] | None = None,
    ) -> dict[str, Any]:
        if not isinstance(title, str) or not title.strip():
            raise ValueError("title must be a non-empty string")
        return {
            "kind": _REPORT_KIND,
            "version": _REPORT_VERSION,
            "title": title,
            "metrics": _normalize_report_metrics(metrics),
            "tables": _normalize_report_tables(tables),
            "samples": _normalize_report_samples(samples),
            "warnings": _normalize_report_warnings(warnings),
        }

    def tabulate(
        self,
        rows: Sequence[Any],
        headers: Sequence[str] | None = None,
        title: str | None = None,
    ) -> dict[str, Any]:
        if not isinstance(rows, Sequence) or isinstance(rows, (str, bytes, bytearray)):
            raise ValueError("rows must be a list of objects or sequences")
        rows_list = list(rows)
        columns = _normalize_tabulate_columns(headers, rows_list)
        normalized: dict[str, Any] = {"columns": columns, "rows": _normalize_tabulate_rows(rows_list, columns)}
        if title is not None:
            if not isinstance(title, str) or not title.strip():
                raise ValueError("title must be a non-empty string")
            normalized["title"] = title
        return normalized

    def diff(self, before: Any, after: Any) -> dict[str, Any]:
        if isinstance(before, dict) and isinstance(after, dict):
            return _shallow_dict_diff(before, after)
        if isinstance(before, set) and isinstance(after, set):
            return _shallow_sequence_diff(
                sorted(before, key=lambda item: _bridge_identity(item)),
                sorted(after, key=lambda item: _bridge_identity(item)),
            )
        if (
            isinstance(before, Sequence)
            and isinstance(after, Sequence)
            and not isinstance(before, (str, bytes, bytearray))
            and not isinstance(after, (str, bytes, bytearray))
        ):
            return _shallow_sequence_diff(before, after)
        before_value = _json_safe_bridge_value(before)
        after_value = _json_safe_bridge_value(after)
        changed = {} if before_value == after_value else {"value": {"before": before_value, "after": after_value}}
        return {"kind": "ptc_diff", "added": {}, "removed": {}, "changed": changed}

    def json_dump(self, value: Any) -> str:
        return _ptc_json.dumps(value, indent=2, ensure_ascii=False, sort_keys=True)


ptc = _PtcHelpers(
    globals().get("PTC_MAX_PARALLEL_TOOL_CALLS", 8),
    globals().get("_PTC_CALLABLE_TOOL_METADATA", []),
    globals().get("PTC_MAX_OUTPUT_CHARS", 25_000),
)


# Post-process wrapper: normalize grep record paths to workspace-relative.
# The generated grep() wrapper calls _rpc_call("grep", params) and returns
# whatever the RPC returns. When the hashline bridge is active, record paths
# are absolute. This wrapper normalizes them.
_generated_grep = globals().get("grep")
if callable(_generated_grep):
    async def grep(*args, **kwargs):
        if len(args) > 1:
            raise TypeError(f"grep() takes at most 1 positional argument ({len(args)} given)")
        if args:
            if "pattern" in kwargs:
                raise TypeError("grep() got multiple values for argument 'pattern'")
            kwargs["pattern"] = args[0]
        result = await _generated_grep(**kwargs)
        return _normalize_grep_result(result)


# Post-process wrapper: normalize read result paths to workspace-relative.
# Mirrors the grep wrapper above so direct read(), ptc.read_text(), ptc.read_many(),
# and any read/grep payload surfaced through ptc.batch_tool(...) share one policy.
_generated_read = globals().get("read")
if callable(_generated_read):
    async def read(*args, **kwargs):
        if len(args) > 1:
            raise TypeError(f"read() takes at most 1 positional argument ({len(args)} given)")
        if args:
            if "path" in kwargs:
                raise TypeError("read() got multiple values for argument 'path'")
            kwargs["path"] = args[0]
        result = await _generated_read(**kwargs)
        return _normalize_read_result(result)


def _stringify_output(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (dict, list, tuple, bool, int, float)):
        return _ptc_json.dumps(value, indent=2, ensure_ascii=False, sort_keys=True)
    return str(value)


async def _runtime_main(user_main: Callable[[], Coroutine[Any, Any, Any]]):
    try:
        await _rpc.start_reader()
        _ptc_sys.settrace(_trace_lines)
        _ptc_sys.stdout = _stdout_proxy
        output = await user_main()
        _stdout_proxy.flush()
        _ptc_sys.stdout = _ORIGINAL_STDOUT
        _ptc_sys.settrace(None)
        complete_message = {"type": "complete", "output": _stringify_output(output)}
        report = _extract_ptc_report(output)
        if report is not None:
            complete_message["report"] = report
        _emit_protocol(complete_message)
    except Exception as error:
        _ptc_sys.stdout = _ORIGINAL_STDOUT
        _ptc_sys.settrace(None)
        _emit_protocol(
            {
                "type": "error",
                "message": str(error),
                "traceback": _ptc_traceback.format_exc(),
            }
        )
        _ptc_sys.exit(1)
    finally:
        await _rpc.cleanup()
