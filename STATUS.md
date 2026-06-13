<!-- 프로젝트 현재 상태와 남은 작업을 정리한 스윕 문서 -->
# STATUS — 08_CAPSTONE (capstone-2026)

## 목적 (Purpose)

원광대학교 인공지능융합학과 전석호의 개인 소개 / 캡스톤 프로젝트용 정적 웹페이지다.
현재는 자기소개, 학력, 진행 중인 캡스톤 프로젝트, 연락처를 담은 단일 `index.html` 한 장으로 구성되어 있다.

## 현재 상태 (Current State)

- 저장소 종류는 **정적 웹 페이지(static HTML)** 이며 빌드 도구·패키지 매니저·테스트가 전혀 없다.
- 파일 구성은 다음과 같다.
  - `index.html` (3271 bytes) — 인라인 `<style>`을 포함한 완성된 단일 랜딩 페이지.
  - `CLAUDE.md` (0 bytes) — **빈 파일이다.** 내용이 없으며 용도가 명시되어 있지 않다.
- git 히스토리는 커밋 1개(`feat: 원광대 인공지능융합학과 전석호 홈페이지 생성 및 초기화`)뿐이다.
- 원격은 `origin` = `github.com/saintgo7/capstone-2026.git` 이다. (이번 스윕에서는 push하지 않는다.)
- 트리아지 단계에서 사전 변경(WIP)된 파일은 0개였다.

## 동작하는 것 vs 안 되는 것 (What works / What doesn't)

### 동작 (검증된 사실)
- `index.html`은 구조적으로 정상이다. DOCTYPE 선언, `<meta charset>`·viewport 메타, `<head>`/`<body>` 구조가 갖춰져 있고 태그 개폐 균형이 맞는다(grep 기반 태그 카운트로 확인).
- 브라우저로 열면 헤더, 소개·학력·프로젝트·연락처 4개 섹션, 푸터가 표시되는 1페이지 포트폴리오로 렌더링되도록 작성되어 있다(코드 정독으로 확인). 단, 실제 브라우저 렌더링은 이번 스윕에서 직접 띄워 확인하지 않았다 — **렌더링 시각 확인은 unverified.**

### 미완성 / 한계
- 콘텐츠가 골격뿐이다. 프로젝트 섹션은 "진행 중인 캡스톤 프로젝트입니다." 한 줄 플레이스홀더이고 실제 캡스톤 결과물·기술 스택·데모 링크가 없다.
- `CLAUDE.md`가 빈 파일이다. 의도(프로젝트 가이드라인 자리표시인지, 실수로 생성된 것인지)가 불명확하다 — **unverified.** 삭제하지 않고 그대로 둔다.
- 자동화된 테스트·린트·HTML validator·CI가 없다.
- 외부 폰트(`Noto Sans KR`)를 `font-family`로만 지정하고 `<link>`로 로드하지 않아, 시스템에 폰트가 없으면 `Malgun Gothic`/sans-serif로 폴백된다(의도일 수 있으나 문서화함).

## 끝내기 위한 구체적 남은 단계 (Remaining steps)

1. 캡스톤 프로젝트의 실제 주제·목표·기술 스택·결과물을 프로젝트 섹션에 채운다.
2. (선택) `CLAUDE.md`에 프로젝트 가이드라인을 채우거나, 불필요하면 사용자 확인 후 정리한다.
3. (선택) Google Fonts `<link>`를 추가해 `Noto Sans KR` 웹폰트를 명시적으로 로드한다.
4. (선택) GitHub Pages 등 배포 설정. 배포는 외부 영향이므로 사용자 명시 요청 시에만 진행한다.
5. (선택) HTML validator(W3C) 또는 간단한 정적 점검을 CI로 붙인다.

## 빌드/테스트 평가 (Build/test evidence)

- 빌드/테스트 커맨드: **N/A.** package.json·Makefile·테스트 스위트가 없다.
- 수행한 점검: `index.html` 태그 개폐 균형 확인(grep), 파일 크기 확인(`wc -c`). 구조적 결함은 발견되지 않았다.
- 이번 스윕에서 코드 변경은 하지 않았다(추가한 것은 본 `STATUS.md` 뿐). 따라서 회귀 위험 없음.

## 책/논문 가능성 (Book/Paper potential)

해당 없음(none). 정적 자기소개 페이지로, 연구·서술형 콘텐츠가 없어 책/논문 산출물의 토대가 되지 않는다.
캡스톤 프로젝트가 실제로 진행되어 본 저장소에 연구·구현 내용이 쌓이면 그때 재평가할 수 있다.

---

## English Summary

**Purpose.** A single-page static HTML portfolio/landing page for a Wonkwang University AI Convergence student (Jeon Seok-ho), tied to a 2026 capstone project.

**Current state.** Barely started. Two files: `index.html` (a complete, structurally valid single-page site with inline CSS) and an **empty** `CLAUDE.md` (0 bytes). No package manager, no tests, no build system, no CI. Git history is a single initial commit.

**What works.** `index.html` is well-formed (valid DOCTYPE, meta tags, balanced tags — verified via tag-count grep) and is written to render a four-section portfolio. Actual in-browser visual rendering was not launched this sweep (unverified).

**What doesn't / is incomplete.** Content is skeletal — the Projects section is a one-line placeholder with no real capstone deliverable. `CLAUDE.md` is empty with unclear intent (left untouched). External font is named but not loaded via `<link>`.

**Remaining steps.** Fill in real capstone content; decide on `CLAUDE.md`; optionally add a Google Fonts link, deployment (GitHub Pages, only on explicit request), and an HTML validator in CI.

**Build/test.** N/A — no build or test tooling exists. Only structural sanity checks were run; no code was changed this sweep (only this STATUS.md added).

**Book/paper potential.** None — a static profile page with no research/narrative content.
