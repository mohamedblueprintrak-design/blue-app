export default async function globalTeardown() {
  console.info('\n[Global Teardown] Stopping Next.js test server...');
  const serverProcess = ((globalThis as unknown) as Record<string, { kill: () => void } | undefined>).__NEXT_SERVER__;
  if (serverProcess) {
    serverProcess.kill();
    console.info('[Global Teardown] Next.js test server stopped.');
  } else {
    console.info('[Global Teardown] Next.js test server process not found.');
  }
}
