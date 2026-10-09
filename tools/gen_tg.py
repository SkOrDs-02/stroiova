# Generates the telegram content JSON for spec 03 (validated, compact layout).
import json, sys

S = lambda target, mult=0.5, hours=1: {"target": target, "mult": mult, "hours": hours}
STALL = 0.25  # decision 25: no event zeroes income; "стоїть" = ×0,25 на 1 год

def ch(cid, kind, title, effects=None, **kw):
    c = {"id": cid, "kind": kind, "title": title, "effects": effects or {}}
    c.update(kw)
    return c

T = []
def tg(**kw):
    base = {"rev": 1, "kind": "standard", "docType": "telegram", "level": 1}
    base.update(kw)
    T.append(base)

# ---------- Level 1, batch 1 (content.md 1-14; effects from artboards or archetype placeholders) ----------
tg(id="tg_0001_sergeants", no="4471", stamp="НЕГАЙНО", **{"from": "higher_hq"}, to="bn_commander",
   title="Про сержантів",
   body="Доповісти кількість сержантів, розраховану за десятьма формулами. Електронний вигляд роздрукувати й підшити.",
   deadline=[["Командування", "10 діб", "old"], ["Оперативне командування", "7 діб", "old"], ["Бригада", "2 доби", "old"], ["Ви", "минув учора", "alert"]],
   schedule={"scripted": True},
   choices=[
     ch("diligent", "diligent", "Виконати сумлінно", {"slow": [S("stroy")], "rep": 10}, result="Пораховано за десятьма формулами. Вийшло десять різних кількостей."),
     ch("formal_reply", "formal_reply", "Написати відписку", {"durationMin": 2, "rep": -5, "inspPct": 30, "inspExtraItem": "sergeants_count"}, result="Доповідаємо: сержантів достатньо."),
     ch("drawer", "drawer", "Зареєструвати й покласти в шухляду", {}, note="Чорною пастою у вхідних. Нічого не станеться. Мабуть.")])

tg(id="tg_0002_less_paper", no="4474", stamp="ТЕРМІНОВО", **{"from": "higher_hq"}, to="bn_commander",
   title="Про скорочення паперу",
   body="Подати план заходів щодо зменшення паперового документообігу у п’яти примірниках на паперовому носії.",
   deadline=[["Командування", "10 діб", "old"], ["Бригада", "3 доби", "old"], ["Ви", "1 доба", "now"]],
   choices=[
     ch("diligent", "diligent", "Надрукувати п’ять примірників", {"paper": 5, "slow": [S("stroy")], "rep": 10}),
     ch("formal_reply", "formal_reply", "Подати план в електронному вигляді", {"durationMin": 2, "rep": -5, "inspPct": 20}),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="План лежить у шухляді. Паперовий.")])

