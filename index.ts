import nconf from 'nconf';
import fs from 'fs';
import path from 'path';
import recursive from 'recursive-readdir';
import 'colors';
import type { ArrayElement } from './type';

nconf.argv().env();

// where to find pictures
var dir = nconf.get('dir');

//which year modified to find
var year = nconf.get('year');

//write changes to file
var write = nconf.get('write');

var isRecursive = nconf.get('recursive');

const defaultHour = 14;
const defaultMinute = 0;

console.log('--'.repeat(30));
console.log('directory:'.magenta, dir);
console.log('find newer than:'.magenta, year);
console.log('write changes:'.magenta, write ?? false);
console.log('recursive:'.magenta, isRecursive ?? false);
console.log('--'.repeat(30));

const wellKnownPrefixes = ['wp' as const, 'img' as const, 'vid' as const, 'aud' as const];

const commonRegex = new RegExp(
  `(${wellKnownPrefixes.join('|')})(_|-)(?<year>\\d{4})(?<month>\\d{2})(?<day>\\d{2})(_|-)((?<hour>\\d{2})_(?<minute>\\d{2}))?`,
  'gi'
);

const arbitraryRegex = new RegExp(`(?<year>\\d{4})(_|-)?(?<month>\\d{2})(_|-)?(?<day>\\d{2})(_|-)?((?<hour>\\d{2})(_|-)?(?<minute>\\d{2}))?`, 'gi');

type TValidPrefix = ArrayElement<typeof wellKnownPrefixes>;

const dateFileNameExtractors: Record<TValidPrefix | 'arbitrary', RegExp> = {
  wp: commonRegex,
  img: commonRegex,
  vid: commonRegex,
  aud: commonRegex,
  arbitrary: arbitraryRegex,
};

const getExtractor = (file: string): RegExp => {
  const prefix = file.toLowerCase().slice(0, 3) as TValidPrefix;
  if (wellKnownPrefixes.includes(prefix)) {
    return dateFileNameExtractors[prefix];
  }

  return dateFileNameExtractors.arbitrary;
};

const extractDate = (file: string) => {
  const extractor = getExtractor(file);

  const matches = file.matchAll(extractor);

  const groups = matches.next().value?.groups;

  if (!groups) {
    console.log('no date matches'.red);
    return undefined;
  }

  const { year, month, day } = groups;

  let { hour, minute } = groups;

  if (year === undefined || month === undefined || day === undefined) {
    console.log('not all date components found');
    return undefined;
  }

  if (!hour || hour > 23) {
    hour = defaultHour;
    console.log(`hour corrected to default (${defaultHour})`);
  }

  if (!minute || minute > 60) {
    minute = defaultMinute;
    console.log(`minute corrected to default (${defaultMinute})`);
  }

  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));

  console.log(`extracted ${date.toLocaleString()}`.green);

  let correct = true;

  if (year < 2010 || year > new Date().getFullYear()) {
    console.log('year incorrect', year);
    correct = false;
  }

  if (month > 12) {
    console.log('month incorrect', month);
    correct = false;
  }

  if (day > 31) {
    console.log('day incorrect', day);
    correct = false;
  }

  if (!correct) {
    return undefined;
  }

  return date;
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
        console.log('cannot extract date'.red);
        continue;
      }

      if (write) {
        try {
          fs.utimesSync(fullPath, date, date);
          console.log('updated'.green);
        } catch (e) {
          console.log('error'.red, e);
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
