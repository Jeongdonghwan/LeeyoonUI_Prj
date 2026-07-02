# CLAUDE.md — 리워드 리포트 어드민 시스템

이 파일을 항상 먼저 읽고 모든 작업에 적용할 것.
코드를 생성하거나 수정하기 전에 이 문서의 모든 규칙을 따를 것.

---

## 프로젝트 개요

슬롯 기반 마케팅 작업 관리 어드민 시스템.
관리자 → 총판관리자 → 일반 유저 3계층 구조로 슬롯 등록/관리/로그를 다룬다.

---

## 기술 스택

### Backend
- Python 3.11+
- Flask + Flask-JWT-Extended + flask-cors
- PyMySQL (MariaDB 연결)
- openpyxl (Excel 파싱/생성)
- bcrypt (패스워드 해싱)

### Frontend
- React 18 + Vite + TypeScript
- React Router v6
- Zustand (전역 상태 - auth, user)
- Axios (HTTP 클라이언트, interceptor로 JWT 자동 첨부)
- react-hot-toast (알림)
- date-fns (날짜 처리)

### DB
- MariaDB 10.6+
- DB명: `reward_db`
- 포트: 3306

---

## 디렉토리 구조

```
project/
├── CLAUDE.md
├── backend/
│   ├── app.py                  # Flask 앱 진입점
│   ├── config.py               # DB, JWT 설정
│   ├── init.sql                # DB 초기화 SQL
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── slot.py
│   │   └── log.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py             # 로그인/로그아웃/갱신
│   │   ├── users.py            # 계정 CRUD
│   │   ├── slots.py            # 슬롯 CRUD + Excel
│   │   └── logs.py             # 로그 조회
│   └── utils/
│       ├── __init__.py
│       ├── jwt_utils.py        # 권한 데코레이터
│       ├── excel_utils.py      # Excel 파싱/템플릿 생성
│       └── db.py               # DB 연결 헬퍼
└── frontend/
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx             # 라우팅
        ├── api/
        │   ├── axios.ts        # Axios 인스턴스 + interceptor
        │   ├── auth.ts
        │   ├── users.ts
        │   ├── slots.ts
        │   └── logs.ts
        ├── store/
        │   └── authStore.ts    # Zustand - 로그인 상태
        ├── types/
        │   └── index.ts        # 공통 타입 정의
        ├── hooks/
        │   └── usePermission.ts  # 권한 체크 훅
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.tsx
        │   │   └── Layout.tsx
        │   └── common/
        │       ├── Table.tsx
        │       ├── Modal.tsx
        │       ├── Pagination.tsx
        │       ├── SearchBar.tsx
        │       └── StatusBadge.tsx
        └── pages/
            ├── Login.tsx
            ├── Notice.tsx
            ├── AccountManage.tsx
            ├── SlotManage.tsx
            ├── SlotView.tsx
            └── LogManage.tsx
```

---

## DB 스키마

```sql
-- init.sql

CREATE DATABASE IF NOT EXISTS reward_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE reward_db;

CREATE TABLE users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role         ENUM('admin', 'distributor', 'user') NOT NULL DEFAULT 'user',
  parent_id    INT NULL,
  company      VARCHAR(100) NULL,
  memo         TEXT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE slots (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  status          ENUM('active', 'expired', 'pending') NOT NULL DEFAULT 'pending',
  created_by      INT NOT NULL,
  keyword_main    VARCHAR(255) NOT NULL,
  keyword_compare VARCHAR(255) NULL,
  product_url     TEXT NULL,
  compare_url     TEXT NULL,
  single_mid      VARCHAR(100) NULL,
  compare_mid     VARCHAR(100) NULL,
  start_date      DATE NULL,
  end_date        DATE NULL,
  quantity        INT NOT NULL DEFAULT 1,
  memo            TEXT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE slot_logs (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  type           ENUM('등록', '수정', '삭제') NOT NULL,
  user_id        INT NOT NULL,
  quantity       INT NOT NULL,
  period_days    INT NOT NULL DEFAULT 0,
  daily_total    INT NOT NULL DEFAULT 0,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  job_start_date DATE NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 기본 admin 계정 (비밀번호: admin1234)
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2b$12$PLACEHOLDER_HASH', 'admin');
```

---

## API 라우트 명세

