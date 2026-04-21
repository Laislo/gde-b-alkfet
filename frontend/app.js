const { createApp, ref, onMounted, computed } = Vue;

const App = {
    template: `
        <div class="min-h-screen">
            <nav class="bg-blue-600 text-white p-4 shadow-lg mb-6">
                <div class="container mx-auto flex justify-between items-center">
                    <h1 class="text-2xl font-bold">KLab LIMS Pro</h1>
                    <div class="space-x-4">
                        <button @click="currentView = 'list'" :class="{'underline': currentView === 'list'}" class="hover:text-blue-200">Minták listája</button>
                        <button @click="currentView = 'add'" :class="{'underline': currentView === 'add'}" class="hover:text-blue-200">Új felvitel</button>
                    </div>
                </div>
            </nav>

            <main class="container mx-auto p-4">
                <div v-if="currentView === 'list'">
                    <div class="bg-white rounded-lg shadow p-6">
                        <h2 class="text-xl font-semibold mb-4 text-gray-700">Laboratóriumi minták</h2>
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-gray-50">
                                    <th class="p-3 border-b">Lab ID</th>
                                    <th class="p-3 border-b">Hatóanyag</th>
                                    <th class="p-3 border-b">Sarzsszám</th>
                                    <th class="p-3 border-b">Státusz</th>
                                    <th class="p-3 border-b">Mért érték</th>
                                    <th class="p-3 border-b">Műveletek</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="sample in paginatedSamples" :key="sample._id" class="hover:bg-gray-50">
                                    <td class="p-3 border-b font-mono">{{ sample.labId }}</td>
                                    <td class="p-3 border-b">{{ sample.drugName }}</td>
                                    <td class="p-3 border-b">{{ sample.batchNumber }}</td>
                                    <td class="p-3 border-b">
                                        <span :class="statusBadge(sample.status)" class="px-2 py-1 rounded text-xs font-bold">
                                            {{ sample.status }}
                                        </span>
                                    </td>
                                    <td class="p-3 border-b">{{ sample.assayValue || '-' }} %</td>
                                    <td class="p-3 border-b">
                                        <button @click="deleteSample(sample._id)" class="text-red-500 hover:text-red-700">Törlés</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="mt-6 flex justify-between items-center">
                            <span class="text-sm text-gray-500">Összesen: {{ samples.length }} minta</span>
                            <div class="flex space-x-2">
                                <button @click="currentPage--" :disabled="currentPage === 1" 
                                    class="px-4 py-2 bg-gray-200 rounded disabled:opacity-50">Előző</button>
                                <span class="px-4 py-2">{{ currentPage }} / {{ totalPages }}</span>
                                <button @click="currentPage++" :disabled="currentPage === totalPages" 
                                    class="px-4 py-2 bg-gray-200 rounded disabled:opacity-50">Következő</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="currentView === 'add'" class="max-w-lg mx-auto bg-white p-8 rounded-lg shadow">
                    <h2 class="text-2xl font-bold mb-6">Új minta rögzítése</h2>
                    <form @submit.prevent="submitSample" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Hatóanyag neve</label>
                            <input v-model="newSample.drugName" type="text" required class="mt-1 block w-full border rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Sarzsszám (Batch)</label>
                            <input v-model="newSample.batchNumber" type="text" required class="mt-1 block w-full border rounded-md p-2">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Spec. Min (%)</label>
                                <input v-model.number="newSample.specMin" type="number" step="0.1" class="mt-1 block w-full border rounded-md p-2">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Spec. Max (%)</label>
                                <input v-model.number="newSample.specMax" type="number" step="0.1" class="mt-1 block w-full border rounded-md p-2">
                            </div>
                        </div>
                        <button type="submit" class="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition">Mentés</button>
                    </form>
                </div>
            </main>
        </div>
    `,
    setup() {
        const currentView = ref('list');
        const samples = ref([]);
        const currentPage = ref(1);
        const perPage = 5; // Hány elem legyen egy oldalon

        const newSample = ref({
            drugName: '',
            batchNumber: '',
            specMin: 95.0,
            specMax: 105.0
        });

        const fetchSamples = async () => {
            const res = await fetch('/api/samples');
            samples.value = await res.json();
        };

        const deleteSample = async (id) => {
            if(confirm('Biztosan törlöd?')) {
                await fetch(`/api/samples/${id}`, { method: 'DELETE' });
                fetchSamples();
            }
        };

        const submitSample = async () => {
            const res = await fetch('/api/samples', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSample.value)
            });
            if (res.ok) {
                newSample.value = { drugName: '', batchNumber: '', specMin: 95.0, specMax: 105.0 };
                currentView.value = 'list';
                fetchSamples();
            } else {
                const err = await res.json();
                alert(err.detail);
            }
        };

        // Pagination logika
        const totalPages = computed(() => Math.ceil(samples.value.length / perPage) || 1);
        const paginatedSamples = computed(() => {
            const start = (currentPage.value - 1) * perPage;
            const end = start + perPage;
            return samples.value.slice(start, end);
        });

        const statusBadge = (status) => {
            if (status === 'Pending') return 'bg-yellow-100 text-yellow-800';
            if (status === 'OOS') return 'bg-red-100 text-red-800';
            return 'bg-green-100 text-green-800';
        };

        onMounted(fetchSamples);

        return {
            currentView, samples, newSample, currentPage, totalPages, 
            paginatedSamples, fetchSamples, submitSample, statusBadge, deleteSample
        };
    }
};

createApp(App).mount('#app');