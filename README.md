# 🛍️ Ekonomi Sepeti

İzmir Ekonomi Üniversitesi (İEÜ) çevresindeki esnafların, kafelerin ve restoranların menülerini, güncel fiyatlarını, çalışma saatlerini, kampüse olan yürüme mesafelerini ve Google yorumlarını bir araya getiren hızlı ve modern web uygulaması.

---

## ✨ Özellikler

- **⚡ Hızlı ve Hafif:** Sıfır ağır framework (React/Vue vb.) bağımlılığı; modern Vanilla HTML5, CSS3 ve saf JavaScript ile anında yüklenen kullanıcı deneyimi.
- **📍 Kampüse Mesafe & "En Yakın" Filtresi:** Tüm esnafların İEÜ ana kampüsüne olan yürüme mesafeleri hesaplanır. "En Yakın" filtresiyle kampüse en yakın noktalar tek tıkla listelenir.
- **⭐ Google Puanı & Yorumları:** Google Haritalar entegrasyonu ile esnafların güncel puanları ve değerlendirmeleri doğrudan kartlarda ve detay pencerelerinde görüntülenir.
- **🗄️ Sıfır Bağımlılıkla SQLite Desteği:** Node 22+ yerleşik `node:sqlite` ve WAL modu sayesinde harici bir veritabanı sunucusuna ihtiyaç duymadan `data/ekonomi.sqlite` üzerinde güvenle çalışır.
- **🖼️ Akıllı Görsel Yönetimi:** Panelden yüklenen fotoğraflar tarayıcı tarafında otomatik optimize edilip küçültülür. Yerel diskte (`data/uploads/`) veya istenirse Vercel Blob üzerinde saklanır.
- **🛠️ Yönetim Paneli (`/admin.html`):**
  - **📍 Bilgileri Getir:** Google Haritalar linkinden koordinatları, mesafeyi, işletme adını, telefonunu ve Google yorumlarını otomatik çözer ve doldurur.
  - Dinamik kategori ve ürün yönetimi, çoklu porsiyon/boyut fiyatlandırması (Örn: Yarım / Tam), fotoğraf ekleme.
  - Güvenli şifre koruması ve brute-force saldırılarına karşı rate-limiting (istek sınırlama).
- **🚀 Her Yerde Çalışma Desteği:** Hem Coolify / VPS gibi bağımsız sunucularda tek komutla, hem de Vercel üzerinde serverless olarak çalışabilir.
- **📦 Üretim Optimizasyonu:** `npm run build` ile HTML, CSS ve JSON dosyaları minifiye edilir; Express sunucusu Brotli/Gzip sıkıştırmasıyla servis eder.

---

## 🛠️ Teknoloji Yığını

| Alan | Teknolojiler |
| :--- | :--- |
| **Çalışma Ortamı** | Node.js (>= 22.0.0) |
| **Sunucu** | Express.js 5, Node Native HTTP, Compression (Gzip/Brotli) |
| **Veritabanı** | Yerleşik `node:sqlite` (WAL modu) veya Upstash Redis |
| **Depolama** | Yerel Dosya Sistemi (`data/uploads`) veya Vercel Blob |
| **Arayüz (Frontend)** | Modern HTML5, Responsive Vanilla CSS (CSS Grid/Flexbox), ES Modules |
| **Test** | Node.js Test Runner (`node --test`) |

---

## 🚀 Hızlı Başlangıç (Yerel Geliştirme)

### Gereksinimler
- **Node.js 22+** (veya üzeri)
- **npm** (veya pnpm / yarn)

### 1. Projeyi Klonlayın ve Bağımlılıkları Kurun
```bash
git clone https://github.com/ErdemOzbaykus/ekonomi-sepeti.git
cd ekonomi-sepeti
npm install
```

### 2. Ortam Değişkenlerini Tanımlayın
`.env.example` dosyasını kopyalayarak `.env` oluşturun:
```bash
cp .env.example .env
```
`.env` dosyasını açıp admin şifrenizi belirleyin:
```env
ADMIN_PASSWORD=guclu_bir_sifre_belirleyin
PORT=3000
```

