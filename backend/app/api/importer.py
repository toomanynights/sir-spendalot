import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.importer import (
    BackupPayloadResponse,
    ImportCommitRequest,
    ImportCommitResponse,
    ImportDryRunRequest,
    ImportDryRunResponse,
    ImportMappingsResponse,
    ImportMappingsUpsertRequest,
    ImportParseResponse,
    RestoreRequest,
)
from app.services import importer_service  # type: ignore
from app.services.auth_service import require_auth

router = APIRouter(
    prefix="/api/importer",
    tags=["importer"],
    dependencies=[Depends(require_auth)],
)


@router.post("/parse-csv", response_model=ImportParseResponse)
async def parse_csv(file: UploadFile = File(...)):
    payload = await file.read()
    rows, pairs = importer_service.parse_csv_bytes(payload)
    return ImportParseResponse(rows=rows, source_pairs=pairs)


@router.get("/mappings", response_model=ImportMappingsResponse)
def get_mappings(db: Session = Depends(get_db)):
    return ImportMappingsResponse(mappings=importer_service.get_saved_mappings(db))


@router.put("/mappings", response_model=ImportMappingsResponse)
def save_mappings(data: ImportMappingsUpsertRequest, db: Session = Depends(get_db)):
    importer_service.upsert_mappings(db, data.mappings)
    return ImportMappingsResponse(mappings=importer_service.get_saved_mappings(db))


@router.post("/dry-run", response_model=ImportDryRunResponse)
def dry_run(data: ImportDryRunRequest, db: Session = Depends(get_db)):
    return importer_service.dry_run(db, data.account_id, data.rows, data.mappings)


@router.post("/commit", response_model=ImportCommitResponse)
def commit_import(data: ImportCommitRequest, db: Session = Depends(get_db)):
    return importer_service.commit_import(db, data.account_id, data.rows, data.mappings)


@router.get("/backup", response_model=BackupPayloadResponse)
def backup(db: Session = Depends(get_db)):
    return BackupPayloadResponse(payload=importer_service.build_backup_payload(db))


@router.post("/restore")
def restore(data: RestoreRequest, db: Session = Depends(get_db)):
    try:
        importer_service.restore_from_payload(db, data.payload)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Restore failed: {exc}") from exc
    return {"message": "Restore complete."}


@router.post("/restore-file")
async def restore_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    payload = await file.read()
    data = json.loads(payload.decode("utf-8"))
    try:
        importer_service.restore_from_payload(db, data.get("payload", data))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Restore failed: {exc}") from exc
    return {"message": "Restore complete."}


@router.post("/nuke")
def nuke(db: Session = Depends(get_db)):
    importer_service.nuke_user_data(db)
    return {"message": "All user data nuked."}
