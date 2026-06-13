"""Проверка access-токена Supabase Auth (асимметрично, ES256, по JWKS).

Секрет на бэкенде не храним: тянем публичный ключ с JWKS-эндпоинта проекта
и проверяем подпись им. PyJWKClient кэширует ключи и сам подхватывает ротацию."""

import ssl
from dataclasses import dataclass
from uuid import UUID

import certifi
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from .config import settings

_JWKS_URL = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
_ISSUER = f"{settings.SUPABASE_URL}/auth/v1"

# SSL-контекст с CA-бандлом certifi — чтобы загрузка JWKS не зависела от
# системного хранилища сертификатов (грабли python.org Python на macOS).
_ssl_ctx = ssl.create_default_context(cafile=certifi.where())

# Ленивый: сеть дёргается только при первой проверке токена, не на импорте.
_jwk_client = PyJWKClient(_JWKS_URL, cache_keys=True, ssl_context=_ssl_ctx)

_bearer = HTTPBearer(auto_error=True)


@dataclass
class CurrentUser:
    id: UUID
    email: str | None


def _decode(token: str) -> dict:
    signing_key = _jwk_client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256"],
        audience="authenticated",
        issuer=_ISSUER,
        options={"require": ["sub", "exp", "aud"]},
    )


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> CurrentUser:
    try:
        # get_signing_key_from_jwt делает сетевой запрос → уводим из event loop
        payload = await run_in_threadpool(_decode, creds.credentials)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    return CurrentUser(id=UUID(payload["sub"]), email=payload.get("email"))
