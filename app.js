(function () {
  "use strict";

  var DATA = window.DEMO_DATA;

  var TASKS = [
    {
      key: "song",
      title: "1. Lyrics-to-Song Generation",
      desc: "Generate a complete song with vocals and accompaniment from lyrics and a style caption. Five Chinese and five English examples.",
      refLabel: null
    },
    {
      key: "cover",
      title: "2. Cover Song Generation",
      desc: "Re-generate a reference song in a new style while preserving its melody, harmony and rhythm. \u201cReference\u201d is the original song.",
      refLabel: "Reference (Original)"
    },
    {
      key: "persona",
      title: "3. Timbre-controllable Song Generation",
      desc: "Render a generated song with the singer timbre taken from a short voice prompt (5\u201310 s). \u201cVoice Prompt\u201d is the timbre reference.",
      refLabel: "Voice Prompt"
    }
  ];

  var current = null;

  function fmt(t) {
    if (!isFinite(t) || t < 0) return "0:00";
    t = Math.round(t);
    var m = Math.floor(t / 60);
    var s = t % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function updateProgress(track) {
    var a = track.audio;
    if (!a) return;
    var dur = a.duration;
    var pct = isFinite(dur) && dur > 0 ? (a.currentTime / dur) * 100 : 0;
    track.fill.style.width = pct + "%";
    track.time.textContent = fmt(a.currentTime) + " / " + fmt(dur);
  }

  function setBtnState(track, state) {
    track.btn.classList.toggle("playing", state === "playing");
    track.btn.classList.toggle("loading", state === "loading");
    track.btn.setAttribute("aria-label", state === "playing" ? "Pause" : "Play");
    track.chip.classList.toggle("playing", state === "playing");
  }

  function stopCurrent() {
    if (!current) return;
    current.audio.pause();
    current.audio.currentTime = 0;
    current.fill.style.width = "0%";
    setBtnState(current, "idle");
    updateProgress(current);
    current = null;
  }

  function togglePlay(track) {
    if (current && current !== track) stopCurrent();
    if (!track.audio) {
      var a = new Audio(track.src);
      a.addEventListener("loadedmetadata", function () { updateProgress(track); });
      a.addEventListener("timeupdate", function () { updateProgress(track); });
      a.addEventListener("playing", function () { setBtnState(track, "playing"); });
      a.addEventListener("waiting", function () { setBtnState(track, "loading"); });
      a.addEventListener("ended", function () {
        setBtnState(track, "idle");
        track.fill.style.width = "0%";
        updateProgress(track);
        if (current === track) current = null;
      });
      track.audio = a;
      track.chip.classList.add("armed");
      updateProgress(track);
    }
    if (track.audio.paused) {
      track.audio.play();
      setBtnState(track, "loading");
      current = track;
    } else {
      track.audio.pause();
      setBtnState(track, "idle");
      current = null;
    }
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function makeChip(label, src, variant) {
    var chip = el("div", "chip" + (variant ? " chip-" + variant : ""));
    var top = el("div", "chip-top");

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-btn";
    btn.setAttribute("aria-label", "Play");
    btn.innerHTML =
      '<span class="ic ic-play"><svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M3 1.5v9l7-4.5z" fill="currentColor"/></svg></span>' +
      '<span class="ic ic-pause"><svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2.5 1.5h2.6v9H2.5zM6.9 1.5h2.6v9H6.9z" fill="currentColor"/></svg></span>' +
      '<span class="ic ic-load"></span>';

    var lbl = el("span", "chip-label", label);
    lbl.title = label;
    var time = el("span", "chip-time");

    top.appendChild(btn);
    top.appendChild(lbl);
    top.appendChild(time);

    var bar = el("div", "chip-bar");
    bar.title = "Seek";
    var fill = el("div", "chip-bar-fill");
    bar.appendChild(fill);

    chip.appendChild(top);
    chip.appendChild(bar);

    var track = { src: src, audio: null, btn: btn, chip: chip, bar: bar, fill: fill, time: time };
    btn.addEventListener("click", function () { togglePlay(track); });
    bar.addEventListener("click", function (e) {
      var a = track.audio;
      if (!a || !isFinite(a.duration) || a.duration <= 0) return;
      var r = bar.getBoundingClientRect();
      var ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      a.currentTime = ratio * a.duration;
      updateProgress(track);
    });

    return chip;
  }

  function chipRow(item, task) {
    var row = el("div", "chips");
    if (task.refLabel && item.audio.reference) {
      row.appendChild(makeChip(task.refLabel, item.audio.reference, "ref"));
    }
    row.appendChild(makeChip("Ours", item.audio.ours, "ours"));
    DATA[task.key].models.forEach(function (m) {
      row.appendChild(makeChip(m.label, item.audio[m.key], null));
    });
    return row;
  }

  function badge(lang) {
    return el("span", "badge badge-" + lang, lang.toUpperCase());
  }

  function detailsBlock(summary, children) {
    var d = el("details", "case-details");
    d.appendChild(el("summary", null, summary));
    children.forEach(function (c) { if (c) d.appendChild(c); });
    return d;
  }

  function lyricsPre(lyrics) {
    return lyrics ? el("pre", "lyrics", lyrics.trim()) : null;
  }

  function caseTitle(item, task) {
    if (task.key === "cover") return item.songName;
    return item.theme || "";
  }

  var SMALL_WORDS = { a: 1, an: 1, the: 1, and: 1, or: 1, but: 1, at: 1, in: 1, on: 1, to: 1, for: 1, of: 1, with: 1, by: 1, from: 1, as: 1 };

  function titleCase(s) {
    return s.split(" ").map(function (w, i) {
      if (/[A-Z]/.test(w)) return w;
      var bare = w.toLowerCase().replace(/[^a-z0-9']/g, "");
      if (i > 0 && SMALL_WORDS[bare]) return w;
      return w.replace(/[a-z]/, function (c) { return c.toUpperCase(); });
    }).join(" ");
  }

  function buildCase(item, task, n) {
    var card = el("article", "case");
    var head = el("div", "case-head");
    var info = el("div", "case-info");

    var title = el("div", "case-title");
    title.appendChild(badge(item.lang));
    var name = caseTitle(item, task);
    if (item.lang === "en") name = titleCase(name);
    if (task.key === "cover" && item.coverStyle) name += " (" + item.coverStyle + " style)";
    title.appendChild(el("span", "case-name", name));
    info.appendChild(title);

    if ((task.key === "song" || task.key === "cover") && item.caption) {
      info.appendChild(el("div", "case-caption", "Caption: " + item.caption));
    } else if (task.key === "persona") {
      var p = "Voice prompt";
      if (item.promptDur) p += " (" + item.promptDur + " s)";
      info.appendChild(el("div", "case-caption", p));
    }

    head.appendChild(el("div", "case-idx", (n < 10 ? "0" : "") + n));
    head.appendChild(info);
    card.appendChild(head);

    if (task.key === "cover") {
      var blocks = [
        item.originalStyle ? el("p", "detail-text", item.originalStyle.trim()) : null,
        lyricsPre(item.lyrics)
      ];
      card.appendChild(detailsBlock("Details / Lyrics", blocks));
    } else {
      card.appendChild(detailsBlock("Lyrics", [lyricsPre(item.lyrics)]));
    }

    card.appendChild(chipRow(item, task));
    return card;
  }

  function build() {
    var mount = document.getElementById("demo");
    if (!mount) return;
    TASKS.forEach(function (task) {
      var sec = el("section", "task-section");
      sec.appendChild(el("h3", null, task.title));
      sec.appendChild(el("p", "task-desc", task.desc));
      var items = DATA[task.key].items.slice().sort(function (a, b) {
        if (a.lang === b.lang) return 0;
        return a.lang === "en" ? -1 : 1;
      });
      items.forEach(function (item, i) {
        sec.appendChild(buildCase(item, task, i + 1));
      });
      mount.appendChild(sec);
    });
  }

  var mascot = document.getElementById("mascot");
  var mascotNote = document.getElementById("mascot-note");
  if (mascot && mascotNote) {
    var hideTimer = null;
    var cancelHide = function () {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    };
    mascot.addEventListener("click", function () {
      cancelHide();
      mascotNote.classList.toggle("show");
    });
    mascot.addEventListener("mouseenter", cancelHide);
    mascot.addEventListener("mouseleave", function () {
      cancelHide();
      hideTimer = setTimeout(function () { mascotNote.classList.remove("show"); }, 1000);
    });
  }

  var codeLink = document.getElementById("code-link");
  var tip = document.getElementById("code-tip");
  if (codeLink && tip) {
    codeLink.addEventListener("click", function (e) {
      e.preventDefault();
      tip.hidden = !tip.hidden;
    });
    document.addEventListener("click", function (e) {
      if (!tip.hidden && !codeLink.contains(e.target) && !tip.contains(e.target)) tip.hidden = true;
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") tip.hidden = true;
    });
  }

  build();
})();
