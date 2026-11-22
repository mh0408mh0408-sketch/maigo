// ============================================================================
// ボードゲーム『迷子 - MAIGO -』 全カード定義・キャラクター定義・SVGアートワーク
// ============================================================================

window.MAIGO_CARDS = {
  // --------------------------------------------------------------------------
  // 【あかりカード（基本15枚）】
  // --------------------------------------------------------------------------
  bright_streetlight: {
    id: 'bright_streetlight',
    number: 1,
    name: '明るい街灯路',
    kana: 'あかるいがいとうろ',
    category: 'light',
    categoryLabel: 'あかり',
    baseCount: 3,
    actionBonus: 0,
    description: 'このカードを使用した時にあなたの手札が「迷子」のみの場合、このカードを手札に戻してもよい。',
    flavor: 'ジジ…と音を立てて灯るオレンジ色の光。まだ、道は続いている。',
    effectSummary: '手札が迷子のみなら手札に戻せる',
    cutinTheme: 'streetlight_on',
    cutinText: '「街灯がともっている…まだ引き返せる」'
  },
  convenience_store: {
    id: 'convenience_store',
    number: 2,
    name: 'コンビニ',
    kana: 'こんびに',
    category: 'light',
    categoryLabel: 'あかり',
    baseCount: 1,
    actionBonus: 1,
    description: '山札の上から3枚を見て、好きなカードを1枚手札に加える。残りは好きな順番で山札の一番上に戻す。',
    flavor: '闇夜に浮かぶ24時間営業の白い光。ガラス越しに人影が見える。',
    effectSummary: '山札上3枚から1枚入手＋残りを順番操作 / 行動＋1',
    cutinTheme: 'convenience',
    cutinText: '「遠くに24時間営業の看板が見える…！」'
  },
  police_box: {
    id: 'police_box',
    number: 3,
    name: '交番',
    kana: 'こうばん',
    category: 'light',
    categoryLabel: 'あかり',
    baseCount: 1,
    actionBonus: 0,
    description: 'あなたの手札に「迷子」がある場合、手札から「迷子」1枚を山札の一番上に置いてもよい。',
    flavor: '赤いランプが夜霧を照らす。道を尋ねれば、あの子は離れていく。',
    effectSummary: '手札の「迷子」1枚を山札の一番上に置ける',
    cutinTheme: 'police_box',
    cutinText: '「赤いランプだ…！ 迷子を山札の上へ戻した」'
  },
  lighthouse: {
    id: 'lighthouse',
    number: 4,
    name: '灯台',
    kana: 'とうだい',
    category: 'light',
    categoryLabel: 'あかり',
    baseCount: 1,
    actionBonus: 0,
    description: '自分の手札から1枚選ぶ。次の手番のプレイヤーがあなたからカードを引く際、あなたが選んだカードを相手に引かせる。（手札が1枚の時、この効果は発動しない）',
    flavor: '闇を裂く一条の閃光。照らされたものからは目を逸らせない。',
    effectSummary: '次に引かれる自分の手札1枚を強制指定',
    cutinTheme: 'lighthouse',
    cutinText: '「旋回する閃光が、渡すべき1枚を照らし出す――」'
  },
  amulet: {
    id: 'amulet',
    number: 5,
    name: '御守り',
    kana: 'おまもり',
    category: 'light',
    categoryLabel: 'あかり',
    baseCount: 1,
    actionBonus: 0,
    description: '自分の手札から1枚選ぶ。次の手番のプレイヤーがあなたからカードを引く際、相手はそのカードを引けなくなる。（手札が1枚の時、この効果は発動しない）',
    flavor: '古い社で授かった錦の袋。かすかに温かい。',
    effectSummary: '自分の手札1枚を次に引かれないよう保護',
    cutinTheme: 'amulet',
    cutinText: '「これだけは渡せない…御守りが光を放つ」'
  },
  incoming_call: {
    id: 'incoming_call',
    number: 6,
    name: '着信',
    kana: 'ちゃくしん',
    category: 'light',
    categoryLabel: 'あかり',
    baseCount: 1,
    actionBonus: 1,
    description: 'あなたの左隣のプレイヤーは山札からカードを1枚引く。',
    flavor: '震える画面。「非通知設定」。出たのは隣を歩いていたはずの誰か。',
    effectSummary: '左隣のプレイヤーに山札から1枚引かせる / 行動＋1',
    cutinTheme: 'incoming_call',
    cutinText: '「プルルルル…！ 闇の中で着信音が鳴り響く」'
  },
  railroad_crossing: {
    id: 'railroad_crossing',
    number: 7,
    name: '踏切',
    kana: 'ふみきり',
    category: 'light',
    categoryLabel: 'あかり',
    baseCount: 1,
    actionBonus: 2,
    description: '山札からカードを1枚引く。その時に「迷子」を引いた場合、あなたは手札の内容に関わらず【BAD END】となる。',
    flavor: 'カン、カン、カン、カン…遮断機の向こうで、誰かが手招きしている。',
    effectSummary: '山札から1枚引く（迷子を引いたら即BAD END！）/ 行動＋2',
    cutinTheme: 'railroad',
    cutinText: '「カンカンカンカン…！ 遮断機が降りていく――！」'
  },
  phone_booth: {
    id: 'phone_booth',
    number: 8,
    name: '電話ボックス',
    kana: 'でんわぼっくす',
    category: 'light',
    categoryLabel: 'あかり',
    baseCount: 1,
    actionBonus: 0,
    description: 'プレイヤーを1人選ぶ。（自身も可）選ばれたプレイヤーは山札からカードを2枚引く。',
    flavor: '曇ったガラスの箱。受話器からは砂嵐と、遠くの足音だけが聞こえる。',
    effectSummary: '選んだプレイヤー1人に山札から2枚引かせる',
    cutinTheme: 'phone_booth',
    cutinText: '「受話器の向こうから、誰かの呼ぶ声がする…」'
  },
  coin_laundry: {
    id: 'coin_laundry',
    number: 9,
    name: 'コインランドリー',
    kana: 'こいんらんどりー',
    category: 'light',
    categoryLabel: 'あかり',
    baseCount: 1,
    actionBonus: 1,
    description: 'プレイヤーを1人選ぶ。（自身も可）選ばれた人は手札からカードを1枚選び、山札の一番上のカードと入れ替える。',
    flavor: '誰もいない深夜の店内。ドラム式洗濯機だけが虚しく回り続けている。',
    effectSummary: '選んだ1人が手札1枚を山札の一番上と入れ替える / 行動＋1',
    cutinTheme: 'coin_laundry',
    cutinText: '「ゴォォ…回転するドラムの中で運命が入れ替わる」'
  },
  rumor_light: {
    id: 'rumor_light',
    number: 10,
    name: 'うわさ話［あかり］',
    kana: 'うわさばなし',
    category: 'light',
    categoryLabel: 'あかり',
    baseCount: 1,
    actionBonus: 1,
    description: '山札を確認し、「迷子」があれば1枚取り、山札をよく切る。その後、取った「迷子」を山札の一番上に置く。',
    flavor: '「ねえ知ってる？ あの角を曲がるとね、帰れなくなるんだって」',
    effectSummary: '山札から「迷子」を探し山札の一番上に置く / 行動＋1',
    cutinTheme: 'rumor',
    cutinText: '「ねえ、聞いた…？ 次に引くカードに“あの子”がいるって…」'
  },
  look_back: {
    id: 'look_back',
    number: 11,
    name: '振り向く',
    kana: 'ふりむく',
    category: 'light',
    categoryLabel: 'あかり',
    baseCount: 1,
    actionBonus: 0,
    description: '捨て札から好きなカードを1枚選び、あなたの手札に加える。',
    flavor: '背後に気配を感じて振り返る。来たはずの道に、見覚えのあるものが落ちていた。',
    effectSummary: '捨て札から好きなカードを1枚手札に回収',
    cutinTheme: 'look_back',
    cutinText: '「背後で音がした…来た道を振り返り、捨て札を拾い上げる」'
  },
  crosswalk: {
    id: 'crosswalk',
    number: 12,
    name: '横断歩道',
    kana: 'おうだんほどう',
    category: 'light',
    categoryLabel: 'あかり',
    baseCount: 1,
    actionBonus: 0,
    description: '手札に「迷子」があるプレイヤーは手を上げる。その後、手を上げたプレイヤーは山札からカードを1枚引く。（あなたの左隣の人から順に、時計回りに引く）',
    flavor: '点滅する青信号。白い線の上を渡る時、連れている影が浮かび上がる。',
    effectSummary: '「迷子」を持つ全員が手を上げ、山札から1枚引く',
    cutinTheme: 'crosswalk',
    cutinText: '「信号が点滅する――『迷子』を抱えている者は手を上げろ！」'
  },
  aquarium: {
    id: 'aquarium',
    number: 13,
    name: '水族館',
    kana: 'すいぞくかん',
    category: 'light',
    categoryLabel: 'あかり',
    baseCount: 1,
    actionBonus: 0,
    description: 'あなたは手札からカードを1枚選び、他のプレイヤーは手札からランダムにカードを1枚選ぶ。選ばれたカードを全て裏向きで集めてよく切り、全員に1枚ずつ配りなおす。',
    flavor: '青い水槽の揺らめき。ガラスに映る自分たちの顔が、水底で混ざり合う。',
    effectSummary: '全員から1枚ずつカードを集めてシャッフルし配り直す',
    cutinTheme: 'aquarium',
    cutinText: '「深い蒼のゆらめき…集められた手札が水底で混ざり合う」'
  },

  // --------------------------------------------------------------------------
  // 【くらやみカード（基本14枚）】
  // --------------------------------------------------------------------------
  broken_streetlight: {
    id: 'broken_streetlight',
    number: 14,
    name: '壊れた街灯路',
    kana: 'こわれたがいとうろ',
    category: 'dark',
    categoryLabel: 'くらやみ',
    baseCount: 5,
    actionBonus: 0,
    description: '「壊れた街灯路」は、2枚以上まとめて出すことができる。（1枚でも出すことができる）',
    flavor: 'バチッ…と火花を散らして砕けた電球。足元から闇が這い上がる。',
    effectSummary: '複数枚まとめて場に出すことができる',
    cutinTheme: 'streetlight_off',
    cutinText: '「バチバチッ…！ 街灯が砕け、通りが闇に沈んでいく」'
  },
  rumor_dark: {
    id: 'rumor_dark',
    number: 15,
    name: 'うわさ話［くらやみ］',
    kana: 'うわさばなし',
    category: 'dark',
    categoryLabel: 'くらやみ',
    baseCount: 1,
    actionBonus: 0,
    description: '山札を確認し、「迷子」があれば1枚取り、山札をよく切る。その後、取った「迷子」を山札の一番上に置く。',
    flavor: '暗がりから聞こえるひそひそ声。「次はあの子が連れていかれるよ…」',
    effectSummary: '山札から「迷子」を探し山札の一番上に置く',
    cutinTheme: 'rumor',
    cutinText: '「ひそひそ…山札の一番上に『迷子』が呼び寄せられた…」'
  },
  forked_road: {
    id: 'forked_road',
    number: 16,
    name: '分かれ道',
    kana: 'わかれみち',
    category: 'dark',
    categoryLabel: 'くらやみ',
    baseCount: 1,
    actionBonus: 0,
    description: '自分以外のプレイヤーを1人選ぶ。選ばれたプレイヤーは山札からカードを1枚引き、その後あなたも山札からカードを1枚引く。',
    flavor: '右か左か。霧に霞む標識は、どちらも見知らぬ町を指している。',
    effectSummary: '選んだ相手1人と自分が順に山札から1枚ずつ引く',
    cutinTheme: 'forked_road',
    cutinText: '「霧の分かれ道…選んだ相手と自分が闇へ一歩踏み出す」'
  },
  shrine: {
    id: 'shrine',
    number: 17,
    name: '神社',
    kana: 'じんじゃ',
    category: 'dark',
    categoryLabel: 'くらやみ',
    baseCount: 1,
    actionBonus: 0,
    description: '手札が一番多いプレイヤーを1人選ぶ。全てのプレイヤーの手札にある「迷子」を、選ばれたプレイヤーの手札に移す。',
    flavor: '朱色の鳥居の奥、鈴の音が鳴る。迷える魂はもっとも荷の重い者へ集う。',
    effectSummary: '手札最多の1人に、全員の「迷子」をすべて押し付ける！',
    cutinTheme: 'shrine',
    cutinText: '「鳥居の奥で鈴が鳴る…全ての『迷子』が1人の元へ集結する！」'
  },
  tunnel: {
    id: 'tunnel',
    number: 18,
    name: 'トンネル',
    kana: 'とんねる',
    category: 'dark',
    categoryLabel: 'くらやみ',
    baseCount: 1,
    actionBonus: 0,
    description: '手札に「あかり」カードが2枚以上ある全てのプレイヤーは、「あかり」カード1枚を手札から捨てる。',
    flavor: '冷たいコンクリートの洞窟。吹き抜ける突風が、頼りの灯を吹き消していく。',
    effectSummary: '「あかり」を2枚以上持つ全員が「あかり」を1枚捨てる',
    cutinTheme: 'tunnel',
    cutinText: '「暗いトンネルの冷風が吹き抜け、余分な『あかり』を奪い去る！」'
  },
  rain: {
    id: 'rain',
    number: 19,
    name: '雨',
    kana: 'あめ',
    category: 'dark',
    categoryLabel: 'くらやみ',
    baseCount: 1,
    actionBonus: 0,
    description: '全てのプレイヤーは、山札からカードを1枚引く。（あなたの左隣の人から順に、時計回りに引く）',
    flavor: 'ぽつり、ぽつりと冷たい雨粒。視界が滲み、帰り道が洗い流されていく。',
    effectSummary: '左隣から時計回りに、全員が山札から1枚ずつ引く',
    cutinTheme: 'rain',
    cutinText: '「冷たい夜の雨が降り出し、全員の視界を奪っていく…」'
  },
  narrow_path: {
    id: 'narrow_path',
    number: 20,
    name: '細い道',
    kana: 'ほそいみち',
    category: 'dark',
    categoryLabel: 'くらやみ',
    baseCount: 1,
    actionBonus: 0,
    description: 'あなたは山札からカードを2枚引く。',
    flavor: '肩が触れそうな塀の隙間。近道のはずが、歩いても歩いても出口がない。',
    effectSummary: '自分が山札からカードを2枚引く',
    cutinTheme: 'narrow_path',
    cutinText: '「薄暗い路地裏へ迷い込む…山札からカードを2枚引く」'
  },
  river: {
    id: 'river',
    number: 21,
    name: '川',
    kana: 'かわ',
    category: 'dark',
    categoryLabel: 'くらやみ',
    baseCount: 1,
    actionBonus: 0,
    description: '全てのプレイヤーは自分の手札からカードを1枚選んで、左隣のプレイヤーに渡す。',
    flavor: '黒い水面が音もなく流れている。手放した何かが、隣の人へ流れ着く。',
    effectSummary: '全員が手札から1枚選び、左隣のプレイヤーへ同時に渡す',
    cutinTheme: 'river',
    cutinText: '「黒い川の流れに乗せて、全員の手札が左隣へと流れていく…」'
  },
  sea: {
    id: 'sea',
    number: 22,
    name: '海',
    kana: 'うみ',
    category: 'dark',
    categoryLabel: 'くらやみ',
    baseCount: 1,
    actionBonus: 0,
    description: '手札の枚数を数えてから、手札を全て山札に戻す。その後、山札をよく切り、戻した枚数分カードを引く。',
    flavor: 'ザザァ…と寄せては返す夜の波。持っていたものすべてが深淵に呑まれ、また打ち上げられる。',
    effectSummary: '手札をすべて山札に戻して切り、同じ枚数引き直す',
    cutinTheme: 'sea',
    cutinText: '「夜の荒波が手札を呑み込み、新たな運命が打ち上げられる！」'
  },
  park: {
    id: 'park',
    number: 23,
    name: '公園',
    kana: 'こうえん',
    category: 'dark',
    categoryLabel: 'くらやみ',
    baseCount: 1,
    actionBonus: 0,
    description: 'あなたは山札からカードを1枚引く。',
    flavor: '誰もいない深夜の公園。風もないのに、ブランコだけがキィ、コォと揺れている。',
    effectSummary: '自分が山札からカードを1枚引く',
    cutinTheme: 'park',
    cutinText: '「キィ…コォ…無人のはずの公園でブランコが揺れている」'
  },

  // --------------------------------------------------------------------------
  // 【迷子カード（基本3枚）】
  // --------------------------------------------------------------------------
  maigo: {
    id: 'maigo',
    number: 24,
    name: '迷子',
    kana: 'まいご',
    category: 'maigo',
    categoryLabel: '迷子',
    baseCount: 3,
    actionBonus: 0,
    description: 'このカードは場に出すことが出来ない。（手札が「迷子のみ」または「迷子とくらやみのみ」になると【BAD END】で即脱落！）',
    flavor: '「ねえ、おうちはどこ…？ いっしょに探してくれるって言ったよね…？」',
    effectSummary: '場に出せない／あかりが無くなると【BAD END】',
    cutinTheme: 'maigo',
    cutinText: '「…もう、どこにも行けないね」'
  },

  // --------------------------------------------------------------------------
  // 【追加カード（2枚）】
  // --------------------------------------------------------------------------
  kurosaki: {
    id: 'kurosaki',
    number: 25,
    name: '黒崎さん',
    kana: 'くろさきさん',
    category: 'dark',
    categoryLabel: 'くらやみ（追加）',
    isExtra: true,
    baseCount: 1,
    actionBonus: 0,
    description: 'プレイヤーを1人選ぶ。あなたの手札の全ての「迷子」を選んだプレイヤーに渡す。',
    flavor: '黒いコートの人物が静かに微笑む。「そちらの道案内は、あの方に任せましょう」',
    effectSummary: '自分の手札にある全ての「迷子」を1人に押し付ける',
    cutinTheme: 'kurosaki',
    cutinText: '「黒崎さんが微笑む――『迷子』はすべてあの方のもとへ…」'
  },
  kamishiro: {
    id: 'kamishiro',
    number: 26,
    name: '神白さん',
    kana: 'かみしろさん',
    category: 'light',
    categoryLabel: 'あかり（追加）',
    isExtra: true,
    baseCount: 1,
    actionBonus: 2,
    description: '効果なし。（「行動＋2」により、追加でカードを2枚まで場に出して使用できる）',
    flavor: '白衣のような白い服の人物が通り過ぎる。不思議と足取りが軽くなった。',
    effectSummary: '効果なし / 行動＋2',
    cutinTheme: 'kamishiro',
    cutinText: '「神白さんが通り過ぎた後、夜霧が晴れて道が開ける！（行動＋2）」'
  }
};

