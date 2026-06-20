<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useFEAStore } from '../store/fea';

const store = useFEAStore();

const isEditing = ref(false);
const editArea = ref(0);
const editYoungsModulus = ref(0);
const quickApplyProfile = ref('');

const selectedEl = computed(() => {
  if (store.selectedElement === null) return null;
  return store.model.elements.find((e) => e.id === store.selectedElement) || null;
});

watch(
  () => store.selectedElement,
  () => {
    isEditing.value = false;
    quickApplyProfile.value = '';
  }
);

const node1 = computed(() => {
  if (!selectedEl.value) return null;
  return store.model.nodes.find((n) => n.id === selectedEl.value!.nodeIds[0]) || null;
});

const node2 = computed(() => {
  if (!selectedEl.value) return null;
  return store.model.nodes.find((n) => n.id === selectedEl.value!.nodeIds[1]) || null;
});

const length = computed(() => {
  if (!node1.value || !node2.value) return 0;
  const dx = node2.value.x - node1.value.x;
  const dy = node2.value.y - node1.value.y;
  return Math.sqrt(dx * dx + dy * dy);
});

const angle = computed(() => {
  if (!node1.value || !node2.value) return 0;
  const dx = node2.value.x - node1.value.x;
  const dy = node2.value.y - node1.value.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
});

const color = computed(() => {
  if (store.selectedElement === null) return '#6b7280';
  return store.elementColors.get(store.selectedElement) || '#6b7280';
});

function startEditing() {
  if (!selectedEl.value) return;
  editArea.value = selectedEl.value.area;
  editYoungsModulus.value = selectedEl.value.youngsModulus;
  isEditing.value = true;
}

function saveEditing() {
  if (!selectedEl.value) return;
  store.updateElementSection(selectedEl.value.id, editArea.value, editYoungsModulus.value);
  isEditing.value = false;
}

function cancelEditing() {
  isEditing.value = false;
}

function handleQuickApply() {
  if (!quickApplyProfile.value || store.selectedElement === null) return;
  store.applyProfileToElement(quickApplyProfile.value, store.selectedElement);
  quickApplyProfile.value = '';
}

function formatArea(area: number): string {
  return (area * 1e6).toFixed(0);
}

function formatE(e: number): string {
  return (e / 1e9).toFixed(0);
}
</script>

<template>
  <div class="bg-slate-800 rounded-lg p-4">
    <h3 class="text-sm font-bold text-slate-200 border-b border-slate-700 pb-2 mb-3">
      单元详情
    </h3>

    <div v-if="!selectedEl" class="text-xs text-slate-500 text-center py-6">
      点击一个单元查看详情
    </div>

    <div v-else class="space-y-2 text-xs">
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded" :style="{ backgroundColor: color }" />
          <span class="text-slate-300 font-medium">单元 #{{ selectedEl.id }}</span>
        </div>
        <button
          v-if="!isEditing"
          @click="startEditing"
          class="px-2 py-1 rounded text-[10px] bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
        >
          ✎ 编辑参数
        </button>
        <div v-else class="flex gap-1">
          <button
            @click="saveEditing"
            class="px-2 py-1 rounded text-[10px] bg-emerald-700 text-white hover:bg-emerald-600 transition"
          >
            保存
          </button>
          <button
            @click="cancelEditing"
            class="px-2 py-1 rounded text-[10px] bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
          >
            取消
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="bg-slate-900 rounded p-2">
          <div class="text-slate-400">连接节点</div>
          <div class="text-sm font-mono text-slate-200">
            {{ selectedEl.nodeIds[0] }} → {{ selectedEl.nodeIds[1] }}
          </div>
        </div>
        <div class="bg-slate-900 rounded p-2">
          <div class="text-slate-400">长度 / 角度</div>
          <div class="text-sm font-mono text-slate-200">
            {{ length.toFixed(3) }}m / {{ angle.toFixed(1) }}°
          </div>
        </div>

        <template v-if="!isEditing">
          <div class="bg-slate-900 rounded p-2">
            <div class="text-slate-400">截面积</div>
            <div class="text-sm font-mono text-slate-200">
              {{ formatArea(selectedEl.area) }} mm²
            </div>
          </div>
          <div class="bg-slate-900 rounded p-2">
            <div class="text-slate-400">弹性模量</div>
            <div class="text-sm font-mono text-slate-200">
              {{ formatE(selectedEl.youngsModulus) }} GPa
            </div>
          </div>
        </template>

        <template v-else>
          <div class="bg-slate-900 rounded p-2">
            <div class="text-slate-400 mb-1">截面积 (mm²)</div>
            <input
              :value="(editArea * 1e6).toFixed(0)"
              @input="editArea = Number(($event.target as HTMLInputElement).value) / 1e6"
              type="number"
              step="1"
              min="0"
              class="w-full px-1.5 py-0.5 rounded text-sm font-mono bg-slate-800 border border-slate-600 text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div class="bg-slate-900 rounded p-2">
            <div class="text-slate-400 mb-1">弹性模量 (GPa)</div>
            <input
              :value="(editYoungsModulus / 1e9).toFixed(0)"
              @input="editYoungsModulus = Number(($event.target as HTMLInputElement).value) * 1e9"
              type="number"
              step="1"
              min="0"
              class="w-full px-1.5 py-0.5 rounded text-sm font-mono bg-slate-800 border border-slate-600 text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </template>
      </div>

      <div v-if="!isEditing" class="bg-slate-900 rounded p-2">
        <div class="text-slate-400 mb-1.5">快速套用截面参数</div>
        <div class="flex gap-1.5">
          <select
            v-model="quickApplyProfile"
            class="flex-1 px-2 py-1 rounded text-[11px] bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="">-- 选择预设 --</option>
            <option
              v-for="p in store.sectionProfiles"
              :key="p.id"
              :value="p.id"
            >
              {{ p.name }} ({{ formatArea(p.area) }}mm² / {{ formatE(p.youngsModulus) }}GPa)
            </option>
          </select>
          <button
            @click="handleQuickApply"
            :disabled="!quickApplyProfile"
            :class="!quickApplyProfile ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-purple-700 text-white hover:bg-purple-600'"
            class="px-2.5 py-1 rounded text-[11px] font-medium transition"
          >
            套用
          </button>
        </div>
      </div>

      <div class="border-t border-slate-700 pt-2 mt-2">
        <div class="text-slate-400 mb-1">计算结果</div>
        <div class="grid grid-cols-3 gap-2">
          <div class="bg-slate-900 rounded p-2">
            <div class="text-slate-500 text-[10px]">应力</div>
            <div class="text-sm font-bold" :style="{ color }">
              {{ (selectedEl.stress / 1e6).toFixed(2) }}
              <span class="text-[10px] text-slate-500">MPa</span>
            </div>
          </div>
          <div class="bg-slate-900 rounded p-2">
            <div class="text-slate-500 text-[10px]">应变</div>
            <div class="text-sm font-bold text-sky-400">
              {{ (selectedEl.strain * 100).toFixed(4) }}
              <span class="text-[10px] text-slate-500">%</span>
            </div>
          </div>
          <div class="bg-slate-900 rounded p-2">
            <div class="text-slate-500 text-[10px]">轴力</div>
            <div class="text-sm font-bold text-amber-400">
              {{ (selectedEl.force / 1000).toFixed(2) }}
              <span class="text-[10px] text-slate-500">kN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
