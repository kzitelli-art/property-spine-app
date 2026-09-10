/* Baseline proof: legacy submitted applications were refused before extension. */
"use strict";
const fs=require("fs"), source=fs.readFileSync("index.html","utf8");
if(!/if\(!d\.conversion_id \|\| !offer\.id\)/.test(source)) throw new Error("baseline refusal guard missing");
console.log("PASS legacy no-offer form currently fails closed at the offer-id guard");
