# RatelXD Notes

[ratelxd.github.io](https://ratelxd.github.io/)에서 운영하는 클라우드 보안 학습 노트와 작업 기록입니다. Eleventy가 Markdown 원고를 HTML로 만들고, `main`에 변경이 들어오면 GitHub Actions가 빌드와 Pages 배포를 진행합니다.

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

날짜는 기록에 맞게 바꿉니다. 행사일이나 프로젝트 시작일을 표시하려면 `dateLabel: 행사일`처럼 날짜의 의미를 지정할 수 있습니다. 홈의 표지 글은 `src/_data/site.json`의 `coverSlug`에서 고릅니다. 그 외 글은 날짜순으로 목록에 들어갑니다.

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

표지의 원본은 Jon “ShakataGaNai” Davis의 [Network switches](https://commons.wikimedia.org/wiki/File:Network_switches.jpg)입니다. 잘라 쓰거나 두 가지 잉크 색으로 표현한 사진에도 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)이 적용됩니다. 글꼴은 Instrument Serif, 나눔명조, Pretendard를 자체 호스팅합니다. 라이선스 원문은 `src/assets/fonts/`와 `src/assets/licenses/`에 있습니다.
