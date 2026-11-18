const { Telegraf, Markup } = require('telegraf')
const db = require('../db')

const userStates = {}
const SUPPORT_TEXT = '\n\n💬 <i>For support, call or chat with <code>+251930702649</code>.</i>'
const DISCUSSION_GROUP_URL = 'https://t.me/go9872'

const botTranslations = {
  en: {
    selectLanguage: '🌐 <b>Please select your language:</b>\n\n<i>Choose your preferred language to continue.</i>',
    english: '🇬🇧 English',
    amharic: '🇪🇹 አማርኛ',
    player: 'Player',
    languageSet: '✅ <b>Language updated</b>\n\nEnglish is now your preferred language.',
    mainMenu: '🏠 <b>Main Menu</b>\n\n<i>Select an option below to continue playing.</i>',
    playGame: '🎮 Play Game',
    checkBalance: '💰 Check Balance',
    deposit: '💳 Deposit',
    withdraw: '💸 Withdraw',
    myRoom: '🏠 My Room',
    help: '❓ Help',
    discussionGroup: '💬 Join Discussion Group',
    launchPrompt: '🎮 <b>Ready to play?</b>\n\nSelect a stake amount below to enter the game.',
    playBingo: '🎰 Play Bingo',
    balance: '💰 <b>Your Current Balance</b>\n\n<code>ETB {{amount}}</code>',
    userNotFound: '⚠️ <b>User Not Found</b>\n\nPlease open the Mini App first to register.',
    balanceFailed: '⚠️ <b>Balance Unavailable</b>\n\nPlease try again shortly.',
    helpMessage: `<b>📖 Game Rules &amp; Help</b>

1️⃣ Open the Mini App.
2️⃣ Select a stake and a card (1–400).
3️⃣ Wait for the countdown to finish.
4️⃣ Mark the called numbers on your card.
5️⃣ Complete a line, diagonal, or all four corners.
6️⃣ Press <b>BINGO!</b> to claim your win.

🏆 <i>If there is more than one winner, the prize is shared.</i>

💬 <a href="${DISCUSSION_GROUP_URL}">Join our discussion group</a>`,
    registerPrompt: '📱 <b>Complete Your Registration</b>\n\nPlease share your phone number to continue.',
    sharePhone: '📱 Share Phone Number',
    depositInstructions: '💳 <b>Deposit Funds</b>\n\n👤 Name: <b>{{name}}</b>\n📱 Telebirr: <code>{{phone}}</code>\n\n1️⃣ Open your Telebirr app.\n2️⃣ Send money to the number above.\n3️⃣ Copy the SMS you receive.\n\n👇 <b>Paste the full SMS here:</b>',
    withdrawPrompt: '💸 <b>Withdraw Funds</b>\n\nEnter the amount you want to withdraw (minimum 100 ETB).\n\n<i>Your request will be processed by an admin.</i>',
    roomPrompt: '🏠 <b>Join a Room</b>\n\nOpen the Mini App and select a stake to continue.',
    invalidReference: '⚠️ <b>Transaction Not Found</b>\n\nCould not find a valid transaction number in that SMS.',
    invalidReceipt: '⚠️ <b>Invalid Receipt</b>\n\nPlease copy the full SMS you received from Telebirr and paste it here.',
    receiptUsed: '⚠️ <b>Receipt Already Used</b>\n\nThis Telebirr receipt has already been submitted.',
    unableDeposit: '⚠️ <b>Deposit Could Not Be Processed</b>\n\nPlease try again later.',
    verificationFailed: '⚠️ <b>Verification Failed</b>\n\n{{error}}',
    depositSubmitted: '✅ <b>Receipt Verified!</b>\n\nYour deposit of <code>ETB {{amount}}</code> has been submitted for admin approval.',
    invalidWithdrawal: '⚠️ <b>Invalid Amount</b>\n\nThe minimum withdrawal is <code>ETB 100</code>.',
    insufficientBalance: '⚠️ <b>Insufficient Balance</b>\n\nYour available balance is <code>ETB {{amount}}</code>.',
    withdrawalPending: '⏳ <b>Withdrawal Requested</b>\n\nYour request for <code>ETB {{amount}}</code> is pending admin approval.',
    requestFailed: '⚠️ <b>Request Failed</b>\n\nPlease try again.',
    alreadyRegistered: '✅ <b>Already Registered</b>\n\nYour account is ready to use.',
    phoneSaved: '✅ <b>Phone Number Saved</b>\n\n<code>{{phone}}</code>\n\nYou can now use the bot normally.',
    registrationComplete: '✅ <b>Registration Complete</b>\n\nPhone number: <code>{{phone}}</code>',
    contactFailed: '⚠️ <b>Contact Could Not Be Saved</b>\n\nPlease try again.',
    inviteEarn: '🎉 <b>Invite &amp; Earn 5%</b>\n\nShare your unique link with friends. When they win a game, you get 5% of their prize!\n\n🔗 <b>Your Link:</b>\n<code>{{link}}</code>\n\n💰 <i>Withdraw your earnings once you reach 1,000 ETB!</i>',
    shareGroup: '📢 Share to Group/Channel',
    shareText: 'Join me on GoBingo and win big! 🎰'
  },
  am: {
    selectLanguage: '🌐 <b>እባክዎ ቋንቋዎን ይምረጡ፦</b>\n\n<i>ለመቀጠል የሚመርጡትን ቋንቋ ይምረጡ።</i>',
    english: '🇬🇧 እንግሊዝኛ',
    amharic: '🇪🇹 አማርኛ',
    player: 'ተጫዋች',
    languageSet: '✅ <b>ቋንቋው ተቀይሯል</b>\n\nአማርኛ እንደ ተመራጭ ቋንቋዎ ተቀምጧል።',
    mainMenu: '🏠 <b>ዋና ምናሌ</b>\n\n<i>ጨዋታውን ለመቀጠል ከታች ያለውን አማራጭ ይምረጡ።</i>',
    playGame: '🎮 ጨዋታ ይጫወቱ',
    checkBalance: '💰 ቀሪ ሂሳብ ይመልከቱ',
    deposit: '💳 ገንዘብ ያስገቡ',
    withdraw: '💸 ገንዘብ ያውጡ',
    myRoom: '🏠 ክፍሌ',
    help: '❓ እርዳታ',
    discussionGroup: '💬 የውይይት ቡድንን ይቀላቀሉ',
    launchPrompt: '🎮 <b>ለመጫወት ዝግጁ ነዎት?</b>\n\nወደ ጨዋታው ለመግባት ከታች የውርርድ መጠን ይምረጡ።',
    playBingo: '🎰 ቢንጎ ይጫወቱ',
    balance: '💰 <b>የአሁኑ ቀሪ ሂሳብዎ</b>\n\n<code>{{amount}} ብር</code>',
    userNotFound: '⚠️ <b>ተጠቃሚው አልተገኘም</b>\n\nለመመዝገብ መጀመሪያ ሚኒ አፑን ይክፈቱ።',
    balanceFailed: '⚠️ <b>ቀሪ ሂሳብ ማሳየት አልተቻለም</b>\n\nእባክዎ ቆይተው እንደገና ይሞክሩ።',
    helpMessage: `<b>📖 የጨዋታ ህጎች እና እርዳታ</b>

1️⃣ ሚኒ አፑን ይክፈቱ።
2️⃣ የውርርድ መጠን እና ካርድ (1–400) ይምረጡ።
3️⃣ ቆጠራው እስኪያልቅ ይጠብቁ።
4️⃣ የተጠሩትን ቁጥሮች በካርድዎ ላይ ምልክት ያድርጉ።
5️⃣ መስመር፣ ሰያፍ ወይም አራቱንም ማዕዘኖች ያጠናቅቁ።
6️⃣ ድልዎን ለማረጋገጥ <b>BINGO!</b> ይጫኑ።

🏆 <i>ከአንድ በላይ አሸናፊ ካለ ሽልማቱ ይከፋፈላል።</i>

💬 <a href="${DISCUSSION_GROUP_URL}">የውይይት ቡድናችንን ይቀላቀሉ</a>`,
    registerPrompt: '📱 <b>ምዝገባዎን ያጠናቅቁ</b>\n\nለመቀጠል እባክዎ ስልክ ቁጥርዎን ያጋሩ።',
    sharePhone: '📱 ስልክ ቁጥር ያጋሩ',
    depositInstructions: '💳 <b>ገንዘብ ያስገቡ</b>\n\n👤 ስም፦ <b>{{name}}</b>\n📱 ቴሌብር፦ <code>{{phone}}</code>\n\n1️⃣ የቴሌብር መተግበሪያዎን ይክፈቱ።\n2️⃣ ከላይ ወደተጠቀሰው ቁጥር ገንዘብ ይላኩ።\n3️⃣ የደረሰዎትን ኤስኤምኤስ ኮፒ ያድርጉ።\n\n👇 <b>ሙሉውን ኤስኤምኤስ እዚህ ይለጥፉ፦</b>',
    withdrawPrompt: '💸 <b>ገንዘብ ያውጡ</b>\n\nማውጣት የሚፈልጉትን መጠን ያስገቡ (ዝቅተኛው 100 ብር)።\n\n<i>ጥያቄዎ በአስተዳዳሪ ይስተናገዳል።</i>',
    roomPrompt: '🏠 <b>ክፍል ይቀላቀሉ</b>\n\nሚኒ አፑን ከፍተው ለመቀጠል የውርርድ መጠን ይምረጡ።',
    invalidReference: '⚠️ <b>ግብይቱ አልተገኘም</b>\n\nበዚያ ኤስኤምኤስ ውስጥ ትክክለኛ የግብይት ቁጥር አልተገኘም።',
    invalidReceipt: '⚠️ <b>ደረሰኙ ትክክል አይደለም</b>\n\nከቴሌብር የተቀበሉትን ሙሉ ኤስኤምኤስ ኮፒ አድርገው እዚህ ይለጥፉ።',
    receiptUsed: '⚠️ <b>ደረሰኙ አስቀድሞ ጥቅም ላይ ውሏል</b>\n\nይህ የቴሌብር ደረሰኝ ቀደም ብሎ ቀርቧል።',
    unableDeposit: '⚠️ <b>ገንዘቡን ማስኬድ አልተቻለም</b>\n\nእባክዎ ቆይተው ይሞክሩ።',
    verificationFailed: '⚠️ <b>ማረጋገጥ አልተሳካም</b>\n\n{{error}}',
    depositSubmitted: '✅ <b>ደረሰኙ ተረጋግጧል!</b>\n\n<code>{{amount}} ብር</code> የሚያሳየው ገንዘብ ለአስተዳዳሪ ማጽደቅ ተልኳል።',
    invalidWithdrawal: '⚠️ <b>የገባው መጠን ትክክል አይደለም</b>\n\nዝቅተኛው የማውጣት መጠን <code>100 ብር</code> ነው።',
    insufficientBalance: '⚠️ <b>በቂ ቀሪ ሂሳብ የለም</b>\n\nያለዎት ቀሪ ሂሳብ <code>{{amount}} ብር</code> ነው።',
    withdrawalPending: '⏳ <b>የማውጣት ጥያቄው ተልኳል</b>\n\nየ<code>{{amount}} ብር</code> ጥያቄዎ የአስተዳዳሪ ማጽደቅ በመጠባበቅ ላይ ነው።',
    requestFailed: '⚠️ <b>ጥያቄው አልተሳካም</b>\n\nእባክዎ እንደገና ይሞክሩ።',
    alreadyRegistered: '✅ <b>አስቀድመው ተመዝግበዋል</b>\n\nመለያዎ ለመጠቀም ዝግጁ ነው።',
    phoneSaved: '✅ <b>ስልክ ቁጥሩ ተቀምጧል</b>\n\n<code>{{phone}}</code>\n\nአሁን ቦቱን በመደበኛው መንገድ መጠቀም ይችላሉ።',
    registrationComplete: '✅ <b>ምዝገባው ተጠናቋል</b>\n\nስልክ ቁጥር፦ <code>{{phone}}</code>',
    contactFailed: '⚠️ <b>የእውቂያ መረጃው አልተቀመጠም</b>\n\nእባክዎ እንደገና ይሞክሩ።',
    inviteEarn: '🎉 <b>ይጋብዙ እና 5% ያግኙ!</b>\n\nልዩ ሊንክዎን ለጓደኞችዎ ያጋሩ። እነሱ ሲያሸንፉ የሽልማታቸውን 5% ያገኛሉ!\n\n🔗 <b>የእርስዎ ሊንክ፦</b>\n<code>{{link}}</code>\n\n💰 <i>ገቢዎ 1,000 ብር ሲደርስ ማውጣት ይችላሉ!</i>',
    shareGroup: '📢 ለቡድን/ቻናል አጋራ',
    shareText: 'በዮጋቢንጎ ይቀላለቁኝ እና ትልቅ ያሸንፉ! 🎰'
  },
}

