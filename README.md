# X-Ray Design

웹페이지의 화려한 표면을 벗겨내고 **디자인의 뼈대**만 보여주는 Chrome 확장 프로그램.

## Features

### Inspect
마우스를 올리면 해당 요소의 box model(margin/padding/content)이 시각화되고, Side Panel에 font, color, spacing 등 CSS 속성이 실시간으로 표시됩니다.

### Skeleton View
페이지의 배경, 이미지, 그림자를 모두 제거하고 여백 구조만 남깁니다.
- 이미지/비디오 → 회색 빗금 placeholder로 치환
- Margin(주황) / Padding(초록) 오버레이 + px 레이블

### Grid Overlay
페이지 위에 컬럼 그리드와 베이스라인 격자를 덧씌웁니다.
- CSS Grid / Flexbox / max-width 컨테이너를 자동 감지
- Side Panel에서 columns, gutter, baseline 등 직접 조절 가능

### Typography Scale
페이지에 사용된 모든 폰트 크기를 수집하고, 기하급수 공식 `f(n) = f₀ × rⁿ`의 변수를 역산합니다.
- 기준 폰트(f₀), 비율(r), 명명된 비율(Major Third, Golden Ratio 등) 표시
- 크기별 사용 빈도 히스토그램

### Contrast Ratio
모든 텍스트의 전경색/배경색 명도비를 WCAG 2.x 기준(4.5:1)으로 검증합니다.
- 통과(초록) / 실패(빨간) 배지가 페이지 위에 표시
- Side Panel에 실패 항목 목록 + 색상 스워치

## Tech Stack

| | |
|---|---|
| Extension | Chrome Manifest V3, Side Panel API |
| Language | TypeScript (strict) |
| Build | Vite + @crxjs/vite-plugin |
| UI | Preact |
| Test | Vitest + jsdom |

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
├── background/          # Service Worker (메시지 릴레이)
├── content/
│   ├── modules/         # 기능별 독립 모듈
│   │   ├── hover-inspect.ts
│   │   ├── skeleton-view.ts
│   │   ├── grid-overlay.ts
│   │   ├── typography-extractor.ts
│   │   └── contrast-analyzer.ts
│   ├── overlay-host.ts  # Shadow DOM 격리 오버레이
│   └── index.ts         # Content Script 진입점
├── sidepanel/           # Side Panel UI (Preact)
│   ├── components/
│   └── styles/
└── shared/              # 공유 타입, 메시지, 유틸
```

## License

MIT
