const SHEET_ID   = "1gcs-yxQd6uGgwt0qiHsG-9fGfJ_7Aj0y4E6RtWG-9y4";
const SHEET_NAME = "Sheet1";
const PER_HALAMAN = 24;

const DATA_CONTOH = [
  { no: "0006", judul: "Contoh produk enam (isi sheet kamu untuk mengganti ini)", link: "#", thumb: "" },
  { no: "0005", judul: "Contoh produk lima", link: "#", thumb: "" },
  { no: "0004", judul: "Contoh produk empat dengan judul yang agak panjang supaya terlihat terpotong dua baris", link: "#", thumb: "" },
  { no: "0003", judul: "Contoh produk tiga", link: "#", thumb: "" },
  { no: "0002", judul: "Contoh produk dua", link: "#", thumb: "" },
  { no: "0001", judul: "Contoh produk satu", link: "#", thumb: "" }
];

const el = {
  grid: document.getElementById("grid"),
  status: document.getElementById("status"),
  info: document.getElementById("info"),
  cari: document.getElementById("cari"),
  hapus: document.getElementById("hapus"),
  muat: document.getElementById("muat"),
  muatWrap: document.getElementById("muatWrap"),
  sentinel: document.getElementById("sentinel"),
  contoh: document.getElementById("contoh")
};

let semua = [];
let hasil = [];
let tampil = 0;

