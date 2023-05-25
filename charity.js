// ================================================= [ - Requiring Libraries - ]

require("dotenv").config();
const Excel = require("exceljs");
const workbook = new Excel.Workbook();
const fs = require("fs-extra");
const { Client } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const quran = require("./quran.json");
const { Configuration, OpenAIApi } = require("openai");
const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    })
);
const client = new Client({
    puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
});

const groupLink = "https://chat.whatsapp.com/E30cYJDal2bKc3ae9eS4cR";
const list = ["011432 65444", "011540 7748 7"];
const customCMDS = ["bot", "accurate", "slow", "#", "بوت", "دقة", "جاوب"];
const defPrompt = [
    {
        role: "system",
        content:
            "You are a helpful Assistant. Also please follow these instructions:\n" +
            // Instructions
            "1- Wrap the whole code with *\n" +
            "2- Format your message nicely using some new lines\n" +
            "3- Answer as fast as you can",
    },
];
const conversations = {};

// ================================================= [ - Variables - ]
let config = fs.readJsonSync("./database.json") || {
    messageEvery: 20, // in minutes
    currentVerse: "1:1", // IDs of [surah:ayah]
    ayahs_read: 0,
    surahs_read: 0,
    up_time: 0,
    sealed: 0,
    seal_started_at: null,
    bsmAllah: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    groups: ["120363076283863739"],
    prefix: "!",
    developer: {
        name: "Mostafa Adly Ibrahim Amar",
        id: "201143265444",
    },
};

// ================================================= [ - Classes - ]

class Interval {
    start() {
        config.online_since = Date.now();
        let secondsToStart = Math.abs(this.getSecondsLeftToStart()) + 10;
        global.print(`Starting interval in ${secondsToStart} seconds.`);
        setTimeout(() => {
            this.send();
            setInterval(() => {
                this.send();
            }, config.messageEvery * 1000 * 60);
        }, 1000 * secondsToStart);
    }
    send(handle = true) {
        let ayah = global.getCurrentAyah();
        app.sendMessageToAllGroups(
            `\"${ayah.text}\"\n\nسورة ${global.getCurrentSurah().name} - آية ${
                ayah.id
            }`
        );
        if (handle) global.handleAddingVerse();
        global.saveConfig();
    }
    getSecondsLeftToStart() {
        let date = new Date();
        let seconds =
            config.messageEvery * 60 -
            ((date.getMinutes() % 10) * 60 + date.getSeconds());
        return seconds == config.messageEvery * 60 ? 0 : seconds;
    }
}

