// ============================================================================
// 『迷子 - MAIGO -』 ビジュアル演出・ホラーカットイン・環境エフェクトエンジン
// 全演出に「〇〇『あ、明かりが…』」等のランダム導入セリフ＋ゆっくり忍び寄る段階的演出を実装
// ============================================================================

class MaigoEffectsManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.weatherMode = 'night'; // 'night' | 'rain' | 'dawn' | 'blood'
    this.horrorLevel = 'standard'; // 'standard' | 'mild'
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
    for (let i = 0; i < 60; i++) {
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

  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // 指定時間待機、またはユーザーのタップでスキップ可能にするヘルパー
  waitForCutinDurationOrTap(overlay, durationMs, minLockMs = 900) {
    return new Promise(resolve => {
      let finished = false;
      let canSkip = false;

      const lockTimer = setTimeout(() => {
        canSkip = true;
      }, minLockMs);

      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(lockTimer);
        clearTimeout(autoTimer);
        overlay.removeEventListener('click', onClick);
        resolve();
      };

      const onClick = () => {
        if (canSkip) finish();
      };

      overlay.addEventListener('click', onClick);
      const autoTimer = setTimeout(finish, durationMs);
    });
  }

  // カードごとのランダム導入セリフ一覧
  getCardRandomDialogue(cardId, playerName) {
    const linesMap = {
      bright_streetlight: [
        `「あ、街灯の明かりがついてる……まだ引き返せるかも」`,
        `「よかった……この通りはまだオレンジ色の光が灯ってる……」`,
        `「ジジ……って音がして、頭上の街灯が夜道を照らしてくれた」`
      ],
      convenience_store: [
        `「あそこ、コンビニの白い看板が光ってる……！ 入ってみよう」`,
        `「24時間営業の明かりだ……！ 少し先の様子が見通せるかも」`,
        `「暗闇の中にコンビニがある……ここで少し体制を立て直そう」`
      ],
      police_box: [
        `「交番の赤いランプが見える……！ あの子を保護してもらおう」`,
        `「お巡りさんがいる……！ 迷子を預けて先へ急ごう」`,
        `「赤い光が夜霧を照らしてる……ここなら迷子を引き取ってもらえる」`
      ],
      lighthouse: [
        `「遠くから灯台の強い光が回ってきた……この1枚を照らし出そう」`,
        `「闇を裂くサーチライトだ……次の人には絶対にこのカードを引かせる！」`,
        `「灯台の光がカードをとらえた……もう他のカードには手を伸ばせないはず」`
      ],
      amulet: [
        `「この御守りがあれば大丈夫……大事なこの1枚だけは絶対に渡さない」`,
        `「お願い、守って……このカードだけは誰にも奪われないように……」`,
        `「懐の御守りが淡く光った……これで大切なカードを守り抜ける」`
      ],
      incoming_call: [
        `「えっ……こんな夜中に着信……？ 隣の人のスマホが鳴り出した……！」`,
        `「プルルル……『非通知設定』……？ 隣の人、電話が鳴ってるよ……」`,
        `「静かな夜道にスマホの着信音が響く……誰からの電話だろう……」`
      ],
      railroad_crossing: [
        `「カン、カン、カン……踏切が降りてきた……迷子に出くわさずに渡りきれるか……！？」`,
        `「警報機が鳴り出した……遮断機の向こうに“あの子”がいませんように……！」`,
        `「赤い警報灯が点滅してる……一か八か、この踏切を駆け抜けるしかない！」`
      ],
      phone_booth: [
        `「夜霧の中に公衆電話がある……中でベルが鳴り続けてる……」`,
        `「曇ったガラスの電話ボックスだ……受話器の向こうから誰かの声がする……」`,
        `「誰もいないのに電話ボックスの灯りがついてる……誰につながるんだろう」`
      ],
      coin_laundry: [
        `「深夜のコインランドリーだ……誰もいないのに洗濯機だけが回ってる……」`,
        `「白い蛍光灯の店内……回転するドラムの中で手札を1枚入れ替えよう」`,
        `「ゴォォ……と洗濯機の音が響く。ここで山札の上とカードを入れ替えよう」`
      ],
      rumor_light: [
        `「ねえ、聞いた……？ この先の山札に“あの子”が潜んでるって……」`,
        `「街灯の下で誰かが囁いてる……『次に引くカードに迷子がいるよ』って……」`,
        `「妙なうわさ話を思い出した……山札の中を確かめておこう……」`
      ],
      look_back: [
        `「……今、後ろで何かが落ちた音がしなかった……？」`,
        `「背後に気配がしてそっと振り返る……来た道にカードが落ちている……！」`,
        `「コツ……と後ろで足音がした。振り返って捨て札を1枚拾い上げる……」`
      ],
      crosswalk: [
        `「歩行者信号がチカチカ点滅してる……今『迷子』を連れているのは誰だ……？」`,
        `「白い横断歩道の上を渡る時、連れている迷子の影が浮かび上がる……」`,
        `「信号が変わる前に確認しよう……『迷子』を持っている人は手を上げて！」`
      ],
      aquarium: [
        `「真夜中の水族館……青い水槽の光の中で、全員の手札が混ざり合っていく……」`,
        `「深い水のゆらめきに視界が溶ける……みんなのカードがシャッフルされていく……」`,
        `「静かな水槽の前……全員から1枚ずつカードを集めて配り直そう」`
      ],
      broken_streetlight: [
        `「あっ……頭上の街灯がバチッて音を立てて消えちゃった……」`,
        `「電球が割れて火花が散った……足元からじわじわ暗闇が広がっていく……」`,
        `「街灯が壊れてる……この通り、だんだん暗くなってきた……」`
      ],
      rumor_dark: [
        `「暗がりからひそひそ声が聞こえる……『次はあの子が連れていかれるよ』って……」`,
        `「ねえ、知ってる……？ 山札の一番上に“迷子”が近づいてきてるんだって……」`,
        `「闇の中から誰かの囁き声がする……山札の一番上に迷子を呼び寄せよう……」`
      ],
      forked_road: [
        `「霧の分かれ道に出た……ひとりじゃ怖いから、あなたも一緒に来て……」`,
        `「道が二つに分かれてる……道連れを1人選んで、一緒に山札を引こう……」`,
        `「右か左か……薄暗い標識の前で、選んだ相手と一緒に一歩踏み出す……」`
      ],
      shrine: [
        `「真夜中の神社だ……シャン、と鈴が鳴って、すべての『迷子』が1人の元へ集まっていく……！」`,
        `「朱色の鳥居の奥から風が吹く……一番手札が多い人のもとへ迷子の影が集結する……！」`,
        `「狐火が揺れている……全員が抱えていた『迷子』が、あの人の手札へ吸い寄せられていく……」`
      ],
      tunnel: [
        `「冷たいトンネルに入った……吹き抜ける突風が、余分な『あかり』を吹き消していく……！」`,
        `「暗いコンクリートの洞窟だ……『あかり』を2枚以上持っている人は灯りを1つ奪われる……」`,
        `「トンネルの奥から冷たい風が吹いてきた……手元の明かりが消されてしまう……！」`
      ],
      rain: [
        `「ぽつり、ぽつり……冷たい夜の雨が降り出して、全員の視界が滲んでいく……」`,
        `「雨脚が強くなってきた……左隣の人から順番に、全員山札を1枚引かされる……」`,
        `「冷たい雨粒が頬を打つ……帰り道が雨に濡れて見えなくなっていく……」`
      ],
      narrow_path: [
        `「肩が触れそうな細い路地裏……近道のはずなのに、歩いても歩いても出口がない……」`,
        `「薄暗い隙間道に迷い込んでしまった……山札からカードを2枚引かされる……」`,
        `「塀に囲まれた細い道……暗がりの中で手荷物が2枚増えてしまった……」`
      ],
      river: [
        `「黒い川が音もなく流れている……手放した1枚が、そのまま左隣の人へ流れ着く……」`,
        `「暗い水面にカードを浮かべる……全員の手札が1枚ずつ左隣へと巡っていく……」`,
        `「夜の川辺に出た……全員同時にカードを1枚、左隣のプレイヤーへ渡そう……」`
      ],
      sea: [
        `「夜の海に出た……ザザァッと寄せる黒い波が、手札をすべて呑み込んでいく……！」`,
        `「暗い波打ち際……手札をすべて山札の深淵へ戻し、同じ枚数を引き直す……！」`,
        `「潮風が吹き荒れる夜の海……持っていたカードが波にさらわれ、新たな手札が打ち上げられる」`
      ],
      park: [
        `「誰もいない深夜の公園……風もないのに、ブランコだけがキィ、コォと揺れている……」`,
        `「暗い公園を横切る……砂場の向こうに誰かいる気がして、山札を1枚引いた……」`,
        `「静まり返った夜の公園……街灯の下で山札からカードを1枚引く……」`
      ],
      kurosaki: [
        `「黒いコートの黒崎さんが現れた……『そちらの迷子は、あの方に案内させましょう』」`,
        `「暗がりから黒崎さんが静かに微笑む……手元の『迷子』をすべてあの人へ渡そう……」`,
        `「黒崎さんが指し示す先へ、自分の手札の『迷子』がすべて歩いていった……」`
      ],
      kamishiro: [
        `「白い服の神白さんが通り過ぎた……夜霧が晴れて、続けてあと2回行動できる！」`,
        `「神白さんの穏やかな気配が背中を押してくれる……！（行動＋2）」`,
        `「暗闇の中に白い人影が見えた気がした……不思議と足取りが軽くなった！（行動＋2）」`
      ]
    };

    const candidates = linesMap[cardId] || [`「このカードを使おう……」`];
    return `${playerName}${this.pickRandom(candidates)}`;
  }

  // --------------------------------------------------------------------------
  // 各カード専用のビジュアルカットイン演出
  // いきなりカードがドンと出るのではなく、導入セリフがふわっと出てから効果が現れる2段階構成
  // --------------------------------------------------------------------------
  async playCardCutin(cardId, playerName, count = 1, extraNote = '') {
    const card = window.MAIGO_CARDS[cardId];
    if (!card) return;

    const overlay = document.getElementById('cutin-overlay');
    if (!overlay) return;

    const dialogueLine = this.getCardRandomDialogue(cardId, playerName);
    const themeVisual = this.buildCardThemeVisualHTML(cardId, count);
    const categoryClass = card.category === 'light' ? 'cutin-light' : (card.category === 'dark' ? 'cutin-dark' : 'cutin-maigo');
    const countBadge = count > 1 ? `<span class="cutin-multi-badge">${count}枚同時使用！</span>` : '';
    const actionBadge = card.actionBonus > 0 ? `<span class="cutin-action-badge">行動＋${card.actionBonus}</span>` : '';

    // まず静かな導入音を鳴らし、セリフをゆっくりフェードイン表示
    window.maigoAudio.playPreludeTone(card.category === 'light' ? 'relief' : 'neutral');

    overlay.innerHTML = `
      <div class="cutin-stage ${categoryClass} theme-${card.cutinTheme} slow-stage-fade">
        <div class="cutin-bg-effect">${themeVisual}</div>
        <div class="cutin-content">
          <div class="cutin-prelude-dialogue">${this.escapeHTML(dialogueLine)}</div>
          <div class="cutin-main-body delayed-reveal" id="cutin-delayed-body">
            <div class="cutin-user-line">
              <span class="cutin-player-name">${this.escapeHTML(playerName)}</span> が【${card.name}】を使用
              ${countBadge} ${actionBadge}
            </div>
            <div class="cutin-card-showcase">
              <div class="cutin-card-frame ${card.category} gentle-card-appear">
                <div class="cutin-card-art">${window.getCardIllustrationSVG(cardId)}</div>
                <div class="cutin-card-title">${card.name}</div>
              </div>
            </div>
            <div class="cutin-effect-desc-box">
              <div class="ced-label">【カード効果】</div>
              <div class="ced-text">${this.escapeHTML(card.description)}</div>
            </div>
            ${extraNote ? `<div class="cutin-extra-note">▶ ${this.escapeHTML(extraNote)}</div>` : ''}
            <div class="cutin-skip-hint">画面タップで次へ進む ▶</div>
          </div>
        </div>
      </div>
    `;
    overlay.classList.remove('hidden');
    overlay.classList.add('active');

    // 1.1秒間セリフを読ませてから、カード本体と効果音をゆっくり立ち上げる
    await new Promise(r => setTimeout(r, 1150));
    const delayedBody = document.getElementById('cutin-delayed-body');
    if (delayedBody) {
      delayedBody.classList.add('revealed');
    }
    window.maigoAudio.playCardEffectSound(cardId);
    if (cardId === 'rain') {
      this.setWeather('rain', 8000);
    }

    const duration = cardId === 'railroad_crossing' ? 4600 : 4000;
    await this.waitForCutinDurationOrTap(overlay, duration, 600);

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
          <div class="fx-kan-text">カン…カン…カン…カン…</div>
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
        return `<div class="fx-sparks">⚡ 街灯消灯 (${count}枚)</div><div class="fx-dark-encroach"></div>`;
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
  // 【BAD END】3段階の「ランダムな気づきセリフ → ゆっくり忍び寄る恐怖 → 襲撃と結果開示」
  // いきなり大音量や画面が出てびっくりするのではなく、じわじわ恐怖が迫る演出
  // --------------------------------------------------------------------------
  async playBadEndHorrorCutscene(player, reasonText = '', revealedCards = []) {
    const overlay = document.getElementById('cutin-overlay');
    if (!overlay) return;

    this.setWeather('blood', 12000);
    const patternIndex = Math.floor(Math.random() * 6);
    const isRailroad = String(reasonText).includes('踏切');

    // 第1段階用のランダムな「気づき・明かり消失」セリフ（12種類以上）
    const victimDialogues = isRailroad
      ? [
          `${player.name}「え……？ 踏切の遮断機の向こうに立ってるあの子……誰……？」`,
          `${player.name}「カン、カン、カン……警報機が鳴り止まない……足がすくんで動けない……！」`,
          `${player.name}「嘘……踏切の真ん中で、誰かに冷たい手で手首を掴まれた……」`
        ]
      : [
          `${player.name}「あ、明かりが……消えちゃった……」`,
          `${player.name}「あれ……？ 手元のあかりが、もう1つも残ってない……」`,
          `${player.name}「待って……懐中電灯がぷつりって消えて、何も見えなくなった……」`,
          `${player.name}「え……？ さっきまで隣を歩いてたはずのみんな、どこに行ったの……？」`,
          `${player.name}「嘘だ……最後の明かりが消えて、足元から闇が這い上がってくる……」`,
          `${player.name}「あれ……？ 後ろから、誰かの小さな足音が近づいてきてない……？」`,
          `${player.name}「なんで……何度角を曲がっても、同じ真っ暗な路地に戻ってくる……」`,
          `${player.name}「ねえ、誰か返事して……！ 真っ暗で帰り道が分からないよ……！」`,
          `${player.name}「待って……今、後ろから私の袖を引っ張ったの、誰……？」`,
          `${player.name}「街灯がぜんぶ消えていく……うしろに、誰か立ってる……」`
        ];

    // 第2段階用のランダムな「背後から忍び寄る声」
    const stalkerWhispers = [
      `？？？「……ねえ、もう明かりは無くなっちゃったね」`,
      `？？？「……みーつけた。もうおうちには帰れないよ」`,
      `？？？「……こっちだよ。おいで、おいで……ずっと一緒に遊ぼう？」`,
      `？？？「……ひとりぼっちになっちゃったね。手をつなごう？」`,
      `？？？「……うしろ、だあれ？」`,
      `？？？「……ずっと、あなたの後ろを歩いていたんだよ」`
    ];

    const chosenVictimLine = this.pickRandom(victimDialogues);
    const chosenWhisperLine = this.pickRandom(stalkerWhispers);

    const horrorPatterns = [
      {
        id: 'handprints',
        title: '「うしろ、だあれ？」',
        quote: '暗闇の中で冷たい小さな手があなたの手首をそっと握りしめた――「みーつけた。もう帰れないね」',
        visualHTML: `
          <div class="horror-scene scene-handprints slow-creeping-visual">
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
        quote: '暗闇の奥から無数の白い手がゆっくりと伸びてくる。「こっちだよ…ずっと一緒に迷子になろう？」',
        visualHTML: `
          <div class="horror-scene scene-beckoning slow-creeping-visual">
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
        quote: '遠くから響く警報機の音。ゆっくりと通過する黒い列車の窓から、無数の目がこちらを見つめていた――',
        visualHTML: `
          <div class="horror-scene scene-train slow-creeping-visual">
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
        quote: '暗闇で画面がぼんやりと赤く灯り、文字がじわじわと浮かび上がる。『かえれない かえれない あなたのうしろにいるよ』',
        visualHTML: `
          <div class="horror-scene scene-cursed-call slow-creeping-visual">
            <div class="repeating-curse-text">
              かえれない かえれない かえれない かえれない かえれない<br>
              かえれない うしろにいるよ かえれない かえれない<br>
              かえれない かえれない かえれない かえれない かえれない
            </div>
          </div>
        `
      },
      {
        id: 'flashlight_dead',
        title: '「袋小路の影」',
        quote: 'かすかな光が明滅し、行き止まりの壁に佇む影がゆっくりと一歩ずつ近づいてきて、ふっと闇に溶けた――',
        visualHTML: `
          <div class="horror-scene scene-flashlight slow-creeping-visual">
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
        quote: '暗いガラス窓に映った自分の背後に、いつの間にか見知らぬ子どもが寄り添って立っていた――',
        visualHTML: `
          <div class="horror-scene scene-mirror slow-creeping-visual">
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

    // 【第1段階】暗転と気づきのセリフ（「〇〇『あ、明かりが…』」）
    window.maigoAudio.playPreludeTone('horror');

    overlay.innerHTML = `
      <div class="cutin-stage bad-end-stage ${mildClass} slow-stage-fade">
        <div id="bad-end-creeping-layer" class="creeping-layer-hidden">
          ${chosen.visualHTML}
        </div>
        <div class="bad-end-narrative-wrap">
          <!-- 第1段階：プレイヤーの気づきセリフ -->
          <div class="bad-end-dialogue-step1" id="be-step1-line">
            ${this.escapeHTML(chosenVictimLine)}
          </div>
          <!-- 第2段階：背後から忍び寄る足音と囁き -->
          <div class="bad-end-dialogue-step2 hidden" id="be-step2-line">
            <div class="creeping-footsteps-dots">コツ……　コツ……　コツ……</div>
            <div class="creeping-whisper-text">${this.escapeHTML(chosenWhisperLine)}</div>
          </div>
          <!-- 第3段階：襲撃後のBAD END詳細パネル -->
          <div class="bad-end-content hidden" id="be-step3-panel">
            <div class="bad-end-stamp">【 BAD END 】</div>
            <div class="bad-end-subtitle">${chosen.title}</div>
            <div class="bad-end-victim">💀 ${this.escapeHTML(player.name)} は闇に呑まれ、このラウンドから脱落した…</div>
            <div class="bad-end-reason">【原因】${this.escapeHTML(reasonText || '手札から「あかり」が失われ、迷子に取り憑かれた')}</div>
            <div class="bad-end-quote">${chosen.quote}</div>
            <div class="bad-end-life-penalty">ライフ −3 （残りライフ: ❤️${player.life}）</div>
            ${cardsHTML ? `
              <div class="bad-end-hand-reveal">
                <div class="reveal-header">公開された手札（「迷子」は山札の一番上へ置かれ、残りは捨て札になります）：</div>
                <div class="reveal-cards-row">${cardsHTML}</div>
              </div>
            ` : ''}
            <button type="button" class="btn-danger cutin-confirm-btn">内容を確認して次へ ▶</button>
          </div>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');
    overlay.classList.add('active');

    // 2.4秒間、静寂の中で「あ、明かりが…」のセリフを読ませる
    await new Promise(r => setTimeout(r, 2400));

    // 【第2段階】ゆっくり忍び寄る足音・怪異の影・囁き声がじわじわ現れる（約2.8秒）
    const step2El = document.getElementById('be-step2-line');
    const creepLayer = document.getElementById('bad-end-creeping-layer');
    if (step2El) step2El.classList.remove('hidden');
    if (creepLayer) creepLayer.classList.add('creeping-active');
    window.maigoAudio.playCreepingApproach();

    await new Promise(r => setTimeout(r, 2800));

    // 【第3段階】闇に呑まれ、BAD END結果パネルがゆっくり浮かび上がる
    const step3El = document.getElementById('be-step3-panel');
    if (step3El) step3El.classList.remove('hidden');
    window.maigoAudio.playBadEndHorrorStinger(patternIndex);
    if (this.horrorLevel !== 'mild') {
      this.triggerScreenShake('shake-medium');
    }

    // 結果パネル表示後、じっくり8秒間（または確認ボタン／画面タップまで）保持
    await this.waitForCutinDurationOrTap(overlay, 8000, 1200);

    overlay.classList.remove('active');
    overlay.classList.add('hidden');
  }

  // --------------------------------------------------------------------------
  // 【HAPPY END】2段階の「光を見つけたセリフ → 温かい夜明けと無事帰宅」演出
  // --------------------------------------------------------------------------
  async playHappyEndCutscene(player, isOideOide = false) {
    const overlay = document.getElementById('cutin-overlay');
    if (!overlay) return;

    if (isOideOide) {
      const oideLines = [
        `${player.name}「ふふ……私の手札は全部なくなったよ。あとは誰が迷子になるのかな……？」`,
        `${player.name}「手札はすべて使い切った……さあ、残された人たちは無事に帰れるかな……？」`,
        `${player.name}「くすくす……私の役目はここまで。暗闇の中で見届けてあげる……」`
      ];
      const chosenLine = this.pickRandom(oideLines);
      window.maigoAudio.playPreludeTone('neutral');

      overlay.innerHTML = `
        <div class="cutin-stage oide-finish-stage slow-stage-fade">
          <div class="cutin-content">
            <div class="cutin-prelude-dialogue">${this.escapeHTML(chosenLine)}</div>
            <div class="delayed-reveal" id="happy-delayed-body">
              <div class="happy-end-badge oide-badge">【 手札完遂 】</div>
              <div class="happy-end-title">${this.escapeHTML(player.name)} は全ての手札を使い切った…</div>
              <div class="happy-end-life">このラウンドから離脱（ライフ変動はラウンド終了時に精算）</div>
              <div class="cutin-skip-hint">画面タップで次へ進む ▶</div>
            </div>
          </div>
        </div>
      `;
      overlay.classList.remove('hidden');
      overlay.classList.add('active');

      await new Promise(r => setTimeout(r, 1800));
      document.getElementById('happy-delayed-body')?.classList.add('revealed');
      await this.waitForCutinDurationOrTap(overlay, 4800, 800);

      overlay.classList.remove('active');
      overlay.classList.add('hidden');
      return;
    }

    // 通常プレイヤーのHAPPY END導入セリフ
    const reliefLines = [
      `${player.name}「あ……！ あそこに見えるの、もしかして家の明かり……！？」`,
      `${player.name}「暗い路地を抜けた……！ 見覚えのある駅前の大通りだ……！」`,
      `${player.name}「空が白んできた……もう後ろから足音はしない……助かったんだ……！」`,
      `${player.name}「玄関のあたたかい灯りが見える……！ やっと、おうちに帰れる……！」`,
      `${player.name}「はぁ、はぁ……街灯の続く明るい道に出た……本当に助かった……！」`,
      `${player.name}「遠くから朝の音が聞こえる……長い夜道を抜け出せたんだ……！」`
    ];
    const chosenRelief = this.pickRandom(reliefLines);

    window.maigoAudio.playPreludeTone('relief');

    overlay.innerHTML = `
      <div class="cutin-stage happy-end-stage slow-stage-fade">
        <div class="dawn-sunbeams"></div>
        <div class="cutin-content">
          <div class="cutin-prelude-dialogue relief-dialogue">${this.escapeHTML(chosenRelief)}</div>
          <div class="delayed-reveal" id="happy-delayed-body">
            <div class="home-lantern-glow">🏠</div>
            <div class="happy-end-badge">【 HAPPY END - 無事帰宅 】</div>
            <div class="happy-end-title">${this.escapeHTML(player.name)} は夜道を抜け出し、無事に帰宅した！</div>
            <div class="happy-end-quote">
              「玄関の扉を開けると、家族の待つ温かい光が迎えてくれた。<br>
              ――ただいま。もう迷わなくていいんだ。」
            </div>
            <div class="happy-end-life">ライフ ＋2 回復！（現在ライフ: ❤️${player.life} / 7）</div>
            <div class="cutin-skip-hint">画面タップで次へ進む ▶</div>
          </div>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');
    overlay.classList.add('active');

    // 2.0秒間、明かりを見つけたセリフを読ませてから夜明けの和音と結果パネルを広げる
    await new Promise(r => setTimeout(r, 2000));
    this.setWeather('dawn', 7000);
    window.maigoAudio.playHappyEndRelief();
    document.getElementById('happy-delayed-body')?.classList.add('revealed');

    await this.waitForCutinDurationOrTap(overlay, 5800, 1000);

    overlay.classList.remove('active');
    overlay.classList.add('hidden');
  }

  // --------------------------------------------------------------------------
  // 【NORMAL END】最後の1人として夜明けまで彷徨った演出
  // --------------------------------------------------------------------------
  async playNormalEndCutscene(player) {
    const overlay = document.getElementById('cutin-overlay');
    if (!overlay) return;

    const normalLines = [
      `${player.name}「あれ……気づいたら、周りに誰もいなくなってる……」`,
      `${player.name}「なんとか朝を迎えたけど……一晩中歩き回って、もうクタクタだ……」`,
      `${player.name}「ひとりぼっちで夜が明けた……ひどく体力を消耗してしまった……」`
    ];
    const chosenLine = this.pickRandom(normalLines);

    window.maigoAudio.playPreludeTone('neutral');

    overlay.innerHTML = `
      <div class="cutin-stage cutin-dark slow-stage-fade">
        <div class="cutin-content">
          <div class="cutin-prelude-dialogue">${this.escapeHTML(chosenLine)}</div>
          <div class="delayed-reveal" id="normal-delayed-body">
            <div class="happy-end-badge" style="background:linear-gradient(135deg,#94a3b8,#475569);color:#fff;box-shadow:none;">
              【 NORMAL END - 夜明けの彷徨 】
            </div>
            <div class="happy-end-title">${this.escapeHTML(player.name)} は最後の1人として夜明けを迎えた…</div>
            <div class="happy-end-quote">
              「迷子に呑まれることは免れたものの、長い夜道を彷徨い続け、ひどく疲弊している…」
            </div>
            <div class="bad-end-life-penalty" style="background:#475569;">ライフ −1 （残りライフ: ❤️${player.life} / 7）</div>
            <div class="cutin-skip-hint">画面タップで結果画面へ進む ▶</div>
          </div>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');
    overlay.classList.add('active');

    await new Promise(r => setTimeout(r, 1900));
    window.maigoAudio.playNormalEndSound();
    document.getElementById('normal-delayed-body')?.classList.add('revealed');

    await this.waitForCutinDurationOrTap(overlay, 4500, 900);

    overlay.classList.remove('active');
    overlay.classList.add('hidden');
  }

  // --------------------------------------------------------------------------
  // 【横断歩道】「迷子」所持プレイヤーの挙手演出
  // --------------------------------------------------------------------------
  async playCrosswalkRaiseHandsCutscene(raisedNames = []) {
    const overlay = document.getElementById('cutin-overlay');
    if (!overlay) return;

    window.maigoAudio.playHeartbeat(0.45);

    const listHTML = raisedNames.length > 0
      ? raisedNames.map(n => `<div class="raised-hand-chip">✋ ${this.escapeHTML(n)}（迷子所持！）</div>`).join('')
      : `<div class="no-raised-chip">手札に「迷子」を持っているプレイヤーはいませんでした</div>`;

    overlay.innerHTML = `
      <div class="cutin-stage cutin-light slow-stage-fade">
        <div class="cutin-content">
          <div class="crosswalk-title">【横断歩道】「迷子」所持者の挙手確認</div>
          <div class="raised-hands-list">${listHTML}</div>
          <div class="cutin-narration">
            ${raisedNames.length > 0 ? '手を上げたプレイヤーは左隣から順に山札を1枚引く…' : '誰も手を上げなかった…'}
          </div>
          <div class="cutin-skip-hint">画面タップで次へ進む ▶</div>
        </div>
      </div>
    `;
    overlay.classList.remove('hidden');
    overlay.classList.add('active');
    await this.waitForCutinDurationOrTap(overlay, 4500, 800);
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
