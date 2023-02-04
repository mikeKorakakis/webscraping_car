const cheerio = require("cheerio");
const fs = require("fs");
var Queue = require("bull");
var slugify = require("slugify");
let createCsvHeader = true,
	scrapeProductLinksBool = !true;
scrapeProductDetailsBool = true;
pages = 42;
const {
	download,
	spliceSlice,
	getValue,
	getDescription,
	getCondition,
	getFits,
	fetchHtml,
} = require("./helpers.js");

const csvHeader =
	"name:el,name:en,slug,description,assets,facets:el,facets:en,optionGroups,optionValues,sku,price,taxCategory,stockOnHand,product:car_url,product:sku,trackInventory,variantAssets,variantFacets\n";
const baseUrl = "https://zenone.car.gr";
const basePaginationUrl = "https://zenone.car.gr/parts/?pg=";
const paginationLinks = Array.from({ length: pages }, (_, i) => i).map(
	(num) => basePaginationUrl + (num + 1)
);

var productLinkQueue = new Queue("productLink queue", "redis://127.0.0.1:6379");
var productDetailsQueue = new Queue("models queue", "redis://127.0.0.1:6379");

if (createCsvHeader) {
	fs.appendFile("productDetails.csv", csvHeader, function (err) {
		if (err) return console.log(err);
	});
}

const processProductLinks = async (url) => {
	const html = await fetchHtml(url);
	if (!html) return;
	const selector = cheerio.load(html);
	var links = [];

	const searchResults = selector("a.row-anchor");
	searchResults.each((idx, value) => {
		var link = selector(value).attr("href");
		console.log("link: ", link);
		links.push(baseUrl + link);
	});

	fs.appendFile("productLinks.csv", links.toString(), function (err) {
		if (err) return console.log(err);
	});
};

const scrapeProductLinks = () => {
	fs.writeFile("./productLinks.csv", "", function (err) {
		if (err) return console.log(err);
	});

	paginationLinks.forEach(async (url) => {
		console.log(url);
		productLinkQueue.add({ url });
	});
};

productLinkQueue.process(async (job) => {
	console.log("productLink job", job.data.url);
	await processProductLinks(job.data.url);
});

productLinkQueue.on("completed", function (job, result) {
	console.log("completed");
});

scrapeProductLinksBool && scrapeProductLinks();

const scrapeProductDetails = () => {
	// const url = "https://bikez.com/year/2021-motorcycle-models.php";
	fs.writeFile("./productDetails.csv", "", function (err) {
		if (err) return console.log(err);
	});

	fs.readFile("./productLinks.csv", "utf8", (err, data) => {
		if (err) {
			console.error(err);
			return;
		}

		let urls = data.split(",");
		urls.forEach(async (url) => {
			console.log(url);
			productDetailsQueue.add({ url });
		});
	});
};

productDetailsQueue.process(async (job) => {
	console.log("productDetails job", job.data.url);
	await processProductDetails(job.data.url);
});

productDetailsQueue.on("completed", function (job, result) {
	console.log("completed");
});

const processProductDetails = async (url) => {
	// const siteUrl = "https://bikez.com";

	const html = await fetchHtml(url);

	const selector = cheerio.load(html);

	let imageSelector = selector("img.thumb-img");
	const imageArr = [];
	imageSelector.each((index, item) => {
		const src = selector(item) && selector(item).attr("src");
		const srcBig = spliceSlice(src, src.lastIndexOf("v"), 1, "z");
		download(
			srcBig,
			srcBig.slice(srcBig.lastIndexOf("/") + 1),
			function () {}
		);
		imageArr.push(
			srcBig.replace(
				"https://static.car.gr/",
				"../../../../../src/mock-data/images/"
			)
		);
	});
	let image = "";
	if (imageArr.length === 0) {
		imageSelector = selector("img.thumb-img");
		const src = selector(item) && selector(item).attr("src");
		download(src, src.slice(srcBig.lastIndexOf("/") + 1), function () {});
		image = src;
	} else {
		image = imageArr.join("|");
	}

	const title = getValue("Τίτλος", selector).replaceAll('"', "'");
	let price = getValue("Τιμή", selector);
	price = price.split(" €")[0].replaceAll(",", ".");
	price = (Number(price) / 1.24).toFixed(2);
	const aftermarket_code = getValue("Εργοστασιακός κωδικός", selector);

	const slug = `no_code_${slugify(title.substring(0, 30), { lower: true })}`;
	const description = getDescription(selector).replaceAll('"', "'");

	const modelArr = [];
	const manufacturerArr = [];
	const fits = getFits(selector);
	fits.forEach((item, index) => {
		if (!modelArr.includes("model:" + item)) modelArr.push("model:" + item);
		const man = item.split(" ")[0];
		if (!manufacturerArr.includes("manufacturer:" + man))
			manufacturerArr.push("manufacturer:" + man);
	});
	let model = modelArr.join("|");
	let manufacturer = manufacturerArr.join("|");
	let category = getValue("Κατηγορία", selector);
	if (category.includes(",")) {
		category = category.split(",");
		const categoryArr = [];
		category = category.forEach((item) => {
			categoryArr.push("category:" + item.trim());
		});
		category = categoryArr.join("|");
	} else {
		category = "category:" + category;
	}
	let brand = getValue("Κατασκευαστής", selector)
		.replace(`- ${aftermarket_code}`, "")
		.trim();
	brand = "brand:" + brand;
	let condition = getCondition(selector);
	condition = "condition:" + condition;

	let facets =
		category +
		"|" +
		brand +
		"|" +
		condition +
		"|" +
		model +
		"|" +
		manufacturer;
	facets = facets.replaceAll("||", "|");
	if (facets.lastIndexOf("|") === facets.length - 1)
		facets = facets.slice(0, facets.length - 1);

	const car_url = getValue("Σύνδεσμος", selector);

	const fileContent = `"${title}","${title}",${slug},"${description}",${image},${facets},${facets},,,${aftermarket_code},"${price}",,100,${car_url},${aftermarket_code},,,\n`;
	// console.log("filecontent",fileContent);

	// console.log("name:el",title)
	// console.log("name:en",title)
	// console.log("slug",aftermarket_code)
	// console.log("description",description)
	// console.log("assets",image)
	// console.log("facets:el",facets)
	// console.log("facets:en",facets)
	// console.log("optionGroups",      )
	// console.log("optionValues",    )
	// console.log("sku",aftermarket_code)
	// console.log("price",price)
	// console.log("taxCategory",    )
	// console.log("stockOnHand",100)
	// console.log("trackInventory",    )
	// console.log("variantAssets",    )
	// console.log("variantFacets",    )
	fs.appendFile("productDetails.csv", fileContent, function (err) {
		if (err) return console.log(err);
	});
};
scrapeProductDetailsBool && scrapeProductDetails();
