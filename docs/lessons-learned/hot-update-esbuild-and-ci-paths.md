# Hot Update 도입 시 esbuild 번들링 및 CI path 필터 이슈

## 증상
1. GitHub Actions에서 `npm run electron:compile` 실패: `Could not resolve "@aws-sdk/client-s3"`
2. `tsconfig.json` 변경 커밋이 CI 워크플로우를 트리거하지 않음
3. Next.js 빌드에서 `electron/hot-update.ts`의 타입 에러 (`unzipper` 모듈 선언 파일 없음)

## 원인

### 1. unzipper의 숨겨진 AWS SDK 의존성
- `unzipper` 패키지의 `Open/index.js`가 S3에서 zip을 열기 위해 `@aws-sdk/client-s3`를 `require()`함
- 이 코드 경로는 실제로 사용하지 않지만, esbuild가 정적 분석으로 번들에 포함시키려 함
- `@aws-sdk/client-s3`는 설치되어 있지 않으므로 resolve 실패

**해결:** `scripts/build-electron.mjs`의 esbuild `external` 배열에 `'@aws-sdk/client-s3'` 추가

```javascript
external: ['electron', '@aws-sdk/client-s3'],
```

### 2. CI path 필터 누락
- `release-win.yml`과 `release-ui.yml`에 `paths:` 필터를 설정했으나, `tsconfig.json` 등 공통 설정 파일을 포함하지 않음
- 워크플로우 파일 자체(`.github/workflows/`)의 변경도 path 필터에 포함되지 않으면 CI가 트리거되지 않음

**해결:** 양쪽 워크플로우 paths에 `tsconfig.json` 추가. 워크플로우 파일 변경 시에는 수동 트리거(`workflow_dispatch`) 사용.

### 3. Next.js가 electron/ 디렉토리를 타입 체크
- `tsconfig.json`의 `include: ["**/*.ts"]`가 `electron/` 디렉토리도 포함
- `electron/hot-update.ts`에서 `import('unzipper')`를 사용하는데, `unzipper`에 타입 선언 파일이 없음
- Next.js 빌드 시 TypeScript 타입 체크에서 실패

**해결:** `tsconfig.json`의 `exclude`에 `"electron"` 추가. electron/ 코드는 esbuild로 별도 컴파일되므로 Next.js 타입 체크 대상에서 제외해도 안전.

## 교훈

1. **서드파티 라이브러리를 esbuild로 번들링할 때**, 해당 라이브러리의 선택적 의존성(optional require)도 정적 분석에 걸릴 수 있다. `external`로 제외하거나 try/catch로 감싸진 require인지 확인 필요.

2. **CI path 필터를 설정할 때**, `tsconfig.json`, `package.json`, `.eslintrc` 등 여러 빌드에 영향을 주는 공통 파일을 빠뜨리기 쉽다. 양쪽 워크플로우에 공통 설정 파일을 포함해야 함.

3. **Electron + Next.js 프로젝트에서**, `tsconfig.json`의 `include/exclude` 설정이 양쪽 빌드 시스템에 영향을 준다. electron/ 코드는 별도 빌드 파이프라인을 사용하므로 Next.js 타입 체크에서 제외하는 것이 올바름.
