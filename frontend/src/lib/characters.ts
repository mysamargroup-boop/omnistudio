import { ARCHETYPES } from '@/components/video/CharacterStudioModal';
import { api } from '@/lib/api';

export interface CharacterData {
  id: string;
  name: string;
  tagline: string;
  description: string;
  prompt: string;
  imageUrl?: string;
  isLocked: boolean;
  createdAt?: string;
  category?: 'archetype' | 'custom';
  tags?: string[];
}

const STORAGE_KEY = 'omnistudio_characters';
const ACTIVE_CHAR_KEY = 'omnistudio_active_character';

export function getStoredCharacters(): CharacterData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed default archetypes as base characters
      const seeded: CharacterData[] = ARCHETYPES.map((a) => ({
        id: a.id,
        name: a.name,
        tagline: 'Base Archetype',
        description: a.description,
        prompt: a.prompt,
        imageUrl: a.avatar,
        isLocked: false,
        category: 'archetype',
        createdAt: new Date().toISOString(),
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      // Background sync from database
      fetchCharactersAsync();
      return seeded;
    }
    const parsed = JSON.parse(raw);
    // Background sync from database to make sure new characters from DB are loaded
    fetchCharactersAsync();
    return parsed;
  } catch (e) {
    console.warn('Failed to read characters from storage:', e);
    return [];
  }
}

export async function fetchCharactersAsync(): Promise<CharacterData[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await api.getCharacters();
    if (res && res.success && Array.isArray(res.characters) && res.characters.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.characters));
      window.dispatchEvent(new CustomEvent('omnistudio:characters_updated', { detail: res.characters }));
      return res.characters;
    }
  } catch (e) {
    // Silently fall back to cached local storage
  }
  return [];
}

export function saveCharacter(character: CharacterData): CharacterData[] {
  if (typeof window === 'undefined') return [];
  try {
    const list = getStoredCharacters();
    const existingIndex = list.findIndex((c) => c.id === character.id);
    let updated: CharacterData[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = { ...updated[existingIndex], ...character };
    } else {
      updated = [character, ...list];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('omnistudio:characters_updated', { detail: updated }));

    // Persist to backend database asynchronously
    api.saveCharacter({
      id: character.id,
      name: character.name,
      tagline: character.tagline || '',
      description: character.description || '',
      prompt: character.prompt,
      imageUrl: character.imageUrl,
      isLocked: character.isLocked,
      category: character.category || 'custom',
      tags: character.tags || []
    }).catch((err) => {
      console.warn('Background database save error for character:', err);
    });

    return updated;
  } catch (e) {
    console.warn('Failed to save character:', e);
    return [];
  }
}

export function deleteCharacter(id: string): CharacterData[] {
  if (typeof window === 'undefined') return [];
  try {
    const list = getStoredCharacters();
    const updated = list.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    // If active character was deleted, unset it
    const active = getActiveCharacter();
    if (active?.id === id) {
      setActiveCharacter(null);
    }
    
    window.dispatchEvent(new CustomEvent('omnistudio:characters_updated', { detail: updated }));

    // Persist delete to backend database
    api.deleteCharacter(id).catch((err) => {
      console.warn('Background database delete error for character:', err);
    });

    return updated;
  } catch (e) {
    console.warn('Failed to delete character:', e);
    return [];
  }
}

export function getActiveCharacter(): CharacterData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_CHAR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function fetchActiveCharacterAsync(): Promise<CharacterData | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await api.getActiveCharacter();
    if (res && res.success) {
      if (res.character) {
        localStorage.setItem(ACTIVE_CHAR_KEY, JSON.stringify({ ...res.character, isLocked: true }));
      } else {
        localStorage.removeItem(ACTIVE_CHAR_KEY);
      }
      window.dispatchEvent(new CustomEvent('omnistudio:active_character_updated', { detail: res.character || null }));
      return res.character || null;
    }
  } catch (e) {
    // fallback to localStorage
  }
  return getActiveCharacter();
}

export function setActiveCharacter(char: CharacterData | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (char) {
      const activeData = { ...char, isLocked: true };
      localStorage.setItem(ACTIVE_CHAR_KEY, JSON.stringify(activeData));
      window.dispatchEvent(new CustomEvent('omnistudio:active_character_updated', { detail: activeData }));
      
      // Persist active locked character to backend database
      api.setActiveCharacter(activeData).catch((err) => {
        console.warn('Failed to persist active character to database:', err);
      });
    } else {
      localStorage.removeItem(ACTIVE_CHAR_KEY);
      window.dispatchEvent(new CustomEvent('omnistudio:active_character_updated', { detail: null }));
      
      // Clear active character from backend database
      api.setActiveCharacter(null).catch((err) => {
        console.warn('Failed to clear active character in database:', err);
      });
    }
  } catch (e) {
    console.warn('Failed to set active character:', e);
  }
}