const botToken = process.env.TELEGRAM_BOT_TOKEN
if (!botToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing!')
  throw new Error('TELEGRAM_BOT_TOKEN is required to initialize the Telegram bot.')
}

const bot = new Telegraf(botToken)

bot.catch((err, ctx) => {
  console.error(`❌ [BOT ERROR] for ${ctx.updateType}:`, err)
})

// GLOBAL MIDDLEWARE: Clear state on any command to prevent state machine locks
bot.use((ctx, next) => {
  if (ctx.message?.text?.startsWith('/') && ctx.from?.id !== undefined) {
    delete userStates[ctx.from.id]
  }
  return next()
})

const DEFAULT_FRONTEND_URL = 'https://ked-seven.vercel.app'

function getStakeButtons(frontendUrl, referralRef) {
  const baseUrl = frontendUrl.replace(/\/$/, '')
  const stakes = [10, 50, 100]
  const buttons = stakes.map((stake) => {
    const url = new URL(`${baseUrl}/select-card`)
    url.searchParams.set('stake', String(stake))
    if (referralRef) url.searchParams.set('ref', referralRef)
    return { text: `🎮 Play ${stake} ETB`, web_app: { url: url.toString() } }
  })
  return [[buttons[0], buttons[1]], [buttons[2]]]
}

