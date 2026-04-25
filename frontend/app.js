const { createApp, ref, onMounted, computed } = Vue;

const App = {
    template: `
        <div class="min-h-screen">
            <nav class="bg-blue-600 text-white p-4 shadow-lg mb-6">
                <div class="container mx-auto flex justify-between items-center">
                    <h1 class="text-2xl font-bold">KLab LIMS Pro</h1>
                    <div class="space-x-4">
                        <button @click="refreshList" :class="{'underline font-bold': currentView === 'list'}" class="hover:text-blue-200 transition">
                            Minták listája
                        </button>
                        <button @click="currentView = 'add'" :class="{'underline font-bold': currentView === 'add'}" class="hover:text-blue-200 transition">
                            Új felvitel
                        </button>
                    </div>
                </div>
            </nav>

            <main class="container mx-auto p-4">
                <div v-if="currentView === 'list'">
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h2 class="text-xl font-semibold text-gray-700">Laboratóriumi minták</h2>
                            
                            <div class="relative w-full md:w-80">
                                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                    🔍
                                </span>
                                <input 
                                    v-model="searchQuery" 
                                    type="text" 
                                    placeholder="Keresés (Hatóanyag, Sarzs, ID)..." 
                                    class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                                >
                            </div>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-gray-50 text-gray-600 uppercase text-xs">
                                        <th class="p-3 border-b">Lab ID</th>
                                        <th class="p-3 border-b">Hatóanyag</th>
                                        <th class="p-3 border-b">Sarzsszám</th>
                                        <th class="p-3 border-b">Státusz</th>
                                        <th class="p-3 border-b text-center">Eredmény rögzítése</th>
                                        <th class="p-3 border-b">Műveletek</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="sample in paginatedSamples" :key="sample._id" class="hover:bg-gray-50 border-b last:border-0 transition">
                                        <td class="p-3 font-mono text-sm">{{ sample.labId }}</td>
                                        <td class="p-3 font-medium">{{ sample.drugName }}</td>
                                        <td class="p-3 text-gray-600 text-sm">{{ sample.batchNumber }}</td>
                                        <td class="p-3">
                                            <span :class="statusBadge(sample.status)" class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                {{ sample.status }}
                                            </span>
                                        </td>
                                        <td class="p-3">
                                            <div v-if="sample.status === 'Pending'" class="flex items-center justify-center space-x-2">
                                                <input 
                                                    v-model.number="sample.tempValue" 
                                                    type="number" 
                                                    step="0.01" 
                                                    placeholder="%" 
                                                    class="w-20 border rounded p-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                >
                                                <button 
                                                    @click="saveResult(sample._id, sample.tempValue)" 
                                                    class="bg-green-500 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-600 shadow-sm transition"
                                                >
                                                    Mentés
                                                </button>
                                            </div>
                                            <div v-else class="text-center font-semibold text-gray-700">
                                                {{ sample.assayValue }} %
                                                <p v-if="sample.oosId" class="text-[10px] text-red-500 font-mono mt-1">{{ sample.oosId }}</p>
                                            </div>
                                        </td>
                                        <td class="p-3">
                                            <button @click="deleteSample(sample._id)" class="text-red-400 hover:text-red-600 transition p-1">
                                                🗑️ Törlés
                                            </button>
                                        </td>
                                    </tr>
                                    <tr v-if="filteredSamples.length === 0">
                                        <td colspan="6" class="p-8 text-center text-gray-500 italic">
                                            Nincs a keresési feltételnek megfelelő minta.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                            <span class="text-sm text-gray-500">
                                Találatok: {{ filteredSamples.length }} / {{ samples.length }} minta
                            </span>
                            <div class="flex items-center space-x-2">
                                <button @click="currentPage--" :disabled="currentPage === 1" 
                                    class="px-4 py-2 bg-gray-100 rounded-md disabled:opacity-30 border hover:bg-gray-200 transition">Előző</button>
                                <span class="px-4 py-2 font-medium text-sm text-gray-700 bg-gray-50 border rounded-md">
                                    {{ currentPage }} / {{ totalPages }}
                                </span>
                                <button @click="currentPage++" :disabled="currentPage === totalPages" 
                                    class="px-4 py-2 bg-gray-100 rounded-md disabled:opacity-30 border hover:bg-gray-200 transition">Következő</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="currentView === 'add'" class="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-xl border border-gray-100">
                    <h2 class="text-2xl font-bold mb-6 text-gray-800">Új minta rögzítése</h2>
                    <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded shadow-sm">
                        <p class="font-bold mb-1">Beviteli hiba!</p>
                        <p>{{ errorMessage }}</p>
                    </div>
                    <form @submit.prevent="submitSample" class="space-y-5">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-1">Hatóanyag neve</label>
                            <input v-model="newSample.drugName" type="text" required class="block w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-1">Sarzsszám (Batch)</label>
                            <input v-model="newSample.batchNumber" type="text" required class="block w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition">
                        </div>
                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-1">Spec. Min (%)</label>
                                <input v-model.number="newSample.specMin" type="number" step="0.1" class="block w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-1">Spec. Max (%)</label>
                                <input v-model.number="newSample.specMax" type="number" step="0.1" class="block w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition">
                            </div>
                        </div>
                        <div class="pt-4">
                            <button type="submit" class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 shadow-lg active:transform active:scale-95 transition">
                                Adatok mentése a rendszerbe
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    `,
    setup() {
        const currentView = ref('list');
        const samples = ref([]);
        const errorMessage = ref('');
        const searchQuery = ref(''); // Keresési szöveg
        const currentPage = ref(1);
        const perPage = 5;

        const newSample = ref({
            drugName: '',
            batchNumber: '',
            specMin: 95.0,
            specMax: 105.0
        });

        // Adatletöltés és tempValue inicializálás
        const fetchSamples = async () => {
            try {
                const res = await fetch('/api/samples');
                const data = await res.json();
                samples.value = data.map(s => {
                    // Megőrizzük a már beírt, de még nem mentett értéket frissítéskor
                    const existing = samples.value.find(old => old._id === s._id);
                    return { 
                        ...s, 
                        tempValue: existing ? existing.tempValue : null 
                    };
                });
            } catch (err) {
                console.error("Fetch hiba:", err);
            }
        };

        // Keresés és váltás a nézetek között
        const refreshList = async () => {
            currentView.value = 'list';
            searchQuery.value = ''; // Keresés alaphelyzetbe állítása
            await fetchSamples();
            currentPage.value = 1;
        };

        const deleteSample = async (id) => {
            if(confirm('Biztosan törlöd ezt a mintát a rendszerből?')) {
                await fetch(`/api/samples/${id}`, { method: 'DELETE' });
                await fetchSamples();
            }
        };

        const submitSample = async () => {
            errorMessage.value = '';
            try {
                const res = await fetch('/api/samples', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newSample.value)
                });
                const data = await res.json();

                if (res.ok) {
                    newSample.value = { drugName: '', batchNumber: '', specMin: 95.0, specMax: 105.0 };
                    currentView.value = 'list';
                    await fetchSamples();
                } else {
                    if (Array.isArray(data.detail)) {
                        errorMessage.value = data.detail.map(e => e.msg).join(", ");
                    } else if (typeof data.detail === 'string') {
                        errorMessage.value = data.detail;
                    } else {
                        errorMessage.value = 'Érvénytelen adatok lettek megadva.';
                    }
                }
            } catch (err) {
                errorMessage.value = 'Hiba történt a hálózati kommunikáció során.';
            }
        };

        const saveResult = async (id, value) => {
            if (value === undefined || value === null || value === "") {
                alert("Kérlek, adj meg egy mért értéket!");
                return;
            }

            try {
                const res = await fetch(`/api/results/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ assayValue: value })
                });

                if (res.ok) {
                    await fetchSamples();
                } else {
                    const err = await res.json();
                    let message = "Sikertelen mentés";

                    if (typeof err.detail === 'string') {
                        // FastAPI HTTPException: { detail: "szöveg" }
                        message = err.detail;
                    } else if (Array.isArray(err.detail)) {
                        // FastAPI validációs hiba: { detail: [{ msg: "szöveg" }] }
                        message = err.detail.map(e => e.msg).join(", ");
                    }

                    alert("Hiba: " + message);
                }
            } catch (err) {
                alert("Nem sikerült elérni a szervert.");
            }
        };

        // SZŰRÉSI LOGIKA (Keresőmező alapján)
        const filteredSamples = computed(() => {
            if (!searchQuery.value) return samples.value;
            const q = searchQuery.value.toLowerCase();
            return samples.value.filter(s => 
                s.drugName.toLowerCase().includes(q) || 
                s.batchNumber.toLowerCase().includes(q) || 
                s.labId.toLowerCase().includes(q)
            );
        });

        // LAPOZÁSI LOGIKA (A szűrt eredményekre alapozva)
        const totalPages = computed(() => Math.ceil(filteredSamples.value.length / perPage) || 1);
        
        const paginatedSamples = computed(() => {
            // Ha a keresés miatt kevesebb oldal lett, ugorjunk az elejére
            if (currentPage.value > totalPages.value) currentPage.value = 1;
            
            const start = (currentPage.value - 1) * perPage;
            const end = start + perPage;
            return filteredSamples.value.slice(start, end);
        });

        const statusBadge = (status) => {
            if (status === 'Pending') return 'bg-yellow-100 text-yellow-800';
            if (status === 'OOS') return 'bg-red-100 text-red-800 border border-red-200';
            return 'bg-green-100 text-green-800 border border-green-200';
        };

        onMounted(fetchSamples);

        return {
            currentView, samples, newSample, currentPage, totalPages, errorMessage,
            searchQuery, filteredSamples, paginatedSamples,
            fetchSamples, refreshList, submitSample, statusBadge, deleteSample,
            saveResult
        };
    }
};

createApp(App).mount('#app');