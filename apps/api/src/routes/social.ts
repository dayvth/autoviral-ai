import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { encrypt } from '../lib/crypto';

const router = Router();
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

// POST /api/social/accounts — save OAuth tokens
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

// OAuth callback handlers (platform-specific URLs)
router.get('/youtube/callback', (_req, res) => res.redirect(`${process.env.APP_URL}/accounts?platform=youtube`));
router.get('/tiktok/callback', (_req, res) => res.redirect(`${process.env.APP_URL}/accounts?platform=tiktok`));
router.get('/instagram/callback', (_req, res) => res.redirect(`${process.env.APP_URL}/accounts?platform=instagram`));

export default router;
