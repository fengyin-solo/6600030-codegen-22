import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { FEAModel, FEAResult, SectionProfile, ApplyTarget } from '../types';
import {
  solve as feaSolve,
  presetCantileverBeam,
  presetBridgeTruss,
  presetSimpleFrame,
  jetColormap,
} from '../utils/fea-solver';

const STORAGE_KEY = 'fea-section-profiles';

function generateId(): string {
  return 'profile_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function loadFromStorage(): SectionProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return getDefaultProfiles();
}

function getDefaultProfiles(): SectionProfile[] {
  const now = Date.now();
  return [
    {
      id: generateId(),
      name: 'Q235钢 - 标准截面',
      area: 0.001,
      youngsModulus: 200e9,
      material: 'Q235钢',
      description: '普通碳素结构钢，常用截面1000mm²',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Q345钢 - 大截面',
      area: 0.0025,
      youngsModulus: 206e9,
      material: 'Q345钢',
      description: '低合金高强度钢，截面2500mm²',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: '铝合金 6061',
      area: 0.0008,
      youngsModulus: 70e9,
      material: '铝合金6061',
      description: '轻质铝合金，截面800mm²',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: '不锈钢 304',
      area: 0.0012,
      youngsModulus: 193e9,
      material: '304不锈钢',
      description: '奥氏体不锈钢，截面1200mm²',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: '木材（松木）',
      area: 0.01,
      youngsModulus: 10e9,
      material: '松木',
      description: '结构用松木，截面10000mm²（100x100mm）',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export const useFEAStore = defineStore('fea', () => {
  const model = ref<FEAModel>({ nodes: [], elements: [], loads: [] });
  const result = ref<FEAResult | null>(null);
  const selectedPreset = ref<string>('cantilever');
  const showDeformed = ref(false);
  const deformationScale = ref(10);
  const selectedElement = ref<number | null>(null);
  const heatmapMode = ref<'stress' | 'strain' | 'force'>('stress');

  const sectionProfiles = ref<SectionProfile[]>(loadFromStorage());

  watch(
    sectionProfiles,
    (val) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
    },
    { deep: true }
  );

  // ─── Actions ──────────────────────────────────────────────────────────────
  function loadPreset(name: string) {
    selectedPreset.value = name;
    result.value = null;
    selectedElement.value = null;
    switch (name) {
      case 'cantilever':
        model.value = presetCantileverBeam();
        break;
      case 'bridge':
        model.value = presetBridgeTruss();
        break;
      case 'frame':
        model.value = presetSimpleFrame();
        break;
      default:
        model.value = presetCantileverBeam();
    }
  }

  function solve() {
    result.value = feaSolve(model.value);
  }

  function toggleDeformed() {
    showDeformed.value = !showDeformed.value;
  }

  function selectElement(id: number | null) {
    selectedElement.value = id;
  }

  function setHeatmapMode(mode: 'stress' | 'strain' | 'force') {
    heatmapMode.value = mode;
  }

  function addLoad(nodeId: number, fx: number, fy: number) {
    model.value.loads.push({ nodeId, fx, fy });
  }

  function toggleFixed(nodeId: number) {
    const node = model.value.nodes.find((n) => n.id === nodeId);
    if (node) node.fixed = !node.fixed;
  }

  function addSectionProfile(data: Omit<SectionProfile, 'id' | 'createdAt' | 'updatedAt'>): SectionProfile {
    const now = Date.now();
    const profile: SectionProfile = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    sectionProfiles.value.push(profile);
    return profile;
  }

  function updateSectionProfile(id: string, data: Partial<Omit<SectionProfile, 'id' | 'createdAt'>>) {
    const idx = sectionProfiles.value.findIndex((p) => p.id === id);
    if (idx !== -1) {
      sectionProfiles.value[idx] = {
        ...sectionProfiles.value[idx],
        ...data,
        updatedAt: Date.now(),
      };
    }
  }

  function deleteSectionProfile(id: string) {
    const idx = sectionProfiles.value.findIndex((p) => p.id === id);
    if (idx !== -1) {
      sectionProfiles.value.splice(idx, 1);
    }
  }

  function duplicateSectionProfile(id: string): SectionProfile | null {
    const profile = sectionProfiles.value.find((p) => p.id === id);
    if (!profile) return null;
    const now = Date.now();
    const copy: SectionProfile = {
      ...profile,
      id: generateId(),
      name: profile.name + ' (副本)',
      createdAt: now,
      updatedAt: now,
    };
    sectionProfiles.value.push(copy);
    return copy;
  }

  function applyProfileToElement(profileId: string, elementId: number) {
    const profile = sectionProfiles.value.find((p) => p.id === profileId);
    const element = model.value.elements.find((e) => e.id === elementId);
    if (profile && element) {
      element.area = profile.area;
      element.youngsModulus = profile.youngsModulus;
      result.value = null;
    }
  }

  function applyProfile(profileId: string, target: ApplyTarget) {
    const profile = sectionProfiles.value.find((p) => p.id === profileId);
    if (!profile) return;

    let count = 0;
    for (const el of model.value.elements) {
      let shouldApply = false;
      switch (target) {
        case 'selected':
          shouldApply = el.id === selectedElement.value;
          break;
        case 'all':
          shouldApply = true;
          break;
        case 'same-material':
          shouldApply = Math.abs(el.youngsModulus - profile.youngsModulus) < 1e6;
          break;
      }
      if (shouldApply) {
        el.area = profile.area;
        el.youngsModulus = profile.youngsModulus;
        count++;
      }
    }
    if (count > 0) {
      result.value = null;
    }
  }

  function saveCurrentElementAsProfile(name: string, material: string, description?: string): SectionProfile | null {
    if (selectedElement.value === null) return null;
    const el = model.value.elements.find((e) => e.id === selectedElement.value);
    if (!el) return null;
    return addSectionProfile({
      name,
      area: el.area,
      youngsModulus: el.youngsModulus,
      material,
      description,
    });
  }

  function exportProfiles(): string {
    return JSON.stringify(sectionProfiles.value, null, 2);
  }

  function importProfiles(jsonStr: string): number {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) return 0;
      let imported = 0;
      for (const item of parsed) {
        if (
          typeof item.name === 'string' &&
          typeof item.area === 'number' &&
          typeof item.youngsModulus === 'number' &&
          typeof item.material === 'string'
        ) {
          addSectionProfile({
            name: item.name,
            area: item.area,
            youngsModulus: item.youngsModulus,
            material: item.material,
            description: typeof item.description === 'string' ? item.description : undefined,
          });
          imported++;
        }
      }
      return imported;
    } catch {
      return 0;
    }
  }

  function resetDefaultProfiles() {
    sectionProfiles.value = getDefaultProfiles();
  }

  function updateElementSection(elementId: number, area?: number, youngsModulus?: number) {
    const el = model.value.elements.find((e) => e.id === elementId);
    if (!el) return;
    if (area !== undefined) el.area = area;
    if (youngsModulus !== undefined) el.youngsModulus = youngsModulus;
    result.value = null;
  }

  // ─── Computed ─────────────────────────────────────────────────────────────
  const maxStress = computed(() => {
    if (!result.value) return 0;
    return result.value.maxStress;
  });

  const maxDisplacement = computed(() => {
    if (!result.value) return 0;
    return result.value.maxDisplacement;
  });

  const elementColors = computed(() => {
    const colors = new Map<number, string>();
    if (!result.value || model.value.elements.length === 0) {
      for (const el of model.value.elements) {
        colors.set(el.id, '#6b7280');
      }
      return colors;
    }

    let values: number[];
    switch (heatmapMode.value) {
      case 'stress':
        values = result.value.stresses.map(Math.abs);
        break;
      case 'strain':
        values = result.value.strains.map(Math.abs);
        break;
      case 'force':
        values = model.value.elements.map((e) => Math.abs(e.force));
        break;
      default:
        values = result.value.stresses.map(Math.abs);
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    for (let i = 0; i < model.value.elements.length; i++) {
      colors.set(
        model.value.elements[i].id,
        jetColormap(values[i], min, max)
      );
    }
    return colors;
  });

  return {
    model,
    result,
    selectedPreset,
    showDeformed,
    deformationScale,
    selectedElement,
    heatmapMode,
    sectionProfiles,
    maxStress,
    maxDisplacement,
    elementColors,
    loadPreset,
    solve,
    toggleDeformed,
    selectElement,
    setHeatmapMode,
    addLoad,
    toggleFixed,
    addSectionProfile,
    updateSectionProfile,
    deleteSectionProfile,
    duplicateSectionProfile,
    applyProfileToElement,
    applyProfile,
    saveCurrentElementAsProfile,
    exportProfiles,
    importProfiles,
    resetDefaultProfiles,
    updateElementSection,
  };
});
