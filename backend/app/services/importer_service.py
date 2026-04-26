import csv
import io
import re
from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.category import Category
from app.models.excluded_day import ExcludedDay
from app.models.import_mapping import ImportMapping
from app.models.payment_method import PaymentMethod
from app.models.prediction import PredictionInstance, PredictionTemplate
from app.models.settings import Settings
from app.models.transaction import Transaction
from app.models.transfer import Transfer
from app.schemas.importer import (
    AccountProjection,
    ImportCommitResponse,
    ImportCommitResult,
    ImportDryRunResponse,
    ParsedImportRow,
    SourcePair,
    SourceMapping,
)
from app.models.transfer import Transfer

TRUE_VALUES = {"TRUE"}


def _normalize_label(value: str) -> str:
    cleaned = (value or "").strip()
    cleaned = re.sub(r"^[^\w]+", "", cleaned).strip()
    return cleaned


def _source_kind(value: str) -> str:
    normalized = _normalize_label(value).lower()
    if "daily" in normalized:
        return "daily"
    if "big expense" in normalized:
        return "big_expense"
    if "big earning" in normalized:
        return "big_earning"
    if "prediction" in normalized:
        return "prediction"
    return "other"


def _parse_date(value: str) -> date:
    return datetime.strptime(value.strip(), "%d/%m/%Y").date()


def _parse_amount(value: str) -> Decimal:
    normalized = value.strip().replace("€", "").replace(",", "")
    return Decimal(normalized)


def parse_csv_bytes(file_bytes: bytes) -> tuple[list[ParsedImportRow], list[SourcePair]]:
    text_data = file_bytes.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text_data))
    rows: list[ParsedImportRow] = []
    combos: set[tuple[str, str]] = set()

    for idx, raw in enumerate(reader, start=2):
        category_raw = (raw.get("Category") or "").strip()
        subcategory_raw = (raw.get("Subcategory") or "").strip()
        delete_raw = (raw.get("Delete") or "").strip()
        date_raw = (raw.get("Date") or "").strip()
        sum_raw = (raw.get("Sum") or "").strip()
        skip_deleted = delete_raw.upper() in TRUE_VALUES
        parse_error = None
        parsed_date = None
        parsed_amount = None

        if not skip_deleted:
            try:
                parsed_date = _parse_date(date_raw)
            except Exception:
                parse_error = f"Invalid date at row {idx}: {date_raw!r}"
            try:
                parsed_amount = float(_parse_amount(sum_raw))
            except Exception:
                parse_error = (parse_error + "; " if parse_error else "") + f"Invalid amount: {sum_raw!r}"

        if category_raw or subcategory_raw:
            combos.add((_normalize_label(category_raw), subcategory_raw.strip()))

        rows.append(
            ParsedImportRow(
                row_index=idx,
                date_raw=date_raw,
                category_raw=category_raw,
                subcategory_raw=subcategory_raw,
                sum_raw=sum_raw,
                delete_raw=delete_raw,
                parsed_date=parsed_date,
                parsed_amount=parsed_amount,
                skip_deleted=skip_deleted,
                parse_error=parse_error,
            )
        )

    pairs = [SourcePair(source_category=c, source_subcategory=s) for c, s in sorted(combos)]
    return rows, pairs


def get_saved_mappings(db: Session) -> list[SourceMapping]:
    rows = db.query(ImportMapping).order_by(ImportMapping.source_category, ImportMapping.source_subcategory).all()
    return [
        SourceMapping(
            source_category=row.source_category,
            source_subcategory=row.source_subcategory,
            mapping=row.mapping or {},
        )
        for row in rows
    ]


def upsert_mappings(db: Session, mappings: list[SourceMapping], *, commit: bool = True) -> None:
    for item in mappings:
        existing = (
            db.query(ImportMapping)
            .filter(
                ImportMapping.source_category == item.source_category,
                ImportMapping.source_subcategory == item.source_subcategory,
            )
            .first()
        )
        if existing:
            existing.mapping = item.mapping
        else:
            db.add(
                ImportMapping(
                    source_category=item.source_category,
                    source_subcategory=item.source_subcategory,
                    mapping=item.mapping,
                )
            )
    if commit:
        db.commit()


def _mapping_dict(mappings: list[SourceMapping]) -> dict[tuple[str, str], dict[str, Any]]:
    return {(m.source_category, m.source_subcategory): m.mapping for m in mappings}


def _current_balance(db: Session, account: Account) -> Decimal:
    total = db.execute(
        text(
            "SELECT COALESCE(SUM(amount), 0) "
            "FROM transactions WHERE account_id = :aid AND deleted_at IS NULL"
        ),
        {"aid": account.id},
    ).scalar_one()
    return Decimal(account.initial_balance) - Decimal(total or 0)


