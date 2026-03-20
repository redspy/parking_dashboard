# 주차관리 시스템 대시보드 설계 계획

## 1. 목표
- 주차장 운영 상태를 한 화면에서 실시간으로 파악할 수 있는 대시보드를 구축한다.
- 입차/출차/요금/경보(이상 상황) 정보를 빠르게 확인하고 대응할 수 있게 한다.
- 초기에는 MVP 범위를 우선 구현하고, 이후 운영 자동화 기능으로 확장한다.

## 2. 사용자와 사용 시나리오
- 관리자(Admin): 전체 주차장 현황 모니터링, 요금 정책/설정 관리
- 관제 요원(Operator): 혼잡 구역 확인, 경보 처리, 수동 게이트 제어
- 정산 담당(Billing): 결제 내역 확인, 미정산 차량 추적, 매출 리포트 확인

주요 시나리오:
1. 대시보드 접속 즉시 현재 주차 가능 면수와 혼잡도 확인
2. 이상 이벤트(장기 주차, 출구 정체, 장비 오류) 발생 시 알림 확인 후 조치
3. 당일 입출차/매출 리포트를 확인해 운영 결정을 수행

## 3. MVP 기능 범위
- 실시간 KPI 카드
  - 총 주차면, 사용 중, 빈 자리, 점유율, 금일 입차/출차
- 주차 구역(Zone)별 현황
  - 구역별 사용률, 잔여 면수, 혼잡도 상태(정상/주의/혼잡)
- 차량 이벤트 피드
  - 최근 입차/출차 로그, 미정산/예외 상태 표시
- 경보/이상 상황 패널
  - 장기 주차, 센서 오작동, 게이트 장애, 결제 실패
- 기본 리포트(일 단위)
  - 입차 수, 출차 수, 평균 주차 시간, 일 매출

MVP 제외(2차 이후):
- 번호판 인식 정확도 분석
- 동적 요금 정책 A/B 테스트
- 예측 모델 기반 혼잡도 예보

## 4. 화면/정보 구조(IA)
1. 대시보드 홈
- 상단: KPI 카드
- 중단 좌측: 구역별 사용률 차트
- 중단 우측: 실시간 경보 패널
- 하단: 최근 차량 이벤트 테이블

2. 주차면 상세
- 구역/층 필터
- 슬롯(면) 단위 상태(빈자리/점유/예약/장애)
- 특정 차량 검색(번호판)

3. 리포트
- 일/주/월 단위 필터
- 매출/회전율/평균 체류시간 시각화
- CSV 다운로드

4. 설정
- 요금 정책
- 경보 임계치
- 사용자 권한 관리

## 5. 데이터 모델(초안)
### parking_lots
- id (PK)
- name
- location
- total_slots
- created_at, updated_at

### parking_zones
- id (PK)
- lot_id (FK)
- name
- floor
- total_slots
- active_slots

### parking_slots
- id (PK)
- zone_id (FK)
- slot_code
- status (EMPTY, OCCUPIED, RESERVED, OUT_OF_SERVICE)
- last_changed_at

### vehicles
- id (PK)
- plate_number
- vehicle_type
- owner_type (VISITOR, MEMBER)

### parking_sessions
- id (PK)
- vehicle_id (FK)
- slot_id (FK)
- entry_time
- exit_time
- payment_status (UNPAID, PAID, EXEMPT)
- fee_amount

### alerts
- id (PK)
- type (OVERSTAY, SENSOR_ERROR, GATE_ERROR, PAYMENT_ERROR)
- severity (INFO, WARN, CRITICAL)
- message
- status (OPEN, ACK, RESOLVED)
- created_at, resolved_at

## 6. API 설계(초안)
- `GET /api/dashboard/summary`
  - KPI 데이터 반환
- `GET /api/dashboard/zones`
  - 구역별 사용률 반환
- `GET /api/events?type=entry|exit&limit=50`
  - 최근 차량 이벤트
- `GET /api/alerts?status=open`
  - 활성 경보 목록
- `PATCH /api/alerts/:id/ack`
  - 경보 확인 처리
