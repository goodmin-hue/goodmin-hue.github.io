// netlify/functions/guestbook.js
// 방명록 서버 함수. 브라우저 → /api/guestbook → 이 함수 → Supabase.
// Supabase 접근은 서버에서만 secret 키로 수행한다.
// 환경 변수: SUPABASE_URL, SUPABASE_SECRET_KEY (브라우저 코드에 넣지 않음)
//
// 검사: 별명 2~12자, 메시지 1~100자 (서버 측 검사. 브라우저·DB에도 동일 제한)
// GET  /api/guestbook  → 별명·메시지·시각만 최근 순 20개
// POST /api/guestbook  → { nickname, message } 저장
// (수정·삭제 API 없음)

const { createClient } = require("@supabase/supabase-js");

const NICK_MIN = 2, NICK_MAX = 12;
const MSG_MIN = 1, MSG_MAX = 100;
const LIMIT = 20;

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("missing-env");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

exports.handler = async (event) => {
  let supabase;
  try {
    supabase = getClient();
  } catch (e) {
    return json(500, { error: "서버 설정 오류입니다. 잠시 후 다시 시도해 주세요." });
  }

  // 조회: 별명·메시지·시각만 최근 순 20개
  if (event.httpMethod === "GET") {
    const { data, error } = await supabase
      .from("guestbook")
      .select("nickname, message, created_at")
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (error) {
      return json(500, { error: "글을 불러오지 못했어요." });
    }
    return json(200, { entries: data });
  }

  // 저장
  if (event.httpMethod === "POST") {
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "요청 형식이 올바르지 않습니다." });
    }

    const nickname = typeof payload.nickname === "string" ? payload.nickname.trim() : "";
    const message = typeof payload.message === "string" ? payload.message.trim() : "";

    // 서버 측 검사 (브라우저·DB와 동일 기준)
    if (nickname.length < NICK_MIN || nickname.length > NICK_MAX) {
      return json(400, { error: `별명은 ${NICK_MIN}~${NICK_MAX}자로 입력해 주세요.` });
    }
    if (message.length < MSG_MIN || message.length > MSG_MAX) {
      return json(400, { error: `메시지는 ${MSG_MIN}~${MSG_MAX}자로 입력해 주세요.` });
    }

    const { data, error } = await supabase
      .from("guestbook")
      .insert({ nickname, message })
      .select("nickname, message, created_at")
      .single();

    if (error) {
      return json(500, { error: "저장에 실패했어요. 잠시 후 다시 시도해 주세요." });
    }
    return json(201, { entry: data });
  }

  return json(405, { error: "지원하지 않는 요청입니다." });
};
