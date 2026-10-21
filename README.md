# 영수증 QR Wi-Fi 인증 MVP

매장에서 관리자가 QR을 발급하고 고객이 스캔해 일회성 토큰을 인증하는 웹 MVP입니다.

## 중요

현재 버전은 QR 발급·토큰 검증·이용시간 기록을 테스트하는 프로토타입입니다. 공유기/게이트웨이 연동 전에는 실제 인터넷 접속을 허용하거나 차단하지 않습니다. 실제 네트워크 제어 기능이 구현됐다고 간주하면 안 됩니다.

## 기술 스택

- Node.js 20+
- Express
- QRCode
- 관리자용 세션 쿠키
- 토큰 상태를 저장하는 로컬 JSON 파일(로컬 테스트용)

## 실행

1. Node.js 20 이상 설치
2. `.env.example`을 `.env`로 복사
3. `ADMIN_PASSWORD`(16자 이상)와 `COOKIE_SECRET`(32자 이상)을 설정
4. `npm install`
5. `npm start`
6. `http://localhost:3000` 열기

`.env`와 `data/`는 저장소에 커밋하지 마세요. 이 프로토타입을 공개 인터넷에 배포하기 전에 영속 데이터베이스, HTTPS, CSRF 방어, 토큰 저장 방식, 관리자 인증 및 네트워크 게이트웨이 연동을 추가 검토해야 합니다.


## 실제 네트워크 연동 계획

현재 앱은 실제 인터넷을 허용하거나 차단하지 않습니다. OpenWrt/openNDS 게이트웨이 연동 구조, 보안 요구사항, 검증 절차는 [`docs/REAL_NETWORK_INTEGRATION.md`](docs/REAL_NETWORK_INTEGRATION.md)를 참고하세요. 이 문서는 연동 완료를 의미하지 않으며, LG U+ GAPD-7300 호환성은 아직 확인되지 않았습니다.

추가 구매 없이 가능한 확인 절차는 [`docs/NO_PURCHASE_TEST_PLAN.md`](docs/NO_PURCHASE_TEST_PLAN.md)에 정리했습니다. GAPD-7300 설정은 변경하지 않는 방향입니다.
