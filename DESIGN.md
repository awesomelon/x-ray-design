# Design System — Snap

## Product Context
- **What this is:** 웹페이지 요소를 드래그하여 레이아웃을 탐색하는 Chrome 확장 프로그램
- **Who it's for:** 디자이너, 프론트엔드 개발자 — 구현된 웹페이지가 디자인 시안과 일치하는지 검증하는 사람
- **Space/industry:** 디자인 QA / 레이아웃 검증 도구 (Figma, Sketch 등 디자인 도구의 보조)
- **Project type:** Chrome Extension — 오버레이 레이어 + Side Panel UI

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian — 기능 우선, 페이지 콘텐츠를 방해하지 않는 최소한의 시각 요소
- **Decoration level:** Minimal — 오버레이는 정보를 전달하는 최소한의 시각 요소만 사용
- **Mood:** 정밀하고 신뢰할 수 있는 도구. Figma의 선택/스냅 피드백처럼 직관적이고 방해받지 않는 느낌.
- **Reference tools:** Figma (선택/드래그 UX), Chrome DevTools (오버레이 패턴)

## Color — Overlay Layer

오버레이는 **어떤 웹페이지 위에서든** 작동해야 하므로, 일반적인 웹 콘텐츠와 충돌하지 않으면서 눈에 띄는 색상을 사용합니다.

### Semantic Color System
```
 역할           | 색상                    | Hex       | 용도
 --------------|------------------------|-----------|----------------------------------------
 Selection     | 보라                    | #8b5cf6   | 호버, 선택, marquee — "선택 계열" 전체
 Snap          | 마젠타                  | #ec4899   | 스냅 가이드, 스냅 플래시 — "정렬 계열"
 Grid          | 파랑                    | #3b82f6   | 컬럼 그리드 오버레이
 Baseline      | 빨강                    | #ef4444   | 베이스라인 그리드
```

### Opacity Scale (Selection #8b5cf6 기준)
```
 용도                   | 값
 ----------------------|-------
 호버 배경              | 0.06
 선택 배경              | 0.10
 그리드 컬럼 배경       | 0.08 (파랑)
 베이스라인             | 0.12 (빨강)
 선택 글로우 (외곽)     | 0.30
 백색 아웃라인          | 0.50
```

### Border Styles
```
 상태                 | 스타일
 --------------------|------------------------------------------
 호버 하이라이트       | 2px dashed #8b5cf6 + outline 1px white 0.5
 선택 하이라이트       | 2px solid #8b5cf6 + box-shadow glow
 스냅 가이드 (수직)    | 1px solid #ec4899 + box-shadow 6px glow
 스냅 가이드 (수평)    | 1px solid #ec4899 + box-shadow 6px glow
 그리드 컬럼 경계      | 1px solid rgba(59,130,246,0.25)
```

## Color — Side Panel

Side Panel은 Chrome의 네이티브 UI와 조화를 이루는 중립적 팔레트를 사용합니다.

### Light Mode
```
 Token                  | Value     | 용도
 -----------------------|-----------|---------------------------
 --color-text           | #1a1a1a   | 본문 텍스트
 --color-text-secondary | #888      | 보조 텍스트, 라벨
 --color-text-tertiary  | #666      | 설명문
 --color-bg             | #fafafa   | 페이지 배경
 --color-bg-elevated    | #fff      | 카드, 입력 필드 배경
 --color-bg-sunken      | #f0f0f0   | 계산 결과 영역
 --color-bg-preview     | #f5f5f5   | 그리드 프리뷰 배경
 --color-border         | #e5e5e5   | 섹션 구분선
 --color-border-input   | #ddd      | 입력 필드 테두리
 --color-border-subtle  | #ccc      | 버튼 테두리
 --color-accent         | #8b5cf6   | 강조 (오버레이와 동일)
 --color-grid           | #3b82f6   | 그리드 관련 UI
 --color-grid-light     | #60a5fa   | 그리드 밝은 변형
 --color-snap           | #ec4899   | 스냅 관련 UI
 --color-active-bg      | #1a1a1a   | 토글 ON 배경
 --color-active-text    | #fff      | 토글 ON 텍스트
```

### Dark Mode
```
 Token                  | Value     | 변경 사항
 -----------------------|-----------|---------------------------
 --color-text           | #e0e0e0   | 밝은 텍스트
 --color-bg             | #1a1a1a   | 어두운 배경
 --color-bg-elevated    | #2a2a2a   | 약간 밝은 표면
 --color-bg-sunken      | #2a2a2a   | 동일 (어두운 모드에서 구분 약화)
 --color-border         | #333      | 어두운 구분선
 --color-border-input   | #444      | 어두운 입력 테두리
 --color-active-bg      | #fff      | 반전: 밝은 토글
 --color-active-text    | #1a1a1a   | 반전: 어두운 텍스트
```

