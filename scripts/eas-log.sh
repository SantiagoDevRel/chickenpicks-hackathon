#!/usr/bin/env bash
# Print the log URL of a given EAS build id (latest log file).
set -e
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null 2>&1 || true
cd ~/chickenpicks-hackathon/apps/mobile

BUILD_ID="${1:?usage: eas-log.sh <build_id>}"
eas build:view "$BUILD_ID" --json | node -e '
let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{
  try{const j=JSON.parse(s);
    if(Array.isArray(j.logFiles)&&j.logFiles.length){console.log(j.logFiles[j.logFiles.length-1]);}
    else process.stderr.write("no logFiles\n");
  }catch(e){process.stderr.write(e.message+"\n")}
});'
