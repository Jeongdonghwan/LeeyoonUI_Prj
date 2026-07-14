# 북두칠성 외부 연동 API

외부 파트너 사이트가 북두칠성 캠페인을 프로그램으로 등록·조회하는 REST API입니다.

- **Base URL**: `https://thundersui.com/api/ext`
- **인증**: 모든 요청 헤더에 발급받은 API 키를 담습니다.
  ```
  X-API-Key: bdc_live_xxxxxxxxxxxxxxxx...
  ```
- **소유 귀속**: API 키 하나는 하나의 계정에 묶입니다. 이 키로 등록한 캠페인은 모두 해당 계정 소유가 됩니다.
- **인코딩**: 요청/응답 모두 `application/json; charset=utf-8`.
- **키 발급**: 관리자에게 요청하세요. 키 원문은 발급 시 1회만 확인 가능하며, 유출 시 폐기 후 재발급합니다. **키는 서버에만 보관하고 브라우저/클라이언트에 노출하지 마세요.**

## 상품 코드 (product_type)

| 코드 | 상품 | 양식 |
|------|------|------|
| `bdc1` | 북두칠성1 | A형 (일타수 × 구동일수) |
| `bdc3` | 북두칠성3 | A형 (일타수 × 구동일수) |
| `bdc2` | 북두칠성2 | B형 (일자별 작업량) |
| `bdcnav` | 북두칠성 길찾기 | B형 (일자별 작업량) |

## 응답 형식

성공:
```json
{ "success": true, "data": { ... }, "message": "..." }
```
실패:
```json
{ "error": "CODE", "message": "사유" }
```

| HTTP | error | 의미 |
|------|-------|------|
| 401 | UNAUTHORIZED | API 키 누락/오류/폐기됨 |
| 400 | VALIDATION_ERROR | 필수값 누락·형식 오류·잘못된 상품 코드 |
| 404 | NOT_FOUND | 캠페인 없음(또는 내 계정 소유 아님) |
| 500 | INTERNAL_ERROR | 서버 오류 |

---

## 1. 캠페인 등록 — `POST /api/ext/campaigns`

등록된 캠페인은 **대기(pending)** 상태로 들어가며, 관리자 승인 후 **정상(active)** 으로 구동됩니다.

### 공통 필드
| 필드 | 필수 | 설명 |
|------|------|------|
| `product_type` | ✅ | 상품 코드 (위 표) |
| `place_name` | △ | 플레이스 업체명 (업체명/메인키워드 중 하나 이상 필수) |
| `keyword_main` | △ | 메인키워드 (자음·모음만 입력 시 거절) |
| `place_url` | | 모바일 플레이스 URL — 주면 `m.place.naver.com` 을 포함해야 함 |
| `memo` | | 메모 |

### A형 (bdc1 / bdc3) 추가 필드
| 필드 | 설명 |
|------|------|
| `start_date` | 구동 시작일 `YYYY-MM-DD` |
| `daily_ta` | 일타수 (숫자) |
| `run_days` | 구동일수 (숫자) — `end_date` 미지정 시 `start_date + run_days` 로 자동 계산 |

`총타수(total_ta)` = `daily_ta × run_days` (서버 자동 계산)

```bash
curl -X POST https://thundersui.com/api/ext/campaigns \
  -H "X-API-Key: bdc_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "product_type": "bdc1",
    "place_name": "OO치과",
    "keyword_main": "강남치과",
    "place_url": "https://m.place.naver.com/place/1234567",
    "start_date": "2026-07-20",
    "daily_ta": 100,
    "run_days": 7
  }'
```

### B형 (bdc2 / bdcnav) 추가 필드
| 필드 | 설명 |
|------|------|
| `intake_date` | 접수일 `YYYY-MM-DD` |
| `start_date` | 시작일 `YYYY-MM-DD` |
| `end_date` | 만료일 `YYYY-MM-DD` |
| `days` | 일자별 작업량 배열 `[{"day_no":1,"ta":100}, ...]` — 일수 제한 없음(7일 이상 가능) |

`총작업량(total_ta)` = `days[].ta` 합계 (서버 자동 계산)

```bash
curl -X POST https://thundersui.com/api/ext/campaigns \
  -H "X-API-Key: bdc_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "product_type": "bdc2",
    "place_name": "OO카페",
    "keyword_main": "홍대카페",
    "place_url": "https://m.place.naver.com/place/7654321",
    "intake_date": "2026-07-19",
    "start_date": "2026-07-20",
    "end_date": "2026-07-26",
    "days": [
      {"day_no": 1, "ta": 100},
      {"day_no": 2, "ta": 100},
      {"day_no": 3, "ta": 150},
      {"day_no": 4, "ta": 150},
      {"day_no": 5, "ta": 200},
      {"day_no": 6, "ta": 200},
      {"day_no": 7, "ta": 100}
    ]
  }'
```

성공 응답:
```json
{ "success": true, "data": { "id": 123, "status": "pending" },
  "message": "캠페인이 등록되었습니다. 관리자 승인 후 구동됩니다." }
```

---

## 2. 캠페인 목록 조회 — `GET /api/ext/campaigns`

내 계정 소유 캠페인만 반환합니다.

쿼리 파라미터(선택): `status`(pending|active|expired|error), `product_type`, `page`(기본 1), `per_page`(기본 20, 최대 100).

```bash
curl "https://thundersui.com/api/ext/campaigns?status=active&per_page=50" \
  -H "X-API-Key: bdc_live_xxxxx"
```
```json
{ "success": true,
  "data": { "campaigns": [ { "id": 123, "product_type": "bdc1", "status": "active",
                             "place_name": "OO치과", "keyword_main": "강남치과",
                             "start_date": "2026-07-20", "end_date": "2026-07-27",
                             "total_ta": 700 } ],
            "total": 1, "page": 1, "per_page": 50 },
  "message": "캠페인 목록 조회 성공" }
```

---

## 3. 캠페인 단건 조회 — `GET /api/ext/campaigns/{id}`

상태 확인용. 내 계정 소유가 아니면 `404`. B형은 `days` 배열이 포함됩니다.

```bash
curl "https://thundersui.com/api/ext/campaigns/123" \
  -H "X-API-Key: bdc_live_xxxxx"
```
```json
{ "success": true,
  "data": { "id": 123, "status": "pending", "product_type": "bdc2",
            "place_name": "OO카페", "total_ta": 1000,
            "days": [ {"day_no": 1, "ta": 100}, ... ] },
  "message": "캠페인 조회 성공" }
```

**상태 값**: `pending`(대기) · `active`(정상) · `expired`(종료) · `error`(오류)
