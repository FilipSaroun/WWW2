const express = require('express'); 
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

// Cesta k databázi
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Tabulky ────────────────────────────────────────────────────
// 1) users
db.run(
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT
  )`,
  err => {
    if (err) console.error("Chyba při vytváření tabulky users:", err.message);
    else console.log("Tabulka users je připravena.");
  }
);

// 2) favorites - přidán sloupec cover pro obrázek
db.run(
  `CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    cover TEXT,
    UNIQUE(user_id, title)
  )`,
  err => {
    if (err) console.error("Chyba při vytváření tabulky favorites:", err.message);
    else console.log("Tabulka favorites je připravena.");
  }
);

// 3) Unikátní index (pro jistotu)
db.run(
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_favorite ON favorites(user_id, title)`
);

// ─── Testovací uživatel a písničky ─────────────────────────────
const testEmail = 'test@test.com';
const testPassword = '1234';

db.run(
  `INSERT OR IGNORE INTO users (email, password) VALUES (?, ?)`,
  [testEmail, testPassword],
  err => {
    if (err) {
      console.error("Chyba při vkládání testovacího uživatele:", err.message);
    } else {
      console.log("Testovací uživatel přidán nebo již existuje.");

      // Vložení oblíbených písniček s cover URL
      const songs = [
        { title: "444 – Lithe", cover: "https://a5.mzstatic.com/us/r1000/0/Music211/v4/98/6b/15/986b15e2-104c-59c5-0e74-dee875374212/5034644555775.jpg" },
        { title: "KOD – J.cole", cover: "https://a5.mzstatic.com/us/r1000/0/Music116/v4/04/f4/a2/04f4a2ca-81d1-a258-0c70-ee555840bc15/18UMGIM22943.rgb.jpg" },
        { title: "Freaky Girl – Gucci Mane", cover: "https://a5.mzstatic.com/us/r1000/0/Music115/v4/3c/7e/8d/3c7e8d4c-5362-bf82-dcf7-f6c5b61f08ef/Cover.jpg" },
        { title: "Green Juice – A$AP Ferg (feat. Pharrell Williams)", cover: "https://a5.mzstatic.com/us/r1000/0/Music126/v4/b3/a9/ca/b3a9ca04-19b0-4710-cd73-a25570cb7f1a/886449666294.jpg" },
        { title: "Back to Back – Young Dolph & Paper Route Empire", cover: "https://a5.mzstatic.com/us/r1000/0/Music115/v4/fd/39/d2/fd39d2d3-103c-e604-57ef-d4f9330860b3/194690563744_cover.jpg" },
        { title: "Sunshine – Alice In Chains", cover: "https://a5.mzstatic.com/us/r1000/0/Music114/v4/bb/00/db/bb00dbb6-f8fd-af14-6972-cd111a96e27a/888880462077.jpg" },
        { title: "The Box – Roddy Rich", cover: "https://a5.mzstatic.com/us/r1000/0/Music114/v4/9c/e1/28/9ce128ee-fc1a-94f7-34fd-e0538a848964/075679829085.jpg" },
        { title: "Yamborghini High – A$AP Mob", cover: "https://a5.mzstatic.com/us/r1000/0/Music115/v4/a2/c6/b3/a2c6b37a-b2eb-a56e-c585-28772cd74f0a/886446189048.jpg" },
        { title: "New Level REMIX – A$AP Ferg", cover: "https://a5.mzstatic.com/us/r1000/0/Music19/v4/99/19/a7/9919a7b3-3378-3916-f3a6-b4eff83ef1e5/886446096889.jpg" },
        { title: "Superhero – Metro Boomin", cover: "https://a5.mzstatic.com/us/r1000/0/Music112/v4/c3/ef/1d/c3ef1dfc-e1f5-e885-8be7-f3155581ddf8/22UM1IM40165.rgb.jpg" }
      ];

      songs.forEach(song => {
        db.run(
          `INSERT OR IGNORE INTO favorites (user_id, title, cover) VALUES (?, ?, ?)`,
          [1, song.title, song.cover],
          err => {
            if (err) {
              console.error("Chyba při vkládání písničky:", song.title, err.message);
            }
          }
        );
      });
    }
  }
);

// ─── Login endpoint (redirect) ─────────────────────────────────
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get(
    `SELECT * FROM users WHERE email = ? AND password = ?`,
    [email, password],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Server error.");
      }
      if (row) {
        return res.redirect('/favorites.html');
      } else {
        return res.redirect('/account.html');
      }
    }
  );
});

// ─── API pro Favorites ──────────────────────────────────────────
// GET /api/favorites vrací i cover obrázky
app.get('/api/favorites', (req, res) => {
  db.all(
    `SELECT id, title, cover FROM favorites WHERE user_id = ?`,
    [1],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json([]);
      }
      res.json(rows);
    }
  );
});

// POST /api/favorites
app.post('/api/favorites', (req, res) => {
  const { title, cover } = req.body;
  db.run(
    `INSERT OR IGNORE INTO favorites (user_id, title, cover) VALUES (?, ?, ?)`,
    [1, title, cover],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Cannot add favorite" });
      }
      if (this.changes === 0) {
        return res.status(200).json({ message: "Already exists" });
      }
      res.json({ id: this.lastID, title, cover });
    }
  );
});

// DELETE /api/favorites/:id
app.delete('/api/favorites/:id', (req, res) => {
  const id = req.params.id;
  db.run(
    `DELETE FROM favorites WHERE id = ?`,
    [id],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Cannot delete favorite" });
      }
      res.sendStatus(204);
    }
  );
});

// ─── Start serveru ─────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server běží na http://localhost:${PORT}`);
});
