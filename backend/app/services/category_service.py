from fastapi import HTTPException
from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.category import CategoryCreate, CategoryReassignParentRequest, CategoryReassignRequest, CategoryRenameRequest, CategoryResponse, CategoryUpdate


def _get_or_404(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


def _build_response(category: Category, tx_counts: dict[int, int]) -> CategoryResponse:
    data = CategoryResponse.model_validate(category)
    data.tx_count = tx_counts.get(category.id, 0)
    return data


def get_categories(db: Session) -> list[CategoryResponse]:
    categories = (
        db.query(Category)
        .order_by(Category.type, Category.parent_id.nulls_first(), Category.name)
        .all()
    )
    # Single aggregation for tx_count: counts transactions linked via category_id OR subcategory_id.
    rows = db.execute(
        select(Transaction.category_id, func.count().label("n"))
        .where(Transaction.deleted_at.is_(None), Transaction.category_id.is_not(None))
        .group_by(Transaction.category_id)
    ).all()
    cat_tx_counts: dict[int, int] = {r[0]: r[1] for r in rows}

    sub_rows = db.execute(
        select(Transaction.subcategory_id, func.count().label("n"))
        .where(Transaction.deleted_at.is_(None), Transaction.subcategory_id.is_not(None))
        .group_by(Transaction.subcategory_id)
    ).all()
    sub_tx_counts: dict[int, int] = {r[0]: r[1] for r in sub_rows}

    tx_counts = {**cat_tx_counts}
    for cid, n in sub_tx_counts.items():
        tx_counts[cid] = tx_counts.get(cid, 0) + n

    return [_build_response(c, tx_counts) for c in categories]


def get_subcategory_usage_by_parent(db: Session) -> dict[str, list[str]]:
    """
    Maps top-level category id (string key for JSON) to distinct subcategory
    strings from non-deleted transactions whose category is that parent or one
    of its direct children.
    """
    categories = {c.id: c for c in db.query(Category).all()}

    def top_parent_id(category_id: int) -> int | None:
        c = categories.get(category_id)
        if not c:
            return None
        if c.parent_id is None:
            return c.id
        p = categories.get(c.parent_id)
        if not p:
            return c.parent_id
        return p.id

    rows = db.execute(
        select(Transaction.category_id, Transaction.subcategory).where(
            Transaction.category_id.is_not(None),
            Transaction.subcategory.is_not(None),
            Transaction.subcategory != "",
            Transaction.deleted_at.is_(None),
        ).distinct()
    ).all()

    buckets: dict[int, set[str]] = defaultdict(set)
    for cat_id, sub in rows:
        root = top_parent_id(int(cat_id))
        if root is None:
            continue
        s = (sub or "").strip()
        if s:
            buckets[root].add(s)
    return {str(k): sorted(v) for k, v in buckets.items()}


def get_category(db: Session, category_id: int) -> CategoryResponse:
    return CategoryResponse.model_validate(_get_or_404(db, category_id))


def rename_subcategory(db: Session, category_id: int, data: CategoryRenameRequest) -> CategoryResponse:
    category = _get_or_404(db, category_id)
    if category.parent_id is None:
        raise HTTPException(status_code=422, detail="Use PATCH to rename parent categories.")

    new_name = data.name.strip()
    # Check for sibling name collision (case-insensitive)
    conflict = (
        db.query(Category)
        .filter(
            Category.parent_id == category.parent_id,
            Category.id != category_id,
            Category.name.ilike(new_name),
        )
        .first()
    )
    if conflict:
        raise HTTPException(status_code=422, detail=f"A subcategory named '{new_name}' already serves under this category.")

    old_name = category.name
    category.name = new_name

    # Cascade: mirror new name into subcategory text on linked transactions
    db.query(Transaction).filter(Transaction.subcategory_id == category_id).update(
        {Transaction.subcategory: new_name}, synchronize_session=False
    )
    # Also update unlinked text rows that match the old name under the same parent
    db.query(Transaction).filter(
        Transaction.category_id == category.parent_id,
        Transaction.subcategory_id.is_(None),
        Transaction.subcategory == old_name,
        Transaction.deleted_at.is_(None),
    ).update({Transaction.subcategory: new_name}, synchronize_session=False)

    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)


def reassign_subcategory_transactions(
    db: Session, category_id: int, data: CategoryReassignRequest
) -> dict:
    category = _get_or_404(db, category_id)
    if category.parent_id is None:
        raise HTTPException(status_code=422, detail="Only subcategories can have transactions reassigned.")

    target_id = data.target_subcategory_id
    target_name: str | None = None
    if target_id is not None:
        target = db.get(Category, target_id)
        if not target:
            raise HTTPException(status_code=422, detail=f"Target subcategory {target_id} not found.")
        if target.parent_id != category.parent_id:
            raise HTTPException(status_code=422, detail="Target subcategory must be under the same parent category.")
        target_name = target.name

    result = db.query(Transaction).filter(
        Transaction.subcategory_id == category_id,
        Transaction.deleted_at.is_(None),
    ).update(
        {Transaction.subcategory_id: target_id, Transaction.subcategory: target_name},
        synchronize_session=False,
    )
    db.commit()
    return {"updated": result}


