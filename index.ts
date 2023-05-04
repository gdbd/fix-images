import nconf from "nconf";
import fs from "fs";
import path from "path";
import "colors";

nconf.argv().env();

// where to find pictures
var dir = nconf.get("dir");

//which year modified to find
var year = nconf.get("year");

//write changes to file
var write = nconf.get("write");

console.log(dir);

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

const files = fs.readdirSync(dir);

for (const file of files) {
  const fullPath = path.join(dir, file);
  const stat = fs.statSync(fullPath);

  if (stat.mtime.getFullYear() === year) {
    console.log();
    console.log(file.yellow);
    const date = extractDate(file);

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
