const Promise = require("bluebird");
const redis = require("redis");
const inquirer = require('inquirer');

var summary = "";
var questions = [];

const getAnswer = async (opt) => {
	let { type } = opt;
	let { answer } = await inquirer.prompt(opt);

	if ((type === 'number' && answer > 0) || (type === 'input' && answer.trim())) {
		return answer;
	} else {
		return await getAnswer(opt);
	}
};

const generateArray = async (nb, uid, msg) => {
	let res = [];

	if (uid == "staff_nb") {
		await Promise.mapSeries(new Array(nb).fill(0), (val, i) => {
			res.push([{
				type: "input",
				name: "answer",
				message: `${msg}${i + 1} : `,
				id: `staff_name_${i}`
			}]);
		});
		res.push([{
			type: "number",
			name: "answer",
			message: "Nombre de camion : ",
			id: "truck_nb",
			subMessage: "Volume en m³ du camion n°"
		}]);
	} else {
		await Promise.mapSeries(new Array(nb).fill(0), (val, i) => {
			res.push([{
				type: "number",
				name: "answer",
				message: `${msg}${i + 1} : `,
				id: `truck_volume_${i}`
			}],
			[{
				type: "input",
				name: "answer",
				message: `Type de camion n°${i + 1} : `,
				id: `truck_type_${i}`
			}],
			);
		});
	}
	return res;
};


const core = async (questions) => {
	return Promise.mapSeries(questions, async (question) => {
		question = question[0];
		let answer = await redisClient.get(question.id);

		if (answer) {
			console.log(`? ${question.message}${answer}`);
		} else {
			answer = await getAnswer(question);
			let redisRes = redisClient.set(question.id, answer.toString());
		}
		summary += `${question.message}${answer.toString()}\n`;

		if (question.id == "staff_nb" || question.id == "truck_nb") {
			questions = await generateArray(parseInt(answer), question.id, question.subMessage);
			await core(questions);
		}
	});
};

const summarize = async () => {
	let { answer } = await inquirer.prompt([{ name: "answer", message: "Les informations sont elles valides ? (y/n): "}]);
	
	if (answer == "y") {
		console.log("\nMerci, informations envoyées...\n\n");
		await redisClient.flushAll();
		main();
	} else if (answer == "n") {
		console.log("\n\n");
		await redisClient.flushAll();
		main();
	} else {
		await summarize();
	}
};

const main = async () => {
	questions = [
		[{
			type: 'input',
			name: "answer",
			message: "Nom de l'utilisateur: ",
			id: "user_name"
		}],
		[{
			type: "input",
			name: "answer",
			message: "Nom de la société: ",
			id: "company_name"
		}],
		[{
			type: "number",
			name: "answer",
			message: "Nombre d'employés: ",
			id: "staff_nb",
			subMessage: "Nom de l'employé n°"
		}]
	];
	console.log("-------- Outil d'enregistrement --------")

	await core(questions);
	console.log(`\n---------------------------------------\nRécapitulatif\n\n${summary}---------------------------------------\n`);
	await summarize();
	return true;
}

var redisClient = redis.createClient(6379, '127.0.0.1');
redisClient.connect().then(() => {
	main();
}).catch((err) => {
	console.error("ERROR #2432 - Can't connect to REDIS ...");
});

redisClient.on('error', (err) => {
	console.log("\n\nERROR database unreachable - Try again later ...");
	process.exit(1);
});