// ----------------------------------------------------------------------------
// キャラクターカード定義（基本5人＋「おいで、おいで」＋5人以上拡張用3人）
// ----------------------------------------------------------------------------
window.MAIGO_CHARACTERS = [
  {
    id: 'char_akari',
    name: '灯里（あかり）',
    title: '塾帰りの少女',
    color: '#f59e0b',
    quote: '「早く帰らなきゃ、お母さんが心配してる…」',
    avatarType: 'girl_ribbon'
  },
  {
    id: 'char_minato',
    name: '湊（みなと）',
    title: '夜道の少年',
    color: '#38bdf8',
    quote: '「確かこの角を曲がれば駅に出るはずなのに…」',
    avatarType: 'boy_hoodie'
  },
  {
    id: 'char_shiori',
    name: '栞（しおり）',
    title: '図書委員の少女',
    color: '#a78bfa',
    quote: '「さっきと同じ看板…私たち、同じ場所を回ってる？」',
    avatarType: 'girl_glasses'
  },
  {
    id: 'char_ren',
    name: '蓮（れん）',
    title: '部活帰りの高校生',
    color: '#34d399',
    quote: '「スマホの電波が圏外だ。離れないようについてこい」',
    avatarType: 'boy_student'
  },
  {
    id: 'char_tsubaki',
    name: '椿（つばき）',
    title: '赤い傘の女性',
    color: '#fb7185',
    quote: '「街灯が消える前に急ぎましょう。後ろは見ないで」',
    avatarType: 'woman_umbrella'
  },
  {
    id: 'char_haruto',
    name: '遥斗（はると）',
    title: '終電を逃した青年',
    color: '#60a5fa',
    quote: '「タクシーも通らないなんて、この町はどうなってるんだ」',
    avatarType: 'man_scarf'
  },
  {
    id: 'char_suzu',
    name: '鈴（すず）',
    title: '神社の巫女見習い',
    color: '#f472b6',
    quote: '「この霧…ただの夜霧じゃありません。気をつけて」',
    avatarType: 'girl_miko'
  },
  {
    id: 'char_kage',
    name: '朔（さく）',
    title: '夜間巡回の警備員',
    color: '#94a3b8',
    quote: '「懐中電灯の電池が切れそうだ…まだ出口は見えないか」',
    avatarType: 'man_cap'
  }
];

