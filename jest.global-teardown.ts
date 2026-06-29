export default async function globalTeardown() {
  console.log('\n[Global Teardown] Stopping Next.js test server...');
  const serverProcess = (globalThis as any).__NEXT_SERVER__;
  if (serverProcess) {
    serverProcess.kill();
    console.log('[Global Teardown] Next.js test server stopped.');
  } else {
    console.log('[Global Teardown] Next.js test server process not found.');
  }
}
