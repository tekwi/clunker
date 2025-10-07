
import { storage } from "./storage";
import { notificationService } from "./notifications";

export class ReminderService {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    // Check every hour for offers needing reminders
    this.intervalId = setInterval(async () => {
      await this.checkAndSendReminders();
    }, 60 * 60 * 1000); // 1 hour

    // Run immediately on start
    this.checkAndSendReminders();
    
    console.log('📧 Reminder service started - checking for pending offers every hour');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('📧 Reminder service stopped');
    }
  }

  async checkAndSendReminders() {
    try {
      console.log('🔍 Checking for offers needing reminders...');
      
      const offersNeedingReminders = await storage.getOffersNeedingReminders();
      
      if (offersNeedingReminders.length === 0) {
        console.log('✅ No offers need reminders at this time');
        return;
      }

      console.log(`📬 Found ${offersNeedingReminders.length} offer(s) needing reminders`);

      for (const { offer, submission } of offersNeedingReminders) {
        try {
          console.log(`📧 Sending reminder for offer ${offer.id} to ${submission.email}`);
          
          await notificationService.sendOfferReminderEmail(submission, offer);
          
          // Mark reminder as sent
          await storage.updateOffer(offer.id, {
            reminderSentAt: new Date()
          });
          
          console.log(`✅ Reminder sent successfully for offer ${offer.id}`);
        } catch (error) {
          console.error(`❌ Failed to send reminder for offer ${offer.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error in reminder service:', error);
    }
  }
}

export const reminderService = new ReminderService();
