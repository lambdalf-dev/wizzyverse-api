import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService } from '@/lib/subscription-service';
import { SubscriptionType } from '@/types/subscription';

/**
 * POST /api/subscriptions/subscribe
 * 
 * Subscribe an email to notifications.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, subscriptionType } = body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Email is required',
        },
        { status: 400 }
      );
    }

    if (!subscriptionType || !['privateAndPublic', 'publicOnly'].includes(subscriptionType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subscription type must be "privateAndPublic" or "publicOnly"',
        },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim();

    // Subscribe email
    await subscriptionService.subscribe(trimmedEmail, subscriptionType as SubscriptionType);

    const message =
      subscriptionType === 'privateAndPublic'
        ? 'Successfully subscribed to private and public sale notifications'
        : 'Successfully subscribed to public sale notifications';

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Error subscribing email:', error);
    
    if (error instanceof Error && error.message === 'Invalid email format') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email format',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save subscription',
      },
      { status: 500 }
    );
  }
}