### 인증 (`/api/auth`)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| POST | `/login` | 로그인, access+refresh 토큰 반환 | 없음 |
| POST | `/refresh` | access token 갱신 | refresh token |
| POST | `/logout` | 로그아웃 | 로그인 |

### 계정 관리 (`/api/users`)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/` | 계정 목록 (권한별 필터) | admin/distributor |
| POST | `/` | 계정 생성 | admin/distributor |
| PUT | `/:id` | 계정 수정 | admin/distributor |
| DELETE | `/:id` | 계정 삭제 | admin/distributor |
| POST | `/:id/add-slot` | 슬롯 수량 추가 | admin/distributor |

### 슬롯 관리 (`/api/slots`)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/` | 슬롯 목록 (권한별 필터, 페이지네이션) | 전체 |
| POST | `/` | 슬롯 단건 생성 | admin/distributor |
| PUT | `/:id` | 슬롯 수정 | admin/distributor/user |
| PUT | `/bulk` | 슬롯 일괄 수정 (연장 등) | admin/distributor |
| DELETE | `/:id` | 슬롯 삭제 | admin/distributor |
| POST | `/excel-upload` | Excel 업로드로 슬롯 등록 | admin/distributor/user |
| GET | `/excel-template` | Excel 양식 다운로드 | 전체 |
| GET | `/excel-export` | 현재 슬롯 목록 Excel 다운로드 | 전체 |

### 로그 (`/api/logs`)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/` | 로그 목록 (페이지네이션, 유저 필터) | admin/distributor |
| GET | `/stats` | 수량합계/일수합계 통계 | admin/distributor |

---

## 권한 규칙

```python
# 권한 계층
ROLE_HIERARCHY = {
    'admin': 3,
    'distributor': 2,
    'user': 1
}

# admin: 모든 데이터 접근 가능
# distributor: parent_id = 자신인 user들 데이터만 접근
# user: 자신의 슬롯만 접근, 로그 접근 불가
```

**계정 생성 규칙**
- admin → distributor, user 생성 가능
- distributor → user만 생성 가능 (자기 하위로)
- user → 생성 불가

**슬롯 조회 규칙**
- admin → 전체
- distributor → 자신이 생성했거나, 자기 하위 user의 슬롯
- user → 자신의 슬롯만

---

## 디자인 시스템

### 컬러 팔레트
```css
/* 메인 */
--color-primary: #8B1A2E;        /* 사이드바, 주요 버튼 */
--color-primary-hover: #A01F35;  /* 버튼 hover */
--color-primary-light: #F5E6E9;  /* 선택된 메뉴 배경 */

/* 테이블 */
--color-table-header: #1a2744;   /* 테이블 헤더 배경 */
--color-table-header-text: #ffffff;
--color-table-row-hover: #f8f9fa;
--color-table-border: #e5e7eb;

/* 상태 배지 */
--color-status-active: #16a34a;     /* 활성 */
--color-status-expired: #dc2626;    /* 만료 */
--color-status-pending: #d97706;    /* 대기 */

/* 기본 */
--color-bg: #f3f4f6;
--color-sidebar-bg: #6B0F1F;       /* 사이드바 배경 (더 진한 레드) */
--color-sidebar-text: #f9d5db;
--color-sidebar-active-bg: rgba(255,255,255,0.15);
--color-white: #ffffff;
--color-text-primary: #111827;
--color-text-secondary: #6b7280;
--color-border: #e5e7eb;
```

### 사이드바 구조
```
리워드 리포트          ← 로고 (상단, X 닫기 버튼)
──────────────
🔔 공지사항
👤 계정관리            ← admin/distributor만 표시
□  슬롯 확인
📋 로그관리            ← admin/distributor만 표시
👤 마이페이지
──────────────
로그아웃              ← 하단
```

**사이드바 스타일**
- 너비: 180px
- 배경: `#6B0F1F` (다크 레드)
- 텍스트: `#f9d5db`
- 활성 메뉴: 왼쪽에 3px 화이트 보더 + 배경 `rgba(255,255,255,0.15)`
- 폰트: 14px, 아이콘 + 텍스트 나란히