def dry_run(db: Session, account_id: int, rows: list[ParsedImportRow], mappings: list[SourceMapping]) -> ImportDryRunResponse:
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    mapping_lookup = _mapping_dict(mappings)
    deltas = defaultdict(lambda: Decimal("0"))
    unmapped: set[tuple[str, str]] = set()
    issues: list[str] = []

    skipped_deleted = 0
    parse_errors = 0
    ready_rows = 0

    for row in rows:
        if row.skip_deleted:
            skipped_deleted += 1
            continue
        if row.parse_error or row.parsed_amount is None or row.parsed_date is None:
            parse_errors += 1
            continue

        key = (_normalize_label(row.category_raw), row.subcategory_raw.strip())
        mapping = mapping_lookup.get(key)
        if not mapping:
            unmapped.add(key)
            continue

        ready_rows += 1
        amount = Decimal(str(row.parsed_amount))
        src_kind = _source_kind(row.category_raw)
        kind = mapping.get("kind")
        if kind == "transaction":
            tx_type = mapping.get("transaction_type", "unplanned")
            signed = -amount if src_kind == "big_earning" else amount
            deltas[account_id] += signed
        elif kind == "transfer":
            from_account_id = int(mapping.get("from_account_id"))
            to_account_id = int(mapping.get("to_account_id"))
            deltas[from_account_id] += amount
            deltas[to_account_id] -= amount
        elif kind == "correction":
            target_account_id = int(mapping.get("account_id") or account_id)
            direction = mapping.get("direction", "decrease")
            if direction == "decrease":
                deltas[target_account_id] += amount
            else:
                deltas[target_account_id] -= amount
        elif kind == "prediction":
            template_id = mapping.get("template_id")
            template = db.get(PredictionTemplate, int(template_id)) if template_id else None
            deltas[account_id] += (-amount if template and Decimal(template.amount) < 0 else amount)
        else:
            issues.append(f"Row {row.row_index}: unsupported mapping kind {kind!r}")

    projections: list[AccountProjection] = []
    account_ids = sorted(set([account_id, *deltas.keys()]))
    for aid in account_ids:
        a = db.get(Account, aid)
        if not a:
            issues.append(f"Unknown account {aid} referenced in mappings.")
            continue
        current = _current_balance(db, a)
        delta = deltas[aid]
        projections.append(
            AccountProjection(
                account_id=aid,
                account_name=a.name,
                current_balance=float(current),
                delta=float(delta),
                projected_balance=float(current - delta),
            )
        )

    return ImportDryRunResponse(
        total_rows=len(rows),
        skipped_deleted_rows=skipped_deleted,
        parse_error_rows=parse_errors,
        ready_rows=ready_rows,
        unmapped_pairs=[SourcePair(source_category=c, source_subcategory=s) for c, s in sorted(unmapped)],
        projections=projections,
        issues=issues,
    )


def _resolve_category(db: Session, category_id: int | None, category_type: str, category_name: str) -> int:
    if category_id:
        c = db.get(Category, category_id)
        if not c:
            raise HTTPException(status_code=422, detail=f"Category {category_id} not found")
        return c.id
    existing = (
        db.query(Category)
        .filter(Category.parent_id.is_(None), Category.type == category_type, Category.name == category_name)
        .first()
    )
    if existing:
        return existing.id
    new = Category(name=category_name, type=category_type, parent_id=None)
    db.add(new)
    db.flush()
    return new.id


def _balance_at_date(db: Session, account: Account, as_of: date) -> Decimal:
    total = db.execute(
        text(
            "SELECT COALESCE(SUM(amount), 0) "
            "FROM transactions "
            "WHERE account_id = :aid AND deleted_at IS NULL AND transaction_date <= :as_of"
        ),
        {"aid": account.id, "as_of": as_of},
    ).scalar_one()
    return Decimal(account.initial_balance) - Decimal(total or 0)


def _ensure_subcategory_exists(
    db: Session,
    *,
    parent_category_id: int,
    parent_type: str,
    subcategory_name: str | None,
) -> None:
    name = (subcategory_name or "").strip()
    if not name:
        return
    existing = (
        db.query(Category)
        .filter(
            Category.parent_id == parent_category_id,
            Category.name.ilike(name),
        )
        .first()
    )
    if existing:
        return
    db.add(
        Category(
            name=name,
            type=parent_type,
            parent_id=parent_category_id,
        )
    )
    db.flush()


