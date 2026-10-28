import { NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { getEcarupAccessToken, ECARUP_API_BASE } from '@/lib/services/ecarupAuth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const t = await getTranslations('api');
  const { id } = await params;

  const accessToken = await getEcarupAccessToken();

  if (!accessToken) {
    return NextResponse.json(
      { error: t('stations.ecarupAuthFailed') },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(
      `${ECARUP_API_BASE}/v1/station/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eCarUp API error:', response.status, errorText);
      return NextResponse.json(
        { error: t('stations.stationFetchFailed'), details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('eCarUp API request failed:', error);
    return NextResponse.json(
      { error: t('stations.requestFailed') },
      { status: 500 }
    );
  }
}