Accent 색상(#8b5cf6, #3b82f6, #ec4899)은 라이트/다크 모드에서 동일하게 유지합니다.

## Typography

Side Panel은 시스템 폰트를 사용합니다 — 확장 프로그램이므로 외부 폰트 로딩이 불필요합니다.

```
 용도        | 폰트                                                          | 크기    | 두께
 ------------|--------------------------------------------------------------|---------|-----
 제목 (h1)   | -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans  | 16px    | 700
 본문         | 상동                                                         | 13px    | 400
 라벨         | 상동                                                         | 12px    | 500
 설명문       | 상동                                                         | 11-12px | 400
 배지         | 상동                                                         | 10px    | 600
 필드 라벨    | 상동                                                         | 10px    | 500
 숫자 입력    | 상동 + tabular-nums                                          | 12px    | 600
```

## Spacing

```
 Token          | Value  | 용도
 ---------------|--------|----------------------------------
 --space-panel  | 16px   | 패널 전체 패딩
 --space-section| 16px   | 섹션 간 간격
 --space-field  | 6px    | 필드 간 간격
 --space-inline | 12px   | 인라인 요소 간격
```

기본 단위: **2px** (최소 간격은 2px, 스케일: 2, 4, 6, 8, 10, 12, 16px)

## Layout

- **Side Panel:** 단일 컬럼, 최대 너비 = 패널 너비 (Chrome이 결정)
- **Grid Settings:** 2-column CSS grid (`grid-template-columns: 1fr 1fr`)
- **Border radius scale:**
  ```
  --radius-sm: 2px  — 오버레이 하이라이트, 그리드 프리뷰 컬럼
  --radius-md: 4px  — 버튼, 입력 필드, 계산 결과 영역
  --radius-lg: 6px  — 그리드 프리뷰 컨테이너
  pill: 10px        — 상태 배지
  ```

## Motion

- **Approach:** Minimal-functional — 상태 전환을 보조하는 최소한의 애니메이션만 사용
- **Duration scale:**
  ```
  micro:  0.15s  — 버튼 호버, 입력 필드 포커스, 스냅 가이드 fade
  short:  0.2s   — 스냅 플래시 애니메이션
  ```
- **Easing:** `ease-out` (진입), `ease` (일반 전환)
- **Overlay animations:**
  ```
  스냅 가이드 fade:    opacity 0.15s ease-out
  스냅 플래시:         xray-snap-flash 0.2s ease-out
                      (box-shadow 12px→6px glow 감소)
  ```

## Interaction States — Multi-Select

### 커서 상태 머신
```
 상태                   | 커서
 ----------------------|----------
 기능 활성 (idle)       | grab
 호버 (요소 위)         | grab
 Ctrl/Cmd + 호버       | grab (변경 없음)
 드래그 중 (단일/그룹)   | grabbing
 드래그 후 (drop)       | grab
```

### 인터랙션별 시각 피드백
```
 인터랙션               | 시각 피드백
 ----------------------|--------------------------------------------------
 호버                   | 보라 점선 2px 박스
 단일 클릭 → 선택       | 보라 실선 2px 박스 + 글로우
 Ctrl+클릭 → 토글       | 보라 실선 박스 추가/제거 (동일 스타일)
 그룹 드래그 시작        | 하이라이트 유지 + 요소 이동 시작
 그룹 드래그 중          | 하이라이트 따라이동 + primary만 스냅 가이드 표시
 그룹 드롭              | 하이라이트 유지 (선택 유지)
 빈 공간 클릭            | 선택 해제 (Ctrl 시 선택 유지)
 Esc (드래그 중)         | 요소 원위치 + 선택 해제
 Esc (idle)             | 전체 리셋 + 선택 해제
```

### 시각 레이어 우선순위 (z-index 높은 순)
```
 1. 스냅 가이드 (마젠타)     ← 드래그 중 최우선
 2. 선택 하이라이트 (보라 실선, 복수)
 3. 호버 하이라이트 (보라 점선)
 4. 그리드 오버레이 (파랑)
 5. 원본 페이지
```

## Key Design Principles

1. **색상 = 역할**: 보라 = 선택, 마젠타 = 스냅, 파랑 = 그리드. 이 매핑은 절대 섞지 않음.
2. **최소 침범**: 오버레이는 `pointer-events: none`으로 페이지 인터랙션을 방해하지 않음.
3. **Figma 패턴 차용**: Ctrl+click 토글, 그룹 드래그 시 primary snap, 동일 선택 스타일.
4. **Shadow DOM 격리**: 모든 오버레이는 `<x-ray-overlay>` Shadow DOM 내에서 렌더링. 페이지 스타일 충돌 방지.
5. **시스템 폰트 전용**: 확장 프로그램이므로 외부 폰트 로딩 없음. OS 네이티브 느낌 유지.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-21 | Initial design system created | overlay-host.ts + panel.css에서 추출, /plan-design-review 결정 통합 |
| 2026-03-21 | ~~Marquee: 보라 점선 + crosshair~~ [Removed] | 사용자 관찰 결과 대부분 영역에서 동작 불가, 마키 제거 결정 |
| 2026-03-21 | 그룹 드래그 중 하이라이트 유지 | 그룹 범위 확인을 위한 시각적 피드백 필요 |
| 2026-03-21 | Ctrl+hover 특별 피드백 없음 | Figma 동일 패턴, "보이지 않으면 완벽" 원칙 |
| 2026-03-21 | 마우스 전용 도구 | 시각적 레이아웃 검증 도구의 본질, Tab 충돌 회피 |
