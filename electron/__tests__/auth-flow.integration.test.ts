// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAuthCallbackServer } from '../auth-server';

describe('OAuth localhost callback 통합 플로우', () => {
  const servers: { close: () => void }[] = [];

  afterEach(() => {
    servers.forEach((s) => s.close());
    servers.length = 0;
  });

  it('서버 시작 → HTTP GET /auth/callback?code=test123 → onCode에 code 전달 → 서버 종료', async () => {
    const codeReceived = new Promise<string>((resolve) => {
      createAuthCallbackServer({ onCode: resolve }).then((s) => {
        servers.push(s);

        // 콜백 요청 시뮬레이션 (브라우저에서 리다이렉트되는 것과 동일)
        fetch(`http://127.0.0.1:${s.port}/auth/callback?code=test123`);
      });
    });

    const code = await codeReceived;
    expect(code).toBe('test123');

    // 서버 종료 대기
    await new Promise((r) => setTimeout(r, 100));
  });

  it('서버 시작 → 타임아웃 → 서버 자동 종료 (짧은 타임아웃으로 테스트)', async () => {
    const onCode = vi.fn();
    const server = await createAuthCallbackServer({
      onCode,
      timeoutMs: 150,
    });
    const port = server.port;

    // 타임아웃 대기
    await new Promise((r) => setTimeout(r, 300));

    // 서버 종료 확인 - 연결 불가
    await expect(
      fetch(`http://127.0.0.1:${port}/auth/callback?code=late`)
    ).rejects.toThrow();

    // onCode는 호출되지 않아야 함
    expect(onCode).not.toHaveBeenCalled();
  });

  it('동시에 여러 서버 시작 → 각각 다른 포트 할당', async () => {
    const codes: string[] = [];
    const server1 = await createAuthCallbackServer({
      onCode: (c) => codes.push(`s1:${c}`),
    });
    const server2 = await createAuthCallbackServer({
      onCode: (c) => codes.push(`s2:${c}`),
    });
    const server3 = await createAuthCallbackServer({
      onCode: (c) => codes.push(`s3:${c}`),
    });
    servers.push(server1, server2, server3);

    // 포트가 모두 다른지 확인
    const ports = [server1.port, server2.port, server3.port];
    expect(new Set(ports).size).toBe(3);

    // 각 서버에 별도 요청
    await Promise.all([
      fetch(`http://127.0.0.1:${server1.port}/auth/callback?code=a`),
      fetch(`http://127.0.0.1:${server2.port}/auth/callback?code=b`),
      fetch(`http://127.0.0.1:${server3.port}/auth/callback?code=c`),
    ]);

    expect(codes).toContain('s1:a');
    expect(codes).toContain('s2:b');
    expect(codes).toContain('s3:c');
  });
});