def commit_import(db: Session, account_id: int, rows: list[ParsedImportRow], mappings: list[SourceMapping]) -> ImportCommitResponse:
    mapping_lookup = _mapping_dict(mappings)
    results: list[ImportCommitResult] = []

    for row in rows:
        if row.skip_deleted:
            results.append(ImportCommitResult(row_index=row.row_index, ok=True, action="skipped", message="Deleted row skipped"))
            continue
        if row.parse_error or row.parsed_amount is None or row.parsed_date is None:
            results.append(ImportCommitResult(row_index=row.row_index, ok=False, action="skipped", message=row.parse_error or "Invalid row"))
            continue

        key = (_normalize_label(row.category_raw), row.subcategory_raw.strip())
        mapping = mapping_lookup.get(key)
        if not mapping:
            results.append(ImportCommitResult(row_index=row.row_index, ok=False, action="skipped", message="Unmapped category/subcategory"))
            continue

        amount = Decimal(str(row.parsed_amount))
        when = row.parsed_date
        src_kind = _source_kind(row.category_raw)
        try:
            with db.begin_nested():
                kind = mapping.get("kind")
                if kind == "transaction":
                    tx_type = mapping.get("transaction_type", "unplanned")
                    parent_category_id = _resolve_category(
                        db,
                        mapping.get("category_id"),
                        tx_type if tx_type in {"daily", "unplanned"} else "unplanned",
                        mapping.get("category_name", "Imported"),
                    )
                    subcategory = (mapping.get("subcategory") or "").strip() or None
                    _ensure_subcategory_exists(
                        db,
                        parent_category_id=parent_category_id,
                        parent_type=tx_type if tx_type in {"daily", "unplanned"} else "unplanned",
                        subcategory_name=subcategory,
                    )
                    source_desc = f"Imported: {row.category_raw}"
                    if row.subcategory_raw:
                        source_desc = f"{source_desc} -> {row.subcategory_raw}"
                    tx = Transaction(
                        account_id=account_id,
                        category_id=parent_category_id,
                        amount=(-amount if src_kind == "big_earning" else amount),
                        transaction_date=when,
                        type=tx_type,
                        subcategory=subcategory,
                        description=mapping.get("description") or source_desc,
                        payment_method_id=mapping.get("payment_method_id"),
                        confirmed=True,
                    )
                    db.add(tx)
                    db.flush()
                    results.append(ImportCommitResult(row_index=row.row_index, ok=True, action="transaction"))
                elif kind == "transfer":
                    from_account_id = int(mapping["from_account_id"])
                    to_account_id = int(mapping["to_account_id"])
                    if from_account_id == to_account_id:
                        raise HTTPException(status_code=422, detail="Transfer source and target cannot match")
                    from_account = db.get(Account, from_account_id)
                    to_account = db.get(Account, to_account_id)
                    if not from_account or not to_account:
                        raise HTTPException(status_code=422, detail="Transfer account not found")
                    label = mapping.get("description") or f"Imported transfer: {row.subcategory_raw}"
                    debit = Transaction(
                        account_id=from_account_id,
                        amount=amount,
                        transaction_date=when,
                        type="transfer",
                        description=label,
                        confirmed=True,
                    )
                    credit = Transaction(
                        account_id=to_account_id,
                        amount=-amount,
                        transaction_date=when,
                        type="transfer",
                        description=label,
                        confirmed=True,
                    )
                    transfer = Transfer(
                        from_account_id=from_account_id,
                        to_account_id=to_account_id,
                        amount=amount,
                        transfer_date=when,
                        description=label,
                    )
                    db.add_all([debit, credit, transfer])
                    db.flush()
                    results.append(ImportCommitResult(row_index=row.row_index, ok=True, action="transfer"))
                elif kind == "correction":
                    target_account_id = int(mapping.get("account_id") or account_id)
                    direction = mapping.get("direction", "decrease")
                    target_account = db.get(Account, target_account_id)
                    if not target_account:
                        raise HTTPException(status_code=422, detail=f"Account {target_account_id} not found")
                    balance_at_date = _balance_at_date(db, target_account, when)
                    target_balance = balance_at_date - amount if direction == "decrease" else balance_at_date + amount
                    correction_amount = balance_at_date - target_balance
                    correction_tx = Transaction(
                        account_id=target_account_id,
                        amount=correction_amount,
                        transaction_date=when,
                        type="correction",
                        description=mapping.get("description") or f"Imported correction: {row.subcategory_raw}",
                        confirmed=True,
                    )
                    db.add(correction_tx)
                    db.flush()
                    results.append(ImportCommitResult(row_index=row.row_index, ok=True, action="correction"))
                elif kind == "prediction":
                    template_id = int(mapping["template_id"])
                    template = db.get(PredictionTemplate, template_id)
                    if not template:
                        raise HTTPException(status_code=422, detail=f"Template {template_id} not found")
                    final_amount = amount if Decimal(template.amount) >= 0 else -amount
                    instance = (
                        db.query(PredictionInstance)
                        .filter(
                            PredictionInstance.template_id == template.id,
                            PredictionInstance.scheduled_date == when,
                        )
                        .first()
                    )
                    if not instance:
                        instance = PredictionInstance(
                            template_id=template.id,
                            account_id=template.account_id,
                            amount=final_amount,
                            scheduled_date=when,
                            status="pending",
                        )
                        db.add(instance)
                        db.flush()

                    if instance.status == "confirmed":
                        results.append(
                            ImportCommitResult(
                                row_index=row.row_index,
                                ok=True,
                                action="prediction",
                                message="Instance already confirmed; skipped duplicate import.",
                            )
                        )
                        continue

                    tx = Transaction(
                        account_id=instance.account_id,
                        amount=final_amount,
                        transaction_date=when,
                        type="predicted",
                        description=f"Confirmed: {template.name}",
                        payment_method_id=template.payment_method_id,
                        confirmed=True,
                    )
                    db.add(tx)
                    db.flush()
                    instance.transaction_id = tx.id
                    instance.status = "confirmed"
                    instance.confirmed_date = when
                    instance.confirmed_amount = final_amount
                    results.append(ImportCommitResult(row_index=row.row_index, ok=True, action="prediction"))
                else:
                    raise HTTPException(status_code=422, detail=f"Unsupported mapping kind {kind!r}")
        except Exception as exc:
            results.append(ImportCommitResult(row_index=row.row_index, ok=False, action="skipped", message=str(exc)))
            continue

    upsert_mappings(db, mappings, commit=False)
    db.commit()

    success_count = sum(1 for r in results if r.ok and r.action != "skipped")
    failure_count = sum(1 for r in results if not r.ok)
    return ImportCommitResponse(success_count=success_count, failure_count=failure_count, results=results)


