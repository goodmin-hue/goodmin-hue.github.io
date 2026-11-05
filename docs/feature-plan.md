# 기능 명세 — 짧은 방명록

## 1. 개요

- **기능 이름**: 짧은 방명록
- **목적**: 방문자(같은 수업 동기 등)가 별명과 한 줄 응원 메시지를 남기고, 최근 글 목록을 함께 본다.
- **대상 페이지**: 기존 홈페이지(`index.html`) 맨 아래에 `#guestbook` 섹션 추가. 기존 다크 테마(`--panel`, `--line`, `--accent`)와 `article`·`button` 스타일 재사용.
- **완성 기준**: 친구 휴대폰에서도 같은 글이 보이고, 재배포 후에도 글이 유지된다.

## 2. 배포 (확정: Netlify)

- 홈페이지와 서버 함수를 **Netlify**에 배포한다. (과제 필수: Netlify 또는 Vercel + 서버 함수)
- Netlify Functions로 서버 함수를 제공한다. 함수 주소는 같은 사이트의 `/api` 경로로 노출한다.
- **기존 GitHub Pages 설정은 지우지 않는다.** (`.github`, Pages 관련 설정, 기존 배포 유지)

## 3. 아키텍처

```
브라우저(index.html + JS)
   │  fetch
   ▼
Netlify Functions  (같은 사이트의 /api 주소)
   │  SUPABASE_URL / SUPABASE_SECRET_KEY (환경 변수)
   ▼
Supabase (PostgreSQL)
```

- 브라우저는 Supabase에 **직접 접근하지 않는다.**
- 브라우저는 오직 같은 사이트의 `/api` 주소(Netlify Functions)만 호출한다.
- 서버 함수가 입력을 검사한 뒤 Supabase에 저장·조회한다.
- Supabase 접근은 서버 함수만 **secret 키**로 수행한다.
- 환경 변수: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.
- **어떤 Supabase 키도 브라우저 코드에 넣지 않는다.**

## 4. 화면 요소

기존 `#contact` 섹션 다음에 `#guestbook` 섹션을 추가한다.

### 입력란·버튼
- 별명 입력란: `<input type="text">`, 2~12자
- 메시지 입력란: `<input>` 또는 `<textarea>`, 1~100자 (한 줄 응원)
- "남기기" 버튼: `<button>`
- 상태 안내 영역: 성공/실패 문구 표시, `aria-live`로 읽어 줌

### 결과 (최근 글 목록)
- 버튼 아래에 최근 글 목록을 카드 형태로 표시
- 각 글: 별명 + 메시지 + 저장 시각(예: "11월 5일 14:30")
- 최신 글이 위로, 최대 20개
- **방문자 글은 HTML로 실행하지 않고 `textContent`로 글자 그대로 표시한다.** (`innerHTML` 사용 금지)
- 실명·연락처는 받지 않는다.

## 5. 저장할 항목 (Supabase 테이블 `guestbook`)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `bigint` (자동 증가) | 기본 키 |
| `nickname` | `text` | 별명 (필수, 2~12자) |
| `message` | `text` | 응원 메시지 (필수, 1~100자) |
| `created_at` | `timestamptz` (기본값 `now()`) | 저장 시각 |

저장하는 핵심 항목은 별명, 메시지, 저장 시각 3가지. `id`는 관리용.

### DB 제약 (검사와 동일하게 강제)
- `nickname`: `char_length(nickname) between 2 and 12`
- `message`: `char_length(message) between 1 and 100`
- `nickname`, `message`: `NOT NULL`

## 6. 접근 제한 (Supabase RLS)

- `guestbook` 테이블에 **RLS(Row Level Security)를 켠다.**
- **anon(익명)에게 직접 읽기·쓰기 정책을 만들지 않는다.** → 브라우저에서 anon 키로는 접근 불가.
- 서버 함수만 **secret 키**로 접근한다. (secret 키는 RLS를 우회하므로 정책 없이도 동작)
- `SUPABASE_SECRET_KEY`는 Netlify 환경 변수에만 두고, 저장소나 브라우저 코드에 넣지 않는다.

## 7. API 명세 (Netlify Functions, `/api`)

### POST /api/guestbook — 글 저장
- 요청 본문(JSON): `{ "nickname": string, "message": string }`
- 서버에서 검사:
  - `nickname`: 공백 제거 후 2~12자. 아니면 거절.
  - `message`: 공백 제거 후 1~100자. 아니면 거절.
