<script setup lang="ts">
import { ref, computed } from 'vue';
import { useFEAStore } from '../store/fea';
import type { SectionProfile, ApplyTarget } from '../types';

const store = useFEAStore();

const searchQuery = ref('');
const showAddModal = ref(false);
const showEditModal = ref(false);
const editingProfile = ref<SectionProfile | null>(null);
const showApplyMenu = ref<string | null>(null);

const filteredProfiles = computed(() => {
  if (!searchQuery.value.trim()) return store.sectionProfiles;
  const q = searchQuery.value.toLowerCase();
  return store.sectionProfiles.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.material.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
  );
});

const newProfile = ref({
  name: '',
  area: 0.001,
  youngsModulus: 200e9,
  material: '',
  description: '',
});

const editForm = ref({
  name: '',
  area: 0,
  youngsModulus: 0,
  material: '',
  description: '',
});

function openAddModal() {
  newProfile.value = {
    name: '',
    area: 0.001,
    youngsModulus: 200e9,
    material: '',
    description: '',
  };
  showAddModal.value = true;
}

function openEditModal(profile: SectionProfile) {
  editingProfile.value = profile;
  editForm.value = {
    name: profile.name,
    area: profile.area,
    youngsModulus: profile.youngsModulus,
    material: profile.material,
    description: profile.description || '',
  };
  showEditModal.value = true;
}

function handleAdd() {
  if (!newProfile.value.name.trim() || !newProfile.value.material.trim()) return;
  store.addSectionProfile({
    name: newProfile.value.name.trim(),
    area: newProfile.value.area,
    youngsModulus: newProfile.value.youngsModulus,
    material: newProfile.value.material.trim(),
    description: newProfile.value.description.trim() || undefined,
  });
  showAddModal.value = false;
}

function handleEdit() {
  if (!editingProfile.value) return;
  store.updateSectionProfile(editingProfile.value.id, {
    name: editForm.value.name.trim(),
    area: editForm.value.area,
    youngsModulus: editForm.value.youngsModulus,
    material: editForm.value.material.trim(),
    description: editForm.value.description.trim() || undefined,
  });
  showEditModal.value = false;
  editingProfile.value = null;
}

function handleDelete(id: string) {
  if (confirm('确定要删除这个截面参数吗？')) {
    store.deleteSectionProfile(id);
  }
}

function handleApply(profileId: string, target: ApplyTarget) {
  store.applyProfile(profileId, target);
  showApplyMenu.value = null;
}

