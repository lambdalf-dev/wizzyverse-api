import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService } from '@/lib/subscription-service';

/**
 * DELETE /api/subscriptions/unsubscribe
 * 
 * Unsubscribe an email from all notifications.
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

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

    const trimmedEmail = email.trim();

    // Unsubscribe email
    const wasRemoved = await subscriptionService.unsubscribe(trimmedEmail);

    if (wasRemoved) {
      return NextResponse.json({
        success: true,
        message: 'Successfully unsubscribed from all notifications',
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Email was not found in our subscription list',
      });
    }
  } catch (error) {
    console.error('Error unsubscribing email:', error);
    
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
        error: 'Failed to unsubscribe',
      },
      { status: 500 }
    );
  }
}

