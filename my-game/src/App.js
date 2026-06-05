/* eslint-disable */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { TonConnectButton, useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { app } from './firebase'; 

const MAX_SUPPLY = 10000000000000; 
const SAVE_POINTS = [10, 20, 30, 40]; 
const ADMIN_WALLET_ADDRESS = "UQBeUaO9-hrCsfk8UWtaafeu3EXV08Gnoww4bbMdanCZwgmQ";

// 🌍 7개국어 다국어 사전 (생략 없이 그대로 유지)
const i18n = {
  ko: { wConn:"지갑 연결됨", wNotConn:"지갑 미연결", wWarn:"⚠️ 이 기능을 사용하려면 TON 지갑을 연결해야 합니다!", rGod:"GOD", rCom:"사령관", rKni:"기사", rRec:"훈련병", jPot:"🏆 이번 주 시즌 잭팟 보상금", burn:"🔥 서버 총 소각량 (반감기 게이지)", ph2:"🚨 2차 반감기 가동 중 (비용 50%↓)", ph1:"⚠️ 1차 반감기 가동 중 (수익 50%↓)", ph0:"🟢 기본 페이즈 진행 중", dGain:"일일 자동 채굴량", unClm:"미수확", cBtn:"🚀 GOU 획득하기", bfOn:"🔥 버프 가동 중", bfCd:"⏳ 쿨타임", bfBtn:"📺 광고: 1시간 채굴량 2배", arc:"🎰 랜덤 아케이드 게임장", tkts:"🎟️ 보유 티켓", ads:"📺 남은 광고", adBtn:"📺 광고 보고 티켓 충전", pBtn:"🎲 랜덤 아케이드 입장", hTit:"🗺️ 점령 영지 현황 (전투력 매칭)", hReq:"필요 강화 합:", gTit:"⚔️ 신화 무기고", pTit:"🐉 신수 및 영지 성장", lvl:"강", prob:"확률:", cost:"비용:", upg:"강화", shTit:"💎 GOU 다이렉트 상점", buy:"TON 결제", nHom:"홈(수확)", nUpg:"강화", nShp:"상점", nRnk:"랭킹", nSys:"시스템", aNoG:"GOU가 부족합니다.", rSrv:"👑 SERVER RANKING", nTgt:"목표 강화 레벨 입력:", h1:"초원 영지", h2:"신의 숲", h3:"불멸 사막", h4:"심연 정글", h5:"황혼 화산", g1:"제우스의 검", g2:"아레스의 갑옷", g3:"아테나의 투구", g4:"헤파이스토스의 장갑", g5:"헤르메스의 신발", g6:"아프로디테의 목걸이", g7:"포세이돈의 반지", s1:"공격력", s2:"체력", s3:"방어력", s4:"명중률", s5:"보너스", s6:"비용감소", s7:"성공확률", p1:"고대 드래곤", p2:"위대한 군주의 성", gBf:"버프: ", pBf:"수익 보너스: ", spec:"진행 중 ⚔️", lck1:"장비 210강 달성 시 개방", lck2:"펫 50강 달성 시 개방", rnk1:"순위", rnk2:"사령관명", rnk3:"달성 스펙", syMy:"👤 내 정보 (MY)", syFr:"🤝 친구초대 퀘스트", tgTit:"🛡️ 나만의 GOD 칭호 변경", tgWd:"📤 GOU 국고 출금", cpy:"🔗 초대 링크 복사하기", frSt:"🔥 기사 달성 친구 초대 현황", frMy:"🤝 내 친구 육성 현황", aMin:"최소 수량을 확인하세요.", aMax:"목표 달성!", aErr:"잔고 부족!", hSpec1:"🏰 제국의 심장", hSpec2:"🐉 신수의 둥지", aTkt:"티켓이 부족합니다!", lTit:"🎟️ 핫타임 복권", lTm:"[수령 가능 시간] 12:00~14:00 / 18:00~20:00 (한국시간 KST)", lOn:"복권 긁기!", lOff:"대기중...", lWait:"핫타임(12:00~14:00, 18:00~20:00 KST)을 기다려주세요!", lClaimed:"이미 이번 핫타임 복권을 수령하셨습니다!", shNtTit:"🚨 [필독] GOU 톤 상점 공식 선언문", shNt1:"본 상점은 단순한 과금처가 아닌 <b>제국 경제 방어선</b>입니다. 외부 고래들의 조작으로부터 유저를 보호합니다.", shNt2:"<b>📉 덤핑 원천 차단:</b> 런칭 초기 DEX 유동성을 의도적으로 낮게 설정하여 악성 고래들의 매집/덤핑을 막습니다.", shNt3:"<b>⚖️ 오라클(Oracle) 연동:</b> 상점 내 GOU는 실시간 TON ↔ GOU 스왑 가격을 추종하여 공정하게 책정됩니다.", shNt4:"<b>💧 100% LP 재투입:</b> 결제된 모든 TON은 <b>DEX GOU 유동성 풀에 전액 재투입</b>되어 코인 가치를 방어합니다!", depBtn:"📥 GOU 입금", depPmt:"📥 DEX에서 매수한 GOU를 제국으로 입금합니다.\n수량을 입력하세요:", depErr:"올바른 수량을 입력하세요!" },
  en: { wConn:"Wallet Connected", wNotConn:"Not Connected", wWarn:"⚠️ You must connect your TON wallet first!", rGod:"GOD", rCom:"Cmdr", rKni:"Knight", rRec:"Recruit", jPot:"🏆 Weekly Season Jackpot", burn:"🔥 Total Server Burn (Halving)", ph2:"🚨 Phase 2 Halving (Cost 50%↓)", ph1:"⚠️ Phase 1 Halving (Yield 50%↓)", ph0:"🟢 Normal Phase", dGain:"Daily Auto Mining", unClm:"Unclaimed", cBtn:"🚀 Claim GOU", bfOn:"🔥 Buff Active", bfCd:"⏳ Cooldown", bfBtn:"📺 Ad: 2x Mining (1h)", arc:"🎰 Random Arcade", tkts:"🎟️ Tickets", ads:"📺 Ads Left", adBtn:"📺 Watch Ad for Ticket", pBtn:"🎲 Enter Arcade", hTit:"🗺️ Territories (Power Match)", hReq:"Req Lvl Sum:", gTit:"⚔️ Mythic Armory", pTit:"🐉 Divine Beast & Castle", lvl:"Lv", prob:"Rate:", cost:"Cost:", upg:"UPG", shTit:"💎 Direct GOU Shop", buy:"BUY (TON)", nHom:"Home", nUpg:"Upgrade", nShp:"Shop", nRnk:"Rank", nSys:"System", aNoG:"Not enough GOU.", rSrv:"👑 SERVER RANKING", nTgt:"Enter target upgrade level:", h1:"Grassland", h2:"Forest of Gods", h3:"Immortal Desert", h4:"Abyssal Jungle", h5:"Twilight Volcano", g1:"Sword of Zeus", g2:"Armor of Ares", g3:"Helmet of Athena", g4:"Gloves of Hephaestus", g5:"Shoes of Hermes", g6:"Necklace of Aphrodite", g7:"Ring of Poseidon", s1:"ATK", s2:"HP", s3:"DEF", s4:"ACC", s5:"Bonus", s6:"Cost Reduc", s7:"Success Rate", p1:"Ancient Dragon", p2:"Great Monarch's Castle", gBf:"Buff: ", pBf:"Yield Bonus: ", spec:"Hunting ⚔️", lck1:"Unlocks at Gear +210", lck2:"Unlocks at Pet +50", rnk1:"Rank", rnk2:"Commander", rnk3:"Stats", syMy:"👤 My Info", syFr:"🤝 Invite Quest", tgTit:"🛡️ Change GOD Title", tgWd:"📤 Withdraw GOU", cpy:"🔗 Copy Invite Link", frSt:"🔥 Friends Reached Knight", frMy:"🤝 Friends Growth", aMin:"Check minimum amount.", aMax:"Target Reached!", aErr:"Not enough balance!", hSpec1:"🏰 Heart of Empire", hSpec2:"🐉 Beast Nest", aTkt:"Not enough tickets!", lTit:"🎟️ Hot Time Lottery", lTm:"[Available] 12:00~14:00 / 18:00~20:00 (KST)", lOn:"Scratch!", lOff:"Waiting...", lWait:"Wait for Hot Time (12:00~14:00, 18:00~20:00 KST)!", lClaimed:"Already claimed this slot!", shNtTit:"🚨 [NOTICE] GOU TON Shop Declaration", shNt1:"This shop is our <b>Economic Defense Line</b> against market manipulation by external whales.", shNt2:"<b>📉 Anti-Dumping:</b> Initial DEX liquidity is set low to prevent whale dumping.", shNt3:"<b>⚖️ Oracle Linked:</b> Prices follow real-time TON ↔ GOU swap rates.", shNt4:"<b>💧 100% LP Reinvestment:</b> All TON spent here goes into the <b>DEX Liquidity Pool</b> to pump your GOU value!", depBtn:"📥 Deposit GOU", depPmt:"📥 Deposit GOU from DEX to Empire.\nEnter amount:", depErr:"Enter a valid amount!" },
  ru: { wConn:"Кошелек подключен", wNotConn:"Нет кошелька", wWarn:"⚠️ Сначала подключите кошелек TON!", rGod:"БОГ", rCom:"Командир", rKni:"Рыцарь", rRec:"Рекрут", jPot:"🏆 Джекпот Сезона", burn:"🔥 Всего Сожжено (Халвинг)", ph2:"🚨 Халвинг 2 (Стоимость 50%↓)", ph1:"⚠️ Халвинг 1 (Доход 50%↓)", ph0:"🟢 Обычная Фаза", dGain:"Дневная добыча", unClm:"Не собрано", cBtn:"🚀 Собрать GOU", bfOn:"🔥 Бафф Активен", bfCd:"⏳ Перезарядка", bfBtn:"📺 Реклама: 2x добыча (1ч)", arc:"🎰 Аркада", tkts:"🎟️ Билеты", ads:"📺 Осталось рекламы", adBtn:"📺 Реклама за билет", pBtn:"🎲 Войти в Аркаду", hTit:"🗺️ Территории", hReq:"Требуется ур:", gTit:"⚔️ Мифический Арсенал", pTit:"🐉 Питомец и Замок", lvl:"Ур", prob:"Шанс:", cost:"Цена:", upg:"Улучш", shTit:"💎 Магазин GOU", buy:"КУПИТЬ (TON)", nHom:"Главная", nUpg:"Улучш", nShp:"Магз", nRnk:"Топ", nSys:"Система", aNoG:"Недостаточно GOU", rSrv:"👑 РЕЙТИНГ СЕРВЕРА", nTgt:"Целевой уровень:", h1:"Луга", h2:"Лес Богов", h3:"Бессмертная Пустыня", h4:"Джунгли Бездны", h5:"Сумеречный Вулкан", g1:"Меч Зевса", g2:"Броня Ареса", g3:"Шлем Афины", g4:"Перчатки Гефеста", g5:"Обувь Гермеса", g6:"Ожерелье Афродиты", g7:"Кольцо Посейдона", s1:"АТК", s2:"ХП", s3:"ЗАЩ", s4:"ТОЧ", s5:"Бонус", s6:"Скидка", s7:"Шанс", p1:"Древний Дракон", p2:"Замок Монарха", gBf:"Бафф: ", pBf:"Доход: ", spec:"Охота ⚔️", lck1:"Разб: Снаряж +210", lck2:"Разб: Питомец +50", rnk1:"Ранг", rnk2:"Командир", rnk3:"Статы", syMy:"👤 Мой Профиль", syFr:"🤝 Квесты", tgTit:"🛡️ Изменить титул GOD", tgWd:"📤 Вывод GOU", cpy:"🔗 Копировать ссылку", frSt:"🔥 Друзья-Рыцари", frMy:"🤝 Прогресс друзей", aMin:"Мин. сумма не достигнута.", aMax:"Цель достигнута!", aErr:"Недостаточно баланса!", hSpec1:"🏰 Сердце Империи", hSpec2:"🐉 Гнездо Зверя", aTkt:"Нет билетов!", lTit:"🎟️ Лотерея Hot Time", lTm:"[Доступно] 12:00~14:00 / 18:00~20:00 (KST)", lOn:"Стереть!", lOff:"Ожидание...", lWait:"Ждите Hot Time (12:00~14:00, 18:00~20:00 KST)!", lClaimed:"Уже получено!", shNtTit:"🚨 [ВНИМАНИЕ] Декларация Магазина", shNt1:"Этот магазин — наша <b>Линия экономической защиты</b> от китов.", shNt2:"<b>📉 Защита от дампа:</b> Низкая ликвидность на DEX.", shNt3:"<b>⚖️ Оракул:</b> Цены привязаны к реальному курсу TON.", shNt4:"<b>💧 100% в LP:</b> Все TON идут в пул ликвидности!", depBtn:"📥 Депозит GOU", depPmt:"📥 Внесите GOU с DEX.\nВведите сумму:", depErr:"Неверная сумма!" },
  zh: { wConn:"已连接钱包", wNotConn:"未连接", wWarn:"⚠️ 您必须先连接TON钱包！", rGod:"GOD", rCom:"指挥官", rKni:"骑士", rRec:"新兵", jPot:"🏆 本周赛季奖池", burn:"🔥 总销毁量 (减半)", ph2:"🚨 阶段2减半 (成本50%↓)", ph1:"⚠️ 阶段1减半 (收益50%↓)", ph0:"🟢 基础阶段", dGain:"每日自动挖矿", unClm:"未领取", cBtn:"🚀 领取 GOU", bfOn:"🔥 增益生效中", bfCd:"⏳ 冷却中", bfBtn:"📺 看广告: 1小时收益2倍", arc:"🎰 随机街机", tkts:"🎟️ 门票", ads:"📺 剩余广告", adBtn:"📺 看广告补充门票", pBtn:"🎲 进入街机", hTit:"🗺️ 领地状态", hReq:"需要强化:", gTit:"⚔️ 神话武器库", pTit:"🐉 神兽与领地", lvl:"级", prob:"概率:", cost:"费用:", upg:"强化", shTit:"💎 GOU直营店", buy:"购买 (TON)", nHom:"主页", nUpg:"强化", nShp:"商店", nRnk:"排名", nSys:"系统", aNoG:"GOU不足。", rSrv:"👑 全服排名", nTgt:"输入目标等级:", h1:"草原领地", h2:"神之森林", h3:"不朽沙漠", h4:"深渊丛林", h5:"黄昏火山", g1:"宙斯之剑", g2:"阿瑞斯之甲", g3:"雅典娜之盔", g4:"赫菲斯托斯手套", g5:"赫尔墨斯之鞋", g6:"阿佛洛狄忒项链", g7:"波塞冬之戒", s1:"攻击力", s2:"生命值", s3:"防御力", s4:"命中率", s5:"加成", s6:"费用减少", s7:"成功率", p1:"远古巨龙", p2:"伟大君主之城", gBf:"增益: ", pBf:"收益加成: ", spec:"进行中 ⚔️", lck1:"装备+210解锁", lck2:"宠物+50解锁", rnk1:"排名", rnk2:"指挥官", rnk3:"属性", syMy:"👤 我的信息", syFr:"🤝 邀请任务", tgTit:"🛡️ 更改GOD称号", tgWd:"📤 提取 GOU", cpy:"🔗 复制邀请链接", frSt:"🔥 达到骑士的好友", frMy:"🤝 好友养成状态", aMin:"检查最低数量。", aMax:"达成目标！", aErr:"余额不足！", hSpec1:"🏰 帝国之心", hSpec2:"🐉 神兽之巢", aTkt:"门票不足！", lTit:"🎟️ 热点时间彩票", lTm:"[开放时间] 12:00~14:00 / 18:00~20:00 (KST)", lOn:"刮刮乐！", lOff:"等待中...", lWait:"请等待热点时间 (12:00~14:00, 18:00~20:00 KST)！", lClaimed:"已经领取过！", shNtTit:"🚨 [必读] 商店官方声明", shNt1:"本商店是 <b>帝国经济防线</b>，防止外部巨鲸操纵市场。", shNt2:"<b>📉 防止砸盘:</b> 初期DEX流动性设定较低。", shNt3:"<b>⚖️ 预言机(Oracle):</b> 价格实时挂钩TON兑换率。", shNt4:"<b>💧 100% 注入LP:</b> 所有TON全额注入流动性池！", depBtn:"📥 存入 GOU", depPmt:"📥 从DEX存入GOU。\n请输入数量：", depErr:"请输入有效数量！" },
  ja: { wConn:"ウォレット接続済", wNotConn:"未接続", wWarn:"⚠️ まずTONウォレットを接続してください！", rGod:"GOD", rCom:"司令官", rKni:"騎士", rRec:"訓練兵", jPot:"🏆 今週のジャックポット", burn:"🔥 総バーン量 (半減期)", ph2:"🚨 第2半減期 (費用50%↓)", ph1:"⚠️ 第1半減期 (収益50%↓)", ph0:"🟢 基本フェーズ", dGain:"1日の自動採掘", unClm:"未受取", cBtn:"🚀 GOU 獲得", bfOn:"🔥 バフ稼働中", bfCd:"⏳ クールタイム", bfBtn:"📺 広告: 1時間収益2倍", arc:"🎰 ランダムアーケード", tkts:"🎟️ チケット", ads:"📺 残り広告", adBtn:"📺 広告でチケット補充", pBtn:"🎲 アーケード入場", hTit:"🗺️ 占領領地", hReq:"必要強化:", gTit:"⚔️ 神話の武器庫", pTit:"🐉 神獣と領地", lvl:"強化", prob:"確率:", cost:"費用:", upg:"強化", shTit:"💎 GOU直営店", buy:"決済 (TON)", nHom:"ホーム", nUpg:"強化", nShp:"ショップ", nRnk:"ランク", nSys:"システム", aNoG:"GOU不足です。", rSrv:"👑 サーバーランキング", nTgt:"目標レベルを入力:", h1:"草原の領地", h2:"神の森", h3:"不滅の砂漠", h4:"深淵のジャングル", h5:"黄昏の火山", g1:"ゼウスの剣", g2:"アレスの鎧", g3:"アテナの兜", g4:"ヘパイストスの手袋", g5:"ヘルメスの靴", g6:"アフロディーテの首飾り", g7:"ポセイドンの指輪", s1:"攻撃力", s2:"体力", s3:"防御力", s4:"命中率", s5:"ボーナス", s6:"費用減少", s7:"成功確率", p1:"古代ドラゴン", p2:"偉大なる君主の城", gBf:"バフ: ", pBf:"収益ボーナス: ", spec:"進行中 ⚔️", lck1:"装備+210で解放", lck2:"ペット+50で解放", rnk1:"順位", rnk2:"司令官名", rnk3:"スペック", syMy:"👤 マイページ", syFr:"🤝 友達招待", tgTit:"🛡️ GOD称号変更", tgWd:"📤 GOU出金", cpy:"🔗 リンクをコピー", frSt:"🔥 騎士到達の友達", frMy:"🤝 友達の育成状況", aMin:"最小数量を確認してください。", aMax:"目標達成！", aErr:"残高不足！", hSpec1:"🏰 帝国の心臓", hSpec2:"🐉 神獣の巣", aTkt:"チケットが足りません！", lTit:"🎟️ ホットタイム宝くじ", lTm:"[受取時間] 12:00~14:00 / 18:00~20:00 (KST)", lOn:"スクラッチ！", lOff:"待機中...", lWait:"ホットタイムをお待ちください (12:00~14:00, 18:00~20:00 KST)！", lClaimed:"既に受取済みです！", shNtTit:"🚨 [必読] ショップ公式宣言", shNt1:"本ショップは <b>帝国経済防衛線</b> です。", shNt2:"<b>📉 ダンピング防止:</b> DEXの流動性を意図的に低く設定。", shNt3:"<b>⚖️ オラクル連動:</b> リアルタイムの価格に連動。", shNt4:"<b>💧 100% LP再投資:</b> 決済されたTONは全てLPへ！", depBtn:"📥 GOU入金", depPmt:"📥 DEXからGOUを入金します。\n数量を入力:", depErr:"正しい数量を入力してください！" },
  es: { wConn:"Billetera Conect.", wNotConn:"No Conectada", wWarn:"⚠️ ¡Debes conectar tu billetera TON primero!", rGod:"DIOS", rCom:"Cmdte", rKni:"Caballero", rRec:"Recluta", jPot:"🏆 Jackpot Semanal", burn:"🔥 Quema Total (Halving)", ph2:"🚨 Halving 2 (Costo 50%↓)", ph1:"⚠️ Halving 1 (Ganancia 50%↓)", ph0:"🟢 Fase Normal", dGain:"Minería Diaria", unClm:"Sin Reclamar", cBtn:"🚀 Reclamar GOU", bfOn:"🔥 Buff Activo", bfCd:"⏳ Enfriamiento", bfBtn:"📺 Anuncio: Minería 2x (1h)", arc:"🎰 Arcade Aleatorio", tkts:"🎟️ Boletos", ads:"📺 Anuncios Rest.", adBtn:"📺 Anuncio por Boleto", pBtn:"🎲 Entrar al Arcade", hTit:"🗺️ Territorios", hReq:"Nivel Requerido:", gTit:"⚔️ Armería Mítica", pTit:"🐉 Bestia Divina", lvl:"Nv", prob:"Prob:", cost:"Costo:", upg:"Mejora", shTit:"💎 Tienda GOU", buy:"COMPRAR", nHom:"Inicio", nUpg:"Mejora", nShp:"Tienda", nRnk:"Ranking", nSys:"Sistema", aNoG:"GOU Insuficiente.", rSrv:"👑 RANKING DEL SERVIDOR", nTgt:"Ingresa nivel objetivo:", h1:"Pradera", h2:"Bosque de Dioses", h3:"Desierto Inmortal", h4:"Jungla Abisal", h5:"Volcán Crepuscular", g1:"Espada de Zeus", g2:"Armadura de Ares", g3:"Casco de Atenea", g4:"Guantes de Hefesto", g5:"Zapatos de Hermes", g6:"Collar de Afrodita", g7:"Anillo de Poseidón", s1:"ATQ", s2:"PV", s3:"DEF", s4:"PRE", s5:"Bono", s6:"Reduc. Costo", s7:"Prob. Éxito", p1:"Dragón Antiguo", p2:"Castillo del Monarca", gBf:"Buff: ", pBf:"Bono de Ganancia: ", spec:"Cazando ⚔️", lck1:"Desbloquea al +210", lck2:"Desbloquea al +50", rnk1:"Rango", rnk2:"Comandante", rnk3:"Estadísticas", syMy:"👤 Mi Info", syFr:"🤝 Misión de Invit.", tgTit:"🛡️ Cambiar Título de DIOS", tgWd:"📤 Retirar GOU", cpy:"🔗 Copiar Enlace", frSt:"🔥 Amigos nivel Caballero", frMy:"🤝 Crecimiento de Amigos", aMin:"Verifique la cantidad mínima.", aMax:"¡Objetivo Alcanzado!", aErr:"¡Saldo insuficiente!", hSpec1:"🏰 Corazón del Imperio", hSpec2:"🐉 Nido de Bestias", aTkt:"¡Faltan boletos!", lTit:"🎟️ Lotería Hot Time", lTm:"[Disponible] 12:00~14:00 / 18:00~20:00 (KST)", lOn:"¡Rascar!", lOff:"Esperando...", lWait:"¡Espera el Hot Time (12:00~14:00, 18:00~20:00 KST)!", lClaimed:"¡Ya reclamado!", shNtTit:"🚨 [AVISO] Declaración Oficial de la Tienda GOU", shNt1:"Esta tienda no es solo para pagos, es la <b>Línea de Defensa Económica del Imperio</b>. Protege a los usuarios de la manipulación externa.", shNt2:"<b>📉 Prevención de Dumping:</b> La liquidez inicial del DEX se establece baja intencionalmente para evitar la acumulación/dumping de ballenas maliciosas.", shNt3:"<b>⚖️ Vinculación de Oráculo:</b> Los precios de GOU siguen las tasas de intercambio TON ↔ GOU en tiempo real para un precio justo.", shNt4:"<b>💧 100% Reinversión LP:</b> ¡Todo el TON pagado se <b>reinvierte completamente en el Pool de Liquidez DEX GOU</b> para defender el valor de la moneda!", depBtn:"📥 Depositar GOU", depPmt:"📥 Deposita GOU desde DEX.\nIngresa la cantidad:", depErr:"¡Cantidad inválida!" },
  vi: { wConn:"Đã kết nối ví", wNotConn:"Chưa kết nối", wWarn:"⚠️ Bạn phải kết nối ví TON trước!", rGod:"CHÚA", rCom:"Chỉ huy", rKni:"Hiệp sĩ", rRec:"Tân binh", jPot:"🏆 Jackpot Mùa giải Tuần", burn:"🔥 Tổng lượng Đốt (Halving)", ph2:"🚨 Halving 2 (Chi phí 50%↓)", ph1:"⚠️ Halving 1 (Lợi nhuận 50%↓)", ph0:"🟢 Giai đoạn Bình thường", dGain:"Khai thác Tự động", unClm:"Chưa nhận", cBtn:"🚀 Nhận GOU", bfOn:"🔥 Đang kích hoạt Buff", bfCd:"⏳ Thời gian chờ", bfBtn:"📺 Xem QC: x2 Khai thác", arc:"🎰 Arcade Ngẫu nhiên", tkts:"🎟️ Vé", ads:"📺 QC Còn lại", adBtn:"📺 Xem QC nhận Vé", pBtn:"🎲 Vào Arcade", hTit:"🗺️ Lãnh thổ", hReq:"Yêu cầu Cấp:", gTit:"⚔️ Kho vũ khí Thần thoại", pTit:"🐉 Thần thú & Lâu đài", lvl:"Cấp", prob:"Tỉ lệ:", cost:"Chi phí:", upg:"N.Cấp", shTit:"💎 Cửa hàng GOU", buy:"MUA (TON)", nHom:"Tr.chủ", nUpg:"N.cấp", nShp:"C.Hàng", nRnk:"X.hạng", nSys:"Hệ thống", aNoG:"Không đủ GOU.", rSrv:"👑 BẢNG XẾP HẠNG SERVER", nTgt:"Nhập cấp độ mục tiêu:", h1:"Thảo nguyên", h2:"Rừng Thần", h3:"Sa mạc Bất tử", h4:"Rừng sâu", h5:"Núi lửa Chạng vạng", g1:"Kiếm của Zeus", g2:"Giáp của Ares", g3:"Mũ của Athena", g4:"Găng của Hephaestus", g5:"Giày của Hermes", g6:"Vòng cổ của Aphrodite", g7:"Nhẫn của Poseidon", s1:"ATK", s2:"HP", s3:"DEF", s4:"ACC", s5:"Thưởng", s6:"Giảm Chi phí", s7:"Tỉ lệ Thành công", p1:"Rồng Cổ đại", p2:"Lâu đài Đại vương", gBf:"Buff: ", pBf:"Thưởng Lợi nhuận: ", spec:"Đang săn ⚔️", lck1:"Mở khóa khi Trang bị +210", lck2:"Mở khóa khi Thú cưng +50", rnk1:"Hạng", rnk2:"Chỉ huy", rnk3:"Chỉ số", syMy:"👤 Thông tin", syFr:"🤝 N.vụ Mời", tgTit:"🛡️ Đổi Danh hiệu CHÚA", tgWd:"📤 Rút GOU", cpy:"🔗 Sao chép Liên kết", frSt:"🔥 Bạn bè đạt Hiệp sĩ", frMy:"🤝 Tiến độ Bạn bè", aMin:"Kiểm tra số lượng tối thiểu.", aMax:"Đạt mục tiêu!", aErr:"Không đủ số dư!", hSpec1:"🏰 Trái tim Đế chế", hSpec2:"🐉 Tổ Thần thú", aTkt:"Không đủ vé!", lTit:"🎟️ Xổ số Hot Time", lTm:"[Có sẵn] 12:00~14:00 / 18:00~20:00 (KST)", lOn:"Cào!", lOff:"Đang chờ...", lWait:"Hãy đợi Hot Time (12:00~14:00, 18:00~20:00 KST)!", lClaimed:"Đã nhận!", shNtTit:"🚨 [THÔNG BÁO] Tuyên bố Chính thức Cửa hàng GOU", shNt1:"Cửa hàng này không chỉ để nạp tiền mà là <b>Tuyến phòng thủ Kinh tế của Đế chế</b>. Bảo vệ người dùng khỏi sự thao túng của cá voi bên ngoài.", shNt2:"<b>📉 Ngăn chặn Bán tháo:</b> Thanh khoản DEX ban đầu được cố ý đặt ở mức thấp để ngăn chặn cá voi độc hại tích trữ/bán tháo.", shNt3:"<b>⚖️ Liên kết Oracle:</b> Giá GOU bám sát tỷ giá hoán đổi TON ↔ GOU theo thời gian thực để định giá công bằng.", shNt4:"<b>💧 100% Tái đầu tư LP:</b> Tất cả TON được thanh toán sẽ <b>tái đầu tư 100% vào Nhóm thanh khoản DEX GOU</b> để bảo vệ giá trị đồng coin!", depBtn:"📥 Nạp GOU", depPmt:"📥 Nạp GOU từ DEX.\nNhập số lượng:", depErr:"Số lượng không hợp lệ!" }
};

const ScratchLottery = ({ userRank, onReward, onClose, t }) => {
  const canvasRef = useRef(null); const [isCompleted, setIsCompleted] = useState(false); const [reward, setReward] = useState(0);
  const rankInfo = useMemo(() => {
    if (userRank.includes('GOD')) return [ {p:'80%', amt:'100M'}, {p:'15%', amt:'1B'}, {p:'4%', amt:'5B'}, {p:'1%', amt:'10B (Jackpot)'} ];
    if (userRank.includes(t.rCom)) return [ {p:'80%', amt:'50M'}, {p:'15%', amt:'100M'}, {p:'4%', amt:'500M'}, {p:'1%', amt:'1B (Jackpot)'} ];
    if (userRank.includes(t.rKni)) return [ {p:'80%', amt:'5M'}, {p:'15%', amt:'10M'}, {p:'4%', amt:'50M'}, {p:'1%', amt:'100M (Jackpot)'} ];
    return [ {p:'80%', amt:'500k'}, {p:'15%', amt:'1M'}, {p:'4%', amt:'5M'}, {p:'1%', amt:'10M (Jackpot)'} ];
  }, [userRank, t]);
  useEffect(() => {
    const roll = Math.random() * 100; let amt = 0;
    if (userRank.includes('GOD')) { if (roll < 80) amt = 100000000; else if (roll < 95) amt = 1000000000; else if (roll < 99) amt = 5000000000; else amt = 10000000000; }
    else if (userRank.includes(t.rCom)) { if (roll < 80) amt = 50000000; else if (roll < 95) amt = 100000000; else if (roll < 99) amt = 500000000; else amt = 1000000000; }
    else if (userRank.includes(t.rKni)) { if (roll < 80) amt = 5000000; else if (roll < 95) amt = 10000000; else if (roll < 99) amt = 50000000; else amt = 100000000; }
    else { if (roll < 80) amt = 500000; else if (roll < 95) amt = 1000000; else if (roll < 99) amt = 5000000; else amt = 10000000; }
    setReward(amt);
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#b0bec5'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.font = 'bold 22px Pretendard, sans-serif'; ctx.fillStyle = '#78909c'; ctx.textAlign = 'center'; ctx.fillText('SCRATCH!', canvas.width/2, canvas.height/2 + 7);
  }, [userRank, t]);
  const handleScratch = (e) => {
    if(isCompleted) return; const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left; const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x, y, 25, 0, Math.PI * 2); ctx.fill();
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data; let transparent = 0;
    for(let i=3; i<pixels.length; i+=4) if(pixels[i] === 0) transparent++;
    if(transparent / (canvas.width * canvas.height) > 0.5) { setIsCompleted(true); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  };
  return (
    <div style={{ position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.95)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
       <h2 style={{color:'#fbbf24', textShadow:'0 0 10px #fbbf24', marginBottom:'15px', animation:'pulse 1.5s infinite'}}>🔥 {t.lTit} 🔥</h2>
       <div style={{ background:'rgba(255,255,255,0.1)', padding:'15px', borderRadius:'10px', marginBottom:'20px', width:'300px', border:'1px solid #555' }}>
          <div style={{ color:'#06b6d4', fontSize:'14px', fontWeight:'bold', textAlign:'center', marginBottom:'10px' }}>[{userRank}] RATES</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', fontSize:'12px', color:'#fff' }}>
             {rankInfo.map((info, idx) => ( <div key={idx} style={{ display:'flex', justifyContent:'space-between', background:'rgba(0,0,0,0.5)', padding:'5px 10px', borderRadius:'5px' }}> <span style={{color: idx===3 ? '#fbbf24' : '#ccc'}}>{info.p}</span> <span style={{fontWeight:'bold', color: idx===3 ? '#fbbf24' : '#fff'}}>{info.amt}</span> </div> ))}
          </div>
       </div>
       <div style={{ position:'relative', width:'300px', height:'150px', background:'#222', borderRadius:'15px', border:'3px solid #fbbf24', overflow:'hidden', boxShadow:'0 0 30px rgba(251,191,36,0.6)' }}>
           <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', width:'100%' }}>
               <div style={{ color:'#fbbf24', fontSize:'24px', fontWeight:'900' }}>🎉 WIN 🎉</div>
               <div style={{ color:'#fff', fontSize:'22px', fontWeight:'bold', marginTop:'5px' }}>{reward.toLocaleString()} GOU</div>
           </div>
           <canvas ref={canvasRef} width={300} height={150} style={{ position:'absolute', top:0, left:0, cursor:'crosshair', touchAction:'none' }} onPointerDown={(e)=>{e.target.setPointerCapture(e.pointerId); handleScratch(e);}} onPointerMove={(e)=>{if(e.buttons>0) handleScratch(e);}} onTouchMove={(e)=>{e.preventDefault(); handleScratch(e);}} />
       </div>
       {isCompleted && <button onClick={()=>{ onReward(reward); onClose(); }} style={{ marginTop:'30px', background:'linear-gradient(90deg, #fbbf24, #d97706)', color:'#000', padding:'15px 40px', borderRadius:'10px', fontSize:'18px', fontWeight:'900', border:'none', boxShadow:'0 5px 15px rgba(251,191,36,0.5)', cursor:'pointer' }}>{t.cBtn}</button>}
       {!isCompleted && <button onClick={onClose} style={{ marginTop:'20px', background:'transparent', border:'none', color:'#888', textDecoration:'underline', cursor:'pointer' }}>Close</button>}
    </div>
  );
};

const ArcadeGames = ({ type, onClose, onReward, pReward, gReward, t }) => {
  const [status, setStatus] = useState('playing'); const [pos, setPos] = useState(0);
  const posRef = useRef(0); const dirRef = useRef(1); const reqRef = useRef(); const lastTimeRef = useRef();
  const [stacked, setStacked] = useState(0); const [basePos, setBasePos] = useState(50); 
  const [targets, setTargets] = useState([]); const catchScoreRef = useRef(0); const catchSpawnRef = useRef(0);
  const [memSeq, setMemSeq] = useState([]); const [userSeq, setUserSeq] = useState([]); const [flashIdx, setFlashIdx] = useState(-1);

  const animate = useCallback((time) => {
    if (lastTimeRef.current != null) {
      const dt = time - lastTimeRef.current;
      let speed = type === 'blacksmith' ? 0.26 : 0.24 + (stacked * 0.06); 
      posRef.current += dirRef.current * speed * dt;
      if (posRef.current >= 100) { posRef.current = 100; dirRef.current = -1; }
      if (posRef.current <= 0) { posRef.current = 0; dirRef.current = 1; }
      setPos(posRef.current);
    }
    lastTimeRef.current = time;
    if (status === 'playing' && (type === 'blacksmith' || type === 'tower')) { reqRef.current = requestAnimationFrame(animate); }
  }, [status, type, stacked]);

  useEffect(() => { if (status === 'playing' && (type === 'blacksmith' || type === 'tower')) { reqRef.current = requestAnimationFrame(animate); } return () => cancelAnimationFrame(reqRef.current); }, [status, animate, type]);
  useEffect(() => {
    if(type === 'catch' && status === 'playing') {
      catchScoreRef.current = 0; catchSpawnRef.current = 0;
      const spawnNext = () => {
        if (catchSpawnRef.current >= 5) { setTimeout(() => { const score = catchScoreRef.current; if(score === 5) setStatus('perfect'); else if(score >= 3) setStatus('good'); else setStatus('miss'); }, 250); return; }
        const id = catchSpawnRef.current; const newTarget = { id, top: Math.random()*60 + 10 + '%', left: Math.random()*70 + 10 + '%' };
        setTargets([newTarget]); catchSpawnRef.current++;
        setTimeout(() => { setTargets(prev => prev.filter(target => target.id !== id)); setTimeout(spawnNext, 90); }, 380); 
      };
      setTimeout(spawnNext, 250); 
    }
  }, [type, status]);
  useEffect(() => {
    if(type === 'memory' && status === 'playing') {
      const seq = [Math.floor(Math.random()*4), Math.floor(Math.random()*4), Math.floor(Math.random()*4), Math.floor(Math.random()*4), Math.floor(Math.random()*4)];
      setMemSeq(seq); setUserSeq([]); let i = 0;
      const interval = setInterval(() => { if(i < seq.length) { setFlashIdx(seq[i]); setTimeout(() => setFlashIdx(-1), 60); i++; } else { clearInterval(interval); } }, 180); 
      return () => clearInterval(interval);
    }
  }, [type, status]);

  const handleHit = (e) => {
    if (e) e.preventDefault(); if(status !== 'playing') return;
    if (type === 'blacksmith') { cancelAnimationFrame(reqRef.current); if (posRef.current >= 45 && posRef.current <= 55) setStatus('perfect'); else if (posRef.current >= 30 && posRef.current <= 70) setStatus('good'); else setStatus('miss'); } 
    else if (type === 'tower') {
      if (stacked === 0) { setBasePos(posRef.current); setStacked(1); } 
      else { const diff = Math.abs(posRef.current - basePos); if (diff <= 15) { const nextStacked = stacked + 1; setStacked(nextStacked); if (nextStacked === 3) { cancelAnimationFrame(reqRef.current); setStatus('perfect'); } } else { cancelAnimationFrame(reqRef.current); if (stacked === 2) setStatus('good'); else setStatus('miss'); } }
    }
  };
  const handleCatch = (e, id) => { if (e) e.preventDefault(); if(status !== 'playing') return; catchScoreRef.current++; setTargets([]); };
  const handleMemoryClick = (e, idx) => {
    if (e) e.preventDefault(); if(status !== 'playing' || memSeq.length === 0 || flashIdx !== -1) return;
    const newSeq = [...userSeq, idx]; setUserSeq(newSeq);
    if(newSeq[newSeq.length-1] !== memSeq[newSeq.length-1]) { if (newSeq.length - 1 >= 3) setStatus('good'); else setStatus('miss'); } else if(newSeq.length === memSeq.length) { setStatus('perfect'); }
  };

  return (
    <div style={{ position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(10,12,18,0.95)', backdropFilter: 'blur(10px)', zIndex:20000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
       <h2 style={{color:'#fbbf24', fontSize:'28px', marginBottom:'20px'}}>{t.arc}</h2>
       <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid #555', padding: '10px 20px', borderRadius: '10px', marginBottom: '30px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 'bold', marginBottom: '5px' }}>REWARD TIERS</div>
          <div style={{ fontSize: '14px', color: '#fff' }}>PERFECT: <span style={{ color: '#10b981', fontWeight: 'bold' }}>{pReward.toLocaleString()}</span> GOU <br/> GOOD: <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{gReward.toLocaleString()}</span> GOU</div>
        </div>
       <div style={{width:'90%', maxWidth:'400px', height:'200px', position:'relative', display:'flex', justifyContent:'center', alignItems:'center', marginBottom:'30px'}}>
         {type === 'blacksmith' && (
            <div style={{ position: 'relative', width: '100%', height: '40px', background: '#222', border: '2px solid #555', borderRadius: '20px' }}>
              <div style={{ position: 'absolute', left: '30%', width: '40%', height: '100%', background: 'rgba(251, 191, 36, 0.4)' }}></div>
              <div style={{ position: 'absolute', left: '45%', width: '10%', height: '100%', background: 'rgba(6, 182, 212, 0.8)' }}></div>
              <div style={{ position: 'absolute', left: `${pos}%`, width: '6px', height: '60px', background: '#fff', top: '-10px', boxShadow: '0 0 15px #fff', transform: 'translateX(-50%)', borderRadius: '3px' }}></div>
            </div>
         )}
         {type === 'tower' && (
            <div style={{ position: 'relative', width: '100%', height: '180px', borderBottom: '4px solid #fff' }}>
              {stacked > 0 && <div style={{position:'absolute', left:`${basePos}%`, width:'2px', height:'100%', background:'rgba(255,255,255,0.2)', transform:'translateX(-50%)'}}></div>}
              {Array.from({length: stacked}).map((_, i) => ( <div key={i} style={{ position: 'absolute', left: `${basePos}%`, width: '25%', height: '30px', background: '#fbbf24', bottom: `${i*30}px`, transform: 'translateX(-50%)', borderRadius:'4px', border:'1px solid #000' }}></div> ))}
              {status === 'playing' && stacked > 0 && <div style={{ position: 'absolute', left: `${basePos}%`, width: '25%', height: '30px', bottom: `${stacked*30}px`, background: 'rgba(6, 182, 212, 0.3)', border: '2px dashed #06b6d4', transform: 'translateX(-50%)' }}></div>}
              {status === 'playing' && <div style={{ position: 'absolute', left: `${pos}%`, width: '25%', height: '30px', background: '#fbbf24', bottom: `${stacked*30}px`, border:'2px solid #fff', transform: 'translateX(-50%)', borderRadius:'4px' }}></div>}
            </div>
         )}
         {type === 'catch' && (
            <div style={{ width: '100%', height: '100%', position: 'relative', background:'rgba(0,0,0,0.5)', borderRadius:'15px', border:'1px solid #333', overflow:'hidden', touchAction: 'none' }}>
              <div style={{position:'absolute', top:10, left:10, color:'#fbbf24', fontWeight:'bold', zIndex:10}}>SCORE: {catchScoreRef.current} / 5</div>
              {targets.map(tg => ( <div key={tg.id} onPointerDown={(e) => handleCatch(e, tg.id)} style={{ position:'absolute', top:tg.top, left:tg.left, fontSize:'50px', cursor:'pointer', padding:'10px', filter:'drop-shadow(0 0 10px #fbbf24)', transition: 'top 0.1s, left 0.1s', userSelect: 'none' }}>📦</div> ))}
            </div>
         )}
         {type === 'memory' && (
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', touchAction: 'none'}}>
              <div style={{color:'#06b6d4', marginBottom:'15px', fontWeight:'bold', fontSize:'16px'}}>MEMORIZE! ({userSeq.length}/5)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {[0,1,2,3].map(i => ( <div key={i} onPointerDown={(e) => handleMemoryClick(e, i)} style={{ width: '80px', height: '80px', borderRadius: '15px', background: flashIdx === i ? '#fff' : ['#ef4444','#3b82f6','#10b981','#fbbf24'][i], opacity: flashIdx === i ? 1 : 0.6, cursor: 'pointer', transition: 'background 0.1s, opacity 0.1s', boxShadow: flashIdx === i ? '0 0 20px #fff' : 'none', userSelect: 'none' }}></div> ))}
              </div>
            </div>
         )}
       </div>
       {status === 'playing' ? (
         <div style={{ display: 'flex', gap: '15px' }}>
           <button onClick={onClose} style={{ background: '#333', color: '#fff', padding: '15px 30px', borderRadius: '15px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>RUN</button>
           {(type === 'blacksmith' || type === 'tower') && ( <button onPointerDown={handleHit} style={{ background: 'linear-gradient(90deg, #ef4444, #b91c1c)', color: '#fff', padding: '15px 50px', borderRadius: '15px', fontSize: '20px', fontWeight: '900', border: 'none', boxShadow: '0 5px 20px rgba(239, 68, 68, 0.5)', cursor: 'pointer', userSelect: 'none', touchAction: 'none' }}>💥 STOP!</button> )}
         </div>
       ) : (
         <div style={{ textAlign: 'center', animation: 'flashSuccess 0.5s ease-out' }}>
            <div style={{ fontSize: '36px', fontWeight: '900', color: status === 'perfect' ? '#06b6d4' : status === 'good' ? '#fbbf24' : '#ef4444', marginBottom: '10px' }}>{status.toUpperCase()}!!</div>
            <div style={{ fontSize: '18px', color: '#fff', marginBottom: '30px' }}>REWARD: <span style={{ color: status !== 'miss' ? '#10b981' : '#ef4444', fontWeight:'bold' }}>{status !== 'miss' ? `+${(status === 'perfect' ? pReward : gReward).toLocaleString()} GOU` : 'NONE'}</span></div>
            <button onClick={() => onReward(status === 'perfect' ? pReward : status === 'good' ? gReward : 0)} style={{ background: '#fbbf24', color: '#000', padding: '15px 40px', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(251,191,36,0.4)' }}>CLAIM & EXIT</button>
         </div>
       )}
    </div>
  );
};

// 🚨 [최적화 1] React.memo 장갑판 탑재! 1초마다 불필요하게 카드가 번쩍거리는 렉을 100% 차단합니다!
const UpgradeCard = React.memo(({ item, type, isMax, cost, onUpgrade, onAuto, autoActive, animClass, boxAnimClass, specialHunt, t }) => (
  <div className={`glass-panel ${boxAnimClass}`} style={{ padding: '12px', display: 'flex', flexDirection: type === 'gear' ? 'column' : 'row', alignItems: 'center', gap: type === 'gear' ? '0' : '20px', marginBottom: type === 'gear' ? 0 : '12px', borderTop: type === 'gear' ? '4px solid rgba(197,160,89,0.8)' : 'none', position:'relative', overflow:'hidden' }}>
    {item.locked && ( <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}> <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '11px', padding: '8px 15px', border: '1px solid #fbbf24', borderRadius: '6px', background: 'rgba(0,0,0,0.9)', textAlign: 'center' }}>🔒 {item.lockMsg}</div> </div> )}
    <div className="img-box-gear" style={type !== 'gear' ? { width: '130px', height: '130px', margin: '0' } : {}}> <img src={`${process.env.PUBLIC_URL}/${item.imgFile}`} alt={item.name} onError={(e)=>{e.target.style.opacity='0'; e.target.nextSibling.style.display='block';}} /> <span style={{ display: 'none', fontSize: '35px', position: 'absolute' }}>{item.emoji}</span> </div>
    <div style={type !== 'gear' ? { flex: 1 } : { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {type === 'gear' && <div style={{ fontSize: '10px', color: '#c5a059', fontWeight: 'bold', marginTop: '6px' }}>[{item.statText}]</div>}
      <div style={{ fontSize: type === 'gear' ? '12px' : '18px', fontWeight: '900', margin: '4px 0', color: type === 'gear' ? '#fbbf24' : '#fbbf24', textAlign: type === 'gear' ? 'center' : 'left' }}> {item.name} <span className={animClass} style={{ color: type === 'gear' ? '#fbbf24' : '#fff', fontSize: type === 'gear' ? 'inherit' : '13px', display: 'inline-block', marginLeft: type !== 'gear' ? '5px' : '0' }}><br/>+{item.lvl}</span> </div>
      <div style={{ color: '#ccc', fontSize: '11px', lineHeight: '1.4', textAlign: type === 'gear' ? 'center' : 'left', background: 'rgba(0,0,0,0.4)', padding: '5px', borderRadius: '5px', width: '100%' }}> {item.bonusText}<br/>{t.prob} <span style={{color: isMax ? '#fbbf24' : '#06b6d4', fontWeight: 'bold'}}>{isMax ? 'MAX' : `${item.successRateDisplay}%`}</span><br/>{t.cost} <span style={{color: '#fbbf24', fontWeight: 'bold'}}>{isMax ? 'MAX' : `${cost.toLocaleString()}${type !== 'gear' ? ' GOU' : ''}`}</span> </div>
      <div style={{ display: 'flex', width: '100%', gap: '4px', marginTop: '8px' }}>
        <button onClick={() => onUpgrade(type, item.id)} disabled={isMax || autoActive} className="action-btn" style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid #fbbf24', padding:'8px', fontSize:'12px' }}>{t.upg}</button>
        <button onClick={() => onAuto(type, item.id)} disabled={isMax} className="action-btn" style={{ background: autoActive ? 'rgba(6,182,212,0.3)' : 'rgba(0,0,0,0.6)', color: autoActive ? '#06b6d4' : '#888', border: `1px solid ${autoActive ? '#06b6d4' : '#555'}`, padding:'8px', fontSize:'12px' }}>{autoActive ? 'STOP' : 'AUTO'}</button>
      </div>
      {specialHunt && isMax && ( <button onClick={specialHunt.onStart} disabled={specialHunt.isHunting} className="action-btn" style={{ width: '100%', marginTop: '8px', padding:'10px', fontSize:'12px', background: specialHunt.isHunting ? '#333' : 'rgba(147,51,234,0.3)', color: specialHunt.isHunting ? '#888' : '#a855f7', border: `1px solid ${specialHunt.isHunting ? '#444' : '#a855f7'}` }}>{specialHunt.isHunting ? t.spec : specialHunt.huntText}</button> )}
    </div>
  </div>
), (prevProps, nextProps) => {
  // 컴포넌트 최적화 로직: 레벨, 비용, 상태가 변할 때만 새로 그립니다.
  return prevProps.item.lvl === nextProps.item.lvl &&
         prevProps.isMax === nextProps.isMax &&
         prevProps.cost === nextProps.cost &&
         prevProps.autoActive === nextProps.autoActive &&
         prevProps.animClass === nextProps.animClass &&
         prevProps.boxAnimClass === nextProps.boxAnimClass &&
         prevProps.item.locked === nextProps.item.locked &&
         prevProps.specialHunt?.isHunting === nextProps.specialHunt?.isHunting;
});

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const toggleBGM = () => {
    if (audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); } 
      else { audioRef.current.play().catch(e => console.log(e)); setIsPlaying(true); }
    }
  };

  const ticketAdRef = useRef(null);
  const buffAdRef = useRef(null);
  
  useEffect(() => {
    if (window.Adsgram) {
      ticketAdRef.current = window.Adsgram.init({ blockId: "34107" });
      buffAdRef.current = window.Adsgram.init({ blockId: "34108" });
    }
  }, []);

  const [lang, setLang] = useState('ko');
  const [showLangMenu, setShowLangMenu] = useState(false);
  useEffect(() => {
    const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    if (tgLang) {
      if (tgLang.startsWith('ko')) setLang('ko'); else if (tgLang.startsWith('ru')) setLang('ru'); else if (tgLang.startsWith('zh')) setLang('zh'); else if (tgLang.startsWith('ja')) setLang('ja'); else if (tgLang.startsWith('es')) setLang('es'); else if (tgLang.startsWith('vi')) setLang('vi'); else setLang('en');
    }
  }, []);
  const t = i18n[lang] || i18n['en'];

  const [activeTab, setActiveTab] = useState('home'); const [settingTab, setSettingTab] = useState('friend'); 
  const [invitedFriends] = useState([{ name: "User1", rank: t.rRec, petLvl: 0, castleLvl: 0 }]); const [validInvites] = useState(0); 

  const hunts = useMemo(() => [
    {name: t.h1, mult: 1, reqSum: 0, req: {atk:0, hp:0, def:0, acc:0}}, {name: t.h2, mult: 1.5, reqSum: 35, req: {atk:50, hp:500, def:25, acc:10}},
    {name: t.h3, mult: 2.5, reqSum: 70, req: {atk:100, hp:1000, def:50, acc:20}}, {name: t.h4, mult: 5, reqSum: 110, req: {atk:170, hp:1700, def:75, acc:34}}, {name: t.h5, mult: 12, reqSum: 150, req: {atk:230, hp:2300, def:115, acc:46}}
  ], [t]);

  const [state, setState] = useState({ walletAddress: '', balance: 0, burned: 0, jackpot: 0, pendingGOU: 0, unclaimedTime: 0, userName: "Commander", petLevel: 0, castleLevel: 0, petHuntEndTime: 0, castleHuntEndTime: 0, isAdActive: false, adTimeLeft: 0, tickets: 3, adViewsLeft: 3, nextAdChargeTime: 0, nextBuffAdTime: 0, lastLotterySlot: "", lastDailyReset: Math.floor((Date.now() + 9 * 3600000) / 86400000), customGodTitle: "UPGRADE" });

  const lockRef = useRef({}); const autoActiveRef = useRef({}); const levelsRef = useRef({}); 
  const [autoUI, setAutoUI] = useState({}); const [lvlAnims, setLvlAnims] = useState({}); 
  const [anims, setAnims] = useState({}); const [activeModal, setActiveModal] = useState(null); 
  const [showLottery, setShowLottery] = useState(false);

  const [gears, setGears] = useState([
    {id: 'sword', lvl: 0, base: 10, unit: '', imgFile: 'sword.jpg', emoji: '⚡'}, {id: 'armor', lvl: 0, base: 100, unit: '', imgFile: 'armor.jpg', emoji: '🔥'},
    {id: 'helmet', lvl: 0, base: 5, unit: '', imgFile: 'helmet.jpg', emoji: '🦉'}, {id: 'gloves', lvl: 0, base: 2, unit: '', imgFile: 'gloves.jpg', emoji: '🔨'},
    {id: 'boots', lvl: 0, base: 5, unit: '%', imgFile: 'shoes.jpg', emoji: '🪽'}, {id: 'necklace', lvl: 0, base: 0.5, unit: '%', imgFile: 'necklace.jpg', emoji: '🌹'}, {id: 'ring', lvl: 0, base: 0.1, unit: '%', imgFile: 'ring.jpg', emoji: '🌊'}
  ]);

  const wallet = useTonWallet(); const [tonConnectUI] = useTonConnectUI();

  useEffect(() => { gears.forEach(g => levelsRef.current[g.id] = g.lvl); levelsRef.current['pet'] = state.petLevel; levelsRef.current['castle'] = state.castleLevel; levelsRef.current['balance'] = state.balance; levelsRef.current['necklace'] = gears.find(g => g.id === 'necklace')?.lvl || 0; levelsRef.current['ring'] = gears.find(g => g.id === 'ring')?.lvl || 0; });
  const triggerAnim = useCallback((id, type) => { setAnims(p => ({ ...p, [id]: type })); setTimeout(() => setAnims(p => ({ ...p, [id]: null })), 250); }, []);
  const triggerLvlAnim = useCallback((id, type) => { setLvlAnims(p => ({ ...p, [id]: type })); setTimeout(() => setLvlAnims(p => ({ ...p, [id]: null })), 200); }, []);

  const totalGearLevel = gears.reduce((a, b) => a + b.lvl, 0); const minLvl = Math.min(...gears.map(g => g.lvl)); const setBonus = minLvl >= 30 ? 500 : minLvl >= 20 ? 200 : minLvl >= 10 ? 100 : 0;
  const isPetUnlocked = totalGearLevel >= 210; const isCastleUnlocked = state.petLevel >= 50;

  const userRankTitle = useMemo(() => { if (state.castleLevel >= 50) return `${state.customGodTitle} ${t.rGod}`; if (state.petLevel >= 50) return t.rCom; if (totalGearLevel >= 210) return t.rKni; return t.rRec; }, [state.castleLevel, state.petLevel, totalGearLevel, state.customGodTitle, t]);
  const rankings = useMemo(() => { const myScore = state.castleLevel * 100000 + state.petLevel * 1000 + totalGearLevel; const myData = { name: state.userName, title: userRankTitle, score: myScore, isMe: true, c: state.castleLevel, p: state.petLevel, g: totalGearLevel }; return [myData].sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 })); }, [state.userName, userRankTitle, state.castleLevel, state.petLevel, totalGearLevel]);
  const currentStats = useMemo(() => ({ atk: gears[0].lvl * gears[0].base, hp: gears[1].lvl * gears[1].base, def: gears[2].lvl * gears[2].base, acc: gears[3].lvl * gears[3].base, sum: totalGearLevel }), [gears, totalGearLevel]);

  const { pReward, gReward } = useMemo(() => { let p = 1000000; let g = 200000; if (state.castleLevel >= 50) { p = 1000000000; g = 200000000; } else if (state.petLevel >= 50) { p = 100000000; g = 20000000; } else if (totalGearLevel >= 210) { p = 10000000; g = 2000000; } return { pReward: p, gReward: g }; }, [state.castleLevel, state.petLevel, totalGearLevel]);

  const getPetBonus = useCallback((lvl) => { if (lvl >= 50) return 1000; if (lvl >= 40) return 800; if (lvl >= 30) return 600; if (lvl >= 20) return 400; if (lvl >= 10) return 200; return 0; }, []);
  const getCastleBonus = useCallback((lvl) => { if (lvl >= 50) return 1500; if (lvl >= 40) return 1200; if (lvl >= 30) return 900; if (lvl >= 20) return 600; if (lvl >= 10) return 300; return 0; }, []);

  const isPhase2 = state.burned >= MAX_SUPPLY * 0.6; const isPhase1 = !isPhase2 && state.burned >= MAX_SUPPLY * 0.3;
  const gainHalvingMult = isPhase2 ? 0.25 : (isPhase1 ? 0.5 : 1.0); const costHalvingMult = isPhase2 ? 0.5 : 1.0; 
  const totalBonusPct = (totalGearLevel * 2) + setBonus + (isPetUnlocked ? state.petLevel * 3 : 0) + getPetBonus(state.petLevel) + (isCastleUnlocked ? state.castleLevel * 5 : 0) + getCastleBonus(state.castleLevel); 
  
  const calculateCost = useCallback((lvl, type, nLvl) => { const tier = Math.floor(lvl / 10); const baseMult = type === 'castle' ? 10000 : 1000; return Math.floor(((lvl % 10) + 1) * Math.pow(10, tier) * baseMult * (1 - (nLvl * 0.005)) * costHalvingMult); }, [costHalvingMult]);
  const getCost = useCallback((lvl) => calculateCost(lvl, 'gear', levelsRef.current['necklace']), [calculateCost]);
  const getPetCost = useCallback((lvl) => calculateCost(lvl, 'pet', levelsRef.current['necklace']), [calculateCost]);
  const getCastleCost = useCallback((lvl) => calculateCost(lvl, 'castle', levelsRef.current['necklace']), [calculateCost]);

  const getSuccessRateDisplay = (lvl, type) => {
    const ringBonus = (levelsRef.current['ring'] || 0) * 0.1; let base = 100;
    if (type === 'gear') { if (lvl >= 6 && lvl <= 10) base = 70; else if (lvl >= 11 && lvl <= 15) base = 60; else if (lvl >= 16 && lvl <= 20) base = 50; else if (lvl >= 21) base = 50 - ((lvl - 20) * 2); } 
    else { if (lvl >= 6 && lvl <= 10) base = 70; else if (lvl >= 11 && lvl <= 15) base = 65; else if (lvl >= 16 && lvl <= 20) base = 60; else if (lvl >= 21 && lvl <= 25) base = 55; else if (lvl >= 26 && lvl <= 30) base = 50; else if (lvl >= 31 && lvl <= 35) base = 45; else if (lvl >= 36 && lvl <= 40) base = 40; else if (lvl >= 41) base = 40 - ((lvl - 40) * 2); }
    return Math.max(0, base + ringBonus).toFixed(1);
  };

  const checkHunt = useCallback((now, stats, huntState) => {
    if (huntState.castleHuntEndTime > now) return { name: t.hSpec1, mult: 50, isSpecial: true };
    if (huntState.petHuntEndTime > now) return { name: t.hSpec2, mult: 30, isSpecial: true };
    return hunts.slice().reverse().find(h => stats.atk >= h.req.atk && stats.hp >= h.req.hp && stats.def >= h.req.def && stats.acc >= h.req.acc && stats.sum >= h.reqSum) || hunts[0];
  }, [hunts, t]);

  const currentHuntData = checkHunt(Date.now(), currentStats, state);
  const dailyGainDisplay = Math.floor(300000 * currentHuntData.mult * (1 + totalBonusPct / 100) * gainHalvingMult * (state.isAdActive ? 2.0 : 1.0));

  const activeHuntsToRender = useMemo(() => {
    const arr = [...hunts]; const now = Date.now();
    if (state.castleHuntEndTime > now) arr.unshift({ name: t.hSpec1, mult: 50, isSpecial: true, endTime: state.castleHuntEndTime });
    if (state.petHuntEndTime > now) arr.unshift({ name: t.hSpec2, mult: 30, isSpecial: true, endTime: state.petHuntEndTime });
    return arr;
  }, [hunts, state.castleHuntEndTime, state.petHuntEndTime, t]);

  const getUserId = () => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      return String(window.Telegram.WebApp.initDataUnsafe.user.id);
    }
    let localUid = localStorage.getItem('gou_test_uid');
    if (!localUid) {
      localUid = 'test_' + Math.floor(Math.random() * 1000000000);
      localStorage.setItem('gou_test_uid', localUid);
    }
    return localUid;
  };

  const requireWallet = (actionCallback) => {
    if (!wallet) { alert(t.wWarn); tonConnectUI.openModal(); return; }
    actionCallback();
  };

  const handleTestReset = async () => {
    if(window.confirm("🚨 테스트 계정을 초기화하고 55만 GOU를 지급받으시겠습니까?")) {
      try {
        await httpsCallable(getFunctions(app), 'resetAccount')({ userId: getUserId(), initData: window.Telegram?.WebApp?.initData || "" });
        alert("초기화 완료! 화면을 새로고침합니다.");
        window.location.reload();
      } catch (e) {
        alert("초기화 실패: 백엔드를 확인하세요.");
      }
    }
  };

  useEffect(() => {
    httpsCallable(getFunctions(app), 'syncUserInfo')({ userId: getUserId(), title: userRankTitle, name: state.userName, initData: window.Telegram?.WebApp?.initData || "" }).then(res => {
        if (res.data && res.data.userData) {
          const d = res.data.userData;
          const sys = res.data.systemData || {}; 

          const serverNow = Date.now();
          let elapsedMs = serverNow - (d.lastClaimTime || serverNow);
          if (elapsedMs > 12 * 60 * 60 * 1000) elapsedMs = 12 * 60 * 60 * 1000;
          if (elapsedMs < 0) elapsedMs = 0;

          let tempTotalGear = 0; let tAtk=0, tHp=0, tDef=0, tAcc=0;
          if (d.gears) {
              d.gears.forEach(g => {
                  tempTotalGear += g.lvl || 0;
                  if(g.id === 'sword') tAtk = g.lvl * 10;
                  if(g.id === 'armor') tHp = g.lvl * 100;
                  if(g.id === 'helmet') tDef = g.lvl * 5;
                  if(g.id === 'gloves') tAcc = g.lvl * 2;
              });
          }
          const minL = d.gears ? Math.min(...d.gears.map(g=>g.lvl||0)) : 0;
          const setB = minL >= 30 ? 500 : minL >= 20 ? 200 : minL >= 10 ? 100 : 0;
          const pLvl = d.petLevel || 0; const cLvl = d.castleLevel || 0;
          const isPUnl = tempTotalGear >= 210; const isCUnl = pLvl >= 50;

          const pB = pLvl>=50?1000:pLvl>=40?800:pLvl>=30?600:pLvl>=20?400:pLvl>=10?200:0;
          const cB = cLvl>=50?1500:cLvl>=40?1200:cLvl>=30?900:cLvl>=20?600:cLvl>=10?300:0;
          const tempBonusPct = (tempTotalGear * 2) + setB + (isPUnl?pLvl*3:0) + pB + (isCUnl?cLvl*5:0) + cB;

          const hArr = [
              { mult: 1, reqSum: 0, req: {atk:0, hp:0, def:0, acc:0}},
              { mult: 1.5, reqSum: 35, req: {atk:50, hp:500, def:25, acc:10}},
              { mult: 2.5, reqSum: 70, req: {atk:100, hp:1000, def:50, acc:20}},
              { mult: 5, reqSum: 110, req: {atk:170, hp:1700, def:75, acc:34}},
              { mult: 12, reqSum: 150, req: {atk:230, hp:2300, def:115, acc:46}}
          ];
          const vHunt = hArr.slice().reverse().find(h => tAtk >= h.req.atk && tHp >= h.req.hp && tDef >= h.req.def && tAcc >= h.req.acc && tempTotalGear >= h.reqSum) || hArr[0];
          let huntMult = vHunt.mult;
          if ((d.castleHuntEndTime || 0) > serverNow) huntMult = 50;
          else if ((d.petHuntEndTime || 0) > serverNow) huntMult = 30;

          const burned = sys.burn || 0;
          const isP2 = burned >= 10000000000000 * 0.6;
          const isP1 = !isP2 && burned >= 10000000000000 * 0.3;
          const gMult = isP2 ? 0.25 : (isP1 ? 0.5 : 1.0);

          const gainPerSec = ((300000 * huntMult * (1 + tempBonusPct / 100)) / 86400) * gMult;
          const offlinePending = (elapsedMs / 1000) * gainPerSec;
          const offlineUnclaimedTime = Math.floor(elapsedMs / 1000);

          setState(s => ({
            ...s,
            balance: d.balance ?? 50000,
            petLevel: d.petLevel ?? 0,
            castleLevel: d.castleLevel ?? 0,
            tickets: d.tickets ?? 3,
            adViewsLeft: d.adViewsLeft ?? 3,
            nextAdChargeTime: d.nextAdChargeTime ?? 0,
            nextBuffAdTime: d.nextBuffAdTime ?? 0,
            lastLotterySlot: d.lastLotterySlot ?? "",
            jackpot: sys.jackpot || 0,
            burned: sys.burn || 0,
            pendingGOU: offlinePending,
            unclaimedTime: offlineUnclaimedTime
          }));
          
          if (d.gears && d.gears.length > 0) setGears(prev => prev.map(g => { const saved = d.gears.find(sg => sg.id === g.id); return saved ? { ...g, lvl: saved.lvl } : g; }));
        }
    }).catch(e => console.log(e));
  }, []);

  useEffect(() => {
    if (wallet) { setState(s => ({ ...s, walletAddress: wallet.account.address.substring(0, 6) + '...' + wallet.account.address.substring(wallet.account.address.length - 4) })); } 
    else { setState(s => ({ ...s, walletAddress: '' })); }
  }, [wallet]);

  const withdrawGOU = async () => {
    requireWallet(async () => {
      if (totalGearLevel < 140) return alert(`LVL 140+ Required!`);
      if (state.balance < 10000000) return alert(t.aMin);
      const input = window.prompt(`${t.tgWd} (5% Fee) | Balance: ${Math.floor(state.balance)}`, 10000000);
      if (!input) return; const amount = parseInt(input, 10);
      if (isNaN(amount) || amount < 10000000 || amount > state.balance) return alert(t.aMin);
      if (!window.confirm(`${amount.toLocaleString()} GOU?`)) return;
      setState(s => ({...s, balance: s.balance - amount, burned: s.burned + (amount * 0.05) }));
      try { await httpsCallable(getFunctions(app), 'withdrawGOU')({ userId: getUserId(), amount, initData: window.Telegram?.WebApp?.initData || "" }); alert("OK!"); } catch (e) { alert("Error!"); }
    });
  };

  const depositGOU = async () => {
    requireWallet(async () => {
      const input = window.prompt(t.depPmt, "10000000");
      if (!input) return; 
      const amount = parseInt(input, 10);
      if (isNaN(amount) || amount <= 0) return alert(t.depErr);
      alert(`[Deposit] Sending ${amount.toLocaleString()} GOU!`);
    });
  };

  const handleBuyGOU = async (tonAmount, gouAmount) => {
    requireWallet(async () => {
      const transaction = { validUntil: Math.floor(Date.now() / 1000) + 60, messages: [{ address: ADMIN_WALLET_ADDRESS, amount: String(tonAmount * 1e9) }] };
      try { const result = await tonConnectUI.sendTransaction(transaction); const res = await httpsCallable(getFunctions(app), 'buyGOU')({ userId: getUserId(), amount: gouAmount, txHash: result.boc, initData: window.Telegram?.WebApp?.initData || "" }); if (res.data.success) { setState(s => ({...s, balance: s.balance + gouAmount})); alert(`OK! +${gouAmount.toLocaleString()} GOU`); } } catch (e) { alert("Cancel"); }
    });
  };

  const claimGOU = async () => {
    const gain = Math.floor(state.pendingGOU); if (gain < 10) return alert(t.aMin);
    setState(s => ({ ...s, balance: s.balance + gain, pendingGOU: 0, unclaimedTime: 0 })); triggerAnim('claim', 'success');
    localStorage.setItem('gou_offline_pending', '0');
    localStorage.setItem('gou_offline_time', '0');
    try { await httpsCallable(getFunctions(app), 'claimGOU')({ userId: getUserId(), currentMultiplier: currentHuntData.mult * (state.isAdActive ? 2.0 : 1.0), initData: window.Telegram?.WebApp?.initData || "" }); } catch (error) {}
  };

  const handleTitleEdit = () => { if (state.castleLevel >= 50) { const newPrefix = window.prompt("New GOD Title:", state.customGodTitle); if (newPrefix && newPrefix.trim() !== "") setState(s => ({ ...s, customGodTitle: newPrefix.trim().toUpperCase() })); } else { alert(t.lck2); } };
  const formatTimeStr = (targetTime) => { const diff = Math.max(0, targetTime - Date.now()); const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000); const s = Math.floor((diff % 60000) / 1000); return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`; };

  const watchAdForTicket = async () => {
    if (state.adViewsLeft <= 0) return alert(t.bfCd); 
    if (!ticketAdRef.current) return alert("Ads system loading.");
    try {
      const result = await ticketAdRef.current.show();
      if (result.done) {
        const nextCharge = state.adViewsLeft === 3 ? Date.now() + 3 * 3600000 : state.nextAdChargeTime;
        setState(s => ({ ...s, tickets: s.tickets + 1, adViewsLeft: s.adViewsLeft - 1, nextAdChargeTime: nextCharge }));
        alert("Success! +1 Ticket 🎟️");
      }
    } catch (error) { console.log("Ad cancelled."); }
  };

  const watchBuffAd = async () => {
    if (Date.now() < state.nextBuffAdTime) return alert(t.bfCd);
    if (!buffAdRef.current) return alert("Ads system loading.");
    try {
      const result = await buffAdRef.current.show();
      if (result.done) {
        setState(s => ({ ...s, isAdActive: true, adTimeLeft: 3600, nextBuffAdTime: Date.now() + 3 * 3600000 }));
        alert("Success! 2x Mining Buff (1h) 🔥");
      }
    } catch (error) { console.log("Ad cancelled."); }
  };

  const currentHour = new Date(Date.now() + 9 * 3600000).getUTCHours(); 
  const isHotTime = (currentHour >= 12 && currentHour < 14) || (currentHour >= 18 && currentHour < 20); 
  const currentLotterySlot = `${new Date(Date.now() + 9 * 3600000).toDateString()}-${currentHour >= 12 && currentHour < 14 ? 'lunch' : (currentHour >= 18 && currentHour < 20 ? 'dinner' : 'none')}`;

  const handleArcadeReward = async (amount) => { if (amount > 0) { setState(s => ({ ...s, balance: s.balance + amount })); try { await httpsCallable(getFunctions(app), 'syncBonusReward')({ userId: getUserId(), amount: amount, source: 'arcade', initData: window.Telegram?.WebApp?.initData || "" }); } catch(e){} } setActiveModal(null); };
  const handleLotteryReward = async (amount) => { setState(s => ({...s, balance: s.balance + amount, lastLotterySlot: currentLotterySlot})); try { await httpsCallable(getFunctions(app), 'syncBonusReward')({ userId: getUserId(), amount: amount, source: 'lottery', slot: currentLotterySlot, initData: window.Telegram?.WebApp?.initData || "" }); } catch(e){} alert("OK!"); setShowLottery(false); };
  const handleOpenLottery = () => { if (!isHotTime) return alert(t.lWait); if (state.lastLotterySlot === currentLotterySlot) return alert(t.lClaimed); setShowLottery(true); };

  const getRealSuccessRate = (lvl, type) => {
    let base = 1.0;
    if (type === 'gear') { if (lvl >= 6 && lvl <= 10) base = 0.70; else if (lvl >= 11 && lvl <= 15) base = 0.60; else if (lvl >= 16 && lvl <= 20) base = 0.50; else if (lvl >= 21) base = 0.50 - ((lvl - 20) * 0.02); } 
    else { if (lvl >= 6 && lvl <= 10) base = 0.70; else if (lvl >= 11 && lvl <= 15) base = 0.65; else if (lvl >= 16 && lvl <= 20) base = 0.60; else if (lvl >= 21 && lvl <= 25) base = 0.55; else if (lvl >= 26 && lvl <= 30) base = 0.50; else if (lvl >= 31 && lvl <= 35) base = 0.45; else if (lvl >= 36 && lvl <= 40) base = 0.40; else if (lvl >= 41) base = 0.40 - ((lvl - 40) * 0.02); }
    return base;
  };

  const getFrontendRates = (burned) => { if (burned >= MAX_SUPPLY * 0.6) return { burn: 0.22, jackpot: 0.23 }; if (burned >= MAX_SUPPLY * 0.3) return { burn: 0.27, jackpot: 0.18 }; return { burn: 0.30, jackpot: 0.15 }; };

  const handleUpgrade = async (type, id = null) => {
    const key = id || type; if (lockRef.current[key]) return; 
    let cost = calculateCost(levelsRef.current[key], type, levelsRef.current['necklace']); let currentLvl = levelsRef.current[key];
    if (currentLvl >= (type === 'gear' ? 30 : 50)) return; if (levelsRef.current['balance'] < cost) return alert(t.aNoG);
    lockRef.current[key] = true; setTimeout(() => { lockRef.current[key] = false; }, 150);
    const ringBonus = (levelsRef.current['ring'] || 0) * 0.001; let successRate = getRealSuccessRate(currentLvl, type) + ringBonus;
    const isSuccess = Math.random() < successRate; let nextLvl = currentLvl;
    if (isSuccess) { nextLvl++; } else { if (currentLvl >= 5 && !SAVE_POINTS.includes(currentLvl)) nextLvl--; }
    setState(s => {
      const rates = getFrontendRates(s.burned); const burnFee = isSuccess ? 0 : cost * rates.burn; const jackpotFee = isSuccess ? 0 : cost * rates.jackpot;
      const newState = { ...s, balance: s.balance - cost, burned: s.burned + burnFee, jackpot: s.jackpot + jackpotFee }; if (type === 'pet') newState.petLevel = nextLvl; if (type === 'castle') newState.castleLevel = nextLvl; return newState;
    });
    if (type === 'gear') setGears(p => p.map(g => g.id === id ? { ...g, lvl: nextLvl } : g));
    if (!isSuccess && SAVE_POINTS.includes(currentLvl)) triggerLvlAnim(key, 'up'); else triggerLvlAnim(key, isSuccess ? 'up' : 'down'); triggerAnim(key, isSuccess ? 'success' : 'fail');
    httpsCallable(getFunctions(app), 'upgradeItem')({ userId: getUserId(), type, id, initData: window.Telegram?.WebApp?.initData || "" }).catch(e => console.log(e));
  };

  // 최적화용 핸들러 저장소
  const upgradeFnRef = useRef(handleUpgrade);
  useEffect(() => { upgradeFnRef.current = handleUpgrade; });
  const stableOnUpgrade = useCallback((type, id) => upgradeFnRef.current(type, id), []);

  // 🚨 [최적화 2] 자동 강화(AUTO) 통신 혁명! 0.4초마다 날리던 서버 요청을 모아서 딱 1번만 발사합니다!
  const toggleAuto = async (type, id = null) => {
    const key = id || type; const maxLimit = type === 'gear' ? 30 : 50;
    if (autoActiveRef.current[key]) { autoActiveRef.current[key] = false; setAutoUI(p => ({ ...p, [key]: false })); return; } 
    const currentLvl = levelsRef.current[key]; const targetStr = window.prompt(t.nTgt, maxLimit);
    if (!targetStr) return; const target = parseInt(targetStr, 10); if (isNaN(target) || target <= currentLvl || target > maxLimit) return;
    
    autoActiveRef.current[key] = true; setAutoUI(p => ({ ...p, [key]: true }));
    
    const runSimulator = async () => {
      let totalSuccessCost = 0; let totalFailCost = 0;

      while (autoActiveRef.current[key]) {
        let simLvl = levelsRef.current[key]; let simBalance = levelsRef.current['balance'];
        if (simLvl >= target || simLvl >= maxLimit) { alert(t.aMax); break; }
        
        let cost = calculateCost(simLvl, type, levelsRef.current['necklace']); if (simBalance < cost) { alert(t.aErr); break; }
        const ringBonus = (levelsRef.current['ring'] || 0) * 0.001; let successRate = getRealSuccessRate(simLvl, type) + ringBonus;
        const isSuccess = Math.random() < successRate; let nextSimLvl = simLvl;
        
        if (isSuccess) { nextSimLvl++; totalSuccessCost += cost; } 
        else { 
            if (simLvl >= 5 && !SAVE_POINTS.includes(simLvl)) nextSimLvl--; 
            totalFailCost += cost; 
        }

        setState(s => {
          const rates = getFrontendRates(s.burned); const burnFee = isSuccess ? 0 : cost * rates.burn; const jackpotFee = isSuccess ? 0 : cost * rates.jackpot;
          const newState = { ...s, balance: s.balance - cost, burned: s.burned + burnFee, jackpot: s.jackpot + jackpotFee }; if (type === 'pet') newState.petLevel = nextSimLvl; if (type === 'castle') newState.castleLevel = nextSimLvl; return newState;
        });
        if (type === 'gear') setGears(p => p.map(g => g.id === id ? { ...g, lvl: nextSimLvl } : g));
        if (!isSuccess && SAVE_POINTS.includes(simLvl)) triggerLvlAnim(key, 'up'); else triggerLvlAnim(key, isSuccess ? 'up' : 'down'); triggerAnim(key, isSuccess ? 'success' : 'fail'); 
        
        // 프론트엔드 연출을 위한 딜레이 (서버 통신 제거로 렉 발생 차단)
        await new Promise(r => setTimeout(r, 400)); 
      }
      
      autoActiveRef.current[key] = false; setAutoUI(p => ({ ...p, [key]: false }));

      // 🚨 압축 동기화: AUTO가 끝나는 순간 파이어베이스에 1번만 최종 결과를 전송합니다!
      if (totalSuccessCost > 0 || totalFailCost > 0) {
          httpsCallable(getFunctions(app), 'syncAutoUpgrade')({ 
              userId: getUserId(), type, id, 
              finalLevel: levelsRef.current[key], 
              successCost: totalSuccessCost, 
              failCost: totalFailCost, 
              initData: window.Telegram?.WebApp?.initData || "" 
          }).catch(e => console.log("AUTO Sync Error:", e));
      }
    };
    runSimulator();
  };

  const autoFnRef = useRef(toggleAuto);
  useEffect(() => { autoFnRef.current = toggleAuto; });
  const stableOnAuto = useCallback((type, id) => autoFnRef.current(type, id), []);

  useEffect(() => {
    const timer = setInterval(() => {
      setState(s => {
        const currentKSTDay = Math.floor((Date.now() + 9 * 3600000) / 86400000); let newAdViews = s.adViewsLeft; let newNextCharge = s.nextAdChargeTime; let newLastReset = s.lastDailyReset;
        if (currentKSTDay > s.lastDailyReset) { newAdViews = 3; newNextCharge = 0; newLastReset = currentKSTDay; } else if (newAdViews < 3 && Date.now() >= newNextCharge && newNextCharge > 0) { newAdViews++; newNextCharge = newAdViews < 3 ? Date.now() + 3 * 3600000 : 0; }
        const b = checkHunt(Date.now(), currentStats, s); const gainPerSec = ((300000 * b.mult * (1 + totalBonusPct / 100)) / 86400) * gainHalvingMult * (s.isAdActive ? 2.0 : 1.0);
        let nUnclaimed = s.unclaimedTime + 1; if (nUnclaimed > 43200) nUnclaimed = 43200; 
        
        const newPending = nUnclaimed < 43200 ? s.pendingGOU + gainPerSec : s.pendingGOU;
        
        localStorage.setItem('gou_offline_pending', newPending);
        localStorage.setItem('gou_offline_time', nUnclaimed);

        return { ...s, pendingGOU: newPending, unclaimedTime: nUnclaimed, isAdActive: s.adTimeLeft > 0 ? true : false, adTimeLeft: Math.max(0, s.adTimeLeft - 1), adViewsLeft: newAdViews, nextAdChargeTime: newNextCharge, lastDailyReset: newLastReset };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [checkHunt, currentStats, totalBonusPct, gainHalvingMult]);

  const gearNames = [t.g1, t.g2, t.g3, t.g4, t.g5, t.g6, t.g7];
  const statNames = [t.s1, t.s2, t.s3, t.s4, t.s5, t.s6, t.s7];

  return (
    <div className="main-wrap" style={{ backgroundImage: `linear-gradient(rgba(5, 8, 12, 0.85), rgba(15, 10, 12, 0.95)), url("${process.env.PUBLIC_URL}/background.jpg")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', color: '#e6d5b8', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '110px', paddingBottom: '90px', position: 'relative' }}>
      <style>{`
        * { box-sizing: border-box; font-family: 'Pretendard', sans-serif; }
        .fixed-header { position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 850px; background: rgba(15, 20, 28, 0.98); border-bottom: 2px solid #fbbf24; padding: 15px 15px; display: flex; justify-content: space-between; align-items: center; z-index: 9999; box-shadow: 0 5px 20px rgba(0,0,0,0.9); }
        .action-btn { flex: 1; padding: 12px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer; font-size: 14px; transition: transform 0.05s, opacity 0.2s; }
        .action-btn:active { transform: scale(0.92); } .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .glass-panel { background: rgba(20, 24, 34, 0.85); border: 1px solid rgba(197, 160, 89, 0.4); border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); }
        .img-box-gear { width: 100px; height: 100px; background: rgba(0,0,0,0.9); border: 1px solid rgba(197,160,89,0.5); border-radius: 15px; display: flex; justify-content: center; align-items: center; overflow: hidden; margin: 0 auto 10px auto; position: relative; }
        .img-box-gear img { width: 90%; height: 90%; object-fit: contain; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .big-banner-jackpot { background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(217,119,6,0.15)); border: 1px solid rgba(251,191,36,0.4); border-radius: 15px; padding: 25px; text-align: center; box-shadow: 0 5px 20px rgba(251,191,36,0.1); margin-bottom: 20px; }
        .big-banner-burn { background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(185,28,28,0.15)); border: 1px solid rgba(239,68,68,0.4); border-radius: 15px; padding: 25px; text-align: center; box-shadow: 0 5px 20px rgba(239,68,68,0.1); margin-bottom: 20px; }
        @media (max-width: 768px) { .gears-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; } }
        @keyframes flashSuccess { 0% { background: rgba(34, 197, 94, 0.3) !important; transition: background 0.15s ease-out; } 100% { background: transparent; } }
        @keyframes flashFail { 0% { background: rgba(239, 68, 68, 0.3) !important; transition: background 0.15s ease-out; } 100% { background: transparent; } }
        @keyframes lvlUp { 0% { transform: scale(1); color: #fbbf24; } 50% { transform: scale(1.6); color: #fff; } 100% { transform: scale(1); color: #fbbf24; } }
        @keyframes lvlDown { 0% { transform: scale(1); color: #fbbf24; } 50% { transform: scale(0.7); color: #ef4444; } 100% { transform: scale(1); color: #fbbf24; } }
        .anim-success { animation: flashSuccess 0.2s ease-out; } .anim-fail { animation: flashFail 0.2s ease-out; }
        .lvl-up { animation: lvlUp 0.25s ease-out; display: inline-block; } .lvl-down { animation: lvlDown 0.25s ease-out; display: inline-block; }
        .bottom-nav-btn { flex: 1; background: transparent; border: none; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: 0.2s; padding: 5px 2px; }
      `}</style>

      <audio ref={audioRef} src={`${process.env.PUBLIC_URL}/bgm.mp3`} loop preload="auto" />

      <div style={{ position: 'fixed', top: '75px', right: '10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', zIndex: 9000 }}>
        <button onClick={toggleBGM} style={{ background: isPlaying ? 'rgba(6,182,212,0.3)' : 'rgba(0,0,0,0.6)', border: `2px solid ${isPlaying ? '#06b6d4' : '#555'}`, color: isPlaying ? '#06b6d4' : '#888', borderRadius: '50%', width: '38px', height: '38px', fontSize: '18px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: isPlaying ? '0 0 10px rgba(6,182,212,0.5)' : 'none', transition: '0.3s' }}>
          {isPlaying ? '🔊' : '🔇'}
        </button>
      </div>

      <div style={{ position: 'fixed', top: '75px', left: '10px', zIndex: 9000 }}>
        <button onClick={() => setShowLangMenu(!showLangMenu)} style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid #555', color: '#fff', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
          🌐 {lang.toUpperCase()} ▼
        </button>
        {showLangMenu && (
          <div style={{ position: 'absolute', top: '35px', left: '0', background: 'rgba(15,20,28,0.95)', border: '1px solid #555', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: '100px', boxShadow: '0 5px 15px rgba(0,0,0,0.8)' }}>
            {[{c:'ko', l:'🇰🇷 한국어'}, {c:'en', l:'🇺🇸 English'}, {c:'ru', l:'🇷🇺 Русский'}, {c:'zh', l:'🇨🇳 中文'}, {c:'ja', l:'🇯🇵 日本語'}, {c:'es', l:'🇪🇸 Español'}, {c:'vi', l:'🇻🇳 Tiếng Việt'}].map(item => (
              <button key={item.c} onClick={() => { setLang(item.c); setShowLangMenu(false); }} style={{ background: 'transparent', color: lang === item.c ? '#fbbf24' : '#ccc', border: 'none', padding: '10px', textAlign: 'left', cursor: 'pointer', fontWeight: lang === item.c ? 'bold' : 'normal', borderBottom: '1px solid #333', fontSize: '12px' }}>
                {item.l}
              </button>
            ))}
          </div>
        )}
      </div>

      {showLottery && <ScratchLottery userRank={userRankTitle} onReward={handleLotteryReward} onClose={() => setShowLottery(false)} t={t} />}
      {activeModal && <ArcadeGames type={activeModal} onClose={() => setActiveModal(null)} onReward={handleArcadeReward} pReward={pReward} gReward={gReward} t={t} />}

      <div className="fixed-header">
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 'bold' }}>{state.walletAddress || t.wNotConn}</div>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>
            <span style={{color: userRankTitle.includes('GOD') ? '#fbbf24' : '#06b6d4'}}>[{userRankTitle}]</span> {state.userName}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ textAlign: 'right', minWidth: '60px' }}>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.8)' }}>{Math.floor(state.balance).toLocaleString()}</span>
            <span style={{ fontSize: '10px', color: '#c5a059', marginLeft: '2px' }}>GOU</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '850px', padding: '10px', flex: 1 }}>
        
        {activeTab === 'home' && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '15px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', boxShadow: '0 5px 20px rgba(16,185,129,0.1)' }}>
              <div>
                <div style={{ color: '#10b981', fontWeight: '900', fontSize: '18px', marginBottom: '5px' }}>{t.lTit}</div>
                <div style={{ color: '#aaa', fontSize: '12px' }}>{t.lTm}</div>
              </div>
              <button 
                onClick={handleOpenLottery}
                style={{ background: isHotTime && state.lastLotterySlot !== currentLotterySlot ? 'linear-gradient(90deg, #10b981, #06b6d4)' : '#333', color: isHotTime && state.lastLotterySlot !== currentLotterySlot ? '#fff' : '#888', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: '900', cursor: isHotTime && state.lastLotterySlot !== currentLotterySlot ? 'pointer' : 'not-allowed', animation: isHotTime && state.lastLotterySlot !== currentLotterySlot ? 'pulse 1.5s infinite' : 'none', boxShadow: isHotTime && state.lastLotterySlot !== currentLotterySlot ? '0 4px 15px rgba(16,185,129,0.4)' : 'none' }}
              >
                {isHotTime && state.lastLotterySlot !== currentLotterySlot ? t.lOn : t.lOff}
              </button>
            </div>

            <div className="big-banner-jackpot">
              <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '15px', marginBottom: '8px' }}>{t.jPot}</div>
              <div style={{ color: '#fff', fontWeight: '900', fontSize: '38px', textShadow: '0 0 15px rgba(251,191,36,0.8)' }}>{state.jackpot.toLocaleString()} <span style={{fontSize:'16px', color:'#fbbf24'}}>GOU</span></div>
            </div>

            <div className="big-banner-burn">
              <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '15px', marginBottom: '8px' }}>{t.burn}</div>
              <div style={{ color: '#fff', fontWeight: '900', fontSize: '32px', textShadow: '0 0 15px rgba(239,68,68,0.8)' }}>{state.burned.toLocaleString()} <span style={{fontSize:'16px', color:'#ef4444'}}>GOU</span></div>
              <div style={{ color: '#ffbaba', fontSize: '12px', marginTop: '10px' }}>{isPhase2 ? t.ph2 : isPhase1 ? t.ph1 : t.ph0}</div>
            </div>

            <div style={{ display: 'flex', gap: '15px', width: '100%', marginBottom: '20px', flexDirection: window.innerWidth <= 768 ? 'column' : 'row' }}>
              <div className="glass-panel" style={{ flex: 1, margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', border: '2px solid #06b6d4' }}>
                <div style={{ background: 'rgba(0,0,0,0.6)', padding: '15px', borderRadius: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                    <div style={{ color: '#ccc', fontSize: '11px' }}>{t.dGain}</div>
                    <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '28px', textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>+{dailyGainDisplay.toLocaleString()}</div>
                    <button onClick={watchBuffAd} style={{ background: state.isAdActive ? 'rgba(16,185,129,0.8)' : 'transparent', color: state.isAdActive ? '#fff' : '#10b981', border: '1px solid #10b981', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', marginTop: '10px', cursor: 'pointer', width: '100%' }}>
                      {state.isAdActive ? `${t.bfOn} (${Math.floor(state.adTimeLeft/60)}m)` : Date.now() < state.nextBuffAdTime ? `${t.bfCd} (${formatTimeStr(state.nextBuffAdTime)})` : t.bfBtn}
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                    <span style={{ color: '#06b6d4' }}>{t.unClm}: +{Math.floor(state.pendingGOU).toLocaleString()} GOU</span>
                    <span style={{ color: state.unclaimedTime >= 43200 ? '#ef4444' : '#e6d5b8' }}>{state.unclaimedTime >= 43200 ? "MAX" : `${Math.floor(state.unclaimedTime/3600)}h ${Math.floor((state.unclaimedTime%3600)/60)}m`}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}><div style={{ width: `${(state.unclaimedTime/43200)*100}%`, height: '100%', background: state.unclaimedTime >= 43200 ? '#ef4444' : '#06b6d4' }}></div></div>
                  <button className={`action-btn ${anims['claim'] ? `anim-${anims['claim']}` : ''}`} onClick={claimGOU} style={{ width: '100%', background: 'linear-gradient(90deg, #fbbf24, #d97706)', color: '#000', padding: '15px 0', fontSize: '18px', fontWeight: '900', boxShadow: '0 4px 15px rgba(217,119,6,0.4)', borderRadius:'10px' }}>{t.cBtn}</button>
                </div>
              </div>

              <div className="glass-panel" style={{ flex: 1, margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', border: '2px solid #10b981' }}>
                <h3 style={{color:'#10b981', margin:'0 0 15px 0', fontSize:'18px'}}>{t.arc}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '10px', border:'1px solid #333' }}>
                  <div style={{textAlign:'center', flex:1}}><div style={{fontSize:'11px', color:'#aaa', marginBottom:'4px'}}>{t.tkts}</div><div style={{color:'#fbbf24', fontWeight:'bold', fontSize:'18px'}}>🎟️ {state.tickets}</div></div>
                  <div style={{width:'1px', background:'#333'}}></div>
                  <div style={{textAlign:'center', flex:1}}><div style={{fontSize:'11px', color:'#aaa', marginBottom:'4px'}}>{t.ads}</div><div style={{color:'#06b6d4', fontWeight:'bold', fontSize:'18px'}}>📺 {state.adViewsLeft}/3</div></div>
                </div>
                <button onClick={watchAdForTicket} style={{ width:'100%', background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', color: '#fff', border:'none', padding:'12px', borderRadius:'10px', fontWeight:'bold', marginBottom:'15px', cursor:'pointer' }}>{t.adBtn}</button>
                <button onClick={async () => { 
                  if(state.tickets <= 0) return alert(t.aTkt); 
                  setState(s => ({...s, tickets: s.tickets - 1})); 
                  try { await httpsCallable(getFunctions(app), 'syncAdAction')({ userId: getUserId(), type: 'useTicket', initData: window.Telegram?.WebApp?.initData || "" }); } catch(e){}
                  const games = ['blacksmith', 'tower', 'catch', 'memory'];
                  setActiveModal(games[Math.floor(Math.random() * games.length)]); 
                }} className="action-btn" style={{ background: 'linear-gradient(90deg, #a855f7, #ec4899)', color: '#fff', padding: '18px 0', fontSize: '16px', border: 'none', width: '100%', borderRadius: '10px', fontWeight: '900', boxShadow: '0 5px 15px rgba(236, 72, 153, 0.4)' }}>
                  {t.pBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upgrade' && (
          <div>
            <h3 style={{ color: '#fbbf24', margin: '0 0 10px 5px', fontSize: '16px' }}>{t.hTit}</h3>
            <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: '15px', paddingBottom: '15px', WebkitOverflowScrolling: 'touch' }}>
              {activeHuntsToRender.map(h => {
                const isActive = !h.isSpecial ? (!currentHuntData.isSpecial && currentHuntData.name === h.name) : true;
                const isUnlocked = h.isSpecial ? true : (currentStats.atk >= h.req.atk && currentStats.hp >= h.req.hp && currentStats.def >= h.req.def && currentStats.acc >= h.req.acc && currentStats.sum >= h.reqSum);
                return (
                  <div key={h.name} className={isActive ? 'hunt-active' : ''} style={{ minWidth: '170px', flexShrink: 0, background: h.isSpecial ? 'rgba(147, 51, 234, 0.2)' : 'rgba(15, 18, 25, 0.8)', border: `1px solid ${isActive ? (h.isSpecial ? '#a855f7' : '#fff') : (isUnlocked ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.1)')}`, padding: '16px 12px', borderRadius: '12px', opacity: isUnlocked ? 1 : 0.4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ textAlign: 'center' }}>
                      <b style={{ color: isActive ? '#fff' : (isUnlocked ? '#06b6d4' : '#666'), fontSize: '14px' }}>{isActive && !h.isSpecial ? '⚔️ ' : ''}{h.name}</b>
                      <div style={{ color: isActive ? '#fbbf24' : '#c5a059', fontWeight: 'bold', marginTop: '6px', fontSize: '13px' }}>X {h.mult}</div>
                    </div>
                    {!h.isSpecial && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: 'rgba(0,0,0,0.6)', padding: '8px', borderRadius: '6px', fontSize: '11px', color: '#ccc', textAlign: 'center' }}>
                          <div>{t.s1.substring(0,2)} <span style={{color: currentStats.atk >= h.req.atk ? '#06b6d4' : '#ef4444', fontWeight:'bold'}}>{h.req.atk}</span></div>
                          <div>{t.s2.substring(0,2)} <span style={{color: currentStats.hp >= h.req.hp ? '#06b6d4' : '#ef4444', fontWeight:'bold'}}>{h.req.hp}</span></div>
                          <div>{t.s3.substring(0,2)} <span style={{color: currentStats.def >= h.req.def ? '#06b6d4' : '#ef4444', fontWeight:'bold'}}>{h.req.def}</span></div>
                          <div>{t.s4.substring(0,2)} <span style={{color: currentStats.acc >= h.req.acc ? '#06b6d4' : '#ef4444', fontWeight:'bold'}}>{h.req.acc}</span></div>
                        </div>
                        <div style={{ fontSize: '11px', color: isUnlocked ? '#aaa' : '#666', marginTop: '8px', textAlign: 'center' }}>{t.hReq} <span style={{color: isUnlocked?'#fff':'#666', fontWeight:'bold'}}>{h.reqSum}</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <h3 style={{ color: '#fbbf24', margin: '10px 0 10px 5px', fontSize: '16px', borderTop: '1px solid #333', paddingTop: '20px' }}>{t.gTit} (<span style={{color: '#fff'}}>{totalGearLevel} {t.lvl}</span>)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }} className="gears-grid">
              {gears.map((g, i) => (
                <UpgradeCard key={g.id} type="gear" item={{...g, name: gearNames[i], statText: `${statNames[i]}: ${(g.lvl * g.base).toFixed(1)}${g.unit}`, bonusText: `${t.gBf}+${g.lvl * 2}%`, successRateDisplay: getSuccessRateDisplay(g.lvl, 'gear') }} isMax={g.lvl >= 30} cost={getCost(g.lvl)} onUpgrade={stableOnUpgrade} onAuto={stableOnAuto} autoActive={autoUI[g.id]} animClass={lvlAnims[g.id] === 'up' ? 'lvl-up' : lvlAnims[g.id] === 'down' ? 'lvl-down' : ''} boxAnimClass={anims[g.id] === 'success' ? 'anim-success' : anims[g.id] === 'fail' ? 'anim-fail' : ''} t={t} />
              ))}
            </div>

            <h3 style={{ color: '#fbbf24', margin: '0 0 10px 5px', fontSize: '16px', borderTop: '1px solid #333', paddingTop: '20px' }}>{t.pTit}</h3>
            {['pet', 'castle'].map((type, i) => {
              const isPet = type === 'pet'; const isUnlocked = isPet ? isPetUnlocked : isCastleUnlocked; const lvl = isPet ? state.petLevel : state.castleLevel; const isMax = lvl >= 50; const cost = isPet ? getPetCost(lvl) : getCastleCost(lvl); const isHunting = (isPet ? state.petHuntEndTime : state.castleHuntEndTime) > Date.now();
              return (
                <UpgradeCard key={type} type={type} item={{ id: type, name: isPet ? t.p1 : t.p2, imgFile: isPet ? 'pet.jpg' : 'castle.jpg', emoji: isPet ? '🐉' : '🏰', lvl: lvl, locked: !isUnlocked, lockMsg: isPet ? t.lck1 : t.lck2, bonusText: `${t.pBf}+${(isPet ? lvl * 3 : lvl * 5) + (isPet ? getPetBonus(lvl) : getCastleBonus(lvl))}%`, successRateDisplay: getSuccessRateDisplay(lvl, type) }} isMax={isMax} cost={cost} onUpgrade={stableOnUpgrade} onAuto={stableOnAuto} autoActive={autoUI[type]} animClass={lvlAnims[type] === 'up' ? 'lvl-up' : lvlAnims[type] === 'down' ? 'lvl-down' : ''} boxAnimClass={anims[type] === 'success' ? 'anim-success' : anims[type] === 'fail' ? 'anim-fail' : ''} specialHunt={{ isHunting, huntText: `12H ⚔️`, onStart: () => { const now = Date.now(); if (state.petHuntEndTime > now || state.castleHuntEndTime > now) return; const duration = 12 * 60 * 60 * 1000; if (isPet) setState(s => ({ ...s, petHuntEndTime: now + duration })); else setState(s => ({ ...s, castleHuntEndTime: now + duration })); alert("OK!"); } }} t={t} />
              );
            })}
          </div>
        )}

        {activeTab === 'rank' && (
          <div>
            <div className="big-banner-jackpot" style={{ padding: '20px' }}>
              <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>{t.jPot}</div>
              <div style={{ color: '#fff', fontWeight: '900', fontSize: '32px', textShadow: '0 0 15px rgba(251,191,36,0.8)' }}>{state.jackpot.toLocaleString()} <span style={{fontSize:'14px', color:'#fbbf24'}}>GOU</span></div>
            </div>
            <div className="glass-panel" style={{ padding: '25px 15px' }}>
              <h2 style={{ textAlign: 'center', color: '#fbbf24', margin: '0 0 25px 0' }}>{t.rSrv}</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e6d5b8', fontSize: '14px' }}>
                <thead><tr style={{ borderBottom: '2px solid #fbbf24', color: '#fbbf24' }}><th style={{ padding: '10px', textAlign: 'center' }}>{t.rnk1}</th><th style={{ padding: '10px', textAlign: 'left' }}>{t.rnk2}</th><th style={{ padding: '10px', textAlign: 'right' }}>{t.rnk3}</th></tr></thead>
                <tbody>
                  {rankings.map(r => (
                    <tr key={r.rank} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: r.isMe ? 'rgba(251,191,36,0.15)' : 'transparent' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold', textAlign: 'center', fontSize: '16px' }}>{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold' }}><span style={{color: r.title.includes('GOD') ? '#fbbf24' : '#06b6d4', fontSize:'11px'}}>[{r.title}]</span><br/>{r.name} {r.isMe ? '⭐' : ''}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', lineHeight: '1.4' }}>
                        {r.c > 0 && <div style={{color:'#fbbf24', fontSize:'13px'}}>🏰 {r.c}</div>}
                        {r.p > 0 && <div style={{color:'#10b981', fontSize:'13px'}}>🐉 {r.p}</div>}
                        <div style={{color:'#06b6d4', fontSize:'13px'}}>⚔️ {r.g}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="glass-panel" style={{ padding: '25px 20px', border: '2px solid #06b6d4', background: 'linear-gradient(180deg, rgba(20,24,34,0.9), rgba(6,182,212,0.1))' }}>
            <h2 style={{ textAlign: 'center', color: '#06b6d4', margin: '0 0 15px 0', textShadow: '0 0 10px rgba(6,182,212,0.5)' }}>{t.shTit}</h2>
            
            <div style={{ backgroundColor: '#1a1a2e', border: '1px solid #ff4757', padding: '15px', borderRadius: '10px', marginBottom: '20px', color: '#fff', fontSize: '14px', lineHeight: '1.6', boxShadow: '0 0 15px rgba(255, 71, 87, 0.2)' }}>
                <h4 style={{ color: '#ff4757', marginTop: '0', marginBottom: '10px', textAlign: 'center' }}>{t.shNtTit}</h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#bdc3c7' }} dangerouslySetInnerHTML={{ __html: t.shNt1 }}></p>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '13px' }}>
                    <li style={{ marginBottom: '5px' }} dangerouslySetInnerHTML={{ __html: t.shNt2 }}></li>
                    <li style={{ marginBottom: '5px' }} dangerouslySetInnerHTML={{ __html: t.shNt3 }}></li>
                    <li style={{ marginBottom: '0' }} dangerouslySetInnerHTML={{ __html: t.shNt4 }}></li>
                </ul>
            </div>

            {[{ ton: 1, gou: 10000000 }, { ton: 5, gou: 50000000 }, { ton: 10, gou: 100000000 }].map((pkg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.6)', padding: '15px 20px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #333' }}>
                <div><div style={{ color: '#06b6d4', fontWeight: '900', fontSize: '20px' }}>{pkg.ton} TON</div><div style={{ color: '#fff', fontSize: '13px', marginTop: '4px' }}>= {pkg.gou.toLocaleString()} GOU</div></div>
                <button onClick={() => handleBuyGOU(pkg.ton, pkg.gou)} className="action-btn" style={{ background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', color: '#fff', maxWidth: '110px', fontSize: '15px', padding: '12px 0', boxShadow: '0 4px 15px rgba(6,182,212,0.4)' }}>{t.buy}</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'setting' && (
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', marginBottom: '25px', background: 'rgba(0,0,0,0.5)', borderRadius: '10px', padding: '5px' }}>
              <button onClick={() => setSettingTab('my')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: settingTab === 'my' ? '#06b6d4' : 'transparent', color: settingTab === 'my' ? '#fff' : '#888', fontWeight: 'bold', fontSize: '13px', transition: '0.2s' }}>{t.syMy}</button>
              <button onClick={() => setSettingTab('friend')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: settingTab === 'friend' ? '#a855f7' : 'transparent', color: settingTab === 'friend' ? '#fff' : '#888', fontWeight: 'bold', fontSize: '13px', transition: '0.2s' }}>{t.syFr}</button>
            </div>

            {settingTab === 'my' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', padding: '15px', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', border: '1px solid #333' }}>
                   <TonConnectButton />
                </div>
                
                <button onClick={handleTestReset} className="action-btn" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid #ef4444', padding: '15px', fontSize: '16px' }}>
                  🔄 계정 초기화 (55만 GOU)
                </button>

                <button onClick={handleTitleEdit} className="action-btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #555' }}>{t.tgTit}</button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button onClick={() => setActiveTab('shop')} className="action-btn" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid #22c55e' }}>{t.shTit}</button>
                  <button onClick={depositGOU} className="action-btn" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid #3b82f6' }}>{t.depBtn}</button>
                  <button onClick={withdrawGOU} className="action-btn" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444', gridColumn: 'span 2' }}>{t.tgWd}</button>
                </div>
              </div>
            )}

            {settingTab === 'friend' && (
              <div>
                <button onClick={() => alert("Copied!")} style={{ width: '100%', padding: '15px', background: 'linear-gradient(90deg, #a855f7, #7e22ce)', color: '#fff', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', border: 'none', marginBottom: '20px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(168,85,247,0.4)' }}>
                  {t.cpy}
                </button>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '10px', marginBottom: '15px', border: '1px solid #333' }}>
                  <h4 style={{ color: '#fbbf24', margin: '0 0 10px 0', fontSize: '14px' }}>{t.frSt}</h4>
                  <div style={{ color: '#fff', fontWeight: '900', fontSize: '24px', textAlign: 'center', marginBottom: '5px' }}>{validInvites} / 10</div>
                  <div style={{ width: '100%', height: '10px', background: '#222', borderRadius: '5px', overflow: 'hidden' }}><div style={{ width: `${(validInvites/10)*100}%`, height: '100%', background: 'linear-gradient(90deg, #fbbf24, #d97706)' }}></div></div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '10px', border: '1px solid #333' }}>
                  <h4 style={{ color: '#06b6d4', margin: '0 0 10px 0', fontSize: '14px' }}>{t.frMy}</h4>
                  {invitedFriends.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div><div style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>{f.name}</div><div style={{ color: f.rank === t.rKni ? '#06b6d4' : '#666', fontSize: '11px' }}>[{f.rank}]</div></div>
                      <div style={{ textAlign: 'right', fontSize: '12px', color: '#ccc' }}>
                        <div>🐉: <span style={{color: f.petLvl>=50 ? '#10b981' : '#fff'}}>{f.petLvl}</span></div>
                        <div>🏰: <span style={{color: f.castleLvl>=50 ? '#fbbf24' : '#fff'}}>{f.castleLvl}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '850px', background: 'rgba(15, 20, 28, 0.98)', borderTop: '2px solid #333', display: 'flex', justifyContent: 'space-around', padding: '10px 2px 20px 2px', zIndex: 9999, boxShadow: '0 -5px 20px rgba(0,0,0,0.8)' }}>
        <button className="bottom-nav-btn" onClick={() => setActiveTab('home')} style={{ color: activeTab === 'home' ? '#06b6d4' : '#666' }}>
          <div style={{ fontSize: '22px', marginBottom: '4px', filter: activeTab === 'home' ? 'drop-shadow(0 0 5px rgba(6,182,212,0.5))' : 'none', transform: activeTab === 'home' ? 'scale(1.15)' : 'scale(1)' }}>🏠</div>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{t.nHom}</span>
        </button>
        <button className="bottom-nav-btn" onClick={() => setActiveTab('upgrade')} style={{ color: activeTab === 'upgrade' ? '#ef4444' : '#666' }}>
          <div style={{ fontSize: '22px', marginBottom: '4px', filter: activeTab === 'upgrade' ? 'drop-shadow(0 0 5px rgba(239,68,68,0.5))' : 'none', transform: activeTab === 'upgrade' ? 'scale(1.15)' : 'scale(1)' }}>⚔️</div>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{t.nUpg}</span>
        </button>
        <button className="bottom-nav-btn" onClick={() => setActiveTab('shop')} style={{ color: activeTab === 'shop' ? '#3b82f6' : '#666' }}>
          <div style={{ fontSize: '22px', marginBottom: '4px', filter: activeTab === 'shop' ? 'drop-shadow(0 0 5px rgba(59,130,246,0.5))' : 'none', transform: activeTab === 'shop' ? 'scale(1.15)' : 'scale(1)' }}>💎</div>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{t.nShp}</span>
        </button>
        <button className="bottom-nav-btn" onClick={() => setActiveTab('rank')} style={{ color: activeTab === 'rank' ? '#fbbf24' : '#666' }}>
          <div style={{ fontSize: '22px', marginBottom: '4px', filter: activeTab === 'rank' ? 'drop-shadow(0 0 5px rgba(251,191,36,0.5))' : 'none', transform: activeTab === 'rank' ? 'scale(1.15)' : 'scale(1)' }}>🏆</div>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{t.nRnk}</span>
        </button>
        <button className="bottom-nav-btn" onClick={() => setActiveTab('setting')} style={{ color: activeTab === 'setting' ? '#a855f7' : '#666' }}>
          <div style={{ fontSize: '22px', marginBottom: '4px', filter: activeTab === 'setting' ? 'drop-shadow(0 0 5px rgba(168,85,247,0.5))' : 'none', transform: activeTab === 'setting' ? 'scale(1.15)' : 'scale(1)' }}>⚙️</div>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{t.nSys}</span>
        </button>
      </div>
    </div>
  );
}