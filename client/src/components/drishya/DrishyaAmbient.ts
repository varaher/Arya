type DrishyaWorld = "night" | "film" | "everyday";

const AMBIENT_FILES: Record<DrishyaWorld, string> = {
  night:    "/audio/drishya-night.mp3",
  film:     "/audio/drishya-film.mp3",
  everyday: "/audio/drishya-everyday.mp3",
};

class DrishyaAmbientPlayer {
  private audio: HTMLAudioElement | null = null;
  private currentWorld: DrishyaWorld | null = null;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;
  private _volume = 0.18;

  start(world: DrishyaWorld) {
    if (this.currentWorld === world && this.audio && !this.audio.paused) return;
    this.stop(false);

    this.currentWorld = world;
    const a = new Audio(AMBIENT_FILES[world]);
    a.loop = true;
    a.volume = 0;
    this.audio = a;

    a.play().catch(() => {});
    this.fadeTo(this._volume, 2000);
  }

  stop(withFade = true) {
    if (!this.audio) return;
    if (withFade) {
      this.fadeTo(0, 1200, () => {
        this.audio?.pause();
        this.audio = null;
        this.currentWorld = null;
      });
    } else {
      if (this.fadeInterval) clearInterval(this.fadeInterval);
      this.audio.pause();
      this.audio = null;
      this.currentWorld = null;
    }
  }

  setVolume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.audio && !this.audio.paused) this.fadeTo(this._volume, 400);
  }

  get isPlaying() {
    return !!this.audio && !this.audio.paused;
  }

  private fadeTo(target: number, durationMs: number, onComplete?: () => void) {
    if (!this.audio) return;
    if (this.fadeInterval) clearInterval(this.fadeInterval);
    const start = this.audio.volume;
    const steps = 20;
    const stepDuration = durationMs / steps;
    const delta = (target - start) / steps;
    let step = 0;

    this.fadeInterval = setInterval(() => {
      if (!this.audio) { clearInterval(this.fadeInterval!); return; }
      step++;
      this.audio.volume = Math.max(0, Math.min(1, start + delta * step));
      if (step >= steps) {
        clearInterval(this.fadeInterval!);
        this.audio.volume = target;
        onComplete?.();
      }
    }, stepDuration);
  }
}

export const drishyaAmbient = new DrishyaAmbientPlayer();
