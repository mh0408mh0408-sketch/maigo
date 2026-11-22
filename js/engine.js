// ============================================================================
// ボードゲーム『迷子 - MAIGO -』 コアゲームエンジン
// 公式ルール・Q&A裁定・おいで、おいでモード・5人以上拡張に完全準拠
// ============================================================================

class MaigoGameEngine {
  // Firebase Realtime Databaseで空配列・空オブジェクトが消失する仕様への正規化処理
  static normalizeState(state) {
    if (!state) return null;
    state.deck = Array.isArray(state.deck) ? state.deck : (state.deck ? Object.values(state.deck) : []);
    state.discardPile = Array.isArray(state.discardPile) ? state.discardPile : (state.discardPile ? Object.values(state.discardPile) : []);
    state.logs = Array.isArray(state.logs) ? state.logs : (state.logs ? Object.values(state.logs) : []);
    state.players = Array.isArray(state.players) ? state.players : (state.players ? Object.values(state.players) : []);
    state.players.forEach((p, idx) => {
      p.seatIndex = typeof p.seatIndex === 'number' ? p.seatIndex : idx;
      p.hand = Array.isArray(p.hand) ? p.hand : (p.hand ? Object.values(p.hand) : []);
    });
    if (state.pendingAction) {
      const pa = state.pendingAction;
      pa.playedCards = Array.isArray(pa.playedCards) ? pa.playedCards : (pa.playedCards ? Object.values(pa.playedCards) : []);
      pa.topCards = Array.isArray(pa.topCards) ? pa.topCards : (pa.topCards ? Object.values(pa.topCards) : []);
      pa.inspectedCards = Array.isArray(pa.inspectedCards) ? pa.inspectedCards : (pa.inspectedCards ? Object.values(pa.inspectedCards) : []);
      pa.requiredPlayerIds = Array.isArray(pa.requiredPlayerIds) ? pa.requiredPlayerIds : (pa.requiredPlayerIds ? Object.values(pa.requiredPlayerIds) : []);
      pa.candidateIds = Array.isArray(pa.candidateIds) ? pa.candidateIds : (pa.candidateIds ? Object.values(pa.candidateIds) : []);
      pa.selections = pa.selections || {};
    }
    if (state.lastEvent && state.lastEvent.endEvents) {
      state.lastEvent.endEvents = Array.isArray(state.lastEvent.endEvents)
        ? state.lastEvent.endEvents
        : Object.values(state.lastEvent.endEvents);
      state.lastEvent.endEvents.forEach(ev => {
        if (ev.revealedCards) {
          ev.revealedCards = Array.isArray(ev.revealedCards) ? ev.revealedCards : Object.values(ev.revealedCards);
        }
      });
    }
    return state;
  }

  // 新規ゲーム状態の生成
  static createInitialGameState(roomConfig, playersList) {
    const playerCount = playersList.length;
    const mode = roomConfig.mode || 'normal'; // 'normal' | 'oideoide'
    const oideKnowAtStart = Boolean(roomConfig.oideKnowAtStart); // 初手で誰がおいでおいでか分かるか
    const includeExtraCards = Boolean(roomConfig.includeExtraCards);
    const totalRounds = Number(roomConfig.totalRounds) || 3;
    const expansionMode = roomConfig.expansionMode || (playerCount >= 5 ? 'auto' : 'standard');
    const customMaigoCount = roomConfig.customMaigoCount || null;
    const customDeckScale = roomConfig.customDeckScale || 1;
    const horrorLevel = roomConfig.horrorLevel || 'standard';

    const players = playersList.map((p, idx) => ({
      id: p.id,
      name: p.name,
      isCpu: Boolean(p.isCpu),
      seatIndex: idx,
      characterId: p.characterId || window.MAIGO_CHARACTERS[idx % window.MAIGO_CHARACTERS.length].id,
      life: 7,
      hand: [],
      role: 'normal', // 'normal' | 'oideoide'
      wasOideInPast: false,
      roundStatus: 'ACTIVE', // 'ACTIVE' | 'HAPPY_END' | 'BAD_END' | 'NORMAL_END' | 'OIDE_FINISHED' | 'OIDE_LAST'
      roundEndType: null,
      lighthouseCardUid: null,
      amuletCardUid: null,
      deferredBadEndCheck: false,
      forcedBadEndByRailroad: false
    }));

    const state = {
      roomId: roomConfig.roomId || 'LOCAL',
      status: 'PLAYING', // 'WAITING' | 'PLAYING' | 'GAME_OVER'
      mode,
      oideKnowAtStart,
      includeExtraCards,
      expansionMode,
      customMaigoCount,
      customDeckScale,
      horrorLevel,
      currentRound: 1,
      totalRounds,
      phase: 'TURN_DRAW_FROM_RIGHT', // 'TURN_DRAW_FROM_RIGHT' | 'TURN_PLAY_CARD' | 'AWAITING_CHOICE' | 'ROUND_END' | 'GAME_OVER'
      turnPlayerIndex: 0,
      actionsRemaining: 1,
      hasPlayedAtLeastOneCard: false,
      deck: [],
      discardPile: [],
      players,
      pendingAction: null,
      lastEvent: null,
      eventSeq: 1,
      oideRevealed: false,
      oideRoundSummary: null,
      logs: []
    };

    this.setupRound(state, 1);
    return state;
  }

  // ラウンド開始準備
  static setupRound(state, roundNumber) {
    state.currentRound = roundNumber;
    state.phase = 'TURN_DRAW_FROM_RIGHT';
    state.actionsRemaining = 1;
    state.hasPlayedAtLeastOneCard = false;
    state.pendingAction = null;
    state.discardPile = [];
    state.oideRevealed = state.mode === 'oideoide' ? state.oideKnowAtStart : false;
    state.oideRoundSummary = null;

    const playerCount = state.players.length;

    // 1. 「おいで、おいで」役の抽選（まだなっていないプレイヤーから優先選出）
    if (state.mode === 'oideoide') {
      let candidates = state.players.filter(p => !p.wasOideInPast);
      if (candidates.length === 0) {
        state.players.forEach(p => { p.wasOideInPast = false; });
        candidates = [...state.players];
      }
      const chosenOide = candidates[Math.floor(Math.random() * candidates.length)];
      state.players.forEach(p => {
        if (p.id === chosenOide.id) {
          p.role = 'oideoide';
          p.wasOideInPast = true;
        } else {
          p.role = 'normal';
        }
      });
    } else {
      state.players.forEach(p => { p.role = 'normal'; });
    }

    // 2. 山札生成と初期手札配布（初期手札は5枚）
    const handSize = 5;
    let redrawCount = 0;
    let validDeal = false;

    while (!validDeal && redrawCount < 60) {
      state.deck = window.buildGameDeck({
        playerCount,
        includeExtraCards: state.includeExtraCards,
        expansionMode: state.expansionMode,
        customMaigoCount: state.customMaigoCount,
        customDeckScale: state.customDeckScale
      });

      state.players.forEach(p => {
        p.hand = state.deck.splice(0, handSize);
        p.roundStatus = 'ACTIVE';
        p.roundEndType = null;
        p.lighthouseCardUid = null;
        p.amuletCardUid = null;
        p.deferredBadEndCheck = false;
        p.forcedBadEndByRailroad = false;
      });

      // 初期手札に【BAD END】条件を満たすプレイヤーがいたら引き直す
      const anyoneBad = state.players.some(p => this.isHandBadEndCondition(p.hand));
      if (!anyoneBad) {
        validDeal = true;
      } else {
        redrawCount++;
      }
    }

    // 開始プレイヤー決定（ラウンドごとに時計回りで移動）
    state.turnPlayerIndex = (roundNumber - 1) % playerCount;

    this.addLog(state, `━━━ 第 ${roundNumber} ラウンド開始（山札残り ${state.deck.length}枚）━━━`, 'system');
    if (redrawCount > 0) {
      this.addLog(state, `※配られた初期手札に【BAD END】条件を満たす手札があったため、山札に戻して引き直しました（${redrawCount}回）。`, 'info');
    }
    if (state.mode === 'oideoide') {
      if (state.oideKnowAtStart) {
        const oideP = state.players.find(p => p.role === 'oideoide');
        this.addLog(state, `【おいで、おいでモード（正体公開）】このラウンドの憑依者は「${oideP.name}」です！`, 'danger');
      } else {
        this.addLog(state, `【おいで、おいでモード（正体隠匿）】誰か1人が「おいで、おいで」に憑依されています…`, 'danger');
      }
    }
  }

