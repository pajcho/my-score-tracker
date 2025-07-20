import initSqlJs, { Database } from 'sql.js';

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface Score {
  id: number;
  userId: number;
  game: 'Pool' | 'Darts' | 'Ping Pong';
  player1: string;
  player2: string;
  score: string;
  date: string;
  createdAt: string;
}

class DatabaseService {
  private db: Database | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      const SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`,
      });

      // Check if we have an existing database in localStorage
      const existingDb = localStorage.getItem('scoreTrackingDb');
      
      if (existingDb) {
        const uint8Array = new Uint8Array(
          atob(existingDb)
            .split('')
            .map(char => char.charCodeAt(0))
        );
        this.db = new SQL.Database(uint8Array);
      } else {
        this.db = new SQL.Database();
        this.createTables();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private createTables() {
    if (!this.db) return;

    // Create users table
    this.db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create scores table
    this.db.run(`
      CREATE TABLE scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        game TEXT NOT NULL,
        player1 TEXT NOT NULL,
        player2 TEXT NOT NULL,
        score TEXT NOT NULL,
        date DATE NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
      )
    `);

    this.saveToLocalStorage();
  }

  private saveToLocalStorage() {
    if (!this.db) return;
    
    const data = this.db.export();
    const base64 = btoa(String.fromCharCode(...data));
    localStorage.setItem('scoreTrackingDb', base64);
  }

  // User methods
  async createUser(name: string, email: string, password: string): Promise<User> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    try {
      this.db.run(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, password]
      );

      const result = this.db.exec('SELECT * FROM users WHERE email = ?', [email]);
      this.saveToLocalStorage();
      
      const [id, userName, userEmail, userPassword, createdAt] = result[0].values[0];
      return { 
        id: id as number, 
        name: userName as string, 
        email: userEmail as string, 
        password: userPassword as string, 
        createdAt: createdAt as string 
      };
    } catch (error) {
      throw new Error('Email already exists');
    }
  }

  async loginUser(email: string, password: string): Promise<User | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      'SELECT * FROM users WHERE email = ? AND password = ?',
      [email, password]
    );

    if (result.length === 0) return null;
    
    const [id, name, userEmail, userPassword, createdAt] = result[0].values[0];
    return { id: id as number, name: name as string, email: userEmail as string, password: userPassword as string, createdAt: createdAt as string };
  }

  async getUserById(id: number): Promise<User | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec('SELECT * FROM users WHERE id = ?', [id]);
    if (result.length === 0) return null;
    
    const [userId, name, email, password, createdAt] = result[0].values[0];
    return { id: userId as number, name: name as string, email: email as string, password: password as string, createdAt: createdAt as string };
  }

  // Score methods
  async createScore(userId: number, game: string, player1: string, player2: string, score: string, date: string): Promise<Score> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      'INSERT INTO scores (userId, game, player1, player2, score, date) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, game, player1, player2, score, date]
    );

    const result = this.db.exec('SELECT * FROM scores WHERE userId = ? ORDER BY id DESC LIMIT 1', [userId]);
    this.saveToLocalStorage();
    
    const [id, scoreUserId, scoreGame, scorePlayer1, scorePlayer2, scoreScore, scoreDate, createdAt] = result[0].values[0];
    return { 
      id: id as number, 
      userId: scoreUserId as number, 
      game: scoreGame as any, 
      player1: scorePlayer1 as string, 
      player2: scorePlayer2 as string, 
      score: scoreScore as string, 
      date: scoreDate as string, 
      createdAt: createdAt as string 
    };
  }

  async getScoresByUserId(userId: number): Promise<Score[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec('SELECT * FROM scores WHERE userId = ? ORDER BY date DESC, createdAt DESC', [userId]);
    if (result.length === 0) return [];

    return result[0].values.map(row => {
      const [id, scoreUserId, game, player1, player2, score, date, createdAt] = row;
      return {
        id: id as number,
        userId: scoreUserId as number,
        game: game as any,
        player1: player1 as string,
        player2: player2 as string,
        score: score as string,
        date: date as string,
        createdAt: createdAt as string
      };
    });
  }

  async deleteScore(id: number, userId: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('DELETE FROM scores WHERE id = ? AND userId = ?', [id, userId]);
    this.saveToLocalStorage();
  }

  async updateScore(id: number, userId: number, updates: Partial<Score>): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const setClause = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'userId' && key !== 'createdAt')
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.entries(updates)
      .filter(([key]) => key !== 'id' && key !== 'userId' && key !== 'createdAt')
      .map(([, value]) => value);
    
    this.db.run(
      `UPDATE scores SET ${setClause} WHERE id = ? AND userId = ?`,
      [...values, id, userId]
    );
    this.saveToLocalStorage();
  }

  async getUniqueOpponents(userId: number): Promise<string[]> {
    const result = this.db.exec('SELECT DISTINCT player2 FROM scores WHERE userId = ? ORDER BY player2', [userId]);
    
    if (result.length === 0) return [];
    
    return result[0].values.map(row => row[0] as string);
  }
}

export const db = new DatabaseService();