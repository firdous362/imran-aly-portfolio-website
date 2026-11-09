document.getElementById("year").textContent = new Date().getFullYear();

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
gsap.registerPlugin(ScrollTrigger);

/* ---------- Desktop cursor accent ---------- */
const cursor = document.getElementById("cursor");
if (cursor && window.innerWidth > 600 && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduced) {
  document.documentElement.classList.add("has-custom-cursor");

  window.addEventListener("pointermove", (event) => {
    cursor.style.setProperty("--cursor-x", `${event.clientX}px`);
    cursor.style.setProperty("--cursor-y", `${event.clientY}px`);
    cursor.classList.add("visible");
    const target = event.target;
    cursor.classList.toggle("hovering", target instanceof Element && Boolean(target.closest("a, button, .node")));
  }, { passive: true });

  window.addEventListener("pointerdown", () => cursor.classList.add("pressed"));
  window.addEventListener("pointerup", () => cursor.classList.remove("pressed"));
  document.documentElement.addEventListener("pointerleave", () => cursor.classList.remove("visible"));
}

/* ---------- Nav background on scroll ---------- */
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 20);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Active nav link ---------- */
["work", "experience", "stack", "about", "contact"].forEach((id) => {
  const link = document.querySelector(`[data-link="${id}"]`);
  if (!link) return;
  ScrollTrigger.create({
    trigger: `#${id}`,
    start: "top 50%",
    end: "bottom 50%",
    onToggle: (self) => link.classList.toggle("active", self.isActive),
  });
});

/* ---------- Copy email ---------- */
const copyBtn = document.getElementById("copyEmail");
const toast = document.getElementById("toast");
copyBtn.addEventListener("click", async () => {
  const email = document.getElementById("emailLink").textContent.trim();
  let copied = false;
  try {
    await navigator.clipboard.writeText(email);
    copied = true;
  } catch {
    const t = document.createElement("textarea");
    t.value = email;
    document.body.appendChild(t);
    t.select();
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    } finally {
      t.remove();
    }
  }
  toast.textContent = copied ? "Email copied" : "Couldn't copy email — select it above";
  gsap.killTweensOf(toast);
  gsap.timeline()
    .to(toast, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" })
    .to(toast, { opacity: 0, y: 24, duration: 0.3, delay: 1.4 });
});

/* ---------- Hero workflow canvas ---------- */
const flow = document.getElementById("flow");
const svg = flow.querySelector("svg");
const hint = document.getElementById("flowHint");
const NS = "http://www.w3.org/2000/svg";

const nodes = {};
flow.querySelectorAll(".node").forEach((el) => {
  nodes[el.dataset.id] = { el, dot: el.querySelector(".n-dot"), x: 0, y: 0 };
});

// [from, to]
const edges = [
  ["webhook", "tenant"],
  ["tenant", "domain"],
  ["tenant", "scorer"],
  ["tenant", "whatsapp"],
];

const wires = edges.map(() => {
  const p = document.createElementNS(NS, "path");
  p.setAttribute("class", "wire");
  svg.appendChild(p);
  return p;
});
const pulses = edges.map(() => {
  const c = document.createElementNS(NS, "circle");
  c.setAttribute("class", "pulse");
  c.setAttribute("r", "6");
  svg.appendChild(c);
  return c;
});

// default layout: 3 columns, fan-out on the right
const layout = {
  webhook: [0, 0.5],
  tenant: [1, 0.5],
  domain: [2, 0.1],
  scorer: [2, 0.5],
  whatsapp: [2, 0.9],
};

let loop = null;

function place() {
  const W = flow.clientWidth;
  const compact = W < 500;
  const wasCompact = flow.classList.contains("compact");
  flow.classList.toggle("compact", compact);

  if (compact) {
    Object.values(nodes).forEach((n) => {
      n.el.style.removeProperty("transform");
      n.dot.classList.add("on");
    });
    hint.textContent = "Instagram → AI → CRM → WhatsApp";
    flow.setAttribute("aria-label", "Automation workflow: Instagram lead, AI qualification, CRM update, WhatsApp reply, and follow-up.");
    if (loop) loop.pause();
    return;
  }

  flow.setAttribute("aria-label", "Animated automation workflow. Drag the nodes to rearrange them.");
  hint.textContent = "Drag the nodes around";
  const H = flow.clientHeight;
  const pad = 26;
  Object.entries(layout).forEach(([id, [col, row]]) => {
    const n = nodes[id];
    const w = n.el.offsetWidth;
    const h = n.el.offsetHeight;
    n.x = pad + col * ((W - w - pad * 2) / 2);
    n.y = 24 + row * (H - h - 48);
    // stagger the middle column a little so the wires aren't ruler-straight
    if (col === 1) n.y -= 34;
    if (id === "webhook") n.y += 28;
  });
  draw();
  if (loop && !reduced) {
    if (wasCompact) loop.restart();
    else loop.play();
  }
}