  static addLog(state, text, type = 'normal') {
    if (!state.logs) state.logs = [];
    state.logs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      type,
      round: state.currentRound
    });
    if (state.logs.length > 60) {
      state.logs.length = 60;
    }
  }

  static emitEvent(state, eventData) {
    state.eventSeq = (state.eventSeq || 0) + 1;
    state.lastEvent = {
      seq: state.eventSeq,
      timestamp: Date.now(),
      ...eventData
    };
  }

  // 手札が「迷子のみ」または「迷子とくらやみのみ」かどうか判定
  static isHandBadEndCondition(hand) {
    if (!hand || hand.length === 0) return false;
    let hasMaigo = false;
    let hasLight = false;
    for (const c of hand) {
      const def = window.MAIGO_CARDS[c.cardId];
      if (!def) continue;
      if (def.category === 'maigo') hasMaigo = true;
      if (def.category === 'light') hasLight = true;
    }
    return hasMaigo && !hasLight;
  }

  // 手札が「迷子のみ」かどうか判定
  static isHandOnlyMaigo(hand) {
    if (!hand || hand.length === 0) return false;
    return hand.every(c => {
      const def = window.MAIGO_CARDS[c.cardId];
      return def && def.category === 'maigo';
    });
  }

  // アクティブなプレイヤー一覧
  static getActivePlayers(state) {
    return state.players.filter(p => p.roundStatus === 'ACTIVE');
  }

  // 指定プレイヤーの右隣（反時計回りで直前のアクティブプレイヤー＝カードを引く相手）
  static getRightActiveNeighbor(state, playerIndex) {
    const n = state.players.length;
    for (let step = 1; step < n; step++) {
      const idx = (playerIndex - step + n) % n;
      if (state.players[idx].roundStatus === 'ACTIVE') {
        return state.players[idx];
      }
    }
    return null;
  }

  // 指定プレイヤーの左隣（時計回りで次のアクティブプレイヤー＝次の手番）
  static getLeftActiveNeighbor(state, playerIndex) {
    const n = state.players.length;
    for (let step = 1; step < n; step++) {
      const idx = (playerIndex + step) % n;
      if (state.players[idx].roundStatus === 'ACTIVE') {
        return state.players[idx];
      }
    }
    return null;
  }

  // 左隣から時計回りのアクティブプレイヤー配列（自分自身を末尾に含む）
  static getClockwiseActivePlayersFromLeft(state, originPlayerIndex) {
    const result = [];
    const n = state.players.length;
    for (let step = 1; step <= n; step++) {
      const idx = (originPlayerIndex + step) % n;
      const p = state.players[idx];
      if (p.roundStatus === 'ACTIVE') {
        result.push(p);
      }
    }
    return result;
  }

  // ==========================================================================
  // 手順1：右隣のプレイヤーの手札からカードを1枚引く
  // ==========================================================================
  static drawFromRightNeighbor(state, actorId, targetCardUid = null) {
    if (state.phase !== 'TURN_DRAW_FROM_RIGHT') return { ok: false, error: '現在は手札を引くフェーズではありません' };
    const turnPlayer = state.players[state.turnPlayerIndex];
    if (!turnPlayer || turnPlayer.id !== actorId) return { ok: false, error: 'あなたの手番ではありません' };

    const rightNeighbor = this.getRightActiveNeighbor(state, state.turnPlayerIndex);
    if (!rightNeighbor || rightNeighbor.hand.length === 0) {
      // 万が一右隣の手札が0枚の場合はそのままカードプレイフェーズへ
      state.phase = 'TURN_PLAY_CARD';
      state.actionsRemaining = 1;
      state.hasPlayedAtLeastOneCard = false;
      return { ok: true };
    }

    // 灯台・御守り制限のチェック
    let selectableCards = [...rightNeighbor.hand];
    if (rightNeighbor.lighthouseCardUid) {
      const forced = rightNeighbor.hand.find(c => c.uid === rightNeighbor.lighthouseCardUid);
      if (forced) {
        selectableCards = [forced];
      }
    } else if (rightNeighbor.amuletCardUid && rightNeighbor.hand.length >= 2) {
      selectableCards = rightNeighbor.hand.filter(c => c.uid !== rightNeighbor.amuletCardUid);
    }

    let chosenCard = null;
    if (targetCardUid) {
      chosenCard = selectableCards.find(c => c.uid === targetCardUid);
    }
    if (!chosenCard) {
      chosenCard = selectableCards[Math.floor(Math.random() * selectableCards.length)];
    }

    // 右隣の手札から抜き取り、自分の手札へ加える
    const removeIdx = rightNeighbor.hand.findIndex(c => c.uid === chosenCard.uid);
    if (removeIdx !== -1) {
      rightNeighbor.hand.splice(removeIdx, 1);
    }
    turnPlayer.hand.push(chosenCard);

    // 右隣の灯台・御守り・保留BAD ENDフラグを解除
    const usedLighthouse = Boolean(rightNeighbor.lighthouseCardUid);
    const usedAmulet = Boolean(rightNeighbor.amuletCardUid);
    rightNeighbor.lighthouseCardUid = null;
    rightNeighbor.amuletCardUid = null;
    rightNeighbor.deferredBadEndCheck = false;

    const note = usedLighthouse ? '（灯台の誘導！）' : (usedAmulet ? '（御守りの守護発動中）' : '');
    this.addLog(state, `${turnPlayer.name} が右隣の ${rightNeighbor.name} の手札からカードを1枚引いた。${note}`, 'action');

    // Q&A 1 & 3：手番の始めに相手の手札を引いた・引かれた後のEND判定
    const endEvents = [];
    const rightEnd = this.evaluatePlayerEnd(state, rightNeighbor, `${turnPlayer.name} に手札を引かれた結果`);
    if (rightEnd) endEvents.push(rightEnd);

    const turnEnd = this.evaluatePlayerEnd(state, turnPlayer, `${rightNeighbor.name} からカードを引いた結果`);
    if (turnEnd) endEvents.push(turnEnd);

    this.emitEvent(state, {
      type: 'DREW_FROM_NEIGHBOR',
      actorId: turnPlayer.id,
      actorName: turnPlayer.name,
      fromId: rightNeighbor.id,
      fromName: rightNeighbor.name,
      drawnCardId: chosenCard.cardId,
      endEvents
    });

    // ラウンド終了チェック
    if (this.checkAndHandleRoundCompletion(state, endEvents)) {
      return { ok: true, drawnCard: chosenCard, endEvents };
    }

    // もし手番プレイヤー自身が引いた直後にBAD END等で脱落していたら次の手番へ
    if (turnPlayer.roundStatus !== 'ACTIVE') {
      this.advanceToNextTurn(state);
      return { ok: true, drawnCard: chosenCard, endEvents };
    }

    // 手順2へ進む
    state.phase = 'TURN_PLAY_CARD';
    state.actionsRemaining = 1;
    state.hasPlayedAtLeastOneCard = false;
    return { ok: true, drawnCard: chosenCard, endEvents };
  }

  // ==========================================================================
  // 手順2：手札からカードを場に出して効果を使用する
  // ==========================================================================
  static playCardFromHand(state, actorId, cardUids) {
    if (state.phase !== 'TURN_PLAY_CARD') return { ok: false, error: '現在はカードを出すフェーズではありません' };
    const turnPlayer = state.players[state.turnPlayerIndex];
    if (!turnPlayer || turnPlayer.id !== actorId) return { ok: false, error: 'あなたの手番ではありません' };
    if (state.actionsRemaining <= 0) return { ok: false, error: '行動回数が残っていません' };

    const uids = Array.isArray(cardUids) ? cardUids : [cardUids];
    if (uids.length === 0) return { ok: false, error: 'カードが選択されていません' };

    // 手札内に存在するか確認
    const selectedCards = uids.map(u => turnPlayer.hand.find(c => c.uid === u)).filter(Boolean);
    if (selectedCards.length !== uids.length) {
      return { ok: false, error: '選択されたカードが手札にありません' };
    }

    const firstDef = window.MAIGO_CARDS[selectedCards[0].cardId];
    if (!firstDef) return { ok: false, error: '不正なカードです' };

    // 「迷子」は場に出せない
    if (firstDef.category === 'maigo') {
      return { ok: false, error: '「迷子」カードは場に出すことができません！' };
    }

    // 2枚以上まとめ出しできるのは「壊れた街灯路」のみ
    if (selectedCards.length > 1) {
      const allBroken = selectedCards.every(c => c.cardId === 'broken_streetlight');
      if (!allBroken) {
        return { ok: false, error: '2枚以上まとめて出せるのは「壊れた街灯路」のみです' };
      }
    }

    // 手札から取り除く
    selectedCards.forEach(sc => {
      const idx = turnPlayer.hand.findIndex(c => c.uid === sc.uid);
      if (idx !== -1) turnPlayer.hand.splice(idx, 1);
    });

    // 行動回数を1消費
    state.actionsRemaining -= 1;
    state.hasPlayedAtLeastOneCard = true;

    const countText = selectedCards.length > 1 ? `（${selectedCards.length}枚まとめ出し！）` : '';
    this.addLog(state, `${turnPlayer.name} が【${firstDef.name}】${countText}を場に出した！`, 'card');

    // カード効果の解決へ
    return this.resolveCardEffect(state, turnPlayer, firstDef, selectedCards);
  }

  // カード効果解決ディスパッチャ
  static resolveCardEffect(state, caster, cardDef, playedCards) {
    const cardId = cardDef.id;

    switch (cardId) {
      // 1. 明るい街灯路
      case 'bright_streetlight': {
        if (this.isHandOnlyMaigo(caster.hand)) {
          // 手札が「迷子」のみの場合、手札に戻してもよい
          state.phase = 'AWAITING_CHOICE';
          state.pendingAction = {
            type: 'BRIGHT_STREETLIGHT_RETURN',
            actorId: caster.id,
            cardId,
            playedCards
          };
          this.emitEvent(state, {
            type: 'CARD_PLAYED_AWAIT',
            actorId: caster.id,
            actorName: caster.name,
            cardId,
            count: playedCards.length
          });
          return { ok: true, awaitingChoice: true };
        }
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, '街灯が夜道を照らした。');
      }

      // 2. コンビニ（行動＋1）
      case 'convenience_store': {
        if (state.deck.length === 0) {
          return this.finalizeCardResolution(state, caster, cardDef, playedCards, '山札が0枚のためカードを引けなかった。');
        }
        const topCards = state.deck.slice(0, Math.min(3, state.deck.length));
        state.phase = 'AWAITING_CHOICE';
        state.pendingAction = {
          type: 'CONVENIENCE_PICK',
          actorId: caster.id,
          cardId,
          playedCards,
          topCards
        };
        this.emitEvent(state, {
          type: 'CARD_PLAYED_AWAIT',
          actorId: caster.id,
          actorName: caster.name,
          cardId,
          count: 1
        });
        return { ok: true, awaitingChoice: true };
      }

      // 3. 交番
      case 'police_box': {
        const hasMaigo = caster.hand.some(c => c.cardId === 'maigo');
        if (hasMaigo) {
          state.phase = 'AWAITING_CHOICE';
          state.pendingAction = {
            type: 'POLICE_BOX_CONFIRM',
            actorId: caster.id,
            cardId,
            playedCards
          };
          this.emitEvent(state, {
            type: 'CARD_PLAYED_AWAIT',
            actorId: caster.id,
            actorName: caster.name,
            cardId,
            count: 1
          });
          return { ok: true, awaitingChoice: true };
        }
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, '手札に「迷子」が無いためそのまま通過した。');
      }

      // 4. 灯台 / 5. 御守り
      case 'lighthouse':
      case 'amulet': {
        if (caster.hand.length >= 2) {
          state.phase = 'AWAITING_CHOICE';
          state.pendingAction = {
            type: cardId === 'lighthouse' ? 'LIGHTHOUSE_PICK' : 'AMULET_PICK',
            actorId: caster.id,
            cardId,
            playedCards
          };
          this.emitEvent(state, {
            type: 'CARD_PLAYED_AWAIT',
            actorId: caster.id,
            actorName: caster.name,
            cardId,
            count: 1
          });
          return { ok: true, awaitingChoice: true };
        }
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, '残り手札が1枚以下のため効果は発動しなかった。');
      }

      // 6. 着信（行動＋1）
      case 'incoming_call': {
        const leftNeighbor = this.getLeftActiveNeighbor(state, caster.seatIndex);
        let note = '';
        if (leftNeighbor && state.deck.length > 0) {
          const drawn = state.deck.shift();
          leftNeighbor.hand.push(drawn);
          note = `左隣の ${leftNeighbor.name} が山札から1枚引いた。`;
          this.addLog(state, `【着信】左隣の ${leftNeighbor.name} が山札からカードを1枚引いた。`, 'action');
        } else {
          note = '山札が無いため引けなかった。';
        }
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      // 7. 踏切（行動＋2）
      case 'railroad_crossing': {
        let note = '';
        if (state.deck.length > 0) {
          const drawn = state.deck.shift();
          caster.hand.push(drawn);
          const drawnDef = window.MAIGO_CARDS[drawn.cardId];
          if (drawn.cardId === 'maigo') {
            if (state.mode === 'oideoide' && caster.role === 'oideoide') {
              note = `山札から「迷子」を引いたが、「おいで、おいで」のため【BAD END】にならない！`;
              this.addLog(state, `【踏切】${caster.name} は「迷子」を引いたが、平然と遮断機の向こうへ歩み出た…！`, 'danger');
            } else {
              caster.forcedBadEndByRailroad = true;
              note = `山札から「迷子」を引いてしまった！【踏切】の効果により即座に【BAD END】！`;
              this.addLog(state, `【踏切】${caster.name} は山札から「迷子」を引いてしまった！！`, 'danger');
            }
          } else {
            note = `山札から1枚引いた（迷子ではなかった…セーフ！）。`;
            this.addLog(state, `【踏切】${caster.name} は山札から1枚引いた…「迷子」ではなかった！`, 'info');
          }
        } else {
          note = '山札が0枚のためカードを引かなかった。';
        }
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      // 8. 電話ボックス
      case 'phone_booth': {
        state.phase = 'AWAITING_CHOICE';
        state.pendingAction = {
          type: 'PHONE_BOOTH_TARGET',
          actorId: caster.id,
          cardId,
          playedCards
        };
        this.emitEvent(state, {
          type: 'CARD_PLAYED_AWAIT',
          actorId: caster.id,
          actorName: caster.name,
          cardId,
          count: 1
        });
        return { ok: true, awaitingChoice: true };
      }

      // 9. コインランドリー（行動＋1）
      case 'coin_laundry': {
        if (state.deck.length === 0) {
          return this.finalizeCardResolution(state, caster, cardDef, playedCards, '山札が0枚のため入れ替え効果は発動しなかった。');
        }
        state.phase = 'AWAITING_CHOICE';
        state.pendingAction = {
          type: 'COIN_LAUNDRY_TARGET',
          actorId: caster.id,
          cardId,
          playedCards
        };
        this.emitEvent(state, {
          type: 'CARD_PLAYED_AWAIT',
          actorId: caster.id,
          actorName: caster.name,
          cardId,
          count: 1
        });
        return { ok: true, awaitingChoice: true };
      }

      // 10. うわさ話［あかり］ & 15. うわさ話［くらやみ］
      case 'rumor_light':
      case 'rumor_dark': {
        const deckCopy = [...state.deck];
        const maigoIdx = state.deck.findIndex(c => c.cardId === 'maigo');
        let foundMaigo = false;
        if (maigoIdx !== -1) {
          foundMaigo = true;
          const [maigoCard] = state.deck.splice(maigoIdx, 1);
          state.deck = window.shuffleCards(state.deck);
          state.deck.unshift(maigoCard);
        } else {
          state.deck = window.shuffleCards(state.deck);
        }

        state.phase = 'AWAITING_CHOICE';
        state.pendingAction = {
          type: 'RUMOR_INSPECT',
          actorId: caster.id,
          cardId,
          playedCards,
          inspectedCards: deckCopy,
          foundMaigo
        };
        this.emitEvent(state, {
          type: 'CARD_PLAYED_AWAIT',
          actorId: caster.id,
          actorName: caster.name,
          cardId,
          count: 1
        });
        return { ok: true, awaitingChoice: true };
      }

      // 11. 振り向く
      case 'look_back': {
        if (state.discardPile.length === 0) {
          return this.finalizeCardResolution(state, caster, cardDef, playedCards, '捨て札が0枚のため回収できなかった。');
        }
        state.phase = 'AWAITING_CHOICE';
        state.pendingAction = {
          type: 'LOOK_BACK_PICK',
          actorId: caster.id,
          cardId,
          playedCards
        };
        this.emitEvent(state, {
          type: 'CARD_PLAYED_AWAIT',
          actorId: caster.id,
          actorName: caster.name,
          cardId,
          count: 1
        });
        return { ok: true, awaitingChoice: true };
      }

      // 12. 横断歩道
      case 'crosswalk': {
        const clockwisePlayers = this.getClockwiseActivePlayersFromLeft(state, caster.seatIndex);
        const holders = clockwisePlayers.filter(p => p.hand.some(c => c.cardId === 'maigo'));
        const raisedNames = holders.map(p => p.name);
        holders.forEach(p => {
          if (state.deck.length > 0) {
            p.hand.push(state.deck.shift());
          }
        });
        const note = raisedNames.length > 0
          ? `「迷子」を持つ ${raisedNames.join('・')} が手を上げ、山札から1枚引いた！`
          : '手札に「迷子」を持つプレイヤーはいなかった。';
        this.addLog(state, `【横断歩道】${note}`, 'action');
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note, { raisedNames });
      }

      // 13. 水族館
      case 'aquarium': {
        if (caster.hand.length >= 1) {
          state.phase = 'AWAITING_CHOICE';
          state.pendingAction = {
            type: 'AQUARIUM_PICK',
            actorId: caster.id,
            cardId,
            playedCards
          };
          this.emitEvent(state, {
            type: 'CARD_PLAYED_AWAIT',
            actorId: caster.id,
            actorName: caster.name,
            cardId,
            count: 1
          });
          return { ok: true, awaitingChoice: true };
        }
        // 自分の手札が0枚なら他プレイヤーだけでランダムシャッフル配布
        this.executeAquariumShuffle(state, caster, null);
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, '全員の手札から1枚ずつ集めてシャッフルし、配り直した！');
      }

      // 14. 壊れた街灯路
      case 'broken_streetlight': {
        const note = playedCards.length > 1
          ? `「壊れた街灯路」を ${playedCards.length}枚 まとめて場に出した！`
          : '「壊れた街灯路」を場に出した。';
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      // 16. 分かれ道
      case 'forked_road': {
        const others = this.getActivePlayers(state).filter(p => p.id !== caster.id);
        if (others.length === 0) {
          return this.finalizeCardResolution(state, caster, cardDef, playedCards, '対象となる他プレイヤーがいなかった。');
        }
        state.phase = 'AWAITING_CHOICE';
        state.pendingAction = {
          type: 'FORKED_ROAD_TARGET',
          actorId: caster.id,
          cardId,
          playedCards
        };
        this.emitEvent(state, {
          type: 'CARD_PLAYED_AWAIT',
          actorId: caster.id,
          actorName: caster.name,
          cardId,
          count: 1
        });
        return { ok: true, awaitingChoice: true };
      }

      // 17. 神社
      case 'shrine': {
        const active = this.getActivePlayers(state);
        const maxCards = Math.max(...active.map(p => p.hand.length));
        const candidates = active.filter(p => p.hand.length === maxCards);
        state.phase = 'AWAITING_CHOICE';
        state.pendingAction = {
          type: 'SHRINE_TARGET',
          actorId: caster.id,
          cardId,
          playedCards,
          candidateIds: candidates.map(c => c.id)
        };
        this.emitEvent(state, {
          type: 'CARD_PLAYED_AWAIT',
          actorId: caster.id,
          actorName: caster.name,
          cardId,
          count: 1
        });
        return { ok: true, awaitingChoice: true };
      }

      // 18. トンネル
      case 'tunnel': {
        const active = this.getActivePlayers(state);
        const targets = active.filter(p => {
          const lightCount = p.hand.filter(c => window.MAIGO_CARDS[c.cardId]?.category === 'light').length;
          return lightCount >= 2;
        });
        if (targets.length === 0) {
          return this.finalizeCardResolution(state, caster, cardDef, playedCards, '「あかり」を2枚以上持つプレイヤーはいなかった。');
        }
        state.phase = 'AWAITING_CHOICE';
        state.pendingAction = {
          type: 'TUNNEL_DISCARD',
          actorId: caster.id,
          cardId,
          playedCards,
          requiredPlayerIds: targets.map(p => p.id),
          selections: {}
        };
        this.emitEvent(state, {
          type: 'CARD_PLAYED_AWAIT',
          actorId: caster.id,
          actorName: caster.name,
          cardId,
          count: 1
        });
        return { ok: true, awaitingChoice: true };
      }

      // 19. 雨
      case 'rain': {
        const order = this.getClockwiseActivePlayersFromLeft(state, caster.seatIndex);
        let drawnCount = 0;
        order.forEach(p => {
          if (state.deck.length > 0) {
            p.hand.push(state.deck.shift());
            drawnCount++;
          }
        });
        const note = `左隣から時計回りに全員が山札からカードを1枚ずつ引いた（計${drawnCount}枚）。`;
        this.addLog(state, `【雨】${note}`, 'action');
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      // 20. 細い道
      case 'narrow_path': {
        let drawn = 0;
        for (let i = 0; i < 2; i++) {
          if (state.deck.length > 0) {
            caster.hand.push(state.deck.shift());
            drawn++;
          }
        }
        const note = `${caster.name} は山札からカードを ${drawn}枚 引いた。`;
        this.addLog(state, `【細い道】${note}`, 'action');
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      // 21. 川
      case 'river': {
        const participants = this.getActivePlayers(state).filter(p => p.hand.length >= 1);
        if (participants.length <= 1) {
          return this.finalizeCardResolution(state, caster, cardDef, playedCards, 'カードを渡せるプレイヤーが足りなかった。');
        }
        state.phase = 'AWAITING_CHOICE';
        state.pendingAction = {
          type: 'RIVER_PASS',
          actorId: caster.id,
          cardId,
          playedCards,
          requiredPlayerIds: participants.map(p => p.id),
          selections: {}
        };
        this.emitEvent(state, {
          type: 'CARD_PLAYED_AWAIT',
          actorId: caster.id,
          actorName: caster.name,
          cardId,
          count: 1
        });
        return { ok: true, awaitingChoice: true };
      }

      // 22. 海
      case 'sea': {
        const count = caster.hand.length;
        if (count > 0) {
          state.deck.push(...caster.hand);
          caster.hand = [];
          state.deck = window.shuffleCards(state.deck);
          for (let i = 0; i < count; i++) {
            if (state.deck.length > 0) {
              caster.hand.push(state.deck.shift());
            }
          }
        }
        const note = `${caster.name} は手札 ${count}枚 をすべて山札に戻して切り、${count}枚 引き直した！`;
        this.addLog(state, `【海】${note}`, 'action');
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      // 23. 公園
      case 'park': {
        let note = '山札が0枚のため引けなかった。';
        if (state.deck.length > 0) {
          caster.hand.push(state.deck.shift());
          note = `${caster.name} は山札からカードを1枚引いた。`;
        }
        this.addLog(state, `【公園】${note}`, 'action');
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      // 25. 黒崎さん
      case 'kurosaki': {
        state.phase = 'AWAITING_CHOICE';
        state.pendingAction = {
          type: 'KUROSAKI_TARGET',
          actorId: caster.id,
          cardId,
          playedCards
        };
        this.emitEvent(state, {
          type: 'CARD_PLAYED_AWAIT',
          actorId: caster.id,
          actorName: caster.name,
          cardId,
          count: 1
        });
        return { ok: true, awaitingChoice: true };
      }

      // 26. 神白さん（行動＋2）
      case 'kamishiro': {
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, '神白さんの加護により「行動＋2」を獲得！');
      }

      default:
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, '');
    }
  }

  // ==========================================================================
  // カード選択・ターゲット選択モーダルからの応答処理
  // ==========================================================================
  static submitPendingChoice(state, responderId, choiceData) {
    if (state.phase !== 'AWAITING_CHOICE' || !state.pendingAction) {
      return { ok: false, error: '選択待ちのアクションがありません' };
    }

    const pa = state.pendingAction;
    const caster = state.players.find(p => p.id === pa.actorId);
    const cardDef = window.MAIGO_CARDS[pa.cardId];
    const playedCards = pa.playedCards || [];

    switch (pa.type) {
      case 'BRIGHT_STREETLIGHT_RETURN': {
        if (responderId !== pa.actorId) return { ok: false };
        const shouldReturn = Boolean(choiceData.returnToHand);
        state.pendingAction = null;
        if (shouldReturn) {
          caster.hand.push(...playedCards);
          this.addLog(state, `【明るい街灯路】${caster.name} は手札が「迷子」のみだったため、「明るい街灯路」を手札に戻した！`, 'info');
          return this.finalizeCardResolution(state, caster, cardDef, [], '「明るい街灯路」を手札に戻し、【BAD END】を回避した！', { returnedToHand: true });
        } else {
          return this.finalizeCardResolution(state, caster, cardDef, playedCards, '「明るい街灯路」をそのまま捨て札にした。');
        }
      }

      case 'CONVENIENCE_PICK': {
        if (responderId !== pa.actorId) return { ok: false };
        const takeUid = choiceData.takeCardUid;
        const orderUids = choiceData.returnOrderUids || [];
        const topCards = pa.topCards || [];

        const taken = topCards.find(c => c.uid === takeUid) || topCards[0];
        if (!taken) return { ok: false };

        // 山札の上からtopCards分を一旦除去
        state.deck.splice(0, topCards.length);
        caster.hand.push(taken);

        const remaining = topCards.filter(c => c.uid !== taken.uid);
        // 指定された順番で山札の上に戻す
        const orderedRemaining = [];
        orderUids.forEach(uid => {
          const found = remaining.find(c => c.uid === uid);
          if (found && !orderedRemaining.includes(found)) orderedRemaining.push(found);
        });
        remaining.forEach(c => {
          if (!orderedRemaining.includes(c)) orderedRemaining.push(c);
        });

        state.deck.unshift(...orderedRemaining);
        state.pendingAction = null;
        this.addLog(state, `【コンビニ】${caster.name} は山札の上から3枚を見て1枚を手札に加え、残りを山札の上に戻した。`, 'action');
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, '山札の上3枚から1枚を入手し、残りの順番を整えた！');
      }

      case 'POLICE_BOX_CONFIRM': {
        if (responderId !== pa.actorId) return { ok: false };
        const putOnTop = Boolean(choiceData.putOnTop);
        state.pendingAction = null;
        if (putOnTop) {
          const mIdx = caster.hand.findIndex(c => c.cardId === 'maigo');
          if (mIdx !== -1) {
            const [maigoCard] = caster.hand.splice(mIdx, 1);
            state.deck.unshift(maigoCard);
            this.addLog(state, `【交番】${caster.name} は手札から「迷子」1枚を山札の一番上に置いた！`, 'danger');
            return this.finalizeCardResolution(state, caster, cardDef, playedCards, '手札の「迷子」1枚を山札の一番上に戻した！');
          }
        }
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, '「迷子」を山札に置かなかった。');
      }

      case 'LIGHTHOUSE_PICK':
      case 'AMULET_PICK': {
        if (responderId !== pa.actorId) return { ok: false };
        const chosen = caster.hand.find(c => c.uid === choiceData.cardUid) || caster.hand[0];
        state.pendingAction = null;
        if (chosen) {
          if (pa.type === 'LIGHTHOUSE_PICK') {
            caster.lighthouseCardUid = chosen.uid;
            caster.amuletCardUid = null;
            this.addLog(state, `【灯台】${caster.name} は次のプレイヤーに引かせるカードを1枚指定した。`, 'action');
          } else {
            caster.amuletCardUid = chosen.uid;
            caster.lighthouseCardUid = null;
            this.addLog(state, `【御守り】${caster.name} は次のプレイヤーに引かれないよう手札1枚を保護した。`, 'action');
          }
          // Q&A 3：手札が2枚以上あり効果を発動できた場合、現時点でBAD END条件でも次の手番プレイヤーが自分からカードを引いた後に判定する
          if (caster.hand.length >= 2 && this.isHandBadEndCondition(caster.hand)) {
            caster.deferredBadEndCheck = true;
          }
        }
        const label = pa.type === 'LIGHTHOUSE_PICK'
          ? '次に引かれるカード1枚を灯台の光でロックした！'
          : '手札のカード1枚を御守りで守護した！';
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, label);
      }

      case 'PHONE_BOOTH_TARGET': {
        if (responderId !== pa.actorId) return { ok: false };
        const target = state.players.find(p => p.id === choiceData.targetPlayerId && p.roundStatus === 'ACTIVE') || caster;
        state.pendingAction = null;
        let drawn = 0;
        for (let i = 0; i < 2; i++) {
          if (state.deck.length > 0) {
            target.hand.push(state.deck.shift());
            drawn++;
          }
        }
        const note = `${target.name} が山札からカードを ${drawn}枚 引いた！`;
        this.addLog(state, `【電話ボックス】${caster.name} は ${target.name} を選び、${note}`, 'action');
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      case 'COIN_LAUNDRY_TARGET': {
        if (responderId !== pa.actorId) return { ok: false };
        const target = state.players.find(p => p.id === choiceData.targetPlayerId && p.roundStatus === 'ACTIVE') || caster;
        if (target.hand.length === 0 || state.deck.length === 0) {
          state.pendingAction = null;
          return this.finalizeCardResolution(state, caster, cardDef, playedCards, `${target.name} の手札または山札が0枚のため入れ替えられなかった。`);
        }
        // 選ばれたプレイヤーが自分の手札から1枚選ぶステップへ
        state.pendingAction = {
          type: 'COIN_LAUNDRY_CARD',
          actorId: caster.id,
          targetPlayerId: target.id,
          cardId: pa.cardId,
          playedCards
        };
        return { ok: true, awaitingChoice: true };
      }

      case 'COIN_LAUNDRY_CARD': {
        if (responderId !== pa.targetPlayerId) return { ok: false };
        const target = state.players.find(p => p.id === pa.targetPlayerId);
        state.pendingAction = null;
        if (target && target.hand.length > 0 && state.deck.length > 0) {
          const hIdx = target.hand.findIndex(c => c.uid === choiceData.cardUid);
          const pickIdx = hIdx !== -1 ? hIdx : 0;
          const [handCard] = target.hand.splice(pickIdx, 1);
          const topDeckCard = state.deck.shift();
          state.deck.unshift(handCard);
          target.hand.push(topDeckCard);
          this.addLog(state, `【コインランドリー】${target.name} は手札1枚を山札の一番上のカードと入れ替えた！`, 'action');
          return this.finalizeCardResolution(state, caster, cardDef, playedCards, `${target.name} が手札1枚を山札の一番上と入れ替えた！`);
        }
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, '入れ替え不成立。');
      }

      case 'RUMOR_INSPECT': {
        if (responderId !== pa.actorId) return { ok: false };
        const foundMaigo = pa.foundMaigo;
        state.pendingAction = null;
        const note = foundMaigo
          ? '山札を確認してよく切り、「迷子」1枚を山札の一番上に置いた…！'
          : '山札を確認してよく切った（山札に「迷子」は無かった）。';
        this.addLog(state, `【${cardDef.name}】${caster.name} は${note}`, foundMaigo ? 'danger' : 'info');
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      case 'LOOK_BACK_PICK': {
        if (responderId !== pa.actorId) return { ok: false };
        const dIdx = state.discardPile.findIndex(c => c.uid === choiceData.cardUid);
        const pickIdx = dIdx !== -1 ? dIdx : 0;
        let note = '捨て札から回収できなかった。';
        if (state.discardPile.length > 0) {
          const [recovered] = state.discardPile.splice(pickIdx, 1);
          caster.hand.push(recovered);
          const recDef = window.MAIGO_CARDS[recovered.cardId];
          note = `捨て札から【${recDef ? recDef.name : 'カード'}】を手札に回収した！`;
          this.addLog(state, `【振り向く】${caster.name} は${note}`, 'action');
        }
        state.pendingAction = null;
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      case 'AQUARIUM_PICK': {
        if (responderId !== pa.actorId) return { ok: false };
        state.pendingAction = null;
        this.executeAquariumShuffle(state, caster, choiceData.cardUid);
        this.addLog(state, `【水族館】全員の手札から1枚ずつ集めてシャッフルし、1枚ずつ配り直した！`, 'action');
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, '全員から1枚ずつカードを集めてよく切り、配り直した！');
      }

      case 'FORKED_ROAD_TARGET': {
        if (responderId !== pa.actorId) return { ok: false };
        const others = this.getActivePlayers(state).filter(p => p.id !== caster.id);
        const target = others.find(p => p.id === choiceData.targetPlayerId) || others[0];
        state.pendingAction = null;
        if (target && state.deck.length > 0) {
          target.hand.push(state.deck.shift());
        }
        if (state.deck.length > 0) {
          caster.hand.push(state.deck.shift());
        }
        const note = `${target ? target.name : '相手'} が山札から1枚引き、続けて ${caster.name} も1枚引いた。`;
        this.addLog(state, `【分かれ道】${note}`, 'action');
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      case 'SHRINE_TARGET': {
        if (responderId !== pa.actorId) return { ok: false };
        const candidateIds = pa.candidateIds || [];
        const targetId = candidateIds.includes(choiceData.targetPlayerId) ? choiceData.targetPlayerId : candidateIds[0];
        const target = state.players.find(p => p.id === targetId) || caster;
        state.pendingAction = null;

        let movedCount = 0;
        this.getActivePlayers(state).forEach(p => {
          if (p.id === target.id) return;
          const kept = [];
          p.hand.forEach(c => {
            if (c.cardId === 'maigo') {
              target.hand.push(c);
              movedCount++;
            } else {
              kept.push(c);
            }
          });
          p.hand = kept;
        });

        const totalMaigoOnTarget = target.hand.filter(c => c.cardId === 'maigo').length;
        const note = `手札最多の ${target.name} の元へ全員の「迷子」が集められた！（移動:${movedCount}枚／所持迷子:${totalMaigoOnTarget}枚）`;
        this.addLog(state, `【神社】${note}`, 'danger');
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      case 'TUNNEL_DISCARD': {
        if (!pa.requiredPlayerIds.includes(responderId)) return { ok: false };
        const player = state.players.find(p => p.id === responderId);
        if (!player) return { ok: false };
        const chosen = player.hand.find(c => c.uid === choiceData.cardUid && window.MAIGO_CARDS[c.cardId]?.category === 'light')
          || player.hand.find(c => window.MAIGO_CARDS[c.cardId]?.category === 'light');
        if (!chosen) return { ok: false };

        pa.selections[responderId] = chosen.uid;

        // 全対象プレイヤーが選択完了したかチェック
        const allDone = pa.requiredPlayerIds.every(pid => Boolean(pa.selections[pid]));
        if (!allDone) {
          return { ok: true, awaitingChoice: true };
        }

        // 一斉に「あかり」カードを捨てる
        const discardedNames = [];
        pa.requiredPlayerIds.forEach(pid => {
          const p = state.players.find(pl => pl.id === pid);
          const uid = pa.selections[pid];
          if (p && uid) {
            const idx = p.hand.findIndex(c => c.uid === uid);
            if (idx !== -1) {
              const [removed] = p.hand.splice(idx, 1);
              state.discardPile.push(removed);
              discardedNames.push(p.name);
            }
          }
        });
        state.pendingAction = null;
        const note = `${discardedNames.join('・')} が手札から「あかり」カードを1枚ずつ捨てた！`;
        this.addLog(state, `【トンネル】${note}`, 'danger');
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      case 'RIVER_PASS': {
        if (!pa.requiredPlayerIds.includes(responderId)) return { ok: false };
        const player = state.players.find(p => p.id === responderId);
        if (!player) return { ok: false };
        const chosen = player.hand.find(c => c.uid === choiceData.cardUid) || player.hand[0];
        if (!chosen) return { ok: false };

        pa.selections[responderId] = chosen.uid;

        const allDone = pa.requiredPlayerIds.every(pid => Boolean(pa.selections[pid]));
        if (!allDone) {
          return { ok: true, awaitingChoice: true };
        }

        // 全員同時に左隣のアクティブプレイヤーへ渡す
        const transfers = [];
        pa.requiredPlayerIds.forEach(pid => {
          const giver = state.players.find(pl => pl.id === pid);
          const uid = pa.selections[pid];
          if (!giver || !uid) return;
          const idx = giver.hand.findIndex(c => c.uid === uid);
          if (idx !== -1) {
            const [cardObj] = giver.hand.splice(idx, 1);
            const receiver = this.getLeftActiveNeighbor(state, giver.seatIndex);
            if (receiver) {
              transfers.push({ receiver, cardObj });
            } else {
              giver.hand.push(cardObj);
            }
          }
        });
        transfers.forEach(t => {
          t.receiver.hand.push(t.cardObj);
        });

        state.pendingAction = null;
        const note = '全員が手札から1枚ずつ選び、左隣のプレイヤーへ同時に渡した！';
        this.addLog(state, `【川】${note}`, 'action');
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      case 'KUROSAKI_TARGET': {
        if (responderId !== pa.actorId) return { ok: false };
        const target = state.players.find(p => p.id === choiceData.targetPlayerId && p.roundStatus === 'ACTIVE') || caster;
        state.pendingAction = null;

        let passedCount = 0;
        if (target.id !== caster.id) {
          const kept = [];
          caster.hand.forEach(c => {
            if (c.cardId === 'maigo') {
              target.hand.push(c);
              passedCount++;
            } else {
              kept.push(c);
            }
          });
          caster.hand = kept;
        }
        const note = passedCount > 0
          ? `${caster.name} は手札の「迷子」${passedCount}枚すべてを ${target.name} に渡した！`
          : `${caster.name} は ${target.name} を選んだが、渡せる「迷子」を持っていなかった。`;
        this.addLog(state, `【黒崎さん】${note}`, passedCount > 0 ? 'danger' : 'info');
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, note);
      }

      default:
        state.pendingAction = null;
        return this.finalizeCardResolution(state, caster, cardDef, playedCards, '');
    }
  }

  static executeAquariumShuffle(state, caster, casterChosenUid) {
    const participants = [];
    const pool = [];

    this.getActivePlayers(state).forEach(p => {
      if (p.hand.length === 0) return;
      let pickIdx = 0;
      if (p.id === caster.id && casterChosenUid) {
        const foundIdx = p.hand.findIndex(c => c.uid === casterChosenUid);
        pickIdx = foundIdx !== -1 ? foundIdx : 0;
      } else {
        pickIdx = Math.floor(Math.random() * p.hand.length);
      }
      const [picked] = p.hand.splice(pickIdx, 1);
      participants.push(p);
      pool.push(picked);
    });

    const shuffled = window.shuffleCards(pool);
    participants.forEach((p, idx) => {
      p.hand.push(shuffled[idx]);
    });
  }

  // ==========================================================================
  // カード効果完了後の捨て札送り・END判定・追加行動処理
  // ==========================================================================
  static finalizeCardResolution(state, caster, cardDef, cardsToDiscard, resolutionNote = '', extraPayload = {}) {
    // 場に出したカードを捨て札へ置く（明るい街灯路で手札に戻した場合を除く）
    if (cardsToDiscard && cardsToDiscard.length > 0) {
      state.discardPile.push(...cardsToDiscard);
    }

    // Q&A 1 & 2：カード効果を使用し終えた時点で全アクティブプレイヤーのEND判定を行う
    const endEvents = [];
    // まずカード使用者本人から判定し、続いて左隣から時計回りに判定
    const checkOrder = [
      caster,
      ...this.getClockwiseActivePlayersFromLeft(state, caster.seatIndex).filter(p => p.id !== caster.id)
    ];

    checkOrder.forEach(p => {
      if (p.roundStatus === 'ACTIVE') {
        const ev = this.evaluatePlayerEnd(state, p, `【${cardDef.name}】の効果処理後`);
        if (ev) endEvents.push(ev);
      }
    });

    this.emitEvent(state, {
      type: 'CARD_RESOLVED',
      actorId: caster.id,
      actorName: caster.name,
      cardId: cardDef.id,
      count: Math.max(1, cardsToDiscard ? cardsToDiscard.length : 1),
      note: resolutionNote,
      extraPayload,
      endEvents
    });

    // ラウンド終了チェック
    if (this.checkAndHandleRoundCompletion(state, endEvents)) {
      return { ok: true, endEvents };
    }

    // Q&A 2：「行動＋1（または2）」のカードの効果を使用し終えた時点で【BAD END】（またはHAPPY END）になっていた場合、
    // カードの使用回数は増やせず、その時点で脱落（または勝ち抜け）し次の手番へ移る
    if (caster.roundStatus !== 'ACTIVE') {
      this.advanceToNextTurn(state);
      return { ok: true, endEvents };
    }

    // 生存している場合のみ、行動＋1 / 行動＋2 を加算
    if (cardDef.actionBonus > 0) {
      state.actionsRemaining += cardDef.actionBonus;
    }

    // もし灯台・御守りでBAD END判定を次手番に保留中の場合、または残り行動が0の場合は手番終了
    if (caster.deferredBadEndCheck || state.actionsRemaining <= 0) {
      this.advanceToNextTurn(state);
      return { ok: true, endEvents };
    }

    // まだ手札があり行動回数が残っている場合でも、出せるカード（迷子以外）が1枚もなければ自動手番終了
    const hasPlayableCard = caster.hand.some(c => window.MAIGO_CARDS[c.cardId]?.category !== 'maigo');
    if (!hasPlayableCard) {
      this.advanceToNextTurn(state);
      return { ok: true, endEvents };
    }

    state.phase = 'TURN_PLAY_CARD';
    return { ok: true, endEvents };
  }

  // 追加行動（行動＋1／＋2）を任意で終了する、または「おいで、おいで」が手札迷子のみでパスする
  static endTurnVoluntarily(state, actorId) {
    if (state.phase !== 'TURN_PLAY_CARD') return { ok: false, error: '現在は手番終了できません' };
    const turnPlayer = state.players[state.turnPlayerIndex];
    if (!turnPlayer || turnPlayer.id !== actorId) return { ok: false, error: 'あなたの手番ではありません' };

    const onlyMaigoInHand = this.isHandOnlyMaigo(turnPlayer.hand);
    const isOideWithOnlyMaigo = state.mode === 'oideoide' && turnPlayer.role === 'oideoide' && onlyMaigoInHand;

    if (!state.hasPlayedAtLeastOneCard && !isOideWithOnlyMaigo) {
      return { ok: false, error: '最低1枚はカードを場に出す必要があります' };
    }

    if (isOideWithOnlyMaigo && !state.hasPlayedAtLeastOneCard) {
      this.addLog(state, `${turnPlayer.name} はカードを場に出さずに手番を終えた…`, 'danger');
    } else {
      this.addLog(state, `${turnPlayer.name} は追加行動を行わず手番を終了した。`, 'info');
    }

    this.advanceToNextTurn(state);
    return { ok: true };
  }

  // 次のアクティブプレイヤーの手番へ進める
  static advanceToNextTurn(state) {
    if (state.phase === 'ROUND_END' || state.phase === 'GAME_OVER') return;
    const nextPlayer = this.getLeftActiveNeighbor(state, state.turnPlayerIndex);
    if (!nextPlayer) {
      this.checkAndHandleRoundCompletion(state, []);
      return;
    }
    state.turnPlayerIndex = nextPlayer.seatIndex;
    state.phase = 'TURN_DRAW_FROM_RIGHT';
    state.actionsRemaining = 1;
    state.hasPlayedAtLeastOneCard = false;
    state.pendingAction = null;
  }

  // ==========================================================================
  // プレイヤー個別のEND判定（HAPPY END / BAD END）
  // ==========================================================================
  static evaluatePlayerEnd(state, player, contextReason = '') {
    if (!player || player.roundStatus !== 'ACTIVE') return null;

    // 1. 踏切で迷子を引いた強制BAD END判定（おいで、おいで以外）
    if (player.forcedBadEndByRailroad) {
      player.forcedBadEndByRailroad = false;
      if (!(state.mode === 'oideoide' && player.role === 'oideoide')) {
        return this.applyBadEndToPlayer(state, player, '【踏切】の効果で山札から「迷子」を引いたため');
      }
    }

    // 2. 手札0枚 → HAPPY END（または「おいで、おいで」の手札完遂離脱）
    if (player.hand.length === 0) {
      player.lighthouseCardUid = null;
      player.amuletCardUid = null;
      player.deferredBadEndCheck = false;

      if (state.mode === 'oideoide' && player.role === 'oideoide') {
        player.roundStatus = 'OIDE_FINISHED';
        player.roundEndType = 'OIDE_FINISHED';
        this.addLog(state, `${player.name} は手札をすべて出し切り、ラウンドから抜けた。`, 'info');
        return {
          endType: 'OIDE_FINISHED',
          playerId: player.id,
          playerName: player.name,
          newLife: player.life
        };
      } else {
        player.roundStatus = 'HAPPY_END';
        player.roundEndType = 'HAPPY_END';
        player.life = Math.min(7, player.life + 2);
        this.addLog(state, `★【HAPPY END】${player.name} が手札をすべて出し切り無事帰宅！（ライフ＋2 → ${player.life}）`, 'happy');
        return {
          endType: 'HAPPY_END',
          playerId: player.id,
          playerName: player.name,
          newLife: player.life
        };
      }
    }

    // 3. 灯台・御守りによる次手番引かれ後までのBAD END判定保留チェック（Q&A 3）
    if (player.deferredBadEndCheck) {
      return null;
    }

    // 4. 手札が「迷子のみ」または「迷子とくらやみのみ」 → BAD END（おいで、おいで以外）
    if (this.isHandBadEndCondition(player.hand)) {
      if (state.mode === 'oideoide' && player.role === 'oideoide') {
        // 「おいで、おいで」はBAD ENDにならない
        return null;
      }
      const onlyMaigo = this.isHandOnlyMaigo(player.hand);
      const reason = onlyMaigo
        ? `${contextReason}、手札が「迷子」のみになったため`
        : `${contextReason}、手札が「迷子とくらやみ」のみ（あかり0枚）になったため`;
      return this.applyBadEndToPlayer(state, player, reason);
    }

    return null;
  }

  static applyBadEndToPlayer(state, player, reason) {
    player.roundStatus = 'BAD_END';
    player.roundEndType = 'BAD_END';
    player.life = Math.max(0, player.life - 3);
    player.lighthouseCardUid = null;
    player.amuletCardUid = null;
    player.deferredBadEndCheck = false;

    const revealedCards = [...player.hand];
    const maigoCards = [];
    const otherCards = [];

    player.hand.forEach(c => {
      if (c.cardId === 'maigo') maigoCards.push(c);
      else otherCards.push(c);
    });
    player.hand = [];

    // 残りのカードは捨て札とし、「迷子」カードは山札の一番上に置く
    state.discardPile.push(...otherCards);
    state.deck.unshift(...maigoCards);

    const revealedNames = revealedCards.map(c => window.MAIGO_CARDS[c.cardId]?.name || c.cardId).join('・');
    this.addLog(
      state,
      `💀【BAD END】${player.name} が脱落！（ライフ−3 → ${player.life}）公開手札：[${revealedNames}]（迷子${maigoCards.length}枚を山札の一番上へ）`,
      'danger'
    );

    return {
      endType: 'BAD_END',
      playerId: player.id,
      playerName: player.name,
      reason,
      revealedCards,
      newLife: player.life
    };
  }

  // ==========================================================================
  // ラウンド終了条件判定＆ライフ精算
  // ==========================================================================
  static checkAndHandleRoundCompletion(state, endEvents = []) {
    const activeAll = this.getActivePlayers(state);

    if (state.mode === 'normal') {
      if (activeAll.length === 1) {
        const lastPlayer = activeAll[0];
        lastPlayer.roundStatus = 'NORMAL_END';
        lastPlayer.roundEndType = 'NORMAL_END';
        lastPlayer.life = Math.max(0, lastPlayer.life - 1);
        this.addLog(state, `【NORMAL END】最後の1人となった ${lastPlayer.name} は夜明けまで彷徨った…（ライフ−1 → ${lastPlayer.life}）`, 'info');
        endEvents.push({
          endType: 'NORMAL_END',
          playerId: lastPlayer.id,
          playerName: lastPlayer.name,
          newLife: lastPlayer.life
        });
        this.finishRound(state);
        return true;
      } else if (activeAll.length === 0) {
        this.finishRound(state);
        return true;
      }
      return false;
    }

    // 特殊ルール「おいで、おいで」モードの終了判定
    const activeNormals = activeAll.filter(p => p.role !== 'oideoide');

    if (activeAll.length === 1) {
      const lastPlayer = activeAll[0];
      if (lastPlayer.role === 'oideoide') {
        // 最後の1人が「おいで、おいで」→ ライフ変化なし、ラウンド終了
        lastPlayer.roundStatus = 'OIDE_LAST';
        lastPlayer.roundEndType = 'OIDE_LAST';
      } else {
        // 「おいで、おいで」が先に手札を出し切って抜けた後、通常プレイヤーが最後の1人になった場合 → NORMAL END（ライフ−1）
        lastPlayer.roundStatus = 'NORMAL_END';
        lastPlayer.roundEndType = 'NORMAL_END';
        lastPlayer.life = Math.max(0, lastPlayer.life - 1);
        this.addLog(state, `【NORMAL END】最後の1人となった ${lastPlayer.name} はライフ−1（残り ${lastPlayer.life}）。`, 'info');
        endEvents.push({
          endType: 'NORMAL_END',
          playerId: lastPlayer.id,
          playerName: lastPlayer.name,
          newLife: lastPlayer.life
        });
      }
      this.finishRound(state);
      return true;
    }

    // 「おいで、おいで」以外の全員のENDが決まったらラウンド終了
    if (activeNormals.length === 0) {
      activeAll.forEach(p => {
        if (p.role === 'oideoide') {
          p.roundStatus = 'OIDE_LAST';
          p.roundEndType = 'OIDE_LAST';
        }
      });
      this.finishRound(state);
      return true;
    }

    return false;
  }

  static finishRound(state) {
    state.phase = 'ROUND_END';
    state.pendingAction = null;

    if (state.mode === 'oideoide') {
      state.oideRevealed = true;
      const oidePlayer = state.players.find(p => p.role === 'oideoide');
      if (oidePlayer) {
        const badEndVictims = state.players.filter(p => p.role !== 'oideoide' && p.roundEndType === 'BAD_END');
        const badEndCount = badEndVictims.length;
        const beforeLife = oidePlayer.life;
        // まずライフを-1し、その後BAD ENDとなったプレイヤー1人につきライフを+1
        const afterMinus = Math.max(0, oidePlayer.life - 1);
        const finalLife = Math.min(7, afterMinus + badEndCount);
        oidePlayer.life = finalLife;
        const netDelta = finalLife - beforeLife;

        state.oideRoundSummary = {
          oidePlayerId: oidePlayer.id,
          oidePlayerName: oidePlayer.name,
          badEndCount,
          beforeLife,
          finalLife,
          netDelta
        };

        this.addLog(
          state,
          `👁【正体公開】「おいで、おいで」は ${oidePlayer.name} だった！（基本−1 ＋ BAD END ${badEndCount}人×1 → ライフ ${beforeLife} ⇒ ${finalLife}）`,
          'danger'
        );
      }
    }

    this.addLog(state, `━━━ 第 ${state.currentRound} ラウンド終了 ━━━`, 'system');
  }

  // 次のラウンドへ進む、または最終結果へ
  static proceedFromRoundEnd(state) {
    if (state.phase !== 'ROUND_END') return { ok: false };
    if (state.currentRound >= state.totalRounds) {
      state.phase = 'GAME_OVER';
      state.status = 'GAME_OVER';
      this.addLog(state, `━━━ 全 ${state.totalRounds} ラウンド終了！ 最終結果発表 ━━━`, 'happy');
      return { ok: true, gameOver: true };
    }
    this.setupRound(state, state.currentRound + 1);
    return { ok: true, gameOver: false };
  }

  // ==========================================================================
  // インテリジェントCPU思考エンジン
  // ==========================================================================
  static computeCpuNextMove(state) {
    if (!state || state.phase === 'ROUND_END' || state.phase === 'GAME_OVER') return null;

    // 1. 選択待ち（AWAITING_CHOICE）にCPUが含まれているかチェック
    if (state.phase === 'AWAITING_CHOICE' && state.pendingAction) {
      const pa = state.pendingAction;

      // 同時選択系（トンネル・川）
      if (pa.type === 'TUNNEL_DISCARD' || pa.type === 'RIVER_PASS') {
        for (const pid of pa.requiredPlayerIds) {
          if (!pa.selections[pid]) {
            const p = state.players.find(pl => pl.id === pid);
            if (p && p.isCpu) {
              return {
                actionType: 'SUBMIT_CHOICE',
                playerId: p.id,
                choiceData: this.decideCpuModalChoice(state, p, pa)
              };
            }
          }
        }
        return null;
      }

      // コインランドリーの手札選択（対象プレイヤーが選ぶ）
      if (pa.type === 'COIN_LAUNDRY_CARD') {
        const target = state.players.find(p => p.id === pa.targetPlayerId);
        if (target && target.isCpu) {
          return {
            actionType: 'SUBMIT_CHOICE',
            playerId: target.id,
            choiceData: this.decideCpuModalChoice(state, target, pa)
          };
        }
        return null;
      }

      // 通常単一アクター選択
      const actor = state.players.find(p => p.id === pa.actorId);
      if (actor && actor.isCpu) {
        return {
          actionType: 'SUBMIT_CHOICE',
          playerId: actor.id,
          choiceData: this.decideCpuModalChoice(state, actor, pa)
        };
      }
      return null;
    }

    // 2. 通常手番プレイヤーがCPUかチェック
    const turnPlayer = state.players[state.turnPlayerIndex];
    if (!turnPlayer || !turnPlayer.isCpu || turnPlayer.roundStatus !== 'ACTIVE') return null;

    if (state.phase === 'TURN_DRAW_FROM_RIGHT') {
      const rightNeighbor = this.getRightActiveNeighbor(state, state.turnPlayerIndex);
      let chosenUid = null;
      if (rightNeighbor && rightNeighbor.hand.length > 0) {
        let candidates = [...rightNeighbor.hand];
        if (rightNeighbor.lighthouseCardUid) {
          const forced = candidates.find(c => c.uid === rightNeighbor.lighthouseCardUid);
          if (forced) candidates = [forced];
        } else if (rightNeighbor.amuletCardUid && candidates.length >= 2) {
          candidates = candidates.filter(c => c.uid !== rightNeighbor.amuletCardUid);
        }
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        chosenUid = picked ? picked.uid : null;
      }
      return {
        actionType: 'DRAW_FROM_RIGHT',
        playerId: turnPlayer.id,
        targetCardUid: chosenUid
      };
    }

    if (state.phase === 'TURN_PLAY_CARD') {
      return this.decideCpuCardPlay(state, turnPlayer);
    }

    return null;
  }

  static decideCpuCardPlay(state, cpu) {
    const isOide = state.mode === 'oideoide' && cpu.role === 'oideoide';
    const playable = cpu.hand.filter(c => window.MAIGO_CARDS[c.cardId]?.category !== 'maigo');

    // おいで、おいで役で手札が迷子のみならパス
    if (playable.length === 0) {
      return {
        actionType: 'END_TURN',
        playerId: cpu.id
      };
    }

    // 壊れた街灯路が複数枚あればまとめて出す候補として準備
    const brokenList = playable.filter(c => c.cardId === 'broken_streetlight');

    // 各カードを場に出した後に自分が即BAD ENDになるかをシミュレーション
    const safeCards = [];
    const riskyButRecoverable = [];
    const unsafeCards = [];

    playable.forEach(c => {
      const def = window.MAIGO_CARDS[c.cardId];
      const remaining = cpu.hand.filter(h => h.uid !== c.uid);
      const wouldBeBad = !isOide && this.isHandBadEndCondition(remaining);

      if (!wouldBeBad) {
        safeCards.push(c);
      } else {
        // 出した直後はBAD END手札だが、効果で助かるカードか？
        const canRecover =
          (c.cardId === 'bright_streetlight' && this.isHandOnlyMaigo(remaining)) ||
          (c.cardId === 'police_box' && remaining.filter(r => r.cardId === 'maigo').length === 1) ||
          (c.cardId === 'kurosaki') ||
          ((c.cardId === 'lighthouse' || c.cardId === 'amulet') && remaining.length >= 2) ||
          (c.cardId === 'look_back' && state.discardPile.some(d => window.MAIGO_CARDS[d.cardId]?.category === 'light')) ||
          (c.cardId === 'convenience_store' || c.cardId === 'sea' || c.cardId === 'coin_laundry' || c.cardId === 'aquarium');

        if (canRecover) {
          riskyButRecoverable.push(c);
        } else {
          unsafeCards.push(c);
        }
      }
    });

    // すでに1枚以上出していて、安全なカードが無い場合は追加行動を終了する
    if (state.hasPlayedAtLeastOneCard && safeCards.length === 0 && riskyButRecoverable.length === 0) {
      return {
        actionType: 'END_TURN',
        playerId: cpu.id
      };
    }

    const pool = safeCards.length > 0 ? safeCards : (riskyButRecoverable.length > 0 ? riskyButRecoverable : unsafeCards);

    // 優先度スコアリング
    const hasMaigo = cpu.hand.some(c => c.cardId === 'maigo');
    let bestCard = pool[0];
    let bestScore = -999;

    pool.forEach(c => {
      const def = window.MAIGO_CARDS[c.cardId];
      let score = 0;
      if (def.actionBonus > 0) score += 25 * def.actionBonus;
      if (c.cardId === 'broken_streetlight' && brokenList.length >= 2) score += 35;
      if (hasMaigo && (c.cardId === 'police_box' || c.cardId === 'kurosaki')) score += 60;
      if (hasMaigo && c.cardId === 'lighthouse' && cpu.hand.length >= 3) score += 40;
      if (!isOide && c.cardId === 'railroad_crossing' && safeCards.length > 1) score -= 20; // 踏切は少し慎重に
      if (isOide && (c.cardId === 'tunnel' || c.cardId === 'rumor_light' || c.cardId === 'rumor_dark' || c.cardId === 'shrine')) {
        score += 45;
      }
      // くらやみカードを優先的に消化して「あかり」を温存する定石
      if (!isOide && def.category === 'dark') score += 15;

      if (score > bestScore) {
        bestScore = score;
        bestCard = c;
      }
    });

    if (bestCard.cardId === 'broken_streetlight' && brokenList.length >= 2) {
      return {
        actionType: 'PLAY_CARD',
        playerId: cpu.id,
        cardUids: brokenList.map(b => b.uid)
      };
    }

    return {
      actionType: 'PLAY_CARD',
      playerId: cpu.id,
      cardUids: [bestCard.uid]
    };
  }

  static decideCpuModalChoice(state, cpu, pa) {
    const isOide = state.mode === 'oideoide' && cpu.role === 'oideoide';

    switch (pa.type) {
      case 'BRIGHT_STREETLIGHT_RETURN':
        return { returnToHand: !isOide };

      case 'CONVENIENCE_PICK': {
        const top = pa.topCards || [];
        // あかりカードを最優先で取得し、迷子があれば山札の一番上へ置く
        const sorted = [...top].sort((a, b) => {
          const catA = window.MAIGO_CARDS[a.cardId]?.category;
          const catB = window.MAIGO_CARDS[b.cardId]?.category;
          const score = cat => (cat === 'light' ? 3 : (cat === 'dark' ? 2 : 1));
          return score(catB) - score(catA);
        });
        const take = sorted[0];
        const rest = sorted.slice(1);
        return {
          takeCardUid: take ? take.uid : null,
          returnOrderUids: rest.map(r => r.uid)
        };
      }

      case 'POLICE_BOX_CONFIRM':
        return { putOnTop: true };

      case 'LIGHTHOUSE_PICK': {
        // 迷子があれば迷子を相手に引かせる、なければくらやみを引かせる
        const maigo = cpu.hand.find(c => c.cardId === 'maigo');
        const dark = cpu.hand.find(c => window.MAIGO_CARDS[c.cardId]?.category === 'dark');
        const pick = maigo || dark || cpu.hand[0];
        return { cardUid: pick ? pick.uid : null };
      }

      case 'AMULET_PICK': {
        // あかりカードを守る
        const light = cpu.hand.find(c => window.MAIGO_CARDS[c.cardId]?.category === 'light');
        const pick = light || cpu.hand[0];
        return { cardUid: pick ? pick.uid : null };
      }

      case 'PHONE_BOOTH_TARGET': {
        // 手札が少ない他プレイヤーに2枚引かせてHAPPY ENDを阻止する
        const others = this.getActivePlayers(state).filter(p => p.id !== cpu.id);
        others.sort((a, b) => a.hand.length - b.hand.length);
        const target = others[0] || cpu;
        return { targetPlayerId: target.id };
      }

      case 'COIN_LAUNDRY_TARGET': {
        const hasMaigo = cpu.hand.some(c => c.cardId === 'maigo');
        if (hasMaigo) return { targetPlayerId: cpu.id };
        const others = this.getActivePlayers(state).filter(p => p.id !== cpu.id);
        const target = others[0] || cpu;
        return { targetPlayerId: target.id };
      }

      case 'COIN_LAUNDRY_CARD': {
        const maigo = cpu.hand.find(c => c.cardId === 'maigo');
        const dark = cpu.hand.find(c => window.MAIGO_CARDS[c.cardId]?.category === 'dark');
        const pick = maigo || dark || cpu.hand[0];
        return { cardUid: pick ? pick.uid : null };
      }

      case 'RUMOR_INSPECT':
        return { confirmed: true };

      case 'LOOK_BACK_PICK': {
        // 捨て札から「あかり」（特に神白さん・コンビニ・明るい街灯路）を優先回収
        const lights = state.discardPile.filter(c => window.MAIGO_CARDS[c.cardId]?.category === 'light');
        const pick = lights[lights.length - 1] || state.discardPile[state.discardPile.length - 1];
        return { cardUid: pick ? pick.uid : null };
      }

      case 'AQUARIUM_PICK':
      case 'RIVER_PASS': {
        const maigo = cpu.hand.find(c => c.cardId === 'maigo');
        const dark = cpu.hand.find(c => window.MAIGO_CARDS[c.cardId]?.category === 'dark');
        const pick = maigo || dark || cpu.hand[0];
        return { cardUid: pick ? pick.uid : null };
      }

      case 'FORKED_ROAD_TARGET':
      case 'KUROSAKI_TARGET': {
        const others = this.getActivePlayers(state).filter(p => p.id !== cpu.id);
        others.sort((a, b) => a.hand.length - b.hand.length);
        const target = others[0] || cpu;
        return { targetPlayerId: target.id };
      }

      case 'SHRINE_TARGET': {
        const cands = pa.candidateIds || [];
        const nonSelf = cands.find(id => id !== cpu.id);
        return { targetPlayerId: nonSelf || cands[0] };
      }

      case 'TUNNEL_DISCARD': {
        const lights = cpu.hand.filter(c => window.MAIGO_CARDS[c.cardId]?.category === 'light');
        return { cardUid: lights[0] ? lights[0].uid : null };
      }

      default:
        return {};
    }
  }
}

window.MaigoGameEngine = MaigoGameEngine;
