# Changelog

All notable changes to this project will be documented in this file.

## [1.0.3.0] - 2026-03-30 — Alt+Hover Distance Inspect

### Added
- Alt+hover 거리 확인 모드 (Figma Inspect 스타일) — 드래그 없이 Alt 키를 누른 채 호버하면 주변 요소까지의 거리를 실시간 표시
- Selection-aware inspect — 요소를 선택한 상태에서 Alt+hover 시 선택 요소와 호버 요소 간 직접 거리 표시
- 멀티 셀렉트 inspect — 여러 요소 선택 시 호버에 가장 가까운 선택 요소 기준 거리 표시
- `computeDirectDistance()` — 두 특정 요소 간 4방향 거리 계산 함수
- 연결선 렌더링 — Mode 2에서 두 요소 사이 마젠타 dashed 연결선 표시
- `visibilitychange` / `blur` 리스너 — 탭 전환 시 Alt stuck 방지

### Changed
- `overlapMidpoint()` export — 외부에서 재사용 가능하도록 변경
- `scanVisibleElements()`에 `skipLargeFilter` 옵션 추가 — inspect 모드에서 대형 컨테이너도 스캔 대상 포함
- `filterAndMakeRect()`에 `skipLargeFilter` 옵션 추가
- `clearAllGuides()`에 connector line 정리 포함

## [1.0.2.0] - 2026-03-22 — Element-Based Magnetic Snap

### Added
- Figma 수준의 요소 기반 magnetic 스냅 — 다른 요소의 엣지(left/right/top/bottom)와 중심선(centerX/centerY)에 자동 정렬
- 부모 컨테이너 경계 스냅 — 컨테이너 안에서 요소를 정렬할 때 경계에 스냅
- 동일 간격 분배 가이드 — 요소 사이의 간격이 균등할 때 마젠타 가이드 표시
- 거리 라벨 — 드래그 중 주변 요소까지의 px 거리를 실시간 표시
- 계층적 요소 스캔 — 형제 → 부모 → 삼촌 요소 순서로 스냅 대상 탐색
- 실시간 재스캔 — 스크롤 변경 시 스냅 대상 자동 업데이트

### Removed
- Grid 오버레이 시스템 전체 제거 (컬럼 그리드 자동 감지, 그리드 렌더링, 베이스라인 그리드)
- 사이드패널 Grid 설정 UI 제거 (DragGridConfig 컴포넌트)
- Grid 관련 메시지 프로토콜 4개 제거 (GRID_REPORT, UPDATE_GRID_SETTINGS, RESET_GRID_AUTO, SET_GRID_VISIBLE)

### Changed
- 스냅 엔진: `snapToGrid()` → `snapToElements()` — 요소 엣지/중심 기반으로 전환
- 사이드패널: ON/OFF 토글만 유지, 안내 문구를 "주변 요소에 자동으로 스냅됩니다"로 변경
- DESIGN.md: Grid 색상 체계 제거, 분배 가이드/거리 라벨 스타일 추가

## [1.0.1.0] - 2026-03-21

### Removed
- Rubber band (marquee) selection — 웹페이지 대부분 영역에서 동작하지 않는 문제로 제거
- `.xray-marquee` CSS 규칙 제거

### Changed
- 빈 공간(body/html) 클릭 시 선택 해제 동작 추가 (Ctrl/Cmd 유지 시 선택 보존)
- 상태 머신 단순화: 5개 상태(IDLE, PENDING, DRAGGING, PENDING_MARQUEE, MARQUEE) → 3개 상태(IDLE, PENDING, DRAGGING)

### Fixed
- onClick 핸들러에서 ignored element 클릭 시 선택이 해제되지 않던 동작 수정

## [1.0.0] - 2026-03-21

- Initial release: 요소 드래그 + 마그네틱 그리드 스냅, 멀티 셀렉트, 그룹 드래그, 화살표 키 조정
