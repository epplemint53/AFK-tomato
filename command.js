// 🔑 토큰, clientId는 config.json에서만
//const { token, clientId } = require("./config.json");
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
    new SlashCommandBuilder()
    .setName("버틴시간")
    .setDescription("봇이 음성 채널에서 버틴 시간을 알려줍니다"),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

(async() => {
    try {
        await rest.put(
            Routes.applicationCommands(clientId), { body: commands }
        );
        console.log("✅ 슬래시 커맨드 등록 완료");
    } catch (error) {
        console.error("❌ 커맨드 등록 실패:", error);
    }
})();

// End of command.js