import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { decodeToken } from '@/lib/services/authHelper';
import { getDb, COLLECTIONS, UserDocument } from '@/lib/mongodb';
import { hashPassword, comparePassword } from '@/lib/services/userService';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Nie ste prihlásený' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = await decodeToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Neplatný token' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Aktuálne a nové heslo sú povinné' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Nové heslo musí mať aspoň 6 znakov' },
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
      return NextResponse.json({ error: 'Používateľ nebol nájdený' }, { status: 404 });
    }

    // Over aktuálne heslo (podporuje bcrypt aj legacy SHA-256)
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Nesprávne aktuálne heslo' }, { status: 401 });
    }

    // Zmeň heslo v DB (vždy bcrypt)
    const newHash = await hashPassword(newPassword);
    const newBasicAuth = Buffer.from(`${user.email}:${newPassword}`).toString('base64');

    await db.collection<UserDocument>(COLLECTIONS.USERS).updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: newHash,
          smartmeBasicAuth: newBasicAuth,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`[ChangePassword] Password changed for: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Heslo bolo úspešne zmenené',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Interná chyba servera' },
      { status: 500 }
    );
  }
}
