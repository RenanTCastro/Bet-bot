const scoreBing = require("scorebing-api");
const TelegramBot = require("node-telegram-bot-api");

const token = "5844216097:AAGtlZ-lN2khzIUseRyFySPzKe8kW3pHXTg";
const bot = new TelegramBot(token, { polling: true });

let lastMessage = [];
let count = 0;

const getScoreBingData = async () => {
  const score = new scoreBing();
  let matches = await score.req(0).then((res) => {
    let data = res.rs;
    let matchesData = data.map((e, i) => {
      if (e.rd && e.plus) {
        return {
          campeonato: e.league.fn,
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

const estrategiaEscanteio = async () => {
  const matches = await getScoreBingData();

  const selecionarJogosPorMinutos = matches.filter((e) => {
    const primeiroTempo =
      parseInt(e.minutos, 10) >= 34 && parseInt(e.minutos, 10) <= 40;
    const segundoTempo =
      parseInt(e.minutos, 10) >= 78 && parseInt(e.minutos, 10) <= 85;
    const bolaRolando = e.minutos !== "HT" && e.minutos !== "NS";

    if (bolaRolando && (primeiroTempo || segundoTempo)) {
      return e;
    }
  });

  const selecionarJogosPorAPPM = selecionarJogosPorMinutos.filter((e) => {
    const ataquesPerigosos =
      parseInt(e.ataquesPerigososFora) + parseInt(e.ataquesPerigososCasa);
    const primeiroTempo =
      parseInt(e.minutos, 10) >= 34 && parseInt(e.minutos, 10) <= 40;
    const segundoTempo =
      parseInt(e.minutos, 10) >= 79 && parseInt(e.minutos, 10) <= 85;

    if (ataquesPerigosos / parseInt(e.minutos) >= 1) {
      if (
        (parseInt(e.ataquesPerigososFora) / parseInt(e.minutos) >= 0.7 &&
          ((primeiroTempo && e.escanteiosFora >= 4) ||
            (segundoTempo && e.escanteiosFora >= 7))) ||
        (parseInt(e.ataquesPerigososCasa) / parseInt(e.minutos) >= 0.7 &&
          ((primeiroTempo && e.escanteiosCasa >= 4) ||
            (segundoTempo && e.escanteiosCasa >= 7)))
      ) {
        return e;
      }
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
      parseInt(e.minutos, 10) >= 34 && parseInt(e.minutos, 10) <= 40;
    const segundoTempo =
      parseInt(e.minutos, 10) >= 79 && parseInt(e.minutos, 10) <= 85;

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

const estrategiaGolHT = async () => {
  const matches = await getScoreBingData();
  const selecionarJogosPorMinutos = matches.filter((e) => {
    const primeiroTempo =
      parseInt(e.minutos, 10) >= 17 && parseInt(e.minutos, 10) <= 25;
    const bolaRolando = e.minutos !== "HT" && e.minutos !== "NS";

    if (bolaRolando && primeiroTempo) {
      return e;
    }
  });

  const selecionarJogosPorLiveStats = selecionarJogosPorMinutos.filter((e) => {
    parseInt(e.chutesGolFora) +
      parseInt(e.chutesForaFora) +
      parseInt(e.escanteiosFora);

    if (parseInt(e.golsCasa) === 0 && parseInt(e.golsFora) === 0) {
      if (parseInt(e.ataquesPerigososCasa) >= 1) {
        if (
          parseInt(e.chutesGolCasa) >= 2 &&
          parseInt(e.chutesForaCasa) >= 2 &&
          parseInt(e.escanteiosCasa) >= 1 &&
          parseInt(e.posseBolaCasa) >= 55
        ) {
          return e;
        }
      } else if (parseInt(e.ataquesPerigososFora) >= 1) {
        if (
          parseInt(e.chutesGolFora) >= 2 &&
          parseInt(e.chutesForaFora) >= 2 &&
          parseInt(e.escanteiosFora) >= 1 &&
          parseInt(e.posseBolaFora) >= 55
        ) {
          return e;
        }
      }
    }
  });

  return selecionarJogosPorLiveStats;
};

setInterval(async () => {
  const chatId = "-1001583525393";
  const resp = await estrategiaEscanteio();
  const respGolHT = await estrategiaGolHT();
  lastMessage.push(...resp);
  lastMessage.push(...respGolHT);
  count++;
  if (count == 15) {
    lastMessage = [];
    count = 0;
  }

  lastMessage.push(...resp);
  count++;
  if (count == 10) {
    lastMessage = [];
    count = 0;
  }

  const messageEscanteio = resp.map((e) => {
    const msg =
      "____________________________________\n\n" +
      "🏆 Campeonato: " +
      e.campeonato +
      "\n🏟️ Partida: " +
      e.casa +
      " x " +
      e.fora +
      "\n" +
      "⏱️ " +
      e.minutos +
      " minutos\n\n" +
      "🏆 Placar: " +
      e.golsCasa +
      " x " +
      e.golsFora +
      "\n" +
      "🚩 Escanteios: " +
      e.escanteiosCasa +
      " x " +
      e.escanteiosFora +
      "\n" +
      "🏠 APPM Casa: " +
      (parseInt(e.ataquesPerigososCasa) / parseInt(e.minutos)).toFixed(2) +
      "\n🚗 APPM Fora: " +
      (parseInt(e.ataquesPerigososFora) / parseInt(e.minutos)).toFixed(2) +
      "\n🔥 APPM Total: " +
      (
        (parseInt(e.ataquesPerigososCasa) + parseInt(e.ataquesPerigososFora)) /
        parseInt(e.minutos)
      ).toFixed(2) +
      "\n\n" +
      "🟥 Cartão vermelho: " +
      e.cartoesVermelhosCasa +
      " x " +
      e.cartoesVermelhosFora +
      "\n\n";
    bot.sendMessage(chatId, msg);
  });

  const messageGolHT = respGolHT.map((e) => {
    const msg =
      "____________________________________\n\n" +
      "🎮 Oportunidade de over 0.5HT - verique se time mais perigoso tem histórico com mais de 70% de over 0.5HT -\n" +
      "\n🏆 Campeonato: " +
      e.campeonato +
      "\n🏟️ Partida: " +
      e.casa +
      " x " +
      e.fora +
      "\n" +
      "⏱️ " +
      e.minutos +
      " minutos\n\n" +
      "🏆 Placar: " +
      e.golsCasa +
      " x " +
      e.golsFora +
      "\n" +
      "🚩 Escanteios: " +
      e.escanteiosCasa +
      " x " +
      e.escanteiosFora +
      "\n" +
      "🏠 APPM Casa: " +
      (parseInt(e.ataquesPerigososCasa) / parseInt(e.minutos)).toFixed(2) +
      "\n🚗 APPM Fora: " +
      (parseInt(e.ataquesPerigososFora) / parseInt(e.minutos)).toFixed(2) +
      "\n🔥 APPM Total: " +
      (
        (parseInt(e.ataquesPerigososCasa) + parseInt(e.ataquesPerigososFora)) /
        parseInt(e.minutos)
      ).toFixed(2) +
      "\n\n" +
      "🟥 Cartão vermelho: " +
      e.cartoesVermelhosCasa +
      " x " +
      e.cartoesVermelhosFora +
      "\n\n";
    bot.sendMessage(chatId, msg);
  });

  const d = new Date();
  console.log("Atualizado... ", d.toString());
}, 120000);
