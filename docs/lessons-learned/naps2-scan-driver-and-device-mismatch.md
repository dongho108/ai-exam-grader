# NAPS2 스캔 실패 — 드라이버 불일치 및 디바이스 미지정 문제

> **날짜**: 2026-03-30
> **영향**: "스캐너로 스캔" 버튼 클릭 시 항상 실패 (`Scan failed: Command failed`)
> **증상**: NAPS2 CLI가 exit code 1로 종료, stderr는 비어 있고 stdout에 에러 메시지 출력

---

## 근본 원인 (3가지 복합)

### 1. 드라이버 기본값 하드코딩

`listDevices()`는 TWAIN 실패 시 WIA로 fallback하여 `lastSuccessfulDriver = 'wia'`를 저장하지만, `scan()` 메서드는 항상 `--driver twain`을 기본값으로 사용했다.

```typescript
// Before (하드코딩)
const driver = options.driver ?? 'twain';

// After (캐시 우선)
const driver = options.driver ?? this.lastSuccessfulDriver ?? 'twain';
```

### 2. NAPS2 v8.2.1에서 `--device` 필수

`--noprofile --force` 조합 사용 시 NAPS2가 자동으로 디바이스를 선택하지 않는다. `--device` 인자가 없으면:

```
No device was specified. Either use "--profile" to specify a profile with a device,
or use "--device" to choose a particular device (and "--listdevices" to see available choices).
```

**주의**: 이 에러 메시지는 **stderr가 아닌 stdout**으로 출력된다. `execFile` 콜백의 `stderr`가 비어 있으면 `error.message` (Node의 generic "Command failed: ...") 만 전파되어 디버깅이 어렵다.

**해결**: `listDevices()` 호출 시 발견한 디바이스명을 `lastDetectedDevice`에 캐시하고, `scan()`에서 캐시된 디바이스명을 `--device` 인자로 자동 전달.

### 3. Canon USB 드라이브 스캐너는 NAPS2가 아닌 별도 플로우 필요

Canon USB 드라이브 스캐너(OnTouch Lite/OnTouch)는 NAPS2 TWAIN/WIA로 인식되지 않는다. `listDevices()`에서 `driver: 'usb-drive'`로 감지되지만, `scan()`은 항상 NAPS2 CLI를 호출하여 실패했다.

**해결**: `answer-key-management.tsx`에서 디바이스 타입을 확인하여 분기:
- NAPS2 디바이스(TWAIN/WIA) → `scanner.scan()` (NAPS2 CLI)
- USB 드라이브 스캐너 → Canon OnTouch 실행 + `importFromFolder()`/`importFromDrive()`

---

## 핵심 교훈

| 항목 | 교훈 |
|------|------|
| **CLI 출력 채널** | NAPS2는 에러를 stdout으로 출력할 수 있다. `execFile` 에러 처리 시 `stderr`뿐 아니라 `stdout`도 확인해야 한다 |
| **드라이버 캐싱** | `listDevices()`와 `scan()`이 같은 드라이버/디바이스 정보를 공유하지 않으면, 감지는 되지만 스캔은 실패하는 혼란스러운 버그가 발생한다 |
| **디바이스 타입별 분기** | USB 드라이브 스캐너와 TWAIN/WIA 스캐너는 완전히 다른 스캔 플로우가 필요하다. UI에서 디바이스 타입에 따라 적절한 플로우를 선택해야 한다 |
| **Canon OnTouch 호환성** | Capture OnTouch Lite (`ONTOUCHL.exe`)와 정식 Capture OnTouch (`ONTOUCH.exe`) 두 가지 실행 파일을 모두 감지해야 한다 |

---

## 수정된 파일

- `electron/scanner-service.ts` — `scan()` 드라이버/디바이스 자동 감지, fallback 로직, `ONTOUCH.exe` 감지 추가
- `features/scanner/components/answer-key-management.tsx` — USB 드라이브 스캐너 전용 플로우 분기
- `electron/__tests__/scanner-service.test.ts` — 드라이버 fallback, 디바이스 캐시, OnTouch 정식 버전 테스트 추가
