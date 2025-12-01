import os
import sys
from pathlib import Path
from types import SimpleNamespace

supabase_stub = SimpleNamespace(
    create_client=lambda _url, _key: SimpleNamespace(),
    Client=SimpleNamespace,
)
sys.modules.setdefault("supabase", supabase_stub)

ROOT_DIR = Path(__file__).resolve().parents[3]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

os.environ.setdefault("SUPABASE_URL", "http://test.local")
os.environ.setdefault("SUPABASE_SERVICE_ROLE", "test-key")
os.environ.setdefault("JWT_SECRET", "secret")
