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
    const viewUrl = `https://trackwala.com/view/${submission.id}`;
    const body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Car Submission Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f8fafc; color: #334155;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(262, 83%, 48%) 100%); padding: 40px 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Car Cash Offers</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">Your submission has been received!</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 32px;">
            <h2 style="color: #1e293b; margin: 0 0 24px 0; font-size: 24px; font-weight: 600;">Dear ${submission.ownerName},</h2>

            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px 0; font-size: 16px;">
                Thank you for submitting your vehicle details! We have successfully received your submission and our team is already reviewing it.
            </p>

            <!-- Submission Details Card -->
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid hsl(262, 83%, 58%);">
                <h3 style="color: #1e293b; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Submission Details</h3>
                <div style="display: grid; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                        <span style="color: #64748b; font-weight: 500;">Vehicle VIN:</span>
                        <span style="color: #1e293b; font-family: monospace; font-weight: 600;">${submission.vin}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                        <span style="color: #64748b; font-weight: 500;">Submission ID:</span>
                        <span style="color: #1e293b; font-family: monospace; font-weight: 600;">${submission.id}</span>
                    </div>
                </div>
            </div>

            <p style="color: #475569; line-height: 1.6; margin: 24px 0; font-size: 16px;">
                Our team will review your submission and get back to you with a competitive cash offer soon. We typically respond within 24-48 hours.
            </p>

            <!-- Call to Action Button -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(262, 83%, 48%) 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3); transition: all 0.3s ease;">
                    View Your Submission
                </a>
            </div>

            <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 24px 0 0 0; text-align: center;">
                You can view your submission details anytime using the link above or by visiting<br>
                <a href="${viewUrl}" style="color: hsl(262, 83%, 58%); text-decoration: none;">${viewUrl}</a>
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">
                Best regards,<br>
                <strong style="color: #1e293b;">Car Cash Offer Team</strong>
            </p>
            <p style="color: #94a3b8; margin: 16px 0 0 0; font-size: 12px;">
                This email was sent to ${submission.email}. If you have any questions, please contact our support team.
            </p>
        </div>
    </div>
