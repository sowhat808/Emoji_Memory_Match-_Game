<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Emoji Memory Match Ultimate</title>
<style>
body { font-family: Arial,sans-serif; text-align:center; background:#000; color:#fff; margin:0; padding:0;}
h1{margin-top:10px;}
#controls{margin:10px;}
button{padding:10px 20px;margin:5px;font-size:16px;cursor:pointer;border-radius:8px;border:none;}
#game{display:grid;grid-gap:10px;justify-content:center;margin:20px auto;max-width:1200px;}
.tile{width:80px;height:80px;background:#1e1e1e;border-radius:15px;display:flex;justify-content:center;align-items:center;font-size:40px;cursor:pointer;user-select:none;box-shadow:0 2px 5px rgba(255,255,255,0.2);transition:transform 0.4s, background 0.4s;transform-style:preserve-3d;}
.tile.flipped{background:#ffeaa7;transform:rotateY(180deg);}
#status{font-size:18px;margin-top:10px;}
#leaderboard{margin-top:20px;text-align:center;max-width:500px;margin-left:auto;margin-right:auto;}
#confetti{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;}
<script src="emojigame.js"></script>
</style>
</head>
<body>

<h1>Emoji Memory Match Ultimate</h1>
<input type="text" id="nameInput" placeholder="Player 1 Name">
<input type="text" id="player2Input" placeholder="Player 2 Name (for 2P)">
<div id="controls">
Mode: <button onclick="setMode(1)">1 Player</button>
<button onclick="setMode(2)">2 Players</button>
Tiles: 
<button onclick="startGame(16)">16</button>
<button onclick="startGame(32)">32</button>
<button onclick="startGame(64)">64</button>
<button onclick="startGame(128)">128</button>
<button onclick="startGame(currentTileCount)">Restart</button>
</div>

<div id="status">Moves: 0 | Matches: 0 | Time: 0s | Turn: Player 1</div>
<div id="game"></div>
<div id="leaderboard"><h3>Top 10 Scores</h3><ol id="scoreboard"></ol></div>
<canvas id="confetti"></canvas>

<audio id="flipSound" src="https://www.soundjay.com/button/sounds/button-16.mp3"></audio>
<audio id="matchSound" src="https://www.soundjay.com/button/sounds/button-10.mp3"></audio>
<audio id="winSound" src="https://www.soundjay.com/button/sounds/button-3.mp3"></audio>

<script>
// ===== Data =====
const emojiSet=["😀","🎉","🚀","🍕","🌟","🐱","🍎","⚡","🎵","🍩","🐶","🌈","🍔","💎","🐼","🌸",
"🍓","🥑","🍪","🍭","🦄","🐷","🐙","🌹","🍋","🌞","🍿","🛸","🎃","🍁","🐰","🍄"];

const winGifs=[
'https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif',
'https://media.giphy.com/media/l0HlQ7LRalH8r0U4A/giphy.gif',
'https://media.giphy.com/media/xT0GqeSlGSRQutQ8xG/giphy.gif',
'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
'https://media.giphy.com/media/l0Exk8EUzSLsrErEQ/giphy.gif',
'https://media.giphy.com/media/26uTt19hlOnR0x2i4/giphy.gif',
'https://media.giphy.com/media/l0ExncehJzexFpRHq/giphy.gif',
'https://media.giphy.com/media/3o7TKD3s0s01U2gM4c/giphy.gif',
'https://media.giphy.com/media/26FPqut4Uo05r3LDi/giphy.gif',
'https://media.giphy.com/media/l0HlSNOxJB956qwfK/giphy.gif',
'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
'https://media.giphy.com/media/xT9IgIc0lryrxvqVGM/giphy.gif',
'https://media.giphy.com/media/3o6ZsYNtBzJvZpHUta/giphy.gif',
'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif',
'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif',
'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
'https://media.giphy.com/media/26xBwdIuRJiAi9nEu/giphy.gif',
'https://media.giphy.com/media/xT0GqssRweIhlz209i/giphy.gif',
'https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif',
'https://media.giphy.com/media/3o7TKPZt9EzkbfqQDm/giphy.gif'
];

const winAnimations=["confetti","fireworks","sparkles","emojiRain"];
let winAnimIndex=parseInt(localStorage.getItem("winAnimIndex"))||0;

// ===== Game state =====
let tiles=[],firstTile=null,secondTile=null,lockBoard=false,moves=0,matches=0,timer=0,interval;
let currentTileCount=16,mode=1,currentTurn=1,playerScores={1:0,2:0};
const flipSound=document.getElementById("flipSound");
const matchSound=document.getElementById("matchSound");
const winSound=document.getElementById("winSound");
const confettiCanvas=document.getElementById("confetti");
confettiCanvas.width=window.innerWidth;
confettiCanvas.height=window.innerHeight;
const ctx=confettiCanvas.getContext('2d');
let confettiPieces=[];

// ===== Utility =====
function shuffle(array){for(let i=array.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[array[i],array[j]]=[array[j],array[i]];}}
function generateTiles(num){let pairs=num/2; let sel=[]; while(sel.length<pairs){sel.push(...emojiSet);} sel=sel.slice(0,pairs); let arr=[...sel,...sel]; shuffle(arr); return arr;}
function setMode(m){mode=m;startGame(currentTileCount);}

// ===== Game Setup =====
function startGame(numTiles){
currentTileCount=numTiles; tiles=generateTiles(numTiles); firstTile=null; secondTile=null; lockBoard=false; moves=0; matches=0; timer=0; currentTurn=1; playerScores={1:0,2:0};
clearInterval(interval);
const game=document.getElementById("game");
game.innerHTML=''; game.style.gridTemplateColumns=`repeat(${Math.min(numTiles/4,16)},80px)`;
tiles.forEach((e,i)=>{const t=document.createElement("div"); t.classList.add("tile"); t.dataset.emoji=e; t.dataset.index=i; t.addEventListener("click",flipTile); game.appendChild(t);});
document.getElementById("status").textContent=getStatusText();
interval=setInterval(()=>{timer++;document.getElementById("status").textContent=getStatusText();},1000);
renderLeaderboard();
}

function getStatusText(){if(mode===1){return `Moves: ${moves} | Matches: ${matches} | Time: ${timer}s`;} else {return `Moves: ${moves} | Matches: ${matches} | Time: ${timer}s | Turn: Player ${currentTurn} | P1: ${playerScores[1]} P2: ${playerScores[2]}`;}}

// ===== Tile Flip Logic =====
function flipTile(){if(lockBoard)return;if(this===firstTile)return; flipSound.play(); this.textContent=this.dataset.emoji; this.classList.add("flipped"); if(!firstTile){firstTile=this;return;} secondTile=this; moves++;
if(firstTile.dataset.emoji===secondTile.dataset.emoji){
matches++; matchSound.play(); if(mode===2){playerScores[currentTurn]++;} firstTile.removeEventListener("click",flipTile); secondTile.removeEventListener("click",flipTile); resetTiles();
if(matches===currentTileCount/2){clearInterval(interval);winSound.play(); celebrateWin(); addScore(timer,currentTileCount);}
} else {if(mode===2){currentTurn=currentTurn===1?2:1;} lockBoard=true; setTimeout(()=>{firstTile.textContent="";secondTile.textContent="";firstTile.classList.remove("flipped");secondTile.classList.remove("flipped"); resetTiles(); document.getElementById("status").textContent=getStatusText();},800);}
document.getElementById("status").textContent=getStatusText();
}
function resetTiles(){[firstTile,secondTile]=[null,null]; lockBoard=false;}

// ===== Leaderboard =====
function addScore(time,numTiles){
let name1=document.getElementById("nameInput").value||"Player1";
let name2=document.getElementById("player2Input").value||"Player2";
let key="leaderboard"+numTiles;
let scores=JSON.parse(localStorage.getItem(key))||[];
if(mode===1){scores.push({mode:1,name:name1,time:time});} 
else{scores.push({mode:2,p1:name1,p2:name2,p1score:playerScores[1],p2score:playerScores[2],time:time});}
scores.sort((a,b)=>{if(a.mode===1&&b.mode===1) return a.time-b.time; if(a.mode===2&&b.mode===2){let totalA=a.p1score+a.p2score,totalB=b.p1score+b.p2score;if(totalB!==totalA)return totalB-totalA;return a.time-b.time;} return 0;});
if(scores.length>10)scores=scores.slice(0,10);
localStorage.setItem(key,JSON.stringify(scores));
renderLeaderboard();
}
function renderLeaderboard(){let key="leaderboard"+currentTileCount; let scores=JSON.parse(localStorage.getItem(key))||[]; const board=document.getElementById("scoreboard"); board.innerHTML=""; scores.forEach(entry=>{const li=document.createElement("li"); if(entry.mode===1){li.textContent=`${entry.name}: ${entry.time}s`;} else{li.textContent=`${entry.p1} (${entry.p1score}) vs ${entry.p2} (${entry.p2score}) in ${entry.time}s`;} board.appendChild(li);});}

// ===== Winning Celebration =====
function celebrateWin(){showWinningGif(); const animType=winAnimations[winAnimIndex]; switch(animType){case"confetti": startConfetti(); break; case"fireworks": startFireworks(); break; case"sparkles": startSparkles(); break; case"emojiRain": startEmojiRain(); break;} winAnimIndex=(winAnimIndex+1)%winAnimations.length; localStorage.setItem("winAnimIndex",winAnimIndex);}

// Random winning GIF
function showWinningGif(){const gifUrl=winGifs[Math.floor(Math.random()*winGifs.length)]; const img=document.createElement('img'); img.src=gifUrl; img.style.position='fixed'; img.style.top='0'; img.style.left='0'; img.style.width='100%'; img.style.height='100%'; img.style.objectFit='cover'; img.style.zIndex='10000'; img.style.cursor='pointer'; document.body.appendChild(img); img.addEventListener('click',()=>document.body.removeChild(img)); setTimeout(()=>{if(document.body.contains(img))document.body.removeChild(img);},5000);}

// ===== Confetti =====
function startConfetti(){confettiPieces=[]; for(let i=0;i<200;i++){confettiPieces.push({x:Math.random()*window.innerWidth,y:Math.random()*window.innerHeight-window.innerHeight,r:Math.random()*6+4,d:Math.random()*10+5,color:`hsl(${Math.random()*360},100%,50%)`,tilt:Math.random()*10-10});} requestAnimationFrame(drawConfetti); setTimeout(()=>confettiPieces=[],5000);}
function drawConfetti(){ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height); confettiPieces.forEach(p=>{ctx.beginPath();ctx.fillStyle=p.color;ctx.moveTo(p.x+p.tilt,p.y);ctx.lineTo(p.x+p.tilt+p.r/2,p.y+p.r);ctx.lineTo(p.x+p.tilt-p.r/2,p.y+p.r); ctx.closePath(); ctx.fill(); p.y += Math.cos(p.d)+1+p.r/2; if(p.y>window.innerHeight){p.y=-10;p.x=Math.random()*window.innerWidth;}}); if(confettiPieces.length>0) requestAnimationFrame(drawConfetti);}

// ===== Fireworks =====
function startFireworks(){confettiPieces=[]; for(let i=0;i<150;i++){confettiPieces.push({x:Math.random()*window.innerWidth,y:window.innerHeight,r:Math.random()*4+2,color:`hsl(${Math.random()*360},100%,50%)`,speed:Math.random()*5+3,type:"firework"});} animateFireworks();}
function animateFireworks(){ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height); confettiPieces.forEach(p=>{ctx.beginPath();ctx.fillStyle=p.color;ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); p.y-=p.speed; if(p.y<-10)p.y=window.innerHeight;}); if(confettiPieces.length>0) requestAnimationFrame(animateFireworks);}

