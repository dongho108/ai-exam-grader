import http from 'http';

interface AuthCallbackServerOptions {
  /** code 수신 시 호출되는 콜백 */
  onCode: (code: string) => void;
  /** 타임아웃(ms). 기본 60초 */
  timeoutMs?: number;
}

interface AuthCallbackServer {
  /** 서버가 리스닝 중인 포트 */
  port: number;
  /** 서버를 수동으로 종료 */
  close: () => void;
}

/**
 * OAuth 콜백을 받기 위한 임시 localhost HTTP 서버를 생성한다.
 * /auth/callback?code=xxx 요청을 받으면 onCode 콜백을 호출하고 서버를 종료한다.
 */
export function createAuthCallbackServer(
  options: AuthCallbackServerOptions
): Promise<AuthCallbackServer> {
  const { onCode, timeoutMs = 60_000 } = options;

  return new Promise((resolve, reject) => {
    let closed = false;

    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://localhost`);

      if (url.pathname !== '/auth/callback') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const code = url.searchParams.get('code');

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html><html><body><h2>로그인 실패</h2><p>인증 코드가 없습니다. 다시 시도해주세요.</p></body></html>`);
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html><html><body><h2>로그인 완료!</h2><p>이 창을 닫고 앱으로 돌아가세요.</p><script>setTimeout(()=>window.close(),1500)</script></body></html>`);

      onCode(code);
      closeServer();
    });

    const timeout = setTimeout(() => {
      closeServer();
    }, timeoutMs);

    function closeServer() {
      if (closed) return;
      closed = true;
      clearTimeout(timeout);
      server.closeAllConnections();
      server.close();
    }

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        closeServer();
        reject(new Error('Failed to get server address'));
        return;
      }
      resolve({ port: addr.port, close: closeServer });
    });

    server.on('error', (err) => {
      closeServer();
      reject(err);
    });
  });
}
