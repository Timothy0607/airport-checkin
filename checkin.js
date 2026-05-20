import axios from "axios";

const DOMAIN = process.env.DOMAIN;
const USER = process.env.USER;
const PASS = process.env.PASS;
const PUSHPLUS_TOKEN = process.env.PUSHPLUS_TOKEN;

const BASE = DOMAIN.startsWith("http") ? DOMAIN : `https://${DOMAIN}`;

let cookie = "";

async function request(url, options = {}) {
  return axios({
    url,
    timeout: 15000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
}

async function pushplus(content) {
  if (!PUSHPLUS_TOKEN) return;
  await request("https://www.pushplus.plus/send", {
    method: "POST",
    data: {
      token: PUSHPLUS_TOKEN,
      title: "签到通知",  // ✅ 修改标题
      content: `账号：${USER}\n\n${content}`,  // ✅ 内容包含账号
      template: "txt",
    },
  });
}

(async () => {
  try {
    // 1️⃣ 获取 Cookie
    const home = await request(BASE);
    cookie = home.headers["set-cookie"]?.map(c => c.split(";")[0]).join("; ") || "";

    if (!cookie) throw new Error("获取 Cookie 失败");

    // 2️⃣ 登录
    const login = await request(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      data: { email: USER, passwd: PASS, remember_me: "on" },
    });

    if (login.data.ret !== 1) {
      throw new Error(login.data.msg || "登录失败");
    }

    cookie = login.headers["set-cookie"]?.map(c => c.split(";")[0]).join("; ");

    // 3️⃣ 签到
    const checkin = await request(`${BASE}/user/checkin`, {
      method: "POST",
      headers: { cookie },
    });

    const msg =
      checkin.data.ret === 1
        ? `✅ 签到成功\n${checkin.data.msg}`
        : `⚠️ 签到失败\n${checkin.data.msg}`;

    await pushplus(msg);
    console.log(msg);
  } catch (e) {
    const err = `❌ 签到异常\n${e.message}`;
    await pushplus(err);
    console.error(err);
  }
})();
