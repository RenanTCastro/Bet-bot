const scoreBing = require("scorebing-api");
const TelegramBot = require("node-telegram-bot-api");

const token = "5844216097:AAGtlZ-lN2khzIUseRyFySPzKe8kW3pHXTg";
const bot = new TelegramBot(token, { polling: true });

let lastMessage = [];

const getScoreBingData = async () => {
  const score = new scoreBing();
  let matches = await score.req(0).then((res) => {
    let data = res.rs;
    let matchesData = data.map((e, i) => {
      if (e.rd && e.plus) {
        return {
          casa: e.host.n,
          fora: e.guest.n,
          minutos: e.status,
          golsCasa: e.rd.hg,
          golsFora: e.rd.gg,
          escanteiosCasa: e.rd.hc,
          escanteiosFora: e.rd.gc,
          cartoesAmarelosCasa: e.rd.hy,
          cartoesAmarelosFora: e.rd.gy,
          cartoesVermelhosCasa: e.rd.hr,
          cartoesVermelhosFora: e.rd.gr,
          ataquesCasa: e.plus.ha,
          ataquesFora: e.plus.ga,
          ataquesPerigososCasa: e.plus.hd,
          ataquesPerigososFora: e.plus.gd,
          chutesGolCasa: e.plus.hso,
          chutesGolFora: e.plus.gso,
          chutesForaCasa: e.plus.hsf,
          chutesForaFora: e.plus.gsf,
          posseBolaCasa: e.plus.hqq,
          posseBolaFora: e.plus.gqq,
        };
      }
    });
    let matchesFiltred = matchesData.filter((e) => {
      return e !== undefined;
    });
    const ma = matchesFiltred.filter((e) => {
      const a = lastMessage.findIndex((l) => {
        return l.casa === e.casa;
      });
      if (a === -1) {
        return e;
      }
    });
    return ma;
  });
  return matches;
};

const estrategiaGol = async () => {
  const matches = await getScoreBingData();

  const selecionarJogosPorMinutos = matches.filter((e) => {
    const primeiroTempo =
      parseInt(e.minutos, 10) >= 37 && parseInt(e.minutos, 10) <= 45;
    const segundoTempo =
      parseInt(e.minutos, 10) >= 85 && parseInt(e.minutos, 10) <= 90;
    const bolaRolando = e.minutos !== "HT" && e.minutos !== "NS";

    if (bolaRolando && (primeiroTempo || segundoTempo)) {
      return e;
    }
  });

  const selecionarJogosPorAPPM = selecionarJogosPorMinutos.filter((e) => {
    const ataquesPerigosos =
      parseInt(e.ataquesPerigososFora) + parseInt(e.ataquesPerigososCasa);

    if (ataquesPerigosos / parseInt(e.minutos) >= 1) {
      return e;
    }
  });

  const selecionarJogosPorChutes = selecionarJogosPorAPPM.filter((e) => {
    const chancesCasa =
      parseInt(e.chutesGolCasa) +
      parseInt(e.chutesForaCasa) +
      parseInt(e.escanteiosCasa);
    const chancesFora =
      parseInt(e.chutesGolFora) +
      parseInt(e.chutesForaFora) +
      parseInt(e.escanteiosFora);
    const primeiroTempo =
      parseInt(e.minutos, 10) >= 37 && parseInt(e.minutos, 10) <= 45;
    const segundoTempo =
      parseInt(e.minutos, 10) >= 85 && parseInt(e.minutos, 10) <= 90;

    if (primeiroTempo && (chancesCasa > 8 || chancesFora > 8)) {
      return e;
    } else if (segundoTempo && (chancesCasa > 15 || chancesFora > 15)) {
      return e;
    }
  });

  const selecionarJogosPorDiferencaGols = selecionarJogosPorChutes.filter(
    (e) => {
      const diferencaGols = parseInt(e.golsCasa) - parseInt(e.golsFora);
      if (Math.abs(diferencaGols) <= 1) {
        return e;
      }
    }
  );

  return selecionarJogosPorDiferencaGols;
};

setInterval(async () => {
  const chatId = "-1001748075889";
  const resp = await estrategiaGol();
  lastMessage.push(...resp);
  const message = resp.map((e) => {
    const msg =
      "🎮Partida: " +
      e.casa +
      " x " +
      e.fora +
      "\n" +
      "⏱️  " +
      e.minutos +
      " minutos\n" +
      "🏆Placar: " +
      e.golsCasa +
      " x " +
      e.golsFora +
      "\n" +
      "🔥 APPM: " +
      (
        (parseInt(e.ataquesPerigososCasa) + parseInt(e.ataquesPerigososCasa)) /
        parseInt(e.minutos)
      ).toFixed(2) +
      "\n" +
      "🟥 Cartão vermelho: " +
      e.cartoesVermelhosCasa +
      " x " +
      e.cartoesVermelhosFora +
      "\n";
    bot.sendMessage(chatId, msg);
  });
  console.log("Atualizado...");
}, 55000);
// estategiaGol();