function getReferralRefFromStartPayload(payload) {
  if (!payload) return null
  if (payload.startsWith('u_')) return `@${payload.slice(2)}`
  if (payload.startsWith('i_')) return payload.slice(2)
  if (payload.startsWith('@') || /^\d+$/.test(payload)) return payload
  if (payload.startsWith('REF_')) return payload
  return null
}

function botText(lang, key, values = {}) {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{{${name}}}`, () => String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')),
    botTranslations[lang]?.[key] || botTranslations.en[key]
  )
}

try {
  bot.telegram.setChatMenuButton({
    menu_button: { type: 'commands' }
  }).catch((err) => console.error('[BOT SETUP] Failed to configure menu button:', err))

  bot.telegram.setMyCommands([
    { command: 'start', description: 'start' },
    { command: 'play', description: 'play' },
    { command: 'invite', description: 'invite' },
    { command: 'menu', description: 'menu' },
    { command: 'balance', description: 'balance' },
    { command: 'deposit', description: 'deposit' },
    { command: 'withdraw', description: 'withdraw' },
    { command: 'register', description: 'register' },
    { command: 'help', description: 'help' }
  ]).catch((err) => console.error('[BOT SETUP] Failed to register commands:', err))
} catch (e) {
  console.error('Bot setup error:', e)
}

async function getUserLanguage(ctx) {
  try {
    const user = await db('users').where({ telegram_id: ctx.from.id }).first()
    if (user?.language === 'en' || user?.language === 'am') return user.language
  } catch (e) {
    console.error('Failed to load user language:', e.message)
  }
  return ctx.from?.language_code?.toLowerCase().startsWith('am') ? 'am' : 'en'
}

function getMainMenu(lang = 'en') {
  const t = botTranslations[lang] || botTranslations.en
  const frontendUrl = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL
  return {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        ...getStakeButtons(frontendUrl),
        [{ text: t.checkBalance, callback_data: 'menu_balance' }, { text: t.deposit, callback_data: 'menu_deposit' }],
        [{ text: t.withdraw, callback_data: 'menu_withdraw' }, { text: t.help, callback_data: 'menu_help' }],
        [{ text: t.myRoom, callback_data: 'menu_room' }, { text: t.discussionGroup, url: DISCUSSION_GROUP_URL }],
        [{ text: '👥 Invite Friends', callback_data: 'show_invite' }]
      ]
    }
  }
}

async function showInvite(ctx) {
  try {
    const lang = await getUserLanguage(ctx)

    const username = ctx.from?.username || null
    const telegramId = ctx.from?.id
    let startPayload = ''

    if (username) {
      startPayload = `u_${username}`
    } else {
      startPayload = `i_${telegramId}`
    }

    const botUsername = (process.env.BOT_USERNAME || 'GoBingoBot').replace(/^@/, '')
    const refLink = `https://t.me/${botUsername}?start=${encodeURIComponent(startPayload)}`

    const shareText = botText(lang, 'shareText')
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(shareText)}`
    const frontendUrl = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL
    await ctx.reply(botText(lang, 'inviteEarn', { link: refLink }) + SUPPORT_TEXT, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [{ text: botText(lang, 'shareGroup'), url: shareUrl }],
          ...getStakeButtons(frontendUrl)
        ]
      }
    })
  } catch (err) {
    console.error('[INVITE] Crash:', err)
    return ctx.reply(`⚠️ <b>Error</b>\n\n<code>${String(err.message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`, { parse_mode: 'HTML' }).catch(() => {})
  }
}

bot.start(async (ctx) => {
  const lang = await getUserLanguage(ctx)
  const referralRef = getReferralRefFromStartPayload(ctx.startPayload)
  const frontendUrl = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL

  ctx.reply(botText(lang, 'selectLanguage') + SUPPORT_TEXT, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🇬🇧 English', callback_data: 'lang_en' },
          { text: '🇪🇹 አማርኛ', callback_data: 'lang_am' }
        ],
        ...getStakeButtons(frontendUrl, referralRef),
        [
          { text: '👥 Invite Friends & Earn 5%', callback_data: 'show_invite' }
        ]
      ]
    }
  }).catch(e => console.error('Start error:', e))
})

bot.command('menu', async (ctx) => {
  const lang = await getUserLanguage(ctx)
  ctx.reply(botText(lang, 'mainMenu') + SUPPORT_TEXT, getMainMenu(lang)).catch(() => {})
})

bot.command(['invite', 'referral'], async (ctx) => {
  delete userStates[ctx.from.id]
  await showInvite(ctx)
})

bot.command('play', async (ctx) => {
  const lang = await getUserLanguage(ctx)
  ctx.reply(botText(lang, 'launchPrompt') + SUPPORT_TEXT, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: getStakeButtons(process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL) }
  }).catch(() => {})
})

bot.command('balance', async (ctx) => {
  const lang = await getUserLanguage(ctx)
  try {
    const user = await db('users').where({ telegram_id: ctx.from.id }).first()
    if (user) ctx.reply(botText(lang, 'balance', { amount: Number(user.wallet_balance || 0).toFixed(2) }) + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
    else ctx.reply(botText(lang, 'userNotFound') + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
  } catch (e) {
    console.error('[BOT ERROR] Failed to fetch balance:', e)
    ctx.reply(botText(lang, 'balanceFailed') + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
  }
})

bot.command('help', async (ctx) => {
  const lang = await getUserLanguage(ctx)
  ctx.reply(botText(lang, 'helpMessage') + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
})

bot.command('register', async (ctx) => {
  const lang = await getUserLanguage(ctx)
  await ctx.reply(
    botText(lang, 'registerPrompt') + SUPPORT_TEXT,
    {
      ...Markup.keyboard([
        [Markup.button.contactRequest(botText(lang, 'sharePhone'))]
      ]).resize().oneTime(),
      parse_mode: 'HTML'
    }
  )
})

bot.command('deposit', async (ctx) => {
  const lang = await getUserLanguage(ctx)
  userStates[ctx.from.id] = 'WAITING_FOR_RECEIPT'
  ctx.reply(botText(lang, 'depositInstructions', {
    name: process.env.TELEBIRR_RECEIVER_NAME,
    phone: process.env.TELEBIRR_RECEIVER_NUMBER,
  }) + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
})

bot.command('withdraw', async (ctx) => {
  const lang = await getUserLanguage(ctx)
  userStates[ctx.from.id] = 'WAITING_FOR_WITHDRAW_AMOUNT'
  ctx.reply(botText(lang, 'withdrawPrompt') + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
})

bot.action('show_invite', async (ctx) => {
  await ctx.answerCbQuery().catch(() => {})
  return showInvite(ctx)
})

bot.action('lang_en', async (ctx) => {
  await ctx.answerCbQuery().catch(() => {})
  try {
    await db('users').where({ telegram_id: ctx.from.id }).update({ language: 'en' })
  } catch (err) {
    console.error('[BOT ERROR] Failed to save language preference:', err)
  }
  ctx.reply(botText('en', 'languageSet'), getMainMenu('en')).catch(() => {})
})

bot.action('lang_am', async (ctx) => {
  await ctx.answerCbQuery().catch(() => {})
  try {
    await db('users').where({ telegram_id: ctx.from.id }).update({ language: 'am' })
  } catch (err) {
    console.error('[BOT ERROR] Failed to save language preference:', err)
  }
  ctx.reply(botText('am', 'languageSet'), getMainMenu('am')).catch(() => {})
})

bot.action('menu_balance', async (ctx) => {
  const lang = await getUserLanguage(ctx)
  try {
    await ctx.answerCbQuery().catch(() => {})
    const user = await db('users').where({ telegram_id: ctx.from.id }).first()
    if (!user) return ctx.reply(botText(lang, 'userNotFound') + SUPPORT_TEXT, { parse_mode: 'HTML' })
    ctx.reply(botText(lang, 'balance', { amount: Number(user.wallet_balance || 0).toFixed(2) }) + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
  } catch (err) {
    console.error('Balance Error:', err)
    ctx.reply(botText(lang, 'balanceFailed') + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
  }
})

bot.action('menu_deposit', async (ctx) => {
  const lang = await getUserLanguage(ctx)
  await ctx.answerCbQuery().catch(() => {})
  userStates[ctx.from.id] = 'WAITING_FOR_RECEIPT'
  const msg = botText(lang, 'depositInstructions', {
    name: process.env.TELEBIRR_RECEIVER_NAME,
    phone: process.env.TELEBIRR_RECEIVER_NUMBER,
  })
  ctx.reply(msg + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
})

bot.action('menu_withdraw', async (ctx) => {
  const lang = await getUserLanguage(ctx)
  await ctx.answerCbQuery().catch(() => {})
  userStates[ctx.from.id] = 'WAITING_FOR_WITHDRAW_AMOUNT'
  ctx.reply(botText(lang, 'withdrawPrompt') + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
})

bot.action('menu_room', async (ctx) => {
  const lang = await getUserLanguage(ctx)
  await ctx.answerCbQuery().catch(() => {})
  ctx.reply(botText(lang, 'roomPrompt') + SUPPORT_TEXT, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: getStakeButtons(process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL) }
  }).catch(() => {})
})

bot.action('menu_help', async (ctx) => {
  const lang = await getUserLanguage(ctx)
  await ctx.answerCbQuery().catch(() => {})
  ctx.reply(botText(lang, 'helpMessage') + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
})

bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query.trim().replace(/^start=/, '')
  const referralRef = query.startsWith('@') || /^\d+$/.test(query) ? query : null
  if (!referralRef) return ctx.answerInlineQuery([], { cache_time: 0 })

  const startPayload = referralRef.startsWith('@') ? `u_${referralRef.slice(1)}` : `i_${referralRef}`
  const botUsername = (process.env.BOT_USERNAME || 'GoBingoBot').replace(/^@/, '')
  const refLink = `https://t.me/${botUsername}?start=${encodeURIComponent(startPayload)}`

  await ctx.answerInlineQuery([{
    type: 'article',
    id: 'Gobingo-referral',
    title: 'Play GoBingo!',
    description: 'Tap to join the game and play.',
    input_message_content: {
      message_text: `<b>🎰 Join me on GoBingo and play!</b>\n<code>${refLink}</code>`,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    },
    reply_markup: {
      inline_keyboard: [[{ text: '🎮 Play Now', url: refLink }]],
    },
  }], { cache_time: 0, is_personal: true })
})

