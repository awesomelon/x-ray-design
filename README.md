# Snap

[English](./README.en.md)

웹페이지의 요소를 자유롭게 드래그하여 레이아웃을 탐색하는 Chrome 확장 프로그램.

## Features

### Element Drag + Grid Snap
페이지의 요소를 드래그하면 자동 감지된 그리드에 마그네틱처럼 붙습니다.

- **마우스 드래그**: 요소를 잡아 이동 — 컬럼 경계와 베이스라인에 자동 스냅
- **클릭 선택 + 방향키**: 요소를 클릭한 뒤 방향키로 1px씩 미세 조정 (`Shift` + 방향키로 10px)
- **스냅 가이드 라인**: 스냅 시 분홍색 가이드 라인이 나타나 정렬 위치를 표시
- **그리드 오버레이**: 페이지의 컬럼 그리드 + 베이스라인 격자를 자동 감지하여 표시
- **수동 오버라이드**: Side Panel에서 columns, gutter, margin, baseline 등 직접 조절
- `Esc` 키로 모든 변경사항 리셋

### Performance

- **Layout thrashing 방지**: 드래그 중 요소 크기를 캐시하여 매 프레임 레이아웃 재계산 제거
- **스냅 계산 캐시**: 그리드 컬럼 엣지를 캐시하여 동일 그리드에서 반복 계산 방지
- **2단계 컨테이너 감지**: `body > *`를 먼저 검색하고 필요시에만 하위 레벨로 확장
- **rAF 배칭**: requestAnimationFrame으로 드래그 업데이트를 배치 처리

## Tech Stack

| | |
|---|---|
| Extension | Chrome Manifest V3, Side Panel API |
| Language | TypeScript (strict) |
| Build | Vite + @crxjs/vite-plugin |
| UI | Preact |
| Test | Vitest + jsdom (105 tests) |

## Getting Started

```bash
# 의존성 설치
npm install

# 개발 서버 (HMR)
npm run dev

# 프로덕션 빌드
npm run build

# 테스트
npm test
```

### Chrome에 로드

1. `npm run build`로 `dist/` 폴더 생성
2. Chrome에서 `chrome://extensions` 열기
3. **개발자 모드** 활성화
4. **압축해제된 확장 프로그램을 로드합니다** → `dist/` 폴더 선택
5. 확장 아이콘 클릭 → Side Panel에서 기능 토글

## Project Structure

```
src/
├── background/              # Service Worker (메시지 릴레이)
├── content/
│   ├── modules/
│   │   ├── element-drag.ts  # 오케스트레이터 (Grid + Drag + Selection 통합)
│   │   └── drag/
│   │       ├── drag-core.ts       # 마우스 드래그 + 마그네틱 스냅
│   │       ├── grid-renderer.ts   # 컬럼 그리드 자동 감지 + 렌더링
│   │       ├── snap-engine.ts     # 컬럼/베이스라인 스냅 계산 (캐시)
│   │       ├── snap-guides.ts     # 스냅 가이드 라인 표시
│   │       └── selection-state.ts # 클릭 선택 + 방향키 이동
│   ├── overlay-host.ts      # Shadow DOM 격리 오버레이
│   └── index.ts             # Content Script 진입점
├── sidepanel/               # Side Panel UI (Preact)
│   ├── components/
│   └── styles/
└── shared/                  # 공유 타입, 메시지, 에러 핸들링
tests/
└── unit/                    # 단위 테스트 (105 tests)
```

## License

MIT