// ===== Sparkles =====
function startSparkles(){confettiPieces=[]; for(let i=0;i<100;i++){confettiPieces.push({x:Math.random()*window.innerWidth,y:Math.random()*window.innerHeight,r:Math.random()*3+2,color:`hsl(${Math.random()*360},100%,80%)`,dx:(Math.random()-0.5)*2,dy:(Math.random()-0.5)*2});} animateSparkles();}
function animateSparkles(){ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height); confettiPieces.forEach(p=>{ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); p.x+=p.dx; p.y+=p.dy;}); if(confettiPieces.length>0) requestAnimationFrame(animateSparkles);}

// ===== Emoji Rain =====
function startEmojiRain(){const emojis=["🎉","✨","💥","🍕","🍩","🌟"]; confettiPieces=[]; for(let i=0;i<100;i++){confettiPieces.push({x:Math.random()*window.innerWidth,y:Math.random()*-window.innerHeight,emoji:emojis[Math.floor(Math.random()*emojis.length)],size:Math.random()*30+20,speed:Math.random()*3+2});} animateEmojiRain();}
function animateEmojiRain(){ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height); confettiPieces.forEach(p=>{ctx.font=`${p.size}px Arial`; ctx.fillText(p.emoji,p.x,p.y); p.y+=p.speed; if(p.y>window.innerHeight)p.y=-50;}); if(confettiPieces.length>0) requestAnimationFrame(animateEmojiRain);}

// ===== Initialize =====
startGame(currentTileCount);
window.addEventListener('resize',()=>{confettiCanvas.width=window.innerWidth; confettiCanvas.height=window.innerHeight;});
</script>
</body>
</html>
