import { ARCHETYPES } from '@/components/video/CharacterStudioModal';

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
      return seeded;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to read characters from storage:', e);
    return [];
  }
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

export function setActiveCharacter(char: CharacterData | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (char) {
      localStorage.setItem(ACTIVE_CHAR_KEY, JSON.stringify({ ...char, isLocked: true }));
    } else {
      localStorage.removeItem(ACTIVE_CHAR_KEY);
    }
    window.dispatchEvent(new CustomEvent('omnistudio:active_character_updated', { detail: char }));
  } catch (e) {
    console.warn('Failed to set active character:', e);
  }
}
