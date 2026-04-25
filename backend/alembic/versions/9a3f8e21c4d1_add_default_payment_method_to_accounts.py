"""Add default payment method to accounts.

Revision ID: 9a3f8e21c4d1
Revises: e3a1c4b9d2f0
Create Date: 2026-04-26 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9a3f8e21c4d1"
down_revision: Union[str, None] = "e3a1c4b9d2f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "accounts",
        sa.Column("default_payment_method_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_accounts_default_payment_method_id",
        "accounts",
        "payment_methods",
        ["default_payment_method_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_accounts_default_payment_method_id",
        "accounts",
        ["default_payment_method_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_accounts_default_payment_method_id", table_name="accounts")
    op.drop_constraint(
        "fk_accounts_default_payment_method_id", "accounts", type_="foreignkey"
    )
    op.drop_column("accounts", "default_payment_method_id")
