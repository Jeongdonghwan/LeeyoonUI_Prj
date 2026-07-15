# 북두칠성 캠페인 등록 API 가이드 드립니다.

- Base URL: `https://thundersui.com/api/ext`
- 인증: 헤더에 `X-API-Key: 발급받은키`
- 요청/응답은 JSON (UTF-8)
- API로 등록하면 '대기' 상태로 들어가고, 관리자 승인 후 구동됩니다.


## 상품 코드
- `bdc1` 북두칠성1, `bdc3` 북두칠성3 → 일타수 × 구동일수
- `bdc2` 북두칠성2, `bdcnav` 길찾기 → 일자별 작업량

## 캠페인 등록
`POST /api/ext/campaigns`

공통 필드
- `product_type` (필수)
- `place_name`, `keyword_main` 중 하나 이상 필수
- `place_url` (선택, 넣으면 m.place.naver.com 포함)
- `memo` (선택)

bdc1 / bdc3 추가 필드
- `start_date` (YYYY-MM-DD)
- `daily_ta` 일타수
- `run_days` 구동일수
- 총타수와 종료일은 자동 계산됩니다.

bdc2 / bdcnav 추가 필드
- `intake_date`, `start_date`, `end_date` (YYYY-MM-DD)
- `days`: 일자별 작업량 `[{ "day_no": 1, "ta": 100 }, ...]` (7일 이상 가능)
- 총작업량은 days 합계로 자동 계산됩니다.

성공 시 응답
```json
{ "success": true, "data": { "id": 123, "status": "pending" } }
```

## 조회
- 목록: `GET /api/ext/campaigns` (파라미터: status, product_type, page, per_page)
- 단건: `GET /api/ext/campaigns/{id}`
- 상태 값: pending(대기), active(정상), expired(종료)

## 에러
```json
{ "error": "코드", "message": "사유" }
```
- 401 키 오류/폐기
- 400 필수값 누락·형식 오류·잘못된 상품 코드
- 404 없음

## 예시

bdc1
```bash
curl -X POST https://thundersui.com/api/ext/campaigns \
  -H "X-API-Key: 발급받은키" \
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

bdcnav
```bash
curl -X POST https://thundersui.com/api/ext/campaigns \
  -H "X-API-Key: 발급받은키" \
  -H "Content-Type: application/json" \
  -d '{
    "product_type": "bdcnav",
    "place_name": "OO카페",
    "keyword_main": "홍대카페",
    "place_url": "https://m.place.naver.com/place/7654321",
    "intake_date": "2026-07-19",
    "start_date": "2026-07-20",
    "end_date": "2026-07-26",
    "days": [
      { "day_no": 1, "ta": 100 },
      { "day_no": 2, "ta": 100 },
      { "day_no": 3, "ta": 150 },
      { "day_no": 4, "ta": 150 },
      { "day_no": 5, "ta": 200 },
      { "day_no": 6, "ta": 200 },
      { "day_no": 7, "ta": 100 }
    ]
  }'
```
