# 구현 체크리스트

> 요구사항 출처: `docs/requirements.md` (시큐원 운영제안서)
> 우선순위: 🔴 높음 → 🟡 중간 → 🟢 낮음

---

## 🔴 1. 블랙리스트 차량 관리

- [x] DB: `BlacklistVehicle` 모델 추가 (plateNumber, reason, registeredBy)
- [x] API: `GET /api/blacklist` — 목록 조회 (번호판 검색)
- [x] API: `POST /api/blacklist` — 등록
- [x] API: `DELETE /api/blacklist/:id` — 해제
- [x] ANPR 웹훅: 입차 시 블랙리스트 조회 → 매칭 시 Alert 생성 + 차단
- [x] Admin UI: 블랙리스트 관리 페이지 (`/blacklist`)

## 🔴 2. 외부차량 통합 검색

- [x] API: `GET /api/external-vehicles` — 방문/예약 통합 조회 (유형·번호판·기간 필터)
- [x] Admin UI: 외부차량 조회 페이지 (`/vehicles`)

## 🟡 3. 방문주차 예약 고도화

- [ ] DB: `Reservation` 에 횟수/시간 할당량(quota) 필드 추가
- [ ] API: 세대별 월 사용량 집계 및 초과 여부 반환
- [ ] API: 초과사용 세대 관리비 계산 엔드포인트
- [ ] Admin UI: 예약 페이지에 세대별 사용량 표시
- [ ] ANPR 웹훅: 예약차량 인식 시 차단기 자동 개방 처리

## 🟡 4. 불법주차 단속 보고서

- [ ] DB: `ParkingViolation` 모델 추가 (plateNumber, violationType, imageUrl, guardId, note)
- [ ] API: `POST /api/violations` — 단속 등록
- [ ] API: `GET /api/violations` — 목록 조회 (근무자/차량/기간 필터)
- [ ] API: `GET /api/violations/report` — 근무자별 단속 횟수 집계
- [ ] API: 단속 문자 발송 (이동주차/강력단속/스티커)
- [ ] Admin UI: 불법주차 단속 관리 페이지 (`/violations`)

## 🟡 5. 입주민 문자신고 접수·처리

- [ ] DB: `Complaint` 모델 추가 (reporterUnit, content, status, assignedTo, resolvedAt)
- [ ] API: `POST /api/complaints` — 신고 접수
- [ ] API: `GET /api/complaints` — 목록 조회
- [ ] API: `PATCH /api/complaints/:id/assign` — 담당자 배정
- [ ] API: `PATCH /api/complaints/:id/resolve` — 처리 완료
- [ ] Admin UI: 민원/신고 관리 페이지 (`/complaints`)

## 🟢 6. 순찰관리 시스템

- [ ] DB: `PatrolGroup`, `PatrolRoute`, `PatrolLog` 모델 추가
- [ ] API: 순찰 그룹/경로 CRUD
- [ ] API: `POST /api/patrols` — 순찰 체크포인트 기록
- [ ] API: 순찰 결과 보고서 생성
- [ ] Admin UI: 순찰관리 페이지 (`/patrols`)

## 🟢 7. 초과사용 관리비 자동 계산

- [ ] API: 월별 세대 초과사용량 계산
- [ ] API: 분당 단가 설정 (Settings 연동)
- [ ] Admin UI: 초과사용 세대 목록 및 금액 표시, 엑셀 출력

## 🟢 8. 비상콜 시스템

- [ ] 아키텍처 설계 (외부 앱 연동 방식 결정)
- [ ] API: 비상콜 수신 엔드포인트
- [ ] Admin UI: 비상콜 이력 조회
