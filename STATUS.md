<!-- 인공지능융합학과 캡스톤 정적 웹사이트의 현재 상태와 남은 작업을 정리한 문서 -->
# STATUS — capstone-2026 (인공지능융합학과 홈페이지)

> 작성: 자동 포트폴리오 스윕 (claude/sweep-2026-06-13 브랜치). 본 문서의 모든 기술적 사실은 코드 정적 검사로 검증했고, 브라우저 런타임 검증은 수행하지 않았으므로 해당 부분은 "미검증"으로 표기한다.

## 목적 (Purpose)
대학 인공지능융합학과 소개용 정적 웹사이트다. 빌드 도구·백엔드 없이 순수 HTML/CSS/Vanilla JS로 구성되며, 데이터는 브라우저 `localStorage`에 저장한다. 공개 페이지(방문자용)와 관리자 패널(콘텐츠 CRUD)로 나뉜다.

## 프로젝트 유형
정적 프런트엔드 웹 앱 (빌드 시스템 없음, 의존성 없음, 서버 없음). `package.json`·README·테스트 프레임워크가 모두 없다. "완성"의 기준은 모든 페이지가 깨진 참조 없이 로드되고, 공개/관리자 기능이 동작하는 것이다.

## 구성 (Structure)
- 공개 페이지 5개: `index.html`(홈/통계 카운터), `program.html`(교수진·교육과정), `notices.html`(공지/검색/페이지네이션/모달), `gallery.html`(갤러리/라이트박스), `contact.html`(연락처).
- 공통 JS (`js/`): `data-store.js`(localStorage CRUD 추상화), `seed-data.js`(초기 시드 데이터 + 관리자 비밀번호 해시 초기화), `render-utils.js`(DOM 헬퍼·토스트·XSS escape), 페이지별 스크립트(`notices-page.js`, `gallery-page.js`, `contact-page.js`), 그리고 루트 `script.js`(홈·program 렌더링).
- 관리자 패널 (`admin/`): `login.html` + 페이지 5개(대시보드·공지·교수진·교육과정·갤러리 관리)와 대응 스크립트, `admin-common.js`(인증 가드·사이드바·로그아웃), `admin.css`.
- `images/`: 비어 있음. 갤러리는 외부 `picsum.photos` URL을 사용하므로 의도된 상태로 보인다 (미검증: 외부 이미지 로드).

## 동작하는 것 vs 안 하는 것 (검증 근거 포함)
### 검증으로 확인한 사실
- **JS 문법 전수 통과**: `node --check`로 13개 JS 파일(루트 1 + `js/` 6 + `admin/` 6) 전부 PASS. 문법 오류 없음.
- **스크립트 참조 무결성**: 모든 HTML의 `<script src>` 경로가 실제 존재하는 파일과 일치한다 (`grep` 대조). 깨진 스크립트 참조 없음.
- **요소 ID 정합성**: `gallery.html`/`notices.html`/`program.html`이 각 페이지 스크립트가 `getElementById`로 찾는 ID(예: `gallery-grid`, `notice-modal`, `prof-grid`, `curriculum-content`)를 모두 보유한다.
- **DataStore 일관성**: `_write`/`_read`가 `PREFIX('aiDept_')`를 일관되게 적용하고, `importAll`이 컬렉션 키를 그대로 `_write`에 전달하므로 export→import 왕복이 키 정합적이다.

### 미검증 (브라우저 런타임 미실행)
- 통계 카운터 애니메이션(IntersectionObserver), 공지 모달/페이지네이션, 갤러리 라이트박스 키보드 내비게이션, 관리자 로그인 흐름, export/import, 비밀번호 변경 — 모두 코드상으로는 완결되어 있으나 실제 브라우저 동작은 검증하지 않았다.

### 빌드/테스트
- 자동화된 테스트·빌드 파이프라인이 **없다**(na). `node --check` 정적 검사로 대체했으며 전부 통과했다.

