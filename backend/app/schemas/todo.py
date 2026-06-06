import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class TodoCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None

    @field_validator("title")
    @classmethod
    def trim_title(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Title cannot be empty or contain only whitespace")
        return stripped


class TodoUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    completed: bool | None = None

    @field_validator("title")
    @classmethod
    def trim_title(cls, v: str | None) -> str | None:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Title cannot be empty or contain only whitespace")
            return stripped
        return v


class TodoResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    completed: bool
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    user_email: str | None = None

    model_config = {"from_attributes": True}


class TodoListResponse(BaseModel):
    items: list[TodoResponse]
    total: int
    page: int
    size: int
