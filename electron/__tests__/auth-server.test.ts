// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAuthCallbackServer } from '../auth-server';

describe('createAuthCallbackServer', () => {
  let serverHandle: { port: number; close: () => void } | null = null;

  afterEach(() => {
    serverHandle?.close();
    serverHandle = null;
  });

  it('서버 시작 → 사용 가능한 포트 반환', async () => {
    serverHandle = await createAuthCallbackServer({ onCode: () => {} });

    expect(serverHandle.port).toBeGreaterThan(0);
    expect(serverHandle.port).toBeLessThan(65536);
  });

  it('/auth/callback?code=xxx 요청 → onCode 콜백에 code 전달', async () => {
    const onCode = vi.fn();
    serverHandle = await createAuthCallbackServer({ onCode });

    const res = await fetch(`http://127.0.0.1:${serverHandle.port}/auth/callback?code=test-auth-code`);

    expect(res.status).toBe(200);
    expect(onCode).toHaveBeenCalledWith('test-auth-code');
  });

  it('/auth/callback?code=xxx 요청 → "로그인 완료" HTML 응답', async () => {
    serverHandle = await createAuthCallbackServer({ onCode: () => {} });

    const res = await fetch(`http://127.0.0.1:${serverHandle.port}/auth/callback?code=abc`);
    const html = await res.text();

    expect(res.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('로그인 완료');
  });

  it('/auth/callback에 code 없음 → 400 에러 응답', async () => {
    serverHandle = await createAuthCallbackServer({ onCode: () => {} });

    const res = await fetch(`http://127.0.0.1:${serverHandle.port}/auth/callback`);

    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain('로그인 실패');
  });

  it('code 수신 후 서버 자동 종료', async () => {
    const onCode = vi.fn();
    serverHandle = await createAuthCallbackServer({ onCode });
    const port = serverHandle.port;

    // 첫 번째 요청: 성공
    await fetch(`http://127.0.0.1:${port}/auth/callback?code=abc`);

    // 서버 종료 대기
    await new Promise((r) => setTimeout(r, 100));

    // 두 번째 요청: 연결 실패해야 함
    await expect(
      fetch(`http://127.0.0.1:${port}/auth/callback?code=def`)
    ).rejects.toThrow();

    serverHandle = null; // 이미 닫힘
  });

  it('타임아웃 초과 시 서버 자동 종료', async () => {
    serverHandle = await createAuthCallbackServer({
      onCode: () => {},
      timeoutMs: 200,
    });
    const port = serverHandle.port;

    // 타임아웃 대기
    await new Promise((r) => setTimeout(r, 350));

    // 서버 종료되어 연결 실패
    await expect(
      fetch(`http://127.0.0.1:${port}/auth/callback?code=abc`)
    ).rejects.toThrow();

    serverHandle = null; // 이미 닫힘
  });

  it('잘못된 경로 요청 → 404 응답', async () => {
    serverHandle = await createAuthCallbackServer({ onCode: () => {} });

    const res = await fetch(`http://127.0.0.1:${serverHandle.port}/wrong-path`);

    expect(res.status).toBe(404);
  });
});
