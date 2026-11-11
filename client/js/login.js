const $ = (id) => document.getElementById(id);

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("form-error").textContent = "";
  $("submit").classList.add("loading");
  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: $("email").value, password: $("password").value })
    });
    auth.set(data.token, data.user);
    location.href = "dashboard.html";
  } catch (err) {
    $("form-error").textContent = err.error || "Не удалось войти";
  } finally {
    $("submit").classList.remove("loading");
  }
});