### 레이아웃
```
┌─────────────────────────────────────────┐
│  Sidebar (180px)  │  Main Content Area  │
│                   │  ┌───────────────┐  │
│  [메뉴들]         │  │  페이지 제목  │  │
│                   │  │  툴바/검색    │  │
│                   │  │  테이블       │  │
│                   │  │  페이지네이션 │  │
│                   │  └───────────────┘  │
└─────────────────────────────────────────┘
```

### 공통 컴포넌트 스타일

**테이블**
```css
/* 헤더 */
thead th {
  background: #1a2744;
  color: white;
  font-size: 13px;
  font-weight: 500;
  padding: 12px 16px;
}
/* 행 */
tbody td {
  padding: 10px 16px;
  font-size: 13px;
  border-bottom: 1px solid #e5e7eb;
}
tbody tr:hover { background: #f8f9fa; }
```

**버튼**
```css
/* Primary (메인 액션) */
.btn-primary {
  background: #8B1A2E;
  color: white;
  border-radius: 6px;
  padding: 7px 16px;
  font-size: 13px;
}
.btn-primary:hover { background: #A01F35; }

/* Secondary */
.btn-secondary {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
  border-radius: 6px;
  padding: 7px 16px;
  font-size: 13px;
}

/* 소형 버튼 (테이블 내) */
.btn-sm { padding: 4px 10px; font-size: 12px; }
```

**모달**
```css
.modal-overlay {
  background: rgba(0,0,0,0.5);
  position: fixed; inset: 0;
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: white;
  border-radius: 12px;
  padding: 28px;
  min-width: 420px;
  max-width: 560px;
}
.modal-header {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 20px;
}
```

**폼 인풋**
```css
input, select, textarea {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
}
input:focus { border-color: #8B1A2E; outline: none; }
label { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
.required::after { content: ' *'; color: #dc2626; }
```

**상태 배지**
```css
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 500;
}
.badge-active  { background: #dcfce7; color: #166534; }
.badge-expired { background: #fee2e2; color: #991b1b; }
.badge-pending { background: #fef3c7; color: #92400e; }
```

---

## 페이지별 상세 명세

### 1. 로그인 페이지 (`/login`)
- 중앙 정렬 카드 레이아웃
- 로고 "리워드 리포트" 상단
- 아이디 / 비밀번호 인풋
- 로그인 버튼 (primary, full width)
- JWT 저장: access token → 메모리(Zustand), refresh token → httpOnly cookie

### 2. 계정관리 (`/accounts`) — admin/distributor만 접근
**테이블 컬럼**: 체크박스 | 아이디 | 상위아이디 | 비밀번호 | 권한 | 회사 | 수량 | 슬롯추가 | 메모 | 수정

**기능**
- 상단 검색: 아이디 검색
- 상단 우측: [추가] [삭제] 버튼
- 슬롯추가 버튼: 해당 유저에 슬롯 수량 직접 추가
- 수정(연필 아이콘): 인라인 수정 or 모달
- 50개씩 보기 (페이지당)

**사용자 추가 모달 필드**
- 아이디 (필수)
- 비밀번호 (필수)
- 권한: 드롭다운 (admin은 distributor/user 선택 가능, distributor는 user만)
- 회사명
- 메모

### 3. 슬롯 확인 (`/slots`) — 전체 접근, 권한별 필터
**테이블 컬럼**: 체크박스 | 슬롯번호 | 상태 | 생성자 | 아이디 | 가격비교순위 | 남은일수 | 시작일 | 수정 | 종료일 | 메인키워드 | 단일MID | 가격비교MID | 상품URL | 가격비교URL | 메모

**상단 툴바 (좌)**
- [○ 연장] [✏ 수정] [□ 일괄수정] [↺ 현황]
- 슬롯번호 드롭다운 + 검색 인풋 + [검색] 버튼

**상단 툴바 (우)**
- 정렬 드롭다운 (등록순/날짜순 등)
- [↓ 내림차순] 토글
- [엑셀 가이드] [엑셀 다운로드] 버튼

**하단**: 페이지네이션 + 페이지당 표시수 (20/50/100)

### 4. 슬롯 등록 화면 (`/slots/register`) — 유저 접근
**상단**
- 엑셀업로드: [파일선택] 버튼 + 선택된 파일명
- [엑셀양식다운로드] [리스트다운로드] 버튼

**공지 섹션**
- "세팅 관련 공지" 텍스트
- 필수 입력 항목 안내

