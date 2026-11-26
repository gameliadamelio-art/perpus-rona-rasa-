import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type {
  CollectionItem,
  CollectionMetadata,
  CollectionType,
  SiteSettings,
  User,
} from '../src/types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const AUDIO_UPLOAD_DIR = path.resolve(UPLOADS_DIR, 'audio');
const COVER_UPLOAD_DIR = path.resolve(UPLOADS_DIR, 'covers');
const DOC_UPLOAD_DIR = path.resolve(UPLOADS_DIR, 'documents');
const VIDEO_UPLOAD_DIR = path.resolve(UPLOADS_DIR, 'videos');

for (const dir of [DATA_DIR, UPLOADS_DIR, AUDIO_UPLOAD_DIR, COVER_UPLOAD_DIR, DOC_UPLOAD_DIR, VIDEO_UPLOAD_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

export const UPLOAD_PATHS = {
  root: UPLOADS_DIR,
  covers: COVER_UPLOAD_DIR,
  documents: DOC_UPLOAD_DIR,
  audio: AUDIO_UPLOAD_DIR,
  videos: VIDEO_UPLOAD_DIR,
};

const db = new Database(path.join(DATA_DIR, 'rona_rasa.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    bio TEXT NOT NULL DEFAULT '',
    reading_interest TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('book', 'poem', 'film', 'album')),
    title TEXT NOT NULL,
    creator TEXT NOT NULL,
    year INTEGER NOT NULL,
    genre TEXT NOT NULL,
    sub_category TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    cover_url TEXT NOT NULL DEFAULT '',
    file_url TEXT NOT NULL DEFAULT '',
    media_url TEXT NOT NULL DEFAULT '',
    access_status TEXT NOT NULL DEFAULT 'Tersedia Terbuka',
    is_featured INTEGER NOT NULL DEFAULT 0,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    collection_id INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    page_number INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, collection_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reading_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    collection_id INTEGER NOT NULL,
    current_page INTEGER NOT NULL DEFAULT 1,
    total_pages INTEGER NOT NULL DEFAULT 1,
    chapter_index INTEGER NOT NULL DEFAULT 0,
    progress_percent INTEGER NOT NULL DEFAULT 0,
    last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, collection_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function generateGentleWav(filePath: string, notesHz: number[], durationSec = 14) {
  if (fs.existsSync(filePath)) return;
  const sampleRate = 22050;
  const numSamples = sampleRate * durationSec;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const noteStepSec = 2.0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteIndex = Math.floor(t / noteStepSec) % notesHz.length;
    const localT = t % noteStepSec;
    const freq = notesHz[noteIndex];

    const attack = Math.min(1, localT / 0.06);
    const decay = Math.exp(-localT * 1.45);
    const env = attack * decay;

    const fundamental = Math.sin(2 * Math.PI * freq * t);
    const harmonic = 0.28 * Math.sin(2 * Math.PI * freq * 2 * t);
    const drone = 0.14 * Math.sin(2 * Math.PI * (notesHz[0] / 2) * t);

    const fadeOut = t > durationSec - 1.5 ? Math.max(0, (durationSec - t) / 1.5) : 1;
    const sample = Math.max(-1, Math.min(1, (fundamental * 0.55 + harmonic + drone) * env * fadeOut * 0.45));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

function ensureSampleAudioFiles() {
  generateGentleWav(path.join(AUDIO_UPLOAD_DIR, 'sampel_halaman_belakang.wav'), [261.63, 293.66, 329.63, 392.0, 440.0, 329.63, 293.66]);
  generateGentleWav(path.join(AUDIO_UPLOAD_DIR, 'sampel_senandung_teh.wav'), [293.66, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63]);
  generateGentleWav(path.join(AUDIO_UPLOAD_DIR, 'sampel_gema_perunggu.wav'), [246.94, 261.63, 329.63, 369.99, 440.0, 369.99, 329.63]);
  generateGentleWav(path.join(AUDIO_UPLOAD_DIR, 'sampel_embun_pendopo.wav'), [220.0, 261.63, 293.66, 349.23, 392.0, 349.23, 293.66]);
}

ensureSampleAudioFiles();

function seedDatabase() {
  const countRow = db.prepare('SELECT COUNT(*) as total FROM collections').get() as { total: number };
  if (countRow.total === 0) {
    const insertCollection = db.prepare(`
      INSERT INTO collections (
        type, title, creator, year, genre, sub_category, description,
        cover_url, file_url, media_url, access_status, is_featured, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedItems: Array<{
      type: CollectionType;
      title: string;
      creator: string;
      year: number;
      genre: string;
      subCategory: string;
      description: string;
      coverUrl: string;
      fileUrl: string;
      mediaUrl: string;
      accessStatus: string;
      isFeatured: number;
      metadata: CollectionMetadata;
    }> = [
      {
        type: 'book',
        title: 'Syair Perahu & Renungan Bahari',
        creator: 'Hamzah Fansuri (Edisi Arsip Klasik)',
        year: 1600,
        genre: 'Sastra Klasik',
        subCategory: 'Sastra Klasik',
        description:
          'Suntingan naskah klasik Nusantara abad ke-16 yang merefleksikan perjalanan batin manusia sebagai perahu yang mengarungi samudra kehidupan, dilengkapi pengantar sejarah aksara dan catatan pembaca.',
        coverUrl: '/src/assets/images/book_cover_roman_1795678106375.jpg',
        fileUrl: '',
        mediaUrl: '',
        accessStatus: 'Tersedia Terbuka',
        isFeatured: 1,
        metadata: {
          publisher: 'Arsip Digital Rona Rasa',
          isbn: 'Domain Publik — Naskah Klasik Nusantara',
          pageCount: 36,
          language: 'Bahasa Melayu Klasik / Indonesia',
          subject: 'Tasawuf Sastra & Filologi Nusantara',
          digitalFormat: 'Teks Interaktif',
          chapters: [
            {
              id: 'bab-1',
              title: 'Pengantar Naskah & Konteks Maritim',
              content:
                'Pada penghujung abad keenam belas di pesisir Barus dan Aceh, kata tidak pernah berdiri jauh dari angin laut. Para penyair dan pemikir menyusun perumpamaan dari papan kayu, layar kain, dan kompas bintang untuk menjelaskan perjalanan kesadaran manusia.\n\nSyair Perahu adalah salah satu tonggak tertua tradisi syair berbahasa Melayu. Di dalam bait-baitnya, tubuh dan jiwa dipandang sebagai sebuah bahtera yang tengah meniti gelombang dunia menuju pelabuhan ketenangan.\n\nMelalui edisi arsip digital ini, Perpustakaan Rona Rasa menghadirkan pembacaan ulang yang terawat agar pembaca masa kini dapat menyentuh denyut bahasa klasik tanpa terhalang jarak ruang penyimpanan fisik.',
            },
            {
              id: 'bab-2',
              title: 'Bagian I: Mengenal Perahu dan Bekalnya',
              content:
                'Inilah gerangan suatu madah,\nMengarangkan syair terlalu indah,\nMembetuli jalan tempat berpindah,\nDi sanalah iktikad diperbetuli sudah.\n\nWahai muda kenali dirimu,\nIalah perahu tamsil tubuhmu,\nTiadalah berapa lama hidupmu,\nKe akhirat jua kekal diammu.\n\nBait pembuka ini mengajak pembaca berhenti sejenak dari riuh keseharian. Perahu bukan sekadar kendaraan kayu di atas air, melainkan metafora tentang kesadaran akan kefanaan dan tanggung jawab merawat batin selama berlayar.',
            },
            {
              id: 'bab-3',
              title: 'Bagian II: Kemudi, Layar, dan Angin Musim',
              content:
                'Hai muda arif budiman,\nHasilkan kemudi dengan pedoman,\nAlat perahumu jua kerjakan,\nItulah jalan membetuli insan.\n\nPerteguh jua alat perahumu,\nHasilkan bekal air dan kayu,\nDayung pengayuh taruh di situ,\nSupaya laju perahumu itu.\n\nDalam tradisi kepustakaan pesisir, kemudi melambangkan kejernihan akal, sedangkan layar dan angin menggambarkan keselarasan antara ikhtiar manusia dan gerak semesta. Setiap metafora disusun agar mudah diingat dalam pembacaan lisan maupun sunyi kamar baca.',
            },
            {
              id: 'bab-4',
              title: 'Catatan Pelestarian Arsip',
              content:
                'Pelestarian naskah klasik Nusantara tidak cukup hanya menyimpan lembaran tua di balik kaca museum. Kata-kata harus kembali dibaca, disuarakan, dan direnungkan oleh generasi baru.\n\nOleh sebab itu, Perpustakaan Rona Rasa merawat teks domain publik ini dalam format bacaan digital yang ramah mata serta terbuka untuk dikaji oleh pelajar, peneliti, maupun penikmat sastra.',
            },
          ],
        },
      },
      {
        type: 'book',
        title: 'Hujan di Pendopo Tengah',
        creator: 'Nadia Larasati',
        year: 2024,
        genre: 'Fiksi Sastra',
        subCategory: 'Kumpulan Cerpen',
        description:
          'Antologi lima cerita pendek berlisensi terbuka mengenai ingatan keluarga, rumah kayu Jawa, aroma tanah basah selepas hujan sore, serta percakapan-percakapan sunyi di beranda belakang.',
        coverUrl: '/src/assets/images/book_cover_cerpen_1795678107388.jpg',
        fileUrl: '',
        mediaUrl: '',
        accessStatus: 'Tersedia Terbuka',
        isFeatured: 1,
        metadata: {
          publisher: 'Pustaka Rona Rasa (CC BY-SA 4.0)',
          isbn: 'Lisensi Terbuka CC BY-SA 4.0',
          pageCount: 48,
          language: 'Bahasa Indonesia',
          subject: 'Cerita Pendek Indonesia Kontemporer',
          digitalFormat: 'Teks Interaktif',
          chapters: [
            {
              id: 'cerpen-1',
              title: '1. Teh Melati dan Bunyi Genteng Bocor',
              content:
                'Pukul empat sore di Kotagede selalu datang dengan warna langit yang hampir sama: abu-abu pucat sebelum akhirnya pecah menjadi rintik halus di atas daun pisang.\n\nIbu meletakkan poci tanah liat di tengah meja jati yang kakinya sedikit goyah. Tidak ada suara televisi hari itu, hanya detak jam dinding tua dan suara air menetes ke dalam ember kaleng di sudut serambi.\n\n"Kalau hujan turun terlalu deras," kata Ibu sambil menuang teh yang masih mengepul, "surat-surat lama dari lemari atas biasanya berbau seperti tanah kebun." Aku mengangguk pelan, membuka kotak kardus berisi kartu pos tahun delapan puluhan yang tintanya mulai memudar menjadi hijau lumut.',
            },
            {
              id: 'cerpen-2',
              title: '2. Penjaga Katalog di Ujung Gang',
              content:
                'Setiap Selasa pagi, Pak Darmo menata kembali kartu-kartu indeks dari kertas manila. Jemarinya bergerak pelan namun pasti, seolah setiap judul buku memiliki berat dan suhunya sendiri.\n\nDi ruangan kecil bercat hijau teh pudar itu, rak buku tidak pernah ditata berdasarkan tahun terbit saja, melainkan berdasarkan suasana hati pembaca yang pernah datang mencarinya.\n\n"Buku perjalanan jangan ditaruh terlalu tinggi," ujarnya suatu hari. "Orang yang sedang rindu pulang biasanya lelah mendongak."',
            },
            {
              id: 'cerpen-3',
              title: '3. Surat untuk Perpustakaan Kecil',
              content:
                'Musim kemarau berganti tanpa aba-aba. Debu halus menempel di punggung buku-buku bersampul kain, namun ruang baca tetap tenang oleh napas panjang orang-orang yang singgah.\n\nDi halaman terakhir sebuah buku catatan harian tanpa nama pengarang, kami menemukan kalimat pendek bertinta biru: terima kasih telah menyediakan satu kursi di dekat jendela, tempat suara jalanan terdengar jauh dan pikiran dapat beristirahat.',
            },
          ],
        },
      },
      {
        type: 'book',
        title: 'Catatan Pesisir & Esai Kebudayaan',
        creator: 'Bagus Wiratama',
        year: 2023,
        genre: 'Esai Budaya',
        subCategory: 'Esai',
        description:
          'Kumpulan esai reflektif tentang ruang baca komunitas, arsip lisan di kota-kota pelabuhan Nusantara, serta peran perpustakaan independen dalam merawat memori kolektif.',
        coverUrl: '/src/assets/images/about_reading_room_1795678110667.jpg',
        fileUrl: '',
        mediaUrl: '',
        accessStatus: 'Tersedia Terbuka',
        isFeatured: 0,
        metadata: {
          publisher: 'Rona Rasa Press (CC BY 4.0)',
          isbn: 'Lisensi Terbuka CC BY 4.0',
          pageCount: 64,
          language: 'Bahasa Indonesia',
          subject: 'Kajian Budaya & Kepustakaan',
          digitalFormat: 'Teks Interaktif',
          chapters: [
            {
              id: 'esai-1',
              title: 'Bab I: Mengapa Ruang Baca Independen Bertahan',
              content:
                'Di banyak kota di Indonesia, perpustakaan independen lahir bukan dari gedung megah, melainkan dari rak kayu sederhana di ruang tamu warga. Ia tumbuh karena kebutuhan mendasar: memiliki tempat untuk membaca tanpa tergesa.\n\nKetika arus informasi bergerak kian cepat dan singkat, perpustakaan justru menawarkan perlambatan. Membaca satu bab utuh atau menyimak satu album dari lagu pertama hingga penutup adalah bentuk perlawanan lembut terhadap keterburu-buruan.',
            },
            {
              id: 'esai-2',
              title: 'Bab II: Mengarsipkan Rasa, Bukan Sekadar Data',
              content:
                'Katalog yang baik mencatat tahun terbit, nama pengarang, dan nomor klasifikasi dengan cermat. Namun perpustakaan yang hidup juga menjaga konteks emosional sebuah karya: mengapa puisi itu ditulis pada masa pancaroba, atau bagaimana bunyi gamelan dan gitar akustik bertemu di ruang rekam sederhana.\n\nDari kata menuju rasa bukanlah slogan hampa, melainkan metode membaca yang menempatkan empati di pusat pengalaman literasi.',
            },
          ],
        },
      },
      {
        type: 'poem',
        title: 'Sajak Musim Hujan di Beranda Kayu',
        creator: 'Raka Mahesa',
        year: 2025,
        genre: 'Puisi Kontemporer',
        subCategory: 'Puisi Individual',
        description:
          'Puisi liris tentang ketenangan pagi setelah hujan, secangkir teh hijau hangat, dan kata-kata yang menepi di sela lembaran buku.',
        coverUrl: '/src/assets/images/book_cover_puisi_1795678106784.jpg',
        fileUrl: '',
        mediaUrl: '',
        accessStatus: 'Tersedia Terbuka',
        isFeatured: 1,
        metadata: {
          publicationSource: 'Jurnal Sastra Rona Rasa, Edisi III (CC BY 4.0)',
          theme: 'Alam, Ketenangan & Ingatan',
          era: 'Kontemporer',
          poemText: `Di beranda kayu yang masih menyimpan dingin malam,
hujan meninggalkan titik-titik bening di ujung daun pakis.
Tidak ada yang tergesa hari ini—
bahkan bayang-bayang pohon mangga berjalan perlahan
menyusuri dinding kapur berwarna teh muda.

Kau membuka halaman yang kemarin sempat terlipat,
menemukan kembali kalimat yang pernah kita simpan diam-diam.
Ternyata waktu tidak pernah benar-benar menghapus makna;
ia hanya mengendapkannya seperti ampas daun teh
di dasar cangkir keramik yang hangat.

Jika nanti senja datang lebih cepat dari biasa,
biarkan lampu meja tetap menyala redup,
agar setiap kata menemukan tempatnya untuk pulang,
dari huruf yang sunyi menuju rasa yang utuh.`,
        },
      },
      {
        type: 'poem',
        title: 'Pantun Pelayaran & Angin Selatan',
        creator: 'Anonim (Khazanah Lisan Nusantara)',
        year: 1910,
        genre: 'Puisi Lama',
        subCategory: 'Antologi Puisi',
        description:
          'Rangkaian pantun tradisional Nusantara bertema pelayaran, persahabatan, dan kebijaksanaan hidup dari khazanah sastra lisan domain publik.',
        coverUrl: '/src/assets/images/book_cover_roman_1795678106375.jpg',
        fileUrl: '',
        mediaUrl: '',
        accessStatus: 'Tersedia Terbuka',
        isFeatured: 0,
        metadata: {
          publicationSource: 'Arsip Sastra Lisan Nusantara (Domain Publik)',
          theme: 'Bahari & Kebijaksanaan Tradisional',
          era: 'Sastra Klasik',
          poemText: `Berlayar perahu menuju ke pulau,
Layar terkembang di waktu pagi.
Hati yang rusuh jangan dirisau,
Budi yang baik dikenang lagi.

Pohon beringin di tepi kali,
Tempat berteduh di tengah hari.
Ilmu dicari tiada henti,
Penuntun langkah sepanjang negeri.

Embun menetes di daun keladi,
Sinar mentari hangat menyapa.
Kata terjaga di dalam hati,
Menjadi cahaya bagi sesama.`,
        },
      },
      {
        type: 'film',
        title: 'Perahu Pagi di Teluk Sunyi',
        creator: 'Sutradara: Dimas Prawira',
        year: 2024,
        genre: 'Drama Puitis',
        subCategory: 'Film Pendek',
        description:
          'Film pendek puitis tentang seorang pengrajin perahu dan cucunya yang menyusuri teluk berkabut di pagi hari sambil bertukar kisah rakyat pesisir.',
        coverUrl: '/src/assets/images/film_poster_arsip_1795678108376.jpg',
        fileUrl: '',
        mediaUrl: '',
        accessStatus: 'Tersedia Terbuka',
        isFeatured: 1,
        metadata: {
          duration: '24 menit',
          castMembers: 'Suryo Handoko, Lila Kusuma',
          productionHouse: 'Kolektif Sinema Rona',
          accessInfo: 'Lisensi Terbuka CC BY-NC 4.0 — Arsip Kurasi & Naskah Adegan Tersedia',
        },
      },
      {
        type: 'film',
        title: 'Sunyi di Balik Kelir',
        creator: 'Sutradara: Ratna Puspitasari',
        year: 2023,
        genre: 'Dokumenter Budaya',
        subCategory: 'Dokumenter',
        description:
          'Dokumenter intim yang merekam keseharian pembuat wayang kulit generasi ketiga di sebuah pendopo kayu sederhana, menyorot kesabaran pahatan dan filosofi bayangan.',
        coverUrl: '/src/assets/images/film_poster_senja_1795678108786.jpg',
        fileUrl: '',
        mediaUrl: '',
        accessStatus: 'Tersedia Terbuka',
        isFeatured: 1,
        metadata: {
          duration: '38 menit',
          castMembers: 'Ki Subagio & Pengrajin Pendopo Bantul',
          productionHouse: 'Studio Arsip Nusantara',
          accessInfo: 'Arsip Budaya Terbuka — Unggah video MP4/WebM melalui Dashboard Admin untuk pemutaran langsung',
        },
      },
      {
        type: 'album',
        title: 'Senandung Halaman Belakang',
        creator: 'Kelompok Akustik Senja',
        year: 2024,
        genre: 'Folk Akustik / Musikalisasi Puisi',
        subCategory: 'Album Studio',
        description:
          'Album akustik bernuansa tenang yang memadukan petikan gitar nilon dan pembacaan larik-larik puisi tentang beranda rumah, hujan sore, dan ruang baca.',
        coverUrl: '/src/assets/images/album_cover_folk_1795678109333.jpg',
        fileUrl: '',
        mediaUrl: '/uploads/audio/sampel_halaman_belakang.wav',
        accessStatus: 'Tersedia Terbuka',
        isFeatured: 1,
        metadata: {
          recordLabel: 'Rona Suara Records (CC BY 4.0)',
          accessInfo: 'Pemutaran Audio Langsung — Lisensi Terbuka',
          tracks: [
            {
              number: 1,
              title: 'Pembuka: Pagi di Beranda',
              duration: '00:14',
              audioUrl: '/uploads/audio/sampel_halaman_belakang.wav',
            },
            {
              number: 2,
              title: 'Senandung Teh Hijau',
              duration: '00:14',
              audioUrl: '/uploads/audio/sampel_senandung_teh.wav',
            },
            {
              number: 3,
              title: 'Larik Hujan Sore',
              duration: '00:14',
              audioUrl: '/uploads/audio/sampel_embun_pendopo.wav',
            },
          ],
        },
      },
      {
        type: 'album',
        title: 'Gema Perunggu Nusantara',
        creator: 'Ensambel Bunyi Teduh',
        year: 2025,
        genre: 'Ambient Gamelan & Instrumental',
        subCategory: 'Rekaman Arsip',
        description:
          'Komposisi meditatif berakar dari tangga nada pelog dan saron perunggu yang direkam untuk menemani sesi membaca panjang dan kontemplasi sunyi.',
        coverUrl: '/src/assets/images/album_cover_gamelan_1795678109191.jpg',
        fileUrl: '',
        mediaUrl: '/uploads/audio/sampel_gema_perunggu.wav',
        accessStatus: 'Tersedia Terbuka',
        isFeatured: 1,
        metadata: {
          recordLabel: 'Arsip Suara Independen (CC BY-SA 4.0)',
          accessInfo: 'Pemutaran Audio Langsung — Lisensi Terbuka',
          tracks: [
            {
              number: 1,
              title: 'Air & Perunggu (Pelog)',
              duration: '00:14',
              audioUrl: '/uploads/audio/sampel_gema_perunggu.wav',
            },
            {
              number: 2,
              title: 'Embun di Pendopo Tua',
              duration: '00:14',
              audioUrl: '/uploads/audio/sampel_embun_pendopo.wav',
            },
          ],
        },
      },
    ];

    for (const item of seedItems) {
      insertCollection.run(
        item.type,
        item.title,
        item.creator,
        item.year,
        item.genre,
        item.subCategory,
        item.description,
        item.coverUrl,
        item.fileUrl,
        item.mediaUrl,
        item.accessStatus,
        item.isFeatured,
        JSON.stringify(item.metadata)
      );
    }
  }

  const settingsRow = db.prepare('SELECT id FROM site_settings WHERE id = 1').get();
  if (!settingsRow) {
    const defaultSettings: SiteSettings = {
      libraryName: 'Perpustakaan Rona Rasa',
      tagline: 'Dari Kata, Menuju Rasa.',
      heroTitle: 'Ruang Baca Digital untuk Sastra dan Budaya Indonesia',
      heroDescription:
        'Perpustakaan digital independen yang merawat, mengarsipkan, dan membuka akses baca langsung terhadap karya sastra, puisi, film puitis, dan rekaman musik Indonesia.',
      welcomeText:
        'Selamat datang di Perpustakaan Rona Rasa. Duduklah sejenak, pilih buku atau puisi yang ingin Anda simak, dan nikmati pengalaman membaca yang tenang langsung di ruang digital ini.',
      heroBannerUrl: '/src/assets/images/hero_library_matcha_1795678106423.jpg',
      featuredCollectionIds: [1, 2, 4, 6, 8],
      aboutHistory:
        'Perpustakaan Rona Rasa lahir dari gagasan sederhana bahwa karya sastra dan budaya Indonesia membutuhkan rumah digital yang tenang, terawat, dan dapat diakses langsung tanpa terputus oleh tautan luar. Bermula dari arsip komunitas pembaca independen, Rona Rasa tumbuh menjadi ruang baca digital yang menghimpun naskah sastra, puisi, sinema puitis, dan rekaman bunyi.',
      aboutVision:
        'Menjadi perpustakaan digital independen yang hangat, inklusif, dan terpercaya dalam merawat memori literasi serta ekspresi budaya Indonesia lintas generasi.',
      aboutMission:
        '1. Menyediakan akses baca, dengar, dan tonton yang nyaman langsung di dalam platform.\n2. Mengarsipkan metadata karya sastra, puisi, film, dan musik secara tertib dan jujur.\n3. Mendukung karya domain publik dan lisensi terbuka agar dapat dipelajari siapa saja.',
      aboutGoals:
        'Membangun kebiasaan membaca yang perlahan dan mendalam, sekaligus memberi pustakawan serta pegiat literasi perangkat pengelolaan arsip yang mudah digunakan tanpa hambatan teknis.',
      aboutCollectionFocus:
        'Fokus utama kami mencakup buku sastra (novel, kumpulan cerpen, esai, prosa klasik hingga kontemporer), puisi individual maupun antologi, arsip film Indonesia bernilai artistik, serta album musik folk, musikalisasi puisi, dan instrumental Nusantara.',
      aboutContribution:
        'Setiap koleksi di Perpustakaan Rona Rasa dikurasi dengan menghormati hak cipta serta keakuratan bibliografis, menghadirkan ruang temu antara peneliti, penulis, musisi, pembuat film, dan pembaca umum.',
      aboutImageUrl: '/src/assets/images/about_reading_room_1795678110667.jpg',
      updatedAt: new Date().toISOString(),
    };

    db.prepare('INSERT INTO site_settings (id, data_json) VALUES (1, ?)').run(
      JSON.stringify(defaultSettings)
    );
  }
}

seedDatabase();

export function mapCollectionRow(row: Record<string, unknown>): CollectionItem {
  let metadata: CollectionMetadata = {};
  try {
    metadata = JSON.parse(String(row.metadata_json || '{}')) as CollectionMetadata;
  } catch {
    metadata = {};
  }
  return {
    id: Number(row.id),
    type: row.type as CollectionType,
    title: String(row.title),
    creator: String(row.creator),
    year: Number(row.year),
    genre: String(row.genre),
    subCategory: String(row.sub_category || ''),
    description: String(row.description),
    coverUrl: String(row.cover_url || ''),
    fileUrl: String(row.file_url || ''),
    mediaUrl: String(row.media_url || ''),
    accessStatus: (row.access_status as CollectionItem['accessStatus']) || 'Tersedia Terbuka',
    isFeatured: Boolean(row.is_featured),
    metadata,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapUserRow(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    name: String(row.name),
    email: String(row.email),
    role: row.role as User['role'],
    status: row.status as User['status'],
    bio: String(row.bio || ''),
    readingInterest: String(row.reading_interest || ''),
    createdAt: String(row.created_at),
  };
}

export default db;
