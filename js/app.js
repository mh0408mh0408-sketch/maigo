// ============================================================================
// 『迷子 - MAIGO -』 メインUIコントローラ＆Firebaseオンライン同期マネージャ
// ============================================================================

class MaigoApp {
  constructor() {
    this.myPlayerId = this.getOrCreatePlayerId();
    this.myPlayerName = localStorage.getItem('maigo_player_name') || '迷い人';
    this.myCharacterId = localStorage.getItem('maigo_char_id') || window.MAIGO_CHARACTERS[0].id;

    this.isOnlineRoom = false;
    this.roomId = null;
    this.isHost = false;
    this.roomUnsubscribe = null;
    this.publicRoomsUnsubscribe = null;

    this.roomData = null; // 待機室データ
    this.gameState = null; // 進行中ゲーム状態

    this.selectedHandUids = [];
    this.convenienceSelectedTakeUid = null;
    this.convenienceOrderUids = [];
    this.conveniencePhase = 1; // 1: 手札に加える1枚選択, 2: 山札に戻す順番並べ替え
    this.modalPreviewCardUid = null;
    this.isHandDrawerOpen = true;

    this.lastProcessedEventSeq = 0;
    this.isAnimatingEvent = false;
    this.cpuTimer = null;
  }

  getOrCreatePlayerId() {
    let id = sessionStorage.getItem('maigo_player_id');
    if (!id) {
      id = 'p_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
      sessionStorage.setItem('maigo_player_id', id);
    }
    return id;
  }

  init() {
    window.maigoEffects.initCanvas();
    this.bindStaticEvents();
    this.renderCharacterSelector();
    this.subscribePublicRoomsList();

    const nameInput = document.getElementById('player-name-input');
    if (nameInput) {
      nameInput.value = this.myPlayerName;
      nameInput.addEventListener('input', e => {
        this.myPlayerName = e.target.value.trim() || '迷い人';
        localStorage.setItem('maigo_player_name', this.myPlayerName);
        this.renderPublicRoomsAndReconnectBanner();
      });
    }
  }