window.OIDE_OIDE_CHARACTER = {
  id: 'char_oideoide',
  name: 'おいで、おいで',
  title: '迷子に憑依された者',
  color: '#dc2626',
  quote: '「こっちだよ…おいで、おいで…みんな一緒に迷子になろう？」',
  avatarType: 'oideoide'
};

// ----------------------------------------------------------------------------
// 各カードのカスタムSVGイラスト生成
// ----------------------------------------------------------------------------
window.getCardIllustrationSVG = function(cardId) {
  const svgs = {
    bright_streetlight: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <defs>
          <radialGradient id="g_bs" cx="55%" cy="32%" r="55%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95"/>
            <stop offset="45%" stop-color="#f59e0b" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#090d16" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="120" height="90" fill="#0b101d"/>
        <polygon points="66,26 24,90 108,90" fill="url(#g_bs)"/>
        <path d="M38 90 L38 22 Q38 14 48 14 L68 14" stroke="#64748b" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <ellipse cx="66" cy="18" rx="9" ry="4" fill="#fef08a" filter="drop-shadow(0 0 6px #f59e0b)"/>
        <circle cx="58" cy="45" r="1.3" fill="#fde047" opacity="0.8"/>
        <circle cx="72" cy="58" r="1" fill="#fde047" opacity="0.7"/>
        <circle cx="63" cy="70" r="1.5" fill="#fef08a" opacity="0.6"/>
      </svg>`,
    convenience_store: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#080d18"/>
        <rect x="14" y="26" width="92" height="52" rx="3" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
        <rect x="14" y="26" width="92" height="11" fill="#0284c7"/>
        <rect x="14" y="33" width="92" height="3" fill="#f59e0b"/>
        <rect x="14" y="36" width="92" height="3" fill="#10b981"/>
        <rect x="22" y="44" width="32" height="34" fill="#fef9c3" opacity="0.85"/>
        <rect x="60" y="44" width="38" height="28" fill="#e0f2fe" opacity="0.75"/>
        <text x="60" y="21" text-anchor="middle" fill="#fde047" font-size="9" font-weight="bold" letter-spacing="2">24H OPEN</text>
        <polygon points="16,78 104,78 116,90 4,90" fill="#fef08a" opacity="0.22"/>
      </svg>`,
    police_box: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <defs>
          <radialGradient id="g_pb" cx="50%" cy="22%" r="35%">
            <stop offset="0%" stop-color="#ef4444" stop-opacity="1"/>
            <stop offset="50%" stop-color="#dc2626" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#090d16" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="120" height="90" fill="#090d18"/>
        <circle cx="60" cy="20" r="28" fill="url(#g_pb)"/>
        <polygon points="60,24 26,40 94,40" fill="#1e293b" stroke="#94a3b8" stroke-width="1.5"/>
        <rect x="32" y="40" width="56" height="42" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
        <rect x="48" y="50" width="24" height="32" fill="#fde68a" opacity="0.8"/>
        <circle cx="60" cy="20" r="5" fill="#ff4444"/>
        <circle cx="60" cy="33" r="4" fill="#fbbf24" stroke="#fff" stroke-width="1"/>
      </svg>`,
    lighthouse: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#060913"/>
        <polygon points="56,24 120,4 120,44" fill="#fef08a" opacity="0.45"/>
        <polygon points="56,24 0,8 0,38" fill="#fef08a" opacity="0.25"/>
        <polygon points="48,78 52,28 64,28 68,78" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/>
        <rect x="51" y="18" width="14" height="10" fill="#fef08a"/>
        <polygon points="49,18 58,9 67,18" fill="#ef4444"/>
        <path d="M0 78 Q30 73 60 78 T120 78 L120 90 L0 90 Z" fill="#1e3a8a"/>
      </svg>`,
    amulet: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#110c1d"/>
        <circle cx="60" cy="48" r="34" fill="none" stroke="#fbbf24" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>
        <path d="M60 10 Q68 4 60 18" stroke="#ef4444" stroke-width="2.5" fill="none"/>
        <polygon points="46,24 74,24 79,34 79,76 41,76 41,34" fill="#dc2626" stroke="#fbbf24" stroke-width="2"/>
        <rect x="52" y="36" width="16" height="30" fill="#fef3c7" stroke="#d97706" stroke-width="1"/>
        <text x="60" y="56" text-anchor="middle" fill="#991b1b" font-size="12" font-weight="bold">御守</text>
      </svg>`,
    incoming_call: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#070b14"/>
        <rect x="42" y="12" width="36" height="66" rx="5" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
        <rect x="45" y="19" width="30" height="48" fill="#bae6fd" opacity="0.9"/>
        <text x="60" y="35" text-anchor="middle" fill="#0f172a" font-size="7" font-weight="bold">非通知設定</text>
        <circle cx="52" cy="55" r="5" fill="#22c55e"/>
        <circle cx="68" cy="55" r="5" fill="#ef4444"/>
        <path d="M32 30 Q26 45 32 60" stroke="#38bdf8" stroke-width="2" fill="none"/>
        <path d="M88 30 Q94 45 88 60" stroke="#38bdf8" stroke-width="2" fill="none"/>
      </svg>`,
    railroad_crossing: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#0c0a0e"/>
        <line x1="26" y1="10" x2="26" y2="88" stroke="#94a3b8" stroke-width="4"/>
        <line x1="16" y1="22" x2="36" y2="38" stroke="#facc15" stroke-width="3.5"/>
        <line x1="36" y1="22" x2="16" y2="38" stroke="#facc15" stroke-width="3.5"/>
        <circle cx="19" cy="48" r="5.5" fill="#ef4444" filter="drop-shadow(0 0 6px #ef4444)"/>
        <circle cx="33" cy="48" r="5.5" fill="#7f1d1d"/>
        <line x1="22" y1="62" x2="112" y2="56" stroke="#facc15" stroke-width="5"/>
        <line x1="35" y1="61" x2="45" y2="60" stroke="#111827" stroke-width="5"/>
        <line x1="60" y1="59" x2="70" y2="58" stroke="#111827" stroke-width="5"/>
        <line x1="85" y1="58" x2="95" y2="57" stroke="#111827" stroke-width="5"/>
      </svg>`,
    phone_booth: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#071018"/>
        <rect x="40" y="14" width="40" height="68" fill="#1e293b" stroke="#22d3ee" stroke-width="2"/>
        <rect x="44" y="20" width="32" height="56" fill="#a5f3fc" opacity="0.35"/>
        <rect x="53" y="38" width="14" height="18" rx="2" fill="#0f172a"/>
        <path d="M51 44 Q45 55 49 63" stroke="#cbd5e1" stroke-width="2" fill="none"/>
        <circle cx="49" cy="64" r="3" fill="#ef4444"/>
      </svg>`,
    coin_laundry: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#0b1320"/>
        <rect x="32" y="12" width="56" height="68" rx="4" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
        <circle cx="60" cy="48" r="20" fill="#0f172a" stroke="#94a3b8" stroke-width="3.5"/>
        <path d="M44 48 Q52 38 60 48 T76 48 A16 16 0 0 1 44 48" fill="#38bdf8" opacity="0.7"/>
        <circle cx="54" cy="42" r="2.5" fill="#fff" opacity="0.8"/>
        <circle cx="66" cy="53" r="2" fill="#fde047" opacity="0.9"/>
      </svg>`,
    rumor_light: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#16111c"/>
        <circle cx="42" cy="54" r="12" fill="#334155"/>
        <path d="M26 86 Q42 66 58 86" fill="#334155"/>
        <circle cx="78" cy="56" r="11" fill="#475569"/>
        <path d="M63 86 Q78 68 93 86" fill="#475569"/>
        <path d="M54 36 Q60 22 76 28" stroke="#fbbf24" stroke-width="1.8" fill="none" stroke-dasharray="3 2"/>
        <text x="62" y="24" text-anchor="middle" fill="#fde047" font-size="9">「迷子が…」</text>
      </svg>`,
    look_back: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#0e131f"/>
        <path d="M42 86 L55 36 L65 36 L78 86" fill="#1e293b"/>
        <ellipse cx="52" cy="70" rx="3" ry="6" fill="#94a3b8" opacity="0.6"/>
        <ellipse cx="64" cy="56" rx="2.5" ry="5" fill="#94a3b8" opacity="0.45"/>
        <rect x="53" y="60" width="14" height="19" rx="1.5" fill="#fbbf24" transform="rotate(-15 60 70)" stroke="#fff" stroke-width="1"/>
        <path d="M35 30 A26 18 0 1 1 82 32" stroke="#fde047" stroke-width="2.5" fill="none"/>
        <polygon points="82,32 76,25 87,25" fill="#fde047"/>
      </svg>`,
    crosswalk: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#0a0f1a"/>
        <polygon points="30,38 90,38 98,46 22,46" fill="#e2e8f0" opacity="0.85"/>
        <polygon points="24,54 96,54 104,62 16,62" fill="#e2e8f0" opacity="0.85"/>
        <polygon points="18,70 102,70 110,78 10,78" fill="#e2e8f0" opacity="0.85"/>
        <rect x="50" y="8" width="20" height="24" rx="3" fill="#1e293b" stroke="#64748b"/>
        <circle cx="60" cy="15" r="3.5" fill="#7f1d1d"/>
        <circle cx="60" cy="25" r="4" fill="#4ade80" filter="drop-shadow(0 0 5px #4ade80)"/>
      </svg>`,
    aquarium: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <defs>
          <linearGradient id="g_aq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0284c7"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="120" height="90" fill="url(#g_aq)"/>
        <path d="M45 45 C45 30, 75 30, 75 45 Z" fill="#a5f3fc" opacity="0.65"/>
        <path d="M50 45 Q48 64 43 74 M56 45 Q56 66 54 76 M64 45 Q64 66 67 76 M70 45 Q73 64 77 74" stroke="#a5f3fc" stroke-width="1.5" fill="none" opacity="0.6"/>
        <circle cx="28" cy="60" r="3" fill="none" stroke="#e0f2fe" stroke-width="1"/>
        <circle cx="92" cy="34" r="4" fill="none" stroke="#e0f2fe" stroke-width="1"/>
      </svg>`,
    broken_streetlight: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#06070d"/>
        <path d="M38 90 L38 22 Q38 14 48 14 L68 14" stroke="#334155" stroke-width="3.5" fill="none"/>
        <line x1="66" y1="18" x2="72" y2="28" stroke="#6366f1" stroke-width="1.5"/>
        <line x1="63" y1="20" x2="56" y2="30" stroke="#818cf8" stroke-width="1.5"/>
        <line x1="68" y1="16" x2="78" y2="18" stroke="#a5b4fc" stroke-width="1.5"/>
        <polygon points="62,38 66,34 68,41" fill="#94a3b8" opacity="0.6"/>
        <polygon points="55,52 59,49 57,56" fill="#94a3b8" opacity="0.5"/>
      </svg>`,
    rumor_dark: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#090612"/>
        <circle cx="40" cy="55" r="12" fill="#1e1b4b"/>
        <path d="M24 88 Q40 66 56 88" fill="#1e1b4b"/>
        <circle cx="80" cy="55" r="12" fill="#1e1b4b"/>
        <path d="M64 88 Q80 66 96 88" fill="#1e1b4b"/>
        <circle cx="43" cy="53" r="1.5" fill="#ef4444"/>
        <circle cx="77" cy="53" r="1.5" fill="#ef4444"/>
        <text x="60" y="26" text-anchor="middle" fill="#a855f7" font-size="9">「うしろにいるよ…」</text>
      </svg>`,
    forked_road: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#080912"/>
        <path d="M44 90 L55 52 L18 28 L30 22 L60 44 L90 22 L102 28 L65 52 L76 90 Z" fill="#1e293b"/>
        <line x1="60" y1="14" x2="60" y2="52" stroke="#64748b" stroke-width="2.5"/>
        <polygon points="60,18 38,18 33,22 38,26 60,26" fill="#4338ca"/>
        <polygon points="60,24 82,24 87,28 82,32 60,32" fill="#312e81"/>
      </svg>`,
    shrine: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#0a0610"/>
        <path d="M22 24 Q60 16 98 24" stroke="#dc2626" stroke-width="5" fill="none" stroke-linecap="round"/>
        <line x1="28" y1="36" x2="92" y2="36" stroke="#b91c1c" stroke-width="4"/>
        <line x1="36" y1="24" x2="34" y2="88" stroke="#b91c1c" stroke-width="5"/>
        <line x1="84" y1="24" x2="86" y2="88" stroke="#b91c1c" stroke-width="5"/>
        <circle cx="48" cy="58" r="3" fill="#c084fc" filter="drop-shadow(0 0 4px #a855f7)"/>
        <circle cx="72" cy="52" r="2.5" fill="#c084fc" filter="drop-shadow(0 0 4px #a855f7)"/>
      </svg>`,
    tunnel: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#07080f"/>
        <path d="M18 88 L18 46 A42 36 0 0 1 102 46 L102 88 Z" fill="#334155"/>
        <path d="M28 88 L28 50 A32 28 0 0 1 92 50 L92 88 Z" fill="#020617"/>
        <circle cx="60" cy="64" r="3" fill="#475569" opacity="0.4"/>
      </svg>`,
    rain: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#060a14"/>
        <g stroke="#60a5fa" stroke-width="1.3" opacity="0.65">
          <line x1="25" y1="10" x2="15" y2="34"/>
          <line x1="50" y1="6" x2="40" y2="30"/>
          <line x1="78" y1="12" x2="68" y2="36"/>
          <line x1="102" y1="8" x2="92" y2="32"/>
          <line x1="35" y1="42" x2="25" y2="66"/>
          <line x1="65" y1="38" x2="55" y2="62"/>
          <line x1="90" y1="44" x2="80" y2="68"/>
        </g>
        <ellipse cx="60" cy="78" rx="34" ry="5" fill="none" stroke="#3b82f6" stroke-width="1" opacity="0.6"/>
      </svg>`,
    narrow_path: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#05070e"/>
        <polygon points="0,0 48,26 48,66 0,90" fill="#1e293b" stroke="#334155"/>
        <polygon points="120,0 72,26 72,66 120,90" fill="#1e293b" stroke="#334155"/>
        <polygon points="48,66 72,66 120,90 0,90" fill="#0f172a"/>
      </svg>`,
    river: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#050814"/>
        <path d="M0 30 Q40 20 65 45 T120 65 L120 90 L0 90 Z" fill="#1e3a8a" opacity="0.65"/>
        <path d="M10 52 Q45 42 75 62 T115 74" stroke="#60a5fa" stroke-width="1.5" fill="none" opacity="0.7"/>
        <rect x="52" y="48" width="12" height="16" rx="1" fill="#c7d2fe" transform="rotate(25 58 56)" opacity="0.8"/>
      </svg>`,
    sea: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#040711"/>
        <circle cx="90" cy="20" r="9" fill="#e2e8f0" opacity="0.25"/>
        <path d="M0 50 Q25 32 50 48 T100 44 T120 50 L120 90 L0 90 Z" fill="#1e1b4b"/>
        <path d="M0 64 Q30 48 60 64 T120 62 L120 90 L0 90 Z" fill="#312e81"/>
        <path d="M10 50 Q25 38 40 48" stroke="#a5b4fc" stroke-width="1.5" fill="none"/>
      </svg>`,
    park: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#070913"/>
        <line x1="28" y1="84" x2="40" y2="18" stroke="#475569" stroke-width="3"/>
        <line x1="92" y1="84" x2="80" y2="18" stroke="#475569" stroke-width="3"/>
        <line x1="36" y1="20" x2="84" y2="20" stroke="#64748b" stroke-width="3.5"/>
        <line x1="52" y1="20" x2="48" y2="62" stroke="#94a3b8" stroke-width="1.2"/>
        <line x1="68" y1="20" x2="64" y2="62" stroke="#94a3b8" stroke-width="1.2"/>
        <rect x="45" y="61" width="22" height="4" fill="#cbd5e1" transform="rotate(-6 56 62)"/>
      </svg>`,
    maigo: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <defs>
          <radialGradient id="g_mg" cx="50%" cy="48%" r="55%">
            <stop offset="0%" stop-color="#7f1d1d" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#050204" stop-opacity="1"/>
          </radialGradient>
        </defs>
        <rect width="120" height="90" fill="url(#g_mg)"/>
        <circle cx="60" cy="36" r="13" fill="#090406" stroke="#dc2626" stroke-width="1"/>
        <path d="M43 88 L48 50 L72 50 L77 88 Z" fill="#090406" stroke="#dc2626" stroke-width="1"/>
        <circle cx="55" cy="36" r="2" fill="#ef4444" filter="drop-shadow(0 0 4px #ef4444)"/>
        <circle cx="65" cy="36" r="2" fill="#ef4444" filter="drop-shadow(0 0 4px #ef4444)"/>
        <text x="20" y="24" fill="#ef4444" font-size="8" opacity="0.7">帰れない</text>
        <text x="78" y="76" fill="#ef4444" font-size="8" opacity="0.7">おいで…</text>
      </svg>`,
    kurosaki: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <rect width="120" height="90" fill="#08050d"/>
        <circle cx="60" cy="28" r="11" fill="#1e1b4b"/>
        <path d="M36 88 L46 42 L74 42 L84 88 Z" fill="#0f0720" stroke="#7e22ce" stroke-width="1.5"/>
        <path d="M44 22 L76 22 L70 14 L50 14 Z" fill="#1e1b4b"/>
        <circle cx="64" cy="28" r="1.8" fill="#ef4444"/>
      </svg>`,
    kamishiro: `
      <svg viewBox="0 0 120 90" class="card-art-svg">
        <defs>
          <radialGradient id="g_km" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.9"/>
            <stop offset="60%" stop-color="#38bdf8" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#090d16" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="120" height="90" fill="#0b1120"/>
        <circle cx="60" cy="45" r="40" fill="url(#g_km)"/>
        <circle cx="60" cy="28" r="10" fill="#f8fafc"/>
        <path d="M40 88 L48 42 L72 42 L80 88 Z" fill="#f1f5f9" stroke="#fde047" stroke-width="1.2"/>
      </svg>`
  };
  return svgs[cardId] || svgs.bright_streetlight;
};

// ----------------------------------------------------------------------------
// キャラクターアバターSVG生成
// ----------------------------------------------------------------------------
window.getCharacterAvatarSVG = function(avatarType, isOideRevealed = false) {
  if (isOideRevealed || avatarType === 'oideoide') {
    return `
      <svg viewBox="0 0 64 64" class="char-avatar-svg oide-avatar">
        <circle cx="32" cy="32" r="30" fill="#1a0508" stroke="#dc2626" stroke-width="2"/>
        <circle cx="32" cy="26" r="11" fill="#090204"/>
        <path d="M16 58 Q32 38 48 58" fill="#090204"/>
        <circle cx="27" cy="26" r="2.3" fill="#ff2222"/>
        <circle cx="37" cy="26" r="2.3" fill="#ff2222"/>
        <path d="M26 32 Q32 36 38 32" stroke="#dc2626" stroke-width="1.5" fill="none"/>
      </svg>`;
  }
  const colorMap = {
    girl_ribbon: { bg: '#271a0c', accent: '#f59e0b' },
    boy_hoodie: { bg: '#0c1f2e', accent: '#38bdf8' },
    girl_glasses: { bg: '#1d1430', accent: '#a78bfa' },
    boy_student: { bg: '#0b261e', accent: '#34d399' },
    woman_umbrella: { bg: '#2b1219', accent: '#fb7185' },
    man_scarf: { bg: '#101f33', accent: '#60a5fa' },
    girl_miko: { bg: '#2b1224', accent: '#f472b6' },
    man_cap: { bg: '#161e29', accent: '#94a3b8' }
  };
  const theme = colorMap[avatarType] || colorMap.girl_ribbon;
  return `
    <svg viewBox="0 0 64 64" class="char-avatar-svg">
      <circle cx="32" cy="32" r="30" fill="${theme.bg}" stroke="${theme.accent}" stroke-width="2"/>
      <circle cx="32" cy="25" r="10" fill="#e2e8f0"/>
      <path d="M16 56 Q32 39 48 56" fill="${theme.accent}" opacity="0.85"/>
      <circle cx="28.5" cy="25" r="1.5" fill="#0f172a"/>
      <circle cx="35.5" cy="25" r="1.5" fill="#0f172a"/>
    </svg>`;
};

// ----------------------------------------------------------------------------
// デッキ構築関数（基本2〜4人＋5人以上拡張デッキ対応）
// ----------------------------------------------------------------------------
window.buildGameDeck = function(options = {}) {
  const {
    playerCount = 4,
    includeExtraCards = false,
    expansionMode = 'auto', // 'standard' | 'auto' | 'double' | 'custom'
    customMaigoCount = null,
    customDeckScale = 1
  } = options;

  // 各カードの枚数マップを作成
  const counts = {};
  Object.values(window.MAIGO_CARDS).forEach(card => {
    if (card.isExtra && !includeExtraCards) {
      counts[card.id] = 0;
    } else {
      counts[card.id] = card.baseCount;
    }
  });

  // 5人以上、または拡張モード指定時の枚数スケーリング
  if (expansionMode === 'double' || (expansionMode === 'auto' && playerCount >= 7)) {
    // 2デッキ合体（7〜8人推奨）
    Object.keys(counts).forEach(id => {
      counts[id] = counts[id] * 2;
    });
    if (expansionMode === 'auto') {
      // 7人なら迷子5枚、8人なら迷子6枚に調整
      counts.maigo = playerCount === 7 ? 5 : 6;
    }
  } else if (expansionMode === 'auto' && playerCount === 5) {
    // 5人最適バランス拡張（基本32枚→43枚、または追加込み45枚）
    counts.maigo = 4; // 5人プレイ時は迷子4枚
    counts.bright_streetlight += 1;
    counts.convenience_store += 1;
    counts.police_box += 1;
    counts.lighthouse += 1;
    counts.look_back += 1;
    counts.broken_streetlight += 2;
    counts.forked_road += 1;
    counts.narrow_path += 1;
    counts.park += 1;
  } else if (expansionMode === 'auto' && playerCount === 6) {
    // 6人最適バランス拡張（基本32枚→51枚、または追加込み53枚）
    counts.maigo = 5; // 6人プレイ時は迷子5枚
    counts.bright_streetlight += 2;
    counts.convenience_store += 1;
    counts.police_box += 1;
    counts.lighthouse += 1;
    counts.amulet += 1;
    counts.phone_booth += 1;
    counts.coin_laundry += 1;
    counts.look_back += 1;
    counts.broken_streetlight += 3;
    counts.forked_road += 1;
    counts.tunnel += 1;
    counts.river += 1;
    counts.narrow_path += 1;
    counts.park += 1;
  } else if (expansionMode === 'custom') {
    const scale = Math.max(1, Math.min(3, Number(customDeckScale) || 1));
    if (scale === 2) {
      Object.keys(counts).forEach(id => { counts[id] *= 2; });
    } else if (scale === 1.5) {
      counts.bright_streetlight += 2;
      counts.convenience_store += 1;
      counts.police_box += 1;
      counts.lighthouse += 1;
      counts.amulet += 1;
      counts.look_back += 1;
      counts.broken_streetlight += 3;
      counts.forked_road += 1;
      counts.narrow_path += 1;
      counts.park += 1;
    }
    if (customMaigoCount !== null && customMaigoCount >= 1) {
      counts.maigo = Number(customMaigoCount);
    }
  }

  if (customMaigoCount !== null && customMaigoCount >= 1 && expansionMode !== 'standard') {
    counts.maigo = Number(customMaigoCount);
  }

  // カードインスタンスの配列を生成
  const deck = [];
  let uidCounter = 1;
  Object.values(window.MAIGO_CARDS).forEach(cardDef => {
    const c = counts[cardDef.id] || 0;
    for (let i = 0; i < c; i++) {
      deck.push({
        uid: `c_${cardDef.id}_${uidCounter++}_${Math.random().toString(36).slice(2, 6)}`,
        cardId: cardDef.id
      });
    }
  });

  return window.shuffleCards(deck);
};

// プレビュー用のデッキ統計取得
window.getDeckStatsPreview = function(options = {}) {
  const deck = window.buildGameDeck(options);
  let light = 0, dark = 0, maigo = 0;
  deck.forEach(c => {
    const def = window.MAIGO_CARDS[c.cardId];
    if (!def) return;
    if (def.category === 'light') light++;
    else if (def.category === 'dark') dark++;
    else if (def.category === 'maigo') maigo++;
  });
  return { total: deck.length, light, dark, maigo };
};

window.shuffleCards = function(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
