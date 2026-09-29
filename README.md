# 🛍️ Ekonomi Sepeti

İzmir Ekonomi Üniversitesi (İEÜ) çevresindeki esnafların, kafelerin ve restoranların menülerini, güncel fiyatlarını, çalışma saatlerini, kampüse olan yürüme mesafelerini ve Google yorumlarını bir araya getiren hızlı ve modern web uygulaması.

> Bu dal (`vercel-base`), Vercel serverless altyapısı, Vercel Blob ve Upstash KV (Redis) ile tam uyumlu olarak çalışacak şekilde optimize edilmiştir.

---

## ✨ Özellikler

- **⚡ Hızlı ve Hafif:** Sıfır ağır framework (React/Vue vb.) bağımlılığı; modern Vanilla HTML5, CSS3 ve saf JavaScript ile anında yüklenen kullanıcı deneyimi.
- **📍 Kampüse Mesafe & "En Yakın" Filtresi:** Tüm esnafların İEÜ ana kampüsüne olan yürüme mesafeleri hesaplanır. "En Yakın" filtresiyle kampüse en yakın noktalar tek tıkla listelenir.
- **⭐ Google Puanı & Yorumları:** Google Haritalar / Places API entegrasyonu ile esnafların güncel puanları ve değerlendirmeleri doğrudan kartlarda ve detay pencerelerinde görüntülenir.
- **☁️ Serverless & Vercel Native:** Vercel üzerinde Edge/Serverless Functions mimarisiyle sıfır sunucu bakımı gerektirerek ölçeklenir.
- **🖼️ Akıllı Görsel Yönetimi:** Panelden yüklenen fotoğraflar tarayıcı tarafında optimize edilip Vercel Blob üzerinde saklanır.
- **🛠️ Yönetim Paneli (`/admin.html`):**
  - **📍 Bilgileri Getir:** Google Haritalar linkinden koordinatları, mesafeyi, işletme adını, telefonunu ve Google yorumlarını otomatik çözer ve forma doldurur.
  - Dinamik kategori ve ürün yönetimi, çoklu porsiyon/boyut fiyatlandırması (Örn: Yarım / Tam), fotoğraf ekleme.
  - Güvenli şifre koruması ve brute-force saldırılarına karşı Upstash Redis destekli rate-limiting (istek sınırlama).

---

## 🛠️ Teknoloji Yığını

| Alan | Teknolojiler |
| :--- | :--- |
| **Platform / Dağıtım** | Vercel Serverless Functions |
| **Veritabanı** | Upstash Redis (Vercel KV) |
| **Görsel Depolama** | Vercel Blob (`@vercel/blob`) |
| **Arayüz (Frontend)** | Modern HTML5, Responsive Vanilla CSS (CSS Grid/Flexbox), ES Modules |
| **Test** | Node.js Test Runner (`node --test`) |

---

## 🚀 Hızlı Başlangıç (Yerel Geliştirme)

### Gereksinimler
- **Node.js 20+** (veya üzeri)
- **npm** (veya pnpm / yarn)
- **Vercel CLI** (`npm i -g vercel`) *(isteğe bağlı, yerel serverless testleri için)*

### 1. Projeyi Klonlayın ve Bağımlılıkları Kurun
```bash
git clone https://github.com/ErdemOzbaykus/ekonomi-sepeti.git
cd ekonomi-sepeti
git checkout vercel-base
npm install
```

### 2. Ortam Değişkenlerini Tanımlayın
`.env.local` dosyası oluşturarak gerekli değişkenleri girin:
```env
ADMIN_PASSWORD=guclu_bir_sifre_belirleyin
KV_REST_API_URL=https://...upstash.io
KV_REST_API_TOKEN=...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
GOOGLE_PLACES_API_KEY=AIzaSy... # (İsteğe bağlı, Google puan ve yorumları için)
```

### 3. Geliştirme Sunucusunu Başlatın
Vercel CLI ile yerel ortamda çalıştırmak için:
```bash
vercel dev
```
veya sadece statik arayüzü hızlıca önizlemek için:
```bash
npx serve .
```

### 4. Testleri Çalıştırın
```bash
npm test
```

---

## 🚢 Vercel ile Dağıtım (Deployment)

1. Projeyi [Vercel Dashboard](https://vercel.com/dashboard) üzerinden import edin veya terminalden çalıştırın:
   ```bash
   vercel
   ```
2. **Storage:**
   - **Upstash Redis:** Vercel panelinden "Storage -> Create KV / Upstash Redis" ekleyin (ortam değişkenleri otomatik bağlanır).
   - **Blob Storage:** Vercel panelinden "Storage -> Create Blob" ekleyin.
3. **Environment Variables:**
   - `ADMIN_PASSWORD`: Yönetim paneline giriş parolası.
   - `GOOGLE_PLACES_API_KEY`: *(İsteğe bağlı)* Google Haritalar API anahtarı.
4. Dağıtımı onaylayın ve siteniz anında yayına girsin!

---

## ⚙️ Ortam Değişkenleri (Environment Variables)

| Değişken | Zorunlu mu? | Açıklama |
| :--- | :---: | :--- |
| `ADMIN_PASSWORD` | **Evet** | Admin paneline giriş için kullanılan parola. |
| `KV_REST_API_URL` | **Evet** | Upstash Redis bağlantı adresi. |
| `KV_REST_API_TOKEN`| **Evet** | Upstash Redis erişim anahtarı. |
| `BLOB_READ_WRITE_TOKEN` | Görsel yükleme için | Vercel Blob okuma/yazma belirteci. |
| `GOOGLE_PLACES_API_KEY` | Hayır | *(İsteğe bağlı)* Canlı Google yorumları ve yer detayları için Places API anahtarı. |

---

## 📁 Proje Yapısı

```text
ekonomi-sepeti/
├── admin.html           # Esnaf ve menü yönetim paneli
├── index.html           # Ziyaretçilerin gördüğü ana vitrin ve modal arayüzü
├── esnaflar.json        # Başlangıç (seed) esnaf ve menü verileri
├── package.json         # Proje bağımlılıkları ve script'leri
├── validate.test.js     # Doğrulama, mesafe ve harita birim testleri
├── api/
│   ├── esnaflar.js      # Serverless CRUD esnaf API'si ve veri doğrulama mantığı
│   ├── harita.js        # Google Maps mesafe/koordinat çözme servisi
│   ├── upload.js        # Vercel Blob görsel yükleme uç noktası
│   └── yorumlar.js      # Google yorumları ve değerlendirme servisi
└── lib/
    └── admin.js         # Yetkilendirme (Auth), rate limit ve Upstash Redis köprüsü
```

---

## 📄 Lisans

Bu proje kişisel ve açık kaynak kullanım için geliştirilmiştir.
Menü fiyatları ve esnaf bilgileri bilgilendirme amaçlıdır.
