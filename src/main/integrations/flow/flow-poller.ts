import { FlowClient } from './flow-client';
import type { FlowStatus } from '../../../shared/flow-types';

export class FlowPoller {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastStatus: FlowStatus | null = null;

  constructor(private onStatusChange: (status: FlowStatus) => void) {}

  public start(intervalMs = 4000) {
    if (this.isRunning) return;
    this.isRunning = true;

    const poll = async () => {
      try {
        const current = await FlowClient.getStatus();
        // Notify if changed or first time
        if (
          !this.lastStatus ||
          this.lastStatus.flowTabStatus !== current.flowTabStatus ||
          this.lastStatus.extensionConnected !== current.extensionConnected ||
          this.lastStatus.bridgeStatus !== current.bridgeStatus
        ) {
          this.lastStatus = current;
          this.onStatusChange(current);
        }
      } catch (err) {
        console.error('FlowPoller error:', err);
      }

      if (this.isRunning) {
        this.timer = setTimeout(poll, intervalMs);
      }
    };

    poll();
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
