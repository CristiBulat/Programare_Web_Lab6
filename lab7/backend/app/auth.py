from __future__ import annotations

from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

JWT_SECRET = "reel-lab7-demo-secret-change-me"
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_SECONDS = 300


class Role(str, Enum):
    ADMIN = "ADMIN"
    WRITER = "WRITER"
    VISITOR = "VISITOR"


class Permission(str, Enum):
    READ = "READ"
    WRITE = "WRITE"
    DELETE = "DELETE"


ROLE_PERMISSIONS: dict[Role, list[Permission]] = {
    Role.ADMIN: [Permission.READ, Permission.WRITE, Permission.DELETE],
    Role.WRITER: [Permission.READ, Permission.WRITE],
    Role.VISITOR: [Permission.READ],
}


class TokenRequest(BaseModel):
    role: Role = Role.VISITOR


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: Role
    permissions: list[Permission]


class TokenPayload(BaseModel):
    sub: str
    role: Role
    permissions: list[Permission]
    exp: int


bearer_scheme = HTTPBearer(
    bearerFormat="JWT",
    description=(
        "Paste the `access_token` returned by `POST /token`. "
        "Swagger will attach it as `Authorization: Bearer <token>` to every request."
    ),
    auto_error=True,
)


def create_access_token(role: Role) -> TokenResponse:
    permissions = ROLE_PERMISSIONS[role]
    now = datetime.now(tz=timezone.utc)
    expire = now + timedelta(seconds=JWT_EXPIRES_SECONDS)
    payload: dict[str, object] = {
        "sub": f"demo-{role.value.lower()}",
        "role": role.value,
        "permissions": [p.value for p in permissions],
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return TokenResponse(
        access_token=token,
        expires_in=JWT_EXPIRES_SECONDS,
        role=role,
        permissions=permissions,
    )


def decode_token(token: str) -> TokenPayload:
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    try:
        return TokenPayload(
            sub=str(data["sub"]),
            role=Role(data["role"]),
            permissions=[Permission(p) for p in data["permissions"]],
            exp=int(data["exp"]),
        )
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_principal(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> TokenPayload:
    return decode_token(creds.credentials)


def refresh_access_token(principal: TokenPayload) -> TokenResponse:
    """Issue a new token preserving the current principal's role."""
    return create_access_token(principal.role)


def require_permissions(*required: Permission):
    required_set = set(required)

    def dependency(principal: TokenPayload = Depends(get_current_principal)) -> TokenPayload:
        missing = required_set - set(principal.permissions)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permissions: {sorted(p.value for p in missing)}",
            )
        return principal

    return dependency


def permissions_for(roles: Iterable[Role]) -> set[Permission]:
    out: set[Permission] = set()
    for r in roles:
        out.update(ROLE_PERMISSIONS[r])
    return out
