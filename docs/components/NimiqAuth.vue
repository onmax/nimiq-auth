<script setup lang="ts">
const { loggedIn, error, login, status, user } = useNimiqAuth()
</script>

<template>
  <pre>
    {{ {
      loggedIn,
      status,
      error,
      user,
    } }}
  </pre>
  <button @click="login">
    Login with Nimiq
  </button>
</template>
