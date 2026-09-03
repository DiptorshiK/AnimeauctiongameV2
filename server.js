const express=require("express");
const http=require("http");
const crypto=require("crypto");
const {Server}=require("socket.io");
const app=express(),server=http.createServer(app),io=new Server(server);
app.use(express.static("public"));
app.get("/health",(req,res)=>res.json({ok:true,rooms:rooms.size}));

const rooms=new Map();
const ANIME={
 naruto:{name:"Naruto + Naruto Shippuden",icon:"🍥",theme:"leaf",characters:[
 ["Naruto Uzumaki",10],["Sasuke Uchiha",10],["Itachi Uchiha",9],["Madara Uchiha",10],["Obito Uchiha",9],["Kakashi Hatake",8],["Minato Namikaze",9],["Pain",8],["Hashirama Senju",10],["Might Guy",8],["Shikamaru Nara",7],["Gaara",8],["Jiraiya",8],["Orochimaru",8],["Rock Lee",7]]},
 jjk:{name:"Jujutsu Kaisen",icon:"👁️",theme:"cursed",characters:[
 ["Satoru Gojo",10],["Ryomen Sukuna",10],["Yuta Okkotsu",9],["Toji Fushiguro",9],["Suguru Geto",9],["Kenjaku",9],["Megumi Fushiguro",8],["Yuji Itadori",8],["Maki Zenin",8],["Mahito",8],["Kento Nanami",7],["Choso",7],["Aoi Todo",7],["Panda",6],["Toge Inumaki",7]]},
 aot:{name:"Attack on Titan",icon:"🧱",theme:"walls",characters:[
 ["Eren Yeager",10],["Levi Ackerman",10],["Mikasa Ackerman",9],["Armin Arlert",8],["Erwin Smith",9],["Reiner Braun",8],["Annie Leonhart",8],["Zeke Yeager",9],["Jean Kirstein",7],["Hange Zoe",8],["Pieck Finger",8],["Porco Galliard",7],["Sasha Blouse",7],["Connie Springer",6]]},
 demon_slayer:{name:"Demon Slayer",icon:"⚔️",theme:"breath",characters:[
 ["Tanjiro Kamado",8],["Nezuko Kamado",8],["Giyu Tomioka",9],["Kyojuro Rengoku",9],["Tengen Uzui",9],["Muichiro Tokito",8],["Mitsuri Kanroji",8],["Shinobu Kocho",8],["Akaza",9],["Kokushibo",10],["Muzan Kibutsuji",10],["Sanemi Shinazugawa",9],["Gyomei Himejima",10],["Doma",9],["Inosuke Hashibira",7]]},
 death_note:{name:"Death Note",icon:"📓",theme:"noir",characters:[
 ["Light Yagami",10],["L",10],["Ryuk",9],["Misa Amane",7],["Near",8],["Mello",8],["Rem",8],["Teru Mikami",7],["Soichiro Yagami",7],["Naomi Misora",8],["Matt",6]]}
};
const codes=()=>crypto.randomBytes(3).toString("hex").toUpperCase();
const token=()=>crypto.randomBytes(18).toString("hex");
function cleanName(n){return String(n||"").trim().slice(0,24)}
function pub(room){
 return {code:room.code,anime:room.anime,started:room.started,locked:room.locked,paused:room.paused,finished:room.finished,
 budget:room.budget,increment:room.increment,timerSeconds:room.timerSeconds,hostId:room.hostId,index:room.index,total:room.queue.length,
 players:[...room.players.values()].map(p=>({id:p.id,name:p.name,budget:p.budget,roster:p.roster,online:p.online})),
 current:room.current?{name:room.current.name,rating:room.current.rating,base:room.current.base,bid:room.current.bid,bidderId:room.current.bidderId,bidderName:room.current.bidderName,timeLeft:room.current.timeLeft}:null,
 history:room.history.slice(-20)};
}
function emit(room){io.to(room.code).emit("state",pub(room))}
function err(s,msg){s.emit("errorMsg",msg)}
function getRoom(code){return rooms.get(String(code||"").toUpperCase())}
function auth(room,s,provided){const p=room.players.get(s.id);return p&&p.token===provided?p:null}
function host(room,s,provided){return room.hostId===s.id && room.hostToken===provided}

