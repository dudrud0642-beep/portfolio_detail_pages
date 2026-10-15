# SIMMONS Product Detail — Beautyrest Black Brigitte

SIMMONS 리뉴얼 포트폴리오([simmons_portfolio](https://dudrud0642-beep.github.io/simmons_portfolio/))의 디자인 시스템을 이어받은 **인터랙티브 제품 상세페이지**입니다.
표면에서 스프링까지, 스크롤할수록 매트리스가 한 겹씩 열리며 편안함이 어떻게 만들어지는지 보여 줍니다.

- **Live:** https://dudrud0642-beep.github.io/portfolio_detail_pages/simmons/

## 제품 정보 출처

- 제품: **뷰티레스트 블랙 브리짓** (Beautyrest BLACK Brigitte)
- 모델명·경도·소재 구성·사이즈·가격·안전 인증·A/S 정보: 시몬스 공식몰 [simmons.co.kr](https://www.simmons.co.kr) 상품번호 133689023 (2026-10-08 기준)
- 관련 제품(켈리·로렌): 같은 공식몰 상품 정보 (같은 날짜 기준)
- 사진: 공식몰 제품 사진(`brigitte-*`, `*-cutout`)과 메인 리뉴얼 사이트의 시몬스 사진(`night-*`, `foams`)
- 가격은 공식몰 기준이라 바뀔 수 있습니다. 바뀌면 `index.html`의 `data-price`와 표시 문구를 함께 고칩니다.

## Structure

```text
simmons/
├─ index.html              # 페이지 전체 (헤더·푸터는 메인 사이트와 같은 마크업)
├─ README.md
├─ tools/build-svg.js      # (선택) 구조 도면 SVG 재생성 스크립트
└─ assets
   ├─ css/
   │  ├─ base.css          # 메인 사이트와 동일 (변경 없음)
   │  ├─ layout.css        # 메인 사이트와 동일 (변경 없음)
   │  ├─ closing.css       # 메인 사이트와 동일 (변경 없음)
   │  └─ product.css       # 상세페이지 전용, 모든 클래스 pd- 접두사
   ├─ js/
   │  ├─ main.js           # 메인 사이트 공통 JS (1번 블록만 수정)
   │  └─ product.js        # 상세페이지 인터랙션
   └─ images/              # WebP 13장 + 로고·챗봇·파비콘 PNG, 전체 약 440KB
```

## Sections

| # | 섹션 | 내용 | 인터랙션 |
| - | ---- | ---- | -------- |
| 01 | Hero | 제품명, 가격, CTA, 핵심 사양 | 프레임이 위아래로 열리는 등장, 제품명 마스크 상승, 스크롤 시 패럴랙스 |
| 02 | Statement | 브랜드 문장, 12가지 · 7회전 · 400mm | 줄 단위 텍스트 클립 리빌 |
| 03 | Design detail | 윗면·옆면·아랫면 마감 | 이미지 마스크 리빌, 패럴랙스, 호버 확대 + 확대 뷰어 |
| 04 | Anatomy | 12가지 소재를 01~05단계 + 06 완성으로 | Sticky 도면이 한 겹씩 분리, 단계 카드마다 실제 소재 사진, 스프링 독립 동작 도식 |
| 05 | A night | 하룻밤 타임라인 | 카드 → 풀블리드 확대, 세로 스크롤 → 가로 갤러리 |
| 06 | Options | 사진 갤러리, 경도, 사이즈, 수량 | 사이즈 도형 변형, 가격 롤링, 사진 크로스페이드 |
| 07 | Specification | 제품 정보·사이즈·소재·인증·A/S | 아코디언 |
| 08 | Related | 같은 블랙, 다른 경도 (켈리·로렌) | 카드 리빌, 호버 화살표 |
| 09 | Closing | Lie down. Let go. | 메인 사이트의 아웃라인 문구 리빌 + CTA 호버 |
| — | Dock | 하단 구매 바 | 히어로 이후 등장, 현재 섹션 표시, 스크롤 진행 막대. 옵션의 구매 버튼·마지막 문구·푸터가 보이면 숨김 |

## Responsive · Motion

- 기준점은 메인과 같습니다: `1200px`(헤더) · `1100px` · `900px` · `600px`. 오른쪽 칸이 좁은 `901~1100px`에는 구조 단계 목차(3칸 × 2줄)와 사이즈 선택(3칸, 901~1000px) 보정이 따로 있습니다.
- 스크롤에 계속 연동되는 모션(구조 분리, 풀블리드 확대, 가로 갤러리, 패럴랙스)은 **데스크톱(1101px 이상, 높이 640px 이상, 마우스)** 에서만 켜집니다.
- 태블릿·모바일은 같은 장면을 **구간 도달 시 한 번 전환** 또는 **가로 스와이프**로 보여 줍니다.
- `prefers-reduced-motion`이면 연동 모션 없이 최종 상태(열린 도면, 모든 라벨)를 보여 줍니다.
- 모바일(600px 이하)은 구조 도면을 화면 높이의 32%로 줄여 고정하고, 도식 안내 문구는 숨깁니다. 하룻밤 타임라인은 손가락 스와이프, PC 좁은 창에서는 마우스 끌기로 넘깁니다.
- 가로로 눕힌 휴대폰(높이 500px 이하)은 구조 도면을 왼쪽, 설명을 오른쪽에 나란히 두고, 하단 구매 바와 상담 버튼을 작게 줄입니다.
- 폭은 두 가지만 씁니다.
  - **Full:** 좌우 여백(`--pad`) 안을 꽉 채웁니다. 타임라인, 마지막 문구가 해당합니다.
  - **Split(`.pd-split`):** 왼쪽 7칸에 비주얼, 오른쪽 5칸에 텍스트를 둡니다. 오른쪽 영역은 8번째 칸에 공통 간격(`--pd-split`)을 더한 위치에서 시작합니다(1536px 기준 967px). 그래서 사진과 글 사이 간격이 모든 섹션에서 같습니다.
- 디자인 디테일·구조·제품 정보 섹션은 같은 머리줄(`.pd-head`)을 씁니다. 위에 기준선이 있고, 제목은 왼쪽, 짧은 소개는 오른쪽에 놓입니다.

## Editing guide

세 파일 모두 같은 번호(01 Hero ~ 09 Closing)로 나뉘어 있어서, 섹션 번호로 찾으면 됩니다.

| 바꾸고 싶은 것 | 위치 |
| -------------- | ---- |
| 문구 | `index.html` — `<!-- 01 Hero (첫 화면) -->`처럼 섹션마다 한글 이름이 붙은 주석 |
| 가격·사이즈 | `index.html` 06 옵션의 `input[name="size"]` — 가격 `data-price`, 치수 `data-w`/`data-l` |
| 글자색(회색 4단계) | `product.css` 0번 `.pd-page`의 `--pd-text-strong / body / muted / faint` |
| 사진 ↔ 글 간격, 헤더 높이 | `product.css` 0번 `.pd-page`의 `--pd-split`, `--pd-header` |
| 좌우 여백·섹션 여백·섹션 제목 크기 | `base.css`의 `:root`와 `.section-title` (메인 사이트와 공유) |
| 섹션별 모양·반응형 | `product.css` 해당 번호 블록 — 반응형 규칙은 각 섹션 바로 아래 |
| 인터랙션 | `product.js` 맨 위 목차 번호 블록 |
| 구조 도면(층 두께·색·라벨) | `tools/build-svg.js` 수정 후 `node tools/build-svg.js index.html` (HTML 속 SVG는 직접 고치지 않기) |

코드 서식은 Prettier 기본값으로 맞춰 두었습니다. 자동 생성된 SVG 부분은 `<!-- prettier-ignore -->`로 묶여 있어 서식 정리를 해도 펼쳐지지 않습니다.

- 헤더·퀵메뉴·푸터를 바꾸면 메인 사이트 `index.html`과 같이 맞춰 둡니다.
- 링크는 포트폴리오용이라 `href="#"`이면 이동하지 않습니다(`main.js` 9번). 섹션 이동 링크와 로고(메인 리뉴얼 사이트)는 동작합니다.
- `main.js` 1번 블록은 마우스 클릭도 사용자 입력으로 봅니다. 로딩 중 섹션 이동 링크를 눌러도 로딩이 끝날 때 맨 위로 되돌아가지 않습니다.

## Browser check

Edge·Chrome(Chromium), Firefox, Safari(WebKit) 엔진에서 데스크톱(1440px)·모바일(390px)로 동작을 확인했습니다(2026-10-13). 실제 iPhone·Mac Safari 화면은 도메인 연결 후 한 번 더 확인합니다.

## Local preview

```bash
npx serve .
```

시몬스를 주제로 제작한 비공식 포트폴리오 리뉴얼 콘셉트입니다.