- `GET /api/reports/daily?date=YYYY-MM-DD`
  - 일간 리포트

## 7. 실시간 처리 전략
- 1차: 폴링(5~10초)
- 2차: WebSocket/SSE 전환
- 이벤트 소스:
  - 게이트 장비 이벤트
  - 센서 상태 이벤트
  - 결제 시스템 이벤트

## 8. 권한/보안
- 인증: 사내 SSO 또는 JWT 기반 인증
- 권한 레벨:
  - Admin: 전체 접근
  - Operator: 관제/조회 중심
  - Billing: 결제/리포트 중심
- 감사 로그:
  - 경보 상태 변경, 수동 게이트 제어, 요금정책 변경 기록

## 9. 비기능 요구사항
- 성능: 대시보드 첫 로드 2초 이내(사내망 기준)
- 가용성: 운영시간 내 장애 대응(알림/재시도)
- 관측성: API 지연, 오류율, 이벤트 적체량 모니터링
- 확장성: 다중 주차장(lot) 멀티 테넌트 고려

## 10. 구현 로드맵
### Phase 1 (MVP)
1. 프로젝트 기본 구조 + 공통 UI 레이아웃
2. 대시보드 홈(KPI/구역/이벤트/경보) 구현
3. 더미 데이터 -> API 연동 전환
4. 기본 권한/로그인 연동

### Phase 2
1. 주차면 상세 화면 + 차량 검색
2. 리포트 화면 + CSV 다운로드
3. 알림 워크플로우(확인/해결)

### Phase 3
1. 실시간 전송(WebSocket/SSE)
2. 운영 자동화(임계치 기반 알림/조치)
3. 분석 고도화(예측/이상 탐지)

## 11. 리스크 및 대응
- 장비 이벤트 포맷 불일치: 표준 이벤트 스키마 정의로 선제 대응
- 데이터 지연/유실: 재처리 큐 및 멱등 처리 도입
- 초기 요구사항 변경 빈도: MVP 범위 고정 + 주간 변경관리 회의

## 12. 바로 다음 작업(실행 항목)
1. 기술 스택 확정(예: React + TypeScript + Chart 라이브러리)
2. 와이어프레임(홈/상세/리포트) 작성
3. `dashboard-summary`, `zones`, `events`, `alerts` API 목업 생성
4. 프론트 MVP 화면부터 구현 시작

## 13. QR 기반 모바일 차단기 시뮬레이터 요구사항 정의
- 목적: 실제 장비 없이도 입차 흐름을 모바일에서 재현해 테스트한다.
- 핵심 규칙:
  - QR 코드를 스캔할 때마다 시뮬레이터에 차량 1대가 추가된다.
  - 모바일 화면에서 자동차 모형을 드래그해 차단기 라인을 통과시키면 입차 성공 처리한다.
- 테스트 모드 기준:
  - 단일 주차장/단일 차선부터 시작
  - 브라우저 기반(PWA 가능)으로 설치 없이 실행
  - 실시간 반영(1초 이내) 목표

## 14. 기술 스택 제안 (권장안)
### 프론트엔드
- React + TypeScript + Vite
  - 빠른 초기 개발과 간단한 배포 구조
- `@dnd-kit/core`
  - 모바일 터치 드래그 제스처 구현이 안정적
- `zustand`
  - 차량/게이트/이벤트 상태 관리 단순화
- `socket.io-client`
  - 차량 추가/통과 이벤트를 실시간 반영
- `qrcode.react`
  - 관리자 화면에서 QR 코드 즉시 생성

### 백엔드
- Node.js + Fastify + TypeScript
  - 낮은 오버헤드로 API + 소켓 서버 구성 용이
- Socket.IO
  - 양방향 이벤트 전송(차량 생성, 통과, 게이트 상태)
- Prisma ORM
  - 초기 SQLite, 운영 PostgreSQL로 전환 용이

### 데이터/인프라
- MVP: SQLite + Docker Compose
- 운영: PostgreSQL (+ 필요 시 Redis 소켓 어댑터)
- 테스트: Vitest(단위), Playwright(모바일 E2E)

