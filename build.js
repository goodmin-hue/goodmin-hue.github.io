// build.js
// 공개할 정적 자산만 public/ 으로 복사한다 (화이트리스트 방식).
// 서버 함수, 비밀, 개인 기록은 복사 대상에 넣지 않는다.
//
// 공개 대상: HTML, CSS, 브라우저 JS, 이미지
// 제외 대상(복사 안 함): .git, .env, .kiro, docs, node_modules,
//   netlify/functions(서버 코드), package.json, netlify.toml, build.js 등

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "public");

// 공개해도 되는 확장자 (HTML/CSS/브라우저 JS/이미지/폰트)
const PUBLIC_EXT = new Set([
  ".html", ".css", ".js", ".mjs",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
  ".woff", ".woff2", ".ttf",
  ".json", ".txt", ".webmanifest",
]);

// 루트에서 공개 폴더로 복사할 "정적 자산" 최상위 항목.
// 파일은 확장자로 거른다. 폴더는 여기 명시된 것만 재귀 복사한다.
// (assets/, css/, js/, images/ 등 나중에 생기면 아래 배열에 추가)
const PUBLIC_DIRS = ["assets", "css", "js", "images", "img", "fonts"];

// 어떤 경우에도 공개 폴더에 들어가면 안 되는 이름 (방어선)
const NEVER = new Set([
  ".git", ".github", ".kiro", "docs", "node_modules",
  "netlify", "public", ".netlify",
  ".env", ".gitignore",
  "package.json", "package-lock.json", "netlify.toml", "build.js",
]);

function rmrf(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (NEVER.has(entry.name)) continue;
    if (entry.name.startsWith(".env")) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else if (PUBLIC_EXT.has(path.extname(entry.name).toLowerCase())) {
      fs.copyFileSync(s, d);
    }
  }
}

function main() {
  // 공개 폴더를 깨끗이 새로 만든다
  rmrf(OUT);
  fs.mkdirSync(OUT, { recursive: true });

  const copied = [];

  // 1) 루트의 공개 가능한 "파일" 복사 (확장자 화이트리스트, NEVER 제외)
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (NEVER.has(entry.name)) continue;
    if (entry.name.startsWith(".env")) continue;
    if (!PUBLIC_EXT.has(path.extname(entry.name).toLowerCase())) continue;
    fs.copyFileSync(path.join(ROOT, entry.name), path.join(OUT, entry.name));
    copied.push(entry.name);
  }

  // 2) 지정된 정적 자산 폴더만 재귀 복사
  for (const dir of PUBLIC_DIRS) {
    const src = path.join(ROOT, dir);
    if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
      copyDir(src, path.join(OUT, dir));
      copied.push(dir + "/");
    }
  }

  if (!copied.includes("index.html")) {
    console.warn("경고: index.html 이 public/ 에 복사되지 않았습니다.");
  }
  console.log("빌드 완료 → public/");
  console.log("복사한 항목:", copied.join(", ") || "(없음)");
}

main();
