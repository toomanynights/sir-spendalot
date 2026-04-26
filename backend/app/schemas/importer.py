from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field


class ParsedImportRow(BaseModel):
    row_index: int
    date_raw: str
    category_raw: str
    subcategory_raw: str
    sum_raw: str
    delete_raw: str
    parsed_date: date | None = None
    parsed_amount: float | None = None
    skip_deleted: bool = False
    parse_error: str | None = None


class SourcePair(BaseModel):
    source_category: str
    source_subcategory: str


class ImportParseResponse(BaseModel):
    rows: list[ParsedImportRow]
    source_pairs: list[SourcePair]


class SourceMapping(BaseModel):
    source_category: str
    source_subcategory: str
    mapping: dict[str, Any]


class ImportMappingsResponse(BaseModel):
    mappings: list[SourceMapping]


class ImportMappingsUpsertRequest(BaseModel):
    mappings: list[SourceMapping]


class ImportDryRunRequest(BaseModel):
    account_id: int
    rows: list[ParsedImportRow]
    mappings: list[SourceMapping]


class AccountProjection(BaseModel):
    account_id: int
    account_name: str
    current_balance: float
    delta: float
    projected_balance: float


class ImportDryRunResponse(BaseModel):
    total_rows: int
    skipped_deleted_rows: int
    parse_error_rows: int
    ready_rows: int
    unmapped_pairs: list[SourcePair]
    projections: list[AccountProjection]
    issues: list[str] = Field(default_factory=list)


class ImportCommitRequest(BaseModel):
    account_id: int
    rows: list[ParsedImportRow]
    mappings: list[SourceMapping]


class ImportCommitResult(BaseModel):
    row_index: int
    ok: bool
    action: Literal["transaction", "transfer", "correction", "prediction", "skipped"]
    message: str | None = None


class ImportCommitResponse(BaseModel):
    success_count: int
    failure_count: int
    results: list[ImportCommitResult]


class BackupPayloadResponse(BaseModel):
    payload: dict[str, Any]


class RestoreRequest(BaseModel):
    payload: dict[str, Any]
