const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const app = express();

app.use(express.json());
app.use(express.static('public'));

let db;

(async () => {
    db = await open({
        filename: './vr_kafe.db',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS islemler (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tur TEXT,
            urun_adi TEXT,
            tutar REAL,
            odeme_yontemi TEXT,
            tarih DATETIME DEFAULT (datetime('now','localtime'))
        )
    `);
    console.log("Veritabanı bağlantısı kuruldu.");
})();

app.post('/api/islem-ekle', async (req, res) => {
    const { tur, urun_adi, tutar, odeme_yontemi } = req.body;
    try {
        await db.run(
            'INSERT INTO islemler (tur, urun_adi, tutar, odeme_yontemi) VALUES (?, ?, ?, ?)', 
            [tur, urun_adi, tutar, odeme_yontemi]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/rapor', async (req, res) => {
    const { baslangic, bitis } = req.query;
    try {
        const veriler = await db.all(
            `SELECT *, strftime('%H:%M', tarih) as saat FROM islemler 
             WHERE date(tarih) BETWEEN ? AND ? ORDER BY tarih DESC`, 
            [baslangic, bitis]
        );
        res.json(veriler);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log("Sistem aktif: http://localhost:3000"));