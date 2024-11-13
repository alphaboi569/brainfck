import { IndexedDB } from './indexedDB';
import { format } from 'date-fns';

export interface TimerSession {
  id?: number;
  start_time: Date;
  end_time?: Date;
  duration_minutes: number;
  type: 'work' | 'break';
  preset_id: string;
  completed: boolean;
  created_at: Date;
}

export interface SiteVisit {
  id?: number;
  site_url: string;
  start_time: Date;
  end_time?: Date;
  duration_seconds?: number;
  blocked: boolean;
  created_at: Date;
}

export interface DailyStats {
  date: string;
  total_work_time_minutes: number;
  total_break_time_minutes: number;
  completed_cycles: number;
  blocked_attempts: number;
  created_at: Date;
  updated_at: Date;
}

export interface SiteLimit {
  site_url: string;
  daily_limit_minutes: number;
  created_at: Date;
  updated_at: Date;
}

class ActivityDB {
  private static instance: ActivityDB;

  private constructor() {}

  static async getInstance() {
    if (!ActivityDB.instance) {
      ActivityDB.instance = new ActivityDB();
      await IndexedDB.init();
    }
    return ActivityDB.instance;
  }

  async startTimerSession(type: 'work' | 'break', durationMinutes: number, presetId: string): Promise<number> {
    const session: TimerSession = {
      start_time: new Date(),
      duration_minutes: durationMinutes,
      type,
      preset_id: presetId,
      completed: false,
      created_at: new Date()
    };

    return await IndexedDB.add('timer_sessions', session);
  }

  async completeTimerSession(sessionId: number): Promise<void> {
    await IndexedDB.update<TimerSession>('timer_sessions', sessionId, {
      end_time: new Date(),
      completed: true
    });
  }

  async startSiteVisit(siteUrl: string): Promise<number> {
    const visit: SiteVisit = {
      site_url: siteUrl,
      start_time: new Date(),
      blocked: false,
      created_at: new Date()
    };

    return await IndexedDB.add('site_visits', visit);
  }

  async endSiteVisit(visitId: number): Promise<void> {
    const endTime = new Date();
    const visit = await IndexedDB.get<SiteVisit>('site_visits', visitId);
    
    if (visit) {
      const duration = Math.floor((endTime.getTime() - visit.start_time.getTime()) / 1000);
      await IndexedDB.update<SiteVisit>('site_visits', visitId, {
        end_time: endTime,
        duration_seconds: duration
      });
    }
  }

  async getDailyStats(date: string = format(new Date(), 'yyyy-MM-dd')): Promise<DailyStats | null> {
    try {
      const stats = await IndexedDB.get<DailyStats>('daily_stats', date);
      return stats || null;
    } catch (error) {
      console.error('Failed to get daily stats:', error);
      return null;
    }
  }

  async getSiteVisitStats(siteUrl: string, date: string = format(new Date(), 'yyyy-MM-dd')) {
    try {
      const visits = await IndexedDB.getAll<SiteVisit>('site_visits');
      const dayVisits = visits.filter(visit => 
        visit.site_url === siteUrl && 
        format(visit.start_time, 'yyyy-MM-dd') === date
      );

      return {
        visit_count: dayVisits.length,
        duration_minutes: Math.floor(dayVisits.reduce((acc, visit) => 
          acc + (visit.duration_seconds || 0), 0) / 60),
        blocked_attempts: dayVisits.filter(visit => visit.blocked).length
      };
    } catch (error) {
      console.error('Failed to get site visit stats:', error);
      return null;
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for IndexedDB
  }
}

export const getDB = ActivityDB.getInstance;
export default ActivityDB;