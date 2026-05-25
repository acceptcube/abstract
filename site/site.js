// Shared chrome for every page: contract bar, X link, footer, marketplace
// links once the collection exists, page fade in. Fetches data.json once and
// re broadcasts it as a "sitedata" event so page specific code (the gallery)
// never fetches twice.

(function () {
  function chrome(d) {
    var ca = document.getElementById("ca");
    var btn = document.getElementById("cacopy");
    var real = d && d.project && d.project.ca && d.project.ca !== "TBA";
    if (ca) ca.textContent = real ? d.project.ca : "revealed at launch";
    if (btn) {
      if (!real) btn.style.display = "none";
      else
        btn.onclick = function () {
          navigator.clipboard.writeText(d.project.ca);
          btn.textContent = "copied";
          setTimeout(function () { btn.textContent = "copy"; }, 1200);
        };
    }
    var x = document.getElementById("xlink");
    if (x && d && d.project && d.project.x)
      x.href = "https://x.com/" + d.project.x.replace("@", "");
    var foot = document.getElementById("foot");
    if (foot && d && d.footer) foot.textContent = d.footer;

    var p = (d && d.project) || {};
    var footEl = document.querySelector("footer");
    if (footEl && !document.getElementById("market") && (p.magiceden || p.tensor)) {
      var m = document.createElement("nav");
      m.id = "market";
      m.className = "market";
      var label = document.createElement("span");
      label.textContent = "Collect";
      m.appendChild(label);
      [["Magic Eden", p.magiceden], ["Tensor", p.tensor]].forEach(function (kv) {
        if (!kv[1]) return;
        var a = document.createElement("a");
        a.href = kv[1];
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = kv[0];
        m.appendChild(a);
      });
      footEl.appendChild(m);
    }
  }

  fetch("data.json?_=" + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (d) {
      window.SITE = d;
      chrome(d);
      document.dispatchEvent(new CustomEvent("sitedata", { detail: d }));
      document.body.classList.add("ready");
    })
    .catch(function () {
      chrome(null);
      document.body.classList.add("ready");
    });
})();
