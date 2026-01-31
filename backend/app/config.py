"""Application configuration using pydantic-settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "TeleVault"
    debug: bool = False
    
    # Database
    database_url: str
    
    # JWT Authentication
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Telegram Configuration
    telegram_bot_tokens: str  # Will be split into list
    telegram_chunk_size: int = 20 * 1024 * 1024  # 20MB default
    
    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173"  # Will be split into list
    
    @property
    def telegram_bot_tokens_list(self) -> List[str]:
        """Get telegram bot tokens as a list."""
        return [token.strip() for token in self.telegram_bot_tokens.split(',')]
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list."""
        return [origin.strip() for origin in self.cors_origins.split(',')]
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
