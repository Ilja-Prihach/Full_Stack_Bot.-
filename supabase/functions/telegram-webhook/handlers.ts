import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  TELEGRAM_BOT_TOKEN,
} from "./config.ts";
import { generateAutoReply } from "./ai.ts";
import {
  hasSupabaseConfig,
  incrementTodayAiReplyCount,
  saveAiBotMessage,
  saveAiReplyEvent,
  saveIncomingMessage,
} from "./messages.ts";
import { sendTelegramMessage, type TelegramMessageData } from "./telegram.ts";

const MAX_MESSAGE_LENGTH = 500;

const GREETING_REPLY =
  "Здравствуйте! Я бот поддержки веб-студии PixelCraft. Чем могу помочь?";

const GRATITUDE_REPLY =
  "Пожалуйста! Всегда рад помочь. Если появятся ещё вопросы по сайту или проекту, пишите.";

const FAREWELL_REPLY =
  "Хорошего дня! Если понадобится помощь по сайту или проекту, пишите.";

const AGREEMENT_REPLY =
  "Отлично, тогда передаю ваш ответ менеджеру. Он свяжется с вами и подскажет дальнейшие шаги.";

const APOLOGY_REPLY =
  "Ничего страшного. Если хотите, продолжайте, и я постараюсь помочь.";

const MANAGER_REQUEST_REPLY =
  "Хорошо, передаю ваш запрос менеджеру. Он свяжется с вами в ближайшее время.";

const DECLINE_REPLY =
  "Хорошо, понял. Если вопрос снова станет актуален, просто напишите — я или менеджер подскажем дальше.";

const URGENCY_REPLY =
  "Понял вас. Я передал, что вопрос срочный, менеджер свяжется с вами при первой возможности.";

const OUT_OF_SCOPE_REPLY =
  "Я консультирую только по вопросам нашей веб-студии: разработка сайтов, дизайн, стоимость, сроки, поддержка и услуги. Если ваш вопрос по этим темам, напишите подробнее. Я передам ваш вопрос менеджеру.";

const FALLBACK_REPLY =
  "К сожалению, я не нашёл точного ответа на ваш вопрос. Я передал ваш запрос менеджеру — он свяжется с вами в ближайшее время.";

const GREETING_PATTERNS = [
  "привет",
  "прив",
  "приветик",
  "приветики",
  "приветствую",
  "здравствуйте",
  "здраствуйте",
  "здравствуй",
  "здарова",
  "здоров",
  "здоровеньки",
  "добрый день",
  "доброго дня",
  "доброе утро",
  "с добрым утром",
  "добрый вечер",
  "доброго вечера",
  "хай",
  "хаюшки",
  "хелло",
  "hello",
  "hey",
  "heya",
  "yo",
  "hi",
  "здорово",
  "салют",
  "шалом",
  "дратути",
  "драсьте",
  "доброго времени суток",
  "день добрый",
  "вечер добрый",
  "утро доброе",
  "добрейший вечерочек",
  "доброго утра",
  "доброй ночи",
  "доброй ноченьки",
  "ку",
  "куку",
  "qq",
  "q",
  "хола",
  "hola",
  "aloha",
  "бонжур",
  "bonjour",
  "greetings",
  "good morning",
  "good afternoon",
  "good evening",
  "sup",
  "wassup",
  "what's up",
];

const GRATITUDE_PATTERNS = [
  "спасибо",
  "спасиб",
  "спасибки",
  "спасибо большое",
  "большое спасибо",
  "огромное спасибо",
  "благодарочка",
  "благодарю",
  "благодарствую",
  "признателен",
  "признательна",
  "очень благодарен",
  "очень благодарна",
  "спс",
  "спсб",
  "пасиб",
  "пасиба",
  "мерси",
  "thanks",
  "thanks a lot",
  "many thanks",
  "thank you",
  "thx",
  "ty",
  "tysm",
];

