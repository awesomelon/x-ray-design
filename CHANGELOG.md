# Changelog

All notable changes to this project will be documented in this file.

## [1.0.4.1] - 2026-03-30 — CSS Editor Input Fix

### Fixed
- CSS 에디터 input 필드에 타이핑/포커스가 불가능하던 버그 수정 — drag-core의 캡처 단계 이벤트 핸들러가 Shadow DOM event retargeting으로 인해 오버레이 내부 이벤트를 가로채고 있었음
- CSS 에디터의 키보드 이벤트 격리(stopPropagation)가 Shadow DOM에서 작동하지 않던 버그 수정 — deepActive 패턴 적용

## [1.0.4.0] - 2026-03-30 — Inline CSS Editor

### Added
- 인라인 CSS 에디터 — 요소를 선택하면 플로팅 팝업으로 CSS 속성(width, height, margin, padding, gap, border-radius) 실시간 수정 가능
- Selection observer API (`onSelectionChange`/`offSelectionChange`) — 선택 상태 변경 콜백 구독
- Shadow DOM 내 pointer-events:auto 팝업 — 입력 필드가 있는 인터랙티브 오버레이
- Side Panel에 CSS Editor 토글 추가
- Shadow DOM focus 감지 — arrow key가 input 포커스 중 요소를 이동시키지 않음
- `shouldIgnore`에 x-ray-overlay 호스트 태그 체크 추가 — 팝업 클릭이 드래그를 트리거하지 않음

### Changed
- `FeatureId` 타입에 `'css-editor'` 추가
- `selection-state.ts`에 observer 패턴 도입 (notifyObservers)

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