tg(id="tg_0003_acquaint", no="4478", **{"from": "bn_chief_of_staff"}, to="stroy_chief",
   title="Про ознайомлення",
   body="Ознайомити особовий склад під підпис із наказом про порядок ознайомлення під підпис.",
   deadline="std", placeholder=True,
   choices=[
     ch("diligent", "diligent", "Ознайомити під підпис", {"slow": [S("stroy")], "rep": 5}, result="Ознайомлено під підпис. З порядком ознайомлення теж."),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Наказ про ознайомлення лежить. Неознайомлений.")])

tg(id="tg_0004_snow", no="4483", **{"from": "higher_hq"}, to="bn_commander",
   title="Про снігоприбирання",
   body="Доповісти про готовність техніки до снігоприбирання. Строк минув учора.",
   deadline="std", placeholder=True, schedule={"season": "summer"},
   choices=[
     ch("diligent", "diligent", "Оглянути техніку й доповісти", {"slow": [S("stroy")], "rep": 5}),
     ch("formal_reply", "formal_reply", "Доповісти: снігу немає", {"durationMin": 1, "rep": -5, "inspPct": 10}),
     ch("drawer", "drawer", "Покласти в шухляду до зими", {}, note="Лежить до зими.")])

tg(id="tg_0005_pc_literacy", no="4487", **{"from": "bn_chief_of_staff"}, to="stroy_chief",
   title="Про комп’ютерну грамотність",
   body="Подати список тих, хто вміє користуватися комп’ютером.",
   deadline="std", placeholder=True,
   choices=[
     ch("diligent", "diligent", "Скласти список і вписати себе", {"slow": [S("stroy")], "rep": 5, "queueNext": ["tg_0022_excel", "tg_0017_stamp_print"]}),
     ch("formal_reply", "formal_reply", "Подати список без себе", {"durationMin": 1, "rep": -5, "inspPct": 10}),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Список лежить. Тебе в ньому немає.")])

tg(id="tg_0006_shovels", no="4490", **{"from": "bde_support"}, to="bn_commander",
   title="Про лопати",
   body="Перерахувати лопати штикові за інвентарними номерами. Номерів на лопатах немає.",
   deadline="std", placeholder=True,
   choices=[
     ch("diligent", "diligent", "Перерахувати за описом майна", {"slow": [S("stroy")], "rep": 5}),
     ch("formal_reply", "formal_reply", "Доповісти: номерів немає", {"durationMin": 1, "rep": -5, "inspPct": 15}),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Лопати стоять. Без номерів."),
     ch("assign_numbers_marker", "special", "Присвоїти номери маркером", {"durationMin": 5, "rep": 5}, isNew=True)])

tg(id="tg_0007_briefing", no="4493", **{"from": "bn_chief_of_staff"}, to="stroy_chief",
   title="Про інструктаж",
   body="Провести інструктаж щодо порядку проведення інструктажів. Журнал інструктажів додається, порожній.",
   deadline="std", placeholder=True,
   choices=[
     ch("diligent", "diligent", "Провести й записати в журнал", {"paper": 1, "slow": [S("stroy")], "rep": 5}),
     ch("formal_reply", "formal_reply", "Записати, що проведено", {"durationMin": 1, "rep": -5, "inspPct": 15}),
     ch("drawer", "drawer", "Покласти журнал у шухляду", {}, note="Журнал лежить. Порожній, як і прийшов.")])

tg(id="tg_0008_morale", no="4495", **{"from": "higher_hq"}, to="bn_commander",
   title="Про моральний стан",
   body="Визначити моральний стан підрозділу. Додаток — таблиця на 14 аркушів.",
   deadline="std", placeholder=True,
   choices=[
     ch("diligent", "diligent", "Заповнити таблицю на 14 аркушів", {"paper": 14, "slow": [S("stroy")], "rep": 10}, result="Таблицю заповнено. Мораль за цей час упала."),
     ch("formal_reply", "formal_reply", "Доповісти: мораль висока", {"durationMin": 1, "rep": -5, "inspPct": 15}),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Таблиця лежить. Мораль тримається.")])

tg(id="tg_0009_indent", no="4498", **{"from": "bn_chief_of_staff"}, to="stroy_chief",
   title="Про відступ",
   body="Документ повернули: абзацний відступ 1,25 см замість 1,27. Подати повторно в той самий строк.",
   deadline="std", placeholder=True,
   choices=[
     ch("diligent", "diligent", "Виправити відступ на 1,27", {"slow": [S("stroy")], "rep": 5}),
     ch("cite_ban", "formal_reply", "Відписати, що такі вимоги заборонені наказом", {"durationMin": 1, "returnsAfterHours": 1}, result="Відписку повернули: абзацний відступ 1,25 см."),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Документ лежить. Відступ 1,25.")])

tg(id="tg_0010_cancel", no="4501", **{"from": "higher_hq"}, to="bn_commander",
   title="Про скасування",
   body="Телеграму № 4502 вважати такою, що втратила чинність. Ти її ще не {m:отримував|f:отримувала}.",
   deadline="std", placeholder=True,
   followUps=[{"afterHours": 24, "id": "tg_0010b_4502"}],
   choices=[
     ch("diligent", "diligent", "Зареєструвати скасування", {"paper": 1, "slow": [S("stroy")], "rep": 5}),
     ch("formal_reply", "formal_reply", "Відписати: не отримували", {"durationMin": 1, "rep": -5, "inspPct": 10}),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Скасування лежить. Скасовувати поки нічого.")])

tg(id="tg_0011_engines", no="4505", **{"from": "bde_support"}, to="bn_commander",
   title="Про двигуни",
   body="Доповісти про стан двигунів техніки.",
   deadline="std", placeholder=True,
   choices=[
     ch("diligent", "diligent", "Обійти техніку й доповісти", {"slow": [S("stroy")], "rep": 5}),
     ch("formal_reply", "formal_reply", "Доповісти: двигуни справні", {"durationMin": 1, "rep": -5, "inspPct": 2}, result="Підшито. Читати не стали."),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Двигуни працюють. Доповідь лежить.")])

tg(id="tg_0012_kerbs", no="4509", **{"from": "higher_hq"}, to="bn_commander",
   title="Про фотозвіт",
   body="Надати фотозвіт про фарбування бордюрів. Бордюрів на позиції немає.",
   deadline=[["Командування", "10 діб", "old"], ["Бригада", "2 доби", "old"], ["Ви", "минув учора", "alert"]],
   choices=[
     ch("diligent", "diligent", "Викласти бордюр і пофарбувати", {"slow": [S("stroy")], "rep": 10}),
     ch("formal_reply", "formal_reply", "Доповісти, що бордюрів немає", {"durationMin": 1, "rep": -5, "inspPct": 20}),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Фарба стоїть. Бордюрів так і немає."),
     ch("neighbours_kerb_photo", "special", "Сфотографувати бордюр у сусідів", {"durationMin": 5, "rep": 5}, isNew=True)])

tg(id="tg_0013_report_reports", no="4512", **{"from": "higher_hq"}, to="bn_commander",
   title="Про звіт про звіти",
   body="Щотижня доповідати кількість поданих доповідей, включно з цією.",
   deadline="std", placeholder=True, schedule={"repeatEveryDays": 7},
   choices=[
     ch("diligent", "diligent", "Порахувати всі доповіді", {"slow": [S("stroy")], "rep": 5}),
     ch("formal_reply", "formal_reply", "Доповісти: одна", {"durationMin": 1, "rep": -5, "inspPct": 10}),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Доповідь про доповіді лежить. Її теж треба порахувати.")])

tg(id="tg_0014_urgency", no="4516", stamp="ТЕРМІНОВО", **{"from": "higher_hq"}, to="bn_commander",
   title="Про терміновість",
   body="Усі телеграми вважати терміновими. Цю — особливо.",
   deadline=[["Командування", "терміново", "old"], ["Бригада", "терміново", "old"], ["Ви", "особливо", "alert"]],
   choices=[
     ch("diligent", "diligent", "Проставити «терміново» на всіх вхідних", {"paper": 1, "slow": [S("stroy")], "rep": 5}),
     ch("formal_reply", "formal_reply", "Відписати: прийнято до відома", {"durationMin": 1, "rep": -5, "inspPct": 10}),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Лежить у шухляді. Терміново.")])

# ---------- Level 1, batch 2 (texts.md 15-25) ----------
tg(id="tg_0015_paper_copy", no="4519", stamp="ТЕРМІНОВО", **{"from": "higher_hq"}, to="bn_commander",
   title="Про паперовий примірник",
   body="Цю телеграму, отриману в електронній формі, роздрукувати. Паперовий примірник надіслати відправнику для підшивання у справу.",
   deadline="std",
   choices=[
     ch("diligent", "diligent", "Роздрукувати й надіслати", {"paper": 2, "rep": 5, "delayed": [{"afterHours": 1, "effects": {"paper": 1}, "text": "Примірник повернувся зі штампом «Повернуто без розгляду». Підшито."}]}),
     ch("formal_reply", "formal_reply", "Відписати, що дублювати заборонено", {"durationMin": 2, "rep": -5, "inspPct": 15, "digitalShield": True}),
     ch("drawer", "drawer", "Зареєструвати й покласти в шухляду", {}, note="Зареєстровано. В електронній формі.")])

tg(id="tg_0016_second_page", no="4523", **{"from": "bn_chief_of_staff"}, to="stroy_chief",
   title="Про другу сторінку",
   body="Доповідь повернуто. На другій сторінці лише підпис. Переносити підпис на наступну сторінку дозволено, якщо на ній не менше двох рядків тексту.",
   deadline="std",
   choices=[
     ch("diligent", "diligent", "Дописати два рядки", {"slow": [S("stroy")], "rep": 5, "curio": "Доповідь закінчено. Більше доповісти нічого."}),
     ch("formal_reply", "formal_reply", "Зменшити кегль до 13", {"durationMin": 1, "inspRemarkPct": 20}, note="Тумбочкін міряє кегль"),
     ch("drawer", "drawer", "Покласти в шухляду", {"delayed": [{"afterHours": 24, "effects": {"rep": -5}}]}, note="Доповідь лежить. Строк іде.")])

tg(id="tg_0017_stamp_print", no="4530", **{"from": "higher_hq"}, to="bn_commander",
   title="Про відбиток печатки",
   body="Документи, підписані кваліфікованим електронним підписом, надсилати з відбитком печатки. Відбиток проставити на роздруківці, роздруківку сфотографувати, фото додати до документа.",
   deadline="std",
   followUps=[{"afterHours": 24, "id": "tg_0017b_photo_stamp", "ifChoice": ["diligent"]}],
   choices=[
     ch("diligent", "diligent", "Друкувати й фотографувати", {"paper": 5, "slow": [S("stroy")], "rep": 10}),
     ch("cite_p9", "formal_reply", "Послатися на пункт 9", {"rep": -5, "digitalShield": True}),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Печатка лежить там само.")])

tg(id="tg_0018_kombat_leave", no="4534", stamp="НЕВІДКЛАДНО", **{"from": "bn_chief_of_staff"}, to="stroy_chief",
   title="Про строк із дня подання",
   body="Рапорт командира батальйону на щорічну відпустку подано 13 діб тому, зареєстровано сьогодні. Строк розгляду обчислюється з дня подання, а не з дня реєстрації. Залишок строку: одна доба.",
   deadlineLabel="Строк розгляду рапорту",
   deadline=[["З дня подання", "14 діб", "plain"], ["Минуло", "13 діб", "plain"], ["Лишилось", "одна доба", "alert"]],
   choicesNote="Рапорт комбата в шухляду не кладуть.",
   choices=[
     ch("diligent", "diligent", "Провести поза чергою", {"slow": [S("raporty")], "rep": 10, "arc": "kombat_leave"}),
     ch("kombat_desk", "special", "Покласти комбату на стіл", {"kombat": {"pct": 50, "maxMin": 30}}, note="Якщо комбат на позиціях, резолюції ×0,25 до 30 хв")])

tg(id="tg_0019_eighteen_docs", no="4541", stamp="ТЕРМІНОВО", **{"from": "bde_support"}, to="bn_commander",
   title="Про вісімнадцять документів",
   body="Для списання одного FPV-дрона подати 18 документів згідно з переліком (додаток на 3 арк.). Акт пуску та акт технічного стану входять до переліку.",
   deadline="std",
   followUps=[{"afterHours": 20, "id": "tg_0019b_two_acts"}],
   choices=[
     ch("diligent", "diligent", "Зібрати всі вісімнадцять", {"paper": 18, "slow": [S("akty")], "rep": 10, "curioAfterFollowUp": "16 документів понад норму"}),
     ch("formal_reply", "formal_reply", "Подати два акти", {"durationMin": 2, "inspPct": 25, "inspRollAfterHours": 24}),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Зареєстровано у вхідних.")])

tg(id="tg_0020_gift_price", no="4547", **{"from": "fin_chief"}, to="stroy_chief",
   title="Про вартість подарунка",
   body="Квадрокоптер (1 шт.), отриманий від волонтерів, прийняти на облік після визначення ціни. Чек волонтера не годиться. Узгодити, як техніка правильно називається і чи є вона в штаті підрозділу.",
   deadline="std", schedule={"requires": {"raceActive": "drone"}},
   choices=[
     ch("diligent", "diligent", "Попросити накладну в Ліни", {"rep": 5, "race": {"docHours": 4}}, note="Гонка: акт +4 год"),
     ch("formal_reply", "formal_reply", "Ціну взяти з сайту магазину", {"durationMin": 5, "paper": 1, "roll": {"pct": 30, "effects": {"race": {"docHours": 2}}, "text": "Чек волонтера не годиться. Треба визначати ціну."}}, note="ризик «Первинка є?»"),
     ch("drawer", "drawer", "Покласти в шухляду", {"race": {"pauseDoc": True}}, note="Акт стоїть. Таймер пташки йде.")])

tg(id="tg_0021_thesis", no="4552", **{"from": "bn_chief_of_staff"}, to="stroy_chief",
   title="Про тезову доповідь",
   body="Письмову доповідь про стан документообігу перед доповіддю командиру тезово переповісти усно. Тези усної доповіді подати письмово.",
   deadline="std",
   choices=[
     ch("diligent", "diligent", "Вивчити напам'ять", {"slow": [S("stroy")], "rep": 5}),
     ch("formal_reply", "formal_reply", "Переказати своїми словами", {"durationMin": 1, "roll": {"pct": 50, "effects": {"rep": -3}, "text": "Своїми словами не треба. Тезово."}}),
     ch("drawer", "drawer", "Віддати роздруківку Каві", {}, note="Кава прочитає її вголос на нараді.")])

tg(id="tg_0022_excel", no="4558", **{"from": "higher_hq"}, to="bn_commander",
   title="Про Excel",
   body="На перехідний період облік особового складу дозволено вести в Excel. Кожен аркуш Excel роздрукувати, підписати й підшити.",
   deadline="std",
   choices=[
     ch("diligent", "diligent", "Друкувати кожен аркуш", {"paper": 40, "slow": [S("stroy")], "rep": 5}, result="Принтер «Дід» охолоняє. Стройова друкує повільніше."),
     ch("formal_reply", "formal_reply", "Підписати зведену відомість", {"durationMin": 2, "inspPct": 10, "digitalShield": True}, result="Так дозволяє наказ. Телеграма про це не знає."),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Файл збережено. Шухляду закрито.")])

tg(id="tg_0023_reels", no="4563", **{"from": "info_security"}, to="stroy_chief",
   title="Про бобіни",
   body="Облікувати електронні носії стройової частини: гнучкі магнітні диски, касети та бобіни з магнітною стрічкою, модулі флеш-пам’яті. На ноутбуці етикетку наклеїти на кришку корпусу, що закриває жорсткий магнітний диск.",
   deadline=[["Служба захисту інформації", "10 діб", "old"], ["Бригада", "5 діб", "old"], ["Батальйон", "2 доби", "old"], ["Ви", "минув учора", "alert"]],
   appendix={"title": "Додаток 1. Облік носіїв стройової частини (заповнити)", "rows": ["Гнучкі магнітні диски", "Касети з магнітною стрічкою", "Бобіни з магнітною стрічкою", "Модулі флеш-пам’яті", "Ноутбуки з етикеткою на кришці"]},
   choices=[
     ch("diligent", "diligent", "Облікувати все, що є", {"slow": [S("stroy")], "rep": 10}, result="Бобін не виявлено. Кришки над диском у ноутбука теж."),
     ch("formal_reply", "formal_reply", "Доповісти: бобін немає", {"durationMin": 1, "inspPct": 10}),
     ch("drawer", "drawer", "Покласти в шухляду", {"setFlag": "flash_unregistered"}, note="Флешка лежить у шухляді. Необлікована.")])

tg(id="tg_0024_fuel_order", no="4570", **{"from": "bde_support"}, to="bn_commander",
   title="Про наряд у чотирьох примірниках",
   body="Пальне для генератора видавати за нарядом у чотирьох примірниках, якщо немає інформаційної системи. Інформаційної системи немає.",
   deadline="std",
   choices=[
     ch("diligent", "diligent", "Виписати чотири примірники", {"paper": 4, "rep": 5, "fuel": {"refuelBlockedHours": 1, "fillAfterHours": 1}}, note="бак повний за 1 год"),
     ch("formal_reply", "formal_reply", "Видати під усне розпорядження", {"rep": -5, "inspPct": 20, "fuel": {"fillTank": True}}, note="Бак повний одразу"),
     ch("drawer", "drawer", "Покласти в шухляду", {"fuel": {"refuelBlockedHours": 1}}, note="Генератор доїдає залишок.")])

tg(id="tg_0025_prize", no="4577", **{"from": "higher_hq"}, to="bn_commander",
   title="Про перехідний приз",
   body="Перехідний приз за кращу організацію діловодства передати наступному переможцю за актом передачі перехідного призу. Передачу внести до книги обліку призів і подарунків.",
   deadline="std", schedule={"requires": {"digitizationsMin": 1}},
   followUps=[{"afterHours": 24, "id": "tg_0025b_prize_cancelled"}],
   choices=[
     ch("diligent", "diligent", "Скласти акт передачі", {"paper": 2, "slow": [S("stroy")]}),
     ch("formal_reply", "formal_reply", "Відписати, що приз не отримували", {"durationMin": 2, "rep": -5}),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Приз стоїть на полиці.")])

# ---------- Level 2 (texts.md 26-30) ----------
tg(id="tg_0026_kopiyka", no="К-0412", level=2, docType="message", **{"from": "treasury"}, to="bde_fin",
   title="Про копійку",
   body="Платіжну інструкцію повернуто без виконання. Сума в реєстрі бюджетних фінансових зобов'язань відрізняється від суми платіжної інструкції на 0,01 грн. За зміст підтвердних документів Казначейство не відповідає.",
   deadlineLabel="Строк виправлення на кожному рівні",
   deadline=[["Казначейство", "3 робочі дні", "old"], ["Фінслужба бригади", "1 доба", "old"], ["Ви", "минув учора", "alert"]],
   choices=[
     ch("diligent", "diligent", "Переробити реєстр і платіжку", {"paper": 3, "slow": [S("kazna")], "rep": 10}),
     ch("formal_reply", "formal_reply", "Виправити суму ручкою", {"durationMin": 1, "roll": {"pct": 50, "effects": {"slow": [S("kazna", STALL, 1)]}, "text": "Повернуто вдруге. Казначейство ×0,25 на 1 год."}}, note="ризик повернення"),
     ch("drawer", "drawer", "Покласти в шухляду", {"returnsAfterHours": 4}, note="Копійка в шухляді. Документ теж.")])

tg(id="tg_0027_payment_order", no="К-0419", level=2, docType="message", **{"from": "treasury"}, to="bde_fin",
   title="Про платіжне доручення",
   body="Платіжне доручення № 17 повернуто. Термін «платіжне доручення» виключено. Подати платіжну інструкцію № 17 того самого змісту.",
   deadline="std",
   choices=[
     ch("diligent", "diligent", "Передрукувати на новій формі", {"paper": 1, "slow": [S("kazna")]}),
     ch("formal_reply", "formal_reply", "Виправити назву від руки", {"durationMin": 1, "roll": {"pct": 50, "effects": {"returnsAfterHours": 1}, "text": "Повернуто з тієї самої причини."}}, note="ризик повернення"),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Доручення лишилось дорученням.")])

tg(id="tg_0028_media", no="К-0423", level=2, docType="message", **{"from": "treasury"}, to="bde_fin",
   title="Про носії",
   body="Підтвердні документи до платіжної інструкції подати на паперових та електронних носіях.",
   deadline="std",
   choices=[
     ch("diligent", "diligent", "Папір і флешка", {"paper": 5, "slow": [S("kazna"), S("stroy")], "ifFlag": {"flag": "flash_unregistered", "effects": {"paper": 5, "slow": [S("kazna")], "inspPct": 10, "clearFlag": True}}}),
     ch("treasury_system", "special", "Через систему Казначейства", {"ifNoClerk": {"target": "kazna", "effects": {"slow": [S("kazna", STALL, 1)]}, "text": "Шукають, хто знає пароль."}}, note="З діловодом одразу. Без нього Казна ×0,25 на 1 год"),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Документи лежать. На обох носіях.")])

tg(id="tg_0029_rewrite_order", no="4608", level=2, **{"from": "bde_chief_of_staff"}, to="stroy_chief",
   title="Про переписування наказу",
   body="Наказ по частині № 214 довести до батальйонів. Кожен рівень управління переписує наказ до своїх журналів. Переписувати різним виконавцям.",
   deadline="std",
   choices=[
     ch("diligent", "diligent", "Переписати в усі журнали", {"paper": 6, "slow": [S("nakazy")], "rep": 10}),
     ch("formal_reply", "formal_reply", "Надіслати один електронний примірник", {"durationMin": 2, "inspPct": 15, "inspExtraItem": "where_journal"}),
     ch("drawer", "drawer", "Покласти в шухляду", {"delayed": [{"afterHours": 6, "effects": {"rep": -5}}]}, note="Наказ лежить. Батальйони не в курсі.")])

tg(id="tg_0030_trip", no="4612", level=2, **{"from": "bde_chief_of_staff"}, to="stroy_chief",
   title="Про відрядження",
   body="Начальнику стройової частини прибути до штабу бригади на нараду. Документи з грифом «Для службового користування» при собі не мати. Надіслати їх заздалегідь.",
   deadline="std",
   choices=[
     ch("diligent", "diligent", "Надіслати документи наперед", {"slow": [S("stroy")], "rep": 5}, result="Документи їдуть 2 год, ти 1. Годину чекаєш власні документи."),
     ch("no_documents", "formal_reply", "Їхати без документів", {"rep": -5}, result="Нарада без документів. Простою немає."),
     ch("via_petro", "special", "Передати документи з Петром", {"slow": [S("stroy")], "rep": 5, "clerkAway": {"target": "akty", "hours": 4}}, note="Петро теж у відрядженні.")])

# ---------- Level 1, batch 3 (decision 27: after the 1st digitization, № 31-35) ----------
DIG1 = {"requires": {"digitizationsMin": 1}}

tg(id="tg_0031_no_duplicates", no="4584", stamp="ТЕРМІНОВО", **{"from": "bde_support"}, to="bn_commander",
   title="Про дублювання",
   body="Дані, внесені в систему обліку, дублювати на папері заборонено. Про виконання доповісти письмово. Доповідь роздрукувати й підшити.",
   deadline="std", schedule=DIG1,
   choices=[
     ch("diligent", "diligent", "Надрукувати доповідь", {"paper": 1, "slow": [S("stroy")], "rep": 5}, result="Доповідь про відмову від паперу підшито. Аркуш 1 з 1."),
     ch("formal_reply", "formal_reply", "Доповісти в системі", {"durationMin": 1, "rep": -5, "inspPct": 10, "digitalShield": True}, result="Система прийняла. Штаб чекає паперовий примірник."),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Дані в системі. Телеграма в шухляді. Дубля немає.")])

tg(id="tg_0032_remarks", no="4589", **{"from": "bn_chief_of_staff"}, to="stroy_chief",
   title="Про погодження із зауваженнями",
   body="Проєкт наказу погоджено із зауваженнями. Погодження із зауваженнями не допускається. Проєкт повернути погоджувачу для погодження без зауважень. Зауваження не знімати.",
   deadline="std", schedule=DIG1,
   choices=[
     ch("diligent", "diligent", "Нове коло погоджень", {"slow": [S("kombat")], "rep": 5}, result="Погоджено без зауважень. Зауваження надійшли окремим листом."),
     ch("formal_reply", "formal_reply", "Зауваження в коментар", {"durationMin": 1, "rep": -5, "inspPct": 10}, result="Коментар прийнято. Зауважень у погодженні немає."),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Проєкт лежить. Із зауваженнями.")])

tg(id="tg_0033_extra_words", no="4593", **{"from": "higher_hq"}, to="bn_commander",
   title="Про зайві слова",
   body="З текстів документів вилучити зайві слова: «вільна вакансія», «моя власна думка», «власноручний підпис». Вилучення засвідчити власноручним підписом.",
   deadline="std", schedule=DIG1,
   choices=[
     ch("diligent", "diligent", "Вичитати всі шаблони", {"slow": [S("stroy")], "rep": 5}, result="Вилучено. Засвідчено. Власноручно."),
     ch("formal_reply", "formal_reply", "Засвідчити КЕП", {"durationMin": 1, "rep": -5, "inspPct": 10, "digitalShield": True}, result="Засвідчено електронним підписом. Він теж особистий."),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Зайві слова лежать у шухляді. Підпис теж.")])

tg(id="tg_0034_qr_code", no="4596", **{"from": "bn_chief_of_staff"}, to="stroy_chief",
   title="Про QR-код",
   body="QR-код розміром 21 на 21 мм розміщувати в нижньому лівому куті першої сторінки. Розмір перевіряти лінійкою на роздруківці.",
   deadline="std", schedule=DIG1,
   choices=[
     ch("diligent", "diligent", "Переміряти лінійкою", {"paper": 2, "slow": [S("stroy")], "rep": 5}, result="{m:Передрукував|f:Передрукувала} двічі. На третій раз вийшло 21 на 21."),
     ch("formal_reply", "formal_reply", "Доповісти: за шаблоном", {"durationMin": 1, "rep": -5, "inspPct": 15}),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="QR-код на місці. Лінійка в шухляді.")])

tg(id="tg_0035_capitals", no="4600", **{"from": "fin_chief"}, to="stroy_chief",
   title="Про великі літери",
   body="Засвідчені документи повернуто: прізвище написано не повністю великими літерами. Виправити й засвідчити повторно. Прізвище в системі привести у відповідність до паперового.",
   deadline="std", schedule=DIG1,
   choices=[
     ch("diligent", "diligent", "Переписати великими", {"paper": 3, "slow": [S("fin")], "rep": 5}, result="ПРІЗВИЩЕ виправлено. Ім'я Фінслужба не перевіряла."),
     ch("formal_reply", "formal_reply", "Виправити в системі", {"durationMin": 1, "roll": {"pct": 30, "effects": {"returnsAfterHours": 1}, "text": "Повернуто: на папері досі малими."}}, note="ризик повернення"),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Прізвище лежить у шухляді. Малими літерами.")])

# ---------- Level 2, batch 2 (decision 27: № 36-40) ----------
tg(id="tg_0036_shovel_commissioning", no="4617", level=2, **{"from": "fin_chief"}, to="stroy_chief",
   title="Про введення в експлуатацію",
   body="Лопату штикову (1 шт.) ввести в експлуатацію. Пакет документів (10 арк.) погодити десятьма підписами й подати до Казначейства через фінансову службу. До завершення погодження лопату не використовувати.",
   deadline="std",
   choices=[
     ch("diligent", "diligent", "Зібрати 10 підписів", {"paper": 10, "slow": [S("kazna")], "rep": 10}, result="Пакет пішов до Казначейства. Лопата чекає в коридорі."),
     ch("formal_reply", "formal_reply", "Подати з дев'ятьма", {"durationMin": 2, "roll": {"pct": 50, "effects": {"slow": [S("kazna", STALL, 1)]}, "text": "Повернуто: бракує десятого підпису. Казначейство ×0,25 на 1 год."}}, note="ризик повернення"),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Лопата стоїть у кутку. Не введена.")])

tg(id="tg_0037_latin", no="К-0431", level=2, docType="message", **{"from": "treasury"}, to="bde_fin",
   title="Про латиницю",
   body="Платіжну інструкцію повернуто без виконання. Назву товару в призначенні платежу написано латинськими літерами. Реквізити платіжної інструкції заповнювати державною мовою.",
   deadline="std",
   choices=[
     ch("diligent", "diligent", "Переписати кирилицею", {"paper": 1, "slow": [S("kazna")], "rep": 5}, result="Назву товару переписано. Товар про це не знає."),
     ch("formal_reply", "formal_reply", "Послатися на правила", {"durationMin": 2, "rep": -5, "inspPct": 10, "digitalShield": True}, result="Латиниця дозволена, якщо її передбачають правила системи."),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Платіжка лежить. Латиницею.")])

tg(id="tg_0038_autumn_cleanup", no="4621", level=2, **{"from": "bde_chief_of_staff"}, to="stroy_chief",
   title="Про осіннє прибирання",
   body="Накази по частині, що втратили чинність, вилучити з журналів. На вилучення кожного наказу видати наказ по частині. Нові накази внести до журналів.",
   deadline="std",
   choices=[
     ch("diligent", "diligent", "Наказ на кожен наказ", {"paper": 4, "slow": [S("nakazy")], "rep": 10}, result="Журнал схуд на тридцять наказів і поправився на тридцять."),
     ch("formal_reply", "formal_reply", "Один наказ на всі", {"durationMin": 2, "rep": -5, "inspPct": 15}, result="Вилучено одним наказом. Його теж колись вилучать."),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Застарілі накази лежать. Їм не звикати.")])

tg(id="tg_0039_originals", no="4625", level=2, **{"from": "bde_chief_of_staff"}, to="stroy_chief",
   title="Про примірники оригіналу",
   body="Спільний наказ подати на підпис у шести примірниках. На кожному в правому верхньому куті поставити штамп «ОРИГІНАЛ. Прим. № ___». Усі шість примірників — оригінали.",
   deadline="std",
   choices=[
     ch("diligent", "diligent", "Шість оригіналів", {"paper": 6, "slow": [S("nakazy")], "rep": 5}, result="Шість оригіналів. Копії немає жодної."),
     ch("formal_reply", "formal_reply", "Оригінал і п'ять копій", {"durationMin": 2, "rep": -5, "inspPct": 15}),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Штамп лежить у шухляді. Оригінальний.")])

tg(id="tg_0040_cabinets", no="4630", level=2, **{"from": "info_security"}, to="stroy_chief",
   title="Про шафи, що опечатуються",
   body="Справи з грифом «Для службового користування» зберігати у шафах (сейфах), що надійно замикаються та опечатуються. Про наявність таких шаф у приміщенні будинку культури доповісти.",
   deadline="std",
   choices=[
     ch("diligent", "diligent", "Опечатати гардероб", {"paper": 1, "slow": [S("stroy")], "rep": 5}, result="Шафу знайдено в гардеробі. Номерки здано під підпис."),
     ch("formal_reply", "formal_reply", "Доповісти: сейф є", {"durationMin": 1, "rep": -5, "inspPct": 15}, result="Сейф є. На ньому спить кіт."),
     ch("drawer", "drawer", "Покласти в шухляду", {}, note="Справи лежать на сейфі. Під котом.")])

# ---------- Event type «Новий наказ скасовує старий» ----------
tg(id="tg_override_order", no="4549", kind="override", stamp="НЕВІДКЛАДНО", **{"from": "higher_hq"}, to="bn_commander",
   kicker="Новий наказ скасовує старий", title="Про втрату чинності",
   body="Наказ № {n} вважати таким, що втратив чинність. Документи, оформлені згідно з ним, переоформити згідно з наказом № {n1}. Наказ № {n1} буде доведено додатково.",
   deadline=[["Командування", "2 доби", "old"], ["Ви", "минув учора", "alert"]],
   schedule={"minGapDays": 3, "fromDay": 2, "orderNoStart": 118},
   choices=[
     ch("redo_documents", "diligent", "Переоформити три документи", {"paper": 3, "slow": [S("stroy")]}),
     ch("cite_digital", "special", "Послатися на цифровий облік", {}, requires={"digitalPoints": 1}, note="Захист за цифрові бали: без наслідків", disabledReason="Немає цифрових балів. Їх дає перша цифровізація.")])

# ---------- Notices: telegrams without choices (follow-ups) ----------
tg(id="tg_0010b_4502", no="4502", kind="notice", stamp="СКАСОВАНО", **{"from": "higher_hq"}, to="bn_commander",
   title="Про доповідь", body="Доповісти до кінця доби.", deadline="std", choices=[])
tg(id="tg_0017b_photo_stamp", no="4536", kind="notice", **{"from": "higher_hq"}, to="bn_commander",
   title="Про засвідчення фото", body="Фото відбитка засвідчити печаткою.", deadline="std", choices=[])
tg(id="tg_0019b_two_acts", no="4544", kind="notice", **{"from": "bde_support"}, to="bn_commander",
   title="Про списання", body="Для списання FPV-дрона досить двох документів: акта пуску та акта технічного стану.",
   deadline="std", effects={"cancelInspRollOf": "tg_0019_eighteen_docs"}, choices=[])
tg(id="tg_0025b_prize_cancelled", no="4581", kind="notice", **{"from": "higher_hq"}, to="bn_commander",
   title="Про скасування форм", body="Акт передачі перехідного призу та книгу обліку призів і подарунків скасовано.",
   deadline="std", effects={"journal": "prizes_gifts_book"}, choices=[])

# ---------- validation ----------
ids = set()
STAGES = {"kombat", "stroy", "fin", "kazna", "raporty", "akty", "dovidky", "nakladni", "nakazy"}
def walk_eff(e, where):
    for s in e.get("slow", []):
        assert s["target"] in STAGES, where
    for k in ("roll",):
        if k in e: walk_eff(e[k]["effects"], where)
    for d in e.get("delayed", []): walk_eff(d["effects"], where)
    if "ifFlag" in e: walk_eff(e["ifFlag"]["effects"], where)
    if "ifNoClerk" in e: walk_eff(e["ifNoClerk"]["effects"], where)
for t in T:
    assert t["id"] not in ids, t["id"]; ids.add(t["id"])
    k = t["kind"]
    n = len(t["choices"])
    if k == "notice": assert n == 0
    else: assert 2 <= n <= 4, t["id"]
    if k != "notice":
        assert any(not c["effects"].get("paper") for c in t["choices"]), "no paper-free option " + t["id"]
    cids = [c["id"] for c in t["choices"]]
    assert len(cids) == len(set(cids)), t["id"]
    for c in t["choices"]:
        walk_eff(c["effects"], t["id"])
        assert c["kind"] in ("diligent", "formal_reply", "drawer", "special")
        assert len(c.get("note", "")) <= 60, (t["id"], c["id"])
for t in T:
    for f in t.get("followUps", []): assert f["id"] in ids, f
    for c in t["choices"]:
        for q in c["effects"].get("queueNext", []): assert q in ids, q
numbered = [t for t in T if t["kind"] == "standard"]
assert len(numbered) == 40, len(numbered)
for t in T:
    for c in t["choices"]:
        def nozero(e):
            for s_ in e.get("slow", []): assert s_["mult"] >= 0.25, t["id"]
            if "roll" in e: nozero(e["roll"]["effects"])
            if "ifNoClerk" in e: nozero(e["ifNoClerk"]["effects"])
            if "kombat" in e: assert e["kombat"]["maxMin"] <= 30, t["id"]
            if "fuel" in e: assert e["fuel"].get("refuelBlockedHours", 0) <= 1, t["id"]
        nozero(c["effects"])

ORDER = ["id", "rev", "no", "level", "kind", "docType", "stamp", "kicker", "from", "to", "title", "body",
         "deadlineLabel", "deadline", "appendix", "schedule", "followUps", "effects", "choicesNote", "placeholder", "choices"]
DEFAULTS = {"rev": 1, "kind": "standard", "docType": "telegram"}
GROUPS = [["id", "no", "level", "kind", "docType", "stamp", "rev"], ["from", "to", "kicker", "title"]]
def dump(t):
    keys = [k for k in ORDER if k in t] + [k for k in t if k not in ORDER]
    keys = [k for k in keys if not (k in DEFAULTS and t[k] == DEFAULTS[k])]
    head, used = [], set()
    for g in GROUPS:
        part = [k for k in g if k in keys]
        if part:
            head.append(", ".join('"%s": %s' % (k, json.dumps(t[k], ensure_ascii=False)) for k in part)); used.update(part)
    for k in keys:
        if k == "choices" or k in used: continue
        head.append('"%s": %s' % (k, json.dumps(t[k], ensure_ascii=False)))
    out = "  {\n    " + ",\n    ".join(head)
    if t["choices"]:
        out += ',\n    "choices": [\n      ' + ",\n      ".join(json.dumps(c, ensure_ascii=False) for c in t["choices"]) + "\n    ]"
    else:
        out += ',\n    "choices": []'
    return out + "\n  }"
txt = "[\n" + ",\n".join(dump(t) for t in T) + "\n]\n"
json.loads(txt)
open(sys.argv[1], "w", encoding="utf-8").write(txt)
print("ok", len(T), "entries,", len(txt.encode("utf-8")), "bytes")
