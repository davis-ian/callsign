<template>
    <div>
        <Modal v-model="isOpen">
            <Card>
                <template #title> Auth </template>

                <template #content>
                    <select v-model="selectedAuthType" class="mb-4 w-full p-2 border rounded">
                        <option disabled value="">Select auth type</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="api-key">API Key</option>
                    </select>

                    <div class="flex flex-col gap-6 my-6">
                        <div v-if="selectedAuthType === 'api-key'" class="flex flex-col">
                            <span>ApiKey</span>
                            <span>Custom Api Key</span>
                            <span>Name: <code>x-api-key</code></span>
                            <span>In <code>header</code></span>
                            <TextInput v-model="apiKey" placeholder="ApiKey" />
                        </div>

                        <div v-if="selectedAuthType === 'bearer'" class="flex flex-col">
                            <span>Bearer</span>
                            <span>JWT Auth using the Bearer scheme</span>
                            <span>Name: <code>Authorization</code></span>
                            <span>In <code>header</code></span>
                            <TextInput v-model="bearer" placeholder="Bearer" />
                        </div>
                    </div>
                </template>

                <template #actions>
                    <div class="flex justify-between w-full">
                        <Btn @click="emit('update:modelValue')" variant="secondary">Close</Btn>
                        <div class="flex gap-2">
                            <Btn @click="clearAllCreds">Logout</Btn>
                            <Btn @click="saveHeaders">Save</Btn>
                        </div>
                    </div>
                </template>
            </Card>
        </Modal>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import Modal from '@/components/Common/Modal.vue';
import TextInput from '@/components/Common/TextInput.vue';
import Card from '@/components/Common/Card.vue';
import Btn from '@/components/Common/Btn.vue';
import { extensionBridge } from '@/services/ExtensionBridge.ts';
// import { useSpecStore } from '@/stores/spec';
import { vsLogError } from '@/utilities/extensionLogger';

// const specStore = useSpecStore();

const apiKey = ref('');
const bearer = ref('');
const selectedAuthType = ref('bearer');

async function saveHeaders() {
    if (selectedAuthType.value === 'bearer') {
        await extensionBridge.storeCredential({
            name: 'Bearer JWT',
            type: 'bearer',
            value: bearer.value,
        });
    } else if (selectedAuthType.value === 'api-key') {
        await extensionBridge.storeCredential({
            name: 'Api Key',
            type: 'api-key',
            value: apiKey.value,
        });
    }
    isOpen.value = false;
}

function getAllCreds() {
    try {
        extensionBridge.getAllCredentials();
    } catch (error) {
        vsLogError(error, 'error @ get all creds');
    }
}

function clearAllCreds() {
    try {
        extensionBridge.clearAllCredentials();

        apiKey.value = '';
        bearer.value = '';
    } catch (error) {
        vsLogError(error, 'error @ clear all creds');
    }
}

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue', 'authenticated']);

// Computed property to handle v-model passthrough
const isOpen = computed({
    get: () => props.modelValue,
    set: value => emit('update:modelValue', value),
});

// async function preloadSelectedAuth() {
//     if (!specStore.selectedAuthId) return;

//     try {
//         const resp = await extensionBridge.getCredentialById(specStore.selectedAuthId);

//         // if (!resp?.credential) return;

//         // if (resp.credential.type === 'bearer') {
//         //     selectedAuthType.value = 'bearer';
//         //     bearer.value = resp.value;
//         // } else if (resp.credential.type === 'api-key') {
//         //     selectedAuthType.value = 'api-key';
//         //     apiKey.value = resp.value;
//         // }
//     } catch (err) {
//         console.error('Failed to get auth header:', err);
//     }
// }

onMounted(() => {
    // preloadSelectedAuth();

    window.addEventListener('message', event => {
        const { command, data } = event.data;

        if (command === 'allCreds') {
            const bearerCred = data.find((x: any) => x.type === 'bearer');
            const apiKeyCred = data.find((x: any) => x.type === 'api-key');

            if (bearerCred) {
                extensionBridge.getCredentialById(bearerCred.id);
            }

            if (apiKeyCred) {
                extensionBridge.getCredentialById(apiKeyCred.id);
            }
        }

        if (command === 'credentialValue') {
            if (data.credential.type === 'bearer') {
                bearer.value = data.value;
            } else if (data.credential.type === 'api-key') {
                apiKey.value = data.value;
            }
        }
    });

    getAllCreds();
});
</script>

<style scoped></style>