bot.on('contact', async (ctx) => {
  const lang = await getUserLanguage(ctx)
  try {
    const contact = ctx.message.contact
    const telegramId = ctx.from.id
    const phoneNumber = contact.phone_number

    const existingUser = await db('users').where({ telegram_id: telegramId }).first()
    if (existingUser && existingUser.phone_number) {
      await ctx.reply(
        botText(lang, 'alreadyRegistered') + SUPPORT_TEXT,
        { ...Markup.removeKeyboard(), parse_mode: 'HTML' }
      )
      return
    }

    const updated = await db('users')
      .where({ telegram_id: telegramId })
      .update({ phone_number: phoneNumber })

    if (updated) {
      await ctx.reply(
        botText(lang, 'phoneSaved', { phone: phoneNumber }) + SUPPORT_TEXT,
        { ...Markup.removeKeyboard(), parse_mode: 'HTML' }
      )
    } else {
      await db('users').insert({
        telegram_id: telegramId,
        first_name: ctx.from.first_name || botText(lang, 'player'),
        phone_number: phoneNumber,
        wallet_balance: 0
      })
      await ctx.reply(
        botText(lang, 'registrationComplete', { phone: phoneNumber }) + SUPPORT_TEXT,
        { ...Markup.removeKeyboard(), parse_mode: 'HTML' }
      )
    }
  } catch (err) {
    console.error('Contact save error:', err)
    await ctx.reply(botText(lang, 'contactFailed') + SUPPORT_TEXT, { parse_mode: 'HTML' })
  }
})