  bindStaticEvents() {
    // サウンド切替
    const soundBtn = document.getElementById('btn-toggle-sound');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const on = window.maigoAudio.toggleSound();
        if (on) window.maigoAudio.startAmbientBGM();
        soundBtn.innerHTML = on ? '🔊 音響 ON' : '🔇 音響 OFF';
        soundBtn.classList.toggle('muted', !on);
      });
    }

    // 初回クリックで環境BGM開始
    document.body.addEventListener('pointerdown', () => {
      window.maigoAudio.startAmbientBGM();
    }, { once: true });

    // ルール・カード図鑑モーダル
    document.getElementById('btn-open-rules')?.addEventListener('click', () => this.openRulebookModal());
    document.getElementById('btn-header-rules')?.addEventListener('click', () => this.openRulebookModal());
    document.getElementById('btn-game-rules')?.addEventListener('click', () => this.openRulebookModal());
    document.getElementById('btn-close-rules')?.addEventListener('click', () => {
      document.getElementById('rulebook-modal')?.classList.add('hidden');
    });

    // 捨て札確認モーダル
    document.getElementById('btn-inspect-discard')?.addEventListener('click', () => this.openDiscardInspectModal());
    document.getElementById('btn-close-discard')?.addEventListener('click', () => {
      document.getElementById('discard-modal')?.classList.add('hidden');
    });

    // スマホ用ログドロワー開閉
    const toggleMobileLog = () => {
      document.getElementById('game-log-panel')?.classList.toggle('mobile-open');
    };
    document.getElementById('btn-toggle-mobile-log')?.addEventListener('click', toggleMobileLog);
    document.getElementById('live-log-ticker')?.addEventListener('click', toggleMobileLog);
    document.getElementById('btn-close-mobile-log')?.addEventListener('click', () => {
      document.getElementById('game-log-panel')?.classList.remove('mobile-open');
    });

    // 手札ドロワー開閉（開閉式）
    document.getElementById('btn-toggle-hand-drawer')?.addEventListener('click', () => {
      this.isHandDrawerOpen = !this.isHandDrawerOpen;
      this.renderGameScreen();
    });

    // ロビーボタン
    document.getElementById('btn-quick-solo')?.addEventListener('click', () => this.startLocalSetupRoom());
    document.getElementById('btn-create-online')?.addEventListener('click', () => this.createOnlineRoom());
    document.getElementById('btn-join-online')?.addEventListener('click', () => {
      const code = document.getElementById('join-room-code')?.value.trim();
      if (code) this.joinOnlineRoom(code);
    });

    // 待機室・対戦画面からのロビー戻りボタン
    document.getElementById('btn-add-cpu')?.addEventListener('click', () => this.addCpuPlayer());
    document.getElementById('btn-remove-cpu')?.addEventListener('click', () => this.removeCpuPlayer());
    document.getElementById('btn-start-game')?.addEventListener('click', () => this.hostStartGame());
    document.getElementById('btn-leave-room')?.addEventListener('click', () => this.leaveRoom(true));
    document.getElementById('btn-game-leave-lobby')?.addEventListener('click', () => {
      if (confirm('現在のゲームを終了してロビー画面へ戻りますか？')) {
        this.leaveRoom(false);
      }
    });

    // 待機室設定変更イベント
    const settingIds = [
      'setting-mode',
      'setting-oide-know',
      'setting-extra-cards',
      'setting-expansion-mode',
      'setting-custom-maigo',
      'setting-custom-scale',
      'setting-rounds',
      'setting-horror-level'
    ];
    settingIds.forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => this.onHostSettingsChanged());
    });
  }

  renderCharacterSelector() {
    const container = document.getElementById('char-selector-grid');
    if (!container) return;
    container.innerHTML = window.MAIGO_CHARACTERS.map(ch => {
      const active = ch.id === this.myCharacterId ? 'selected' : '';
      return `
        <button type="button" class="char-select-card ${active}" data-char-id="${ch.id}">
          <div class="char-select-avatar">${window.getCharacterAvatarSVG(ch.avatarType)}</div>
          <div class="char-select-info">
            <div class="char-select-name">${ch.name}</div>
            <div class="char-select-title">${ch.title}</div>
          </div>
        </button>
      `;
    }).join('');

    container.querySelectorAll('.char-select-card').forEach(btn => {
      btn.addEventListener('click', () => {
        this.myCharacterId = btn.dataset.charId;
        localStorage.setItem('maigo_char_id', this.myCharacterId);
        this.renderCharacterSelector();
      });
    });
  }

  // ==========================================================================
  // オンライン公開ルーム一覧＆途中復帰バナーの購読 (Firebase)
  // ==========================================================================
  subscribePublicRoomsList() {
    if (!window.firebaseDB) {
      setTimeout(() => this.subscribePublicRoomsList(), 600);
      return;
    }
    try {
      const { db, ref, onValue } = window.firebaseDB;
      const roomsRef = ref(db, 'maigo_rooms');
      this.publicRoomsUnsubscribe = onValue(roomsRef, snapshot => {
        this.cachedOnlineRooms = snapshot.val() || {};
        this.renderPublicRoomsAndReconnectBanner();
      });
    } catch (e) {
      console.warn('Firebase public rooms list warning:', e);
    }
  }

  renderPublicRoomsAndReconnectBanner() {
    const listEl = document.getElementById('public-rooms-list');
    const bannerEl = document.getElementById('reconnect-session-banner');
    const val = this.cachedOnlineRooms || {};
    const now = Date.now();
    const currentInputName = (document.getElementById('player-name-input')?.value || this.myPlayerName || '').trim();

    // 1. 前回保存されたセッション、または現在のプレイヤー名と一致する進行中/待機中ルームを検索
    if (bannerEl) {
      let reconnectCandidate = null;
      try {
        const savedRaw = localStorage.getItem('maigo_last_online_session');
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          const roomObj = val[saved.roomId];
          if (roomObj && (now - (roomObj.updatedAt || 0) < 3 * 3600 * 1000)) {
            const pList = this.extractRoomPlayersList(roomObj);
            const matched = pList.find(p => !p.isCpu && (p.name.trim() === saved.playerName.trim() || p.id === saved.playerId));
            if (matched) {
              reconnectCandidate = {
                roomId: roomObj.roomId,
                playerName: matched.name,
                status: roomObj.status
              };
            }
          }
        }
      } catch (_) {}

      // 保存セッションがない場合でも、現在入力中の名前と一致するアクティブ部屋があれば提案
      if (!reconnectCandidate && currentInputName) {
        for (const r of Object.values(val)) {
          if (!r || (now - (r.updatedAt || 0) >= 3 * 3600 * 1000)) continue;
          const pList = this.extractRoomPlayersList(r);
          const matched = pList.find(p => !p.isCpu && p.name.trim() === currentInputName);
          if (matched) {
            reconnectCandidate = {
              roomId: r.roomId,
              playerName: matched.name,
              status: r.status
            };
            break;
          }
        }
      }

      if (reconnectCandidate) {
        const stText = reconnectCandidate.status === 'PLAYING' ? 'ゲーム進行中' : '待機室';
        bannerEl.classList.remove('hidden');
        bannerEl.innerHTML = `
          <div class="reconnect-banner-info">
            <div class="rb-title">🔄 復帰可能なルームが見つかりました！</div>
            <div class="rb-desc">
              部屋番号: <strong>${this.escapeHTML(reconnectCandidate.roomId)}</strong> ／
              参加名: <strong>${this.escapeHTML(reconnectCandidate.playerName)}</strong> （${stText}）
            </div>
          </div>
          <button type="button" class="btn-primary btn-sm" id="btn-quick-reconnect-session">
            この部屋に復帰する ▶
          </button>
        `;
        document.getElementById('btn-quick-reconnect-session')?.addEventListener('click', () => {
          this.joinOnlineRoom(reconnectCandidate.roomId, reconnectCandidate.playerName);
        });
      } else {
        bannerEl.classList.add('hidden');
        bannerEl.innerHTML = '';
      }
    }

    // 2. 公開ルーム一覧（待機中＋進行中の復帰可能ルーム）
    if (!listEl) return;
    const activeRooms = Object.values(val).filter(r => {
      return r && (r.status === 'WAITING' || r.status === 'PLAYING') && (now - (r.updatedAt || 0) < 2 * 3600 * 1000);
    }).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    if (activeRooms.length === 0) {
      listEl.innerHTML = `<div class="empty-rooms-msg">現在アクティブなオンラインルームはありません（「ルーム作成」で作れます）</div>`;
      return;
    }

    listEl.innerHTML = activeRooms.map(r => {
      const pList = this.extractRoomPlayersList(r);
      const humanPlayers = pList.filter(p => !p.isCpu);
      const nameMatchedPlayer = currentInputName
        ? humanPlayers.find(p => p.name.trim() === currentInputName)
        : null;
      const isPlaying = r.status === 'PLAYING';
      const modeLabel = (r.gameState?.mode || r.config?.mode) === 'oideoide' ? '👁 おいで、おいで' : '🔦 通常';
      const statusBadge = isPlaying
        ? `<span class="room-status-pill playing">進行中 (R${r.gameState?.currentRound || 1})</span>`
        : `<span class="room-status-pill waiting">待機中 (${pList.length}人)</span>`;
      const humanChipsHTML = humanPlayers.map(p => `
        <span class="pr-player-chip">
          ${this.escapeHTML(p.name)}
          <button type="button" class="pr-chip-kick"
            data-lobby-kick-room="${this.escapeHTML(r.roomId)}"
            data-lobby-kick-pid="${this.escapeHTML(p.id)}"
            data-lobby-kick-name="${this.escapeHTML(p.name)}"
            title="「${this.escapeHTML(p.name)}」をこの部屋から追放する">×追放</button>
        </span>
      `).join('');

      let btnLabel = isPlaying ? '名前一致で復帰' : '参加する';
      let btnClass = 'btn-secondary btn-sm';
      if (nameMatchedPlayer) {
        btnLabel = `🔄「${this.escapeHTML(nameMatchedPlayer.name)}」で復帰`;
        btnClass = 'btn-primary btn-sm';
      }

      return `
        <div class="public-room-item ${nameMatchedPlayer ? 'is-reconnectable' : ''}">
          <div class="pr-info">
            <div>
              <span class="pr-code">部屋番号: ${this.escapeHTML(r.roomId)}</span>
              ${statusBadge}
              <span class="pr-meta">${modeLabel}</span>
            </div>
            <div class="pr-participants">
              参加者: ${humanChipsHTML || 'なし'}
              ${nameMatchedPlayer ? '<span class="match-hint">（★名前一致！復帰可能）</span>' : ''}
            </div>
          </div>
          <button type="button" class="${btnClass}" data-join-code="${this.escapeHTML(r.roomId)}">${btnLabel}</button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-join-code]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.joinOnlineRoom(btn.dataset.joinCode);
      });
    });

    listEl.querySelectorAll('[data-lobby-kick-room]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.kickPlayerFromLobbyRoom(
          btn.dataset.lobbyKickRoom,
          btn.dataset.lobbyKickPid,
          btn.dataset.lobbyKickName
        );
      });
    });
  }

  async kickPlayerFromLobbyRoom(roomId, targetPid, targetName) {
    if (!window.firebaseDB) return;
    if (!confirm(`部屋番号「${roomId}」からプレイヤー「${targetName}」を追放しますか？`)) {
      return;
    }
    try {
      const { db, ref, get, set, remove } = window.firebaseDB;
      const roomRef = ref(db, `maigo_rooms/${roomId}`);
      const snap = await get(roomRef);
      if (!snap.exists()) return;
      const data = snap.val();
      let roomPlayers = Array.isArray(data.players) ? data.players : Object.values(data.players || {});

      if (data.status === 'WAITING') {
        roomPlayers = roomPlayers.filter(p => p.id !== targetPid);
        const remainingHumans = roomPlayers.filter(p => !p.isCpu);
        if (roomPlayers.length === 0 || remainingHumans.length === 0) {
          await remove(roomRef);
          this.showToastNotification(`🚫 「${targetName}」を追放し、空になった部屋「${roomId}」を閉じました。`);
          return;
        }
        if (data.hostId === targetPid) {
          data.hostId = remainingHumans[0].id;
          data.hostName = remainingHumans[0].name;
        }
        data.players = roomPlayers;
        data.updatedAt = Date.now();
        await set(roomRef, data);
      } else if (data.gameState) {
        window.MaigoGameEngine.normalizeState(data.gameState);
        const gp = data.gameState.players.find(p => p.id === targetPid);
        if (gp) {
          gp.isCpu = true;
          gp.name = `${gp.name} (CPU代走)`;
          gp.id = `cpu_kicked_${Date.now()}`;
        }
        roomPlayers = roomPlayers.filter(p => p.id !== targetPid);
        const remainingHumans = data.gameState.players.filter(p => !p.isCpu);
        if (remainingHumans.length === 0) {
          await remove(roomRef);
          this.showToastNotification(`🚫 「${targetName}」を追放し、空になった部屋「${roomId}」を閉じました。`);
          return;
        }
        if (data.hostId === targetPid) {
          data.hostId = remainingHumans[0].id;
          data.hostName = remainingHumans[0].name;
        }
        window.MaigoGameEngine.addLog(data.gameState, `🚫 ${targetName} が部屋から追放され、CPUに引き継がれました。`, 'info');
        data.players = roomPlayers;
        data.updatedAt = Date.now();
        await set(roomRef, data);
      }
      this.showToastNotification(`🚫 部屋「${roomId}」から「${targetName}」を追放しました。`);
    } catch (e) {
      alert('追放処理に失敗しました: ' + e.message);
    }
  }

  extractRoomPlayersList(roomObj) {
    if (!roomObj) return [];
    if (roomObj.status !== 'WAITING' && roomObj.gameState && roomObj.gameState.players) {
      return Array.isArray(roomObj.gameState.players)
        ? roomObj.gameState.players
        : Object.values(roomObj.gameState.players);
    }
    return Array.isArray(roomObj.players)
      ? roomObj.players
      : Object.values(roomObj.players || {});
  }

  saveLastOnlineSession(roomId, playerName, playerId) {
    try {
      localStorage.setItem('maigo_last_online_session', JSON.stringify({
        roomId,
        playerName,
        playerId,
        updatedAt: Date.now()
      }));
    } catch (_) {}
  }

  showToastNotification(message) {
    let toast = document.getElementById('maigo-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'maigo-toast';
      toast.className = 'maigo-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 4200);
  }

  // ==========================================================================
  // ローカル（ソロ＋CPU）ルーム作成＆オンラインルーム作成・参加・途中復帰
  // ==========================================================================
  startLocalSetupRoom() {
    window.maigoAudio.startAmbientBGM();
    this.isOnlineRoom = false;
    this.isHost = true;
    this.roomId = 'LOCAL';

    const cpuChars = window.MAIGO_CHARACTERS.filter(c => c.id !== this.myCharacterId);
    this.roomData = {
      roomId: 'LOCAL',
      status: 'WAITING',
      hostId: this.myPlayerId,
      hostName: this.myPlayerName,
      updatedAt: Date.now(),
      config: {
        mode: 'normal',
        oideKnowAtStart: false,
        includeExtraCards: true,
        expansionMode: 'auto',
        customMaigoCount: null,
        customDeckScale: 1,
        totalRounds: 3,
        horrorLevel: 'standard'
      },
      players: [
        {
          id: this.myPlayerId,
          name: this.myPlayerName,
          characterId: this.myCharacterId,
          isCpu: false
        },
        {
          id: 'cpu_1',
          name: cpuChars[0]?.name || '湊（CPU）',
          characterId: cpuChars[0]?.id || 'char_minato',
          isCpu: true
        },
        {
          id: 'cpu_2',
          name: cpuChars[1]?.name || '栞（CPU）',
          characterId: cpuChars[1]?.id || 'char_shiori',
          isCpu: true
        },
        {
          id: 'cpu_3',
          name: cpuChars[2]?.name || '蓮（CPU）',
          characterId: cpuChars[2]?.id || 'char_ren',
          isCpu: true
        }
      ]
    };

    this.showScreen('waiting-screen');
    this.renderWaitingRoom();
  }

  async createOnlineRoom() {
    window.maigoAudio.startAmbientBGM();
    if (!window.firebaseDB) {
      alert('Firebaseへの接続準備中です。少し待ってから再度お試しください。');
      return;
    }
    const nameInput = document.getElementById('player-name-input');
    if (nameInput && nameInput.value.trim()) {
      this.myPlayerName = nameInput.value.trim();
      localStorage.setItem('maigo_player_name', this.myPlayerName);
    }

    const code = String(Math.floor(1000 + Math.random() * 9000));
    this.isOnlineRoom = true;
    this.isHost = true;
    this.roomId = code;

    const initialRoom = {
      roomId: code,
      status: 'WAITING',
      hostId: this.myPlayerId,
      hostName: this.myPlayerName,
      updatedAt: Date.now(),
      config: {
        mode: 'normal',
        oideKnowAtStart: false,
        includeExtraCards: true,
        expansionMode: 'auto',
        customMaigoCount: null,
        customDeckScale: 1,
        totalRounds: 3,
        horrorLevel: 'standard'
      },
      players: [
        {
          id: this.myPlayerId,
          name: this.myPlayerName,
          characterId: this.myCharacterId,
          isCpu: false
        }
      ]
    };

    try {
      const { db, ref, set } = window.firebaseDB;
      await set(ref(db, `maigo_rooms/${code}`), initialRoom);
      this.saveLastOnlineSession(code, this.myPlayerName, this.myPlayerId);
      this.subscribeToOnlineRoom(code);
      this.showScreen('waiting-screen');
    } catch (e) {
      alert('オンラインルームの作成に失敗しました: ' + e.message);
    }
  }

  async joinOnlineRoom(code, overrideName = null) {
    window.maigoAudio.startAmbientBGM();
    if (!window.firebaseDB) {
      alert('Firebaseへの接続準備中です。');
      return;
    }
    const cleanCode = String(code || '').trim();
    if (!cleanCode) return;

    const nameInput = document.getElementById('player-name-input');
    if (overrideName) {
      this.myPlayerName = overrideName.trim();
      if (nameInput) nameInput.value = this.myPlayerName;
      localStorage.setItem('maigo_player_name', this.myPlayerName);
    } else if (nameInput && nameInput.value.trim()) {
      this.myPlayerName = nameInput.value.trim();
      localStorage.setItem('maigo_player_name', this.myPlayerName);
    }

    const targetName = this.myPlayerName.trim();

    try {
      const { db, ref, get, set } = window.firebaseDB;
      const roomRef = ref(db, `maigo_rooms/${cleanCode}`);
      const snap = await get(roomRef);
      if (!snap.exists()) {
        alert(`部屋番号「${cleanCode}」は見つかりませんでした。`);
        return;
      }
      const data = snap.val();
      const roomPlayers = Array.isArray(data.players) ? data.players : Object.values(data.players || {});
      const gamePlayers = data.gameState && data.gameState.players
        ? (Array.isArray(data.gameState.players) ? data.gameState.players : Object.values(data.gameState.players))
        : [];

      const activePlayerPool = (data.status !== 'WAITING' && gamePlayers.length > 0) ? gamePlayers : roomPlayers;

      // 1. 参加した「プレイヤー名」と「部屋番号」が一致する人間プレイヤーがいるか検索（切断後の復帰判定）
      const matchedByName = activePlayerPool.find(p => !p.isCpu && String(p.name || '').trim() === targetName);

      if (matchedByName) {
        // 元のプレイヤーIDを引き継いで復帰する
        this.myPlayerId = matchedByName.id;
        sessionStorage.setItem('maigo_player_id', this.myPlayerId);
        this.myPlayerName = matchedByName.name;
        localStorage.setItem('maigo_player_name', this.myPlayerName);
        this.saveLastOnlineSession(cleanCode, this.myPlayerName, this.myPlayerId);

        if (data.status !== 'WAITING' && data.gameState) {
          // 復帰直後に直前のカットイン演出が二重再生されないよう現在のイベント番号に同期
          this.lastProcessedEventSeq = data.gameState.lastEvent?.seq || 0;
          window.MaigoGameEngine.normalizeState(data.gameState);
          window.MaigoGameEngine.addLog(data.gameState, `🔄 ${matchedByName.name} がオンラインに復帰しました！`, 'info');
          data.updatedAt = Date.now();
          await set(roomRef, data);
        }

        this.isOnlineRoom = true;
        this.roomId = cleanCode;
        this.isHost = data.hostId === this.myPlayerId;
        this.subscribeToOnlineRoom(cleanCode);

        if (data.status === 'WAITING') {
          this.showScreen('waiting-screen');
          this.showToastNotification(`🔄 部屋番号「${cleanCode}」の待機室に「${matchedByName.name}」として復帰しました！`);
        } else {
          this.showScreen('game-screen');
          this.showToastNotification(`🔄 部屋番号「${cleanCode}」の対戦に「${matchedByName.name}」として復帰しました！`);
        }
        return;
      }

      // 2. 名前一致するプレイヤーがいない場合
      if (data.status !== 'WAITING') {
        const existingHumanNames = activePlayerPool.filter(p => !p.isCpu).map(p => `「${p.name}」`).join('・');
        alert(
          `部屋番号「${cleanCode}」はすでにゲームが進行中です。\n\n` +
          `通信切断から復帰する場合は、参加時と同じ「プレイヤー名」を入力してから再度「部屋番号で参加・復帰」を押してください。\n` +
          `（この部屋の参加プレイヤー名: ${existingHumanNames || 'なし'}）`
        );
        return;
      }

      // 3. 待機中（WAITING）ルームへの新規参加（または同一タブIDでの再入室）
      const alreadyInById = roomPlayers.find(p => p.id === this.myPlayerId);
      if (alreadyInById) {
        alreadyInById.name = this.myPlayerName;
        alreadyInById.characterId = this.myCharacterId;
      } else {
        if (roomPlayers.length >= 8) {
          alert('このルームは満員（最大8人）です。');
          return;
        }
        roomPlayers.push({
          id: this.myPlayerId,
          name: this.myPlayerName,
          characterId: this.myCharacterId,
          isCpu: false
        });
      }

      data.players = roomPlayers;
      data.updatedAt = Date.now();
      await set(roomRef, data);

      this.saveLastOnlineSession(cleanCode, this.myPlayerName, this.myPlayerId);
      this.isOnlineRoom = true;
      this.roomId = cleanCode;
      this.isHost = data.hostId === this.myPlayerId;
      this.subscribeToOnlineRoom(cleanCode);
      this.showScreen('waiting-screen');
    } catch (e) {
      alert('ルームへの参加・復帰に失敗しました: ' + e.message);
    }
  }

  subscribeToOnlineRoom(code) {
    if (this.roomUnsubscribe) {
      this.roomUnsubscribe();
      this.roomUnsubscribe = null;
    }
    const { db, ref, onValue } = window.firebaseDB;
    const roomRef = ref(db, `maigo_rooms/${code}`);
    this.roomUnsubscribe = onValue(roomRef, snapshot => {
      const data = snapshot.val();
      if (!data) {
        this.leaveRoom();
        return;
      }
      data.players = Array.isArray(data.players) ? data.players : Object.values(data.players || {});

      // 自分が部屋から追放されたかチェック
      const activePool = (data.status !== 'WAITING' && data.gameState && data.gameState.players)
        ? (Array.isArray(data.gameState.players) ? data.gameState.players : Object.values(data.gameState.players))
        : data.players;
      const stillInRoom = activePool.some(p => p.id === this.myPlayerId);
      if (!stillInRoom) {
        try { localStorage.removeItem('maigo_last_online_session'); } catch (_) {}
        this.leaveRoom();
        this.showToastNotification('🚫 ホストにより部屋から追放されました。');
        return;
      }

      this.roomData = data;
      this.isHost = data.hostId === this.myPlayerId;

      if (data.status === 'WAITING') {
        this.showScreen('waiting-screen');
        this.renderWaitingRoom();
      } else if (data.gameState) {
        const normState = window.MaigoGameEngine.normalizeState(data.gameState);
        this.onGameStateReceived(normState);
      }
    });
  }

  async syncRoomData() {
    if (!this.roomData) return;
    this.roomData.updatedAt = Date.now();
    if (this.isOnlineRoom && window.firebaseDB) {
      const { db, ref, set } = window.firebaseDB;
      await set(ref(db, `maigo_rooms/${this.roomId}`), this.roomData);
    } else {
      this.renderWaitingRoom();
    }
  }

  async syncGameState() {
    if (!this.gameState) return;
    window.MaigoGameEngine.normalizeState(this.gameState);
    if (this.isOnlineRoom && window.firebaseDB && this.roomData) {
      this.roomData.status = this.gameState.status;
      this.roomData.gameState = this.gameState;
      this.roomData.updatedAt = Date.now();
      const { db, ref, set } = window.firebaseDB;
      await set(ref(db, `maigo_rooms/${this.roomId}`), this.roomData);
    } else {
      this.onGameStateReceived(this.gameState);
    }
  }

  closeAllGameOverlays() {
    ['action-modal-overlay', 'card-detail-modal', 'discard-modal', 'cutin-overlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('hidden');
        el.classList.remove('active');
        if (id === 'action-modal-overlay' || id === 'card-detail-modal' || id === 'cutin-overlay') {
          el.innerHTML = '';
        }
      }
    });
    document.getElementById('game-log-panel')?.classList.remove('mobile-open');
    this.isAnimatingEvent = false;
  }

  async leaveRoom(removeFromWaitingRoom = false) {
    const leavingOnline = this.isOnlineRoom;
    const leavingRoomId = this.roomId;
    const leavingStatus = this.roomData?.status;
    const myId = this.myPlayerId;

    if (this.roomUnsubscribe) {
      this.roomUnsubscribe();
      this.roomUnsubscribe = null;
    }
    if (this.cpuTimer) {
      clearTimeout(this.cpuTimer);
      this.cpuTimer = null;
    }
    window.maigoAudio.stopHeartbeat();
    this.closeAllGameOverlays();

    if (removeFromWaitingRoom && leavingOnline && leavingRoomId && leavingRoomId !== 'LOCAL' && window.firebaseDB) {
      try {
        localStorage.removeItem('maigo_last_online_session');
        const { db, ref, get, set, remove } = window.firebaseDB;
        const roomRef = ref(db, `maigo_rooms/${leavingRoomId}`);
        const snap = await get(roomRef);
        if (snap.exists() && leavingStatus === 'WAITING') {
          const data = snap.val();
          let pList = Array.isArray(data.players) ? data.players : Object.values(data.players || {});
          pList = pList.filter(p => p.id !== myId);
          const remainingHumans = pList.filter(p => !p.isCpu);
          if (pList.length === 0 || remainingHumans.length === 0) {
            await remove(roomRef);
          } else {
            if (data.hostId === myId) {
              data.hostId = remainingHumans[0].id;
              data.hostName = remainingHumans[0].name;
            }
            data.players = pList;
            data.updatedAt = Date.now();
            await set(roomRef, data);
          }
        }
      } catch (_) {}
    }

    this.roomData = null;
    this.gameState = null;
    this.isOnlineRoom = false;
    this.roomId = null;
    this.showScreen('lobby-screen');
    this.renderPublicRoomsAndReconnectBanner();
  }

  // ==========================================================================
  // 待機室（ルーム設定・5人以上拡張設定・CPU追加）
  // ==========================================================================
  addCpuPlayer() {
    if (!this.isHost || !this.roomData) return;
    if (this.roomData.players.length >= 8) {
      alert('最大8人まで参加可能です。');
      return;
    }
    const usedChars = new Set(this.roomData.players.map(p => p.characterId));
    const availChar = window.MAIGO_CHARACTERS.find(c => !usedChars.has(c.id))
      || window.MAIGO_CHARACTERS[this.roomData.players.length % window.MAIGO_CHARACTERS.length];

    const cpuIndex = this.roomData.players.filter(p => p.isCpu).length + 1;
    this.roomData.players.push({
      id: `cpu_${Date.now()}_${cpuIndex}`,
      name: `${availChar.name.split('（')[0]} (CPU${cpuIndex})`,
      characterId: availChar.id,
      isCpu: true
    });
    this.syncRoomData();
  }

  removeCpuPlayer() {
    if (!this.isHost || !this.roomData) return;
    for (let i = this.roomData.players.length - 1; i >= 0; i--) {
      if (this.roomData.players[i].isCpu) {
        this.roomData.players.splice(i, 1);
        this.syncRoomData();
        return;
      }
    }
  }

  kickPlayerFromRoom(targetPlayerId) {
    if (!this.isHost || !this.roomData) return;
    if (targetPlayerId === this.myPlayerId) return;
    const idx = this.roomData.players.findIndex(p => p.id === targetPlayerId);
    if (idx === -1) return;
    const target = this.roomData.players[idx];
    if (!target.isCpu) {
      if (!confirm(`プレイヤー「${target.name}」を部屋から追放しますか？`)) {
        return;
      }
    }
    this.roomData.players.splice(idx, 1);
    this.showToastNotification(`🚫 「${target.name}」を部屋から追放しました。`);
    this.syncRoomData();
  }

  onHostSettingsChanged() {
    if (!this.isHost || !this.roomData) return;
    const cfg = this.roomData.config;
    cfg.mode = document.getElementById('setting-mode')?.value || 'normal';
    cfg.oideKnowAtStart = document.getElementById('setting-oide-know')?.value === 'public';
    cfg.includeExtraCards = document.getElementById('setting-extra-cards')?.value === 'yes';
    cfg.expansionMode = document.getElementById('setting-expansion-mode')?.value || 'auto';
    const customMaigoVal = document.getElementById('setting-custom-maigo')?.value;
    cfg.customMaigoCount = customMaigoVal ? Number(customMaigoVal) : null;
    cfg.customDeckScale = Number(document.getElementById('setting-custom-scale')?.value || 1);
    cfg.totalRounds = Number(document.getElementById('setting-rounds')?.value || 3);
    cfg.horrorLevel = document.getElementById('setting-horror-level')?.value || 'standard';

    this.syncRoomData();
  }

  renderWaitingRoom() {
    if (!this.roomData) return;
    const cfg = this.roomData.config || {};
    const players = this.roomData.players || [];

    const codeBadge = document.getElementById('waiting-room-code');
    if (codeBadge) {
      codeBadge.textContent = this.isOnlineRoom ? `部屋番号: ${this.roomData.roomId}` : 'ソロ＋CPU対戦（ローカルルーム）';
    }

    // プレイヤー一覧描画（ホストは自分以外のプレイヤーを「追放」可能）
    const pGrid = document.getElementById('waiting-players-grid');
    if (pGrid) {
      pGrid.innerHTML = players.map((p, idx) => {
        const ch = window.MAIGO_CHARACTERS.find(c => c.id === p.characterId) || window.MAIGO_CHARACTERS[0];
        const canKick = this.isHost && p.id !== this.myPlayerId;
        const kickBtnHTML = canKick
          ? `<button type="button" class="btn-kick-player" data-kick-pid="${this.escapeHTML(p.id)}" title="このプレイヤーを部屋から追放する">🚫 追放</button>`
          : '';
        return `
          <div class="waiting-player-card ${p.id === this.myPlayerId ? 'is-me' : ''}">
            <div class="wp-seat">席 ${idx + 1}</div>
            <div class="wp-avatar">${window.getCharacterAvatarSVG(ch.avatarType)}</div>
            <div class="wp-info">
              <div class="wp-name">${this.escapeHTML(p.name)} ${p.id === this.roomData.hostId ? '👑' : ''}</div>
              <div class="wp-char">${ch.name} ${p.isCpu ? '<span class="cpu-tag">CPU</span>' : '<span class="human-tag">人間</span>'}</div>
            </div>
            ${kickBtnHTML}
          </div>
        `;
      }).join('');

      pGrid.querySelectorAll('[data-kick-pid]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.kickPlayerFromRoom(btn.dataset.kickPid);
        });
      });
    }

    const countInfo = document.getElementById('waiting-player-count-badge');
    if (countInfo) {
      countInfo.innerHTML = players.length >= 5
        ? `現在 <strong>${players.length}人</strong>（5人以上拡張デッキモード対応！）`
        : `現在 <strong>${players.length}人</strong>（2〜8人までプレイ可能）`;
    }

    // 設定フォーム値の反映
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = val;
        el.disabled = !this.isHost;
      }
    };
    setVal('setting-mode', cfg.mode || 'normal');
    setVal('setting-oide-know', cfg.oideKnowAtStart ? 'public' : 'hidden');
    setVal('setting-extra-cards', cfg.includeExtraCards ? 'yes' : 'no');
    setVal('setting-expansion-mode', cfg.expansionMode || 'auto');
    setVal('setting-custom-maigo', cfg.customMaigoCount || 4);
    setVal('setting-custom-scale', cfg.customDeckScale || 1.5);
    setVal('setting-rounds', cfg.totalRounds || 3);
    setVal('setting-horror-level', cfg.horrorLevel || 'standard');

    // おいでおいで初手正体公開オプションの表示切替
    const oideKnowRow = document.getElementById('oide-know-setting-row');
    if (oideKnowRow) {
      oideKnowRow.classList.toggle('hidden', cfg.mode !== 'oideoide');
    }

    // カスタム拡張詳細設定の表示切替
    const customExpRow = document.getElementById('custom-expansion-row');
    if (customExpRow) {
      customExpRow.classList.toggle('hidden', cfg.expansionMode !== 'custom');
    }

    // デッキ枚数プレビュー表示
    const stats = window.getDeckStatsPreview({
      playerCount: Math.max(2, players.length),
      includeExtraCards: cfg.includeExtraCards,
      expansionMode: cfg.expansionMode || 'auto',
      customMaigoCount: cfg.expansionMode === 'custom' ? cfg.customMaigoCount : null,
      customDeckScale: cfg.expansionMode === 'custom' ? cfg.customDeckScale : 1
    });
    const handPerPlayer = 5;
    const neededCards = players.length * handPerPlayer;
    const deckRemain = Math.max(0, stats.total - neededCards);

    const previewBox = document.getElementById('deck-preview-box');
    if (previewBox) {
      const warn = stats.total <= neededCards + 2
        ? `<div class="deck-warn-msg">⚠️ 注意：参加人数に対してカード総数が少なすぎます！「自動バランス拡張」または「2セット合体」を推奨します。</div>`
        : '';
      previewBox.innerHTML = `
        <div class="deck-preview-stats">
          <span>総カード: <strong>${stats.total}枚</strong></span>
          <span class="stat-light">🔦 あかり: <strong>${stats.light}枚</strong></span>
          <span class="stat-dark">🌑 くらやみ: <strong>${stats.dark}枚</strong></span>
          <span class="stat-maigo">🩸 迷子: <strong>${stats.maigo}枚</strong></span>
          <span>初期手札: 各<strong>${handPerPlayer}枚</strong>（配布後の山札: <strong>${deckRemain}枚</strong>）</span>
        </div>
        ${warn}
      `;
    }

    // ホスト専用ボタン制御
    document.getElementById('btn-add-cpu')?.classList.toggle('hidden', !this.isHost);
    document.getElementById('btn-remove-cpu')?.classList.toggle('hidden', !this.isHost);
    const startBtn = document.getElementById('btn-start-game');
    if (startBtn) {
      startBtn.disabled = !this.isHost || players.length < 2;
      startBtn.textContent = this.isHost
        ? (players.length < 2 ? '2人以上で開始できます（CPUを追加してください）' : `この設定でゲーム開始（${players.length}人）`)
        : 'ホストがゲームを開始するのを待っています…';
    }
  }

  hostStartGame() {
    if (!this.isHost || !this.roomData) return;
    if (this.roomData.players.length < 2) {
      alert('ゲームを開始するには最低2人のプレイヤーが必要です。「＋ CPUを追加」でCPUを追加できます。');
      return;
    }

    const cfg = this.roomData.config;
    window.maigoEffects.horrorLevel = cfg.horrorLevel || 'standard';

    const newState = window.MaigoGameEngine.createInitialGameState(
      {
        roomId: this.roomData.roomId,
        ...cfg
      },
      this.roomData.players
    );

    this.lastProcessedEventSeq = 0;
    this.gameState = newState;
    this.syncGameState();
  }

  // ==========================================================================
  // ゲーム進行状態受信・イベント演出再生・画面描画
  // ==========================================================================
  async onGameStateReceived(state) {
    this.gameState = state;
    window.maigoEffects.horrorLevel = state.horrorLevel || 'standard';
    this.showScreen('game-screen');

    // 新規イベントがあれば演出（カットイン／ホラー／ハッピーエンド）を再生
    if (state.lastEvent && state.lastEvent.seq > this.lastProcessedEventSeq) {
      const ev = state.lastEvent;
      this.lastProcessedEventSeq = ev.seq;
      const hasAnimation = ev.type === 'CARD_RESOLVED' || (ev.endEvents && ev.endEvents.length > 0);
      if (hasAnimation) {
        await this.playEventAnimations(ev);
      }
    }

    this.renderGameScreen();
    this.scheduleCpuTurnIfNeeded();
  }

  async playEventAnimations(ev) {
    if (this.isAnimatingEvent) return;
    this.isAnimatingEvent = true;

    try {
      // 1. カード使用カットイン
      if (ev.type === 'CARD_RESOLVED') {
        await window.maigoEffects.playCardCutin(ev.cardId, ev.actorName, ev.count || 1, ev.note || '');
        if (ev.cardId === 'crosswalk' && ev.extraPayload && ev.extraPayload.raisedNames) {
          await window.maigoEffects.playCrosswalkRaiseHandsCutscene(ev.extraPayload.raisedNames);
        }
      }

      // 2. ENDイベント（BAD ENDランダムホラー演出／HAPPY END安堵演出）
      if (ev.endEvents && ev.endEvents.length > 0) {
        for (const endEv of ev.endEvents) {
          const p = this.gameState.players.find(pl => pl.id === endEv.playerId) || {
            name: endEv.playerName,
            life: endEv.newLife
          };
          if (endEv.endType === 'BAD_END') {
            await window.maigoEffects.playBadEndHorrorCutscene(p, endEv.reason, endEv.revealedCards || []);
          } else if (endEv.endType === 'HAPPY_END') {
            await window.maigoEffects.playHappyEndCutscene(p, false);
          } else if (endEv.endType === 'OIDE_FINISHED') {
            await window.maigoEffects.playHappyEndCutscene(p, true);
          } else if (endEv.endType === 'NORMAL_END') {
            window.maigoAudio.playNormalEndSound();
          }
        }
      }
    } finally {
      this.isAnimatingEvent = false;
    }
  }

  // ==========================================================================
  // メインゲーム画面レンダリング
  // ==========================================================================
  renderGameScreen() {
    const state = this.gameState;
    if (!state) return;

    const me = state.players.find(p => p.id === this.myPlayerId) || state.players[0];
    const turnPlayer = state.players[state.turnPlayerIndex];
    const isMyTurn = turnPlayer && turnPlayer.id === me.id && me.roundStatus === 'ACTIVE';

    // 1. トップステータスバー更新（1行に収まる簡潔表示）
    const roomBadge = document.getElementById('hud-room-code-badge');
    if (roomBadge) {
      roomBadge.textContent = this.isOnlineRoom && this.roomId && this.roomId !== 'LOCAL'
        ? `#${this.roomId}`
        : '🏠ソロ';
    }
    document.getElementById('hud-round-badge').textContent = `R${state.currentRound}/${state.totalRounds}`;
    const modeBadge = document.getElementById('hud-mode-badge');
    if (modeBadge) {
      if (state.mode === 'oideoide') {
        modeBadge.textContent = state.oideKnowAtStart ? '👁おいで(公開)' : '👁‍🗨おいで(隠匿)';
        modeBadge.className = 'hud-badge mode-oide';
      } else {
        modeBadge.textContent = '🔦通常';
        modeBadge.className = 'hud-badge mode-normal';
      }
    }

    document.getElementById('hud-deck-count').textContent = `${state.deck.length}枚`;
    document.getElementById('hud-discard-count').textContent = `${state.discardPile.length}`;

    // 手番フェーズが切り替わった際の手札ドロワー自動開閉アシスト（手順1では閉じて中央を広く、手順2では自動で開く）
    const phaseKey = `${state.currentRound}_${state.turnPlayerIndex}_${state.phase}_${isMyTurn}`;
    if (this.lastAutoDrawerPhaseKey !== phaseKey) {
      this.lastAutoDrawerPhaseKey = phaseKey;
      if (isMyTurn && state.phase === 'TURN_DRAW_FROM_RIGHT') {
        this.isHandDrawerOpen = false;
      } else if (isMyTurn && state.phase === 'TURN_PLAY_CARD') {
        this.isHandDrawerOpen = true;
      }
    }

    // 2. 自分の手札危険度と心音（Heartbeat）・ビネット演出の更新
    this.updateDangerTensionAndVignette(state, me);

    // 3. 他プレイヤー席（時計回り配置）の描画
    this.renderOpponentsArea(state, me);

    // 4. 中央テーブル（山札・捨て札・フェーズ案内・右隣から引くUI）の描画
    this.renderCenterStage(state, me, turnPlayer, isMyTurn);

    // 5. 自分のキャラクター・ライフ（赤の玉7個）・手札の描画
    this.renderMyHandAndStatus(state, me, turnPlayer, isMyTurn);

    // 6. ログパネルの描画
    this.renderActionLogs(state);

    // 7. 選択待ちモーダル（AWAITING_CHOICE）またはラウンド終了・最終結果モーダルの描画
    this.renderActiveModal(state, me);
  }

  updateDangerTensionAndVignette(state, me) {
    const vignette = document.getElementById('danger-vignette');
    const dangerBanner = document.getElementById('my-danger-banner');
    if (!me || me.roundStatus !== 'ACTIVE') {
      window.maigoAudio.stopHeartbeat();
      vignette?.classList.remove('tension-1', 'tension-2', 'oide-possessed');
      if (dangerBanner) {
        dangerBanner.className = 'danger-banner status-finished';
        dangerBanner.innerHTML = this.getRoundStatusBadgeHTML(me?.roundStatus);
      }
      return;
    }

    const isOide = state.mode === 'oideoide' && me.role === 'oideoide';
    const lightCount = me.hand.filter(c => window.MAIGO_CARDS[c.cardId]?.category === 'light').length;
    const darkCount = me.hand.filter(c => window.MAIGO_CARDS[c.cardId]?.category === 'dark').length;
    const maigoCount = me.hand.filter(c => window.MAIGO_CARDS[c.cardId]?.category === 'maigo').length;

    vignette?.classList.remove('tension-1', 'tension-2', 'oide-possessed');

    if (isOide) {
      window.maigoAudio.stopHeartbeat();
      vignette?.classList.add('oide-possessed');
      if (dangerBanner) {
        dangerBanner.className = 'danger-banner status-oide';
        dangerBanner.innerHTML = `👁‍🗨<strong>おいで</strong>`;
      }
      return;
    }

    if (maigoCount > 0 && lightCount === 1) {
      window.maigoAudio.setTension(2);
      vignette?.classList.add('tension-2');
      if (dangerBanner) {
        dangerBanner.className = 'danger-banner status-critical';
        dangerBanner.innerHTML = `⚠️<strong>迷子${maigoCount}・灯1</strong>`;
      }
    } else if (maigoCount > 0 && lightCount >= 2) {
      window.maigoAudio.setTension(1);
      vignette?.classList.add('tension-1');
      if (dangerBanner) {
        dangerBanner.className = 'danger-banner status-caution';
        dangerBanner.innerHTML = `👁<strong>迷子${maigoCount}・灯${lightCount}</strong>`;
      }
    } else if (maigoCount === 0 && lightCount === 0 && darkCount > 0) {
      window.maigoAudio.setTension(1);
      vignette?.classList.add('tension-1');
      if (dangerBanner) {
        dangerBanner.className = 'danger-banner status-darkonly';
        dangerBanner.innerHTML = `🌑<strong>暗闇のみ</strong>`;
      }
    } else {
      window.maigoAudio.stopHeartbeat();
      if (dangerBanner) {
        dangerBanner.className = 'danger-banner status-safe';
        dangerBanner.innerHTML = `🔦<strong>安全(灯${lightCount})</strong>`;
      }
    }
  }

  getRoundStatusBadgeHTML(status) {
    switch (status) {
      case 'HAPPY_END': return '🌅 HAPPY END (+2)';
      case 'BAD_END': return '💀 BAD END (-3)';
      case 'NORMAL_END': return '🌫 NORMAL END (-1)';
      case 'OIDE_FINISHED': return '👁 手札完遂';
      case 'OIDE_LAST': return '👁 終了';
      default: return '行動中';
    }
  }

  renderLifeOrbsHTML(life) {
    return `<span class="compact-life-badge" title="ライフ（赤の玉・上限7）">❤️${life}<small>/7</small></span>`;
  }

  // 他プレイヤー一覧：ポイント（❤️）・名前・手札枚数（🃏）・右左のみを超簡潔に表示
  renderOpponentsArea(state, me) {
    const container = document.getElementById('opponents-container');
    if (!container) return;

    const n = state.players.length;
    const myIdx = me ? me.seatIndex : 0;
    const opponents = [];
    for (let step = 1; step < n; step++) {
      const idx = (myIdx + step) % n;
      opponents.push(state.players[idx]);
    }

    const rightNeighbor = me && me.roundStatus === 'ACTIVE'
      ? window.MaigoGameEngine.getRightActiveNeighbor(state, myIdx)
      : null;
    const leftNeighbor = me && me.roundStatus === 'ACTIVE'
      ? window.MaigoGameEngine.getLeftActiveNeighbor(state, myIdx)
      : null;

    container.className = `opponents-grid compact-opponents-bar count-${opponents.length}`;
    container.innerHTML = opponents.map(p => {
      const isTurn = state.players[state.turnPlayerIndex]?.id === p.id && state.phase !== 'ROUND_END' && state.phase !== 'GAME_OVER';
      const isRight = rightNeighbor && rightNeighbor.id === p.id;
      const isLeft = leftNeighbor && leftNeighbor.id === p.id;

      let relBadge = '';
      if (isRight && isLeft) {
        relBadge = `<span class="opp-rel-chip both">右/左</span>`;
      } else if (isRight) {
        relBadge = `<span class="opp-rel-chip right" title="手順1でカードを引く相手">◀右隣</span>`;
      } else if (isLeft) {
        relBadge = `<span class="opp-rel-chip left" title="次の手番の相手">左隣▶</span>`;
      }

      const showOide = state.mode === 'oideoide' && p.role === 'oideoide' && (state.oideKnowAtStart || state.oideRevealed);
      const oideIcon = showOide ? `<span class="opp-mini-icon" title="おいで、おいで">👁</span>` : '';
      const lhIcon = p.lighthouseCardUid ? `<span class="opp-mini-icon" title="灯台セット中">🔦</span>` : '';
      const amIcon = p.amuletCardUid ? `<span class="opp-mini-icon" title="御守り守護中">⛩</span>` : '';
      const turnIcon = isTurn ? `<span class="opp-turn-dot" title="手番中">⏳番</span>` : '';

      let statusChip = '';
      if (p.roundStatus !== 'ACTIVE') {
        const shortStatus = p.roundStatus === 'HAPPY_END' ? '🌅帰宅' : (p.roundStatus === 'BAD_END' ? '💀脱落' : '離脱');
        statusChip = `<span class="opp-end-chip">${shortStatus}</span>`;
      }

      return `
        <div class="opponent-card compact-opp-pill ${isTurn ? 'is-turn' : ''} ${p.roundStatus !== 'ACTIVE' ? 'is-inactive' : ''} ${isRight ? 'is-right-neighbor' : ''}">
          <div class="cop-top-line">
            ${relBadge}
            ${turnIcon}
            <span class="cop-name" title="${this.escapeHTML(p.name)}">${this.escapeHTML(p.name)}</span>
            ${oideIcon}${lhIcon}${amIcon}
          </div>
          <div class="cop-bottom-line">
            <span class="cop-pts">❤️<strong>${p.life}</strong></span>
            <span class="cop-hand">🃏<strong>${p.hand.length}</strong>枚</span>
            ${statusChip}
          </div>
        </div>
      `;
    }).join('');
  }

  // 中央フィールド（山札＆捨て札を中央に配置＋手順1の右隣引きUI）
  renderCenterStage(state, me, turnPlayer, isMyTurn) {
    const bannerEl = document.getElementById('turn-instruction-banner');
    const drawStageEl = document.getElementById('step1-draw-stage');
    const topDiscardEl = document.getElementById('center-discard-top');
    const mainBoardEl = document.getElementById('table-main-board');
    const isStep1Interactive = Boolean(
      turnPlayer &&
      state.phase === 'TURN_DRAW_FROM_RIGHT' &&
      isMyTurn &&
      window.MaigoGameEngine.getRightActiveNeighbor(state, state.turnPlayerIndex)
    );
    mainBoardEl?.classList.toggle('step1-active', isStep1Interactive);
    mainBoardEl?.classList.toggle('hand-open-with-step1', isStep1Interactive && this.isHandDrawerOpen);

    // 中央の捨て札トップ表示（カードには効果文を書かず、タップで効果詳細＆捨て札一覧を見られる）
    if (topDiscardEl) {
      if (state.discardPile.length > 0) {
        const lastCard = state.discardPile[state.discardPile.length - 1];
        const def = window.MAIGO_CARDS[lastCard.cardId];
        topDiscardEl.innerHTML = def ? `
          <button type="button" class="mini-discard-card ${def.category}" id="btn-center-discard-card" title="タップしてこのカードの効果を確認">
            <span class="card-cat-pill ${def.category}">${def.categoryLabel}</span>
            <div class="mdc-art">${window.getCardIllustrationSVG(def.id)}</div>
            <div class="mdc-name">${def.name}</div>
          </button>
        ` : '';
        document.getElementById('btn-center-discard-card')?.addEventListener('click', () => {
          this.openCardDetailModal(lastCard, { fromDiscardTop: true });
        });
      } else {
        topDiscardEl.innerHTML = `<div class="empty-discard-slot">捨て札 0枚</div>`;
      }
    }

    if (!turnPlayer) return;

    if (state.phase === 'TURN_DRAW_FROM_RIGHT') {
      const rightNeighbor = window.MaigoGameEngine.getRightActiveNeighbor(state, state.turnPlayerIndex);
      if (isMyTurn && rightNeighbor) {
        if (bannerEl) {
          bannerEl.className = 'turn-banner my-turn-banner phase-step1';
          bannerEl.innerHTML = `【手順1】右隣「<strong>${this.escapeHTML(rightNeighbor.name)}</strong>」のカードを1枚タップして引く`;
        }
        if (drawStageEl) {
          drawStageEl.classList.remove('hidden');
          const hasLh = Boolean(rightNeighbor.lighthouseCardUid);
          const hasAm = Boolean(rightNeighbor.amuletCardUid) && rightNeighbor.hand.length >= 2;

          const cardsHTML = rightNeighbor.hand.map((c, idx) => {
            const isForced = hasLh && c.uid === rightNeighbor.lighthouseCardUid;
            const isBlockedByLh = hasLh && c.uid !== rightNeighbor.lighthouseCardUid;
            const isGuardedByAm = !hasLh && hasAm && c.uid === rightNeighbor.amuletCardUid;
            const disabled = isBlockedByLh || isGuardedByAm;

            let badge = `<span class="fd-num">${idx + 1}枚目</span>`;
            if (isForced) badge = `<span class="fd-badge forced">🔦 灯台指定</span>`;
            if (isGuardedByAm) badge = `<span class="fd-badge guarded">⛩ 御守り</span>`;

            return `
              <button type="button" class="facedown-pick-card ${isForced ? 'is-forced' : ''} ${disabled ? 'is-disabled' : ''}"
                data-draw-uid="${c.uid}" ${disabled ? 'disabled' : ''}>
                <div class="fd-card-back">
                  <div class="fd-pattern">迷子</div>
                  ${badge}
                </div>
              </button>
            `;
          }).join('');

          drawStageEl.innerHTML = `
            <div class="step1-draw-box">
              <div class="step1-title">
                ◀ 右隣「<strong>${this.escapeHTML(rightNeighbor.name)}</strong>」の手札（${rightNeighbor.hand.length}枚）
              </div>
              <div class="facedown-cards-fan">${cardsHTML}</div>
            </div>
          `;

          drawStageEl.querySelectorAll('.facedown-pick-card:not([disabled])').forEach(btn => {
            btn.addEventListener('mouseenter', () => window.maigoAudio.playCardHover());
            btn.addEventListener('click', () => {
              this.handleDrawFromRight(btn.dataset.drawUid);
            });
          });
        }
      } else {
        if (drawStageEl) drawStageEl.classList.add('hidden');
        if (bannerEl) {
          bannerEl.className = 'turn-banner other-turn-banner';
          bannerEl.innerHTML = `⏳ <strong>${this.escapeHTML(turnPlayer.name)}</strong> の番（右隣から1枚引いています）`;
        }
      }
    } else if (state.phase === 'TURN_PLAY_CARD') {
      if (drawStageEl) drawStageEl.classList.add('hidden');
      if (isMyTurn) {
        if (bannerEl) {
          bannerEl.className = 'turn-banner my-turn-banner phase-step2';
          bannerEl.innerHTML = `【手順2】手札をタップして使う（残り行動: <strong>${state.actionsRemaining}</strong>）`;
        }
      } else {
        if (bannerEl) {
          bannerEl.className = 'turn-banner other-turn-banner';
          bannerEl.innerHTML = `⏳ <strong>${this.escapeHTML(turnPlayer.name)}</strong> の番（出すカードを選んでいます）`;
        }
      }
    } else if (state.phase === 'AWAITING_CHOICE') {
      if (drawStageEl) drawStageEl.classList.add('hidden');
      if (bannerEl) {
        bannerEl.className = 'turn-banner other-turn-banner';
        bannerEl.innerHTML = `⚡ カード効果の対象を選択中です…`;
      }
    }
  }

  // 下部：開閉式の手札ドロワーとシンプルカード（効果文なし・タップで詳細＆使用モーダル）
  renderMyHandAndStatus(state, me, turnPlayer, isMyTurn) {
    const myAreaEl = document.getElementById('my-player-area');
    const myProfileEl = document.getElementById('my-character-profile');
    const handBodyEl = document.getElementById('hand-drawer-body');
    const toggleBtnEl = document.getElementById('btn-toggle-hand-drawer');
    const handContainer = document.getElementById('my-hand-cards');
    const actionBar = document.getElementById('my-play-action-bar');
    if (!me) return;

    const isOide = state.mode === 'oideoide' && me.role === 'oideoide';
    const canPlayNow = isMyTurn && state.phase === 'TURN_PLAY_CARD' && state.actionsRemaining > 0;

    // 開閉状態の反映
    myAreaEl?.classList.toggle('drawer-closed', !this.isHandDrawerOpen);
    handBodyEl?.classList.toggle('hidden', !this.isHandDrawerOpen);
    if (toggleBtnEl) {
      toggleBtnEl.innerHTML = this.isHandDrawerOpen
        ? `▼ 手札を閉じる`
        : `▲ 手札(${me.hand.length}枚)`;
      toggleBtnEl.classList.toggle('pulse-open-hint', !this.isHandDrawerOpen && canPlayNow);
    }

    if (myProfileEl) {
      myProfileEl.innerHTML = `
        <span class="my-compact-name">👤${this.escapeHTML(me.name)}</span>
        <span class="my-compact-pts">❤️<strong>${me.life}</strong></span>
        <span class="my-compact-hand">🃏<strong>${me.hand.length}</strong></span>
      `;
    }

    if (handContainer) {
      if (me.hand.length === 0) {
        handContainer.innerHTML = `<div class="empty-hand-msg">手札 0枚</div>`;
      } else {
        handContainer.innerHTML = me.hand.map(c => {
          const def = window.MAIGO_CARDS[c.cardId];
          if (!def) return '';
          const isLh = me.lighthouseCardUid === c.uid;
          const isAm = me.amuletCardUid === c.uid;

          const actionBadge = def.actionBonus > 0
            ? `<span class="card-action-tag">＋${def.actionBonus}</span>`
            : '';

          let lockTag = '';
          if (isLh) lockTag = `<div class="card-lock-ribbon lh">🔦灯台</div>`;
          if (isAm) lockTag = `<div class="card-lock-ribbon am">⛩御守</div>`;

          return `
            <button type="button" class="game-card simple-tap-card ${def.category} ${canPlayNow && def.category !== 'maigo' ? 'can-use-now' : ''}"
                 data-card-uid="${c.uid}" data-card-id="${def.id}">
              ${lockTag}
              <div class="card-top-bar">
                <span class="card-cat-pill ${def.category}">${def.categoryLabel}</span>
                ${actionBadge}
              </div>
              <div class="card-illustration">${window.getCardIllustrationSVG(def.id)}</div>
              <div class="card-title-row">${def.name}</div>
              <div class="card-tap-hint">${canPlayNow && def.category !== 'maigo' ? '効果・使用' : '効果詳細'}</div>
            </button>
          `;
        }).join('');

        handContainer.querySelectorAll('.game-card').forEach(cardEl => {
          cardEl.addEventListener('mouseenter', () => window.maigoAudio.playCardHover());
          cardEl.addEventListener('click', () => {
            const uid = cardEl.dataset.cardUid;
            const cardObj = me.hand.find(c => c.uid === uid);
            if (cardObj) {
              this.openCardDetailModal(cardObj, { fromHand: true });
            }
          });
        });
      }
    }

    // 中央フィールドのサブ操作ボタン（手札が閉じている時に開くボタン／追加行動終了ボタン／おいでおいでパスボタン）
    if (actionBar) {
      const buttons = [];
      if (canPlayNow && !this.isHandDrawerOpen) {
        buttons.push(`
          <button type="button" class="btn-primary" id="btn-center-open-hand">
            ▲ 手札を開いてカードを使う（${me.hand.length}枚）
          </button>
        `);
      }
      if (canPlayNow && state.hasPlayedAtLeastOneCard) {
        buttons.push(`
          <button type="button" class="btn-secondary" id="btn-voluntary-end-turn">
            追加でカードを出さずに手番を終了する ▶
          </button>
        `);
      }
      if (canPlayNow && isOide && window.MaigoGameEngine.isHandOnlyMaigo(me.hand)) {
        buttons.push(`
          <button type="button" class="btn-danger" id="btn-oide-pass-turn">
            手札が「迷子」のみのため、何も出さずに番を終える ▶
          </button>
        `);
      }
      actionBar.innerHTML = buttons.join('');

      document.getElementById('btn-center-open-hand')?.addEventListener('click', () => {
        this.isHandDrawerOpen = true;
        this.renderGameScreen();
      });
      document.getElementById('btn-voluntary-end-turn')?.addEventListener('click', () => {
        this.handleVoluntaryEndTurn();
      });
      document.getElementById('btn-oide-pass-turn')?.addEventListener('click', () => {
        this.handleVoluntaryEndTurn();
      });
    }
  }

  // ==========================================================================
  // カード詳細＆使用モーダル（いつでもカードをタップして効果確認＆そこから使用）
  // ==========================================================================
  openCardDetailModal(cardObj, options = {}) {
    const modal = document.getElementById('card-detail-modal');
    if (!modal || !cardObj) return;
    const def = window.MAIGO_CARDS[cardObj.cardId || cardObj.id];
    if (!def) return;

    const state = this.gameState;
    const me = state?.players.find(p => p.id === this.myPlayerId) || state?.players[0];
    const turnPlayer = state ? state.players[state.turnPlayerIndex] : null;
    const isMyTurn = Boolean(state && me && turnPlayer && turnPlayer.id === me.id && me.roundStatus === 'ACTIVE');
    const canPlayNow = Boolean(options.fromHand && isMyTurn && state.phase === 'TURN_PLAY_CARD' && state.actionsRemaining > 0);
    const isOide = Boolean(state && me && state.mode === 'oideoide' && me.role === 'oideoide');

    const actionBadge = def.actionBonus > 0
      ? `<span class="card-action-tag">行動＋${def.actionBonus}</span>`
      : '';

    let useSectionHTML = '';
    if (options.fromHand && me) {
      if (def.category === 'maigo') {
        useSectionHTML = `<div class="cdm-status-note danger">※「迷子」カードは場に出して使用することができません。</div>`;
      } else if (canPlayNow) {
        const remainingHand = me.hand.filter(c => c.uid !== cardObj.uid);
        const wouldBeBad = !isOide && window.MaigoGameEngine.isHandBadEndCondition(remainingHand);
        const warnHTML = wouldBeBad
          ? `<div class="cdm-bad-warning">⚠️ 注意：このカードを使用して効果終了時に「あかり」が0枚（迷子あり）のままだと【BAD END】になります！</div>`
          : '';

        const allBroken = me.hand.filter(c => c.cardId === 'broken_streetlight');
        if (def.id === 'broken_streetlight' && allBroken.length >= 2) {
          useSectionHTML = `
            ${warnHTML}
            <div class="cdm-use-buttons">
              <button type="button" class="btn-primary btn-lg" id="btn-cdm-use-single">
                🔥 1枚だけ使用する（場に出す）
              </button>
              <button type="button" class="btn-accent btn-lg" id="btn-cdm-use-all-broken">
                ⚡ 手札の「壊れた街灯路」全 ${allBroken.length}枚 をまとめて使用する！
              </button>
            </div>
          `;
        } else {
          useSectionHTML = `
            ${warnHTML}
            <div class="cdm-use-buttons">
              <button type="button" class="btn-primary btn-lg" id="btn-cdm-use-single">
                🔥 このカードを使用する（場に出す）
              </button>
            </div>
          `;
        }
      } else if (isMyTurn && state?.phase === 'TURN_DRAW_FROM_RIGHT') {
        useSectionHTML = `<div class="cdm-status-note">💡 先に画面中央の【手順1】で右隣のプレイヤーからカードを1枚引いてください。</div>`;
      } else {
        useSectionHTML = `<div class="cdm-status-note">（現在はカード効果の確認のみ可能です。自分の手番の手順2で使用できます）</div>`;
      }
    } else if (options.fromDiscardTop) {
      useSectionHTML = `
        <div class="cdm-use-buttons">
          <button type="button" class="btn-secondary" id="btn-cdm-open-all-discard">
            🗑 捨て札一覧をすべて見る
          </button>
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="modal-box card-detail-modal-box ${def.category}">
        <div class="cdm-top-row">
          <div class="cdm-badges">
            <span class="card-cat-pill ${def.category}">${def.categoryLabel}</span>
            ${actionBadge}
          </div>
          <button type="button" class="btn-secondary btn-sm" id="btn-cdm-close">閉じる ✕</button>
        </div>

        <div class="cdm-title">${def.name}</div>
        <div class="cdm-art-wrap">${window.getCardIllustrationSVG(def.id)}</div>

        <div class="cdm-effect-box">
          <div class="cdm-effect-label">【カードの効果】</div>
          <div class="cdm-effect-text">${this.escapeHTML(def.description)}</div>
        </div>

        <div class="cdm-flavor">${this.escapeHTML(def.flavor)}</div>

        ${useSectionHTML}
      </div>
    `;

    modal.classList.remove('hidden');

    const closeModal = () => {
      modal.classList.add('hidden');
      modal.innerHTML = '';
    };

    document.getElementById('btn-cdm-close')?.addEventListener('click', closeModal);
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    }, { once: true });

    document.getElementById('btn-cdm-use-single')?.addEventListener('click', () => {
      closeModal();
      this.selectedHandUids = [cardObj.uid];
      this.handlePlaySelectedCards();
    });

    document.getElementById('btn-cdm-use-all-broken')?.addEventListener('click', () => {
      closeModal();
      const allBrokenUids = (me?.hand || []).filter(c => c.cardId === 'broken_streetlight').map(c => c.uid);
      this.selectedHandUids = allBrokenUids;
      this.handlePlaySelectedCards();
    });

    document.getElementById('btn-cdm-open-all-discard')?.addEventListener('click', () => {
      closeModal();
      this.openDiscardInspectModal();
    });
  }

  // モーダル内で選択中カードの効果を大きく表示する共通プレビューHTML
  renderCardEffectPreviewBoxHTML(cardObj) {
    if (!cardObj) return '';
    const def = window.MAIGO_CARDS[cardObj.cardId || cardObj.id];
    if (!def) return '';
    const actionBadge = def.actionBonus > 0
      ? `<span class="card-action-tag">行動＋${def.actionBonus}</span>`
      : '';
    return `
      <div class="modal-effect-preview-box ${def.category}">
        <div class="mep-header">
          <span class="card-cat-pill ${def.category}">${def.categoryLabel}</span>
          <span class="mep-name">【${def.name}】の効果</span>
          ${actionBadge}
        </div>
        <div class="mep-desc">${this.escapeHTML(def.description)}</div>
      </div>
    `;
  }

  // ==========================================================================
  // プレイヤー操作アクション送信
  // ==========================================================================
  handleDrawFromRight(targetCardUid) {
    if (!this.gameState) return;
    window.maigoAudio.playCardDraw();
    const res = window.MaigoGameEngine.drawFromRightNeighbor(this.gameState, this.myPlayerId, targetCardUid);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    this.syncGameState();
  }

  handlePlaySelectedCards() {
    if (!this.gameState || this.selectedHandUids.length === 0) return;
    const uids = [...this.selectedHandUids];
    this.selectedHandUids = [];
    const res = window.MaigoGameEngine.playCardFromHand(this.gameState, this.myPlayerId, uids);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    this.syncGameState();
  }

  handleVoluntaryEndTurn() {
    if (!this.gameState) return;
    const res = window.MaigoGameEngine.endTurnVoluntarily(this.gameState, this.myPlayerId);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    this.syncGameState();
  }

  handleSubmitChoice(choiceData) {
    if (!this.gameState) return;
    this.modalPreviewCardUid = null;
    this.conveniencePhase = 1;
    const res = window.MaigoGameEngine.submitPendingChoice(this.gameState, this.myPlayerId, choiceData);
    if (!res.ok) return;
    this.syncGameState();
  }

  // ==========================================================================
  // カード効果モーダル（いつでもカード効果確認可能＋コンビニ2フェーズ方式）
  // ==========================================================================
  renderActiveModal(state, me) {
    const modalOverlay = document.getElementById('action-modal-overlay');
    if (!modalOverlay) return;

    if (state.phase === 'ROUND_END' || state.phase === 'GAME_OVER') {
      this.renderRoundOrFinalModal(state, modalOverlay);
      return;
    }

    if (state.phase === 'AWAITING_CHOICE' && state.pendingAction) {
      this.renderPendingChoiceModal(state, me, modalOverlay);
      return;
    }

    modalOverlay.classList.add('hidden');
    modalOverlay.innerHTML = '';
  }

  renderPendingChoiceModal(state, me, modalOverlay) {
    const pa = state.pendingAction;
    const myId = me.id;

    let isMyChoice = false;
    if (pa.type === 'TUNNEL_DISCARD' || pa.type === 'RIVER_PASS') {
      isMyChoice = pa.requiredPlayerIds.includes(myId) && !pa.selections[myId];
    } else if (pa.type === 'COIN_LAUNDRY_CARD') {
      isMyChoice = pa.targetPlayerId === myId;
    } else {
      isMyChoice = pa.actorId === myId;
    }

    if (!isMyChoice) {
      const actor = state.players.find(p => p.id === (pa.targetPlayerId || pa.actorId));
      modalOverlay.classList.remove('hidden');
      modalOverlay.innerHTML = `
        <div class="modal-box waiting-choice-modal">
          <div class="modal-title">⏳ 他のプレイヤーが選択中です…</div>
          <div class="modal-desc">
            ${actor ? `<strong>${this.escapeHTML(actor.name)}</strong> が【${window.MAIGO_CARDS[pa.cardId]?.name || ''}】の効果を選択しています。` : 'プレイヤーの選択を待っています…'}
          </div>
        </div>
      `;
      return;
    }

    modalOverlay.classList.remove('hidden');

    switch (pa.type) {
      // 明るい街灯路：手札が迷子のみの時、手札に戻すか？
      case 'BRIGHT_STREETLIGHT_RETURN': {
        modalOverlay.innerHTML = `
          <div class="modal-box">
            <div class="modal-title">🔦 【明るい街灯路】の効果発動！</div>
            <div class="modal-desc">
              あなたの手札が「迷子」のみのため、場に出した「明るい街灯路」を手札に戻すことができます。<br>
              <strong>※手札に戻さない場合、手札が「迷子」のみとなり即座に【BAD END】になります！</strong>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-primary" id="btn-bs-return">手札に戻す（推奨：BAD END回避！）</button>
              <button type="button" class="btn-danger" id="btn-bs-discard">戻さずに捨てる</button>
            </div>
          </div>
        `;
        document.getElementById('btn-bs-return')?.addEventListener('click', () => {
          this.handleSubmitChoice({ returnToHand: true });
        });
        document.getElementById('btn-bs-discard')?.addEventListener('click', () => {
          this.handleSubmitChoice({ returnToHand: false });
        });
        break;
      }

      // コンビニ：わかりやすい2フェーズ方式（フェーズ1：手札に加える1枚を選ぶ → フェーズ2：残りを並べ替える）
      case 'CONVENIENCE_PICK': {
        const topCards = pa.topCards || [];
        if (!this.convenienceSelectedTakeUid || !topCards.some(c => c.uid === this.convenienceSelectedTakeUid)) {
          this.convenienceSelectedTakeUid = topCards[0]?.uid || null;
          this.convenienceOrderUids = topCards.filter(c => c.uid !== this.convenienceSelectedTakeUid).map(c => c.uid);
          this.conveniencePhase = 1;
        }

        const renderConv = () => {
          if (this.conveniencePhase === 1 || topCards.length <= 1) {
            // フェーズ1：手札に加える1枚を選ぶ（タップでそのカードの効果を表示！）
            const selectedObj = topCards.find(c => c.uid === this.convenienceSelectedTakeUid) || topCards[0];
            const selectedDef = window.MAIGO_CARDS[selectedObj?.cardId];

            const cardsHTML = topCards.map(c => {
              const def = window.MAIGO_CARDS[c.cardId];
              const isTake = c.uid === this.convenienceSelectedTakeUid;
              return `
                <button type="button" class="modal-pick-card ${def.category} ${isTake ? 'selected' : ''}" data-conv-uid="${c.uid}">
                  <div class="conv-badge ${isTake ? 'take' : 'return'}">${isTake ? '✋ 選択中（手札へ）' : 'タップで効果確認'}</div>
                  <div class="mpc-art">${window.getCardIllustrationSVG(def.id)}</div>
                  <div class="mpc-title">${def.name}</div>
                  <div class="mpc-cat">${def.categoryLabel}</div>
                </button>
              `;
            }).join('');

            modalOverlay.innerHTML = `
              <div class="modal-box modal-wide">
                <div class="modal-step-indicator">STEP 1 / 2 ： 手札に加えるカードを選ぶ</div>
                <div class="modal-title">🏪 【コンビニ①】手札に加えるカードを1枚選んでください</div>
                <div class="modal-desc">
                  山札の上から${topCards.length}枚を見ています。カードをタップすると下に<strong>効果の詳細</strong>が表示されます。
                </div>
                <div class="modal-cards-grid">${cardsHTML}</div>
                ${this.renderCardEffectPreviewBoxHTML(selectedObj)}
                <div class="modal-actions">
                  ${topCards.length >= 2
                    ? `<button type="button" class="btn-primary" id="btn-conv-to-step2">✋「${selectedDef?.name || ''}」を手札に選び、残りの並べ替えへ進む ▶</button>`
                    : `<button type="button" class="btn-primary" id="btn-conv-confirm">✅「${selectedDef?.name || ''}」を手札に加えて完了</button>`
                  }
                </div>
              </div>
            `;

            modalOverlay.querySelectorAll('[data-conv-uid]').forEach(el => {
              el.addEventListener('click', () => {
                this.convenienceSelectedTakeUid = el.dataset.convUid;
                this.convenienceOrderUids = topCards.filter(c => c.uid !== this.convenienceSelectedTakeUid).map(c => c.uid);
                renderConv();
              });
            });

            document.getElementById('btn-conv-to-step2')?.addEventListener('click', () => {
              this.conveniencePhase = 2;
              this.modalPreviewCardUid = this.convenienceOrderUids[0] || null;
              renderConv();
            });

            document.getElementById('btn-conv-confirm')?.addEventListener('click', () => {
              const takeUid = this.convenienceSelectedTakeUid;
              const orderUids = [...this.convenienceOrderUids];
              this.convenienceSelectedTakeUid = null;
              this.convenienceOrderUids = [];
              this.conveniencePhase = 1;
              this.handleSubmitChoice({ takeCardUid: takeUid, returnOrderUids: orderUids });
            });
          } else {
            // フェーズ2：残りのカードを山札の上に戻す順番を並べ替える
            const takenObj = topCards.find(c => c.uid === this.convenienceSelectedTakeUid);
            const takenDef = window.MAIGO_CARDS[takenObj?.cardId];
            const remainingCards = this.convenienceOrderUids
              .map(uid => topCards.find(c => c.uid === uid))
              .filter(Boolean);

            const previewTarget = remainingCards.find(c => c.uid === this.modalPreviewCardUid) || remainingCards[0];

            const remainHTML = remainingCards.map((c, idx) => {
              const def = window.MAIGO_CARDS[c.cardId];
              const isInspected = previewTarget && previewTarget.uid === c.uid;
              const posLabel = idx === 0
                ? '▲ 山札の【1番上】（次に引かれる）'
                : `▼ 山札の上から【${idx + 1}番目】`;
              return `
                <button type="button" class="modal-pick-card ${def.category} ${isInspected ? 'selected' : ''}" data-conv-inspect-uid="${c.uid}">
                  <div class="conv-badge ${idx === 0 ? 'take' : 'return'}">${posLabel}</div>
                  <div class="mpc-art">${window.getCardIllustrationSVG(def.id)}</div>
                  <div class="mpc-title">${def.name}</div>
                  <div class="mpc-cat">${def.categoryLabel}</div>
                </button>
              `;
            }).join('');

            modalOverlay.innerHTML = `
              <div class="modal-box modal-wide">
                <div class="modal-step-indicator">STEP 2 / 2 ： 残りのカードを山札の上に戻す順番</div>
                <div class="modal-title">🏪 【コンビニ②】山札の上に戻す順番を決めてください</div>
                <div class="modal-desc">
                  手札に加えるカード：<strong>【${takenDef?.name || ''}】</strong><br>
                  残りのカードを山札の上に戻す順番を確認してください（カードをタップすると効果を確認できます）。
                </div>
                <div class="modal-cards-grid">${remainHTML}</div>
                ${remainingCards.length >= 2 ? `
                  <div style="text-align:center; margin-bottom:10px;">
                    <button type="button" class="btn-accent" id="btn-conv-swap-order">
                      ⇅ 1番上と2番目の順番を入れ替える
                    </button>
                  </div>
                ` : ''}
                ${this.renderCardEffectPreviewBoxHTML(previewTarget)}
                <div class="modal-actions">
                  <button type="button" class="btn-secondary" id="btn-conv-back-step1">◀ STEP 1 に戻ってカードを選び直す</button>
                  <button type="button" class="btn-primary" id="btn-conv-confirm">✅ この順番で山札に戻して完了</button>
                </div>
              </div>
            `;

            modalOverlay.querySelectorAll('[data-conv-inspect-uid]').forEach(el => {
              el.addEventListener('click', () => {
                this.modalPreviewCardUid = el.dataset.convInspectUid;
                renderConv();
              });
            });

            document.getElementById('btn-conv-swap-order')?.addEventListener('click', () => {
              this.convenienceOrderUids.reverse();
              renderConv();
            });

            document.getElementById('btn-conv-back-step1')?.addEventListener('click', () => {
              this.conveniencePhase = 1;
              renderConv();
            });

            document.getElementById('btn-conv-confirm')?.addEventListener('click', () => {
              const takeUid = this.convenienceSelectedTakeUid;
              const orderUids = [...this.convenienceOrderUids];
              this.convenienceSelectedTakeUid = null;
              this.convenienceOrderUids = [];
              this.conveniencePhase = 1;
              this.handleSubmitChoice({ takeCardUid: takeUid, returnOrderUids: orderUids });
            });
          }
        };
        renderConv();
        break;
      }

      // 交番：手札の迷子1枚を山札の一番上に置くか？
      case 'POLICE_BOX_CONFIRM': {
        modalOverlay.innerHTML = `
          <div class="modal-box">
            <div class="modal-title">🚨 【交番】手札の「迷子」を山札の一番上に置きますか？</div>
            <div class="modal-desc">
              あなたの手札にある「迷子」1枚を、山札の一番上に戻すことができます。
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-primary" id="btn-pb-yes">山札の一番上に置く（推奨）</button>
              <button type="button" class="btn-secondary" id="btn-pb-no">置かない</button>
            </div>
          </div>
        `;
        document.getElementById('btn-pb-yes')?.addEventListener('click', () => {
          this.handleSubmitChoice({ putOnTop: true });
        });
        document.getElementById('btn-pb-no')?.addEventListener('click', () => {
          this.handleSubmitChoice({ putOnTop: false });
        });
        break;
      }

      // 灯台・御守り・コインランドリー手札選択・水族館・川・トンネル・振り向く
      // タップで効果プレビューを表示し、確認ボタンで決定する初心者安心設計
      case 'LIGHTHOUSE_PICK':
      case 'AMULET_PICK':
      case 'COIN_LAUNDRY_CARD':
      case 'AQUARIUM_PICK':
      case 'RIVER_PASS':
      case 'TUNNEL_DISCARD':
      case 'LOOK_BACK_PICK': {
        const titles = {
          LIGHTHOUSE_PICK: '🔦 【灯台】次の手番の相手に強制的に引かせる手札を1枚選んでください',
          AMULET_PICK: '⛩ 【御守り】次の手番の相手に引かれないよう守る手札を1枚選んでください',
          COIN_LAUNDRY_CARD: '🧺 【コインランドリー】山札の一番上と入れ替える手札を1枚選んでください',
          AQUARIUM_PICK: '🐠 【水族館】全員でシャッフルして配り直すために出す手札を1枚選んでください',
          RIVER_PASS: '🌊 【川】左隣のプレイヤーに渡す手札を1枚選んでください',
          TUNNEL_DISCARD: '🚇 【トンネル】手札から捨てる「あかり」カードを1枚選んでください',
          LOOK_BACK_PICK: '👣 【振り向く】捨て札からあなたの手札に回収するカードを1枚選んでください'
        };

        let selectableCards = me.hand;
        if (pa.type === 'TUNNEL_DISCARD') {
          selectableCards = me.hand.filter(c => window.MAIGO_CARDS[c.cardId]?.category === 'light');
        } else if (pa.type === 'LOOK_BACK_PICK') {
          selectableCards = state.discardPile;
        }

        if (!this.modalPreviewCardUid || !selectableCards.some(c => c.uid === this.modalPreviewCardUid)) {
          this.modalPreviewCardUid = selectableCards[0]?.uid || null;
        }

        const renderPickModal = () => {
          const selectedObj = selectableCards.find(c => c.uid === this.modalPreviewCardUid) || selectableCards[0];
          const selectedDef = window.MAIGO_CARDS[selectedObj?.cardId];

          const cardsHTML = selectableCards.map(c => {
            const def = window.MAIGO_CARDS[c.cardId];
            const isSel = selectedObj && selectedObj.uid === c.uid;
            return `
              <button type="button" class="modal-pick-card ${def.category} ${isSel ? 'selected' : ''}" data-pick-uid="${c.uid}">
                <div class="conv-badge ${isSel ? 'take' : 'return'}">${isSel ? '✓ 選択中' : 'タップで確認'}</div>
                <div class="mpc-art">${window.getCardIllustrationSVG(def.id)}</div>
                <div class="mpc-title">${def.name}</div>
                <div class="mpc-cat">${def.categoryLabel}</div>
              </button>
            `;
          }).join('');

          modalOverlay.innerHTML = `
            <div class="modal-box modal-wide">
              <div class="modal-title">${titles[pa.type]}</div>
              <div class="modal-desc">カードをタップすると下に効果が表示されます。確認して決定ボタンを押してください。</div>
              <div class="modal-cards-grid scrollable-grid">${cardsHTML}</div>
              ${this.renderCardEffectPreviewBoxHTML(selectedObj)}
              <div class="modal-actions">
                <button type="button" class="btn-primary" id="btn-confirm-card-pick">
                  ✅「${selectedDef?.name || ''}」に決定する
                </button>
              </div>
            </div>
          `;

          modalOverlay.querySelectorAll('[data-pick-uid]').forEach(el => {
            el.addEventListener('click', () => {
              this.modalPreviewCardUid = el.dataset.pickUid;
              renderPickModal();
            });
          });

          document.getElementById('btn-confirm-card-pick')?.addEventListener('click', () => {
            if (selectedObj) {
              this.handleSubmitChoice({ cardUid: selectedObj.uid });
            }
          });
        };

        renderPickModal();
        break;
      }

      // プレイヤーを1人選ぶ系（電話ボックス・コインランドリー・分かれ道・神社・黒崎さん）
      case 'PHONE_BOOTH_TARGET':
      case 'COIN_LAUNDRY_TARGET':
      case 'FORKED_ROAD_TARGET':
      case 'SHRINE_TARGET':
      case 'KUROSAKI_TARGET': {
        const titles = {
          PHONE_BOOTH_TARGET: '📞 【電話ボックス】山札からカードを2枚引かせるプレイヤーを1人選んでください（自身も可）',
          COIN_LAUNDRY_TARGET: '🧺 【コインランドリー】手札1枚を山札の一番上と入れ替えるプレイヤーを1人選んでください（自身も可）',
          FORKED_ROAD_TARGET: '🪧 【分かれ道】自分以外で山札から1枚引かせるプレイヤーを1人選んでください（その後あなたも1枚引きます）',
          SHRINE_TARGET: '⛩ 【神社】手札が一番多いプレイヤーを1人選んでください（全員の手札の「迷子」がその人に集まります！）',
          KUROSAKI_TARGET: '🧥 【黒崎さん】あなたの手札の「迷子」をすべて渡すプレイヤーを1人選んでください'
        };

        let candidates = window.MaigoGameEngine.getActivePlayers(state);
        if (pa.type === 'FORKED_ROAD_TARGET') {
          candidates = candidates.filter(p => p.id !== me.id);
        } else if (pa.type === 'SHRINE_TARGET' && pa.candidateIds) {
          candidates = candidates.filter(p => pa.candidateIds.includes(p.id));
        }

        const playersHTML = candidates.map(p => {
          const ch = window.MAIGO_CHARACTERS.find(c => c.id === p.characterId) || window.MAIGO_CHARACTERS[0];
          return `
            <button type="button" class="modal-target-player-btn" data-target-pid="${p.id}">
              <div class="mtp-avatar">${window.getCharacterAvatarSVG(ch.avatarType)}</div>
              <div class="mtp-info">
                <div class="mtp-name">${this.escapeHTML(p.name)} ${p.id === me.id ? '（あなた）' : ''}</div>
                <div class="mtp-meta">🃏手札: <strong>${p.hand.length}枚</strong> ／ ❤️ライフ: <strong>${p.life}/7</strong></div>
              </div>
            </button>
          `;
        }).join('');

        modalOverlay.innerHTML = `
          <div class="modal-box">
            <div class="modal-title">${titles[pa.type]}</div>
            <div class="modal-players-list">${playersHTML}</div>
          </div>
        `;

        modalOverlay.querySelectorAll('[data-target-pid]').forEach(btn => {
          btn.addEventListener('click', () => {
            this.handleSubmitChoice({ targetPlayerId: btn.dataset.targetPid });
          });
        });
        break;
      }

      // うわさ話：山札の確認＆迷子を山札の一番上にセット（各カードをタップで効果確認可能！）
      case 'RUMOR_INSPECT': {
        const inspected = pa.inspectedCards || [];
        if (!this.modalPreviewCardUid && inspected.length > 0) {
          this.modalPreviewCardUid = inspected[0].uid;
        }

        const renderRumor = () => {
          const selectedObj = inspected.find(c => c.uid === this.modalPreviewCardUid) || inspected[0];
          const cardsHTML = inspected.map(c => {
            const def = window.MAIGO_CARDS[c.cardId];
            const isSel = selectedObj && selectedObj.uid === c.uid;
            return `
              <button type="button" class="mini-inspect-chip ${def.category} ${isSel ? 'selected' : ''}" data-rumor-uid="${c.uid}">
                ${def.name}
              </button>
            `;
          }).join('');

          modalOverlay.innerHTML = `
            <div class="modal-box modal-wide">
              <div class="modal-title">🗣 【${window.MAIGO_CARDS[pa.cardId]?.name}】山札の内容確認</div>
              <div class="modal-desc">
                ${pa.foundMaigo
                  ? '🩸 <strong>山札の中に「迷子」が見つかりました！</strong> 山札をよく切った後、「迷子」1枚を<strong>山札の一番上</strong>に置きました！'
                  : '山札の中に「迷子」はありませんでした（すべて誰かの手札にあります）。山札をよく切りました。'}
                <br><small>※カード名をタップすると下にそのカードの効果が表示されます。</small>
              </div>
              <div class="inspect-cards-wrap">${cardsHTML || '<span>山札0枚</span>'}</div>
              ${this.renderCardEffectPreviewBoxHTML(selectedObj)}
              <div class="modal-actions">
                <button type="button" class="btn-primary" id="btn-rumor-ok">確認完了</button>
              </div>
            </div>
          `;

          modalOverlay.querySelectorAll('[data-rumor-uid]').forEach(btn => {
            btn.addEventListener('click', () => {
              this.modalPreviewCardUid = btn.dataset.rumorUid;
              renderRumor();
            });
          });
          document.getElementById('btn-rumor-ok')?.addEventListener('click', () => {
            this.handleSubmitChoice({ confirmed: true });
          });
        };
        renderRumor();
        break;
      }
    }
  }

  // ラウンド終了・最終結果モーダル
  renderRoundOrFinalModal(state, modalOverlay) {
    modalOverlay.classList.remove('hidden');
    const isGameOver = state.phase === 'GAME_OVER' || state.currentRound >= state.totalRounds;

    const sortedPlayers = [...state.players].sort((a, b) => b.life - a.life);
    const topLife = sortedPlayers[0]?.life ?? 0;

    let oideSummaryHTML = '';
    if (state.mode === 'oideoide' && state.oideRoundSummary) {
      const os = state.oideRoundSummary;
      oideSummaryHTML = `
        <div class="oide-reveal-banner">
          <div class="orb-title">👁 【おいで、おいで 正体公開＆ライフ精算】</div>
          <div class="orb-body">
            このラウンドの「おいで、おいで」は <strong>${this.escapeHTML(os.oidePlayerName)}</strong> でした！<br>
            基本ライフ −1 ＋ 【BAD END】になったプレイヤー ${os.badEndCount}人 × 1 ＝ <strong>ライフ ${os.beforeLife} ⇒ ${os.finalLife}</strong>
          </div>
        </div>
      `;
    }

    const rowsHTML = sortedPlayers.map((p, idx) => {
      const isWinner = isGameOver && p.life === topLife;
      const roleBadge = state.mode === 'oideoide' && p.role === 'oideoide'
        ? '<span class="role-pill role-oide">👁 おいで、おいで</span>'
        : '';
      return `
        <div class="result-player-row ${isWinner ? 'is-winner' : ''}">
          <div class="rpr-rank">${isWinner ? '👑 優勝' : `${idx + 1}位`}</div>
          <div class="rpr-name">${this.escapeHTML(p.name)} ${roleBadge}</div>
          <div class="rpr-end">${this.getRoundStatusBadgeHTML(p.roundStatus)}</div>
          <div class="rpr-life">${this.renderLifeOrbsHTML(p.life)}</div>
        </div>
      `;
    }).join('');

    const canProceed = this.isHost || !this.isOnlineRoom;

    modalOverlay.innerHTML = `
      <div class="modal-box modal-wide result-modal-box">
        <div class="modal-title">
          ${isGameOver
            ? `🏆 全 ${state.totalRounds} ラウンド終了！ 最終結果発表`
            : `🌙 第 ${state.currentRound} ラウンド終了結果`}
        </div>
        ${oideSummaryHTML}
        <div class="result-players-table">${rowsHTML}</div>
        <div class="modal-actions">
          ${!isGameOver ? (
            canProceed
              ? `
                <button type="button" class="btn-secondary" id="btn-back-lobby">🚪 ロビーへ戻る</button>
                <button type="button" class="btn-primary" id="btn-next-round">第 ${state.currentRound + 1} ラウンドへ進む ▶</button>
              `
              : `
                <span class="waiting-host-msg">ホストが次のラウンドを開始するのを待っています…</span>
                <button type="button" class="btn-secondary" id="btn-back-lobby">🚪 ロビーへ戻る</button>
              `
          ) : (
            canProceed
              ? `
                <button type="button" class="btn-secondary" id="btn-back-lobby">🚪 ロビーへ戻る</button>
                <button type="button" class="btn-primary" id="btn-back-waiting">⚙️ ルーム設定画面に戻る</button>
              `
              : `<button type="button" class="btn-primary" id="btn-back-lobby">🚪 ロビーへ戻る</button>`
          )}
        </div>
      </div>
    `;

    document.getElementById('btn-next-round')?.addEventListener('click', () => {
      modalOverlay.classList.add('hidden');
      modalOverlay.innerHTML = '';
      window.MaigoGameEngine.proceedFromRoundEnd(this.gameState);
      this.syncGameState();
    });
    document.getElementById('btn-back-waiting')?.addEventListener('click', () => {
      this.closeAllGameOverlays();
      this.gameState = null;
      if (this.roomData) {
        this.roomData.status = 'WAITING';
        this.roomData.gameState = null;
        this.syncRoomData();
        this.showScreen('waiting-screen');
        this.renderWaitingRoom();
      } else {
        this.leaveRoom(true);
      }
    });
    document.getElementById('btn-back-lobby')?.addEventListener('click', () => {
      this.closeAllGameOverlays();
      this.leaveRoom(true);
    });
  }

  // ログ一覧の描画
  renderActionLogs(state) {
    const logs = state.logs || [];
    const tickerEl = document.getElementById('live-log-ticker');
    if (tickerEl && logs.length > 0) {
      tickerEl.textContent = `📜 [R${logs[0].round}] ${logs[0].text}`;
    }
    const logContainer = document.getElementById('game-log-list');
    if (!logContainer) return;
    logContainer.innerHTML = logs.map(l => `
      <div class="log-entry log-${l.type || 'normal'}">
        <span class="log-r">[R${l.round}]</span> ${this.escapeHTML(l.text)}
      </div>
    `).join('');
  }

  // ==========================================================================
  // CPUの自動手番スケジューリング（ホストまたはローカル実行時）
  // ==========================================================================
  scheduleCpuTurnIfNeeded() {
    if (this.cpuTimer) {
      clearTimeout(this.cpuTimer);
      this.cpuTimer = null;
    }
    if (!this.gameState) return;
    if (this.isOnlineRoom && !this.isHost) return; // オンライン時はホストが一元的にCPUを動かす

    const nextMove = window.MaigoGameEngine.computeCpuNextMove(this.gameState);
    if (!nextMove) return;

    this.cpuTimer = setTimeout(() => {
      if (this.isAnimatingEvent) {
        this.scheduleCpuTurnIfNeeded();
        return;
      }
      const move = window.MaigoGameEngine.computeCpuNextMove(this.gameState);
      if (!move) return;

      if (move.actionType === 'DRAW_FROM_RIGHT') {
        window.maigoAudio.playCardDraw();
        window.MaigoGameEngine.drawFromRightNeighbor(this.gameState, move.playerId, move.targetCardUid);
        this.syncGameState();
      } else if (move.actionType === 'PLAY_CARD') {
        window.MaigoGameEngine.playCardFromHand(this.gameState, move.playerId, move.cardUids);
        this.syncGameState();
      } else if (move.actionType === 'END_TURN') {
        window.MaigoGameEngine.endTurnVoluntarily(this.gameState, move.playerId);
        this.syncGameState();
      } else if (move.actionType === 'SUBMIT_CHOICE') {
        window.MaigoGameEngine.submitPendingChoice(this.gameState, move.playerId, move.choiceData);
        this.syncGameState();
      }
    }, 950);
  }

  // ==========================================================================
  // 捨て札一覧確認モーダル＆ルール・全カード図鑑モーダル
  // ==========================================================================
  openDiscardInspectModal() {
    const modal = document.getElementById('discard-modal');
    const body = document.getElementById('discard-modal-body');
    if (!modal || !body || !this.gameState) return;

    const pile = this.gameState.discardPile || [];
    if (pile.length === 0) {
      body.innerHTML = `<div class="empty-rooms-msg">現在、捨て札はありません（0枚）</div>`;
    } else {
      let selectedDiscardUid = pile[pile.length - 1].uid;
      const renderDiscardBody = () => {
        const selectedObj = pile.find(c => c.uid === selectedDiscardUid) || pile[pile.length - 1];
        body.innerHTML = `
          <div class="modal-desc">カードをタップすると下に効果の詳細が表示されます。</div>
          <div class="modal-cards-grid scrollable-grid">${pile.map(c => {
            const def = window.MAIGO_CARDS[c.cardId];
            const isSel = selectedObj && selectedObj.uid === c.uid;
            return `
              <button type="button" class="modal-pick-card ${def.category} ${isSel ? 'selected' : ''}" data-disc-inspect-uid="${c.uid}">
                <div class="mpc-art">${window.getCardIllustrationSVG(def.id)}</div>
                <div class="mpc-title">${def.name}</div>
                <div class="mpc-cat">${def.categoryLabel}</div>
              </button>
            `;
          }).join('')}</div>
          ${this.renderCardEffectPreviewBoxHTML(selectedObj)}
        `;
        body.querySelectorAll('[data-disc-inspect-uid]').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedDiscardUid = btn.dataset.discInspectUid;
            renderDiscardBody();
          });
        });
      };
      renderDiscardBody();
    }
    modal.classList.remove('hidden');
  }

  openRulebookModal() {
    const modal = document.getElementById('rulebook-modal');
    const catalog = document.getElementById('rulebook-card-catalog');
    if (!modal) return;

    if (catalog && !catalog.dataset.rendered) {
      catalog.innerHTML = Object.values(window.MAIGO_CARDS).map(def => {
        const actionBadge = def.actionBonus > 0 ? `<span class="cat-action-badge">行動＋${def.actionBonus}</span>` : '';
        return `
          <div class="catalog-card-item ${def.category}">
            <div class="cci-art">${window.getCardIllustrationSVG(def.id)}</div>
            <div class="cci-body">
              <div class="cci-header">
                <span class="cci-name">${def.number}. ${def.name}</span>
                <span class="cci-count">基本 ${def.baseCount}枚</span>
                ${actionBadge}
              </div>
              <div class="cci-desc">${def.description}</div>
              <div class="cci-flavor">${def.flavor}</div>
            </div>
          </div>
        `;
      }).join('');
      catalog.dataset.rendered = 'true';
    }

    modal.classList.remove('hidden');
  }

  showScreen(screenId) {
    if (screenId !== 'game-screen') {
      this.closeAllGameOverlays();
    }
    ['lobby-screen', 'waiting-screen', 'game-screen'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.toggle('hidden', id !== screenId);
      }
    });
    document.body.classList.toggle('in-game-locked', screenId === 'game-screen');
  }

  escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.maigoApp = new MaigoApp();
  window.maigoApp.init();
});
