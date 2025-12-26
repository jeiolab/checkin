# PWA 설정 가이드

## 아이콘 생성

PWA가 제대로 작동하려면 다음 아이콘 파일이 필요합니다:

1. `public/icon-192.png` (192x192 픽셀)
2. `public/icon-512.png` (512x512 픽셀)

### 아이콘 생성 방법

1. 온라인 도구 사용:
   - [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)

2. 직접 생성:
   - 512x512 픽셀의 정사각형 이미지 준비
   - 능주고등학교 로고나 출석부 관련 아이콘 사용
   - `icon-192.png`와 `icon-512.png`로 저장
   - `public/` 폴더에 배치

## 빌드 및 배포

1. 개발 모드:
   ```bash
   npm run dev
   ```

2. 프로덕션 빌드:
   ```bash
   npm run build
   ```

3. 미리보기:
   ```bash
   npm run preview
   ```

## PWA 테스트

1. **Chrome DevTools**:
   - F12 → Application 탭
   - Manifest 확인
   - Service Workers 확인

2. **모바일 테스트**:
   - HTTPS 환경에서 테스트 (localhost는 예외)
   - "홈 화면에 추가" 옵션 확인
   - 오프라인 모드 테스트

## 주요 기능

- ✅ 홈 화면에 추가 가능
- ✅ 오프라인 지원 (Service Worker)
- ✅ 모바일 반응형 디자인
- ✅ 터치 최적화
- ✅ iOS Safari 지원

