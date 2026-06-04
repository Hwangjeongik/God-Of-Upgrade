import React, { useState, useEffect, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase'; 

// 🌍 완벽한 Web3/RPG 네이티브 글로벌 번역 사전 (7개국어)
const i18n = {
  ko: {
    title: "TELEGRAM WEB3 GAMING",
    slogan1: "P2E의 신\n강화의 신이 되십시오",
    slogan2: "압도적인 스펙으로 제국을 점령하십시오.",
    openTime: "⏳ GRAND OPEN : 6월 20일 11:00 (KST)",
    days: "일", hours: "시간", mins: "분", secs: "초",
    benefit1_title: "사전예약 완료 시",
    benefit2_title: "링크로 친구 초대 시",
    btn_register: "🚀 1초 만에 사전예약 완료하기",
    btn_desc: "클릭 시 텔레그램 봇으로 연결되어 사전예약이 즉시 확정됩니다.",
    quest_title: "🔥 나의 초대 퀘스트 현황",
    link_title: "내 전용 초대 링크 (공유용)",
    copy: "복사",
    copy_alert: "초대 링크가 복사되었습니다!\n\n[내 초대 링크]\n{link}\n\n이 링크로 친구가 봇에 접속하면 자동으로 50만 GOU가 지급됩니다!",
    joined_text: "내 링크로 가입한 인원:",
    people: "명",
    tab1: "1장", tab2: "2장", tab3: "3장", tab4: "4장",
    ch1_title: "🪙 1장: 순환하는 토큰노믹스 생태계",
    ch1_desc1: "GOU 생태계는 유저들의 <b>강화 결과</b>에 따라 치밀하게 분배되어 유지됩니다.",
    ch1_desc2: "<b>강화 성공 시:</b> 소모된 비용의 <span style='color:#10b981'>100%가 채굴 풀(Mining Pool)</span>로 회수되어 생태계를 순환합니다.",
    ch1_desc3: "<b>강화 실패 시:</b><br/>- 채굴 풀: <span style='color:#10b981'>40%</span><br/>- 영구 소각: <span style='color:#ef4444'>30%</span> (가치 상승)<br/>- 주간 시즌 보상: <span style='color:#fbbf24'>15%</span> (상위 랭커 분배)<br/>- 유동성 공급: <span style='color:#3b82f6'>10%</span> (DEX 방어)<br/>- 예비 운영비: <span style='color:#a855f7'>5%</span>",
    ch2_title: "⚔️ 2장: 파괴와 창조의 강화",
    ch2_desc: "획득한 자산은 반드시 <b>'장비 강화'</b>에 투자하십시오. 140강을 달성한 자만이 진정한 사령관으로 인정받아 <b>DEX 스왑 및 국고 출금 권한</b>을 얻게 됩니다.",
    ch3_title: "🔄 3장: 10조 폐쇄형 경제",
    ch3_desc: "본 서버의 토큰은 무한 발행되지 않습니다. 총 발행량 10조 GOU 내에서 철저히 순환하며, 누적 소각량(Burn)에 따라 <b>반감기(Halving)</b>가 발동되어 채굴 난이도와 가치가 극적으로 변동합니다.",
    ch4_title: "🎲 4장: 도파민 아케이드",
    ch4_desc: "매일 지급되는 티켓으로 랜덤 아케이드 미니게임에 입장하십시오. 높은 스펙을 달성할수록 미니게임의 <b>PERFECT 보상</b> 금액은 기하급수적으로 폭발합니다."
  },
  en: {
    title: "TELEGRAM WEB3 GAMING",
    slogan1: "God of P2E\nBecome the God of Upgrade",
    slogan2: "Conquer the empire with overwhelming stats.",
    openTime: "⏳ GRAND OPEN : June 20, 11:00 (KST)",
    days: "DAYS", hours: "HOURS", mins: "MINS", secs: "SECS",
    benefit1_title: "Upon Pre-registration",
    benefit2_title: "Inviting friends via link",
    btn_register: "🚀 Complete Pre-registration in 1 Sec",
    btn_desc: "Click to connect to the Telegram bot and instantly confirm your pre-registration.",
    quest_title: "🔥 My Invite Quest Status",
    link_title: "My Exclusive Invite Link (For Sharing)",
    copy: "Copy",
    copy_alert: "Invite link copied!\n\n[My Invite Link]\n{link}\n\nIf a friend joins the bot using this link, you both receive 500k GOU!",
    joined_text: "Users joined via my link:",
    people: "users",
    tab1: "Ch 1", tab2: "Ch 2", tab3: "Ch 3", tab4: "Ch 4",
    ch1_title: "🪙 Chapter 1: Circular Tokenomics",
    ch1_desc1: "The GOU ecosystem is meticulously maintained based on users' <b>upgrade results</b>.",
    ch1_desc2: "<b>On Upgrade Success:</b> <span style='color:#10b981'>100%</span> of the cost returns to the Mining Pool to circulate within the ecosystem.",
    ch1_desc3: "<b>On Upgrade Failure:</b><br/>- Mining Pool: <span style='color:#10b981'>40%</span><br/>- Permanent Burn: <span style='color:#ef4444'>30%</span> (Value up)<br/>- Weekly Season Reward: <span style='color:#fbbf24'>15%</span> (Top rankers)<br/>- Liquidity Pool: <span style='color:#3b82f6'>10%</span> (DEX defense)<br/>- Reserve: <span style='color:#a855f7'>5%</span>",
    ch2_title: "⚔️ Chapter 2: Destruction & Creation",
    ch2_desc: "You must invest your assets in <b>'Gear Upgrades'</b>. Only those who reach +140 total level are recognized as true commanders, gaining <b>DEX swap and treasury withdrawal rights</b>.",
    ch3_title: "🔄 Chapter 3: 10 Trillion Closed Economy",
    ch3_desc: "Tokens here are not infinitely minted. They circulate strictly within a 10 Trillion GOU supply. <b>Halvings</b> trigger based on cumulative burns, dramatically altering mining difficulty and value.",
    ch4_title: "🎲 Chapter 4: Dopamine Arcade",
    ch4_desc: "Enter random arcade mini-games using daily tickets. The higher your stats, the more the <b>PERFECT reward</b> exponentially explodes."
  },
  ru: {
    title: "TELEGRAM WEB3 GAMING",
    slogan1: "Бог P2E\nСтаньте Богом Улучшений",
    slogan2: "Завоюйте империю с непревзойденными характеристиками.",
    openTime: "⏳ СТАРТ : 20 Июня, 11:00 (KST)",
    days: "ДНЕЙ", hours: "ЧАСОВ", mins: "МИН", secs: "СЕК",
    benefit1_title: "За предрегистрацию",
    benefit2_title: "За приглашение друзей",
    btn_register: "🚀 Предрегистрация за 1 секунду",
    btn_desc: "Нажмите для перехода в Telegram-бот и мгновенного подтверждения предрегистрации.",
    quest_title: "🔥 Статус Моих Приглашений",
    link_title: "Моя реферальная ссылка",
    copy: "Копия",
    copy_alert: "Ссылка скопирована!\n\n[Моя ссылка]\n{link}\n\nЕсли друг зайдет по ней, вы оба получите 500k GOU!",
    joined_text: "Зарегистрировались по ссылке:",
    people: "чел.",
    tab1: "Гл 1", tab2: "Гл 2", tab3: "Гл 3", tab4: "Гл 4",
    ch1_title: "🪙 Глава 1: Круговая Токеномика",
    ch1_desc1: "Экосистема GOU тщательно поддерживается в зависимости от <b>результатов улучшений</b> пользователей.",
    ch1_desc2: "<b>При успехе:</b> <span style='color:#10b981'>100%</span> стоимости возвращается в Пул Майнинга для циркуляции.",
    ch1_desc3: "<b>При неудаче:</b><br/>- Пул Майнинга: <span style='color:#10b981'>40%</span><br/>- Сжигание: <span style='color:#ef4444'>30%</span> (Рост цены)<br/>- Сезонная награда: <span style='color:#fbbf24'>15%</span> (Топ игрокам)<br/>- Пул ликвидности: <span style='color:#3b82f6'>10%</span> (Защита DEX)<br/>- Резерв: <span style='color:#a855f7'>5%</span>",
    ch2_title: "⚔️ Глава 2: Разрушение и Создание",
    ch2_desc: "Инвестируйте в <b>«Улучшение снаряжения»</b>. Только достигнув уровня +140, вы получите статус командира и право на <b>своп DEX и вывод средств</b>.",
    ch3_title: "🔄 Глава 3: Закрытая Экономика (10 Трлн)",
    ch3_desc: "Токены не печатаются бесконечно. Они циркулируют в пределах 10 трлн GOU. <b>Халвинг</b> активируется по мере сжигания, меняя сложность майнинга и ценность.",
    ch4_title: "🎲 Глава 4: Аркада Дофамина",
    ch4_desc: "Заходите в мини-игры по ежедневным билетам. Чем выше ваши характеристики, тем сильнее экспоненциально растет <b>ИДЕАЛЬНАЯ награда</b>."
  },
  zh: {
    title: "TELEGRAM WEB3 GAMING",
    slogan1: "P2E之神\n成为强化之神",
    slogan2: "以压倒性的属性征服帝国。",
    openTime: "⏳ 盛大开启 : 6月20日 11:00 (KST)",
    days: "天", hours: "小时", mins: "分钟", secs: "秒",
    benefit1_title: "完成预约时",
    benefit2_title: "通过链接邀请好友时",
    btn_register: "🚀 1秒内完成预约",
    btn_desc: "点击后将跳转至Telegram机器人，立即确认您的预约。",
    quest_title: "🔥 我的邀请任务状态",
    link_title: "我的专属邀请链接 (用于分享)",
    copy: "复制",
    copy_alert: "邀请链接已复制！\n\n[我的链接]\n{link}\n\n如果朋友通过此链接加入，你们都将获得 50万 GOU！",
    joined_text: "通过我的链接加入的人数:",
    people: "人",
    tab1: "第1章", tab2: "第2章", tab3: "第3章", tab4: "第4章",
    ch1_title: "🪙 第1章：循环代币经济生态",
    ch1_desc1: "GOU生态系统根据用户的<b>强化结果</b>进行精密的分配和维持。",
    ch1_desc2: "<b>强化成功时:</b> 消耗费用的 <span style='color:#10b981'>100% 将回收至挖矿池 (Mining Pool)</span> 中循环。",
    ch1_desc3: "<b>强化失败时:</b><br/>- 挖矿池: <span style='color:#10b981'>40%</span><br/>- 永久销毁: <span style='color:#ef4444'>30%</span> (价值上升)<br/>- 每周赛季奖励: <span style='color:#fbbf24'>15%</span> (发给排名靠前者)<br/>- 提供流动性: <span style='color:#3b82f6'>10%</span> (DEX防御)<br/>- 备用运营费: <span style='color:#a855f7'>5%</span>",
    ch2_title: "⚔️ 第2章：破坏与创造的强化",
    ch2_desc: "请务必将获得的资产投资于<b>“装备强化”</b>。只有达到 +140 强化的玩家才能被认可为真正的指挥官，并获得 <b>DEX兑换和国库提现权限</b>。",
    ch3_title: "🔄 第3章：10万亿封闭式经济",
    ch3_desc: "本服务器的代币并非无限发行。在10万亿GOU的总发行量内严格循环。随着累计销毁量的增加，将触发<b>减半 (Halving)</b>，大幅改变挖矿难度和价值。",
    ch4_title: "🎲 第4章：多巴胺街机",
    ch4_desc: "使用每日发放的门票进入随机街机小游戏。您的属性越高，小游戏的 <b>PERFECT 奖励</b> 金额呈指数级爆炸式增长。"
  },
  ja: {
    title: "TELEGRAM WEB3 GAMING",
    slogan1: "P2Eの神\n強化の神となれ",
    slogan2: "圧倒的なスペックで帝国を征服せよ。",
    openTime: "⏳ グランドオープン : 6月20日 11:00 (KST)",
    days: "日", hours: "時間", mins: "分", secs: "秒",
    benefit1_title: "事前登録完了時",
    benefit2_title: "リンクで友達招待時",
    btn_register: "🚀 1秒で事前登録を完了する",
    btn_desc: "クリックするとTelegram Botに接続され、すぐに事前登録が確定します。",
    quest_title: "🔥 私の招待クエスト状況",
    link_title: "私専用の招待リンク (共有用)",
    copy: "コピー",
    copy_alert: "招待リンクがコピーされました！\n\n[招待リンク]\n{link}\n\n友達がこのリンクでBotに参加すると、自動で50万GOUが支給されます！",
    joined_text: "私のリンクで加入した人数:",
    people: "人",
    tab1: "1章", tab2: "2章", tab3: "3章", tab4: "4章",
    ch1_title: "🪙 第1章：循環するトークノミクス生態系",
    ch1_desc1: "GOUエコシステムは、ユーザーの<b>強化結果</b>に応じて緻密に分配・維持されます。",
    ch1_desc2: "<b>強化成功時:</b> 消費費用の <span style='color:#10b981'>100%がマイニングプール</span> に回収され、循環します。",
    ch1_desc3: "<b>強化失敗時:</b><br/>- マイニングプール: <span style='color:#10b981'>40%</span><br/>- 永久バーン: <span style='color:#ef4444'>30%</span> (価値上昇)<br/>- 週間シーズン報酬: <span style='color:#fbbf24'>15%</span> (上位ランカー)<br/>- 流動性供給: <span style='color:#3b82f6'>10%</span> (DEX防御)<br/>- 運営予備費: <span style='color:#a855f7'>5%</span>",
    ch2_title: "⚔️ 第2章：破壊と創造の強化",
    ch2_desc: "獲得した資産は必ず<b>「装備強化」</b>に投資してください。+140強化を達成した者だけが真の司令官として認められ、<b>DEXスワップおよび国庫出金権限</b>を得ます。",
    ch3_title: "🔄 第3章：10兆の閉鎖型経済",
    ch3_desc: "本サーバーのトークンは無限に発行されません。10兆GOUの総発行量内で徹底的に循環し、累積バーン量に応じて<b>半減期(Halving)</b>が発動し、採掘難易度と価値が劇的に変動します。",
    ch4_title: "🎲 第4章：ドーパミンアーケード",
    ch4_desc: "毎日支給されるチケットでランダムなミニゲームに入場してください。スペックが高いほど、ミニゲームの<b>PERFECT報酬</b>額は指数関数的に爆発します。"
  },
  es: {
    title: "TELEGRAM WEB3 GAMING",
    slogan1: "Dios del P2E\nConviértete en el Dios de las Mejoras",
    slogan2: "Conquista el imperio con estadísticas abrumadoras.",
    openTime: "⏳ GRAN APERTURA : 20 de Junio, 11:00 (KST)",
    days: "DÍAS", hours: "HORAS", mins: "MINS", secs: "SEGS",
    benefit1_title: "Al Pre-registrarse",
    benefit2_title: "Invitando amigos vía enlace",
    btn_register: "🚀 Completar Pre-registro en 1 Seg",
    btn_desc: "Haz clic para conectarte al bot de Telegram y confirmar tu pre-registro al instante.",
    quest_title: "🔥 Mi Estado de Misiones de Invitación",
    link_title: "Mi Enlace de Invitación (Para Compartir)",
    copy: "Copiar",
    copy_alert: "¡Enlace copiado!\n\n[Mi Enlace]\n{link}\n\nSi un amigo se une usando este enlace, ¡ambos recibirán 500k GOU!",
    joined_text: "Usuarios unidos por mi enlace:",
    people: "usuarios",
    tab1: "Cap 1", tab2: "Cap 2", tab3: "Cap 3", tab4: "Cap 4",
    ch1_title: "🪙 Capítulo 1: Tokenomics Circular",
    ch1_desc1: "El ecosistema GOU se mantiene meticulosamente basándose en los <b>resultados de mejora</b> de los usuarios.",
    ch1_desc2: "<b>Al tener éxito:</b> El <span style='color:#10b981'>100%</span> del costo regresa al Pool de Minería para circular.",
    ch1_desc3: "<b>Al fallar:</b><br/>- Pool de Minería: <span style='color:#10b981'>40%</span><br/>- Quema Permanente: <span style='color:#ef4444'>30%</span> (Sube el valor)<br/>- Recompensa de Temporada: <span style='color:#fbbf24'>15%</span> (Top ranking)<br/>- Liquidez: <span style='color:#3b82f6'>10%</span> (Defensa DEX)<br/>- Reserva: <span style='color:#a855f7'>5%</span>",
    ch2_title: "⚔️ Capítulo 2: Destrucción y Creación",
    ch2_desc: "Debes invertir tus activos en <b>'Mejora de Equipo'</b>. Solo aquellos que alcanzan +140 en total son reconocidos como verdaderos comandantes, ganando derechos de <b>intercambio DEX y retiro del tesoro</b>.",
    ch3_title: "🔄 Capítulo 3: Economía Cerrada de 10 Billones",
    ch3_desc: "Los tokens aquí no se imprimen infinitamente. Circulan estrictamente dentro del suministro de 10 Billones de GOU. El <b>Halving (Reducción a la mitad)</b> se activa según la quema acumulada, alterando drásticamente la dificultad y el valor.",
    ch4_title: "🎲 Capítulo 4: Arcade de Dopamina",
    ch4_desc: "Entra en minijuegos aleatorios con boletos diarios. Cuanto más altas sean tus estadísticas, más explotará exponencialmente la <b>Recompensa PERFECTA</b>."
  },
  vi: {
    title: "TELEGRAM WEB3 GAMING",
    slogan1: "Vị thần P2E\nTrở thành Vị thần Nâng cấp",
    slogan2: "Chinh phục đế chế bằng sức mạnh áp đảo.",
    openTime: "⏳ RA MẮT CHÍNH THỨC : 11:00, 20/06 (KST)",
    days: "NGÀY", hours: "GIỜ", mins: "PHÚT", secs: "GIÂY",
    benefit1_title: "Khi hoàn tất Đăng ký trước",
    benefit2_title: "Khi mời bạn bè qua liên kết",
    btn_register: "🚀 Hoàn tất Đăng ký trước trong 1 giây",
    btn_desc: "Nhấp để kết nối với bot Telegram và xác nhận đăng ký trước của bạn ngay lập tức.",
    quest_title: "🔥 Trạng thái Nhiệm vụ Mời của tôi",
    link_title: "Liên kết mời độc quyền (Để chia sẻ)",
    copy: "Sao chép",
    copy_alert: "Đã sao chép liên kết!\n\n[Liên kết của tôi]\n{link}\n\nNếu bạn bè tham gia qua liên kết này, cả hai sẽ nhận 500k GOU!",
    joined_text: "Số người đã tham gia qua liên kết:",
    people: "người",
    tab1: "C. 1", tab2: "C. 2", tab3: "C. 3", tab4: "C. 4",
    ch1_title: "🪙 Chương 1: Hệ sinh thái Tokenomics Tuần hoàn",
    ch1_desc1: "Hệ sinh thái GOU được duy trì chặt chẽ dựa trên <b>kết quả nâng cấp</b> của người dùng.",
    ch1_desc2: "<b>Khi nâng cấp thành công:</b> <span style='color:#10b981'>100%</span> chi phí được thu hồi vào Nhóm khai thác (Mining Pool) để luân chuyển.",
    ch1_desc3: "<b>Khi nâng cấp thất bại:</b><br/>- Nhóm khai thác: <span style='color:#10b981'>40%</span><br/>- Đốt vĩnh viễn: <span style='color:#ef4444'>30%</span> (Tăng giá trị)<br/>- Thưởng Mùa giải: <span style='color:#fbbf24'>15%</span> (Dành cho Top Rank)<br/>- Cung cấp thanh khoản: <span style='color:#3b82f6'>10%</span> (Bảo vệ DEX)<br/>- Dự trữ: <span style='color:#a855f7'>5%</span>",
    ch2_title: "⚔️ Chương 2: Phá hủy & Sáng tạo",
    ch2_desc: "Bạn phải đầu tư tài sản vào <b>'Nâng cấp Trang bị'</b>. Chỉ những ai đạt tổng cấp độ +140 mới được công nhận là chỉ huy thực thụ, nhận quyền <b>Giao dịch DEX và Rút tiền Kho bạc</b>.",
    ch3_title: "🔄 Chương 3: Nền kinh tế khép kín 10 Nghìn Tỷ",
    ch3_desc: "Token không được in ra vô hạn. Nó chỉ lưu thông nghiêm ngặt trong tổng cung 10 Nghìn Tỷ GOU. <b>Halving (Giảm một nửa)</b> được kích hoạt dựa trên lượng token đã đốt, làm thay đổi đáng kể độ khó và giá trị khai thác.",
    ch4_title: "🎲 Chương 4: Arcade Dopamine",
    ch4_desc: "Tham gia các mini-game ngẫu nhiên bằng vé hàng ngày. Chỉ số của bạn càng cao, phần thưởng <b>PERFECT</b> càng bùng nổ theo cấp số nhân."
  }
};

export default function PreRegister() {
  const BOT_USERNAME = "GodOfUpgrade_Bot"; 
  const tgBaseUrl = "https://" + "t." + "me/"; 
  const targetDate = new Date('2026-06-20T11:00:00+09:00').getTime();
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  const [inviteCode] = useState("GOU-" + Math.floor(Math.random() * 90000 + 10000));
  const inviteLink = `${tgBaseUrl}${BOT_USERNAME}?start=${inviteCode}`;
  const [invitedCount] = useState(0);
  const [activeGuideTab, setActiveGuideTab] = useState(1);

  // 🎵 BGM 상태
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // 🌐 언어 상태 및 초기 감지 로직
  const [lang, setLang] = useState('ko');
  const [showLangMenu, setShowLangMenu] = useState(false);

  useEffect(() => {
    // 텔레그램 유저 언어 감지
    const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    if (tgLang) {
      if (tgLang.startsWith('ko')) setLang('ko');
      else if (tgLang.startsWith('ru')) setLang('ru');
      else if (tgLang.startsWith('zh')) setLang('zh');
      else if (tgLang.startsWith('ja')) setLang('ja');
      else if (tgLang.startsWith('es')) setLang('es');
      else if (tgLang.startsWith('vi')) setLang('vi');
      else setLang('en');
    }
  }, []);

  const t = i18n[lang]; // 현재 선택된 언어의 번역 객체

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = targetDate - now;
      if (diff <= 0) { clearInterval(interval); return; }
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60)
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert(t.copy_alert.replace('{link}', inviteLink));
  };

  // 텔레그램 유저 고유 ID 가져오기 (백엔드 요청용)
  const getUserId = () => window.Telegram?.WebApp?.initDataUnsafe?.user?.id ? String(window.Telegram.WebApp.initDataUnsafe.user.id) : "test_commander_123";

  // 🚀 [핵심 수정 구간] 채널 가입 검사 삭제! 무혈입성 하이패스!
  const handleBotRedirect = async () => {
    // 백엔드 통신 없이, 누르자마자 즉시 봇으로 넘겨버립니다.
    const botUrl = `${tgBaseUrl}${BOT_USERNAME}?start=pre_register`;
    try {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
        window.Telegram.WebApp.openTelegramLink(botUrl);
      } else { window.location.href = botUrl; }
    } catch (error) { window.open(botUrl, '_blank'); }
  };

  const toggleBGM = () => {
    if (audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); } 
      else { audioRef.current.play().catch(e => console.log(e)); setIsPlaying(true); }
    }
  };

  return (
    <div style={{ backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.85), rgba(26, 15, 20, 0.95)), url("${process.env.PUBLIC_URL}/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', color: '#e6d5b8', fontFamily: 'Pretendard, sans-serif', overflowY: 'auto', position: 'relative' }}>
      
      <audio ref={audioRef} src={`${process.env.PUBLIC_URL}/bgm.mp3`} loop preload="auto" />

      {/* 🌐 좌측 상단 언어 선택 UI */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 9999 }}>
        <button onClick={() => setShowLangMenu(!showLangMenu)} style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid #555', color: '#fff', borderRadius: '25px', padding: '10px 15px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          🌐 {lang.toUpperCase()} ▼
        </button>
        {showLangMenu && (
          <div style={{ position: 'absolute', top: '50px', left: '0', background: 'rgba(15,20,28,0.95)', border: '1px solid #555', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: '120px', boxShadow: '0 5px 15px rgba(0,0,0,0.8)' }}>
            {[{c:'ko', l:'🇰🇷 한국어'}, {c:'en', l:'🇺🇸 English'}, {c:'ru', l:'🇷🇺 Русский'}, {c:'zh', l:'🇨🇳 中文'}, {c:'ja', l:'🇯🇵 日本語'}, {c:'es', l:'🇪🇸 Español'}, {c:'vi', l:'🇻🇳 Tiếng Việt'}].map(item => (
              <button key={item.c} onClick={() => { setLang(item.c); setShowLangMenu(false); }} style={{ background: 'transparent', color: lang === item.c ? '#fbbf24' : '#ccc', border: 'none', padding: '12px 15px', textAlign: 'left', cursor: 'pointer', fontWeight: lang === item.c ? 'bold' : 'normal', borderBottom: '1px solid #333', fontSize: '13px' }}>
                {item.l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 🎵 우측 상단 BGM 컨트롤 버튼 */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 9999 }}>
        <button onClick={toggleBGM} style={{ background: isPlaying ? 'rgba(6,182,212,0.3)' : 'rgba(0,0,0,0.6)', border: `2px solid ${isPlaying ? '#06b6d4' : '#555'}`, color: isPlaying ? '#06b6d4' : '#888', borderRadius: '50%', width: '45px', height: '45px', fontSize: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: isPlaying ? '0 0 15px rgba(6,182,212,0.5)' : 'none', transition: '0.3s' }}>
          {isPlaying ? '🔊' : '🔇'}
        </button>
      </div>
      
      {/* 타이틀 영역 */}
      <div style={{ textAlign: 'center', marginBottom: '30px', marginTop: '40px', animation: 'fadeInDown 1s ease-out' }}>
        <h3 style={{ color: '#06b6d4', letterSpacing: '2px', margin: '0 0 10px 0', fontWeight: 'bold' }}>{t.title}</h3>
        <h1 style={{ color: '#fbbf24', fontSize: '38px', margin: '0', textShadow: '0 0 20px rgba(251,191,36,0.8)', lineHeight: '1.2', whiteSpace: 'pre-line' }}>{t.slogan1}</h1>
        <p style={{ color: '#ccc', fontSize: '15px', marginTop: '15px' }}>{t.slogan2}</p>
      </div>

      {/* 카운트다운 타이머 */}
      <div style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid #fbbf24', borderRadius: '15px', padding: '20px', width: '100%', maxWidth: '500px', textAlign: 'center', marginBottom: '30px', boxShadow: '0 0 30px rgba(251,191,36,0.2)' }}>
        <h3 style={{ color: '#fbbf24', margin: '0 0 15px 0' }}>{t.openTime}</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          {[ { label: t.days, val: timeLeft.d }, { label: t.hours, val: timeLeft.h }, { label: t.mins, val: timeLeft.m }, { label: t.secs, val: timeLeft.s } ].map((item, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: '#222', border: '1px solid #555', borderRadius: '10px', width: '60px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', fontWeight: '900', color: '#fff', textShadow: '0 0 10px #fff' }}>
                {item.val.toString().padStart(2, '0')}
              </div>
              <span style={{ fontSize: '11px', color: '#aaa', marginTop: '8px', fontWeight: 'bold' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 혜택 안내 */}
      <div style={{ width: '100%', maxWidth: '500px', display: 'flex', gap: '15px', marginBottom: '30px' }}>
        <div style={{ flex: 1, background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(0,0,0,0.8))', border: '1px solid #06b6d4', padding: '20px 15px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>🎁</div>
          <div style={{ fontSize: '12px', color: '#aaa', wordBreak: 'keep-all' }}>{t.benefit1_title}</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#06b6d4', marginTop: '5px' }}>500,000 GOU</div>
        </div>
        <div style={{ flex: 1, background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(0,0,0,0.8))', border: '1px solid #a855f7', padding: '20px 15px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>🤝</div>
          <div style={{ fontSize: '12px', color: '#aaa', wordBreak: 'keep-all' }}>{t.benefit2_title}</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#a855f7', marginTop: '5px' }}>+ 500,000 GOU</div>
        </div>
      </div>

      {/* 사전예약 다이렉트 완료 버튼 */}
      <div style={{ width: '100%', maxWidth: '500px', marginBottom: '40px' }}>
        <button onClick={handleBotRedirect} style={{ width: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', color: '#fff', padding: '22px 10px', borderRadius: '15px', fontSize: '20px', fontWeight: '900', border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px rgba(6,182,212,0.5)', animation: 'pulse 2s infinite', wordBreak: 'keep-all' }}>
          {t.btn_register}
        </button>
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#888', textAlign: 'center' }}>{t.btn_desc}</div>
      </div>

      {/* 내 초대 링크 */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '500px', marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '16px', textAlign: 'center' }}>{t.quest_title}</h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #333' }}>
          <div style={{ overflow: 'hidden', marginRight: '10px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '5px' }}>{t.link_title}</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fbbf24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inviteLink}</div>
          </div>
          <button onClick={copyInviteLink} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}>{t.copy}</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px' }}>
          <span style={{ color: '#ccc', fontSize: '14px' }}>{t.joined_text}</span>
          <span style={{ fontSize: '24px', fontWeight: '900', color: '#10b981' }}>{invitedCount} {t.people}</span>
        </div>
      </div>

      {/* 게임 가이드 탭 */}
      <div style={{ width: '100%', maxWidth: '500px', background: 'rgba(20, 24, 34, 0.9)', border: '1px solid #555', borderRadius: '12px', overflow: 'hidden', marginBottom: '40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #555' }}>
          {[ { id: 1, name: t.tab1 }, { id: 2, name: t.tab2 }, { id: 3, name: t.tab3 }, { id: 4, name: t.tab4 } ].map(tab => (
            <button key={tab.id} onClick={() => setActiveGuideTab(tab.id)} style={{ padding: '12px 0', background: activeGuideTab === tab.id ? '#333' : 'transparent', color: activeGuideTab === tab.id ? '#fbbf24' : '#aaa', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', fontSize: '12px' }}>
              {tab.name}
            </button>
          ))}
        </div>
        
        <div style={{ padding: '20px', fontSize: '14px', lineHeight: '1.6', color: '#e6d5b8', minHeight: '200px' }}>
          {activeGuideTab === 1 && (
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <h4 style={{ color: '#06b6d4', margin: '0 0 10px 0', fontSize: '16px' }}>{t.ch1_title}</h4>
              <p dangerouslySetInnerHTML={{ __html: t.ch1_desc1 }}></p>
              <ul style={{ paddingLeft: '20px', marginTop: '10px', color: '#fff', fontSize: '13px' }}>
                <li style={{ marginBottom: '5px' }} dangerouslySetInnerHTML={{ __html: t.ch1_desc2 }}></li>
                <li dangerouslySetInnerHTML={{ __html: t.ch1_desc3 }}></li>
              </ul>
            </div>
          )}
          {activeGuideTab === 2 && (
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <h4 style={{ color: '#10b981', margin: '0 0 10px 0', fontSize: '16px' }}>{t.ch2_title}</h4>
              <p dangerouslySetInnerHTML={{ __html: t.ch2_desc }}></p>
            </div>
          )}
          {activeGuideTab === 3 && (
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <h4 style={{ color: '#fbbf24', margin: '0 0 10px 0', fontSize: '16px' }}>{t.ch3_title}</h4>
              <p dangerouslySetInnerHTML={{ __html: t.ch3_desc }}></p>
            </div>
          )}
          {activeGuideTab === 4 && (
            <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <h4 style={{ color: '#a855f7', margin: '0 0 10px 0', fontSize: '16px' }}>{t.ch4_title}</h4>
              <p dangerouslySetInnerHTML={{ __html: t.ch4_desc }}></p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0% { transform: scale(1); boxShadow: 0 0 0 0 rgba(6,182,212,0.7); } 70% { transform: scale(1.03); boxShadow: 0 0 0 20px rgba(6,182,212,0); } 100% { transform: scale(1); boxShadow: 0 0 0 0 rgba(6,182,212,0); } }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}