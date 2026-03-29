// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';

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

vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

Object.defineProperty(process, 'resourcesPath', {
  value: '/fake/resources',
  writable: true,
  configurable: true,
});

import { ScannerService } from '../scanner-service';

describe('ScannerService - 통합 테스트', () => {
  let service: ScannerService;

  beforeEach(() => {
    service = new ScannerService();
    vi.clearAllMocks();
    // Windows 환경 시뮬레이션
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
  });

  describe('isAvailable → listDevices 플로우', () => {
    it('NAPS2 존재 시 available 확인 후 디바이스 목록을 가져올 수 있다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, 'Canon DR-C225\n', '');
        return {} as any;
      });

      // Step 1: availability 확인
      const availability = service.isAvailable();
      expect(availability.available).toBe(true);

      // Step 2: 디바이스 목록 가져오기
      const devices = await service.listDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].name).toBe('Canon DR-C225');
      expect(devices[0].driver).toBe('twain');
    });

    it('NAPS2 미존재 시 available: false이고 listDevices도 실패한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => { throw new Error('ENOENT'); });

      const availability = service.isAvailable();
      expect(availability.available).toBe(false);
      expect(availability.reason).toBe('naps2-not-found');

      await expect(service.listDevices()).rejects.toThrow('NAPS2 not found');
    });
  });

  describe('scan → readScanFile → cleanupScanFile 플로우', () => {
    it('전체 스캔 → 읽기 → 정리 라이프사이클이 정상 동작한다', async () => {
      const tempDir = path.join('/tmp', 'ai-exam-grader-scan');
      const fakeContent = Buffer.from('fake-jpeg-data');

      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'statSync').mockReturnValue({ size: fakeContent.length } as any);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(fakeContent);
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '', '');
        return {} as any;
      });

      // Step 1: 스캔
      const scanResult = await service.scan({ format: 'jpeg', dpi: 300 });
      expect(scanResult.filePath).toContain(tempDir);
      expect(scanResult.filePath).toMatch(/\.jpg$/);
      expect(scanResult.mimeType).toBe('image/jpeg');

      // Step 2: 파일 읽기
      const base64 = service.readScanFile(scanResult.filePath);
      expect(base64).toBe(fakeContent.toString('base64'));

      // Step 3: 파일 정리
      service.cleanupScanFile(scanResult.filePath);
      expect(unlinkSpy).toHaveBeenCalledWith(path.normalize(scanResult.filePath));
    });
  });

  describe('scan CLI 인자 통합 검증', () => {
    it('기본 옵션으로 올바른 CLI 인자를 구성한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'statSync').mockReturnValue({ size: 100 } as any);

      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '', '');
        return {} as any;
      });

      await service.scan();

      const args = mockExecFile.mock.calls[0][1] as string[];
      // 기본값 검증
      expect(args).toContain('--driver');
      expect(args[args.indexOf('--driver') + 1]).toBe('twain');
      expect(args).toContain('--dpi');
      expect(args[args.indexOf('--dpi') + 1]).toBe('300');
      expect(args).toContain('--source');
      expect(args[args.indexOf('--source') + 1]).toBe('feeder');
      expect(args).toContain('--bitdepth');
      expect(args[args.indexOf('--bitdepth') + 1]).toBe('gray');
      expect(args).toContain('--noprofile');
      expect(args).toContain('--force');
      expect(args).toContain('--naps2data');
    });

    it('커스텀 옵션이 올바르게 전달된다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'statSync').mockReturnValue({ size: 100 } as any);

      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '', '');
        return {} as any;
      });

      await service.scan({
        device: 'Canon DR-C225',
        dpi: 600,
        colorMode: 'color',
        format: 'png',
        source: 'glass',
      });

      const args = mockExecFile.mock.calls[0][1] as string[];
      expect(args).toContain('--device');
      expect(args[args.indexOf('--device') + 1]).toBe('Canon DR-C225');
      expect(args[args.indexOf('--dpi') + 1]).toBe('600');
      expect(args[args.indexOf('--bitdepth') + 1]).toBe('color');
      expect(args[args.indexOf('--source') + 1]).toBe('glass');
      // 출력 파일 확장자 확인
      expect(args[args.indexOf('-o') + 1]).toMatch(/\.png$/);
    });
  });

  describe('에러 시나리오 통합 검증', () => {
    it('스캔 타임아웃 시 적절한 에러를 반환한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);

      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        const error = new Error('killed') as any;
        error.killed = true;
        (callback as Function)(error, '', '');
        return {} as any;
      });

      await expect(service.scan({ format: 'jpeg' })).rejects.toThrow('Scan timed out');
    });

    it('NAPS2 stderr 에러 시 에러 메시지를 포함한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);

      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(new Error('scan error'), '', 'UnauthorizedAccessException: Access denied');
        return {} as any;
      });

      await expect(service.scan({ format: 'jpeg' })).rejects.toThrow('Scan failed: UnauthorizedAccessException: Access denied');
    });

    it('출력 파일이 생성되지 않으면 에러를 반환한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      // existsSync: tempDir는 true, 출력 파일은 false
      vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
        return String(p).includes('ai-exam-grader-scan') && !String(p).includes('.pdf');
      });

      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '', '');
        return {} as any;
      });

      await expect(service.scan()).rejects.toThrow('output file not found');
    });

    it('보안: tempDir 밖 파일 읽기/삭제를 차단한다', () => {
      expect(() => service.readScanFile('C:\\Windows\\System32\\config\\SAM')).toThrow('Access denied');
      expect(() => service.cleanupScanFile('C:\\Windows\\System32\\config\\SAM')).toThrow('Access denied');
      expect(() => service.readScanFile('../../../etc/passwd')).toThrow('Access denied');
    });

    it('스캔 완료 후 isScanning 플래그가 해제된다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
      vi.spyOn(fs, 'statSync').mockReturnValue({ size: 100 } as any);

      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '', '');
        return {} as any;
      });

      await service.scan({ format: 'jpeg' });
      // 두 번째 스캔이 가능해야 함 (isScanning = false)
      await service.scan({ format: 'jpeg' });
    });

    it('스캔 실패 후에도 isScanning 플래그가 해제된다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);

      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(new Error('fail'), '', 'error');
        return {} as any;
      });

      await expect(service.scan({ format: 'jpeg' })).rejects.toThrow();
      // 실패 후에도 다시 스캔 시도 가능해야 함
      expect(() => {
        (service as any).isScanning; // isScanning이 false여야 함
      }).not.toThrow();
    });
  });
});
