"""Add import mappings table

Revision ID: f3c1b9a7d501
Revises: 9a3f8e21c4d1
Create Date: 2026-04-26 11:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f3c1b9a7d501"
down_revision: Union[str, None] = "9a3f8e21c4d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "import_mappings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_category", sa.String(length=120), nullable=False),
        sa.Column("source_subcategory", sa.String(length=160), nullable=False),
        sa.Column("mapping", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_category",
            "source_subcategory",
            name="uq_import_mapping_source_pair",
        ),
    )


def downgrade() -> None:
    op.drop_table("import_mappings")
