import { app } from 'electron';
import { execFile, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const VALID_DPI_RANGE = { min: 75, max: 1200 };
const VALID_COLOR_MODES = ['color', 'gray', 'bw'] as const;
const VALID_SOURCES = ['glass', 'feeder', 'duplex'] as const;
const VALID_FORMATS = ['pdf', 'jpeg', 'png'] as const;

const FORMAT_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

interface ScanOptions {
  device?: string;
  dpi?: number;
  colorMode?: typeof VALID_COLOR_MODES[number];
  format?: typeof VALID_FORMATS[number];
  source?: typeof VALID_SOURCES[number];
}

interface ScanResult {
  filePath: string;
  mimeType: string;
}

interface ScannerDevice {
  name: string;
  driver: 'twain' | 'wia';
}

interface ScannerAvailability {
  available: boolean;
  reason?: 'windows-only' | 'naps2-not-found';
  path?: string;
}

export class ScannerService {
  private cachedNaps2Path: string | null = null;
  private isScanning = false;
  private currentProcess: ChildProcess | null = null;

  private get tempDir(): string {
    return path.join(app.getPath('temp'), 'ai-exam-grader-scan');
  }

  /**
   * NAPS2 Console 실행 파일 경로를 탐색한다.
   * Program Files 내에 있는지 검증하여 보안을 확보한다.
   */
  findNaps2Path(): string | null {
    if (this.cachedNaps2Path) return this.cachedNaps2Path;

    const candidates = [
      path.join(process.resourcesPath, 'naps2', 'App', 'NAPS2.Console.exe'),
      path.join(app.getAppPath(), 'resources', 'naps2', 'App', 'NAPS2.Console.exe'),
      path.join('C:', 'Program Files', 'NAPS2', 'NAPS2.Console.exe'),
      path.join('C:', 'Program Files (x86)', 'NAPS2', 'NAPS2.Console.exe'),
    ];

    const trustedPrefixes = [
      process.resourcesPath,
      path.join(app.getAppPath(), 'resources'),
      'C:\\Program Files\\',
      'C:\\Program Files (x86)\\',
    ];

    for (const candidate of candidates) {
      try {
        const normalized = path.normalize(candidate);
        const isTrusted = trustedPrefixes.some(prefix =>
          normalized.startsWith(path.normalize(prefix))
        );
        if (!isTrusted) {
          continue;
        }
        fs.accessSync(normalized, fs.constants.X_OK);
        this.cachedNaps2Path = normalized;
        return normalized;
      } catch {
        // 파일 없음 → 다음 후보
      }
    }

    return null;
  }

  /**
   * NAPS2 사용 가능 여부를 확인한다.
   */
  isAvailable(): ScannerAvailability {
    if (process.platform !== 'win32') {
      return { available: false, reason: 'windows-only' };
    }

    const naps2Path = this.findNaps2Path();
    if (!naps2Path) {
      return { available: false, reason: 'naps2-not-found' };
    }

    return { available: true, path: naps2Path };
  }

  /**
   * 연결된 스캐너 목록을 반환한다.
   */
  listDevices(): Promise<ScannerDevice[]> {
    return new Promise((resolve, reject) => {
      const naps2Path = this.findNaps2Path();
      if (!naps2Path) {
        return reject(new Error('NAPS2 not found'));
      }

      const args = ['--listdevices', '--driver', 'twain'];

      execFile(naps2Path, args, { timeout: 10000 }, (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`Failed to list devices: ${stderr || error.message}`));
        }

        const devices: ScannerDevice[] = stdout
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((name) => ({ name, driver: 'twain' as const }));

        resolve(devices);
      });
    });
  }

  /**
   * 스캔을 실행하고 임시 파일 경로를 반환한다.
   */
  async scan(options: ScanOptions = {}): Promise<ScanResult> {
    if (this.isScanning) {
      throw new Error('A scan is already in progress');
    }

    const naps2Path = this.findNaps2Path();
    if (!naps2Path) {
      throw new Error('NAPS2 not found');
    }

    // 옵션 검증
    const dpi = options.dpi ?? 300;
    if (!Number.isInteger(dpi) || dpi < VALID_DPI_RANGE.min || dpi > VALID_DPI_RANGE.max) {
      throw new Error(`Invalid DPI: ${dpi}. Must be integer between ${VALID_DPI_RANGE.min}-${VALID_DPI_RANGE.max}`);
    }

    const colorMode = options.colorMode ?? 'gray';
    if (!VALID_COLOR_MODES.includes(colorMode)) {
      throw new Error(`Invalid colorMode: ${colorMode}`);
    }

    const source = options.source ?? 'feeder';
    if (!VALID_SOURCES.includes(source)) {
      throw new Error(`Invalid source: ${source}`);
    }

    const format = options.format ?? 'pdf';
    if (!VALID_FORMATS.includes(format)) {
      throw new Error(`Invalid format: ${format}`);
    }

    // 임시 디렉토리 생성
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    const fileName = `${crypto.randomUUID()}.${format === 'jpeg' ? 'jpg' : format}`;
    const tempPath = path.join(this.tempDir, fileName);

    // CLI 인자 구성
    const args = [
      '-o', tempPath,
      '--driver', 'twain',
      '--dpi', String(dpi),
      '--source', source,
      '--bitdepth', colorMode,
      '--noprofile',
      '--force',
    ];

    if (options.device) {
      args.push('--device', options.device);
    }

    this.isScanning = true;

    try {
      await new Promise<void>((resolve, reject) => {
        this.currentProcess = execFile(
          naps2Path,
          args,
          { timeout: 120000 },
          (error, _stdout, stderr) => {
            this.currentProcess = null;
            if (error) {
              // 타임아웃으로 종료된 경우
              if (error.killed) {
                return reject(new Error('Scan timed out'));
              }
              return reject(new Error(`Scan failed: ${stderr || error.message}`));
            }

            // 출력 파일 존재 확인
            if (!fs.existsSync(tempPath)) {
              return reject(new Error('Scan completed but output file not found'));
            }

            resolve();
          }
        );
      });

      return {
        filePath: tempPath,
        mimeType: FORMAT_TO_MIME[format] || 'application/octet-stream',
      };
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * 임시 스캔 파일을 base64로 읽는다.
   */
  readScanFile(filePath: string): string {
    // 보안: tempDir 내의 파일만 허용
    const normalized = path.normalize(filePath);
    if (!normalized.startsWith(this.tempDir)) {
      throw new Error('Access denied: file is not in scan temp directory');
    }

    if (!fs.existsSync(normalized)) {
      throw new Error('Scan file not found');
    }

    return fs.readFileSync(normalized).toString('base64');
  }

  /**
   * 특정 임시 스캔 파일을 삭제한다.
   */
  cleanupScanFile(filePath: string): void {
    const normalized = path.normalize(filePath);
    if (!normalized.startsWith(this.tempDir)) {
      throw new Error('Access denied: file is not in scan temp directory');
    }

    try {
      if (fs.existsSync(normalized)) {
        fs.unlinkSync(normalized);
      }
    } catch {
      // 삭제 실패는 무시 (OS가 정리할 것)
    }
  }

  /**
   * 모든 임시 스캔 파일을 정리한다.
   */
  cleanup(): void {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(this.tempDir, file));
          } catch {
            // 개별 파일 삭제 실패 무시
          }
        }
        fs.rmdirSync(this.tempDir);
      }
    } catch {
      // 디렉토리 정리 실패 무시
    }
  }

  /**
   * 진행 중인 스캔 프로세스를 강제 종료한다.
   */
  killProcess(): void {
    if (this.currentProcess) {
      try {
        this.currentProcess.kill();
      } catch {
        // kill 실패 무시
      }
      this.currentProcess = null;
      this.isScanning = false;
    }
  }
}
