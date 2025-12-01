
export class GoogleIntegrationService {
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  // --- Calendar ---
  async listUpcomingEvents(maxResults: number = 5): Promise<string> {
    if (!this.accessToken) throw new Error("Google Access Token required");
    
    try {
      const now = new Date().toISOString();
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=${maxResults}&orderBy=startTime&singleEvents=true`,
        { headers: this.getHeaders() }
      );
      if (!response.ok) throw new Error("Failed to fetch calendar");
      
      const data = await response.json();
      if (!data.items || data.items.length === 0) return "No upcoming events found.";

      return data.items.map((event: any) => {
        const start = event.start.dateTime || event.start.date;
        return `- [${new Date(start).toLocaleString()}] ${event.summary}`;
      }).join('\n');
    } catch (e) {
      console.error(e);
      return "Error fetching events.";
    }
  }

  async createCalendarEvent(summary: string, startTime: string, durationMinutes: number = 60): Promise<string> {
    if (!this.accessToken) throw new Error("Google Access Token required");

    try {
      const start = new Date(startTime);
      const end = new Date(start.getTime() + durationMinutes * 60000);

      const event = {
        summary,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() }
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(event)
        }
      );

      if (!response.ok) throw new Error("Failed to create event");
      const data = await response.json();
      return `Event created: ${data.htmlLink}`;
    } catch (e) {
      console.error(e);
      return "Error creating event.";
    }
  }

  // --- Gmail ---
  async getUnreadEmails(maxResults: number = 5): Promise<string> {
    if (!this.accessToken) throw new Error("Google Access Token required");

    try {
      // 1. List IDs
      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=${maxResults}`,
        { headers: this.getHeaders() }
      );
      const listData = await listRes.json();
      
      if (!listData.messages || listData.messages.length === 0) return "No unread emails.";

      // 2. Fetch Details (Batching would be better, but doing simple loop for now)
      const summaries = [];
      for (const msg of listData.messages) {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          { headers: this.getHeaders() }
        );
        const msgData = await msgRes.json();
        const subject = msgData.payload.headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
        const from = msgData.payload.headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
        summaries.push(`- From: ${from} | Subject: ${subject}`);
      }

      return summaries.join('\n');
    } catch (e) {
      console.error(e);
      return "Error fetching emails.";
    }
  }

  // --- Tasks (Keep Alternative) ---
  // Google Keep API is Enterprise only. Google Tasks is the personal equivalent.
  async listTasks(): Promise<string> {
      if (!this.accessToken) throw new Error("Google Access Token required");
      try {
          // Get default list
          const listRes = await fetch(
              `https://tasks.googleapis.com/tasks/v1/users/@me/lists`, 
              { headers: this.getHeaders() }
          );
          const listData = await listRes.json();
          const defaultList = listData.items?.[0]?.id;
          
          if(!defaultList) return "No task lists found.";

          const tasksRes = await fetch(
              `https://tasks.googleapis.com/tasks/v1/lists/${defaultList}/tasks?showCompleted=false&maxResults=10`,
              { headers: this.getHeaders() }
          );
          const tasksData = await tasksRes.json();
          
          if (!tasksData.items || tasksData.items.length === 0) return "No pending tasks.";
          
          return tasksData.items.map((t: any) => `- ${t.title}`).join('\n');
      } catch (e) {
          console.error(e);
          return "Error fetching tasks.";
      }
  }
}

export const googleIntegration = new GoogleIntegrationService();
