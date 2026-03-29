# USB 저장장치 방식 스캐너 통합

> **날짜**: 2026-03-29
> **배경**: Canon imageFORMULA R30이 TWAIN/WIA로 감지되지 않음
> **해결**: USB 드라이브 스캐너 감지 + Canon ONTOUCHL.exe 연동

---

## 문제: TWAIN/WIA가 전부가 아니다

Canon imageFORMULA R시리즈(R10, R30, R40, R50) 등 휴대용 스캐너는 TWAIN/WIA 프로토콜을 사용하지 않는다. 대신:

1. 스캐너 자체 버튼으로 스캔 → 내부 메모리에 저장
2. USB로 PC 연결 → **이동식 디스크(USB Mass Storage)**로 마운트
3. 전용 소프트웨어로 데이터 추출

이런 스캐너는 Windows 장치 관리자에서 `DiskDrive` 클래스로 나타나며, `Image` 클래스(WIA)가 아니다.

---

## Canon R30의 USB 드라이브 구조

```
E:\ (볼륨명: ONTOUCHLITE)
├── ONTOUCHL.exe      ← Capture OnTouch Lite (554KB, 자동실행)
├── INDATA.dat        ← 스캔 데이터 (Canon 독자 포맷, 2MB)
├── transfer.dat      ← 전송 데이터 (독자 포맷, 2MB)
├── SYSTEM.dat        ← 시스템 설정
├── TOUCHDRL.ini      ← 설정 파일 (Scanner=R30 등 모델명 포함)
├── autorun.inf       ← ONTOUCHL.exe 자동실행 설정
└── manual.url        ← 매뉴얼 링크
```

**핵심**: 스캔 데이터가 JPEG/PDF가 아닌 **독자 포맷(.dat)**이므로 직접 읽을 수 없다. `ONTOUCHL.exe`만 이 데이터를 이미지로 변환할 수 있다.

---

## 설계 결정

### 범용 + Canon 특화 2단계 접근

```
이동식 디스크 감지
  ├── ONTOUCHL.exe 존재? → Canon 모드
  │   └── ONTOUCHL.exe 실행 → 사용자가 이미지 저장 → 폴더에서 가져오기
  │
  └── 이미지 파일 존재? → 일반 USB 모드
      └── 드라이브에서 직접 이미지 파일 가져오기
```

### Canon 모델명 자동 감지

`TOUCHDRL.ini`의 `Scanner=R30` 필드에서 모델명을 추출한다. 볼륨명 `ONTOUCHLITE`로도 Canon임을 식별할 수 있지만, 정확한 모델명은 INI 파일이 더 신뢰할 수 있다.

### 디바이스 통합 목록

TWAIN/WIA 스캐너와 USB 드라이브 스캐너를 하나의 `listDevices()` 결과로 합친다:

```typescript
interface ScannerDevice {
  name: string;
  driver: 'twain' | 'wia' | 'usb-drive';  // ← 'usb-drive' 추가
  driveLetter?: string;
  onTouchLitePath?: string;
  hasImageFiles?: boolean;
}
```

---

## 교훈

### 1. 스캐너 ≠ TWAIN/WIA

"스캐너 지원"을 구현할 때 TWAIN/WIA만 고려하면 USB 저장장치 방식 스캐너를 놓친다. 특히 교육 현장에서 많이 사용하는 Canon R시리즈가 이 방식이다.

### 2. 독자 포맷은 전용 소프트웨어에 위임하라

Canon의 `.dat` 포맷을 리버스 엔지니어링하는 것보다 `ONTOUCHL.exe`에 위임하는 것이 현실적이다. 사용자가 이미 익숙한 워크플로우(OnTouch Lite → 이미지 저장)를 활용하면 된다.

### 3. `checkAvailability`와 `listDevices`를 분리하지 마라

NAPS2가 없어도 USB 스캐너는 사용 가능하다. `checkAvailability()`가 `false`를 반환하면 `listDevices()`를 호출하지 않는 로직 때문에 USB 스캐너가 아예 감지되지 않는 문제가 있었다. **항상 디바이스 목록을 조회**하도록 수정했다.

### 4. USB 디바이스 식별은 WMI를 활용하라

Windows에서 이동식 디스크를 프로그래밍적으로 감지하려면:

```powershell
Get-WmiObject Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 }
```

`DriveType` 값:
- `2`: Removable (USB 드라이브, SD 카드 등)
- `3`: Local Disk
- `5`: Compact Disc

Node.js에서는 `execFileSync('powershell', [...])` + `ConvertTo-Json`으로 파싱한다.

### 5. 보안 검증을 잊지 마라

USB 드라이브에서 실행 파일을 실행하거나 파일을 읽을 때:
- `launchOnTouchLite()`: 파일명이 `ONTOUCHL.exe`인지 검증
- `importFromDrive()`: 드라이브 문자 형식(`/^[A-Z]:$/`) 검증
- `importFromFolder()`: 가져온 파일은 반드시 `tempDir`로 복사 후 사용 (기존 보안 게이트 재활용)
