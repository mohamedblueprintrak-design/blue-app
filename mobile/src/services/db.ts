import * as SQLite from 'expo-sqlite';

export interface CachedProject {
  id: string;
  name: string;
  location: string;
  status: string;
  progress: number;
}

export interface OfflineSiteVisit {
  id: string;
  projectId: string;
  visitDate: string;
  latitude: number;
  longitude: number;
  inspectorName: string;
  notes: string;
  photoUri: string | null;
  synced: number; // 0 = false, 1 = true
}

let db: SQLite.SQLiteDatabase | null = null;

export async function getDbConnection() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('blueprint_offline.db');
    
    // Initialize database tables
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_projects (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT NOT NULL,
        progress REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS offline_site_visits (
        id TEXT PRIMARY KEY NOT NULL,
        projectId TEXT NOT NULL,
        visitDate TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        inspectorName TEXT NOT NULL,
        notes TEXT NOT NULL,
        photoUri TEXT,
        synced INTEGER DEFAULT 0
      );
    `);
  }
  return db;
}

// Caching functions for projects
export async function cacheProjects(projects: CachedProject[]) {
  const database = await getDbConnection();
  
  // Clear old cache
  await database.runAsync('DELETE FROM cached_projects');
  
  // Cache new projects
  for (const project of projects) {
    await database.runAsync(
      'INSERT INTO cached_projects (id, name, location, status, progress) VALUES (?, ?, ?, ?, ?)',
      [project.id, project.name, project.location, project.status, project.progress]
    );
  }
}

export async function getCachedProjects(): Promise<CachedProject[]> {
  const database = await getDbConnection();
  const rows = await database.getAllAsync<CachedProject>('SELECT * FROM cached_projects');
  return rows;
}

// Offline site visits actions
export async function saveOfflineSiteVisit(visit: Omit<OfflineSiteVisit, 'synced'>) {
  const database = await getDbConnection();
  await database.runAsync(
    `INSERT INTO offline_site_visits 
      (id, projectId, visitDate, latitude, longitude, inspectorName, notes, photoUri, synced) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      visit.id,
      visit.projectId,
      visit.visitDate,
      visit.latitude,
      visit.longitude,
      visit.inspectorName,
      visit.notes,
      visit.photoUri
    ]
  );
}

export async function getUnsyncedVisits(): Promise<OfflineSiteVisit[]> {
  const database = await getDbConnection();
  const rows = await database.getAllAsync<OfflineSiteVisit>(
    'SELECT * FROM offline_site_visits WHERE synced = 0'
  );
  return rows;
}

export async function markVisitAsSynced(visitId: string) {
  const database = await getDbConnection();
  await database.runAsync(
    'UPDATE offline_site_visits SET synced = 1 WHERE id = ?',
    [visitId]
  );
}
