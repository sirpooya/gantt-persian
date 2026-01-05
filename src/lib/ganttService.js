import { supabase } from './supabase.js';

const STORAGE_BUCKET = 'gantt-data';
const JSON_FILE = 'gantt-data.json';

/**
 * Load Gantt data from Supabase Storage (JSON file)
 * @returns {Promise<{tasks: Array, links: Array}>}
 */
export async function loadGanttData() {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(JSON_FILE);

    if (error) {
      // File doesn't exist yet, return empty structure
      if (error.statusCode === '404' || error.message?.includes('not found') || error.statusCode === 404) {
        console.log('No Gantt data file found in Supabase Storage, using empty structure');
        return { tasks: [], links: [] };
      }
      console.warn('Supabase Storage error (non-fatal):', error);
      return { tasks: [], links: [] };
    }

    if (!data) {
      return { tasks: [], links: [] };
    }

    // Parse the JSON file
    const text = await data.text();
    const parsed = JSON.parse(text);
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      links: Array.isArray(parsed.links) ? parsed.links : [],
    };
  } catch (error) {
    console.error('Error loading Gantt data from Supabase Storage:', error);
    // Always return empty structure instead of crashing
    return { tasks: [], links: [] };
  }
}

/**
 * Save Gantt data to Supabase Storage (JSON file)
 * @param {Object} ganttData - {tasks: Array, links: Array}
 * @returns {Promise<boolean>}
 */
export async function saveGanttData(ganttData) {
  try {
    const jsonString = JSON.stringify(
      {
        tasks: Array.isArray(ganttData.tasks) ? ganttData.tasks : [],
        links: Array.isArray(ganttData.links) ? ganttData.links : [],
      },
      null,
      2
    );

    // Upload/overwrite the JSON file
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(JSON_FILE, jsonString, {
        contentType: 'application/json',
        upsert: true, // Overwrite if exists
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving Gantt data to Supabase Storage:', error);
    return false;
  }
}

