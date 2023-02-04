const axios = require("axios");
const cheerio = require("cheerio");
const html = require("./html.js");
const fs = require("fs");
const request = require("request");


function sleep(milliseconds) {
	const date = Date.now();
	let currentDate = null;
	do {
		currentDate = Date.now();
	} while (currentDate - date < milliseconds);
}

var download = function (uri, filename, callback) {
	request.head(uri, function (err, res, body) {
		// console.log("content-type:", res.headers["content-type"]);
		// console.log("content-length:", res.headers["content-length"]);

		//check if file exists
		if (fs.existsSync("images/" + filename)) {
			console.log("file exists");
			return;
		}

		request(uri)
			.pipe(fs.createWriteStream("images/" + filename))
			.on("close", callback);
	});
};
function spliceSlice(str, index, count, add) {
	// We cannot pass negative indexes directly to the 2nd slicing operation.
	if (index < 0) {
		index = str.length + index;
		if (index < 0) {
			index = 0;
		}
	}

	return str.slice(0, index) + (add || "") + str.slice(index + count);
}


const getValue = (title,selector) => {
	const value =
		selector(`tr:contains("${title}") td:nth-of-type(2)`).first().text() &&
		selector(`tr:contains("${title}") td:nth-of-type(2)`)
			.first()
			.text()
			.trim()
			.replace(/\s+/g, " ");
	return value;
};

const getDescription = (selector) => {
	const value =
		selector(`div.tw-break-words `).first().text() &&
		selector(`div.tw-break-words `)
			.first()
			.text()
			.trim()
			.replace(/\s+/g, " ");
	return value;
};

const getCondition = (selector) => {
	const value = cheerio(
		selector(`div.text-muted.px-1>div:nth-child(2)`).text() &&
			selector(`div.text-muted.px-1>div:nth-child(2)`)[1]
	)
		.text()
		.trim()
		.replace(/\s+/g, " ");
	return value;
};

const getFits = (selector) => {
	const value =
		selector(
			`tr:contains("Μαρκα/μοντέλο οχήματος") td:nth-of-type(2) span:first-child div`
		) &&
		selector(
			`tr:contains("Μαρκα/μοντέλο οχήματος") td:nth-of-type(2) span:first-child div`
		);
	const values = [];
	value.map((i, item) => {
		// console.log(i)
		values.push(cheerio(item).text().trim().replace(/\s+/g, " "));
	});
	return values;
};

const fetchHtml = async (url) => {
	try {
        sleep(1000)
		const { data } = await axios.get(url);
		return data;
	} catch (error) {
        console.error("Error", error.message);
		if (url.includes("https://zenone.car.gr/parts/?pg="))
			fs.appendFile(
				"productLinksError.csv",
				url.toString(),
				function (err) {
					if (err) return console.log(err);
				}
			);
		else
			fs.appendFile(
				"productDetailsError.csv",
				url.toString(),
				function (err) {
					if (err) return console.log(err);
				}
			);
		if (error.message.includes("429")) sleep(60000);
		console.error("Error", error.message);
	}
	//   return cheerio.load(data)
};

module.exports = {
    sleep,
    download,
    spliceSlice,
    getValue,
    getDescription,
    getCondition,
    getFits,
    fetchHtml
}