## 15. 시스템 아키텍처 (시뮬레이터 관점)
1. 관리자 대시보드가 시뮬레이션 룸을 생성한다.
2. 룸 전용 QR 코드(URL + 토큰)를 렌더링한다.
3. 사용자가 QR을 스캔하면 모바일 시뮬레이터 페이지가 열린다.
4. 스캔 시 서버가 차량 객체를 1개 생성하고 룸 참가자에게 브로드캐스트한다.
5. 모바일에서 차량을 드래그해 차단기 통과 판정을 요청한다.
6. 서버가 통과 조건을 검증하고 성공 시 입차 이벤트/카운트를 갱신한다.

구성 요소:
- Admin Web: QR 생성, 실시간 현황/로그 확인
- Mobile Simulator Web: 드래그 앤 드롭 인터랙션
- API/Socket Server: 토큰 검증, 차량 생성, 통과 판정
- DB: 시뮬레이션/차량/이벤트 저장

## 16. 데이터 모델 (시뮬레이터 확장)
### simulations
- id (PK)
- name
- status (READY, RUNNING, ENDED)
- created_at, ended_at

### simulation_qr_tokens
- id (PK)
- simulation_id (FK)
- token
- expires_at
- scan_count

### simulation_vehicles
- id (PK)
- simulation_id (FK)
- source_token_id (FK)
- label (예: CAR-001)
- state (QUEUED, DRAGGING, PASSED, FAILED)
- spawned_at, passed_at

### gate_events
- id (PK)
- simulation_id (FK)
- vehicle_id (FK)
- event_type (SPAWNED, DRAG_START, DROP_ATTEMPT, PASSED, REJECTED)
- payload_json
- created_at

## 17. API / 소켓 이벤트 설계
### HTTP API
- `POST /api/simulations`
  - 시뮬레이션 룸 생성
- `GET /api/simulations/:id`
  - 룸 상태/카운트 조회
- `POST /api/simulations/:id/scan`
  - QR 스캔 처리(차량 1대 생성)
- `POST /api/simulations/:id/vehicles/:vehicleId/pass`
  - 드롭 위치 기반 통과 판정 요청
- `POST /api/simulations/:id/gate/open`
- `POST /api/simulations/:id/gate/close`

### Socket Events
- `vehicle.spawned`
- `vehicle.updated`
- `vehicle.passed`
- `gate.updated`
- `simulation.stats`

## 18. 모바일 시뮬레이터 UI/UX 설계
- 상단: 현재 차량 수, 통과 성공 수, 실패 수
- 중앙: 차선 + 차단기(상태: 열림/닫힘/전환중)
- 하단: 대기 차량 카드(드래그 시작점)

상호작용 규칙:
1. 차량 카드를 길 위로 드래그 시작
2. 드롭 시점 좌표가 통과 영역이면 서버에 판정 요청
3. 성공: 차량 애니메이션 후 목록에서 제거, 카운트 증가
4. 실패: 원위치 + 실패 로그

## 19. 상태머신 정의 (차단기)
- `CLOSED` -> `OPENING` -> `OPEN` -> `CLOSING` -> `CLOSED`
- 전환 트리거:
  - 수동 버튼(관리자)
  - 자동 오픈(옵션): 차량이 감지 영역 진입 시
- 판정 규칙:
  - 게이트가 `OPEN` 상태이고 드롭 좌표가 통과 구간이면 `PASSED`
  - 그 외는 `REJECTED`

## 20. 구현 단계 (QR 시뮬레이터 MVP)
1. 프로젝트 스캐폴딩 (web/admin/api 공통 타입)
2. 시뮬레이션 룸 생성 + QR 표시
3. QR 스캔 API 연결(스캔당 차량 1대 생성)
4. 모바일 드래그 UI + 통과 영역 충돌 판정
5. 소켓 실시간 반영(차량 추가/통과/카운트)
6. 이벤트 로그 저장 + 기본 리포트(성공률)
7. 모바일 E2E 테스트 시나리오 작성

