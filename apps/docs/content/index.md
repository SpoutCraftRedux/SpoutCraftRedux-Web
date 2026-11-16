---
title: SpoutCraft Redux Docs
description: Install the SpoutCraft Redux server and client, write plugins against the SpoutCraft Redux API, and fetch builds from the downloads API.
---

::u-page-hero{class="dark:bg-gradient-to-b from-neutral-900 to-neutral-950"}
---
orientation: horizontal
---
#top
:hero-background

#headline
  :::u-badge
  ---
  color: warning
  variant: subtle
  size: lg
  ---
  Early development · Phase 0
  :::

#title
Spoutcraft, rebuilt for [Minecraft 26.3]{.text-primary}.

#description
SpoutCraft Redux brings back the server-driven GUIs, HUD widgets, skies, sounds and keybinds of the original Spoutcraft. It ships as a Purpur fork for the server and a Fabric mod for the client, and players without the mod can still join.

#links
  :::u-button
  ---
  to: /getting-started
  size: xl
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  :::u-button
  ---
  icon: i-lucide-download
  color: neutral
  variant: outline
  size: xl
  to: https://spoutcraftredux.org/downloads
  target: _blank
  ---
  Downloads
  :::

#default
  :::prose-pre
  ---
  code: |
    @EventHandler
    public void onReady(SpoutCraftReduxClientReadyEvent event) {
        SpoutCraftReduxPlayer player = event.getSpoutCraftReduxPlayer();
        getLogger().info(event.getPlayer().getName()
            + " joined with SpoutCraft Redux " + player.modVersion().orElse("?"));
    }
  filename: JoinListener.java
  ---

  ```java [JoinListener.java]
  @EventHandler
  public void onReady(SpoutCraftReduxClientReadyEvent event) {
      SpoutCraftReduxPlayer player = event.getSpoutCraftReduxPlayer();
      getLogger().info(event.getPlayer().getName()
          + " joined with SpoutCraft Redux " + player.modVersion().orElse("?"));
  }
  ```
  :::
::

::u-page-section{class="dark:bg-neutral-950"}
#title
Find your way around

#features
  :::u-page-feature
  ---
  icon: i-lucide-server
  to: /getting-started/installing-the-server
  ---
  #title
  Run a server

  #description
  Swap your Purpur jar for the SpoutCraft Redux jar. Worlds, plugins and configs carry over.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-monitor
  to: /getting-started/installing-the-client
  ---
  #title
  Install the client

  #description
  Add the Fabric mod to unlock the extra features on SpoutCraft Redux servers.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-code
  to: /plugin-development
  ---
  #title
  Write plugins

  #description
  Compile against `spoutcraftredux-api`: the Purpur API plus `org.spoutcraftredux.api`.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-cloud-download
  to: /downloads-api
  ---
  #title
  Automate downloads

  #description
  Fetch the latest server and client builds from a Purpur-style REST API.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-users
  to: /getting-started#vanilla-players
  ---
  #title
  Vanilla players welcome

  #description
  Every feature defines what a client without the mod sees, from dialogs to resource packs.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-git-pull-request
  to: /contributing
  ---
  #title
  Contribute

  #description
  Build the protocol, client and server from source and send patches upstream.
  :::
::

::u-page-section{class="dark:bg-gradient-to-b from-neutral-950 to-neutral-900"}
  :::u-page-c-t-a
  ---
  links:
    - label: Read the introduction
      to: '/getting-started'
      trailingIcon: i-lucide-arrow-right
    - label: View on GitHub
      to: 'https://github.com/SpoutCraftRedux'
      target: _blank
      variant: subtle
      icon: i-simple-icons-github
  title: Follow along from Phase 0
  description: SpoutCraft Redux is in early development. The handshake works today; GUIs, HUD, sky and the rest of the API arrive over the next phases.
  class: dark:bg-neutral-950
  ---

  :stars-bg
  :::
::
