// С Live Server (порт 5500) ходим на сервер API отдельно, на боевом сайте всё на одном адресе
const API = ["5500", "5501"].includes(location.port) ? "http://localhost:3000/api" : "/api";

const auth = {
  get token() { return localStorage.getItem("kq_token"); },
  set(token, user) {
    localStorage.setItem("kq_token", token);
    localStorage.setItem("kq_user", JSON.stringify(user));
  },
  clear() { localStorage.removeItem("kq_token"); localStorage.removeItem("kq_user"); },
  get user() { try { return JSON.parse(localStorage.getItem("kq_user")); } catch { return null; } }
};

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth.token) headers.Authorization = "Bearer " + auth.token;
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

const AVATAR_COLORS = { teal:"#19F0D2", violet:"#A78BFA", amber:"#FBBF24", rose:"#FF6B81",
                        green:"#4ADE80", blue:"#60A5FA", orange:"#FB923C", gray:"#8A94A8" };