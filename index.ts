"use strict";

import nconf from "nconf";
import fs from "fs";
import path from "path";
import "colors";

nconf.argv().env();

var dir = nconf.get("dir");
var year = nconf.get("year");

console.log(dir);

const files = fs.readdirSync(dir);

for (const file of files) {
  const stat = fs.statSync(path.join(dir, file));
  if (stat.mtime.getFullYear() === year) {
    console.log(file, stat.mtime.getFullYear());
    if (file.startsWith("WP_")) {
      console.log("WP".green);
    } else {
      console.log("unsupported".red);
    }
  }
}

//console.log(files);
