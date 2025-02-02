<script setup lang="ts">
const { loggedIn, signIn } = useAuth()
</script>

<template>
  <button @click="signIn">
    Login with Nimiq {{ loggedIn || 'no' }}
    {{ Object.keys(signIn) }}
  </button>
</template>