const FAREWELL_PATTERNS = [
  "пока",
  "покеда",
  "покедова",
  "понял",
  "поняла",
  "понятно",
  "все понятно",
  "всё понятно",
  "все ясно",
  "всё ясно",
  "ясно",
  "ясненько",
  "ок ясно",
  "ок, ясно",
  "окей ясно",
  "окей, ясно",
  "хорошо ясно",
  "ну понятно",
  "ладно понятно",
  "ладно, понятно",
  "понял спасибо",
  "поняла спасибо",
  "понятно спасибо",
  "ясно спасибо",
  "ясно, спасибо",
  "понял, спасибо",
  "поняла, спасибо",
  "ок понял",
  "ок, понял",
  "окей понял",
  "окей, понял",
  "ок понял, спасибо",
  "ок, понял, спасибо",
  "хорошо понял",
  "хорошо, понял",
  "понял вас",
  "поняла вас",
  "понял, благодарю",
  "поняла, благодарю",
  "принял",
  "принято",
  "принял спасибо",
  "принято спасибо",
  "принял, спасибо",
  "принято, спасибо",
  "принял к сведению",
  "ок, принял",
  "ок принял",
  "окей принял",
  "окей, принял",
  "хорошо, принял",
  "ладно",
  "ну ладно",
  "ладно тогда",
  "ладно, тогда",
  "хорошо тогда",
  "ок тогда",
  "ок, тогда",
  "договорились тогда",
  "договорились, тогда",
  "все ок",
  "всё ок",
  "все хорошо",
  "всё хорошо",
  "окей",
  "оке",
  "ок",
  "good",
  "got it",
  "understood",
  "i got it",
  "okay got it",
  "alright",
  "all right",
  "fine",
  "makes sense",
  "до свидания",
  "досвидания",
  "всего доброго",
  "всего хорошего",
  "хорошего дня",
  "хорошего вечера",
  "хороших выходных",
  "удачи",
  "всего наилучшего",
  "до встречи",
  "до скорого",
  "до завтра",
  "до понедельника",
  "до связи тогда",
  "тогда до связи",
  "доброй ночи",
  "до связи",
  "созвонимся",
  "увидимся",
  "бай",
  "бай бай",
  "bye",
  "bye bye",
  "goodbye",
  "see you",
  "see ya",
  "see you later",
  "have a nice day",
  "take care",
  "have a good day",
  "talk later",
  "catch you later",
];

const AGREEMENT_PATTERNS = [
  "подходит",
  "мне подходит",
  "нам подходит",
  "устраивает",
  "меня устраивает",
  "нас устраивает",
  "согласен",
  "согласна",
  "договорились",
  "отлично",
  "хорошо",
  "ок",
  "окей",
  "оке",
  "okay",
  "okey",
  "окей, подходит",
  "давайте",
  "да, давайте",
  "готов",
  "готова",
  "можно начинать",
  "можно стартовать",
  "подтверждаю",
  "подтверждаем",
  "поехали",
  "берем",
  "берём",
  "идем дальше",
  "идём дальше",
  "устроит",
  "супер",
  "нормально",
  "норм",
];

const APOLOGY_PATTERNS = [
  "извините",
  "извини",
  "простите",
  "прошу прощения",
  "сорри",
  "сори",
  "сорян",
  "мой косяк",
  "моя ошибка",
  "ошибся",
  "ошиблась",
  "не туда написал",
  "не туда написала",
  "sorry",
  "my bad",
  "pardon",
];

const MANAGER_REQUEST_PATTERNS = [
  "свяжите с менеджером",
  "свяжи с менеджером",
  "позовите менеджера",
  "позови менеджера",
  "нужен менеджер",
  "хочу менеджера",
  "дайте менеджера",
  "переключите на менеджера",
  "переведите на менеджера",
  "переключите на человека",
  "хочу поговорить с человеком",
  "нужен человек",
  "живой человек",
  "оператор",
  "нужен оператор",
  "позовите оператора",
  "manager please",
  "need manager",
  "human please",
  "talk to manager",
  "talk to human",
];

const DECLINE_PATTERNS = [
  "не надо",
  "не нужно",
  "неинтересно",
  "не интересно",
  "не актуально",
  "неактуально",
  "не подойдет",
  "не подойдёт",
  "не подходит",
  "не устраивает",
  "отказываюсь",
  "отказ",
  "пока не нужно",
  "пока не надо",
  "сейчас не нужно",
  "сейчас не актуально",
  "не будем",
  "не хочу",
  "не требуется",
  "не требуется уже",
  "уже не нужно",
  "спасибо, не надо",
  "нет, не надо",
  "нет, спасибо",
  "leave it",
  "not needed",
  "not interested",
  "no thanks",
];

