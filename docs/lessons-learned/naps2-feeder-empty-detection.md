# NAPS2 ADF 피더 빈 용지 감지 실패

> **날짜**: 2026-03-31
> **영향**: ADF 스캔 완료 후 "알 수 없는 에러" 메시지가 사용자에게 표시됨 (기능상 문제는 없음)
> **증상**: 시험지 스캔이 정상 완료되었으나 콘솔에 `Scan failed: Command failed: NAPS2.Console.exe ...` 에러 로그 출력

---

## 근본 원인 (2가지 복합)

### 1. `execScanProcess`가 stdout을 에러 메시지에서 누락

NAPS2는 에러를 **stdout**으로 출력하지만 (참고: `naps2-scan-driver-and-device-mismatch.md`), `execScanProcess`의 에러 처리가 `stderr || error.message`만 사용했다. stderr가 비어있으면 Node.js의 제네릭 `Command failed: <전체 커맨드>` 메시지만 전파되어, 실제 NAPS2 에러 내용(예: "No documents in feeder")이 유실됨.

```typescript
// Before
const errorText = stderr || error.message;

// After — stdout 포함
const errorText = stderr || stdout || error.message;
```

### 2. 피더 빈 용지 감지 패턴 부족

배치 스캔 루프(`use-batch-scan.ts`)가 `no-more-pages`만 체크했지만, NAPS2/WIA/TWAIN 드라이버는 피더 종료 시 다양한 메시지를 출력한다. 또한 stdout이 유실되는 상황에서는 어떤 키워드도 매칭되지 않아 "알 수 없는 에러"로 분류됨.

**해결**:
1. 다양한 피더 종료 패턴 추가: `no documents`, `feeder empty`, `out of paper`, `no paper`, `adf empty` 등
2. **휴리스틱 추가**: ADF 피더 모드에서 1장 이상 성공적으로 스캔한 후 `command failed`가 발생하면, 용지 소진으로 간주하여 에러 없이 정상 종료

```typescript
const isFeederExhausted = mergedScanOptions.source === 'feeder'
  && currentPageCount > 0
  && lowerMessage.includes('command failed')
```

---

## 핵심 교훈

| 항목 | 교훈 |
|------|------|
| **stdout 누락은 반복된다** | `naps2-scan-driver-and-device-mismatch.md`에서 이미 "NAPS2는 stdout으로 에러를 출력"한다고 기록했으나, `execScanProcess`의 에러 경로에서 동일한 실수가 남아있었다. 교훈을 기록하는 것과 모든 코드 경로에 적용하는 것은 별개다 |
| **ADF 종료는 에러가 아니다** | ADF 피더가 빈 것은 정상적인 스캔 종료 조건이지만, NAPS2 CLI는 이를 exit code 1 (에러)로 반환한다. 외부 프로세스의 "정상 종료"가 항상 exit code 0이 아닐 수 있다 |
| **휴리스틱 방어** | 외부 CLI의 에러 메시지 형식을 완전히 통제할 수 없으므로, 키워드 매칭 외에 컨텍스트 기반 휴리스틱(피더 모드 + 이미 스캔 성공 + 일반 실패 = 용지 소진)이 필요하다 |

---

## 수정된 파일

- `electron/scanner-service.ts` — `execScanProcess` 에러 처리에 stdout 포함
- `features/scanner/hooks/use-batch-scan.ts` — 피더 빈 용지 감지 패턴 확장 + 휴리스틱 추가
- `electron/__tests__/scanner-service.test.ts` — stdout 에러 전파 테스트 추가
- `features/scanner/hooks/__tests__/use-batch-scan.test.ts` — 피더 종료 감지 시나리오 4개 추가