io.on("connection",s=>{
 s.on("createRoom",({anime,name,budget,increment,timer,password})=>{
  if(!ANIME[anime])return err(s,"Choose an anime.");
  name=cleanName(name); if(!name)return err(s,"Enter your name.");
  let code;do code=codes();while(rooms.has(code));
  const room={code,anime,hostId:s.id,hostToken:token(),started:false,locked:false,paused:false,finished:false,
   budget:Math.max(10,Number(budget)||100),increment:Math.max(1,Number(increment)||1),timerSeconds:Math.max(5,Number(timer)||12),
   password:String(password||"").slice(0,40),players:new Map(),index:-1,current:null,history:[],timer:null,
   queue:ANIME[anime].characters.map(([name,rating])=>({name,rating,base:Math.max(1,Math.floor(rating/2))})).sort(()=>Math.random()-.5)};
  const p={id:s.id,token:token(),name,budget:room.budget,roster:[],online:true};
  room.players.set(s.id,p);rooms.set(code,room);s.join(code);
  s.emit("credentials",{code,token:p.token,hostToken:room.hostToken});emit(room);
 });
 s.on("joinRoom",({code,name,password})=>{
  const room=getRoom(code);if(!room)return err(s,"Room not found.");
  if(room.locked)return err(s,"This room is locked.");
  if(room.started)return err(s,"Auction already started; joining is closed.");
  if(room.password!==String(password||""))return err(s,"Wrong room password.");
  name=cleanName(name);if(!name)return err(s,"Enter your name.");
  const p={id:s.id,token:token(),name,budget:room.budget,roster:[],online:true};
  room.players.set(s.id,p);s.join(room.code);s.emit("credentials",{code:room.code,token:p.token,hostToken:null});emit(room);
 });
 s.on("hostAction",({code,hostToken:ht,action,payload={}})=>{
  const room=getRoom(code);if(!room||!host(room,s,ht))return err(s,"Host permission required.");
  if(action==="start"){if(room.started)return;room.started=true;room.locked=true;next(room)}
  if(action==="lock"){room.locked=!!payload.value}
  if(action==="pause"){room.paused=!!payload.value;if(!room.paused)restartTimer(room)}
  if(action==="skip"){if(room.current)settle(room,true);else next(room)}
  if(action==="end"){room.finished=true;room.current=null;clearInterval(room.timer)}
  if(action==="kick"){const p=room.players.get(payload.id);if(p&&p.id!==room.hostId){io.to(p.id).emit("kicked");room.players.delete(p.id);const sock=io.sockets.sockets.get(p.id);if(sock)sock.leave(room.code)}}
  if(action==="settings"&&!room.started){room.budget=Math.max(10,Number(payload.budget)||100);room.increment=Math.max(1,Number(payload.increment)||1);room.timerSeconds=Math.max(5,Number(payload.timer)||12);room.password=String(payload.password||"").slice(0,40);room.players.forEach(p=>p.budget=room.budget)}
  emit(room);
 });
 s.on("bid",({code,token:pt})=>{
  const room=getRoom(code),p=room&&auth(room,s,pt);if(!p||!room.current||room.paused||room.finished)return;
  const amount=room.current.bid+room.increment;if(amount>p.budget)return err(s,"Not enough budget.");
  room.current.bid=amount;room.current.bidderId=p.id;room.current.bidderName=p.name;room.current.timeLeft=room.timerSeconds;emit(room);
 });
 s.on("rejoin",({code,token:pt})=>{
  const room=getRoom(code),p=room&&room.players.values();if(!room)return;
  for(const x of room.players.values())if(x.token===pt){room.players.delete(x.id);x.id=s.id;x.online=true;room.players.set(s.id,x);s.join(code);s.emit("credentials",{code,token:pt,hostToken:room.hostId===s.id?room.hostToken:null});emit(room);return}
  err(s,"Session expired. Rejoin the room.");
 });
 s.on("disconnect",()=>{for(const room of rooms.values()){const p=room.players.get(s.id);if(p){p.online=false;emit(room)}}});
});
function restartTimer(room){
 clearInterval(room.timer);if(!room.current||room.paused||room.finished)return;
 room.timer=setInterval(()=>{if(!room.current||room.paused)return;room.current.timeLeft--;if(room.current.timeLeft<=0)settle(room,false);else emit(room)},1000);
}
function next(room){
 clearInterval(room.timer);
 if(room.index+1>=room.queue.length){room.finished=true;room.current=null;emit(room);return}
 room.index++;const c=room.queue[room.index];room.current={...c,bid:c.base,bidderId:null,bidderName:null,timeLeft:room.timerSeconds};restartTimer(room);emit(room);
}
function settle(room,forced){
 clearInterval(room.timer);const c=room.current;
 if(c&&c.bidderId){const p=room.players.get(c.bidderId);if(p&&c.bid<=p.budget){p.budget-=c.bid;p.roster.push({name:c.name,rating:c.rating,price:c.bid});room.history.push({name:c.name,bid:c.bid,bidderName:p.name})}}
 else if(c)room.history.push({name:c.name,bid:0,bidderName:"Unsold"});
 room.current=null;if(forced)next(room);else setTimeout(()=>{if(!room.finished&&!room.current)next(room)},1200);emit(room);
}
setInterval(()=>{for(const [c,r] of rooms)if(r.players.size===0){clearInterval(r.timer);rooms.delete(c)}},10*60*1000);
server.listen(process.env.PORT||3000,()=>console.log("Anime Auction V2 running"));
