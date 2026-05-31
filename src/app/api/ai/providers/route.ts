import { NextRequest, NextResponse } from 'next/server';
import { providerRegistry, PROVIDER_CONFIGS } from '@/lib/ai/providers/registry';
import { requireVerifiedPermission } from '../../utils/auth';
import { Permission } from '@/lib/auth/types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

/**
 * GET /api/ai/providers
 * Returns available AI providers, models, and debug info
 */
export async function GET(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'ai');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  const authResult = await requireVerifiedPermission(request, Permission.SETTINGS_READ);
  if ('error' in authResult) return authResult.error;
  try {
    const models = providerRegistry.getAvailableModels();
    const providers = providerRegistry.getProviderStatus();

    const externalFallback = providerRegistry.getFirstAvailableExternalProvider();
    const defaultModel = externalFallback
      ? `${externalFallback.providerId}:${externalFallback.model}`
      : 'zai-default';

    const hasZai = providers.some(p => p.id === 'zai' && p.configured);
    const hasExternal = providers.some(p => p.id !== 'zai' && p.configured);

    // SECURITY: Only return whether providers are configured (boolean),
    // NOT the environment variable names — exposing env var names
    // assists attackers in reconnaissance (CWE-200: Information Exposure)
    const providerConfigured: Record<string, boolean> = {};
    for (const [id, config] of Object.entries(PROVIDER_CONFIGS)) {
      providerConfigured[id] = !!process.env[config.apiKeyEnvVar];
    }

    return NextResponse.json({
      success: true,
      data: {
        models,
        providers,
        defaultModel,
        hasZai,
        hasExternal,
        needsConfiguration: !hasZai && !hasExternal,
        providerConfigured,
        tips: [
          '.env must be next to package.json',
          'Do not quote values in .env',
          'No spaces around = in .env',
          'Restart dev server after changing .env',
        ],
      },
    });
  } catch (error) {
    log.error('Error fetching AI providers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch provider list' },
      { status: 500 }
    );
  }
}