</body>
</html>
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
    const viewUrl = `https://trackwala.com/view/${submission.id}`;
    const offerAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(offer.offerPrice);

    const body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cash Offer Ready!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f8fafc; color: #334155;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, hsl(145, 63%, 42%) 0%, hsl(145, 63%, 32%) 100%); padding: 40px 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">🎉 Offer Ready!</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">We have prepared a cash offer for your vehicle</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 32px;">
            <h2 style="color: #1e293b; margin: 0 0 24px 0; font-size: 24px; font-weight: 600;">Dear ${submission.ownerName},</h2>

            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px 0; font-size: 16px;">
                <strong style="color: hsl(145, 63%, 42%);">Great news!</strong> We have prepared a competitive cash offer for your vehicle. Here are the details:
            </p>

            <!-- Offer Details Card -->
            <div style="background: linear-gradient(135deg, hsl(145, 63%, 42%) 0%, hsl(145, 63%, 32%) 100%); border-radius: 12px; padding: 32px; margin: 24px 0; text-align: center; color: white;">
                <h3 style="color: white; margin: 0 0 16px 0; font-size: 18px; font-weight: 600; opacity: 0.9;">Cash Offer Amount</h3>
                <div style="font-size: 48px; font-weight: 800; margin: 16px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    ${offerAmount}
                </div>
                <p style="color: rgba(255, 255, 255, 0.8); margin: 16px 0 0 0; font-size: 14px;">
                    For VIN: <span style="font-family: monospace; font-weight: 600;">${submission.vin}</span>
                </p>
            </div>

            ${offer.notes ? `
            <!-- Additional Notes -->
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 4px solid hsl(30, 100%, 48%);">
                <h4 style="color: #1e293b; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Additional Notes:</h4>
                <p style="color: #475569; margin: 0; line-height: 1.5;">${offer.notes}</p>
            </div>
            ` : ''}

            <!-- Urgency Notice -->
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
                <p style="color: #dc2626; margin: 0; font-weight: 600; font-size: 14px;">
                    ⏰ This offer is valid for <strong>7 days</strong> from the date of this email
                </p>
            </div>

            <p style="color: #475569; line-height: 1.6; margin: 24px 0; font-size: 16px;">
                To view the complete offer details, accept, reject, or submit a counter-offer, please visit your submission page using the button below.
            </p>

            <!-- Call to Action Button -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(135deg, hsl(145, 63%, 42%) 0%, hsl(145, 63%, 32%) 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(34, 197, 94, 0.3); transition: all 0.3s ease;">
                    View Offer & Respond
                </a>
            </div>

            <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 24px 0 0 0; text-align: center;">
                Visit your submission page at:<br>
                <a href="${viewUrl}" style="color: hsl(145, 63%, 42%); text-decoration: none;">${viewUrl}</a>
            </p>

            <p style="color: #475569; line-height: 1.6; margin: 32px 0 0 0; font-size: 16px;">
                If you have any questions about this offer, please don't hesitate to contact our support team. We're here to help make this process as smooth as possible.
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">
                Best regards,<br>
                <strong style="color: #1e293b;">Car Cash Offer Team</strong>
            </p>
            <p style="color: #94a3b8; margin: 16px 0 0 0; font-size: 12px;">
                This email was sent to ${submission.email}. If you have any questions, please contact our support team.
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();

    await this.sendEmail({
      to: submission.email,
      name: submission.ownerName,
      subject,
      body,
    });
  }

  async sendOfferStatusUpdate(submission: any, offer: any, status: string) {
    const isAccepted = status === 'accepted';
    const statusText = isAccepted ? 'Accepted' : 'Rejected';
    const statusColor = isAccepted ? '#22c55e' : '#ef4444';

    const emailData = {
      to: submission.email,
      name: submission.ownerName,
      subject: `Your Car Offer Has Been ${statusText} - ${submission.vin}`,
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Offer ${statusText}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">TrackWala</h1>
              <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">Your Car Cash Offer</p>
            </div>

            <!-- Status Banner -->
            <div style="background-color: ${statusColor}; color: white; padding: 20px; text-align: center;">
              <h2 style="margin: 0; font-size: 24px;">Offer ${statusText}!</h2>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h3 style="color: #374151; margin: 0 0 20px 0; font-size: 20px;">Hello ${submission.ownerName},</h3>

              ${isAccepted 
                ? `<p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                     Great news! We've accepted your vehicle submission and are ready to proceed with our cash offer.
                   </p>`
                : `<p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                     Thank you for your submission. After review, we've decided not to proceed with an offer at this time.
                   </p>`
              }

              <!-- Vehicle Details -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <h4 style="color: #374151; margin: 0 0 16px 0; font-size: 18px;">Vehicle Details</h4>
                <div style="display: grid; gap: 12px;">
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
                    <span style="color: #6b7280; font-weight: 500;">VIN:</span>
                    <span style="color: #374151; font-family: monospace;">${submission.vin}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
                    <span style="color: #6b7280; font-weight: 500;">Title Condition:</span>
                    <span style="color: #374151;">${submission.titleCondition}</span>
                  </div>
                  ${submission.vehicleCondition ? `
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
                      <span style="color: #6b7280; font-weight: 500;">Vehicle Condition:</span>
                      <span style="color: #374151;">${submission.vehicleCondition}</span>
                    </div>
                  ` : ''}
                  ${isAccepted ? `
                    <div style="display: flex; justify-content: space-between; background-color: #dcfce7; padding: 12px; border-radius: 6px; margin-top: 12px;">
                      <span style="color: #166534; font-weight: 600;">Offer Amount:</span>
                      <span style="color: #166534; font-weight: 700; font-size: 18px;">$${parseFloat(offer.offerPrice).toLocaleString()}</span>
                    </div>
                  ` : ''}
                </div>
              </div>

              ${isAccepted 
                ? `<div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0;">
                     <h4 style="color: #1e40af; margin: 0 0 12px 0;">Next Steps:</h4>
                     <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
                       <li>We'll contact you within 24 hours to arrange pickup</li>
                       <li>Have your title and registration ready</li>
                       <li>Payment will be processed upon vehicle inspection</li>
                     </ul>
                   </div>`
                : `<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 24px 0;">
                     <p style="color: #dc2626; margin: 0;">
                       While we couldn't make an offer this time, thank you for considering TrackWala. 
                       Feel free to submit another vehicle in the future.
                     </p>
                   </div>`
              }

              ${offer.notes ? `
                <div style="margin: 24px 0;">
                  <h4 style="color: #374151; margin: 0 0 12px 0;">Additional Notes:</h4>
                  <p style="color: #4b5563; font-style: italic; margin: 0;">${offer.notes}</p>
                </div>
              ` : ''}
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">
                Questions? Contact us anytime.
              </p>
              <div style="margin: 20px 0;">
                <a href="https://trackwala.com" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                  Visit TrackWala
                </a>
              </div>
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                © 2024 TrackWala. All rights reserved.
              </p>
            </div>

          </div>
        </body>
        </html>
      `
    };

    // Send to Zapier webhook
    await this.sendToZapier(emailData);
  }
}

export const notificationService = new NotificationService();