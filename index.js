import Promise from 'bluebird';
import redis from 'redis';
import inquirer from 'inquirer';
import dotenv from 'dotenv';

if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env' });
} else {
  dotenv.config({ path: '.env-dev' });
}

const redisClient = redis.createClient({
  socket: {
    port: 6379,
    host: process.env.REDIS_HOST,
  },
});

let main = () => {};
let summary = '';

const getAnswer = async (opt) => {
  const { type } = opt;
  const { answer } = await inquirer.prompt(opt);

  if ((type === 'number' && answer > 0) || (type === 'input' && answer.trim())) {
    return answer;
  }

  return getAnswer(opt);
};

const generateArray = async (nb, uid, msg) => {
  const res = [];

  if (uid === 'staff_nb') {
    await Promise.mapSeries(new Array(nb).fill(0), (val, i) => {
      res.push([{
        type: 'input',
        name: 'answer',
        message: `${msg}${i + 1} : `,
        id: `staff_name_${i}`,
      }]);
    });
    res.push([{
      type: 'number',
      name: 'answer',
      message: 'Nombre de camion : ',
      id: 'truck_nb',
      subMessage: 'Volume en m³ du camion n°',
    }]);
  } else {
    await Promise.mapSeries(new Array(nb).fill(0), (val, i) => {
      res.push(
        [{
          type: 'number',
          name: 'answer',
          message: `${msg}${i + 1} : `,
          id: `truck_volume_${i}`,
        }],
        [{
          type: 'input',
          name: 'answer',
          message: `Type de camion n°${i + 1} : `,
          id: `truck_type_${i}`,
        }],
      );
    });
  }
  return res;
};

const core = async (coreQuestions) => Promise.mapSeries(coreQuestions, async (question) => {
  const { id, message, subMessage } = question[0];
  let answer = await redisClient.get(id);

  if (answer) {
    console.log(`? ${message}${answer}`);
  } else {
    answer = await getAnswer(question[0]);
    redisClient.set(id, answer.toString());
  }
  summary += `${message}${answer.toString()}\n`;

  if (id === 'staff_nb' || id === 'truck_nb') {
    const questions = await generateArray(parseInt(answer, 10), id, subMessage);
    await core(questions);
  }
});

const summarize = async () => {
  const { answer } = await inquirer.prompt([{ name: 'answer', message: 'Les informations sont elles valides ? (y/n): ' }]);

  if (answer === 'y') {
    console.log('\nMerci, informations envoyées...\n\n');
    await redisClient.flushAll();
    main();
  } else if (answer === 'n') {
    console.log('\n\n');
    await redisClient.flushAll();
    main();
  } else {
    await summarize();
  }
};

main = async () => {
  const questions = [
    [{
      type: 'input',
      name: 'answer',
      message: "Nom de l'utilisateur: ",
      id: 'user_name',
    }],
    [{
      type: 'input',
      name: 'answer',
      message: 'Nom de la société: ',
      id: 'company_name',
    }],
    [{
      type: 'number',
      name: 'answer',
      message: "Nombre d'employés: ",
      id: 'staff_nb',
      subMessage: "Nom de l'employé n°",
    }],
  ];
  console.log("-------- Outil d'enregistrement --------");

  await core(questions);
  console.log(`\n---------------------------------------\nRécapitulatif\n\n${summary}---------------------------------------\n`);
  await summarize();
  return true;
};

redisClient.connect().then(() => {
  main();
}).catch((err) => {
  console.error(`ERROR #2432 - Can't connect to REDIS ...\n${err}`);
});

redisClient.on('error', (err) => {
  console.log(`\n\nERROR: REDIS unreachable - Try again later ...\n${err}`);
  process.exit(1);
});
