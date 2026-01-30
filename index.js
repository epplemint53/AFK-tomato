const token = process.env.TOKEN;

const { Client, GatewayIntentBits } = require("discord.js");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
} = require("@discordjs/voice");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

let connection = null;
let player = null;
let fixedChannelId = null;
let joinedAt = null;

/* =====================
   봇 준비 완료
===================== */
client.once("ready", () => {
    console.log(`🤖 봇 온라인: ${client.user.tag}`);
});

/* =====================
   무음(or 노래) 재생 함수
===================== */
function playAudio() {
    if (!player) return;

    const resource = createAudioResource("silence.mp3", {
        inlineVolume: true,
    });

    // 🔊 볼륨 조절 (필요하면 숫자 바꿔)
    resource.volume.setVolume(0.05);

    player.play(resource);
}

/* =====================
   !join 명령어
===================== */
client.on("messageCreate", (message) => {
    if (message.author.bot) return;
    if (message.content !== "!join") return;
    if (connection) return; // 이미 들어가 있으면 무시

    const vc = message.member.voice.channel;
    if (!vc) return;

    fixedChannelId = vc.id;
    joinedAt = Date.now();

    connection = joinVoiceChannel({
        channelId: vc.id,
        guildId: vc.guild.id,
        adapterCreator: vc.guild.voiceAdapterCreator,
        selfDeaf: false,
    });

    player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
        },
    });

    connection.subscribe(player);

    playAudio();

    // 🎧 재생 끝나면 새 resource로 다시 재생
    player.on(AudioPlayerStatus.Idle, () => {
        playAudio();
    });

    console.log("🎧 음성 채널 입장 완료");
});

/* =====================
   끌려가면 원래 채널로 복귀
===================== */
client.on("voiceStateUpdate", (oldState, newState) => {
    if (!connection) return;
    if (newState.member.id !== client.user.id) return;

    if (newState.channelId !== fixedChannelId) {
        console.log("🗿 끌려감 → 복귀 시도");

        connection = joinVoiceChannel({
            channelId: fixedChannelId,
            guildId: newState.guild.id,
            adapterCreator: newState.guild.voiceAdapterCreator,
            selfDeaf: false,
        });

        connection.subscribe(player);
    }
});

/* =====================
   /버틴시간 슬래시 커맨드
===================== */
client.on("interactionCreate", async(interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "버틴시간") return;

    if (!joinedAt) {
        await interaction.reply({
            content: "아직 음성 채널에 안 들어가 있음",
            ephemeral: true,
        });
        return;
    }

    const elapsed = Math.floor((Date.now() - joinedAt) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;

    await interaction.reply(`🗿 ${h}시간 ${m}분 ${s}초 동안 버티는 중`);
});

/* =====================
   로그인
===================== */
client.login(token);