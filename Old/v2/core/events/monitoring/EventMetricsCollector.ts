import { MetricsCollector } from '../../monitoring/interfaces/Metrics';
import { EventMetrics } from '../interfaces/IEventBus';

export class EventMetricsCollector implements MetricsCollector {
  private metrics: EventMetrics = {
    totalEvents: 0,
    eventsPerMinute: 0,
    averageProcessingTime: 0,
    failedEvents: 0,
    retriedEvents: 0
  };

  private eventTimestamps: number[] = [];
  private processingTimes: number[] = [];

  public recordEvent(processingTime: number): void {
    const now = Date.now();
    this.metrics.totalEvents++;
    
    // Add processing time
    this.processingTimes.push(processingTime);
    this.updateAverageProcessingTime();

    // Update events per minute
    this.eventTimestamps.push(now);
    this.cleanupOldEvents(now);
    this.metrics.eventsPerMinute = this.eventTimestamps.length;
  }

  public recordFailure(): void {
    this.metrics.failedEvents++;
  }

  public recordRetry(): void {
    this.metrics.retriedEvents++;
  }

  private updateAverageProcessingTime(): void {
    if (this.processingTimes.length === 0) return;
    
    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageProcessingTime = sum / this.processingTimes.length;
  }

  private cleanupOldEvents(now: number): void {
    const oneMinuteAgo = now - 60000;
    this.eventTimestamps = this.eventTimestamps.filter(
      timestamp => timestamp > oneMinuteAgo
    );
  }

  public async collect(): Promise<Record<string, number | string>> {
    return {
      'events.total': this.metrics.totalEvents,
      'events.per_minute': this.metrics.eventsPerMinute,
      'events.avg_processing_time': this.metrics.averageProcessingTime,
      'events.failed': this.metrics.failedEvents,
      'events.retried': this.metrics.retriedEvents
    };
  }

  public async reset(): Promise<void> {
    this.metrics = {
      totalEvents: 0,
      eventsPerMinute: 0,
      averageProcessingTime: 0,
      failedEvents: 0,
      retriedEvents: 0
    };
    this.eventTimestamps = [];
    this.processingTimes = [];
  }

  public getMetrics(): EventMetrics {
    return { ...this.metrics };
  }
}