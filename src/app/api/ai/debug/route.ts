import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedAdmin } from '@/app/api/utils/auth';
import { providerRegistry, PROVIDER_CONFIGS } from '@/lib/ai/providers/registry';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

/**
 * GET /api/ai/debug
 * Admin-only diagnostic endpoint for debugging AI provider configuration
 * Shows which .env keys are found, .env file status, and troubleshooting tips
 * SECURITY: Restricted to admin users only — exposes sensitive environment info
 */
export async function GET(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'ai');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  // SECURITY: Disable this endpoint in production — exposes sensitive .env contents
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 });
  }

  // SECURITY FIX: Use requireVerifiedAdmin() instead of requireAdmin()
  // to prevent header forgery — this endpoint exposes .env contents.
  const authResult = await requireVerifiedAdmin(request);
  if ('error' in authResult) return authResult.error;
  try {
    const cwd = process.cwd();
    const envPath = join(cwd, '.env');
    const envExamplePath = join(cwd, '.env.example');

    const envExists = existsSync(envPath);
    const envExampleExists = existsSync(envExamplePath);

    // Check which keys are found in process.env
    const envDebug: Record<string, {
      envVar: string;
      configured: boolean;
    }> = {};

    const allProviderVars = [
      ...Object.values(PROVIDER_CONFIGS).map(c => c.apiKeyEnvVar),
    ];

    // Also check for common misspellings
    const commonMisspellings: Record<string, string> = {
      'OPEN_AI_API_KEY': 'Did you mean OPENAI_API_KEY?',
      'GOOGLE_AI_API_KEY': 'Did you mean GEMINI_API_KEY?',
      'DEEP_SEEK_API_KEY': 'Did you mean DEEPSEEK_API_KEY?',
      'HUGGING_FACE_API_KEY': 'Did you mean HUGGINGFACE_API_KEY?',
    };

    for (const envVar of allProviderVars) {
      const value = process.env[envVar];
      envDebug[envVar] = {
        envVar,
        configured: !!value,
      };
    }

    // Check for misspelled env vars
    const misspellingWarnings: string[] = [];
    for (const [misspelled, suggestion] of Object.entries(commonMisspellings)) {
      if (process.env[misspelled]) {
        misspellingWarnings.push(`Found "${misspelled}" in environment. ${suggestion}`);
      }
    }

    // Read .env file content to check for issues (without exposing secrets)
    const envFileIssues: string[] = [];
    if (envExists) {
      try {
        const envContent = readFileSync(envPath, 'utf-8');
        const lines = envContent.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();

          // Skip comments and empty lines
          if (!trimmed || trimmed.startsWith('#')) continue;

          // Check for quoted values
          if (trimmed.includes('=')) {
            const eqIndex = trimmed.indexOf('=');
            const key = trimmed.substring(0, eqIndex).trim();
            const value = trimmed.substring(eqIndex + 1).trim();

            if (value.startsWith('"') || value.startsWith("'")) {
              envFileIssues.push(`Line has quoted value: "${key}=${value.substring(0, 10)}...". Remove quotes from .env values.`);
            }

            // Check for spaces around =
            if (trimmed.includes(' = ') || trimmed.includes(' =') || trimmed.startsWith(key + '\t')) {
              envFileIssues.push(`Possible spacing issue near: "${key}". Use KEY=value with no spaces.`);
            }
          }
        }
      } catch {
        envFileIssues.push('Could not read .env file');
      }
    }

    // Get provider status
    const providers = providerRegistry.getProviderStatus();
    const externalFallback = providerRegistry.getFirstAvailableExternalProvider();
    const defaultModel = externalFallback
      ? `${externalFallback.providerId}:${externalFallback.model}`
      : 'zai-default';

    const configuredProviders = providers.filter(p => p.id !== 'zai' && p.configured);
    const missingProviders = providers.filter(p => p.id !== 'zai' && !p.configured);

    return NextResponse.json({
      success: true,
      data: {
        environment: {
          cwd,
          nodeEnv: process.env.NODE_ENV || 'not set',
          envFileExists: envExists,
          envExampleExists: envExampleExists,
          envFileReadable: envExists && !envFileIssues.some(i => i.includes('Could not read')),
        },
        providers: {
          configured: configuredProviders.map(p => p.name),
          missing: missingProviders.map(p => `${p.name} (${PROVIDER_CONFIGS[p.id]?.apiKeyEnvVar})`),
          externalFallback: externalFallback ? `${externalFallback.providerId}:${externalFallback.model}` : null,
          defaultModel,
        },
        envKeys: envDebug,
        warnings: [
          ...envFileIssues,
          ...misspellingWarnings,
          ...(!envExists ? ['.env file not found! Create one from .env.example'] : []),
          ...(envExists && configuredProviders.length === 0 ? ['No external AI provider keys found. Add at least one API key to .env'] : []),
        ],
        tips: [
          'Your .env file must be in the project root (same folder as package.json)',
          'Values should NOT have quotes: OPENAI_API_KEY=sk-abc (not "sk-abc")',
          'Values should NOT have spaces: OPENAI_API_KEY=sk-abc (not OPENAI_API_KEY = sk-abc)',
          'You MUST restart the dev server (npm run dev) after changing .env',
          'Make sure the .env file name starts with a dot: .env (not env)',
          'If running locally, z-ai-web-dev-sdk will NOT work - use external providers',
        ],
      },
    });
  } catch (error) {
    log.error('AI Debug endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Debug check failed',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
      },
      { status: 500 }
    );
  }
}
