---
title: S3 파일은 열리는데 목록은 왜 안 보일까?
description: 객체 한 개를 읽는 요청과 버킷의 목록을 가져오는 요청에 필요한 IAM 권한을 비교합니다.
topic: 접근 제어
date: 2026-11-20
---
같은 계정의 일반 S3 버킷에 `notes/vpc.md`가 있다고 하자. 앱은 정확한 키를 주면 이 파일을 잘 읽는데, 파일을 고르는 목록 화면을 열면 접근 거부가 뜬다. 두 화면에서 보내는 API 요청을 적어 보면 이유를 찾기 쉽다.

## 파일 한 개를 여는 요청

`GetObject`는 이름을 알고 있는 객체의 내용을 가져온다. 현재 버전을 읽는 예에서 IAM 작업은 `s3:GetObject`다. 버킷 이름이 `example-study-notes`라면 이 파일에 해당하는 리소스 ARN은 다음과 같다.

```text
arn:aws:s3:::example-study-notes/notes/vpc.md
```

역할에 이 작업과 리소스 조합을 허용하면 읽기 권한을 파일 한 개로 좁힐 수 있다. 다른 정책의 제한이 없고 별도의 KMS 권한도 필요 없는 객체를 가정했다. [AWS의 GetObject 권한 안내](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html)

## 목록은 버킷에 묻는다

파일 선택 화면은 보통 `ListObjectsV2`를 호출한다. 이때 정책에 적는 작업 이름은 `s3:ListBucket`이고, 리소스는 객체 키를 뺀 버킷이다.

```text
arn:aws:s3:::example-study-notes
```

목록을 허용해도 각 객체의 본문을 읽으려면 그 객체에 대한 읽기 권한이 필요하다. 반대로 파일 하나를 읽도록 허용한 정책만으로는 목록 화면을 채울 수 없다. 앱이 고정된 키 하나만 읽는다면 목록 권한을 추가할 이유도 없다. [AWS의 ListObjectsV2 권한 안내](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html)

## Allow가 있는데도 거절될 때

어떤 요청이 실패했는지부터 확인한다. 목록 요청이라면 버킷 ARN을, 파일 읽기라면 객체 ARN을 대조한다. 작업과 리소스가 맞는데 계속 거절된다면 해당 요청에 적용되는 명시적 `Deny`가 있는지 본다. 예를 들어 역할의 정책에 파일 읽기 `Allow`가 있어도 버킷 정책이 같은 요청을 명시적으로 거부하면 최종 결과는 거부다. [AWS의 정책 평가 순서](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)
