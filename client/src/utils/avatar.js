export function generateAvatarSeed(name){
  return 'AV-'+(name||'').slice(0,6)+Math.floor(Math.random()*9999);
}
