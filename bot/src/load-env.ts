import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  resolve(here, "../.env"),
  resolve(here, "../.env.local"),
  resolve(here, "../../.env.local"),
  resolve(here, "../../.env"),
];
for (const p of candidates) {
  if (existsSync(p)) {
    config({ path: p });
    break;
  }
}
