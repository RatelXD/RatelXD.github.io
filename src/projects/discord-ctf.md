---
title: 디스코드에서 CTF 진행 상황 모으기
description: 팀원이 맡은 문제와 도움 요청, 풀이 완료 상태를 기록하는 Python 기반 대회 운영 봇입니다.
topic: 운영 자동화
date: 2026-10-31
dateLabel: 저장소 개설
imageWidth: 2880
imageHeight: 720
image: /assets/media/ctf-workflow.png
imageAlt: 대회 설정, 참가, 문제별 작업, 풀이 완료의 네 단계
---
한 문제에 두 사람이 붙었을 때 한 명은 계속 풀고, 다른 한 명은 도움을 요청할 수 있다. 문제 전체에 상태 하나만 붙이면 이 차이가 사라진다. 이 디스코드 봇은 문제의 해결 여부와 참가자 각자의 작업 상태를 따로 기록한다. [프로젝트 저장소](https://github.com/RatelXD/ctf-management-bot)

<figure>
  <img src="/assets/media/ctf-workflow.png" alt="대회를 설정한 뒤 참가 버튼으로 입장하고 문제별로 작업 상태와 풀이 완료를 기록하는 흐름" width="2880" height="720" loading="lazy">
  <figcaption>대회 설정부터 풀이 완료까지. 프로젝트 README에 실린 사용 흐름입니다.</figcaption>
</figure>

## 문제 하나에 여러 사람이 붙을 때

참가자가 버튼을 누르면 대회 역할을 받고 문제 채널을 볼 수 있다. 채널에 들어온 팀원은 자신이 푸는 중인지, 도움이 필요한지 표시한다. 팀원 한 명이 작업을 멈춰도 다른 사람의 표시는 그대로 남는다.

문제를 해결하면 봇은 해결자를 기록하고 진행 중이던 작업 표시를 정리한다. 처음 문제를 등록한 사람과 해결한 사람이 달라도 두 기록을 구분할 수 있다. 이 동작은 저장소의 상태 전환 테스트에서 확인할 수 있다. [작업 상태와 풀이 완료 테스트](https://github.com/RatelXD/ctf-management-bot/blob/main/tests/test_core.py)

## 봇을 껐다 켜도 이어지는 기록

메시지와 버튼 처리는 Python의 `discord.py`가 맡고, 대회 기록은 SQLite에 저장한다. 운영 중에 봇을 다시 띄워도 기존 참가 버튼을 쓸 수 있다. 테스트에는 SQLite를 다시 열어 대회 상태를 읽는 경우와, 대회 두 개의 기록이 서로 섞이지 않는지 확인하는 경우가 들어 있다. [설치와 운영 문서](https://github.com/RatelXD/ctf-management-bot#readme)
