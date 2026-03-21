# Changelog

All notable changes to this project will be documented in this file.

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