- 통과 시 `guestbook`에 insert, `created_at`은 DB 기본값(`now()`).
- 응답:
  - 성공: `201`, 저장된 글(별명·메시지·시각) 또는 성공 표시
  - 입력 오류: `400`, 사유 메시지
  - 서버/DB 오류: `500`, 일반 오류 메시지

### GET /api/guestbook — 최근 글 조회
- **별명·메시지·시각만** 반환. (`nickname`, `message`, `created_at`)
- **최근 순(created_at 내림차순) 20개**만 반환.
- 응답: `200`, 배열

### 만들지 않는 API
- **수정(UPDATE) API 없음.**
- **삭제(DELETE) API 없음.**

## 8. 검사 규칙 (양쪽 검사)

별명 2~12자, 메시지 1~100자를 **브라우저와 서버 양쪽에서 검사**하고, **DB에도 같은 제한**을 건다.

| 위치 | 별명 | 메시지 |
|------|------|--------|
| 브라우저 | 2~12자, 빈 값 거절 | 1~100자, 빈 값 거절 |
| 서버 함수 | 2~12자, 빈 값 거절 | 1~100자, 빈 값 거절 |
| DB 제약 | `char_length between 2 and 12` | `char_length between 1 and 100` |

## 9. 성공·실패 동작

### 성공
- 저장 성공 → 입력란 비우기 → "응원 고마워요!" 안내 → 최근 글 목록 다시 조회(또는 새 글을 맨 위에 추가)

### 실패 (구분)
- **빈 값 / 글자 수 위반**: 브라우저에서 전송 전에 막고 안내("별명은 2~12자, 메시지는 1~100자로 입력해 주세요"). 서버도 같은 기준으로 400 반환.
- **네트워크 / 서버 오류**: "저장에 실패했어요. 잠시 후 다시 시도해 주세요" 안내, 입력 내용은 지우지 않음.
- **목록 조회 실패**: "글을 불러오지 못했어요" 안내, 입력 폼은 그대로 사용 가능.

## 10. 가장 작은 완성 버전 (MVP 범위)

1. Supabase에 `guestbook` 테이블 생성 + DB 제약(글자 수, NOT NULL) + RLS 켜기(anon 정책 없음)
2. Netlify Functions 작성: `POST /api/guestbook`(검사 후 저장), `GET /api/guestbook`(최근 20개 조회)
3. `index.html`에 `#guestbook` 섹션 추가(입력란·버튼·상태 안내·최근 글 목록)
4. 브라우저 JS: `/api` 호출, 양쪽 검사, `textContent`로 안전 표시, 성공/실패 안내
5. Netlify 배포 + 환경 변수(`SUPABASE_URL`, `SUPABASE_SECRET_KEY`) 설정. 기존 GitHub Pages 설정은 유지.

로그인·수정·삭제·페이지네이션은 포함하지 않는다(최소 범위).

## 11. 검사 방법 (완성 확인 절차)

1. **빈 글 거절**: 별명·메시지를 비우거나 공백만 넣고 "남기기"를 누른다 → 저장되지 않고 안내 문구가 뜬다. (브라우저 차단, 서버도 400)
2. **긴 글 거절**: 별명 13자 이상 또는 메시지 101자 이상을 넣는다 → 거절되고 안내가 뜬다. (브라우저·서버 양쪽에서 거절, DB 제약으로도 막힘)
3. **HTML 비실행 확인**: 메시지에 `<b>안녕</b>`을 입력해 저장한다 → 목록에 굵은 글씨가 아니라 `<b>안녕</b>` 글자 그대로 보인다. (`textContent` 사용 확인)
4. **휴대폰에서 같은 글 확인**: PC에서 글을 남긴 뒤, 친구 휴대폰(다른 기기)에서 같은 사이트를 열어 같은 글이 보이는지 확인한다.
5. **재배포 후 유지 확인**: Netlify에 다시 배포한 뒤 사이트를 열어 이전 글이 그대로 남아 있는지 확인한다. (데이터가 Supabase에 저장되므로 유지됨)
6. **키 노출 없음 확인**: 브라우저 개발자 도구의 소스/네트워크에서 Supabase 키(`SUPABASE_SECRET_KEY`)가 보이지 않고, 호출이 전부 같은 사이트 `/api` 주소로만 가는지 확인한다.
