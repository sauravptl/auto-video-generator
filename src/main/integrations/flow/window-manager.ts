import { BrowserWindow, screen } from 'electron';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class WindowManager {
  /**
   * Snaps the Electron window to the left 50% of the screen and
   * snaps Google Chrome (holding the Google Flow tab) to the right 50%.
   */
  public static async snapSideBySide(electronWin: BrowserWindow): Promise<{ success: boolean; message: string }> {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { x, y, width, height } = primaryDisplay.workArea;

      const halfWidth = Math.floor(width / 2);

      // 1. Position Electron window on the LEFT half
      electronWin.setBounds({
        x: x,
        y: y,
        width: halfWidth,
        height: height,
      });

      // 2. If running on macOS, use AppleScript to position Chrome on the RIGHT half
      if (process.platform === 'darwin') {
        const chromeLeft = x + halfWidth;
        const chromeTop = y;
        const chromeRight = x + width;
        const chromeBottom = y + height;

        await execFileAsync('osascript', [
          '-e', 'tell application "Google Chrome"',
          '-e', 'activate',
          '-e', 'if (count of windows) > 0 then',
          '-e', `set bounds of front window to {${chromeLeft}, ${chromeTop}, ${chromeRight}, ${chromeBottom}}`,
          '-e', 'end if',
          '-e', 'end tell',
        ]);

        // Re-focus Electron window so user is still in the app
        electronWin.focus();

        return {
          success: true,
          message: 'Arranged Auto AI Video Generator on the left and Google Chrome on the right!',
        };
      } else {
        return {
          success: true,
          message: 'Arranged app on the left. Please snap Chrome to the right.',
        };
      }
    } catch (err: any) {
      console.error('Error snapping windows side-by-side:', err);
      return {
        success: false,
        message: `Failed to arrange windows: ${err.message}`,
      };
    }
  }
}
