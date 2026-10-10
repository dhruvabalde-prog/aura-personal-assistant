// Web Audio recording (16kHz PCM in) and playback (24kHz PCM out)

export class AudioProcessor {
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isRecording: boolean = false;
  private nextPlayTime: number = 0;
  private scheduledSources: AudioBufferSourceNode[] = [];

  public onAudioData?: (base64PCM16k: string) => void;
  public onVolumeChange?: (volume: number) => void;

  // Initialize output context for playing back Gemini Live audio (24kHz)
  private getOutputContext(): AudioContext {
    if (!this.outputAudioContext || this.outputAudioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioContext = new AudioCtx({ sampleRate: 24000 });
      this.nextPlayTime = this.outputAudioContext.currentTime;
    }
    if (this.outputAudioContext.state === 'suspended') {
      this.outputAudioContext.resume();
    }
    return this.outputAudioContext;
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.inputAudioContext = new AudioCtx({ sampleRate: 16000 });
    if (this.inputAudioContext.state === 'suspended') {
      await this.inputAudioContext.resume();
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    // Buffer size 4096 gives ~250ms chunks at 16kHz, low latency
    this.processorNode = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);

      // Calculate audio energy for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      const normalizedVolume = Math.min(1, rms * 5);
      if (this.onVolumeChange) {
        this.onVolumeChange(normalizedVolume);
      }

      // Convert float32 [-1.0, 1.0] to int16 PCM little-endian
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Base64 encode
      const bytes = new Uint8Array(pcm16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      if (this.onAudioData) {
        this.onAudioData(base64);
      }
    };

    source.connect(this.processorNode);
    this.processorNode.connect(this.inputAudioContext.destination);
    this.isRecording = true;
  }

  stopRecording(): void {
    this.isRecording = false;
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }

  // Play incoming 24kHz PCM chunks from Gemini Live
  playAudioChunk(base64PCM24k: string): void {
    try {
      const ctx = this.getOutputContext();
      const binary = atob(base64PCM24k);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      this.scheduledSources.push(source);
      source.onended = () => {
        const idx = this.scheduledSources.indexOf(source);
        if (idx !== -1) {
          this.scheduledSources.splice(idx, 1);
        }
      };
    } catch (err) {
      console.error('[AudioProcessor] Error decoding or playing chunk:', err);
    }
  }

  // Interruption: immediately stop and clear all playing buffers
  stopPlayback(): void {
    for (const src of this.scheduledSources) {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {
        // ignore
      }
    }
    this.scheduledSources = [];
    if (this.outputAudioContext) {
      this.nextPlayTime = this.outputAudioContext.currentTime;
    }
  }

  destroy(): void {
    this.stopRecording();
    this.stopPlayback();
    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
  }
}
