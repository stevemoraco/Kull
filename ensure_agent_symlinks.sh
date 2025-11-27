#!/bin/bash
# Ensure symlinks and reinstall CLI tools on container boot
AGENTS="grok codex claude gemini opencode factory persistent-home"
base=~/workspace/.data-sync
mkdir -p "/persistent-home"
for f in .bash_history .bashrc .bash_profile .profile; do
  [ -f "/persistent-home/" ] || touch "/persistent-home/"
  ln -sfn "/persistent-home/" ~/
done
for a in ; do
  mkdir -p "/"
  ln -sfn "/" ~/.""
done

# Reinstall CLI tools (they may be removed on container restart)
reinstall_clis() {
  log() { echo "[cli-reinstall] "; }

  if command -v npm >/dev/null 2>&1; then
    command -v grok >/dev/null 2>&1 || { npm install -g @xai-official/grok@latest >/dev/null 2>&1 && log "reinstalled grok"; } || true
    command -v opencode >/dev/null 2>&1 || { npm install -g opencode-ai@latest >/dev/null 2>&1 && log "reinstalled opencode-ai"; } || true
    command -v gemini >/dev/null 2>&1 || { npm install -g @google/gemini-cli >/dev/null 2>&1 && log "reinstalled gemini-cli"; } || true
    command -v codex >/dev/null 2>&1 || { npm install -g @openai/codex >/dev/null 2>&1 && log "reinstalled @openai/codex"; } || true
  fi

  if command -v curl >/dev/null 2>&1; then
    command -v droid >/dev/null 2>&1 || command -v factory >/dev/null 2>&1 || { curl -fsSL https://app.factory.ai/cli 2>/dev/null | sh >/dev/null 2>&1 && log "reinstalled Factory/Droid CLI"; } || true
    command -v claude >/dev/null 2>&1 || { curl -fsSL https://claude.ai/install.sh 2>/dev/null | bash >/dev/null 2>&1 && log "reinstalled Claude Code CLI"; } || true
  fi
}
reinstall_clis &
