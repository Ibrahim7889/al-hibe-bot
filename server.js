import express from "express";
import fetch from "node-fetch";

import { t } from "./i18n.js";

const app = express();
app.use(express.json());

// جلسات بسيطة بالذاكرة (بدّلها بقاعدة بيانات لاحقًا)
const sessions = new Map();
const initialState = () => ({
  stage: "welcome",
  lead: { name: "", phone: "", city: "", product: "", karat: "", size: "", contact_pref: "" }
});

// صحة السيرفر
app.get("/", (_req, res) => res.status(200).send("Al Hibe bot is up ✅"));

// Verify Webhook (Meta)
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  res.sendStatus(403);
});

// Receive Events
app.post("/webhook", async (req, res) => {
  try {
    const entries = req.body.entry || [];
    for (const entry of entries) {
      // Messenger
      if (entry.messaging) {
        for (const event of entry.messaging) {
          await handleEvent(event);
        }
      }
      // Instagram (Graph subscriptions)
      if (entry.changes) {
        for (const change of entry.changes) {
          const ev = change.value?.messaging?.[0] || change.value;
          await handleEvent(ev);
        }
      }
    }
    res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e);
    res.sendStatus(200);
  }
});

async function handleEvent(ev) {
  if (!ev) return;
  const senderId = ev.sender?.id || ev.from?.id || ev.messaging?.sender?.id;
  const text =
    ev.message?.text ||
    ev.messages?.[0]?.text?.body ||
    ev.message?.attachments?.[0]?.payload?.title;

  if (!senderId || !text) return;

  if (!sessions.has(senderId)) sessions.set(senderId, initialState());
  const state = sessions.get(senderId);

  // كيووردات تحويل للبشري
  const raw = (text || "").trim();
  const low = raw.toLowerCase();
  if (["بشري", "موظف", "خدمة", "حد يساعدني", "انسان"].some(k => low.includes(k))) {
    state.stage = "human_handoff";
    await sendMessage(senderId, t("human"));
    return;
  }

  // كيووردات صور (تقدر هنا ترسل قريبا قوالب صور عبر Send API)
  if (low.includes("صور")) {
    await sendMessage(senderId, "أكيد! ابعتلي نوع الذوق أكتر (كلاسيك/مودرن/مسمّط/منقوش) وببعتلك خيارات مناسبة ✨");
    return;
  }

  // فلّو أساسي
  const reply = await handleFlow(state, raw);
  sessions.set(senderId, state);
  await sendMessage(senderId, reply);

  // بعد التأكيد: ابعت الـ Lead داخليًا (اختياري)
  if (state.stage === "confirm_done") {
    await pushLead(state.lead).catch(console.error);
  }
}

async function handleFlow(state, textRaw) {
  switch (state.stage) {
    case "welcome":
      state.stage = "qualify_product";
      return t("welcome");

    case "qualify_product":
      state.lead.product = textRaw;
      state.stage = "ask_karat";
      return t("askKarat");

    case "ask_karat":
      state.lead.karat = textRaw;
      state.stage = "ask_size";
      return t("askSize");

    case "ask_size":
      state.lead.size = textRaw;
      state.stage = "ask_city";
      return t("askCity");

    case "ask_city":
      state.lead.city = textRaw;
      state.stage = "ask_name";
      return t("askName");

    case "ask_name":
      state.lead.name = textRaw;
      state.stage = "ask_phone";
      return t("askPhone");

    case "ask_phone":
      state.lead.phone = textRaw;
      state.stage = "ask_contact_pref";
      return t("askContact");

    case "ask_contact_pref":
      state.lead.contact_pref = textRaw;
      state.stage = "confirm";
      return t("confirm", process.env.BOT_LOCALE, state.lead);

    case "confirm":
      state.stage = "confirm_done";
      return t("afterConfirm");

    case "human_handoff":
      return t("human");

    default:
      state.stage = "welcome";
      return t("fallback");
  }
}

async function sendMessage(psid, text) {
  const token = process.env.META_PAGE_TOKEN;
  const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${token}`;
  const body = {
    recipient: { id: psid },
    message: { text }
  };
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

// دفع الـ Lead إلى Webhook داخلي (اختياري)
async function pushLead(lead) {
  const url = process.env.LEAD_WEBHOOK_URL;
  const token = process.env.LEAD_WEBHOOK_TOKEN;
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth": token || ""
    },
    body: JSON.stringify({ source: "al-hibe-bot", lead, ts: Date.now() })
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Al Hibe bot running on :${PORT}`));
