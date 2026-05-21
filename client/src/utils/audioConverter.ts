export async function convertToWav(audioBlob: Blob): Promise<Blob> {
  try {
    console.log('[audio] Converting from:', audioBlob.type,
      'size:', audioBlob.size, 'bytes');

    const AudioCtx = window.AudioContext ||
      (window as any).webkitAudioContext;

    if (!AudioCtx) {
      console.warn('[audio] AudioContext not supported, sending original');
      return audioBlob;
    }

    const audioContext = new AudioCtx({ sampleRate: 16000 });
    const arrayBuffer = await audioBlob.arrayBuffer();

    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (decodeErr) {
      console.warn('[audio] Could not decode audio, sending original:', decodeErr);
      audioContext.close();
      return audioBlob;
    }

    const wavBuffer = audioBufferToWav(audioBuffer);
    audioContext.close();

    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    console.log('[audio] Converted to WAV:', wavBlob.size, 'bytes');
    return wavBlob;

  } catch (err) {
    console.warn('[audio] Conversion failed, sending original:', err);
    return audioBlob;
  }
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;

  const samples = mixDownToMono(buffer);

  const dataLength = samples.length * 2;
  const wavLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(wavLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0,  'RIFF');
  view.setUint32(4,  36 + dataLength, true);
  writeString(view, 8,  'WAVE');

  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1,  true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true);
  view.setUint16(32, numChannels * bitDepth / 8, true);
  view.setUint16(34, bitDepth, true);

  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return arrayBuffer;
}

function mixDownToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }

  const length = buffer.length;
  const mono = new Float32Array(length);

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const channel = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += channel[i] / buffer.numberOfChannels;
    }
  }

  return mono;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
