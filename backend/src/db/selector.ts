// ============================================================================
// AgentHub Backend - Database Selector
// Chooses between in-memory (local dev) and PostgreSQL (production) based on DATABASE_URL
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import type { Database } from '../types';

const usePostgres = !!process.env.DATABASE_URL;

let db: Database | null = null;
let initialized = false;

export async function getDb(): Promise<Database> {
  if (db) return db;

  if (usePostgres) {
    console.log('📦 Using PostgreSQL database');
    const { postgresDb, runMigrations } = await import('./postgres');
    
    if (!initialized) {
      await runMigrations();
      initialized = true;
    }
    
    db = postgresDb;
  } else {
    console.log('💾 Using in-memory database');
    const { memoryDb } = await import('./memory');
    db = memoryDb;
  }

  return db;
}

export function isUsingPostgres(): boolean {
  return usePostgres;
}
