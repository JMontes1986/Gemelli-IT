import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from apps.api.app import main


class DummyTable:
    def __init__(self, data):
        self._data = data

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def single(self):
        return self

    def execute(self):
        return SimpleNamespace(data=self._data)


class DummySupabase:
    def __init__(self, user_id: str, user_data: dict):
        self._user_data = user_data
        self.auth = SimpleNamespace(get_user=lambda _token: SimpleNamespace(user=SimpleNamespace(id=user_id)))

    def table(self, name: str):
        assert name == "users"
        return DummyTable(self._user_data)

    def __getattr__(self, item):
        raise AttributeError(item)


def setup_supabase(monkeypatch, user_data):
    dummy = DummySupabase(user_id=user_data["id"], user_data=user_data)
    monkeypatch.setattr(main, "supabase", dummy)


def test_get_current_user_normalizes_role(monkeypatch):
    user_data = {
        "id": "user-123",
        "nombre": "Test User",
        "email": "user@example.com",
        "rol": "director",
        "org_unit_id": "org-1",
        "org_units": {"nombre": "Org Uno"},
    }
    setup_supabase(monkeypatch, user_data)
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token")

    user = asyncio.run(main.get_current_user(credentials))

    assert user.rol == "DIRECTOR"


def test_get_current_user_invalid_role(monkeypatch):
    user_data = {
        "id": "user-456",
        "nombre": "Test User",
        "email": "user@example.com",
        "rol": "guest",
        "org_unit_id": "org-1",
        "org_units": {"nombre": "Org Uno"},
    }
    setup_supabase(monkeypatch, user_data)
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(main.get_current_user(credentials))

    assert exc.value.status_code == 422
    assert "Rol en Supabase inválido" in exc.value.detail
