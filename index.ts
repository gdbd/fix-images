import nconf from "nconf";
import fs from "fs";
import path from "path";
import recursive from "recursive-readdir";
import "colors";

nconf.argv().env();

// where to find pictures
var dir = nconf.get("dir");

//which year modified to find
var year = nconf.get("year");

//write changes to file
var write = nconf.get("write");

var isRecursive = nconf.get("recursive");

console.log("--".repeat(30));
console.log("directory:".magenta, dir);
console.log("find newer than:".magenta, year);
console.log("write changes:".magenta, write ?? false);
console.log("recursive:".magenta, isRecursive ?? false);
console.log("--".repeat(30));

const dateFileNameExtractors = {
  WP: /(wp|img)(_|-)(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})(_|-)((?<hour>\d{2})_(?<minute>\d{2}))?/gi,
};

const getExtractor = (file: string) => {
  if (
    file.toLowerCase().startsWith("wp_") ||
    file.toLowerCase().startsWith("img-")
  ) {
    return dateFileNameExtractors.WP;
  }
  return undefined;
};

const extractDate = (file: string) => {
  const extractor = getExtractor(file);

  if (!extractor) {
    return undefined;
  }

  const matches = file.matchAll(extractor);

  const groups = matches.next().value?.groups;

  if (!groups) {
    console.log("no groups".red);
    return undefined;
  }

  const { year, month, day, hour = 14, minute = 0 } = groups;

  if (year === undefined || month === undefined || day === undefined) {
    console.log("not all date components found");
    return undefined;
  }

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );
};

const processFiles = (files: readonly string[]) => {
  for (const file of files) {
    const fullPath = path.isAbsolute(file) ? file : path.join(dir, file);
    const fileName = path.basename(file);

    const stat = fs.statSync(fullPath);

    if (stat.mtime.getFullYear() === year) {
      console.log();
      console.log(file.yellow);
      const date = extractDate(fileName);

      if (!date) {
        console.log("cannot extract date".red);
        continue;
      }

      console.log(`extracted ${date.toLocaleString()}`.green);

      if (write) {
        try {
          fs.utimesSync(fullPath, date, date);
          console.log("updated".green);
        } catch (e) {
          console.log("error".red, e);
        }
      }
    }
  }
};

if (isRecursive) {
  recursive(dir, [], (_, files) => {
    processFiles(files);
  });
} else {
  const files = fs.readdirSync(dir);
  processFiles(files);
}