class WhatsApp {
    constructor(client) {
        this.client = client;
    }
    start() {
        this.client.on("qr", (qr) => {
            this.generateQRCode(qr);
        });

        this.client.on("ready", async () => {
            client.isConnected = true;
            global.print(`WhatsApp Charity bot is now loaded.`);
            global.print(`WhatsApp API connected.`);
            interval.start();
        });

        this.client.on("message", async (msg) => {
            try {
                if (msg.body.replaceAll(" ", "") == "") return;
                let _args = msg.body.split(/ +/g);
                let args = _args.slice(1);
                let cmd = _args[0].slice(config.prefix.length).toLowerCase();
                // if (!msg.body.startsWith(config.prefix)) {
                //     if (
                //         !(
                //             !config.whitelisted ? [] : config.whitelisted
                //         ).includes(global.getNumber(msg.from))
                //     )
                //         return;
                //     let accurate = customCMDS.includes(_args[0].toLowerCase());
                //     let conversation = conversations[msg.from];
                //     if (!conversation) conversation = defPrompt;
                //     conversation.push({ role: "user", content: msg.body });
                //     if (JSON.stringify(conversation).length >= 9000) {
                //         conversation = defPrompt;
                //         conversation.push({ role: "user", content: msg.body });
                //     }
                //     let response = await global.getAIResponse(
                //         accurate,
                //         msg.body,
                //         conversation
                //     );
                //     if (accurate)
                //         conversation.push({
                //             role: "assistant",
                //             content: response,
                //         });
                //     conversations[msg.from] = conversation;
                //     msg.reply(
                //         !response ? `Error occurred! !حدث خطأ` : response
                //     );
                //     return;
                // }
                if (
                    cmd == "whitelist" &&
                    msg.from.includes(config.developer.id)
                ) {
                    let list = !config.whitelisted ? [] : config.whitelisted;
                    let logMessage = `${global.getCurrentDate()}: Log\n`;
                    let changed = false;
                    for (var a in args)
                        if (a > 0) {
                            if (args[0] == "add") {
                                try {
                                    if (
                                        !(await global.getNumberEncoded(
                                            args[a]
                                        ))
                                    )
                                        continue;
                                } catch (error) {
                                    continue;
                                }
                                if (list.includes(args[a]))
                                    logMessage += `${args[a]} is already whitelisted\n`;
                                else {
                                    list?.push(args[a]);
                                    logMessage += `*${args[a]}* was whitelisted\n`;
                                }
                                changed = true;
                            } else if (args[0] == "remove") {
                                if (!list.includes(args[a]))
                                    logMessage += `${args[a]} is not whitelisted\n`;
                                else {
                                    list = list?.filter(
                                        (e) => e != msg.id.remote
                                    );
                                    logMessage += `*${args[a]}* was *un*whitelisted\n`;
                                }
                                changed = true;
                            }
                        }
                    config.whitelisted = list;
                    if (!changed) {
                        logMessage += `Current whitelisted ID(s): [amount=${list.length}]\n`;
                        for (var a in list)
                            logMessage += `${parseInt(a) + 1}) ${list[a]}\n`;
                    }
                    client?.sendMessage(msg.from, logMessage);
                    global.saveConfig();
                }
                if (cmd == "id")
                    client.sendMessage(
                        msg.from,
                        `ID of this group is ` + msg.id.remote
                    );
                if (cmd == "add-saved-numbers") {
                    list.forEach((number) => {
                        setTimeout(() => {
                            let full = number.replaceAll(" ", "");
                            if (full.startsWith("2"))
                                full = full.substring(1, full.length);
                            if (full.startsWith("0")) {
                                try {
                                    client?.sendMessage(
                                        `2${full}@c.us`,
                                        `بسم الله الرحمن الرحيم
                                أولا الجروب ده إن شاء الله هيكون فيه آيات قرآنية وأذكار وأحاديث تذكرك بالله و الموضوع صدقه جارية و اللي يقدر يدخل حد ربنا يجزيه خير وإن شاء الله يكون في ميزان حسناتكم

(حاليا بيبعت ايات قرآنية كل ١٠ دقائق ولكن جاري التطوير أنه يرسل احاديث صحيحة وأذكار بأقرب وقت)

${groupLink}`
                                    );
                                    console.log(`sent ad message to ${full}`);
                                } catch (error) {
                                    console.log(
                                        `error ecurred on number[${number}]`
                                    );
                                }
                            }
                        }, 1000);
                    });
                }
            } catch (error) {}
        });
    }
    generateQRCode(qr) {
        global.print("===============================================");
        console.log(" ");
        qrcode.generate(qr, { small: true });
        console.log(" ");
        global.print("===============================================");
    }
    initialize() {
        this.client.initialize();
    }
    sendMessageToGroup(id, message) {
        try {
            if (this.client.isConnected)
                this.client.sendMessage(id + "@g.us", message);
        } catch (error) {
            global.print(`Error while trying to send a whatsapp message.`);
            console.error(error);
        }
    }
    sendMessageToAllGroups(message) {
        config.groups.forEach((g) => this.sendMessageToGroup(g, message));
    }
}

class Global {
    constructor() {
        this.print(`WhatsApp Charity bot is now loading.`);
    }

