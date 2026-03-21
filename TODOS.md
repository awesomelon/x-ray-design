# TODOS

## P2: E2E 테스트 추가
- **무엇:** 실제 Chrome 확장 환경에서 드래그+스냅 플로우를 검증하는 E2E 테스트
- **왜:** jsdom으로는 Chrome API와 실제 레이아웃 동작을 테스트할 수 없음. 현재 단위 테스트는 순수 로직만 커버하며, 확장 프로그램의 전체 플로우(설치 → 활성화 → 드래그 → 스냅 → 리셋)는 검증 불가
- **어떻게:** Puppeteer 또는 Playwright의 Chrome extension 지원 사용. `dist/` 빌드를 unpacked로 로드한 후 Side Panel 열기 → 토글 → 드래그 시뮬레이션
- **노력:** M (human) → S (CC)
- **의존:** 없음

## P3: UI 컴포넌트 테스트 추가
- **무엇:** App.tsx, DragGridConfig.tsx, FeatureToggle.tsx의 단위 테스트
- **왜:** Side Panel UI의 상태 관리(토글, 그리드 설정 변경, 메시지 수신)가 테스트되지 않음
- **어떻게:** @testing-library/preact 또는 preact-render-to-string으로 렌더링 테스트. Chrome API 모킹 필요
- **노력:** S (human) → S (CC)
- **의존:** 없음
