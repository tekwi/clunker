
// Using built-in fetch (Node.js 18+)

interface EmailNotification {
  to: string;
  name: string;
  subject: string;
  body: string;
}

export class NotificationService {
  private zapierWebhookUrl: string | undefined;

  constructor() {
    this.zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
  }

  async sendEmail(notification: EmailNotification): Promise<void> {
    if (!this.zapierWebhookUrl) {
      console.log('⚠️ ZAPIER_WEBHOOK_URL not configured, skipping email notification');
      return;
    }

    try {
      console.log(`📧 Sending email notification to ${notification.to} via Zapier webhook`);
      
      const response = await fetch(this.zapierWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: notification.to,
          name: notification.name,
          subject: notification.subject,
          body: notification.body,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Zapier webhook failed: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Email notification sent successfully via Zapier');
    } catch (error) {
      console.error('❌ Failed to send email notification via Zapier:', error);
      throw error;
    }
  }

  async sendSubmissionConfirmation(submission: any): Promise<void> {
    const subject = 'Car Submission Received - Thank You!';
    const body = `
Dear ${submission.ownerName},

Thank you for submitting your vehicle details! We have received your submission for:

Vehicle VIN: ${submission.vin}
Submission ID: ${submission.id}

Our team will review your submission and get back to you with a cash offer soon.

You can view your submission details anytime using this link:
${process.env.FRONTEND_URL || 'https://your-app.replit.app'}/view/${submission.id}

Best regards,
Car Cash Offer Team
    `.trim();

    await this.sendEmail({
      to: submission.email,
      name: submission.ownerName,
      subject,
      body,
    });
  }

  async sendOfferNotification(submission: any, offer: any): Promise<void> {
    const subject = 'You have received a cash offer for your vehicle!';
    const body = `
Dear ${submission.ownerName},

Great news! We have prepared a cash offer for your vehicle:

Vehicle VIN: ${submission.vin}
Offer Amount: $${offer.offerPrice}
${offer.notes ? `Additional Notes: ${offer.notes}` : ''}

This offer is valid for 7 days from the date of this email.

To view the complete offer details and respond, please visit:
${process.env.FRONTEND_URL || 'https://your-app.replit.app'}/view/${submission.id}

If you have any questions, please don't hesitate to contact us.

Best regards,
Car Cash Offer Team
    `.trim();

    await this.sendEmail({
      to: submission.email,
      name: submission.ownerName,
      subject,
      body,
    });
  }
}

export const notificationService = new NotificationService();
