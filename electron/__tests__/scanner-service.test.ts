// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// child_process mock
vi.mock('child_process', () => ({
  execFile: vi.fn(),
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
    it('실행 가능한 첫 번째 후보 경로를 반환한다', () => {
      vi.spyOn(fs, 'accessSync').mockImplementation((p) => {
        if (String(p).includes('resources')) return;
        throw new Error('ENOENT');
      });

      const result = service.findNaps2Path();

      expect(result).toContain('NAPS2.Console.exe');
      expect(result).toContain('resources');
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
    it('NAPS2 경로가 없으면 에러를 throw한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => { throw new Error('ENOENT'); });

      await expect(service.listDevices()).rejects.toThrow('NAPS2 not found');
    });

    it('NAPS2 stdout을 파싱하여 디바이스 목록을 반환한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, 'Canon DR-C225\nEpson ES-50\n', '');
        return {} as any;
      });

      const devices = await service.listDevices();

      expect(devices).toEqual([
        { name: 'Canon DR-C225', driver: 'twain' },
        { name: 'Epson ES-50', driver: 'twain' },
      ]);
    });

    it('NAPS2 실행 에러 시 에러를 전파한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(new Error('exec failed'), '', 'TWAIN error');
        return {} as any;
      });

      await expect(service.listDevices()).rejects.toThrow('Failed to list devices: TWAIN error');
    });

    it('빈 stdout이면 빈 배열을 반환한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '\n', '');
        return {} as any;
      });

      const devices = await service.listDevices();
      expect(devices).toEqual([]);
    });

    it('NAPS2_DATA 환경변수가 설정되어야 한다', async () => {
      vi.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        (callback as Function)(null, '', '');
        return {} as any;
      });

      await service.listDevices();

      const callArgs = mockExecFile.mock.calls[0][1] as string[];
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

      const callArgs = mockExecFile.mock.calls[0][1] as string[];
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
});
