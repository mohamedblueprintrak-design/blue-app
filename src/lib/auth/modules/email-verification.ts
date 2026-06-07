/**
 * Email Verification Module
 * وحدة التحقق من البريد الإلكتروني
 *
 * Handles email verification token generation, sending, and verification.
 * Used by auth-service.ts facade via dynamic imports.
 */

import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { AuthResponse } from '../types';
import { logAudit } from '@/lib/services/audit.service';
import { sendEmail } from '@/lib/email';
import { emailTemplates } from '@/lib/email-templates';
import { hashToken } from '@/lib/auth/token-utils';

// ============================================
// Email Verification Functions
// ============================================

/**
 * Generate email verification token
 */
export async function generateEmailVerificationToken(email: string, userId?: string): Promise<string> {
  // Delete any existing tokens for this email
  await db.emailVerificationToken.deleteMany({
    where: { email: email.toLowerCase() },
  });

  // Generate secure token
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const hashedToken = await hashToken(token);
  await db.emailVerificationToken.create({
    data: {
      email: email.toLowerCase(),
      token: hashedToken,
      userId,
      expiresAt,
    },
  });

  return token;
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(email: string, userName: string, userId?: string): Promise<boolean> {
  try {
    const token = await generateEmailVerificationToken(email, userId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const verificationLink = `${appUrl}/verify-email?token=${token}`;

    const template = emailTemplates.emailVerification(userName, verificationLink, 24);

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return true;
  } catch (error) {
    log.error('Failed to send verification email', error);
    return false;
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<AuthResponse> {
  try {
    const hashedToken = await hashToken(token);
    const verificationToken = await db.emailVerificationToken.findUnique({
      where: { token: hashedToken },
    });

    if (!verificationToken) {
      return {
        success: false,
        error: 'Invalid verification token',
        code: 'INVALID_TOKEN',
      };
    }

    if (verificationToken.usedAt) {
      return {
        success: false,
        error: 'Token already used',
        code: 'TOKEN_USED',
      };
    }

    if (verificationToken.expiresAt < new Date()) {
      return {
        success: false,
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED',
      };
    }

    // Find user by email
    const user = await db.user.findFirst({
      where: { email: verificationToken.email },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      };
    }

    // Mark email as verified
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      }),
      db.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Log audit
    await logAudit({
      userId: user.id,
      organizationId: user.organizationId || undefined,
      entityType: 'user',
      entityId: user.id,
      action: 'verify_email',
      description: `Email verified: ${user.email}`,
    });

    // Send confirmation email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const template = emailTemplates.emailVerified(user.name ?? '', `${appUrl}/login`);
    await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.name ?? '',
        fullName: user.name ?? '',
        role: user.role as string,
        avatar: user.avatar,
        organizationId: user.organizationId,
      },
    };
  } catch (error) {
    log.error('Email verification error', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string): Promise<AuthResponse> {
  try {
    const user = await db.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists
      return { success: true };
    }

    if (user.emailVerified) {
      return {
        success: false,
        error: 'Email already verified',
        code: 'ALREADY_VERIFIED',
      };
    }

    await sendVerificationEmail(user.email, user.name ?? '', user.id);

    return { success: true };
  } catch (error) {
    log.error('Resend verification error', error);
    return { success: true }; // Don't reveal errors
  }
}
