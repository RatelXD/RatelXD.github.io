# RatelXD의 작업실

[ratelxd.github.io](https://ratelxd.github.io/)에서 운영하는 클라우드 보안 포트폴리오입니다. 바탕화면의 탐색기에서 프로젝트, 학습 노트, 대외활동 폴더를 열 수 있습니다. 파일을 선택하고 Space를 누르면 미리보기가 열립니다. 전체 검색은 ⌘K 또는 Ctrl+K로 엽니다. [패킷 실습실](https://ratelxd.github.io/lab/)에서는 목적지 IP에 따라 라우팅 표의 어느 행이 선택되는지 실험할 수 있습니다.

Eleventy가 Markdown 원고를 HTML로 만들고, `main`에 변경이 들어오면 GitHub Actions가 빌드와 Pages 배포를 진행합니다.

## 새 기록 올리기

학습 노트는 `src/notes/`, 프로젝트는 `src/projects/`, 대외활동은 `src/activities/`에 Markdown 파일을 추가합니다. 파일 이름이 주소가 됩니다. 예를 들어 `src/notes/vpc-flow-logs.md`는 `/notes/vpc-flow-logs/`로 공개됩니다. GitHub 웹에서도 같은 폴더에서 파일을 추가할 수 있습니다.

```markdown
---
title: VPC 흐름 로그 읽기
description: 흐름 로그 한 줄에서 출발지와 목적지를 구별하는 방법.
topic: 네트워크
date: 2026-11-20
---

본문을 씁니다.

## 흐름 로그에서 읽을 필드

두 번째 수준 제목은 글의 목차에 자동으로 표시됩니다.
```

날짜는 기록에 맞게 바꿉니다. 행사일이나 프로젝트 시작일을 표시하려면 `dateLabel: 행사일`처럼 날짜의 의미를 지정할 수 있습니다. 홈에서 고정할 파일은 `src/_data/site.json`의 `pinned` 배열에 공개 주소를 순서대로 넣습니다. 각 폴더에는 글이 날짜순으로 표시됩니다.

## 스크린샷과 영상

이미지를 `src/assets/media/글이름/`에 넣고 본문에서 불러옵니다. 본문에 단독으로 놓인 이미지는 원본 크기로 열 수 있습니다.

```markdown
![흐름 로그에 표시된 출발지와 목적지](/assets/media/vpc-flow-logs/flow-log.webp)
```

글 하단에 유튜브 영상을 넣으려면 위쪽 메타데이터에 아래 두 값을 추가합니다. `youtubeId`에는 영상 주소의 `v=` 뒤에 오는 실제 ID를 넣습니다.

```yaml
video:
  youtubeId: "영상 ID"
  title: 흐름 로그 읽기 시연
```

짧은 영상 파일은 `youtubeId` 대신 `src`로 연결합니다. 자막이 있으면 `captions`에 한국어 WebVTT 파일 경로를 넣습니다.

```yaml
video:
  src: /assets/media/vpc-flow-logs/demo.mp4
  type: video/mp4
  title: 흐름 로그 읽기 시연
  captions: /assets/media/vpc-flow-logs/demo.ko.vtt
```

## 로컬 미리보기

Node.js 22 이상에서 실행합니다. 배포 환경은 Node.js 24를 사용합니다.

```sh
npm ci
npm run dev
```

`npm run build`는 공개할 파일을 `_site/`에 만듭니다. 배포 진행 상태는 저장소의 **Actions → Publish journal**에서 확인할 수 있습니다.

## 사진과 서체

바탕화면은 eimoberg가 찍은 지리산 사진을 가로·세로 화면에 맞게 잘라 사용합니다. [원본 사진](https://commons.wikimedia.org/wiki/File:Korea-Mountain-Jirisan-01.jpg) · [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/)

탐색기의 계정 사진은 RatelXD의 GitHub 아바타입니다. 한글 글꼴은 Pretendard를 자체 호스팅합니다. 사진과 서체의 라이선스는 `src/assets/licenses/`와 `src/assets/fonts/`에 있습니다.
