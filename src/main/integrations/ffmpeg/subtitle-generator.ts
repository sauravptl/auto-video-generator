import fs from 'fs';
import path from 'path';
import type { SceneDefinition } from '../../../shared/types';

export class SubtitleGenerator {
  /**
   * Generates an Advanced SubStation Alpha (.ass) subtitle file
   * styled for high visibility on social media reels with bottom-center safe area.
   */
  public static generateAssSubtitles(
    scenes: SceneDefinition[],
    outputPath: string,
    isVertical = true
  ): string {
    const playResX = isVertical ? 1080 : 1920;
    const playResY = isVertical ? 1920 : 1080;
    const fontSize = isVertical ? 54 : 40;
    const marginV = isVertical ? 240 : 80; // Safe area above Instagram Reels bottom bar

    let assContent = `[Script Info]
Title: Auto AI Video Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: ${playResX}
PlayResY: ${playResY}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    let currentTime = 0;
    for (const scene of scenes) {
      const startTime = currentTime;
      const endTime = currentTime + (scene.durationSeconds || 6);

      const startStr = this.formatTimestamp(startTime);
      const endStr = this.formatTimestamp(endTime);
      const text = (scene.narrationOrSubtitle || '').replace(/\n/g, '\\N');

      if (text.trim()) {
        assContent += `Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,{\\b1}${text}{\\b0}\n`;
      }

      currentTime = endTime;
    }

    fs.writeFileSync(outputPath, assContent, 'utf-8');
    return outputPath;
  }

  private static formatTimestamp(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${h}:${pad(m)}:${pad(s)}.${pad(ms)}`;
  }
}
