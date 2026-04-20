import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

_client: Client | None = None


def get_supabase() -> Client:
    """Get singleton Supabase client instance."""
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env"
            )
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client
