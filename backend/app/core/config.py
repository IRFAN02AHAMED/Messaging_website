import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    app_name = os.getenv("APP_NAME")
    app_version = os.getenv("APP_VERSION")
    debug = os.getenv("DEBUG", "false").lower() == "true"

    database_url = os.getenv("DATABASE_URL")
    secret_key = os.getenv("SECRET_KEY", "a_very_secure_secret_key_change_me_in_production")



settings = Settings()


def get_settings():
    return settings