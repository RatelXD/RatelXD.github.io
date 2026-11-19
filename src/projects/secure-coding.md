---
title: 중고 거래 서비스의 권한 설계
description: 상품 소유권과 채팅방 참여 권한을 기준으로 Django 중고 거래 플랫폼의 설계와 테스트를 살펴봅니다.
topic: 시큐어 코딩
date: 2026-06-27
dateLabel: 저장소 개설
imageWidth: 1440
imageHeight: 900
image: /assets/media/secure-coding-report.webp
imageAlt: 중고 거래 플랫폼 과제 보고서의 목차와 테스트 기록 안내 화면
---
중고 거래 서비스에서는 로그인한 두 사람에게 서로 다른 일을 허용해야 한다. 판매자는 자기 상품의 가격을 바꿀 수 있고, 구매 희망자는 판매자와 만든 채팅방에 들어갈 수 있다. 이 시큐어 코딩 과제는 이런 조건을 Django 애플리케이션의 권한 검사와 테스트로 옮긴 작업이다. [프로젝트 저장소](https://github.com/RatelXD/secure-coding)

<figure>
  <img src="/assets/media/secure-coding-report.webp" alt="요구사항, 시스템 설계, 구현과 테스트 장으로 연결되는 시큐어 코딩 보고서 첫 화면" width="1440" height="900" loading="lazy">
  <figcaption>공개 과제 보고서의 첫 화면. 각 요구사항에 대응하는 구현과 테스트 기록을 찾아볼 수 있습니다.</figcaption>
</figure>

## 상품을 바꿀 수 있는 사람

상품 상세 페이지는 여러 사람이 열어볼 수 있다. 수정과 삭제를 처리할 때는 서버에서 요청한 사용자가 상품의 소유자인지 다시 확인한다. 공개 점검표에는 다른 회원의 상품을 바꾸려는 요청을 거부하는 테스트와, 서로 다른 수정이 겹쳤을 때 버전 충돌을 확인한 기록이 있다. [권한 점검표와 테스트 결과](https://github.com/RatelXD/secure-coding/blob/main/docs/report/04-checklist-and-testing.md)

## 채팅방에 들어갈 수 있는 사람

채팅은 WebSocket을 열고 한동안 연결을 유지한다. 서버는 연결할 때 사용자를 인증하고 요청 출처를 확인한다. 메시지를 처리할 때도 방 참여 자격과 계정의 현재 상태를 다시 본다. 점검표에는 참여하지 않은 방으로의 접근, 휴면 계정의 메시지 수신을 다룬 항목이 있다.

공개 보고서는 요구사항, 시스템 설계, 구현, 테스트를 각각 한 장씩 다룬다. 권한이 실제 기능에 어떻게 반영됐는지 보려면 ‘체크리스트와 테스트’ 장에서 상품 관리나 채팅 항목을 먼저 읽으면 된다. [한국어 과제 보고서](https://ratelxd.github.io/secure-coding/)