function normalisasi(teks) {
  return String(teks || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function rapikanThumb(url) {
  url = String(url || "").trim();
  if (!url) return "";
  const m = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/) || url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([^&#]+)/);
  if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w600";
  return url;
}

function padNomor(n) {
  n = String(n || "").trim();
  if (/^\d+$/.test(n) && n.length < 4) return n.padStart(4, "0");
  return n;
}

function adaAktif(nilai) {
  const v = normalisasi(nilai);
  return !["tidak", "no", "n", "false", "0", "off", "nonaktif"].includes(v);
}

async function ambilSheet() {
  const url = "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(SHEET_ID) +
              "/gviz/tq?tqx=out:json&headers=1&sheet=" + encodeURIComponent(SHEET_NAME);
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const teks = await res.text();
  const json = JSON.parse(teks.slice(teks.indexOf("{"), teks.lastIndexOf("}") + 1));
  if (json.status === "error") throw new Error("Sheet error");

  const cols = json.table.cols.map(c => normalisasi(c.label).replace(/\s+/g, "_"));
  const idx = nama => cols.indexOf(nama);
  let iNo = idx("no"), iJudul = idx("judul"), iLink = idx("link_shopee"), iThumb = idx("thumbnail"), iAktif = idx("aktif");
  if (iJudul < 0 && iLink < 0) { iNo = 0; iJudul = 1; iLink = 2; iThumb = 3; iAktif = 4; }

  const nilai = (row, i) => {
    if (i < 0 || !row.c[i]) return "";
    const c = row.c[i];
    return c.f != null && c.v !== null && typeof c.v === "number" ? c.f : (c.v != null ? c.v : "");
  };

  const daftar = [];
  json.table.rows.forEach(row => {
    const judul = String(nilai(row, iJudul)).trim();
    const link = String(nilai(row, iLink)).trim();
    if (!judul || !/^https?:\/\//i.test(link)) return;
    if (iAktif >= 0 && String(nilai(row, iAktif)).trim() !== "" && !adaAktif(nilai(row, iAktif))) return;
    daftar.push({
      no: padNomor(nilai(row, iNo)),
      judul, link,
      thumb: rapikanThumb(nilai(row, iThumb))
    });
  });
  return daftar.reverse();
}

function buatKartu(p) {
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.className = "kartu";
  a.href = p.link;
  a.target = "_blank";
  a.rel = "noopener noreferrer sponsored";

  const foto = document.createElement("div");
  foto.className = "foto";
  if (p.thumb) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = p.judul;
    img.referrerPolicy = "no-referrer";
    img.src = p.thumb;
    img.onerror = () => { img.remove(); foto.classList.add("kosong"); };
    foto.appendChild(img);
  } else {
    foto.classList.add("kosong");
  }
  if (p.no) {
    const n = document.createElement("span");
    n.className = "nomor";
    n.textContent = p.no;
    foto.appendChild(n);
  }

  const isi = document.createElement("div");
  isi.className = "isi";
  const j = document.createElement("h2");
  j.className = "judul";
  j.textContent = p.judul;
  const b = document.createElement("span");
  b.className = "beli";
  b.textContent = "Beli di Shopee";
  isi.append(j, b);

  a.append(foto, isi);
  li.appendChild(a);
  return li;
}

function tampilkanLagi() {
  const akhir = Math.min(tampil + PER_HALAMAN, hasil.length);
  const frag = document.createDocumentFragment();
  for (let i = tampil; i < akhir; i++) frag.appendChild(buatKartu(hasil[i]));
  el.grid.appendChild(frag);
  tampil = akhir;
  el.muatWrap.hidden = tampil >= hasil.length;
}

function terapkanCari() {
  const q = normalisasi(el.cari.value);
  el.hapus.classList.toggle("tampil", q !== "");
  if (!q) {
    hasil = semua;
  } else {
    const kata = q.split(" ");
    const angka = /^\d+$/.test(q) ? q.padStart(4, "0") : null;
    hasil = semua.filter(p => {
      const no = normalisasi(p.no);
      const judul = normalisasi(p.judul);
      if (angka && (no === angka || no === q)) return true;
      if (/^\d+$/.test(q)) return no.includes(q) || judul.includes(q);
      return kata.every(k => judul.includes(k) || no.includes(k));
    });
    if (angka) hasil = hasil.slice().sort((a, b) => (normalisasi(b.no) === angka) - (normalisasi(a.no) === angka));
  }
  el.grid.replaceChildren();
  tampil = 0;
  el.status.replaceChildren();

  if (hasil.length === 0) {
    el.muatWrap.hidden = true;
    el.info.textContent = "";
    el.status.innerHTML = "<div class='status'><strong>Tidak ketemu</strong>Coba nomor lain atau kata yang lebih pendek.</div>";
    return;
  }
  el.info.textContent = q ? hasil.length + " produk ketemu" : semua.length + " produk";
  tampilkanLagi();
}

function skeleton() {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 8; i++) {
    const li = document.createElement("li");
    li.innerHTML = "<div class='kartu skel'><div class='foto'></div><div class='isi'><p class='judul'>.</p><span class='beli'>.</span></div></div>";
    frag.appendChild(li);
  }
  el.grid.appendChild(frag);
}

function pesanError(judul, isi) {
  el.grid.replaceChildren();
  el.status.innerHTML = "";
  const d = document.createElement("div");
  d.className = "status";
  const s = document.createElement("strong"); s.textContent = judul;
  d.append(s, isi);
  el.status.appendChild(d);
}

let timer;
el.cari.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(terapkanCari, 150); });
el.hapus.addEventListener("click", () => { el.cari.value = ""; terapkanCari(); el.cari.focus(); });
el.muat.addEventListener("click", tampilkanLagi);

if ("IntersectionObserver" in window) {
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && tampil > 0 && tampil < hasil.length) tampilkanLagi();
  }, { rootMargin: "600px" }).observe(el.sentinel);
}

(async function mulai() {
  if (!SHEET_ID) {
    semua = DATA_CONTOH;
    el.contoh.innerHTML = "<div class='contoh'>Ini data contoh. Isi <code>SHEET_ID</code> di <code>index.html</code> untuk memakai sheet kamu.</div>";
    terapkanCari();
    return;
  }
  skeleton();
  try {
    semua = await ambilSheet();
    el.grid.replaceChildren();
    if (semua.length === 0) {
      pesanError("Etalase masih kosong", "Belum ada produk aktif di sheet.");
      return;
    }
    terapkanCari();
  } catch (e) {
    pesanError("Data belum bisa dimuat", "Pastikan sheet dibagikan sebagai \"Siapa saja yang memiliki link\" (Viewer), dan SHEET_ID serta nama tab sudah benar.");
  }
})();