## 알려진 한계 / 위험 (코드 변경 없이 기록만)
- **인증은 클라이언트 전용이다.** 관리자 비밀번호는 SHA-256 해시로 `localStorage`(`aiDept_admin`)에 저장되고 기본값이 `admin1234`로 하드코딩되어 있다(`seed-data.js`). 인증 상태는 `sessionStorage` 플래그뿐이라 누구나 콘솔에서 우회 가능하다. 데모/캡스톤 용도로는 무방하나 실서비스 보안은 제공하지 않는다. 보안 강화는 백엔드 도입을 수반하는 범위 외 변경이라 수정하지 않고 기록만 한다.
- **데이터가 브라우저 로컬에만 존재한다.** 기기·브라우저 간 공유가 안 되고, `localStorage` 삭제 시 시드값으로 되돌아간다. 다중 사용자/영속 저장이 필요하면 백엔드·DB가 필요하다.
- 갤러리 이미지가 외부 `picsum.photos`에 의존하므로 오프라인·차단 환경에서는 깨질 수 있다.

## 완성까지 남은 구체적 단계 (Concrete remaining steps)
1. 브라우저(또는 헤드리스)로 5개 공개 페이지 + 6개 관리자 페이지를 실제 로드해 런타임 동작을 검증한다. (현재 미검증 항목 해소)
2. 필요 시 로컬 정적 서버로 스모크 테스트(예: `python3 -m http.server`)를 수동 실행한다. 단, 본 스윕에서는 서버 기동이 시간 초과·hang 위험이라 실행하지 않았다.
3. 실배포 의도가 있으면 인증·데이터 영속을 위한 백엔드 설계를 별도 작업으로 분리한다(범위 외).
4. (선택) `images/`를 비워둘지 로컬 자산으로 채울지 결정한다.

---

## English Summary
Static department website (Korean university "AI Convergence Dept.") built with plain HTML/CSS/vanilla JS, no build system, no backend; data lives in browser `localStorage`. It has 5 public pages and a 6-page admin panel with content CRUD.

**Verified by static checks:** all 13 JS files pass `node --check`; every `<script src>` resolves to a real file; HTML element IDs match what each page script queries; `DataStore` key handling is consistent across export/import.

**Not verified:** no runtime/browser execution was performed (counter animation, modals, lightbox, admin login, export/import, password change are code-complete but unverified at runtime). There are no automated tests or build pipeline (na) — static syntax checking was used instead.

**Known limitations (documented, not changed):** auth is client-side only with a hardcoded default password `admin1234` (SHA-256 in localStorage) and a bypassable sessionStorage flag — fine for a capstone demo, not for production; data is browser-local only; gallery relies on external picsum.photos images.

**Remaining to "finish":** load all 11 pages in a real browser to confirm runtime behavior; if production is intended, design a backend for auth/persistence as separate, out-of-scope work.

## 문서/보고서 작성 가능성 (Documentation outline)
연구 논문 소재는 아니지만(프런트엔드 데모), 캡스톤 결과 보고서/기술 문서로는 작성 가능하다. 이미 존재하는 자료로 채울 수 있는 절 구성은 다음과 같다.
1. 개요 — 학과 소개 사이트 목적·범위 (자료: `index.html` 학과 소개·비전 섹션).
2. 시스템 구조 — 공개/관리자 분리, 무빌드 vanilla JS, localStorage 데이터 계층 (자료: `js/data-store.js`, 본 STATUS의 구성 절).
3. 데이터 모델 — professors·curriculum·stats·notices·gallery·contact 스키마 (자료: `js/seed-data.js` 시드 정의).
4. 기능별 구현 — 공지 검색/페이지네이션/모달, 갤러리 라이트박스, 통계 카운터 애니메이션, 관리자 CRUD·export/import (자료: 각 페이지 스크립트).
5. 보안·한계 논의 — 클라이언트 전용 인증의 한계와 백엔드 도입 시 개선안 (자료: 본 STATUS 한계 절).
6. 향후 과제 — 백엔드/DB, 인증 강화, 자산 로컬화, 자동 테스트 도입 (자료: 본 STATUS 남은 단계).
