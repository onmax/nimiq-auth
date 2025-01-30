<script setup>
const { address, publicKey, user, state, error, loggedIn, login, logout, session } = useNimiqAuth()
</script>

<template>
  <div>
    Nimiq Auth Nuxt Module Playground
  </div>
  <button v-if="!loggedIn" @click="login">
    Login with Nimiq
  </button>
  <button v-else @click="logout">
    Logout
  </button>
  <pre>
    {{ JSON.stringify({ address, publicKey, user, address, state, error, loggedIn, login, logout, session }, null, 2) }}
  </pre>
</template>
