# 📝 TODO 앱

FastAPI + SQLite로 만든 간단한 할 일 관리 웹 앱입니다.
데이터는 로컬 `todo.db`(SQLite) 파일에 저장됩니다.

## 기능

- 할 일 추가 / 완료 토글 / 삭제
- 전체 / 진행중 / 완료 필터
- 남은 할 일 개수 표시
- 로컬 SQLite 파일에 영구 저장

## 구조

```
todo/
├── main.py            # FastAPI 진입점 (API + 정적 파일 서빙)
├── database.py        # SQLite 데이터 접근 계층
├── requirements.txt
└── static/
    ├── index.html
    ├── style.css
    └── app.js
```

## 실행 방법

```bash
# 1. 가상환경 생성 및 활성화 (권장)
python3 -m venv .venv
source .venv/bin/activate

# 2. 의존성 설치
pip install -r requirements.txt

# 3. 서버 실행
uvicorn main:app --reload

# 4. 브라우저에서 접속
# http://127.0.0.1:8000
```

## API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET    | `/api/todos`        | 전체 할 일 조회 |
| POST   | `/api/todos`        | 할 일 추가 `{ "title": "..." }` |
| PATCH  | `/api/todos/{id}`   | 수정 `{ "title"?, "completed"? }` |
| DELETE | `/api/todos/{id}`   | 삭제 |

대화형 API 문서: 서버 실행 후 http://127.0.0.1:8000/docs
