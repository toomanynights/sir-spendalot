from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    ENVIRONMENT: str = "development"
    SECRET_KEY: str
    ALLOWED_ORIGINS: list[str] = ["https://sir-spendalot.tmn.name"]

    # Auth — single-user self-hosted. Change both values in .env before first use.
    AUTH_USERNAME: str = "admin"
    AUTH_PASSWORD: str = "changeme"
    # Token lifetime in minutes (default: 7 days — convenient for self-hosted)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    # Web Push (VAPID). Generate with: python -c "from pywebpush import Vapid; v=Vapid(); v.generate_keys(); print('Private:', v.private_key); print('Public:', v.public_key)"
    # Or use: npx web-push generate-vapid-keys
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_PUBLIC_KEY: Optional[str] = None
    # Must be mailto: or https: URL identifying the push service operator
    VAPID_SUBJECT: str = "mailto:admin@example.com"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
