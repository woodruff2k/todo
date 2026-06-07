"""SQLite 기반 데이터 접근 계층.

모든 DB 작업은 컨텍스트 매니저로 커넥션을 관리하며,
호출부에서 다룰 수 있도록 sqlite3 예외를 그대로 전파한다.
"""

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

# DB 파일 경로 (이 모듈 기준 같은 디렉토리에 생성)
DB_PATH = Path(__file__).resolve().parent / "todo.db"


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    """커넥션을 열고, 정상 종료 시 커밋, 예외 발생 시 롤백 후 항상 닫는다."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # 컬럼명으로 접근 가능하도록
    try:
        yield conn
        conn.commit()
    except sqlite3.Error:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """앱 시작 시 테이블이 없으면 생성한다."""
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS todos (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                title      TEXT    NOT NULL,
                completed  INTEGER NOT NULL DEFAULT 0,
                created_at TEXT    NOT NULL DEFAULT (datetime('now'))
            )
            """
        )


def _row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "completed": bool(row["completed"]),
        "created_at": row["created_at"],
    }


def list_todos() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, title, completed, created_at FROM todos ORDER BY id DESC"
        ).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_todo(todo_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, title, completed, created_at FROM todos WHERE id = ?",
            (todo_id,),
        ).fetchone()
    return _row_to_dict(row) if row else None


def create_todo(title: str) -> dict:
    with get_connection() as conn:
        cursor = conn.execute("INSERT INTO todos (title) VALUES (?)", (title,))
        new_id = cursor.lastrowid
        row = conn.execute(
            "SELECT id, title, completed, created_at FROM todos WHERE id = ?",
            (new_id,),
        ).fetchone()
    return _row_to_dict(row)


def update_todo(
    todo_id: int,
    title: str | None = None,
    completed: bool | None = None,
) -> dict | None:
    """제목/완료여부를 부분 업데이트한다. 대상이 없으면 None."""
    fields: list[str] = []
    params: list = []
    if title is not None:
        fields.append("title = ?")
        params.append(title)
    if completed is not None:
        fields.append("completed = ?")
        params.append(1 if completed else 0)

    if not fields:
        # 변경할 내용이 없으면 현재 상태를 그대로 반환
        return get_todo(todo_id)

    params.append(todo_id)
    with get_connection() as conn:
        cursor = conn.execute(
            f"UPDATE todos SET {', '.join(fields)} WHERE id = ?", params
        )
        if cursor.rowcount == 0:
            return None
        row = conn.execute(
            "SELECT id, title, completed, created_at FROM todos WHERE id = ?",
            (todo_id,),
        ).fetchone()
    return _row_to_dict(row)


def delete_todo(todo_id: int) -> bool:
    """삭제 성공 시 True, 대상이 없으면 False."""
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
        return cursor.rowcount > 0
