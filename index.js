const token = process.env.TOKEN;

const { Client, GatewayIntentBits } = require("discord.js");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    StreamType,
} = require("@discordjs/voice");

const { Readable } = require("stream");

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
   무음 PCM 스트림 생성
===================== */
function createSilentAudioStream() {
    return new Readable({
        read() {
            // 20ms 분량 무음 PCM
            // 48000Hz * 2채널 * 2바이트 * 0.02초 = 3840
            this.push(Buffer.alloc(3840));
        },
    });
}

/* =====================
   무음 재생 함수
===================== */
function playAudio() {
    if (!player) return;

    const silentStream = createSilentAudioStream();

    const resource = createAudioResource(silentStream, {
        inputType: StreamType.Raw,
    });

    player.play(resource);
}

/* =====================
   !join 명령어
===================== */
client.on("messageCreate", (message) => {
    if (message.author.bot) return;
    if (message.content !== "!join") return;

    // 🔒 이미 어디든 연결 중이면 무시
    if (connection) {
        console.log("이미 음성 채널에 연결 중 → !join 무시");
        return;
    }

    const vc = message.member.voice.channel;
    if (!vc) {
        message.reply("먼저 음성 채널에 들어가 있어야 함");
        return;
    }

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

    player.on(AudioPlayerStatus.Idle, () => {
        playAudio();
    });

    console.log(`🎧 ${vc.name} 채널로 입장`);
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