## 21. 완료 기준 (Definition of Done)
- QR 1회 스캔 시 차량이 정확히 1대 생성된다.
- 생성된 차량은 1초 이내 모바일 화면에 나타난다.
- 드래그 통과 성공/실패가 서버 판정 기준과 일치한다.
- 관리자 화면과 모바일 화면의 카운트가 항상 동기화된다.
- 주요 이벤트가 DB에 저장되고 재조회 가능하다.

## 22. 보안/규제/접근성 추가 요구사항 (웹 조사 반영)
### 22.1 API 보안 (OWASP API Top 10: 2023)
- 객체 권한 검증(BOLA): `simulationId`, `vehicleId` 접근 시 사용자/토큰 권한을 반드시 검증
- 리소스 남용 방지: QR 스캔 API에 `rate limit` + `idempotency key` + 비정상 트래픽 탐지
- 민감 플로우 보호: `scan`, `pass`, `gate/open|close` 엔드포인트에 감사 로그 및 재현 가능한 추적 ID 적용
- API 인벤토리 관리: 버전별 엔드포인트 목록/폐기 일정 명시, 비활성 API 자동 차단

### 22.2 결제 연동 대비 (PCI DSS v4.0.1)
- 일정 기준:
  - PCI DSS v4.0 은 2024-12-31 retire
  - PCI DSS v4.0.1 기준 유지, 신규 요구사항 유효일 2025-03-31
- 결제 기능 도입 전 선행:
  - SAQ 유형 범위 확정
  - 카드데이터 미보관 원칙(가능하면 PG 위임) 적용
  - 전송/저장 구간 암호화 및 접근 통제 정책 수립

### 22.3 개인정보/차량 데이터 거버넌스
- 데이터 최소수집: 번호판/위치/이벤트는 목적 기반 최소 필드만 저장
- 사용자 권리 대응: 열람/정정/삭제/처리제한 요청 워크플로우 정의 (CCPA/CPRA 대응 관점)
- 동의/옵트아웃: 위치성 데이터 수집 시 명시적 동의와 수집 중지(옵트아웃) 경로 제공
- 보관기간 정책: 데이터 유형별 보관기간 + 자동 파기 배치 정의

### 22.4 ALPR(번호판 인식) 확장 대비
- 공개 정책: ALPR 사용 목적, 접근권한, 공유 제한, 보관기간을 공개 문서로 제공
- 운영 통제: 접근 주체별 권한 분리 + 정기 감사 로그 점검
- 데이터 정확성: 오인식 정정 절차와 재처리 프로세스 정의

### 22.5 접근성 (WCAG 2.2 권고 반영)
- 드래그 대체 조작 제공: 드래그 없이도 차량 통과를 수행할 수 있는 버튼/탭 플로우 추가
- 터치 타겟 최소 크기: 주요 조작 요소 최소 24x24 CSS px 이상
- 포커스 가시성/명확한 상태 안내: 게이트 상태 변화(열림/닫힘/실패) 텍스트+시각적으로 제공

## 23. 운영 체크리스트 (MVP 릴리즈 전)
- [ ] QR 스캔 API rate limit/중복요청 방지 적용
- [ ] 소켓 이벤트 인증/인가 적용 (룸 외 이벤트 수신 차단)
- [ ] `scan/pass/gate` 이벤트 감사 로그 저장 및 조회 기능 확인
- [ ] 개인정보 보관기간/파기 배치 설정 완료
- [ ] 드래그 대체 조작(버튼 방식) 제공 및 모바일 테스트 완료
- [ ] 결제 연동 시 PCI DSS 범위(SAQ) 사전 검토 완료

## 24. 예약/사전 예약 시스템

현재 데이터 모델에 `parking_slots.status = RESERVED`가 있으나 실제 예약 흐름이 정의되지 않았다.

### 데이터 모델 추가

#### reservations
- id (PK)
- slot_id (FK)
- vehicle_id (FK)
- reserved_by (user_id or external ref)
- start_time
- end_time
- status (PENDING, CONFIRMED, CHECKED_IN, CANCELLED, EXPIRED)
- created_at, updated_at

