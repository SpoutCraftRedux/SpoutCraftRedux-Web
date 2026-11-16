export default defineAppConfig({
  ui: {
    colors: {
      primary: 'sky',
      neutral: 'zinc'
    },
    prose: {
      codeIcon: {
        'kts': 'i-vscode-icons-file-type-kotlin',
        'build.gradle.kts': 'i-vscode-icons-file-type-gradle',
        'pom.xml': 'i-vscode-icons-file-type-maven',
        'properties': 'i-vscode-icons-file-type-light-ini',
        'sh': 'i-lucide-terminal'
      }
    },
    footer: {
      slots: {
        root: 'border-t border-default',
        left: 'text-sm text-muted'
      }
    }
  },
  seo: {
    siteName: 'SpoutCraft Redux Docs'
  },
  header: {
    title: '',
    to: '/',
    logo: {
      alt: '',
      light: '',
      dark: ''
    },
    search: true,
    colorMode: true,
    links: [{
      'icon': 'i-lucide-globe',
      'to': 'https://spoutcraftredux.org',
      'target': '_blank',
      'aria-label': 'SpoutCraft Redux website'
    }, {
      'icon': 'i-simple-icons-github',
      'to': 'https://github.com/SpoutCraftRedux',
      'target': '_blank',
      'aria-label': 'SpoutCraft Redux on GitHub'
    }]
  },
  footer: {
    credits: `SpoutCraft Redux • LGPL-3.0 • © ${new Date().getFullYear()}`,
    colorMode: false,
    links: [{
      'icon': 'i-lucide-download',
      'to': 'https://spoutcraftredux.org/downloads',
      'target': '_blank',
      'aria-label': 'Downloads'
    }, {
      'icon': 'i-lucide-globe',
      'to': 'https://spoutcraftredux.org',
      'target': '_blank',
      'aria-label': 'SpoutCraft Redux website'
    }, {
      'icon': 'i-simple-icons-github',
      'to': 'https://github.com/SpoutCraftRedux',
      'target': '_blank',
      'aria-label': 'SpoutCraft Redux on GitHub'
    }]
  },
  toc: {
    title: 'On this page',
    bottom: {
      title: 'Links',
      edit: 'https://github.com/SpoutCraftRedux/SpoutCraftRedux-Web/edit/main/apps/docs/content',
      links: [{
        icon: 'i-lucide-download',
        label: 'Downloads',
        to: 'https://spoutcraftredux.org/downloads',
        target: '_blank'
      }, {
        icon: 'i-simple-icons-github',
        label: 'GitHub',
        to: 'https://github.com/SpoutCraftRedux',
        target: '_blank'
      }, {
        icon: 'i-lucide-server',
        label: 'Downloads API',
        to: 'https://api.spoutcraftredux.org/v2',
        target: '_blank'
      }]
    }
  }
})