    loadContactsFromFile(file) {
        workbook.xlsx.readFile("./contacts.xlsx").then(() => {
            for (let i = 2; i < 857; i++) {
                let n = `${workbook.worksheets[0].getCell(i, 31).value}`;
                if (
                    n == null ||
                    n == "null" ||
                    n.includes("*") ||
                    n.length > 15 ||
                    n.length < 9
                )
                    continue;
                n = n.replace(" ", "").replace("+2", "").split(":::")[0];
                if (n.length < 11) n = `0${n}`;
                list.push(n);
            }
        });
    }
    print(msg) {
        return console.log(`${this.getCurrentDate()}: ${msg}`);
    }
    getCurrentDate() {
        return (
            new Date().toDateString() + " - " + new Date().toLocaleTimeString()
        );
    }
    getCurrentSurah(verse = config.currentVerse) {
        return quran.filter((e) => e.id == this.getCurrentSurah_ID(verse))[0];
    }
    getCurrentAyah(verse = config.currentVerse) {
        return this.getCurrentSurah(verse).verses.filter(
            (v) => v.id == this.getCurrentAyah_ID(verse)
        )[0];
    }
    getCurrentSurah_ID(verse = config.currentVerse) {
        return parseInt(verse?.split(":")[0] || "1");
    }
    getCurrentAyah_ID(verse = config.currentVerse) {
        return parseInt(verse?.split(":")[1] || "1");
    }
    isFirstVerse() {
        return this.getCurrentAyah_ID() == 1;
    }
    isLastVerse() {
        return this.getCurrentSurah().total_verses <= this.getCurrentAyah_ID();
    }
    seal() {
        console.log("Sealing in 5 seconds...");
        setTimeout(() => {
            config.sealed = config.sealed + 1;
            console.log("SEALED");
            process.exit(1);
        }, 5000);
    }
    handleAddingVerse(verse = config.currentVerse) {
        if (!client.isConnected) return;
        if (config.currentVerse == "1:1") config.seal_started_at = Date.now();
        if (this.isLastSurah() && this.isLastVerse()) {
            interval.send(false);
            this.print(
                `Finished ${surah.id}-${surah.transliteration} [${surah.total_verses}]`
            );
            config.surahs_read = config.surahs_read + 1;
            this.seal();
            return (config.currentVerse = `1:1`);
        } else if (this.isLastVerse()) {
            let surah = this.getCurrentSurah();
            this.print(
                `Finished ${surah.id}-${surah.transliteration} [${surah.total_verses}]`
            );
            config.surahs_read = config.surahs_read + 1;
            return (config.currentVerse = `${this.getCurrentSurah_ID() + 1}:1`);
        } else {
            config.ayahs_read = config.ayahs_read + 1;
            return (config.currentVerse = `${this.getCurrentSurah_ID()}:${
                this.getCurrentAyah_ID() + 1
            }`);
        }
    }
    isLastSurah() {
        return this.getCurrentSurah_ID() >= 114;
    }
    saveConfig() {
        config.up_time = (Date.now() - config.online_since) / 3600000;
        fs.writeJsonSync("./database.json", config);
    }
    // ============================================= [ OpenAI ]
    getAIResponse = async (slow, prompt, conversation) => {
        try {
            return slow
                ? (
                      await openai.createChatCompletion(
                          {
                              model: "gpt-3.5-turbo",
                              messages: conversation,
                              temperature: 0.3,
                              max_tokens: 4000,
                          },
                          { timeout: 1000 * 60 * 1.5 }
                      )
                  ).data.choices[0].message.content
                : (
                      await openai.createCompletion(
                          {
                              model: "text-davinci-003",
                              prompt: prompt,
                              temperature: 0.3,
                              max_tokens: 2000,
                          },
                          { timeout: 1000 * 60 * 1.5 }
                      )
                  ).data.choices[0].text.replace("\n\n", "");
        } catch (error) {
            console.log(error);
            console.log("----------------------------------------------");
            global.print(`ChatGPT Error: ${error.message}`);
            console.log("----------------------------------------------");
            return `Error occurred! !حدث خطأ`;
        }
    };
    async getNumberEncoded(number) {
        return await client.getNumberId(
            `2${number.toString().replace(/[- )(]/g, "")}`
        );
    }
    getNumberId(number) {
        return `2${number.toString().replace(/[- )(]/g, "")}@c.us`;
    }
    getNumber(number) {
        return number.replaceAll("@c.us", "").substring(1);
    }
}

// ================================================= [ - Initializing Project - ]

const global = new Global();
const app = new WhatsApp(client);
const interval = new Interval();
app.start();
// global.loadContactsFromFile("contacts.xlsx");

app.initialize();
