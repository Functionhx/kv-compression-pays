// Left rail: reading progress, active section, and the title that fades in once the
// hero has scrolled away (same behavior as the Function blog's article rail).
(() => {
  const hero = document.querySelector(".hero");
  const content = document.getElementById("content");
  const railTitle = document.getElementById("railTitle");
  const progress = document.getElementById("railProgress");
  const toTop = document.getElementById("toTop");
  const links = [...document.querySelectorAll("#tree a")];
  const sections = links.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
  const BAR = 28;

  let active = -1;
  function update() {
    const top = content.getBoundingClientRect().top + scrollY;
    const span = Math.max(1, content.offsetHeight - innerHeight * 0.6);
    const ratio = Math.min(1, Math.max(0, (scrollY - top + innerHeight * 0.3) / span));
    const filled = Math.round(ratio * BAR);
    progress.children[0].textContent = "▓".repeat(filled);
    progress.children[1].textContent = "░".repeat(BAR - filled);
    progress.children[2].textContent = `${String(Math.round(ratio * 100)).padStart(2, "0")}%`;

    const heroGone = hero.getBoundingClientRect().bottom < 0;
    railTitle.classList.toggle("is-on", heroGone);
    toTop.classList.toggle("show", heroGone);

    let index = 0;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.35) index = i; });
    if (index !== active) {
      active = index;
      links.forEach((a, i) => {
        a.classList.toggle("is-active", i === index);
        if (i === index) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      });
    }
  }

  progress.hidden = false;
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  };
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  update();

  toTop.addEventListener("click", () => scrollTo({ top: 0 }));

  const copy = document.getElementById("copyLink");
  if (navigator.clipboard) {
    copy.hidden = false;
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href.split("#")[0]);
        copy.textContent = "Copied";
      } catch {
        copy.textContent = "Copy failed";
      }
      setTimeout(() => (copy.textContent = "Copy link"), 1400);
    });
  }
})();
