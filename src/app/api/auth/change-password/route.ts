import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { ObjectId } from 'mongodb';
import { decodeToken } from '@/lib/services/authHelper';
import { getDb, COLLECTIONS, UserDocument } from '@/lib/mongodb';
import { hashPassword, comparePassword } from '@/lib/services/userService';
import { encryptSecret } from '@/lib/services/secretVault';

export async function POST(request: NextRequest) {
  const t = await getTranslations('api');
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = await decodeToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: t('common.invalidToken') }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: t('auth.passwordsRequired') },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: t('auth.newPasswordTooShort', { min: 6 }) },
        { status: 400 }
      );
    }

    // Nájdi používateľa
    const db = await getDb();
    const orConditions: Record<string, unknown>[] = [
      { email: payload.userId },
      { ecarupCustomerId: payload.userId },
    ];
    try {
      if (ObjectId.isValid(payload.userId)) {
        orConditions.unshift({ _id: new ObjectId(payload.userId) });
      }
    } catch {
      // Nie je platné ObjectId
    }

    const user = await db.collection<UserDocument>(COLLECTIONS.USERS).findOne({
      $or: orConditions,
    });

    if (!user) {
      return NextResponse.json({ error: t('common.userNotFound') }, { status: 404 });
    }

    // Over aktuálne heslo (podporuje bcrypt aj legacy SHA-256)
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: t('auth.wrongCurrentPassword') }, { status: 401 });
    }

    // Zmeň heslo v DB (vždy bcrypt). Basic auth ukladáme ZAŠIFROVANÉ (AES-GCM) —
    // base64 by bol reverzibilný plaintext hesla v DB.
    const newHash = await hashPassword(newPassword);
    const newBasicAuth = Buffer.from(`${user.email}:${newPassword}`).toString('base64');

    await db.collection<UserDocument>(COLLECTIONS.USERS).updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: newHash,
          smartmeBasicAuth: encryptSecret(newBasicAuth),
          updatedAt: new Date(),
        },
      }
    );

    console.log(`[ChangePassword] Password changed for: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: t('auth.passwordChanged'),
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: t('common.internalError') },
      { status: 500 }
    );
  }
}
