const $ = (id) => document.getElementById(id);

$("avatars").innerHTML = Object.entries(AVATAR_COLORS).map(([k, c], i) =>
  `<label><input type="radio" name="avatar" value="${k}" ${i === 0 ? "checked" : ""}>
   <span class="av" style="background:${c}"></span></label>`).join("");

function showErrors(errors) {
  for (const f of ["nickname", "email", "password"]) {
    const box = $("f-" + f);
    box.classList.toggle("error", !!errors[f]);
    box.querySelector(".msg").textContent = errors[f] || "";
  }
}

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  showErrors({}); $("form-error").textContent = "";
  $("submit").classList.add("loading");
  try {
    const data = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        nickname: $("nickname").value, email: $("email").value,
        password: $("password").value,
        avatar: document.querySelector("input[name=avatar]:checked").value
      })
    });
    auth.set(data.token, data.user);
    location.href = "dashboard.html";
  } catch (err) {
    if (err.errors) showErrors(err.errors);
    else $("form-error").textContent = err.error || "Не удалось зарегистрироваться";
  } finally {
    $("submit").classList.remove("loading");
  }
});