def reassign_parent_transactions(
    db: Session, category_id: int, data: CategoryReassignParentRequest
) -> dict:
    """Reassign category_id on transactions from a parent category to another (or None)."""
    category = _get_or_404(db, category_id)
    if category.parent_id is not None:
        raise HTTPException(status_code=422, detail="Only parent categories can have category_id transactions reassigned.")

    target_id = data.target_category_id
    if target_id is not None:
        target = db.get(Category, target_id)
        if not target:
            raise HTTPException(status_code=422, detail=f"Target category {target_id} not found.")
        if target.parent_id is not None:
            raise HTTPException(status_code=422, detail="Target must be a parent category.")

    result = db.query(Transaction).filter(
        Transaction.category_id == category_id,
        Transaction.deleted_at.is_(None),
    ).update(
        {Transaction.category_id: target_id},
        synchronize_session=False,
    )
    db.commit()
    return {"updated": result}


def create_category(db: Session, data: CategoryCreate) -> CategoryResponse:
    if data.parent_id is not None:
        parent = db.get(Category, data.parent_id)
        if not parent:
            raise HTTPException(
                status_code=422,
                detail=f"Parent category {data.parent_id} not found.",
            )
        if parent.parent_id is not None:
            raise HTTPException(
                status_code=422,
                detail="Categories support only one level of nesting. The chosen parent is itself a subcategory.",
            )

    category = Category(
        name=data.name,
        type=data.type,
        parent_id=data.parent_id,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)


def update_category(
    db: Session, category_id: int, data: CategoryUpdate
) -> CategoryResponse:
    category = _get_or_404(db, category_id)

    if data.parent_id is not None:
        if data.parent_id == category_id:
            raise HTTPException(
                status_code=422,
                detail="A category cannot be its own parent.",
            )
        parent = db.get(Category, data.parent_id)
        if not parent:
            raise HTTPException(
                status_code=422,
                detail=f"Parent category {data.parent_id} not found.",
            )
        if parent.parent_id is not None:
            raise HTTPException(
                status_code=422,
                detail="Categories support only one level of nesting. The chosen parent is itself a subcategory.",
            )
        child_count = db.scalar(
            select(func.count())
            .select_from(Category)
            .where(Category.parent_id == category_id)
        )
        if child_count:
            raise HTTPException(
                status_code=422,
                detail=f"Cannot make a parent category into a subcategory while it still has {child_count} child(ren).",
            )

    old_parent_id = category.parent_id
    new_parent_id = data.parent_id if "parent_id" in data.model_dump(exclude_unset=True) else None

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(category, key, value)

    # When a subcategory moves to a new parent, cascade category_id on linked transactions
    if (
        old_parent_id is not None
        and new_parent_id is not None
        and new_parent_id != old_parent_id
    ):
        db.query(Transaction).filter(
            Transaction.subcategory_id == category_id,
        ).update(
            {Transaction.category_id: new_parent_id},
            synchronize_session=False,
        )

    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)


def delete_category(db: Session, category_id: int) -> None:
    category = _get_or_404(db, category_id)

    child_count = db.scalar(
        select(func.count())
        .select_from(Category)
        .where(Category.parent_id == category_id)
    )
    if child_count:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot strike: this category commands {child_count} subcategorie(s). Strike them first.",
        )

    tx_count = db.scalar(
        select(func.count())
        .select_from(Transaction)
        .where(
            Transaction.category_id == category_id,
            Transaction.deleted_at.is_(None),
        )
    )
    if tx_count:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot strike: {tx_count} chronicle(s) are filed under this category. Reassign them first.",
        )

    # Check active transactions linked via subcategory_id
    sub_tx_count = db.scalar(
        select(func.count())
        .select_from(Transaction)
        .where(
            Transaction.subcategory_id == category_id,
            Transaction.deleted_at.is_(None),
        )
    )
    if sub_tx_count:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot strike: {sub_tx_count} chronicle(s) bear this subcategory. Reassign them first.",
        )

    # Clear subcategory_id on soft-deleted transactions to satisfy the RESTRICT FK
    db.query(Transaction).filter(
        Transaction.subcategory_id == category_id,
        Transaction.deleted_at.is_not(None),
    ).update({Transaction.subcategory_id: None}, synchronize_session=False)

    # Clear category_id on soft-deleted transactions for the same reason
    db.query(Transaction).filter(
        Transaction.category_id == category_id,
        Transaction.deleted_at.is_not(None),
    ).update({Transaction.category_id: None}, synchronize_session=False)

    db.delete(category)
    db.commit()