function draw() {
  Object.values(nodes).forEach((n) => {
    n.el.style.transform = `translate(${n.x}px, ${n.y}px)`;
  });
  edges.forEach(([a, b], i) => {
    const A = nodes[a], B = nodes[b];
    const sx = A.x + A.el.offsetWidth, sy = A.y + A.el.offsetHeight / 2;
    const tx = B.x, ty = B.y + B.el.offsetHeight / 2;
    const dx = Math.max(40, Math.abs(tx - sx) * 0.5);
    wires[i].setAttribute("d", `M${sx},${sy} C${sx + dx},${sy} ${tx - dx},${ty} ${tx},${ty}`);
  });
}

place();
window.addEventListener("resize", place);

/* drag */
Object.values(nodes).forEach((n) => {
  let ox = 0, oy = 0;
  n.el.addEventListener("pointerdown", (e) => {
    if (flow.classList.contains("compact")) return;
    n.el.setPointerCapture(e.pointerId);
    n.el.classList.add("dragging");
    ox = e.clientX - n.x;
    oy = e.clientY - n.y;
    hint.style.opacity = 0;
  });
  n.el.addEventListener("pointermove", (e) => {
    if (!n.el.classList.contains("dragging")) return;
    const maxX = flow.clientWidth - n.el.offsetWidth - 6;
    const maxY = flow.clientHeight - n.el.offsetHeight - 6;
    n.x = Math.min(Math.max(6, e.clientX - ox), maxX);
    n.y = Math.min(Math.max(6, e.clientY - oy), maxY);
    draw();
  });
  const end = () => n.el.classList.remove("dragging");
  n.el.addEventListener("pointerup", end);
  n.el.addEventListener("pointercancel", end);
});

/* pulses travelling along the wires */
const lightUp = (id) => {
  const n = nodes[id];
  n.dot.classList.add("on");
  gsap.fromTo(n.el, { scale: 1.07 }, { scale: 1, duration: 0.5, ease: "back.out(3)" });
};
const resetLights = () => Object.values(nodes).forEach((n) => n.dot.classList.remove("on"));

function buildLoop() {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.8, paused: true });
  const travel = (i, at) => {
    const path = wires[i], dot = pulses[i], state = { p: 0 };
    tl.set(dot, { opacity: 1 }, at)
      .to(state, {
        p: 1, duration: 0.85, ease: "power1.inOut",
        onUpdate: () => {
          const pt = path.getPointAtLength(state.p * path.getTotalLength());
          dot.setAttribute("cx", pt.x);
          dot.setAttribute("cy", pt.y);
        },
      }, at)
      .set(dot, { opacity: 0 }, at + 0.85);
  };

  tl.add(resetLights, 0);
  tl.add(() => lightUp("webhook"), 0.1);
  travel(0, 0.3);
  tl.add(() => lightUp("tenant"), 1.15);
  travel(1, 1.35); travel(2, 1.5); travel(3, 1.65);
  tl.add(() => lightUp("domain"), 2.2);
  tl.add(() => lightUp("scorer"), 2.35);
  tl.add(() => lightUp("whatsapp"), 2.5);
  return tl;
}

if (reduced) {
  Object.values(nodes).forEach((n) => n.dot.classList.add("on"));
} else {
  loop = buildLoop();
}

/* ---------- Hero entrance, then the workflow starts running ---------- */
if (!reduced) {
  gsap.set(".js-hero", { opacity: 0, y: 28 });
  gsap.timeline({ defaults: { ease: "power3.out" } })
    .to(".js-hero", { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }, 0.1)
    .add(() => {
      if (loop && !flow.classList.contains("compact")) loop.play();
    }, "+=0.1");
}

/* ---------- Project accordion ---------- */
const projects = document.querySelectorAll(".project");
const projectFilters = document.querySelectorAll(".filter-button");

