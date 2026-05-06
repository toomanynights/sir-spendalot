"""Add subcategory_id to transactions

Revision ID: a1b2c3d4e5f6
Revises: b4e92a7c1f08
Create Date: 2026-05-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '6f2d8a4b1c90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'transactions',
        sa.Column('subcategory_id', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'fk_transactions_subcategory_id',
        'transactions', 'categories',
        ['subcategory_id'], ['id'],
        ondelete='RESTRICT',
    )

    # Backfill: link transactions to existing child category entities where
    # there is exactly one case-insensitive name match under the same parent.
    op.execute(text("""
        UPDATE transactions t
        SET subcategory_id = c.id
        FROM categories c
        WHERE
            t.deleted_at IS NULL
            AND t.subcategory IS NOT NULL
            AND t.subcategory_id IS NULL
            AND t.category_id IS NOT NULL
            AND c.parent_id = t.category_id
            AND lower(c.name) = lower(t.subcategory)
            AND (
                SELECT count(*)
                FROM categories c2
                WHERE c2.parent_id = t.category_id
                  AND lower(c2.name) = lower(t.subcategory)
            ) = 1
    """))

    # Report orphan transactions: subcategory text present but no matching entity found.
    conn = op.get_bind()
    result = conn.execute(text("""
        SELECT t.id, t.category_id, t.subcategory
        FROM transactions t
        WHERE
            t.deleted_at IS NULL
            AND t.subcategory IS NOT NULL
            AND t.subcategory_id IS NULL
        ORDER BY t.id
        LIMIT 50
    """))
    rows = result.fetchall()
    if rows:
        print(f"\n[9.9 migration] {len(rows)} transaction(s) have subcategory text but no matching subcategory entity (subcategory_id left NULL):")
        for r in rows:
            print(f"  tx.id={r[0]}  category_id={r[1]}  subcategory={r[2]!r}")
        if len(rows) == 50:
            total = conn.execute(text("""
                SELECT count(*) FROM transactions
                WHERE deleted_at IS NULL AND subcategory IS NOT NULL AND subcategory_id IS NULL
            """)).scalar()
            print(f"  ... and {total - 50} more (showing first 50 only)")
    else:
        print("\n[9.9 migration] All subcategory strings successfully linked to subcategory entities.")


def downgrade() -> None:
    op.drop_constraint('fk_transactions_subcategory_id', 'transactions', type_='foreignkey')
    op.drop_column('transactions', 'subcategory_id')
