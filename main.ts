import { countCharacter, Result as Count } from "@suin/mdast-character-count";
import fs from "fs";
import mdastUtilFromMarkdown from "mdast-util-from-markdown";
import "zx/globals";

const syntax = require("micromark-extension-gfm");
const gfm = require("mdast-util-gfm");

const url = "https://github.com/yytypescript/book.git";
const dir = "repo";
const stats: Stats = new Map();

await cloneRepository(url);
cd(dir);
for await (const commitId of getCommitIds()) {
  console.time("commit");
  await checkout(commitId);
  const date = getDate(await getAuthorDate());
  const files = await getMarkdownFiles();
  const stat: Stat = { files: files.length, text: 0, code: 0 };
  const results: Array<Promise<Count>> = [];
  for (const file of await getMarkdownFiles()) {
    results.push(getCount(`${dir}/${file}`));
  }
  for (const { textCharacters, codeCharacters } of await Promise.all(results)) {
    stat.text += textCharacters;
    stat.code += codeCharacters;
  }
  fillNoDataDateWithStats(stats, date);
  stats.set(date, stat);
  console.log(stats);
  console.timeEnd("commit");
}
saveStatsCsv(stats);
saveStatsJson(stats);

async function cloneRepository(url: string): Promise<void> {
  if (fs.existsSync(dir)) {
    return;
  }
  await $`git clone ${url} ${dir}`;
}

async function* getCommitIds(): AsyncGenerator<string> {
  const { stdout } = await $`git log --reverse --pretty=%H`;
  for (const commitId of stdout.split("\n")) {
    if (commitId === "") {
      continue;
    }
    yield commitId;
  }
}

async function checkout(commitId: string): Promise<void> {
  await $`git checkout ${commitId}`;
}

async function getAuthorDate(): Promise<Date> {
  const { stdout } = await $`git show --pretty="%cI" --no-patch`;
  return new Date(stdout.trim());
}

function getDate(date: Date): string {
  const format = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });
  return format.format(date);
}

async function getMarkdownFiles(): Promise<ReadonlyArray<string>> {
  const { stdout } =
    await $`find . -type f -name "*.md" -not -path './writing/*' -not -path './docs/writing/*' -not -path './prh/*' -not -path './next/*'`;
  return stdout.trim().split("\n");
}

function getCount(file: string): Promise<Count> {
  return new Promise((resolve, reject) => {
    const content = fs.readFileSync(file, "utf-8");
    try {
      const tree = mdastUtilFromMarkdown(content, {
        extensions: [syntax()],
        mdastExtensions: [gfm.fromMarkdown],
      });
      resolve(countCharacter(tree));
    } catch (e) {
      reject(e);
    }
  });
}

type Stat = {
  files: number;
  text: number;
  code: number;
};

type Stats = Map<string, Stat>;

function saveStatsCsv(stats: Stats) {
  let content = "date,files,text,code\n";
  for (const [date, { files, text, code }] of stats) {
    content +=
      [
        date,
        files.toString().padStart(3, " "),
        text.toString().padStart(6, " "),
        code.toString().padStart(6, " "),
      ].join(",") + "\n";
  }
  fs.writeFileSync("stats.csv", content);
}

function saveStatsJson(stats: Stats) {
  let content: Array<Stat & { date: string }> = [];
  for (const [date, { files, text, code }] of stats) {
    content.push({ date, files, text, code });
  }
  fs.writeFileSync("stats.json", JSON.stringify(content, null, 2));
}

function fillNoDataDateWithStats(stats: Stats, nextDate: string) {
  if (stats.size === 0) {
    return;
  }
  const [last, lastStat] = [...stats].slice(-1)[0];
  if (last === nextDate) {
    return;
  }
  const accDate = new Date(last);
  while (true) {
    accDate.setDate(accDate.getDate() + 1);
    let date = getDate(accDate);
    if (date === nextDate) {
      break;
    }
    stats.set(date, lastStat);
  }
}
