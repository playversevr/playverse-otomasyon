const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

let db;
const dbPath = process.env.DISK_PATH ? path.join(process.env.DISK_PATH, 'vr_kafe.db') : './vr_kafe.db';

(async () => {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    
    // Tabloları Hazırla
    await db.exec(`
        CREATE TABLE IF NOT EXISTS islemler (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tur TEXT, urun_adi TEXT, tutar REAL, odeme_yontemi TEXT,
            tarih DATETIME DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS aktif_masalar (
            masa_id INTEGER PRIMARY KEY,
            bitis_zamani TEXT,
            toplam_borc REAL,
            urunler TEXT,
            odeme_alindi INTEGER DEFAULT 0
        );
    `);
    console.log("Veritabanı hazır: " + dbPath);
})();

// Masayı Kaydet/Güncelle
app.post('/api/masa-kaydet', async (req, res) => {
    const { id, bitis, borc, urunler, odemeAlindi } = req.body;
    await db.run(
        "INSERT OR REPLACE INTO aktif_masalar (masa_id, bitis_zamani, toplam_borc, urunler, odeme_alindi) VALUES (?, ?, ?, ?, ?)",
        [id, bitis, borc, JSON.stringify(urunler), odemeAlindi ? 1 : 0]
    );
    res.json({ success: true });
});

// Masayı Sil (Sıfırla)
app.post('/api/masa-sil', async (req, res) => {
    await db.run("DELETE FROM aktif_masalar WHERE masa_id = ?", [req.body.id]);
    res.json({ success: true });
});

// Aktif Masaları Getir
app.get('/api/aktif-masalar', async (req, res) => {
    const masalar = await db.all("SELECT * FROM aktif_masalar");
    res.json(masalar);
});

// Raporlar ve İşlem Ekleme (Aynı kalıyor)
app.post('/api/islem-ekle', async (req, res) => {
    const { tur, urun_adi, tutar, odeme_yontemi } = req.body;
    await db.run('INSERT INTO islemler (tur, urun_adi, tutar, odeme_yontemi) VALUES (?, ?, ?, ?)', [tur, urun_adi, tutar, odeme_yontemi]);
    res.json({ success: true });
});

app.get('/api/rapor', async (req, res) => {
    const { baslangic, bitis } = req.query;
    const veriler = await db.all(`SELECT *, strftime('%H:%M', tarih) as saat FROM islemler WHERE date(tarih) BETWEEN ? AND ? ORDER BY tarih DESC`, [baslangic, bitis]);
    res.json(veriler);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Sunucu ${PORT} portunda aktif.`));