**슬롯 목록 테이블**
컬럼: 전체선택 | 번호 | 아이디 | 묶음MID | 단품MID* | 검색어* | 메인검색어* | 작업방식 | 상품ID* | 검색결과 | 메모 | 시작일 | 종료일

**일괄수정 버튼**: 우상단

### 5. 로그관리 (`/logs`) — admin/distributor만 접근
**상단 통계 카드 3개**
- 전체 (전체 로그 개수)
- 수량 합계 (구동중인 슬롯 수량 합계)
- 일수 합계 (구동중인 일수 합계)

**검색**: 유저 아이디 검색

**테이블 컬럼**: 번호 | 구분(등록/수정/삭제 배지) | 사용자ID | 수량 | 기간 | 일수합계 | 생성일시 | 작업시작일

---

## Excel 업로드 처리 로직

```python
# excel_utils.py 에 구현

REQUIRED_COLUMNS = ['단품MID', '검색어', '메인검색어', '상품ID']

def parse_slot_excel(file_bytes, user_id):
    """
    1. openpyxl로 파일 읽기
    2. 헤더 행 찾기 (1번째 행)
    3. 필수 컬럼 존재 여부 체크
    4. 각 행을 dict로 변환
    5. 유효성 검사 (필수 필드 누락 체크)
    6. slots 테이블에 INSERT
    7. slot_logs에 '등록' 로그 기록
    8. 결과 반환 (성공 건수, 실패 건수, 실패 상세)
    """

def generate_slot_template():
    """
    엑셀 양식 파일 생성
    컬럼: 번호, 아이디, 묶음MID, 단품MID*, 검색어*, 메인검색어*, 작업방식, 상품ID*, 메모, 시작일, 종료일
    첫 번째 행: 컬럼 헤더 (필수 항목은 빨간색 표시)
    두 번째 행: 예시 데이터
    """
```

---

## JWT 처리

```python
# jwt_utils.py

from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from flask import jsonify

def require_roles(*roles):
    """권한 체크 데코레이터"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            current_user = get_jwt_identity()
            if current_user['role'] not in roles:
                return jsonify({'error': '권한이 없습니다'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

# 사용 예시
@slots_bp.route('/', methods=['GET'])
@require_roles('admin', 'distributor', 'user')
def get_slots():
    ...
```

```typescript
// axios.ts - interceptor

axiosInstance.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  res => res,
  async error => {
    if (error.response?.status === 401) {
      // refresh token으로 재발급 시도
      // 실패 시 로그인 페이지로 리다이렉트
    }
    return Promise.reject(error);
  }
);
```

---

## 코딩 규칙

### 공통
- 모든 API 응답은 `{ data, message, success }` 형태로 통일
- 에러 응답: `{ error, message }` + 적절한 HTTP 상태코드
- 날짜 형식: `YYYY-MM-DD` (date-fns 사용)
- 페이지네이션: `?page=1&per_page=20` 쿼리 파라미터

### Backend
- 모든 DB 쿼리는 PyMySQL cursor 사용, SQL Injection 방지를 위해 파라미터 바인딩 필수
- 비밀번호는 bcrypt로 해싱
- 에러는 try/except로 처리, 구체적인 에러 메시지 반환

### Frontend
- 컴포넌트는 함수형 + TypeScript 타입 명시
- API 호출은 `src/api/` 폴더에서만
- 로딩 상태, 에러 상태 항상 처리
- 성공/실패 알림은 react-hot-toast 사용

---

## 작업 우선순위

Phase 1 (기반)
- [ ] init.sql 및 DB 세팅
- [ ] Flask 앱 기본 구조 + config
- [ ] 인증 API (login/refresh/logout)
- [ ] JWT 미들웨어

Phase 2 (계정관리)
- [ ] users API (CRUD)
- [ ] React 앱 기본 세팅 + Router
- [ ] Sidebar + Layout 컴포넌트
- [ ] 로그인 페이지
- [ ] 계정관리 페이지

Phase 3 (슬롯)
- [ ] slots API (CRUD + Excel)
- [ ] 슬롯 확인 페이지
- [ ] 슬롯 등록 페이지 (Excel 업로드)

Phase 4 (로그 + 마무리)
- [ ] logs API
- [ ] 로그관리 페이지
- [ ] 공지사항 페이지
- [ ] 권한별 메뉴 제어 최종 점검