// IMPORTANT: This MUST be the last handler in the file
bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text

    // STRICT GUARD: Ignore commands entirely
    if (text && text.startsWith('/')) {
      return
    }

    const lang = await getUserLanguage(ctx)
    const state = userStates[ctx.from.id]
    if (!state) return

    if (state === 'WAITING_FOR_RECEIPT') {
      const {
        parseTelebirrSMS,
        extractTelebirrReceipt,
        creditVerifiedDeposit,
        PaymentVerificationError,
      } = require('../services/paymentService')
      const smsText = ctx.message.text
      const extractedReceipt = extractTelebirrReceipt(smsText)
      if (!extractedReceipt.reference) {
        return ctx.reply(botText(lang, 'invalidReference') + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
      }

      const parsedFromSMS = parseTelebirrSMS(smsText)
      if (!parsedFromSMS) {
        return ctx.reply(botText(lang, 'invalidReceipt') + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
      }

      const user = await db('users').where({ telegram_id: ctx.from.id }).first()
      if (!user) {
        return ctx.reply(botText(lang, 'userNotFound') + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
      }

      let deposit
      try {
        deposit = await creditVerifiedDeposit({
          userId: user.id,
          reference: extractedReceipt.reference,
          amount: parsedFromSMS.amount,
          receiptUrl: extractedReceipt.url,
        })
      } catch (err) {
        if (err.code === '23505') {
          return ctx.reply(botText(lang, 'receiptUsed') + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
        }
        const message = err instanceof PaymentVerificationError
          ? err.message
          : botText(lang, 'unableDeposit')
        return ctx.reply(botText(lang, 'verificationFailed', { error: message }) + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
      }

      ctx.reply(botText(lang, 'depositSubmitted', { amount: deposit.amount.toFixed(2) }) + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
      delete userStates[ctx.from.id]
      return
    }

    if (state === 'WAITING_FOR_WITHDRAW_AMOUNT') {
      const amount = Number(ctx.message.text)
      if (isNaN(amount) || amount < 100) {
        return ctx.reply(botText(lang, 'invalidWithdrawal') + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
      }

      const user = await db('users').where({ telegram_id: ctx.from.id }).first()
      if (!user) return ctx.reply(botText(lang, 'userNotFound') + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})

      if (Number(user.wallet_balance) < amount) {
        return ctx.reply(botText(lang, 'insufficientBalance', { amount: Number(user.wallet_balance).toFixed(2) }) + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
      }

      await db.transaction(async (trx) => {
        await trx('users')
          .where({ id: user.id })
          .decrement('wallet_balance', amount);

        await trx('payments').insert({
          user_id: user.id,
          amount: amount,
          provider: 'telebirr',
          status: 'pending',
          type: 'withdrawal',
          transaction_reference: `WD-${Date.now()}-${user.id}`
        });
      })

      ctx.reply(botText(lang, 'withdrawalPending', { amount: amount.toFixed(2) }) + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
      delete userStates[ctx.from.id]
      return
    }
  } catch (err) {
    console.error('Text Handler Error:', err)
    const lang = await getUserLanguage(ctx)
    ctx.reply(botText(lang, 'requestFailed') + SUPPORT_TEXT, { parse_mode: 'HTML' }).catch(() => {})
  }
})

module.exports = { bot, getMainMenu }