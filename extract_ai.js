const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, 'src', 'app', 'api', 'ai', 'chat', 'route.ts');
const servicePath = path.join(__dirname, 'src', 'lib', 'ai', 'chat-service.ts');

const code = fs.readFileSync(routePath, 'utf8');
const lines = code.split('\n');

const postIndex = lines.findIndex(l => l.includes('export async function POST'));

// Split the file
const beforePostLines = lines.slice(0, postIndex);
const postLines = lines.slice(postIndex);

// Add 'export' to functions in beforePostLines so they can be imported
let serviceCode = beforePostLines.join('\n');
serviceCode = serviceCode.replace(/async function getZAI/g, 'export async function getZAI');
serviceCode = serviceCode.replace(/async function readZaiConfigFile/g, 'export async function readZaiConfigFile');
serviceCode = serviceCode.replace(/async function getCachedZaiFileConfig/g, 'export async function getCachedZaiFileConfig');
serviceCode = serviceCode.replace(/async function callZaiDirect/g, 'export async function callZaiDirect');
serviceCode = serviceCode.replace(/function detectTopics/g, 'export function detectTopics');
serviceCode = serviceCode.replace(/async function fetchContextData/g, 'export async function fetchContextData');
serviceCode = serviceCode.replace(/async function fetchProjectContext/g, 'export async function fetchProjectContext');
serviceCode = serviceCode.replace(/function getDemoResponse/g, 'export function getDemoResponse');
serviceCode = serviceCode.replace(/function sseEvent/g, 'export function sseEvent');
serviceCode = serviceCode.replace(/async function streamFullText/g, 'export async function streamFullText');
serviceCode = serviceCode.replace(/async function streamFromGenerator/g, 'export async function streamFromGenerator');

// Create new route.ts code
const routeCode = `import { requireVerifiedPermission, orgCheck, type AuthContext } from '@/app/api/utils/auth';
import { Permission } from '@/lib/auth/types';
import { hasPermission } from '@/lib/auth/modules/authorization';
import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';
import { validateBody, aiChatSchema } from '@/lib/api-validation';
import { providerRegistry } from '@/lib/ai/providers/registry';
import type { ChatMessage } from '@/lib/ai/providers/types';
import { log } from '@/lib/logger';
import { getEngineeringContext, CONSTRUCTION_COSTS_RAK } from '@/lib/ai/engineering-knowledge';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';

import {
  getZAI,
  readZaiConfigFile,
  getCachedZaiFileConfig,
  callZaiDirect,
  detectTopics,
  fetchContextData,
  fetchProjectContext,
  getDemoResponse,
  sseEvent,
  streamFullText,
  streamFromGenerator
} from '@/lib/ai/chat-service';

${postLines.join('\n')}`;

fs.mkdirSync(path.dirname(servicePath), { recursive: true });
fs.writeFileSync(servicePath, serviceCode);
fs.writeFileSync(routePath, routeCode);

console.log("Successfully extracted AI logic into chat-service.ts!");