### API 추가
- `POST /api/reservations` — 슬롯 예약 생성
- `GET /api/reservations/:id` — 예약 상태 조회
- `PATCH /api/reservations/:id/cancel` — 예약 취소
- `POST /api/reservations/:id/check-in` — 입차 확인(QR 또는 번호판 연동)

### 규칙
- 예약 시간 초과(미입차) 시 자동 EXPIRED 처리 배치
- 예약된 슬롯은 다른 사용자 배정 불가
- 관리자 화면에서 예약 현황 타임라인 제공

---

## 25. 동적 요금 정책 데이터 모델 (선반영)

2차에서 A/B 테스트 포함 고도화 예정이나, 데이터 모델은 MVP 단계에 미리 포함해 마이그레이션 비용을 줄인다.

### 데이터 모델 추가

#### pricing_rules
- id (PK)
- lot_id (FK)
- zone_id (FK, nullable — null이면 lot 전체 적용)
- name
- base_rate (시간당 기본 요금)
- occupancy_threshold (적용 기준 점유율, 예: 0.80)
- rate_multiplier (요금 배율, 예: 1.5)
- valid_from, valid_until
- is_active

#### pricing_history
- id (PK)
- rule_id (FK)
- session_id (FK)
- applied_rate
- occupancy_at_entry
- created_at

### 규칙
- 점유율이 `occupancy_threshold` 초과 시 `base_rate × rate_multiplier` 적용
- 정책 변경 시 감사 로그 기록 (섹션 8 감사 로그 연동)
- 관리자만 요금 정책 변경 가능

---

## 26. 결제 트랜잭션 모델

섹션 22.2(PCI DSS)에서 결제 언급만 있으나 실제 트랜잭션 모델이 없다.

### 데이터 모델 추가

#### payment_transactions
- id (PK)
- session_id (FK)
- provider (STRIPE, KG_INICIS, TOSS, etc.)
- pg_ref_id (PG사 거래 ID)
- amount
- currency (default: KRW)
- status (PENDING, SUCCESS, FAILED, REFUNDED)
- paid_at
- refunded_at
- created_at

### API 추가
- `POST /api/payments/initiate` — 결제 요청(PG 위임)
- `POST /api/webhooks/payment` — PG 결과 수신 webhook
- `POST /api/payments/:id/refund` — 환불 요청
- `GET /api/payments?session_id=&date=` — 결제 내역 조회

### 규칙
- 카드 데이터 직접 보관 금지 — PG 위임 처리
- webhook 수신 시 idempotency_key로 중복 처리 방지
- 모든 결제/환불 이벤트 감사 로그 기록

---

## 27. IoT 센서 추상화 레이어

QR 시뮬레이터 외 실제 장비(초음파/자기/카메라 센서) 연동을 위한 추상화 설계.

### 데이터 모델 추가

#### sensor_devices
- id (PK)
- slot_id (FK, nullable — 구역 전체 감지 카메라는 zone_id 연결)
- zone_id (FK, nullable)
- type (ULTRASONIC, MAGNETIC, CAMERA, GATE_LOOP)
- vendor
- serial_number
- status (ONLINE, OFFLINE, ERROR)
- last_heartbeat_at
- installed_at

#### sensor_events
- id (PK)
- sensor_id (FK)
- event_type (OCCUPANCY_CHANGE, HEARTBEAT, ERROR)
- payload_json
- created_at

### API 추가
- `POST /api/webhooks/sensor` — 센서 이벤트 수신 (장비 → 서버)
- `GET /api/sensors?zone_id=&status=` — 센서 목록/상태 조회
- `PATCH /api/sensors/:id` — 센서 정보 수정

### 규칙
- 센서 이벤트와 슬롯 상태 변경은 분리(센서 이벤트 → 슬롯 상태 업데이트 비동기 처리)
- 센서 오프라인/오류 감지 시 `alerts` 테이블에 SENSOR_ERROR 경보 자동 생성

---

## 28. ANPR/LPR Webhook 인터페이스

외부 번호판 인식(ANPR/LPR) 시스템 연동을 위한 webhook 인터페이스. 실제 ANPR 엔진은 외부 시스템이며, 서버는 결과만 수신한다.

