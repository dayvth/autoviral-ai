import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { encrypt } from '../lib/crypto';
import { logger } from '../lib/logger';

const router = Router();

const API_BASE = process.env.API_BASE_URL ?? 'https://autoviral-api.onrender.com';
const APP_URL = process.env.APP_URL ?? 'https://autoviral-ai.vercel.app';

// ── OAuth initiation (no auth middleware — JWT passed via query param) ─────────

router.get('/oauth/:platform', async (req: Request, res: Response, next) => {
  try {
    const token = req.query.token as string;
    if (!token) return res.redirect(`${APP_URL}/accounts?error=missing_token`);

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      userId = decoded.userId ?? decoded.id;
    } catch {
      return res.redirect(`${APP_URL}/accounts?error=invalid_token`);
    }

    const platform = (req.params.platform as string).toUpperCase().replace('-', '_');

    if (platform === 'YOUTUBE' || platform === 'YOUTUBE_SHORTS') {
      if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
        logger.warn('[OAuth] YouTube client credentials not configured');
        return res.redirect(`${APP_URL}/accounts?error=youtube_not_configured`);
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        `${API_BASE}/api/social/oauth/youtube/callback`
      );

      const state = Buffer.from(JSON.stringify({ userId, platform })).toString('base64url');
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/userinfo.profile',
        ],
        state,
        prompt: 'consent',
      });

      return res.redirect(authUrl);
    }

    // TikTok, Instagram, Facebook — not yet available (requires approved developer apps)
    const platformLabels: Record<string, string> = {
      TIKTOK: 'TikTok',
      INSTAGRAM_REELS: 'Instagram',
      INSTAGRAM: 'Instagram',
      FACEBOOK: 'Facebook',
      FACEBOOK_REELS: 'Facebook',
    };
    const label = platformLabels[platform] ?? platform;
    return res.redirect(`${APP_URL}/accounts?error=oauth_pending&platform=${encodeURIComponent(label)}`);
  } catch (err) {
    next(err);
  }
});

// ── YouTube OAuth callback ──────────────────────────────────────────────────────

router.get('/oauth/youtube/callback', async (req: Request, res: Response, next) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      logger.warn(`[OAuth] YouTube denied: ${error}`);
      return res.redirect(`${APP_URL}/accounts?error=oauth_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${APP_URL}/accounts?error=invalid_callback`);
    }

    const { userId, platform } = JSON.parse(Buffer.from(state as string, 'base64url').toString());

    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      `${API_BASE}/api/social/oauth/youtube/callback`
    );

    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Get channel info
    const yt = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelRes = await yt.channels.list({ part: ['snippet'], mine: true });
    const channel = channelRes.data.items?.[0];
    const channelId = channel?.id ?? 'unknown';
    const channelName = channel?.snippet?.title ?? 'YouTube Channel';

    await prisma.socialAccount.upsert({
      where: { userId_platform_accountId: { userId, platform, accountId: channelId } },
      update: {
        accountName: channelName,
        accessToken: encrypt(tokens.access_token!),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        isActive: true,
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        platform: platform as any,
        accountId: channelId,
        accountName: channelName,
        accessToken: encrypt(tokens.access_token!),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        scopes: tokens.scope?.split(' ') ?? [],
      },
    });

    logger.info(`[OAuth] YouTube connected: ${channelName} for user ${userId}`);
    return res.redirect(`${APP_URL}/accounts?success=youtube_connected`);
  } catch (err) {
    logger.error('[OAuth] YouTube callback error', err);
    next(err);
  }
});

// ── Authenticated routes ────────────────────────────────────────────────────────

router.use(authenticate);

// GET /api/social/accounts
router.get('/accounts', async (req: AuthRequest, res: Response, next) => {
  try {
    const accounts = await prisma.socialAccount.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true, platform: true, accountId: true, accountName: true,
        avatarUrl: true, isActive: true, isVerified: true,
        followersCount: true, lastSyncAt: true,
      },
    });
    res.json({ success: true, data: accounts });
  } catch (err) { next(err); }
});

// POST /api/social/accounts — save OAuth tokens manually
router.post('/accounts', async (req: AuthRequest, res: Response, next) => {
  try {
    const { platform, accountId, accountName, accessToken, refreshToken, tokenExpiresAt, scopes, metadata } = req.body;

    const account = await prisma.socialAccount.upsert({
      where: { userId_platform_accountId: { userId: req.user!.id, platform, accountId } },
      update: {
        accountName,
        accessToken: encrypt(accessToken),
        refreshToken: refreshToken ? encrypt(refreshToken) : undefined,
        tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : undefined,
        isActive: true,
        lastSyncAt: new Date(),
      },
      create: {
        userId: req.user!.id,
        platform,
        accountId,
        accountName,
        accessToken: encrypt(accessToken),
        refreshToken: refreshToken ? encrypt(refreshToken) : undefined,
        tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : undefined,
        scopes: scopes ?? [],
        metadata,
      },
    });

    res.status(201).json({ success: true, data: { id: account.id, platform, accountName } });
  } catch (err) { next(err); }
});

// DELETE /api/social/accounts/:id
router.delete('/accounts/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const account = await prisma.socialAccount.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
    });
    if (!account) throw new AppError(404, 'Account not found');
    await prisma.socialAccount.delete({ where: { id: account.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
