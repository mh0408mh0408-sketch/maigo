// ============================================================================
// 『迷子 - MAIGO -』 プロシージャル音響エンジン (Web Audio API)
// 外部音声ファイル不要で、夜道の環境音・心音・踏切・着信・ホラー演出音を生成
// ============================================================================

class MaigoAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmEnabled = true;
    this.masterGain = null;
    this.bgmGain = null;
    this.bgmNodes = [];
    this.heartbeatTimer = null;
    this.tensionLevel = 0; // 0: 通常, 1: 迷子所持(警戒), 2: あかり残り1枚(危険)
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.55;
    this.masterGain.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.25;
    this.bgmGain.connect(this.masterGain);
  }

  toggleSound() {
    this.init();
    this.enabled = !this.enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.enabled ? 0.55 : 0, this.ctx.currentTime, 0.05);
    }
    if (!this.enabled) {
      this.stopHeartbeat();
    } else if (this.tensionLevel > 0) {
      this.setTension(this.tensionLevel);
    }
    return this.enabled;
  }

  startAmbientBGM() {
    this.init();
    if (!this.ctx || this.bgmNodes.length > 0) return;
    try {
      const now = this.ctx.currentTime;

      // 1. 夜風のローパスノイズ
      const bufferSize = this.ctx.sampleRate * 3;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 240;
      windFilter.Q.value = 3.5;

      const windGain = this.ctx.createGain();
      windGain.gain.value = 0.14;

      whiteNoise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(this.bgmGain);
      whiteNoise.start(now);

      // 2. 街灯の不気味な微弱ハム音 + 深淵ドローン
      const droneOsc1 = this.ctx.createOscillator();
      const droneOsc2 = this.ctx.createOscillator();
      droneOsc1.type = 'sine';
      droneOsc2.type = 'triangle';
      droneOsc1.frequency.value = 55; // A1
      droneOsc2.frequency.value = 82.41; // E2

      const droneFilter = this.ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 160;

      const droneGain = this.ctx.createGain();
      droneGain.gain.value = 0.18;

      droneOsc1.connect(droneFilter);
      droneOsc2.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(this.bgmGain);

      droneOsc1.start(now);
      droneOsc2.start(now);

      this.bgmNodes = [whiteNoise, droneOsc1, droneOsc2];
    } catch (e) {
      // Audio autoplay blocked until interaction
    }
  }

  setTension(level) {
    this.tensionLevel = level;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (!this.enabled || level <= 0) return;

    const intervalMs = level === 2 ? 780 : 1350;
    this.playHeartbeat(level === 2 ? 0.55 : 0.28);
    this.heartbeatTimer = setInterval(() => {
      if (this.enabled && this.tensionLevel > 0) {
        this.playHeartbeat(this.tensionLevel === 2 ? 0.55 : 0.28);
      }
    }, intervalMs);
  }

  stopHeartbeat() {
    this.tensionLevel = 0;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  playHeartbeat(volume = 0.4) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const beat = (delay, freq, amp) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(28, now + delay + 0.16);

      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.linearRampToValueAtTime(amp, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    };

    beat(0, 68, volume);
    beat(0.19, 58, volume * 0.75);
  }

  // カードを引く・ホバー音
  playCardHover() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.045);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  playCardDraw() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.playNoiseBurst(0.11, 900, 2.0, 0.22);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playNoiseBurst(duration = 0.2, filterFreq = 800, Q = 1.0, volume = 0.25) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.value = Q;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  // 各カード固有の効果音
  playCardEffectSound(cardId) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    switch (cardId) {
      case 'railroad_crossing': {
        // 踏切警報音「カン、カン、カン、カン！」
        for (let i = 0; i < 6; i++) {
          const t = now + i * 0.28;
          this.playBellTone(t, 740, 0.24, 0.35);
          this.playBellTone(t, 685, 0.24, 0.25);
        }
        break;
      }
      case 'incoming_call':
      case 'phone_booth': {
        // 電話のコール音「プルルルル…」
        for (let ring = 0; ring < 2; ring++) {
          for (let i = 0; i < 6; i++) {
            const t = now + ring * 0.55 + i * 0.055;
            this.playBellTone(t, i % 2 === 0 ? 880 : 1120, 0.05, 0.22);
          }
        }
        break;
      }
      case 'shrine':
      case 'amulet': {
        // 神社の鈴・神聖な和音
        this.playBellTone(now, 1318.5, 0.6, 0.28);
        this.playBellTone(now + 0.08, 1760, 0.7, 0.22);
        this.playBellTone(now + 0.16, 2637, 0.8, 0.18);
        break;
      }
      case 'broken_streetlight': {
        // 電球が割れるスパーク音
        this.playNoiseBurst(0.25, 2400, 0.8, 0.45);
        this.playBellTone(now, 140, 0.35, 0.35, 'sawtooth');
        break;
      }
      case 'rain':
      case 'river':
      case 'sea':
      case 'aquarium': {
        // 水・雨のざわめき
        this.playNoiseBurst(0.85, 520, 0.7, 0.35);
        this.playBellTone(now + 0.1, 392, 0.6, 0.15);
        break;
      }
      case 'rumor_light':
      case 'rumor_dark':
      case 'kurosaki': {
        // 不気味な囁きと低音
        this.playNoiseBurst(0.6, 1100, 3.0, 0.25);
        this.playBellTone(now, 110, 0.8, 0.35, 'sawtooth');
        this.playBellTone(now + 0.12, 116.5, 0.8, 0.3, 'triangle');
        break;
      }
      default: {
        const card = window.MAIGO_CARDS[cardId];
        if (card && card.category === 'light') {
          // あかりカードの温かい点灯音
          this.playBellTone(now, 523.25, 0.35, 0.22);
          this.playBellTone(now + 0.09, 659.25, 0.45, 0.24);
          this.playBellTone(now + 0.18, 783.99, 0.55, 0.22);
        } else {
          // くらやみカードの冷たい風音
          this.playNoiseBurst(0.45, 340, 1.5, 0.28);
          this.playBellTone(now, 196, 0.55, 0.26, 'triangle');
          this.playBellTone(now + 0.14, 146.8, 0.65, 0.26, 'triangle');
        }
        break;
      }
    }
  }

  playBellTone(startTime, freq, duration, volume = 0.25, type = 'sine') {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  // 演出導入時の静かな前兆音（セリフ表示時）
  playPreludeTone(mode = 'neutral') {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (mode === 'horror') {
      // 遠くで街灯が消える低い余韻と静かな心音
      this.playHeartbeat(0.35);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 1.8);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 2.0);
    } else if (mode === 'relief') {
      // 遠くに光を見つけた時の柔らかな高音チャイム
      this.playBellTone(now, 523.25, 1.4, 0.14, 'sine');
      this.playBellTone(now + 0.35, 659.25, 1.5, 0.15, 'sine');
    } else {
      // カード導入セリフ時の静かな風音
      this.playNoiseBurst(0.5, 420, 2.0, 0.12);
    }
  }

  // ゆっくり忍び寄る足音と迫る恐怖のビルドアップ音（BAD END第2段階）
  playCreepingApproach() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 徐々に近づく足音（4歩）
    const stepDelays = [0.1, 0.85, 1.5, 2.05];
    stepDelays.forEach((d, idx) => {
      const vol = 0.12 + idx * 0.08;
      setTimeout(() => {
        if (!this.enabled || !this.ctx) return;
        this.playNoiseBurst(0.12, 320 + idx * 60, 2.2, vol);
        this.playHeartbeat(0.3 + idx * 0.12);
      }, d * 1000);
    });

    // 背後からゆっくり迫る低音クレッシェンド
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(65.4, now);
    osc.frequency.linearRampToValueAtTime(98.0, now + 2.6);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 2.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.9);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 3.0);
  }

  // BAD END ホラークライマックス音（急な破裂音ではなく、じわっと包み込む不協和音）
  playBadEndHorrorStinger(patternIndex = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const freqs = [73.4, 103.8, 155.5, 233.08, 466.16];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.linearRampToValueAtTime(f * (idx % 2 === 0 ? 0.92 : 1.04), now + 2.4);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.6);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 2.7);
    });

    this.playNoiseBurst(1.1, 680, 1.2, 0.25);
    setTimeout(() => this.playHeartbeat(0.55), 350);
    setTimeout(() => this.playHeartbeat(0.45), 950);
  }

  // HAPPY END 夜明け・安堵の和音
  playHappyEndRelief() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Cmaj9 温かいアルペジオ＋柔らかな光チャイム
    const notes = [261.63, 329.63, 392.00, 493.88, 587.33, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      this.playBellTone(now + i * 0.11, freq, 1.8, 0.22, 'sine');
      this.playBellTone(now + i * 0.11, freq * 0.5, 1.6, 0.12, 'triangle');
    });
  }

  // NORMAL END 夜明けの孤独な響き
  playNormalEndSound() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [220, 261.63, 329.63, 293.66];
    notes.forEach((freq, i) => {
      this.playBellTone(now + i * 0.25, freq, 1.1, 0.2, 'triangle');
    });
  }
}

window.maigoAudio = new MaigoAudioEngine();