function handleExport() {
  const data = store.exportProfiles();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `section-profiles-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const count = store.importProfiles(content);
      alert(`成功导入 ${count} 个截面参数`);
    };
    reader.readAsText(file);
  };
  input.click();
}

function handleReset() {
  if (confirm('确定要重置为默认截面参数吗？这将清除所有自定义参数。')) {
    store.resetDefaultProfiles();
  }
}

function saveFromSelected() {
  if (store.selectedElement === null) {
    alert('请先在画布上选择一个单元');
    return;
  }
  const name = prompt('请输入截面参数名称：');
  if (!name) return;
  const material = prompt('请输入材料名称：', '自定义材料');
  if (!material) return;
  const description = prompt('请输入描述（可选）：') || undefined;
  const result = store.saveCurrentElementAsProfile(name, material, description);
  if (result) {
    alert('已保存到截面参数库');
  }
}

function formatArea(area: number): string {
  return (area * 1e6).toFixed(0);
}

function formatE(e: number): string {
  return (e / 1e9).toFixed(0);
}
</script>

<template>
  <div class="bg-slate-800 rounded-lg p-4 space-y-3">
    <div class="flex items-center justify-between border-b border-slate-700 pb-2">
      <h3 class="text-sm font-bold text-slate-200">📚 截面参数库</h3>
      <span class="text-[10px] text-slate-500">{{ store.sectionProfiles.length }} 个预设</span>
    </div>

    <div class="flex gap-1.5">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索截面..."
        class="flex-1 px-2 py-1.5 rounded text-xs bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
      />
    </div>

    <div class="grid grid-cols-2 gap-1.5">
      <button
        @click="openAddModal"
        class="py-1.5 rounded text-[10px] font-medium bg-sky-700 text-white hover:bg-sky-600 transition"
      >
        ＋ 新建
      </button>
      <button
        @click="saveFromSelected"
        :disabled="store.selectedElement === null"
        :class="store.selectedElement === null ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-700 text-white hover:bg-emerald-600'"
        class="py-1.5 rounded text-[10px] font-medium transition"
      >
        ↓ 保存选中单元
      </button>
    </div>

    <div class="grid grid-cols-3 gap-1.5">
      <button
        @click="handleImport"
        class="py-1 rounded text-[10px] font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
      >
        导入
      </button>
      <button
        @click="handleExport"
        class="py-1 rounded text-[10px] font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
      >
        导出
      </button>
      <button
        @click="handleReset"
        class="py-1 rounded text-[10px] font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
      >
        重置
      </button>
    </div>

    <div class="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
      <div
        v-for="profile in filteredProfiles"
        :key="profile.id"
        class="bg-slate-900 rounded p-2 border border-slate-700 hover:border-sky-600 transition group"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="text-xs font-semibold text-slate-200 truncate">
              {{ profile.name }}
            </div>
            <div class="text-[10px] text-sky-400 mt-0.5">
              {{ profile.material }}
            </div>
          </div>
          <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
            <button
              @click="openEditModal(profile)"
              class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-sky-400"
              title="编辑"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button
              @click="store.duplicateSectionProfile(profile.id)"
              class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-emerald-400"
              title="复制"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </button>
            <button
              @click="handleDelete(profile.id)"
              class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400"
              title="删除"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-1 mt-1.5">
          <div class="text-[10px]">
            <span class="text-slate-500">面积:</span>
            <span class="text-slate-300 font-mono ml-1">{{ formatArea(profile.area) }} mm²</span>
          </div>
          <div class="text-[10px]">
            <span class="text-slate-500">弹性模量:</span>
            <span class="text-slate-300 font-mono ml-1">{{ formatE(profile.youngsModulus) }} GPa</span>
          </div>
        </div>

        <div v-if="profile.description" class="text-[10px] text-slate-500 mt-1 line-clamp-1">
          {{ profile.description }}
        </div>

        <div class="relative mt-2">
          <button
            @click="showApplyMenu = showApplyMenu === profile.id ? null : profile.id"
            class="w-full py-1 rounded text-[10px] font-bold bg-purple-700 text-white hover:bg-purple-600 transition"
          >
            ⚡ 套用参数
          </button>
          <div
            v-if="showApplyMenu === profile.id"
            class="absolute z-20 right-0 top-full mt-1 bg-slate-950 border border-slate-700 rounded-lg shadow-xl overflow-hidden min-w-[140px]"
          >
            <button
              @click="handleApply(profile.id, 'selected')"
              :disabled="store.selectedElement === null"
              :class="store.selectedElement === null ? 'text-slate-600 cursor-not-allowed' : 'hover:bg-slate-800 text-slate-200'"
              class="w-full px-3 py-1.5 text-[10px] text-left transition flex items-center gap-2"
            >
              <span>●</span> 仅选中单元
            </button>
            <button
              @click="handleApply(profile.id, 'all')"
              class="w-full px-3 py-1.5 text-[10px] text-left hover:bg-slate-800 text-slate-200 transition flex items-center gap-2"
            >
              <span>◉</span> 全部单元
            </button>
            <button
              @click="handleApply(profile.id, 'same-material')"
              class="w-full px-3 py-1.5 text-[10px] text-left hover:bg-slate-800 text-slate-200 transition flex items-center gap-2"
            >
              <span>◎</span> 相同材料单元
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredProfiles.length === 0" class="text-center py-6 text-xs text-slate-500">
        {{ searchQuery ? '未找到匹配的截面参数' : '暂无截面参数' }}
      </div>
    </div>

    <div
      v-if="showApplyMenu"
      @click="showApplyMenu = null"
      class="fixed inset-0 z-10"
    />
  </div>

  <!-- Add Modal -->
  <div
    v-if="showAddModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    @click.self="showAddModal = false"
  >
    <div class="bg-slate-800 rounded-xl p-5 w-[340px] border border-slate-700 shadow-2xl">
      <h4 class="text-sm font-bold text-slate-200 mb-4">新建截面参数</h4>
      <div class="space-y-3">
        <div>
          <label class="text-[10px] text-slate-400 block mb-1">名称 *</label>
          <input
            v-model="newProfile.name"
            type="text"
            placeholder="如：Q235钢 - 标准截面"
            class="w-full px-2.5 py-1.5 rounded text-xs bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div>
          <label class="text-[10px] text-slate-400 block mb-1">材料 *</label>
          <input
            v-model="newProfile.material"
            type="text"
            placeholder="如：Q235钢、铝合金6061"
            class="w-full px-2.5 py-1.5 rounded text-xs bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[10px] text-slate-400 block mb-1">截面积 (mm²)</label>
            <input
              :value="(newProfile.area * 1e6).toFixed(0)"
              @input="newProfile.area = Number(($event.target as HTMLInputElement).value) / 1e6"
              type="number"
              step="1"
              min="0"
              class="w-full px-2.5 py-1.5 rounded text-xs bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label class="text-[10px] text-slate-400 block mb-1">弹性模量 (GPa)</label>
            <input
              :value="(newProfile.youngsModulus / 1e9).toFixed(0)"
              @input="newProfile.youngsModulus = Number(($event.target as HTMLInputElement).value) * 1e9"
              type="number"
              step="1"
              min="0"
              class="w-full px-2.5 py-1.5 rounded text-xs bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
        <div>
          <label class="text-[10px] text-slate-400 block mb-1">描述</label>
          <textarea
            v-model="newProfile.description"
            rows="2"
            placeholder="可选的备注信息"
            class="w-full px-2.5 py-1.5 rounded text-xs bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
          />
        </div>
      </div>
      <div class="flex gap-2 mt-5">
        <button
          @click="showAddModal = false"
          class="flex-1 py-2 rounded text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
        >
          取消
        </button>
        <button
          @click="handleAdd"
          :disabled="!newProfile.name.trim() || !newProfile.material.trim()"
          :class="!newProfile.name.trim() || !newProfile.material.trim() ? 'bg-sky-800 text-sky-500 cursor-not-allowed' : 'bg-sky-600 text-white hover:bg-sky-500'"
          class="flex-1 py-2 rounded text-xs font-bold transition"
        >
          创建
        </button>
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <div
    v-if="showEditModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    @click.self="showEditModal = false"
  >
    <div class="bg-slate-800 rounded-xl p-5 w-[340px] border border-slate-700 shadow-2xl">
      <h4 class="text-sm font-bold text-slate-200 mb-4">编辑截面参数</h4>
      <div class="space-y-3">
        <div>
          <label class="text-[10px] text-slate-400 block mb-1">名称 *</label>
          <input
            v-model="editForm.name"
            type="text"
            class="w-full px-2.5 py-1.5 rounded text-xs bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div>
          <label class="text-[10px] text-slate-400 block mb-1">材料 *</label>
          <input
            v-model="editForm.material"
            type="text"
            class="w-full px-2.5 py-1.5 rounded text-xs bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[10px] text-slate-400 block mb-1">截面积 (mm²)</label>
            <input
              :value="(editForm.area * 1e6).toFixed(0)"
              @input="editForm.area = Number(($event.target as HTMLInputElement).value) / 1e6"
              type="number"
              step="1"
              min="0"
              class="w-full px-2.5 py-1.5 rounded text-xs bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label class="text-[10px] text-slate-400 block mb-1">弹性模量 (GPa)</label>
            <input
              :value="(editForm.youngsModulus / 1e9).toFixed(0)"
              @input="editForm.youngsModulus = Number(($event.target as HTMLInputElement).value) * 1e9"
              type="number"
              step="1"
              min="0"
              class="w-full px-2.5 py-1.5 rounded text-xs bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
        <div>
          <label class="text-[10px] text-slate-400 block mb-1">描述</label>
          <textarea
            v-model="editForm.description"
            rows="2"
            class="w-full px-2.5 py-1.5 rounded text-xs bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
          />
        </div>
      </div>
      <div class="flex gap-2 mt-5">
        <button
          @click="showEditModal = false; editingProfile = null"
          class="flex-1 py-2 rounded text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
        >
          取消
        </button>
        <button
          @click="handleEdit"
          :disabled="!editForm.name.trim() || !editForm.material.trim()"
          :class="!editForm.name.trim() || !editForm.material.trim() ? 'bg-sky-800 text-sky-500 cursor-not-allowed' : 'bg-sky-600 text-white hover:bg-sky-500'"
          class="flex-1 py-2 rounded text-xs font-bold transition"
        >
          保存
        </button>
      </div>
    </div>
  </div>
</template>