const URGENCY_PATTERNS = [
  "срочно",
  "очень срочно",
  "как можно скорее",
  "побыстрее",
  "быстрее пожалуйста",
  "когда свяжется менеджер",
  "когда ответит менеджер",
  "когда со мной свяжутся",
  "жду ответа",
  "жду менеджера",
  "мне срочно нужен ответ",
  "мне срочно нужен менеджер",
  "есть кто живой",
  "есть кто-нибудь",
  "кто-нибудь ответит",
  "ответьте пожалуйста",
  "ответьте быстрее",
  "нужно срочно",
  "asap",
  "urgent",
  "when will manager reply",
  "need answer fast",
];

function normalizeMessageText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isGreetingMessage(messageText: string) {
  const normalized = normalizeMessageText(messageText);

  return GREETING_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isGratitudeMessage(messageText: string) {
  const normalized = normalizeMessageText(messageText);

  return GRATITUDE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isFarewellMessage(messageText: string) {
  const normalized = normalizeMessageText(messageText);

  return FAREWELL_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isAgreementMessage(messageText: string) {
  const normalized = normalizeMessageText(messageText);

  return AGREEMENT_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isApologyMessage(messageText: string) {
  const normalized = normalizeMessageText(messageText);

  return APOLOGY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isManagerRequestMessage(messageText: string) {
  const normalized = normalizeMessageText(messageText);

  return MANAGER_REQUEST_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isDeclineMessage(messageText: string) {
  const normalized = normalizeMessageText(messageText);

  return DECLINE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isUrgencyMessage(messageText: string) {
  const normalized = normalizeMessageText(messageText);

  return URGENCY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

async function sendAndStoreAiReply(clientId: number, chatId: number, replyText: string) {
  await sendTelegramMessage(chatId, replyText);

  const { error: saveAiError } = await saveAiBotMessage(clientId, replyText);

  if (saveAiError) {
    console.error("Failed to save AI bot message:", saveAiError);
  }
}

export async function handleStartCommand(chatId: number) {
  console.log("Handling /start command");

  await sendTelegramMessage(
    chatId,
    "Привет! Я бот поддержки.\nОтправьте сюда ваш вопрос или сообщение, и менеджер увидит его в админке.",
  );

  return new Response("OK", { status: 200 });
}

export async function handleIncomingTextMessage(message: TelegramMessageData) {
  if (!message.chatId || !message.userId || !message.text) {
    throw new Error("Unsupported message payload");
  }

  if (!TELEGRAM_BOT_TOKEN || !hasSupabaseConfig()) {
    console.error("Missing TELEGRAM_BOT_TOKEN or Supabase config", {
      hasTelegramToken: Boolean(TELEGRAM_BOT_TOKEN),
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      hasSupabaseClient: hasSupabaseConfig(),
    });

    return new Response("Server misconfigured", { status: 500 });
  }

  const normalizedMessageText = normalizeMessageText(message.messageText);

  const { error, shouldSendAutoReply, clientId, messageId } = await saveIncomingMessage({
    chatId: message.chatId,
    userId: message.userId,
    username: message.username,
    firstName: message.firstName,
    lastName: message.lastName,
    text: message.messageText,
  });

  if (error) {
    console.error("Failed to save message:", error);
    return Response.json({ ok: false }, { status: 500 });
  }

  if (!shouldSendAutoReply || !clientId || !messageId) {
    return Response.json({ ok: true });
  }

  if (!normalizedMessageText) {
    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "none",
      decision: "ignored_empty_message",
      messageText: message.messageText,
    });

    return Response.json({ ok: true });
  }

  if (normalizedMessageText.length > MAX_MESSAGE_LENGTH) {
    await sendAndStoreAiReply(clientId, message.chatId, FALLBACK_REPLY);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "fallback",
      decision: "fallback_message_too_long",
      messageText: message.messageText,
      replyText: FALLBACK_REPLY,
    });

    return Response.json({ ok: true });
  }

  if (isGreetingMessage(normalizedMessageText)) {
    await sendAndStoreAiReply(clientId, message.chatId, GREETING_REPLY);
    await incrementTodayAiReplyCount(clientId);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "greeting",
      decision: "greeting_sent",
      messageText: message.messageText,
      replyText: GREETING_REPLY,
    });

    return Response.json({ ok: true });
  }

  if (isGratitudeMessage(normalizedMessageText)) {
    await sendAndStoreAiReply(clientId, message.chatId, GRATITUDE_REPLY);
    await incrementTodayAiReplyCount(clientId);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "answer",
      decision: "gratitude_sent",
      messageText: message.messageText,
      replyText: GRATITUDE_REPLY,
    });

    return Response.json({ ok: true });
  }

  if (isFarewellMessage(normalizedMessageText)) {
    await sendAndStoreAiReply(clientId, message.chatId, FAREWELL_REPLY);
    await incrementTodayAiReplyCount(clientId);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "answer",
      decision: "farewell_sent",
      messageText: message.messageText,
      replyText: FAREWELL_REPLY,
    });

    return Response.json({ ok: true });
  }

  if (isAgreementMessage(normalizedMessageText)) {
    await sendAndStoreAiReply(clientId, message.chatId, AGREEMENT_REPLY);
    await incrementTodayAiReplyCount(clientId);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "answer",
      decision: "agreement_sent",
      messageText: message.messageText,
      replyText: AGREEMENT_REPLY,
    });

    return Response.json({ ok: true });
  }

  if (isApologyMessage(normalizedMessageText)) {
    await sendAndStoreAiReply(clientId, message.chatId, APOLOGY_REPLY);
    await incrementTodayAiReplyCount(clientId);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "answer",
      decision: "apology_sent",
      messageText: message.messageText,
      replyText: APOLOGY_REPLY,
    });

    return Response.json({ ok: true });
  }

  if (isManagerRequestMessage(normalizedMessageText)) {
    await sendAndStoreAiReply(clientId, message.chatId, MANAGER_REQUEST_REPLY);
    await incrementTodayAiReplyCount(clientId);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "answer",
      decision: "manager_request_sent",
      messageText: message.messageText,
      replyText: MANAGER_REQUEST_REPLY,
    });

    return Response.json({ ok: true });
  }

  if (isDeclineMessage(normalizedMessageText)) {
    await sendAndStoreAiReply(clientId, message.chatId, DECLINE_REPLY);
    await incrementTodayAiReplyCount(clientId);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "answer",
      decision: "decline_sent",
      messageText: message.messageText,
      replyText: DECLINE_REPLY,
    });

    return Response.json({ ok: true });
  }

  if (isUrgencyMessage(normalizedMessageText)) {
    await sendAndStoreAiReply(clientId, message.chatId, URGENCY_REPLY);
    await incrementTodayAiReplyCount(clientId);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "answer",
      decision: "urgency_sent",
      messageText: message.messageText,
      replyText: URGENCY_REPLY,
    });

    return Response.json({ ok: true });
  }

  try {
    const aiResult = await generateAutoReply(message.messageText);

    if (aiResult.shouldReply && aiResult.answer) {
      await sendAndStoreAiReply(clientId, message.chatId, aiResult.answer);
      await incrementTodayAiReplyCount(clientId);

      await saveAiReplyEvent({
        clientId,
        sourceMessageId: messageId,
        replyType: "answer",
        decision: aiResult.reason ?? "match_found",
        confidence: aiResult.confidence ?? null,
        kbEntryIds: aiResult.matchedEntryIds ?? [],
        messageText: message.messageText,
        replyText: aiResult.answer,
      });

      return Response.json({ ok: true });
    }

    const replyText = aiResult.reason === "no_match" ? OUT_OF_SCOPE_REPLY : FALLBACK_REPLY;

    await sendAndStoreAiReply(clientId, message.chatId, replyText);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "fallback",
      decision: aiResult.reason ?? "fallback_no_match",
      confidence: aiResult.confidence ?? null,
      kbEntryIds: aiResult.matchedEntryIds ?? [],
      messageText: message.messageText,
      replyText,
    });
  } catch (error) {
    console.error("Failed to generate auto-reply:", error);

    await sendAndStoreAiReply(clientId, message.chatId, FALLBACK_REPLY);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "fallback",
      decision: "fallback_internal_error",
      messageText: message.messageText,
      replyText: FALLBACK_REPLY,
    });
  }

  return Response.json({ ok: true });
}
