const cheerio = require("cheerio");
const html = require("./html.js");
const fs = require("fs");
const csvHeader =
	"name:el,name:en,slug,description,assets,facets:el,facets:en,optionGroups,optionValues,sku,price,taxCategory,stockOnHand,trackInventory,variantAssets,variantFacets\n";

const {
	sleep,
	download,
	spliceSlice,
	getValue,
	getDescription,
	getCondition,
	getFits,
} = require("./helpers.js");

const selector = cheerio.load(html);
const imageSelector = selector("img.thumb-img");
const imageArr = [];
imageSelector.each((index, item) => {
	const src = selector(item) && selector(item).attr("src");
	const srcBig = spliceSlice(src, 33, 1, "z");
	download(srcBig, srcBig.slice(srcBig.lastIndexOf("/") + 1), function () {});
	imageArr.push(
		srcBig.replace(
			"https://static.car.gr/",
			"../../../../../src/mock-data/images/"
		)
	);
});
const image = imageArr.join("|");

const title = getValue("Τίτλος", selector);
let price = getValue("Τιμή", selector);
price = price.split(" €")[0].replace(",", ".");
const aftermarket_code = getValue("Εργοστασιακός κωδικός", selector);
const description = getDescription(selector);

const modelArr = [];
const manufacturerArr = [];
const fits = getFits(selector);
fits.forEach((item, index) => {
	modelArr.push("model:" + item);
	const man = item.split(" ")[0];
	if (!manufacturerArr.includes(man))
		manufacturerArr[index] = "manufacturer:" + man;
});
let model = modelArr.join("|");
let manufacturer = manufacturerArr.join("|");
let category = getValue("Κατηγορία", selector);
category = "category:" + category;
let brand = getValue("Κατασκευαστής",selector).replace(`- ${aftermarket_code}`, "");
brand = "brand:" + brand;
let condition = getCondition(selector);
condition = "condition:" + condition;

const facets =
	category + "|" + brand + "|" + condition + "|" + model + "|" + manufacturer;

const car_url = getValue("Σύνδεσμος", selector);
("name:el,name:en,slug,description,assets,facets:el,facets:en,optionGroups,optionValues,sku,price,taxCategory,stockOnHand,trackInventory,variantAssets,variantFacets");

const fileContent = `"${title}","${title}",${aftermarket_code},"${description}",${image},${facets},${facets},,,${aftermarket_code},"${price}",,100,,,\n`;
// fs.appendFile("productDetails2.csv", csvHeader, function (err) {
// 	if (err) return console.log(err);
// });

// fs.appendFile("productDetails2.csv", fileContent, function (err) {
// 	if (err) return console.log(err);
// });
// fs.appendFile("productDetails2.csv", fileContent, function (err) {
// 	if (err) return console.log(err);
// });
// sleep(10000);

console.log(condition);