projectFilters.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    projectFilters.forEach((filterButton) => {
      const active = filterButton === button;
      filterButton.classList.toggle("active", active);
      filterButton.setAttribute("aria-pressed", String(active));
    });

    projects.forEach((project) => {
      const body = project.querySelector(".project-body");
      const head = project.querySelector(".project-head");
      const matches = filter === "all" || project.dataset.category.split(" ").includes(filter);

      gsap.killTweensOf(body);
      gsap.set(body, { height: 0 });
      project.classList.remove("open");
      head.setAttribute("aria-expanded", "false");
      body.inert = true;
      project.hidden = !matches;
    });
  });
});

projects.forEach((p, index) => {
  const head = p.querySelector(".project-head");
  const body = p.querySelector(".project-body");
  body.id = `project-details-${index + 1}`;
  body.inert = true;
  head.setAttribute("aria-controls", body.id);

  head.addEventListener("click", () => {
    const opening = !p.classList.contains("open");

    projects.forEach((other) => {
      if (other !== p && other.classList.contains("open")) closeProject(other);
    });

    if (opening) {
      p.classList.add("open");
      head.setAttribute("aria-expanded", "true");
      body.inert = false;
      gsap.to(body, { height: "auto", duration: reduced ? 0 : 0.5, ease: "power3.out" });
      gsap.fromTo(
        body.querySelectorAll(".feat li, .chips span"),
        { opacity: 0, x: -12 },
        { opacity: 1, x: 0, duration: reduced ? 0 : 0.4, stagger: 0.05, delay: 0.1 }
      );
    } else {
      closeProject(p);
    }
  });
});

function closeProject(p) {
  p.classList.remove("open");
  p.querySelector(".project-head").setAttribute("aria-expanded", "false");
  const body = p.querySelector(".project-body");
  body.inert = true;
  gsap.to(body, { height: 0, duration: reduced ? 0 : 0.4, ease: "power3.inOut" });
}

/* ---------- Count-up for experience ---------- */
const counter = document.querySelector(".count");
if (counter) {
  const target = parseFloat(counter.dataset.to);
  const state = { v: 0 };
  ScrollTrigger.create({
    trigger: counter,
    start: "top 85%",
    once: true,
    onEnter: () => {
      gsap.to(state, {
        v: target,
        duration: reduced ? 0 : 1.6,
        ease: "power2.out",
        onUpdate: () => (counter.textContent = state.v.toFixed(1)),
      });
    },
  });
}

/* ---------- Stack columns stagger in once ---------- */
if (!reduced) {
  const reveal = (targets, trigger, stagger = 0) => {
    gsap.from(targets, {
      opacity: 0,
      y: 22,
      duration: 0.72,
      stagger,
      ease: "power3.out",
      clearProps: "transform,opacity",
      scrollTrigger: { trigger, start: "top 86%", once: true },
    });
  };

  reveal(".service-card", ".services-grid", 0.1);
  const journeyProgress = { value: 0 };
  const updateJourneyProgress = () => {
    const vertical = window.matchMedia("(max-width: 1000px)").matches;
    gsap.set(".experience-rail-progress", {
      scaleX: vertical ? 1 : journeyProgress.value,
      scaleY: vertical ? journeyProgress.value : 1,
    });
  };

  window.addEventListener("resize", updateJourneyProgress, { passive: true });
  gsap.to(journeyProgress, {
    value: 1,
    duration: 1.5,
    ease: "power2.out",
    onUpdate: updateJourneyProgress,
    scrollTrigger: { trigger: ".experience-journey", start: "top 78%", once: true },
  });

  gsap.from(".experience-stop", {
    opacity: 0,
    y: 22,
    duration: 0.7,
    stagger: 0.12,
    ease: "power3.out",
    clearProps: "transform,opacity",
    scrollTrigger: { trigger: ".experience-journey", start: "top 78%", once: true },
  });
  reveal(".about-big, .about-copy", "#about", 0.12);
  reveal(".contact h2, .contact .contact-actions, .contact .links", "#contact", 0.1);

  gsap.from(".stack-col", {
    opacity: 0,
    y: 24,
    duration: 0.7,
    stagger: 0.1,
    ease: "power3.out",
    scrollTrigger: { trigger: ".stack-grid", start: "top 85%", once: true },
  });
}