BACKUP_TABLES = [
    PaymentMethod,
    Account,
    Settings,
    Category,
    PredictionTemplate,
    Transaction,
    Transfer,
    PredictionInstance,
    ExcludedDay,
    ImportMapping,
]


def _serialize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def build_backup_payload(db: Session) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for model in BACKUP_TABLES:
        rows = db.query(model).all()
        payload[model.__tablename__] = [
            {col.name: _serialize_value(getattr(row, col.name)) for col in model.__table__.columns}
            for row in rows
        ]
    return payload


def _coerce_restore_value(column, value):
    if value is None:
        return None
    try:
        py_type = column.type.python_type
    except (NotImplementedError, AttributeError):
        py_type = None
    if py_type is Decimal:
        return Decimal(str(value))
    if py_type is date:
        return date.fromisoformat(value)
    if py_type is datetime:
        return datetime.fromisoformat(value)
    if py_type is bool:
        return bool(value)
    if py_type is int:
        return int(value)
    return value


def restore_from_payload(db: Session, payload: dict[str, Any]) -> None:
    table_names = [m.__tablename__ for m in BACKUP_TABLES]
    stmt = "TRUNCATE TABLE " + ", ".join(table_names) + " RESTART IDENTITY CASCADE;"
    db.execute(text(stmt))
    db.flush()

    for model in BACKUP_TABLES:
        rows = payload.get(model.__tablename__, [])
        if not rows:
            continue
        prepared = []
        for row in rows:
            item = {}
            for col in model.__table__.columns:
                if col.name in row:
                    try:
                        item[col.name] = _coerce_restore_value(col, row[col.name])
                    except Exception as exc:
                        raise ValueError(
                            f"Failed coercion for table '{model.__tablename__}', column '{col.name}', value={row[col.name]!r}: {exc}"
                        ) from exc
            prepared.append(item)
        if prepared:
            try:
                db.execute(model.__table__.insert(), prepared)
            except Exception as exc:
                raise ValueError(
                    f"Failed inserting into table '{model.__tablename__}': {exc}"
                ) from exc

    # Re-sync serial/identity sequences after explicit-ID inserts from backup.
    # Without this, next inserts may reuse existing PK values and fail with
    # duplicate key violations (e.g. prediction_templates_pkey).
    for model in BACKUP_TABLES:
        id_col = model.__table__.columns.get("id")
        if id_col is None:
            continue
        try:
            db.execute(
                text(
                    """
                    SELECT setval(
                        pg_get_serial_sequence(:table_name, 'id'),
                        COALESCE((SELECT MAX(id) FROM {table_name}), 0) + 1,
                        false
                    )
                    """.format(table_name=model.__tablename__)
                ),
                {"table_name": model.__tablename__},
            )
        except Exception:
            # Some tables may not use a serial/identity-backed id; skip safely.
            continue
    db.commit()


def nuke_user_data(db: Session) -> None:
    table_names = [m.__tablename__ for m in BACKUP_TABLES]
    stmt = "TRUNCATE TABLE " + ", ".join(table_names) + " RESTART IDENTITY CASCADE;"
    db.execute(text(stmt))
    db.commit()