### 3. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```
Sunucu başladığında tarayıcınızda açın:
- **Kullanıcı Arayüzü:** [http://localhost:3000](http://localhost:3000)
- **Yönetim Paneli:** [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

### 4. Testleri Çalıştırın
```bash
npm test
```

---

## 📦 Üretim (Production) Derlemesi

Üretim ortamı için optimize edilmiş (minifiye) dosyaları `dist/` klasörüne çıkarmak için:

```bash
# Varlıkları optimize et ve küçült
npm run build

# Üretim sunucusunu başlat
npm start
```
`server.js` ortam değişkeni `NODE_ENV=production` olduğunda otomatik olarak optimize edilmiş `dist/` klasöründeki dosyaları servis eder.

---

## 🚢 Coolify / VPS ile Dağıtım (Deployment)

Uygulama, Coolify üzerinde ek Dockerfile gerektirmeksizin yerel **Node.js** servisi olarak doğrudan çalıştırılabilir:

1. **Yeni Uygulama Ekleyin:** Coolify panelinde GitHub reponuzu seçin.
2. **Derleme ve Başlatma Komutları:**
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Port:** `3000`
3. **Kalıcı Depolama (Persistent Storage / Volume):**
   Veritabanının ve yüklenen görsellerin sunucu yeniden başladığında silinmemesi için bir depolama birimi bağlayın:
   - **Hedef Dizin (Destination):** `/app/data` (veya projenizin `data/` dizini)
4. **Ortam Değişkenleri:**
   ```env
   NODE_ENV=production
   ADMIN_PASSWORD=guclu_admin_sifresi
   PORT=3000
   ```
5. **Dağıtımı Başlatın:** "Deploy" butonuna basın. Uygulamanız anında yayına girecektir.

---

## ⚙️ Ortam Değişkenleri (Environment Variables)

| Değişken | Zorunlu mu? | Varsayılan | Açıklama |
| :--- | :---: | :---: | :--- |
| `ADMIN_PASSWORD` | **Evet** | - | Admin paneline giriş için kullanılan parola. |
| `PORT` | Hayır | `3000` | Web sunucusunun dinleyeceği port. |
| `NODE_ENV` | Hayır | `development` | `production` yapıldığında `dist/` klasörü servis edilir. |
| `DATA_DIR` | Hayır | `./data` | SQLite veritabanı ve yüklemelerin tutulduğu ana dizin. |
| `DB_PATH` | Hayır | `./data/ekonomi.sqlite` | SQLite veritabanı dosyasının tam yolu. |
| `UPLOAD_DIR` | Hayır | `./data/uploads` | Panelden yüklenen resimlerin saklandığı dizin. |
| `KV_REST_API_URL` | Hayır | - | *(İsteğe bağlı)* SQLite yerine Upstash Redis kullanmak için URL. |
| `KV_REST_API_TOKEN`| Hayır | - | *(İsteğe bağlı)* Upstash Redis erişim anahtarı. |
| `BLOB_READ_WRITE_TOKEN` | Hayır | - | *(İsteğe bağlı)* Vercel Blob depolama anahtarı. |
| `GOOGLE_PLACES_API_KEY` | Hayır | - | *(İsteğe bağlı)* Google Haritalar API anahtarı (Canlı yorumlar ve yer detayları için). |

---

## 📁 Proje Yapısı

```text
ekonomi-sepeti/
├── admin.html           # Esnaf ve menü yönetim paneli
├── index.html           # Ziyaretçilerin gördüğü ana vitrin ve modal arayüzü
├── server.js            # Express.js API ve statik dosya sunucusu
├── esnaflar.json        # Başlangıç (seed) esnaf ve menü verileri
├── package.json         # Proje ayarları ve script'ler
├── validate.test.js     # Doğrulama, mesafe ve harita testleri
├── .env.example         # Örnek ortam değişkenleri şablonu
├── api/
│   ├── esnaflar.js      # CRUD esnaf API'si ve veri doğrulama mantığı
│   ├── harita.js        # Google Maps mesafe/koordinat çözme servisi
│   ├── upload.js        # WebP/JPG görsel yükleme uç noktası (Disk & Blob)
│   └── yorumlar.js      # Google yorumları ve değerlendirme servisi
├── lib/
│   ├── admin.js         # Yetkilendirme (Auth), rate limit ve Redis/SQLite köprüsü
│   └── db.js            # Node 22 native SQLite adaptörü ve depolama yönetimi
├── scripts/
│   └── build.js         # Üretim için minifikasyon ve derleme betiği
└── data/                # [Otomatik oluşturulur] Kalıcı SQLite ve yükleme dizini
    ├── ekonomi.sqlite   # SQLite veritabanı (WAL modu)
    └── uploads/         # Yüklenen mekan ve menü görselleri
```

---

## 📄 Lisans

Bu proje kişisel ve açık kaynak kullanım için geliştirilmiştir.
Menü fiyatları ve esnaf bilgileri bilgilendirme amaçlıdır.
