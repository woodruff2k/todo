"""TODO 웹 앱 - FastAPI 진입점.

REST API(/api/todos)와 정적 프론트엔드(/)를 함께 서빙한다.
"""

from contextlib import asynccontextmanager
from pathlib import Path

import sqlite3

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

import database

STATIC_DIR = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 기동 시 DB 초기화."""
    database.init_db()
    yield


app = FastAPI(title="TODO App", lifespan=lifespan)


# ---------- 요청/응답 스키마 ----------
class TodoCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title은 공백일 수 없습니다.")
        return v


class TodoUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    completed: bool | None = None

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("title은 공백일 수 없습니다.")
        return v


# ---------- API 엔드포인트 ----------
@app.get("/api/todos")
def api_list_todos():
    try:
        return database.list_todos()
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail="할 일 목록 조회에 실패했습니다.") from exc


@app.post("/api/todos", status_code=201)
def api_create_todo(payload: TodoCreate):
    try:
        return database.create_todo(payload.title)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail="할 일 생성에 실패했습니다.") from exc


@app.patch("/api/todos/{todo_id}")
def api_update_todo(todo_id: int, payload: TodoUpdate):
    try:
        updated = database.update_todo(
            todo_id, title=payload.title, completed=payload.completed
        )
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail="할 일 수정에 실패했습니다.") from exc
    if updated is None:
        raise HTTPException(status_code=404, detail="해당 할 일을 찾을 수 없습니다.")
    return updated


@app.delete("/api/todos/{todo_id}", status_code=204)
def api_delete_todo(todo_id: int):
    try:
        deleted = database.delete_todo(todo_id)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail="할 일 삭제에 실패했습니다.") from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="해당 할 일을 찾을 수 없습니다.")
    return None


# ---------- 프론트엔드 ----------
@app.get("/")
def index():
    index_file = STATIC_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=500, detail="프론트엔드 파일을 찾을 수 없습니다.")
    return FileResponse(index_file)


# /static 경로로 css/js 제공
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
