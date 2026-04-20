import { NextResponse } from 'next/server';
import { getEcarupAccessToken, ECARUP_API_BASE } from '@/lib/services/ecarupAuth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const accessToken = await getEcarupAccessToken();

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Failed to authenticate with eCarUp API' },
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
        { error: 'Failed to fetch station', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('eCarUp API request failed:', error);
    return NextResponse.json(
      { error: 'API request failed' },
      { status: 500 }
    );
  }
}
