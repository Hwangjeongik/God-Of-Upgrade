import telebot
import schedule
import time
import threading
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

BOT_TOKEN = '8930501901:AAFxCo5ou_DAW27tHJ-1F0b3sLZ12EtoG10'
bot = telebot.TeleBot(BOT_TOKEN)
TARGET_CHAT_ID = '1654404632' # 공지 받을 곳

def get_game_markup():
    markup = InlineKeyboardMarkup()
    # 웹앱 주소는 사령관님의 실제 Render 주소로 교체하십시오
    web_app = WebAppInfo("https://god-of-upgrade.onrender.com")
    button = InlineKeyboardButton(text="⚔️ GOD OF UPGRADE 실행", web_app=web_app)
    markup.add(button)
    return markup

# 📢 자동 공지 발사 함수
def send_daily_notice():
    try:
        bot.send_message(
            TARGET_CHAT_ID, 
            "⏰ [일일 보급] 사령관님! 오늘치 자원 보급이 도착했습니다. 확인하십시오!", 
            reply_markup=get_game_markup()
        )
        print("✅ 일일 자동 공지 발사 완료!")
    except Exception as e:
        print(f"❌ 자동 공지 실패: {e}")

# 매일 특정 시간(예: 오전 9시)에 발사하도록 예약
schedule.every().day.at("09:00").do(send_daily_notice)

# 자동화 스케줄러를 별도 스레드에서 돌리는 함수
def run_scheduler():
    while True:
        schedule.run_pending()
        time.sleep(1)

# 스레드 시작
threading.Thread(target=run_scheduler, daemon=True).start()

# 봇 기본 응답 (메시지 응답)
@bot.message_handler(func=lambda message: True)
def echo_all(message):
    bot.send_message(
        message.chat.id, 
        "사령관님, 기지에 복귀하셨군요! 게임을 시작하려면 아래 버튼을 누르십시오.", 
        reply_markup=get_game_markup()
    )

print("🤖 봇과 자동 정산 엔진이 24시간 대기 모드입니다...")
bot.infinity_polling()