### API 추가
- `POST /api/webhooks/anpr`
  - payload: `{ plate_number, gate_id, direction (ENTRY|EXIT), confidence, timestamp, image_url? }`
  - 처리: plate_number로 vehicle 조회/생성 → parking_session 생성 또는 종료 → 이벤트 브로드캐스트
- `GET /api/anpr/logs?gate_id=&date=` — 인식 로그 조회

### 규칙
- HMAC 서명 검증으로 인가된 장비만 수신
- confidence 임계치(예: 0.90) 미만 인식 결과는 수동 확인 경보 발생
- 번호판 이미지 URL은 단기 보관 후 자동 삭제(개인정보 처리방침 연동)

---

## 29. EV 충전 슬롯 확장

### 데이터 모델 변경

#### parking_slots 컬럼 추가
- `is_ev_charging` (boolean, default: false)
- `charger_type` (AC_SLOW, DC_FAST, nullable)
- `charger_status` (AVAILABLE, IN_USE, FAULT, nullable)

### KPI 카드 추가
- 전체 EV 충전 슬롯 수
- 사용 중 충전 슬롯 수
- 충전기 장애 수

### API 추가
- `GET /api/dashboard/ev-summary` — EV 충전 현황 요약
- `PATCH /api/slots/:id/charger-status` — 충전기 상태 수동 갱신

---

## 30. 멀티 테넌트(다중 조직) 설계

섹션 9에서 "다중 주차장 멀티 테넌트"를 언급했으나 데이터 모델에 반영되지 않았다. 나중에 추가하면 마이그레이션 비용이 크므로 초기부터 포함한다.

### 데이터 모델 추가

#### organizations
- id (PK)
- name
- plan (FREE, PRO, ENTERPRISE)
- created_at

#### 기존 테이블 변경
- `parking_lots`에 `organization_id (FK)` 추가
- `users` (인증 시스템)에 `organization_id (FK)` + `role` 추가

### 규칙
- 모든 API에서 `organization_id` 기반 데이터 격리 (Row-level security 또는 미들웨어)
- 슈퍼 어드민(플랫폼 운영팀)은 전체 조직 접근 가능
- 조직 간 데이터 공유 금지

---

## 31. 관측성(Observability) 도구 지정

섹션 9에서 관측성을 요구사항으로 정의했으나 구체적인 도구가 없다.

### MVP 단계
- **로깅**: `pino` (Fastify 기본) → 구조화 로그(JSON) → stdout
- **에러 추적**: Sentry (프론트 + 백엔드)
- **헬스체크**: `GET /health` — DB, 소켓 서버, 센서 연결 상태 반환

### 운영 단계
- **메트릭**: OpenTelemetry SDK → Prometheus 수집 → Grafana 시각화
- **주요 메트릭**:
  - API 응답 지연(p50/p95/p99)
  - 소켓 이벤트 처리량 및 적체량
  - 센서 heartbeat 누락률
  - 결제 성공/실패율

---

## 32. 이벤트 재처리 큐 구체화

섹션 11 리스크에서 "재처리 큐 및 멱등 처리"를 언급했으나 기술이 미정이다.

### MVP: DB 기반 Job 테이블
```
job_queue
- id (PK)
- type (SENSOR_EVENT, PAYMENT_WEBHOOK, ANPR_EVENT, ...)
- payload_json
- status (PENDING, PROCESSING, DONE, FAILED)
- attempts (default: 0)
- max_attempts (default: 3)
- next_run_at
- created_at, updated_at
```
- Fastify 서버 내 주기적 poll로 처리 (외부 의존성 없이 SQLite/PostgreSQL만 사용)

### 운영: BullMQ + Redis
- Redis 기반 분산 큐로 전환
- 이미 Socket.IO Redis 어댑터 사용 시 동일 Redis 재활용 가능
- 실패 시 지수 백오프 재시도, DLQ(Dead Letter Queue) 별도 관리

### 규칙
- 모든 외부 이벤트(webhook, 센서, 결제) 수신 즉시 큐에 적재 후 응답 반환
- 처리 로직은 큐 worker에서 분리 실행 → 수신 API 응답 속도 보장
