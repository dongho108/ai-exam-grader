// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execFile, execFileSync } from 'child_process';

// Electron app 모듈 mock
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'temp') return '/tmp';
      if (name === 'userData') return '/tmp/test-userdata';
      return '/tmp';
    }),
    getAppPath: vi.fn(() => '/fake/app'),
  },
}));

// child_process mock
vi.mock('child_process', () => ({
  execFile: vi.fn(),
  execFileSync: vi.fn(),
}));

// process.resourcesPath mock
Object.defineProperty(process, 'resourcesPath', {
  value: '/fake/resources',
  writable: true,
  configurable: true,
});

import { ScannerService } from '../scanner-service';

describe('ScannerService - 단위 테스트', () => {
  let service: ScannerService;

  beforeEach(() => {
    service = new ScannerService();
    vi.clearAllMocks();
  });

  describe('isAvailable()', () => {
    it('Windows가 아닌 플랫폼에서는 windows-only를 반환한다', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

      const result = service.isAvailable();

      expect(result).toEqual({ available: false, reason: 'windows-only' });
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('Windows에서 NAPS2를 찾지 못하면 naps2-not-found를 반환한다', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      vi.spyOn(fs, 'accessSync').mockImplementation(() => { throw new Error('ENOENT'); });

      const result = service.isAvailable();

      expect(result).toEqual({ available: false, reason: 'naps2-not-found' });
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('Windows에서 NAPS2가 존재하면 available: true와 경로를 반환한다', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});

      const result = service.isAvailable();

      expect(result.available).toBe(true);
      expect(result.path).toBeDefined();
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });
  });

  describe('findNaps2Path()', () => {
    it('실행 가능한 첫 번째 후보 경로를 찾아 쓰기 가능한 위치로 반환한다', () => {
      vi.spyOn(fs, 'accessSync').mockImplementation((p) => {
        if (String(p).includes('resources')) return;
        throw new Error('ENOENT');
      });

      const result = service.findNaps2Path();

      expect(result).toContain('NAPS2.Console.exe');
      // ensureWritableNaps2에 의해 naps2-app 경로로 변환됨
      expect(result).toContain('naps2-app');
    });

    it('모든 후보 경로가 실패하면 null을 반환한다', () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => { throw new Error('ENOENT'); });

      const result = service.findNaps2Path();

      expect(result).toBeNull();
    });

    it('캐시된 경로가 있으면 재탐색 없이 반환한다', () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});

      const first = service.findNaps2Path();
      const accessSpy = vi.spyOn(fs, 'accessSync');
      accessSpy.mockClear();

      const second = service.findNaps2Path();

      expect(second).toBe(first);
      expect(accessSpy).not.toHaveBeenCalled();
    });
  });

  describe('listDevices()', () => {
    it('NAPS2 경로가 없으면 에러 객체를 반환한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => { throw new Error('ENOENT'); });

      const result = await service.listDevices();

      expect(result.devices).toEqual([]);
      expect(result.error?.type).toBe('unknown');
      expect(result.error?.message).toContain('NAPS2 not found');
    });

    it('TWAIN에서 디바이스가 있으면 WIA를 시도하지 않고 결과를 반환한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, 'Canon DR-C225\nEpson ES-50\n', '');
        return {} as any;
      });

      const result = await service.listDevices();

      expect(result.devices).toEqual([
        { name: 'Canon DR-C225', driver: 'twain' },
        { name: 'Epson ES-50', driver: 'twain' },
      ]);
      expect(result.error).toBeUndefined();
      // execFile은 1번만 호출 (TWAIN만)
      expect(mockExecFile).toHaveBeenCalledTimes(1);
    });

    it('TWAIN에서 빈 배열이면 WIA로 재시도한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const mockExecFile = vi.mocked(execFile);
      let callCount = 0;
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callCount++;
        const args = _args as string[];
        if (args.includes('twain')) {
          (callback as Function)(null, '\n', '');
        } else {
          (callback as Function)(null, 'WIA Scanner Device\n', '');
        }
        return {} as any;
      });

      const result = await service.listDevices();

      expect(result.devices).toEqual([
        { name: 'WIA Scanner Device', driver: 'wia' },
      ]);
      expect(mockExecFile).toHaveBeenCalledTimes(2);
    });

    it('WIA 결과의 driver 속성이 wia이다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const args = _args as string[];
        if (args.includes('twain')) {
          (callback as Function)(null, '', '');
        } else {
          (callback as Function)(null, 'My WIA Scanner\n', '');
        }
        return {} as any;
      });

      const result = await service.listDevices();

      expect(result.devices[0].driver).toBe('wia');
    });

    it('TWAIN과 WIA 모두 빈 배열이면 { devices: [] }를 반환한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '\n', '');
        return {} as any;
      });

      const result = await service.listDevices();

      expect(result.devices).toEqual([]);
      expect(result.error).toBeUndefined();
      expect(mockExecFile).toHaveBeenCalledTimes(2);
    });

    it('권한 에러(UnauthorizedAccessException) 시 WIA로 fallback하지 않고 즉시 에러를 반환한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(
          new Error('exec failed'),
          '',
          'UnauthorizedAccessException: Access to the path is denied.'
        );
        return {} as any;
      });

      const result = await service.listDevices();

      expect(result.devices).toEqual([]);
      expect(result.error?.type).toBe('permission');
      expect(result.error?.message).toContain('권한');
      // 권한 에러는 terminal — execFile 1번만 호출
      expect(mockExecFile).toHaveBeenCalledTimes(1);
    });

    it('마지막 성공 드라이버를 캐싱하여 다음 호출 시 먼저 시도한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const mockExecFile = vi.mocked(execFile);

      // 첫 번째 호출: TWAIN 빈 → WIA 성공
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const args = _args as string[];
        if (args.includes('twain')) {
          (callback as Function)(null, '', '');
        } else {
          (callback as Function)(null, 'WIA Device\n', '');
        }
        return {} as any;
      });
      await service.listDevices();

      // 두 번째 호출: WIA를 먼저 시도해야 함
      mockExecFile.mockClear();
      const callOrder: string[] = [];
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const args = _args as string[];
        const driver = args[args.indexOf('--driver') + 1];
        callOrder.push(driver);
        if (driver === 'wia') {
          (callback as Function)(null, 'WIA Device\n', '');
        } else {
          (callback as Function)(null, '', '');
        }
        return {} as any;
      });
      await service.listDevices();

      expect(callOrder[0]).toBe('wia'); // WIA 먼저 시도
      expect(mockExecFile).toHaveBeenCalledTimes(1); // WIA 성공이므로 1번만
    });

    it('TWAIN 에러(non-permission) 시 WIA로 fallback한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const args = _args as string[];
        if (args.includes('twain')) {
          (callback as Function)(new Error('TWAIN driver error'), '', 'TWAIN init failed');
        } else {
          (callback as Function)(null, 'Fallback WIA Scanner\n', '');
        }
        return {} as any;
      });

      const result = await service.listDevices();

      expect(result.devices).toEqual([
        { name: 'Fallback WIA Scanner', driver: 'wia' },
      ]);
      expect(mockExecFile).toHaveBeenCalledTimes(2);
    });

    it('타임아웃은 5초로 설정된다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, 'Device\n', '');
        return {} as any;
      });

      await service.listDevices();

      const opts = mockExecFile.mock.calls[0][2] as Record<string, unknown>;
      expect(opts.timeout).toBe(5000);
    });

    it('NAPS2_DATA 환경변수가 설정되어야 한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '', '');
        return {} as any;
      });

      await service.listDevices();

      const envOpt = mockExecFile.mock.calls[0][2] as Record<string, unknown>;
      expect((envOpt.env as Record<string, string>).NAPS2_DATA).toBe(path.join('/tmp/test-userdata', 'naps2-data'));
    });
  });

  describe('scan()', () => {
    it('동시 스캔을 방지한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const mockExecFile = vi.mocked(execFile);
      // 절대 완료하지 않는 스캔
      mockExecFile.mockImplementation(() => ({}) as any);

      // isScanning 플래그를 수동으로 설정
      (service as any).isScanning = true;

      await expect(service.scan()).rejects.toThrow('A scan is already in progress');
    });

    it('잘못된 DPI를 거부한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});

      await expect(service.scan({ dpi: 50 })).rejects.toThrow('Invalid DPI');
      await expect(service.scan({ dpi: 2000 })).rejects.toThrow('Invalid DPI');
      await expect(service.scan({ dpi: 100.5 })).rejects.toThrow('Invalid DPI');
    });

    it('잘못된 colorMode를 거부한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});

      await expect(service.scan({ colorMode: 'rainbow' as any })).rejects.toThrow('Invalid colorMode');
    });

    it('잘못된 source를 거부한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});

      await expect(service.scan({ source: 'magic' as any })).rejects.toThrow('Invalid source');
    });

    it('잘못된 format을 거부한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});

      await expect(service.scan({ format: 'gif' as any })).rejects.toThrow('Invalid format');
    });

    it('scan 실행 시 NAPS2_DATA 환경변수가 설정되어야 한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'statSync').mockReturnValue({ size: 1024 } as any);
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '', '');
        return {} as any;
      });

      await service.scan({ format: 'jpeg' });

      const envOpt = mockExecFile.mock.calls[0][2] as Record<string, unknown>;
      expect((envOpt.env as Record<string, string>).NAPS2_DATA).toBe(path.join('/tmp/test-userdata', 'naps2-data'));
    });

    it('device 옵션이 있으면 --device 인자를 추가한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'statSync').mockReturnValue({ size: 1024 } as any);
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '', '');
        return {} as any;
      });

      await service.scan({ device: 'Canon DR-C225', format: 'jpeg' });

      const callArgs = mockExecFile.mock.calls[0][1] as string[];
      expect(callArgs).toContain('--device');
      expect(callArgs).toContain('Canon DR-C225');
    });

    it('driver: wia이면 --driver wia 인자가 전달된다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'statSync').mockReturnValue({ size: 1024 } as any);
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '', '');
        return {} as any;
      });

      await service.scan({ driver: 'wia', format: 'jpeg' });

      const callArgs = mockExecFile.mock.calls[0][1] as string[];
      expect(callArgs[callArgs.indexOf('--driver') + 1]).toBe('wia');
    });

    it('driver 미지정이면 기본 twain을 사용한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'statSync').mockReturnValue({ size: 1024 } as any);
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '', '');
        return {} as any;
      });

      await service.scan({ format: 'jpeg' });

      const callArgs = mockExecFile.mock.calls[0][1] as string[];
      expect(callArgs[callArgs.indexOf('--driver') + 1]).toBe('twain');
    });

    it('driver 미지정 시 lastSuccessfulDriver를 사용한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'statSync').mockReturnValue({ size: 1024 } as any);
      const mockExecFile = vi.mocked(execFile);

      // listDevices에서 WIA로 성공시켜 lastSuccessfulDriver를 wia로 설정
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const args = _args as string[];
        if (args.includes('--listdevices')) {
          if (args.includes('twain')) {
            (callback as Function)(null, '', '');
          } else {
            (callback as Function)(null, 'WIA Scanner\n', '');
          }
        } else {
          (callback as Function)(null, '', '');
        }
        return {} as any;
      });
      await service.listDevices();

      // scan 호출 시 wia를 사용해야 함
      mockExecFile.mockClear();
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '', '');
        return {} as any;
      });

      await service.scan({ format: 'jpeg' });

      const callArgs = mockExecFile.mock.calls[0][1] as string[];
      expect(callArgs[callArgs.indexOf('--driver') + 1]).toBe('wia');
    });

    it('driver 미지정 + 첫 드라이버 실패 시 대체 드라이버로 재시도한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'statSync').mockReturnValue({ size: 1024 } as any);
      const mockExecFile = vi.mocked(execFile);

      let scanCallCount = 0;
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const args = _args as string[];
        // listdevices 호출은 디바이스 반환
        if (args.includes('--listdevices')) {
          (callback as Function)(null, 'Test Scanner\n', '');
          return {} as any;
        }
        scanCallCount++;
        const driverIdx = args.indexOf('--driver');
        const driver = driverIdx >= 0 ? args[driverIdx + 1] : '';
        if (driver === 'twain') {
          (callback as Function)(new Error('TWAIN driver error'), '', 'TWAIN init failed');
        } else {
          (callback as Function)(null, '', '');
        }
        return {} as any;
      });

      const result = await service.scan({ format: 'jpeg' });

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('mimeType');
      expect(scanCallCount).toBe(2); // TWAIN 실패 + WIA 재시도
    });

    it('driver 명시 시 fallback하지 않는다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      const mockExecFile = vi.mocked(execFile);

      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const args = _args as string[];
        if (args.includes('--listdevices')) {
          (callback as Function)(null, 'Test Scanner\n', '');
          return {} as any;
        }
        (callback as Function)(new Error('TWAIN error'), '', 'TWAIN init failed');
        return {} as any;
      });

      await expect(service.scan({ driver: 'twain', format: 'jpeg' })).rejects.toThrow();
      // listdevices 1회 + scan 1회 = 2회 (scan fallback 없음)
      const scanCalls = mockExecFile.mock.calls.filter(
        call => !(call[1] as string[]).includes('--listdevices')
      );
      expect(scanCalls).toHaveLength(1);
    });

    it('권한 에러 시 fallback하지 않는다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      const mockExecFile = vi.mocked(execFile);

      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const args = _args as string[];
        if (args.includes('--listdevices')) {
          (callback as Function)(null, 'Test Scanner\n', '');
          return {} as any;
        }
        (callback as Function)(new Error('scan error'), '', 'UnauthorizedAccessException: Access denied');
        return {} as any;
      });

      await expect(service.scan({ format: 'jpeg' })).rejects.toThrow('스캐너 접근 권한이 없습니다');
      const scanCalls = mockExecFile.mock.calls.filter(
        call => !(call[1] as string[]).includes('--listdevices')
      );
      expect(scanCalls).toHaveLength(1);
    });

    it('타임아웃 시 fallback하지 않는다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      const mockExecFile = vi.mocked(execFile);

      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const args = _args as string[];
        if (args.includes('--listdevices')) {
          (callback as Function)(null, 'Test Scanner\n', '');
          return {} as any;
        }
        const err = new Error('killed') as any;
        err.killed = true;
        (callback as Function)(err, '', '');
        return {} as any;
      });

      await expect(service.scan({ format: 'jpeg' })).rejects.toThrow('timed out');
      const scanCalls = mockExecFile.mock.calls.filter(
        call => !(call[1] as string[]).includes('--listdevices')
      );
      expect(scanCalls).toHaveLength(1);
    });

    it('listDevices 후 scan 시 캐시된 디바이스명을 --device로 전달한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'statSync').mockReturnValue({ size: 1024 } as any);
      const mockExecFile = vi.mocked(execFile);

      // listDevices에서 WIA로 디바이스 발견
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const args = _args as string[];
        if (args.includes('--listdevices')) {
          if (args.includes('twain')) {
            (callback as Function)(null, '', '');
          } else {
            (callback as Function)(null, 'Cached WIA Scanner\n', '');
          }
        } else {
          (callback as Function)(null, '', '');
        }
        return {} as any;
      });
      await service.listDevices();

      // scan 시 캐시된 디바이스명이 전달되어야 함
      mockExecFile.mockClear();
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '', '');
        return {} as any;
      });

      await service.scan({ format: 'jpeg' });

      // listdevices 재호출 없이 바로 scan (캐시 사용)
      const scanCall = mockExecFile.mock.calls.find(
        call => !(call[1] as string[]).includes('--listdevices')
      );
      const scanArgs = scanCall![1] as string[];
      expect(scanArgs).toContain('--device');
      expect(scanArgs[scanArgs.indexOf('--device') + 1]).toBe('Cached WIA Scanner');
    });

    it('device 미지정 시 자동으로 첫 번째 디바이스를 감지하여 --device 인자를 추가한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'statSync').mockReturnValue({ size: 1024 } as any);
      const mockExecFile = vi.mocked(execFile);

      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const args = _args as string[];
        if (args.includes('--listdevices')) {
          (callback as Function)(null, 'Auto Detected Scanner\n', '');
        } else {
          (callback as Function)(null, '', '');
        }
        return {} as any;
      });

      await service.scan({ format: 'jpeg' });

      // scan 호출 (listdevices가 아닌) 에서 --device 인자 확인
      const scanCall = mockExecFile.mock.calls.find(
        call => !(call[1] as string[]).includes('--listdevices')
      );
      const scanArgs = scanCall![1] as string[];
      expect(scanArgs).toContain('--device');
      expect(scanArgs[scanArgs.indexOf('--device') + 1]).toBe('Auto Detected Scanner');
    });

    it('scan() 중 권한 에러 시 사용자 안내 메시지를 포함한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);

      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(new Error('scan error'), '', 'UnauthorizedAccessException: Access denied');
        return {} as any;
      });

      await expect(service.scan({ format: 'jpeg' })).rejects.toThrow('스캐너 접근 권한이 없습니다');
    });

    it('NAPS2가 stderr 없이 stdout으로 에러를 출력하면 stdout이 에러 메시지에 포함된다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);

      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        // NAPS2는 에러를 stdout으로 출력하고 stderr는 비어있음
        (callback as Function)(
          new Error('Command failed'),
          'No device was specified. Either use "--profile" to specify a profile with a device, or use "--device" to choose a particular device.',
          '',
        );
        return {} as any;
      });

      await expect(service.scan({ driver: 'wia', format: 'jpeg' })).rejects.toThrow('No device was specified');
    });
  });

  describe('readScanFile()', () => {
    it('tempDir 밖의 파일 접근을 거부한다', () => {
      expect(() => service.readScanFile('/etc/passwd')).toThrow('Access denied');
    });

    it('존재하지 않는 파일에 대해 에러를 throw한다', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const tempDir = path.join('/tmp', 'ai-exam-grader-scan');

      expect(() => service.readScanFile(path.join(tempDir, 'test.jpg'))).toThrow('Scan file not found');
    });

    it('파일을 base64로 읽어 반환한다', () => {
      const tempDir = path.join('/tmp', 'ai-exam-grader-scan');
      const testContent = Buffer.from('test-image-data');
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(testContent);

      const result = service.readScanFile(path.join(tempDir, 'test.jpg'));

      expect(result).toBe(testContent.toString('base64'));
    });
  });

  describe('cleanupScanFile()', () => {
    it('tempDir 밖의 파일 삭제를 거부한다', () => {
      expect(() => service.cleanupScanFile('/etc/passwd')).toThrow('Access denied');
    });

    it('존재하는 파일을 삭제한다', () => {
      const tempDir = path.join('/tmp', 'ai-exam-grader-scan');
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      service.cleanupScanFile(path.join(tempDir, 'test.jpg'));

      expect(unlinkSpy).toHaveBeenCalled();
    });
  });

  describe('cleanup()', () => {
    it('임시 디렉토리가 없으면 아무것도 하지 않는다', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const rmdirSpy = vi.spyOn(fs, 'rmdirSync').mockImplementation(() => {});

      service.cleanup();

      expect(rmdirSpy).not.toHaveBeenCalled();
    });

    it('임시 디렉토리 내 모든 파일을 삭제한다', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['a.jpg', 'b.pdf'] as any);
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
      vi.spyOn(fs, 'rmdirSync').mockImplementation(() => {});

      service.cleanup();

      expect(unlinkSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('ensureWritableNaps2()', () => {
    it('항상 쓰기 가능한 위치(naps2-app)로 복사한다', () => {
      const copySpy = vi.spyOn(fs, 'copyFileSync').mockImplementation(() => {});
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
        if (String(p).includes('.version')) return '8.2.1' as any;
        return '' as any;
      });
      vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
        const s = String(p);
        // 원본 exe → 존재
        if (s.includes('resources') && s.includes('NAPS2.Console.exe')) return true;
        // 원본 appsettings.xml → 존재
        if (s.includes('resources') && s.includes('appsettings.xml')) return true;
        // 번들 .version → 존재
        if (s.includes('naps2') && s.endsWith('.version') && !s.includes('naps2-app')) return true;
        // 복사본 → 아직 없음
        if (s.includes('naps2-app')) return false;
        // naps2DataDir → 없음
        return false;
      });
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});

      const result = service.findNaps2Path();

      expect(result).toContain('naps2-app');
      expect(result).toContain('NAPS2.Console.exe');
      expect(copySpy).toHaveBeenCalled();
      expect(mkdirSpy).toHaveBeenCalled();
    });

    it('버전 일치 시 기존 복사본을 재사용한다', () => {
      const copySpy = vi.spyOn(fs, 'copyFileSync').mockImplementation(() => {});
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
        if (String(p).includes('.version')) return '8.2.1' as any;
        return '' as any;
      });
      vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
        const s = String(p);
        // .version 파일들 → 존재
        if (s.endsWith('.version')) return true;
        // 복사본 exe와 lib 모두 존재
        if (s.includes('naps2-app') && s.includes('NAPS2.Console.exe')) return true;
        if (s.includes('naps2-app') && s.endsWith('lib')) return true;
        return true;
      });
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});

      const result = service.findNaps2Path();

      expect(result).toContain('naps2-app');
      // 버전 일치이므로 복사하지 않음
      expect(copySpy).not.toHaveBeenCalled();
    });

    it('버전 불일치 시 기존 복사본을 제거하고 재생성한다', () => {
      const copySpy = vi.spyOn(fs, 'copyFileSync').mockImplementation(() => {});
      const rmSpy = vi.spyOn(fs, 'rmSync').mockImplementation(() => {});
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
        const s = String(p);
        // 번들 버전: 8.3.0
        if (s.includes('naps2') && s.endsWith('.version') && !s.includes('naps2-app')) return '8.3.0' as any;
        // 복사본 버전: 8.2.1
        if (s.includes('naps2-app') && s.endsWith('.version')) return '8.2.1' as any;
        return '' as any;
      });
      vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
        const s = String(p);
        if (s.endsWith('.version')) return true;
        // 원본 exe → 존재
        if (s.includes('resources') && s.includes('NAPS2.Console.exe')) return true;
        if (s.includes('resources') && s.includes('appsettings.xml')) return true;
        // 복사본 → rmSync 후 없음
        if (s.includes('naps2-app')) return false;
        return false;
      });
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});

      const result = service.findNaps2Path();

      expect(result).toContain('naps2-app');
      expect(rmSpy).toHaveBeenCalled();
      expect(copySpy).toHaveBeenCalled();
    });
  });

  describe('listDevices() - 에러 전파', () => {
    it('양쪽 드라이버 모두 실패하면 에러 정보를 반환한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
        if (String(p).includes('.version')) return '8.2.1' as any;
        return '' as any;
      });
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const err = new Error('driver error');
        (err as any).killed = false;
        (callback as Function)(err, '', 'Some error');
        return {} as any;
      });

      const result = await service.listDevices();

      expect(result.devices).toEqual([]);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('unknown');
    });

    it('양쪽 드라이버가 빈 결과(에러 없음)이면 에러 없이 빈 배열을 반환한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
        if (String(p).includes('.version')) return '8.2.1' as any;
        return '' as any;
      });
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '\n', '');
        return {} as any;
      });
      // USB 감지도 빈 결과
      vi.mocked(execFileSync).mockReturnValue('[]');

      const result = await service.listDevices();

      expect(result.devices).toEqual([]);
      expect(result.error).toBeUndefined();
    });
  });

  describe('detectUsbScanners()', () => {
    it('Canon ONTOUCHL.exe가 있는 이동식 드라이브를 감지한다', async () => {
      vi.mocked(execFileSync).mockReturnValue(JSON.stringify({
        DeviceID: 'E:',
        VolumeName: 'ONTOUCHLITE',
      }));
      vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
        const s = String(p);
        if (s.includes('ONTOUCHL.exe')) return true;
        if (s.includes('TOUCHDRL.ini')) return true;
        return false;
      });
      vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
        if (String(p).includes('TOUCHDRL.ini')) return '[Launcher]\nScanner=R30' as any;
        return '' as any;
      });

      const devices = await service.detectUsbScanners();

      expect(devices).toHaveLength(1);
      expect(devices[0].driver).toBe('usb-drive');
      expect(devices[0].name).toContain('Canon');
      expect(devices[0].name).toContain('R30');
      expect(devices[0].driveLetter).toBe('E:');
      expect(devices[0].onTouchLitePath).toContain('ONTOUCHL.exe');
    });

    it('Canon ONTOUCH.exe(정식 버전)가 있는 이동식 드라이브를 감지한다', async () => {
      vi.mocked(execFileSync).mockReturnValue(JSON.stringify({
        DeviceID: 'F:',
        VolumeName: 'CAPTUREOT',
      }));
      vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
        const s = String(p);
        if (s.includes('ONTOUCHL.exe')) return false; // Lite는 없음
        if (s.includes('ONTOUCH.exe')) return true;   // 정식 버전
        return false;
      });

      const devices = await service.detectUsbScanners();

      expect(devices).toHaveLength(1);
      expect(devices[0].driver).toBe('usb-drive');
      expect(devices[0].name).toContain('Canon');
      expect(devices[0].driveLetter).toBe('F:');
      expect(devices[0].onTouchLitePath).toContain('ONTOUCH.exe');
    });

    it('이미지 파일이 있는 이동식 드라이브를 감지한다', async () => {
      vi.mocked(execFileSync).mockReturnValue(JSON.stringify({
        DeviceID: 'F:',
        VolumeName: 'SCANNER',
      }));
      vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
        if (String(p).includes('ONTOUCHL.exe')) return false;
        return false;
      });
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'scan001.jpg', isFile: () => true, isDirectory: () => false },
        { name: 'scan002.pdf', isFile: () => true, isDirectory: () => false },
      ] as any);

      const devices = await service.detectUsbScanners();

      expect(devices).toHaveLength(1);
      expect(devices[0].driver).toBe('usb-drive');
      expect(devices[0].hasImageFiles).toBe(true);
      expect(devices[0].driveLetter).toBe('F:');
    });

    it('이동식 디스크가 없으면 빈 배열을 반환한다', async () => {
      vi.mocked(execFileSync).mockReturnValue('[]');

      const devices = await service.detectUsbScanners();

      expect(devices).toEqual([]);
    });
  });

  describe('importFromFolder()', () => {
    it('폴더에서 이미지 파일을 검색하여 temp에 복사한다', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => true } as any);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      const copySpy = vi.spyOn(fs, 'copyFileSync').mockImplementation(() => {});
      vi.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'page1.jpg', isFile: () => true, isDirectory: () => false },
        { name: 'page2.png', isFile: () => true, isDirectory: () => false },
        { name: 'readme.txt', isFile: () => true, isDirectory: () => false },
        { name: 'subfolder', isFile: () => false, isDirectory: () => true },
      ] as any);

      const result = service.importFromFolder('/some/folder');

      expect(result.files).toHaveLength(2);
      expect(result.files[0].mimeType).toBe('image/jpeg');
      expect(result.files[1].mimeType).toBe('image/png');
      expect(copySpy).toHaveBeenCalledTimes(2);
    });

    it('존재하지 않는 폴더면 에러를 throw한다', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      expect(() => service.importFromFolder('/invalid/path')).toThrow('Invalid folder path');
    });
  });

  describe('launchOnTouchLite()', () => {
    it('유효하지 않은 경로면 에러를 throw한다', () => {
      expect(() => service.launchOnTouchLite('/some/malicious.exe')).toThrow('Invalid OnTouch path');
    });

    it('ONTOUCHL.exe가 존재하지 않으면 에러를 throw한다', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      expect(() => service.launchOnTouchLite('E:\\ONTOUCHL.exe')).toThrow('OnTouch Lite not found');
    });
  });

  describe('importFromDrive()', () => {
    it('잘못된 드라이브 문자면 에러를 throw한다', () => {
      expect(() => service.importFromDrive('invalid')).toThrow('Invalid drive letter');
      expect(() => service.importFromDrive('../hack:')).toThrow('Invalid drive letter');
    });
  });
});
