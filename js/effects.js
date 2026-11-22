// ============================================================================
// 『迷子 - MAIGO -』 ビジュアル演出・ホラーカットイン・環境エフェクトエンジン
// ============================================================================

class MaigoEffectsManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.weatherMode = 'night'; // 'night' | 'rain' | 'dawn' | 'blood'
    this.horrorLevel = 'standard'; // 'standard' | 'mild'
    this.cutinQueue = [];
    this.isPlayingCutin = false;
  }

  initCanvas() {
    this.canvas = document.getElementById('ambient-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    this.particles = [];
    for (let i = 0; i < 65; i++) {
      this.particles.push(this.createParticle());
    }
    this.animateCanvas();
  }

  createParticle() {
    const w = this.canvas ? this.canvas.width : 1280;
    const h = this.canvas ? this.canvas.height : 800;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.5 + 0.8,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.35 - 0.15,
      alpha: Math.random() * 0.55 + 0.1,
      phase: Math.random() * Math.PI * 2
    };
  }

  setWeather(mode, durationMs = 0) {
    this.weatherMode = mode;
    if (durationMs > 0) {
      setTimeout(() => {
        if (this.weatherMode === mode) {
          this.weatherMode = 'night';
        }
      }, durationMs);
    }
  }

  animateCanvas() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (this.weatherMode === 'rain') {
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.35)';
      ctx.lineWidth = 1.2;
      this.particles.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 6, p.y + 22);
        ctx.stroke();
        p.x -= 3.2;
        p.y += 12.5;
        if (p.y > h) {
          p.y = -20;
          p.x = Math.random() * (w + 100);
        }
      });
    } else {
      this.particles.forEach(p => {
        p.phase += 0.02;
        p.x += p.vx + Math.sin(p.phase) * 0.15;
        p.y += this.weatherMode === 'dawn' ? -0.6 : p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const alpha = p.alpha * (0.65 + 0.35 * Math.sin(p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        if (this.weatherMode === 'dawn') {
          ctx.fillStyle = `rgba(253, 224, 71, ${alpha})`;
        } else if (this.weatherMode === 'blood') {
          ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(251, 191, 36, ${alpha * 0.65})`;
        }
        ctx.fill();
      });
    }

    requestAnimationFrame(() => this.animateCanvas());
  }

  // --------------------------------------------------------------------------
  // 各カード専用のビジュアルカットイン演出
  // --------------------------------------------------------------------------
  async playCardCutin(cardId, playerName, count = 1, extraNote = '') {
    const card = window.MAIGO_CARDS[cardId];
    if (!card) return;

    const overlay = document.getElementById('cutin-overlay');
    if (!overlay) return;

    window.maigoAudio.playCardEffectSound(cardId);

    if (cardId === 'rain') {
      this.setWeather('rain', 6000);
    } else if (cardId === 'broken_streetlight' || cardId === 'shrine' || cardId === 'tunnel') {
      this.triggerScreenShake('shake-medium');
    } else if (cardId === 'railroad_crossing') {
      this.triggerScreenShake('shake-heavy');
    }

    const themeVisual = this.buildCardThemeVisualHTML(cardId, count);
    const categoryClass = card.category === 'light' ? 'cutin-light' : (card.category === 'dark' ? 'cutin-dark' : 'cutin-maigo');
    const countBadge = count > 1 ? `<span class="cutin-multi-badge">${count}枚同時使用！</span>` : '';
    const actionBadge = card.actionBonus > 0 ? `<span class="cutin-action-badge">行動＋${card.actionBonus}</span>` : '';

    overlay.innerHTML = `
      <div class="cutin-stage ${categoryClass} theme-${card.cutinTheme}">
        <div class="cutin-bg-effect">${themeVisual}</div>
        <div class="cutin-content">
          <div class="cutin-user-line">
            <span class="cutin-player-name">${this.escapeHTML(playerName)}</span> がカードを使用
            ${countBadge} ${actionBadge}
          </div>
          <div class="cutin-card-showcase">
            <div class="cutin-card-frame ${card.category}">
              <div class="cutin-card-art">${window.getCardIllustrationSVG(cardId)}</div>
              <div class="cutin-card-title">${card.name}</div>
            </div>
          </div>
          <div class="cutin-narration">${card.cutinText}</div>
          ${extraNote ? `<div class="cutin-extra-note">${this.escapeHTML(extraNote)}</div>` : ''}
        </div>
      </div>
    `;
    overlay.classList.remove('hidden');
    overlay.classList.add('active');

    const duration = cardId === 'railroad_crossing' ? 2100 : 1550;
    await new Promise(r => setTimeout(r, duration));

    overlay.classList.remove('active');
    overlay.classList.add('hidden');
  }

  buildCardThemeVisualHTML(cardId, count = 1) {
    switch (cardId) {
      case 'bright_streetlight':
        return `<div class="fx-streetlight-beam"></div><div class="fx-warm-particles"></div>`;
      case 'convenience_store':
        return `<div class="fx-neon-sign">24H CONVENIENCE STORE</div><div class="fx-cyan-glow"></div>`;
      case 'police_box':
        return `<div class="fx-patrol-red-lamp"></div>`;
      case 'lighthouse':
        return `<div class="fx-lighthouse-sweep"></div>`;
      case 'amulet':
        return `<div class="fx-talisman-ring">守護・封印</div>`;
      case 'incoming_call':
      case 'phone_booth':
        return `<div class="fx-phone-waves"><span>非通知設定</span></div>`;
      case 'railroad_crossing':
        return `
          <div class="fx-crossing-lights">
            <span class="lamp-left"></span>
            <span class="lamp-right"></span>
          </div>
          <div class="fx-crossing-bar"></div>
          <div class="fx-kan-text">カン…カン…カン…カン…！</div>
        `;
      case 'coin_laundry':
        return `<div class="fx-laundry-drum"></div>`;
      case 'rumor_light':
      case 'rumor_dark':
        return `
          <div class="fx-whispers">
            <span>「ねえ、聞いた…？」</span>
            <span>「山札の一番上に…」</span>
            <span>「あの子がいるよ…」</span>
          </div>
        `;
      case 'look_back':
        return `<div class="fx-footsteps">👣 👣 👣</div>`;
      case 'crosswalk':
        return `<div class="fx-crosswalk-stripes"></div><div class="fx-signal-blink">歩行者信号 点滅中</div>`;
      case 'aquarium':
        return `<div class="fx-water-ripples"></div>`;
      case 'broken_streetlight':
        return `<div class="fx-sparks">⚡ バチバチッ！ (${count}枚消灯)</div><div class="fx-dark-encroach"></div>`;
      case 'forked_road':
        return `<div class="fx-fork-arrows"><span>← 左の道</span><span>右の道 →</span></div>`;
      case 'shrine':
        return `<div class="fx-torii-gate">⛩</div><div class="fx-foxfires"><span>🔥</span><span>🔥</span><span>🔥</span></div>`;
      case 'tunnel':
        return `<div class="fx-tunnel-rings"></div>`;
      case 'rain':
        return `<div class="fx-rain-flash"></div>`;
      case 'narrow_path':
        return `<div class="fx-closing-walls"><div class="wall-l"></div><div class="wall-r"></div></div>`;
      case 'river':
      case 'sea':
        return `<div class="fx-dark-waves"></div>`;
      case 'park':
        return `<div class="fx-swing-shadow">キィ…コォ…</div>`;
      case 'kurosaki':
        return `<div class="fx-kurosaki-shadow">「迷子の案内は、あの方へ…」</div>`;
      case 'kamishiro':
        return `<div class="fx-kamishiro-flash"></div>`;
      default:
        return '';
    }
  }

  // --------------------------------------------------------------------------
  // 【BAD END】ランダムホラー演出（全6パターンからランダム選出）
  // --------------------------------------------------------------------------
  async playBadEndHorrorCutscene(player, reasonText = '', revealedCards = []) {
    const overlay = document.getElementById('cutin-overlay');
    if (!overlay) return;

    this.setWeather('blood', 5500);
    const patternIndex = Math.floor(Math.random() * 6);
    window.maigoAudio.playBadEndHorrorStinger(patternIndex);
    this.triggerScreenShake('shake-horror');

    const horrorPatterns = [
      {
        id: 'handprints',
        title: '「うしろ、だあれ？」',
        quote: '街灯が消えた瞬間、冷たい小さな手があなたの手首を掴んだ――「みーつけた。もう帰れないね」',
        visualHTML: `
          <div class="horror-scene scene-handprints">
            <div class="blood-hand hand-1">🖐</div>
            <div class="blood-hand hand-2">🖐</div>
            <div class="blood-hand hand-3">🖐</div>
            <div class="stalker-silhouette">
              <div class="stalker-eyes"><span></span><span></span></div>
            </div>
            <div class="creepy-vertical-text">みーつけた</div>
          </div>
        `
      },
      {
        id: 'beckoning',
        title: '「おいで、おいで…」',
        quote: '暗闇の奥から無数の白い手が伸びてくる。「こっちだよ…ずっと一緒に迷子になろう？」',
        visualHTML: `
          <div class="horror-scene scene-beckoning">
            <div class="reaching-hands-ring">
              <span>🫳</span><span>🫴</span><span>🫳</span><span>🫴</span><span>🫳</span><span>🫴</span>
            </div>
            <div class="abyss-eyes">👁 👁</div>
            <div class="creepy-vertical-text">こっちへおいで</div>
          </div>
        `
      },
      {
        id: 'phantom_train',
        title: '「開かずの踏切」',
        quote: 'カンカンカンカン！ 鳴り止まない警報機。通過する黒い列車の窓から、無数の顔がこちらを見つめていた――',
        visualHTML: `
          <div class="horror-scene scene-train">
            <div class="horror-warn-lamps"><span></span><span></span></div>
            <div class="phantom-train-rush">
              <div class="train-window">👤</div>
              <div class="train-window">👤</div>
              <div class="train-window">👤</div>
            </div>
            <div class="creepy-vertical-text">終電は過ぎた</div>
          </div>
        `
      },
      {
        id: 'cursed_call',
        title: '「公衆電話からの着信」',
        quote: '割れた画面に赤い文字が溢れ出す。『かえれない かえれない かえれない あなたのうしろにいるよ』',
        visualHTML: `
          <div class="horror-scene scene-cursed-call">
            <div class="repeating-curse-text">
              かえれない かえれない かえれない かえれない かえれない かえれない<br>
              かえれない かえれない うしろにいるよ かえれない かえれない かえれない<br>
              かえれない かえれない かえれない かえれない かえれない かえれない
            </div>
            <div class="screen-crack-svg">⚡</div>
          </div>
        `
      },
      {
        id: 'flashlight_dead',
        title: '「袋小路の影」',
        quote: '懐中電灯の光が激しく明滅し、行き止まりの壁に佇む首の傾いた影を照らし出した直後、ぷつりと消えた――',
        visualHTML: `
          <div class="horror-scene scene-flashlight">
            <div class="flashlight-cone">
              <div class="tilted-shadow-figure">👤</div>
              <div class="wall-graffiti">出口ナシ</div>
            </div>
          </div>
        `
      },
      {
        id: 'mirror_maze',
        title: '「合わせ鏡の夜道」',
        quote: '同じ角を何度曲がっても同じ場所に出る。ガラスに映った自分の背後に、見知らぬ子どもが立っていた――',
        visualHTML: `
          <div class="horror-scene scene-mirror">
            <div class="mirror-shards"></div>
            <div class="whisper-echoes">
              <span>「ここはどこ？」</span>
              <span>「帰れないよ」</span>
              <span>「ずっと一緒だよ」</span>
            </div>
          </div>
        `
      }
    ];

    const chosen = horrorPatterns[patternIndex];
    const mildClass = this.horrorLevel === 'mild' ? 'horror-mild' : '';

    const cardsHTML = revealedCards.map(c => {
      const def = window.MAIGO_CARDS[c.cardId];
      if (!def) return '';
      const isMaigo = def.category === 'maigo';
      return `
        <div class="revealed-mini-card ${def.category}">
          <span class="rmc-name">${def.name}</span>
          <span class="rmc-dest">${isMaigo ? '▲ 山札の一番上へ' : '▼ 捨て札へ'}</span>
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="cutin-stage bad-end-stage ${mildClass}">
        ${chosen.visualHTML}
        <div class="bad-end-content">
          <div class="bad-end-stamp">【 BAD END 】</div>
          <div class="bad-end-subtitle">${chosen.title}</div>
          <div class="bad-end-victim">${this.escapeHTML(player.name)} は闇に呑まれ脱落した…</div>
          <div class="bad-end-reason">${this.escapeHTML(reasonText || '手札から「あかり」が失われ、迷子に取り憑かれた')}</div>
          <div class="bad-end-quote">${chosen.quote}</div>
          <div class="bad-end-life-penalty">ライフ −3 （残りライフ: ${player.life}）</div>
          ${cardsHTML ? `
            <div class="bad-end-hand-reveal">
              <div class="reveal-header">公開された手札（迷子は山札の一番上へ戻される）：</div>
              <div class="reveal-cards-row">${cardsHTML}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');
    overlay.classList.add('active');

    await new Promise(r => setTimeout(r, 3800));

    overlay.classList.remove('active');
    overlay.classList.add('hidden');
  }

  // --------------------------------------------------------------------------
  // 【HAPPY END】無事帰宅・夜明けの救済演出
  // --------------------------------------------------------------------------
  async playHappyEndCutscene(player, isOideOide = false) {
    const overlay = document.getElementById('cutin-overlay');
    if (!overlay) return;

    this.setWeather('dawn', 5000);
    window.maigoAudio.playHappyEndRelief();

    if (isOideOide) {
      overlay.innerHTML = `
        <div class="cutin-stage oide-finish-stage">
          <div class="cutin-content">
            <div class="happy-end-badge oide-badge">【 手札完遂 】</div>
            <div class="happy-end-title">${this.escapeHTML(player.name)} は全ての手札を使い切った…</div>
            <div class="happy-end-quote">「ふふ…あとは誰が迷子になるか、見届けるだけ…」</div>
            <div class="happy-end-life">このラウンドから離脱（ライフ変動はラウンド終了時に精算）</div>
          </div>
        </div>
      `;
    } else {
      overlay.innerHTML = `
        <div class="cutin-stage happy-end-stage">
          <div class="dawn-sunbeams"></div>
          <div class="home-lantern-glow">🏠</div>
          <div class="cutin-content">
            <div class="happy-end-badge">【 HAPPY END - 無事帰宅 】</div>
            <div class="happy-end-title">${this.escapeHTML(player.name)} は夜道を抜け出し、無事に帰宅した！</div>
            <div class="happy-end-quote">
              「遠くに見慣れた家の明かりが見える…！ 玄関の扉を開けると、温かい光が迎えてくれた。<br>
              ――よかった、本当に助かった…！」
            </div>
            <div class="happy-end-life">ライフ ＋2 回復！（現在ライフ: ${player.life} / 7）</div>
          </div>
        </div>
      `;
    }

    overlay.classList.remove('hidden');
    overlay.classList.add('active');

    await new Promise(r => setTimeout(r, 3100));

    overlay.classList.remove('active');
    overlay.classList.add('hidden');
  }

  // --------------------------------------------------------------------------
  // 【横断歩道】「迷子」所持プレイヤーの挙手演出
  // --------------------------------------------------------------------------
  async playCrosswalkRaiseHandsCutscene(raisedNames = []) {
    const overlay = document.getElementById('cutin-overlay');
    if (!overlay) return;

    window.maigoAudio.playHeartbeat(0.6);

    const listHTML = raisedNames.length > 0
      ? raisedNames.map(n => `<div class="raised-hand-chip">✋ ${this.escapeHTML(n)}（迷子所持！）</div>`).join('')
      : `<div class="no-raised-chip">手札に「迷子」を持っているプレイヤーはいませんでした</div>`;

    overlay.innerHTML = `
      <div class="cutin-stage cutin-light">
        <div class="cutin-content">
          <div class="crosswalk-title">【横断歩道】「迷子」所持者の挙手確認</div>
          <div class="raised-hands-list">${listHTML}</div>
          <div class="cutin-narration">
            ${raisedNames.length > 0 ? '手を上げたプレイヤーは左隣から順に山札を1枚引く…' : '誰も手を上げなかった…'}
          </div>
        </div>
      </div>
    `;
    overlay.classList.remove('hidden');
    overlay.classList.add('active');
    await new Promise(r => setTimeout(r, 2000));
    overlay.classList.remove('active');
    overlay.classList.add('hidden');
  }

  triggerScreenShake(shakeClass = 'shake-medium') {
    const appEl = document.getElementById('app-root') || document.body;
    appEl.classList.remove('shake-medium', 'shake-heavy', 'shake-horror');
    void appEl.offsetWidth;
    appEl.classList.add(shakeClass);
    setTimeout(() => {
      appEl.classList.remove(shakeClass);
    }, 850);
  }

  escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

window.maigoEffects = new MaigoEffectsManager();
