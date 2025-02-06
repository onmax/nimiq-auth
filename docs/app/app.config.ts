// https://github.com/nuxt-themes/docus/blob/main/nuxt.schema.ts
export default defineAppConfig({
  docus: {
    title: 'Nimiq Auth',
    description: 'Add Login with Nimiq to your apps',
    image: 'https://user-images.githubusercontent.com/904724/185365452-87b7ca7b-6030-4813-a2db-5e65c785bf88.png',
    socials: {
      bsky: 'onmax.bsky.social',
      github: 'onmax/nimiq-auth',
    },
    github: {
      dir: '.starters/default/content',
      branch: 'main',
      repo: 'nimiq-auth',
      owner: 'onmax',
      edit: true,
    },
    aside: {
      level: 0,
      collapsed: false,
      exclude: [],
    },
    main: {
      padded: true,
      fluid: true,
    },
    header: {
      logo: true,
      showLinkIcon: true,
      exclude: [],
      fluid: true,
    },
  },
})
